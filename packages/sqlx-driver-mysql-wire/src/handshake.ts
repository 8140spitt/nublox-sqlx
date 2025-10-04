import net from 'node:net';
import tls from 'node:tls';
import { parse } from 'node:url';
import { createHash } from 'node:crypto';
import { Reader } from './reader';
import { Writer } from './writer';
import { CAP, DEFAULT_CAP } from './protocol';
import type { DriverOptions } from './types';

export type WireSocket = net.Socket | tls.TLSSocket;

function sha256(data: Buffer | string) {
    return createHash('sha256').update(data).digest();
}
function sha1(data: Buffer | string) {
    return createHash('sha1').update(data).digest();
}
function mysqlNativeScramble(password: string, nonce: Buffer) {
    // SHA1(password) XOR SHA1(nonce + SHA1(SHA1(password)))
    const p1 = sha1(password);
    const p2 = sha1(p1);
    const p3 = sha1(Buffer.concat([nonce, p2]));
    const out = Buffer.allocUnsafe(p3.length);
    for (let i = 0; i < p3.length; i++) out[i] = p3[i] ^ p1[i];
    return out;
}
function cachingSha2Scramble(password: string, nonce: Buffer) {
    // XOR(SHA256(password), SHA256(SHA256(SHA256(password)), nonce))
    const p1 = sha256(password);
    const p2 = sha256(p1);
    const p3 = sha256(Buffer.concat([p2, nonce]));
    const out = Buffer.allocUnsafe(p3.length);
    for (let i = 0; i < p3.length; i++) out[i] = p3[i] ^ p1[i];
    return out;
}

export async function connectHandshake(
    url: string,
    opts: DriverOptions
): Promise<{ sock: WireSocket; threadId: number; authPlugin: string; nonce: Buffer; serverCaps: number; charset: number; database?: string; host: string; port: number; user: string; password: string; }> {
    const u = parse(url);
    const host = u.hostname || '127.0.0.1';
    const port = Number(u.port || 3306);
    const [user, password] = (u.auth || 'root:').split(':').map(decodeURIComponent);
    const database = (u.pathname || '').replace(/^\//, '') || undefined;

    const sock = await new Promise<net.Socket>((resolve, reject) => {
        const s = net.createConnection({ host, port }, () => resolve(s));
        s.setNoDelay(true);
        s.once('error', reject);
        if (opts.connectTimeoutMs && opts.connectTimeoutMs > 0) {
            s.setTimeout(opts.connectTimeoutMs, () => {
                s.destroy(new Error('Connect timeout'));
            });
        }
    });

    // 1) read initial handshake
    const first = await readPacket(sock);
    const r = new Reader(first);
    const proto = r.u8(); // protocol version, usually 10
    const serverVersion = r.nulstr();
    const threadId = r.u32();
    const scramble1 = r.slice(8); r.u8(); // filler
    const capLow = r.u16();
    const charset = r.u8();
    const status = r.u16();
    const capHigh = r.u16();
    const serverCaps = capLow | (capHigh << 16);
    const authDataLen = r.u8();
    r.skip(10); // reserved
    const scramble2 = r.slice(Math.max(13, authDataLen - 8));
    const nonce = Buffer.concat([scramble1, scramble2]).subarray(0, 20);
    let authPlugin = 'mysql_native_password';
    if (r.remaining > 0) authPlugin = r.nulstr() || authPlugin;

    // 2) optionally start TLS (preferred)
    let clientCaps = DEFAULT_CAP;
    if (opts.ssl !== 'disable') clientCaps |= CAP.SSL;
    if ((clientCaps & CAP.SSL) && (serverCaps & CAP.SSL)) {
        const pre = new Writer().u32(clientCaps).u32(0x01000000).u8(charset).buf(Buffer.alloc(23, 0)).build();
        await writePacket(sock, pre);
        const tsock = tls.connect({ socket: sock, servername: host });
        await new Promise<void>((res, rej) => {
            tsock.once('secureConnect', () => res());
            tsock.once('error', rej);
        });
        // continue handshake over TLS
        return {
            ...(await authContinue(tsock, { user, password, database, charset, clientCaps, nonce, authPlugin })),
            host, port, user, password
        };
    }

    // 3) continue plain (only safe if using mysql_native_password & local or trusted net)
    const cont = await authContinue(sock, { user, password, database, charset, clientCaps, nonce, authPlugin });
    return { ...cont, host, port, user, password };
}

async function authContinue(
    sock: WireSocket,
    ctx: { user: string; password: string; database?: string; charset: number; clientCaps: number; nonce: Buffer; authPlugin: string; }
) {
    const w = new Writer();
    w.u32(ctx.clientCaps).u32(0x01000000).u8(ctx.charset).buf(Buffer.alloc(23, 0));
    w.str(ctx.user + '\0');

    let authResp: Buffer;
    if (ctx.authPlugin === 'caching_sha2_password') {
        authResp = cachingSha2Scramble(ctx.password || '', ctx.nonce);
    } else {
        authResp = mysqlNativeScramble(ctx.password || '', ctx.nonce);
    }
    w.u8(authResp.length).buf(authResp);
    w.str((ctx.database || '') + '\0');
    w.str(ctx.authPlugin + '\0');

    await writePacket(sock, w.build());

    // server may send: OK / ERR / AuthMoreData
    const pkt = await readPacket(sock);

    if (pkt[0] === 0x00) {
        // OK
        return { sock, threadId: 0, authPlugin: ctx.authPlugin, nonce: ctx.nonce, serverCaps: ctx.clientCaps, charset: ctx.charset, database: ctx.database };
    }
    if (pkt[0] === 0xfe || pkt[0] === 0x01) {
        // AuthMoreData or switch (not fully needed for TLS path); fall back to clear password if TLS (we already are if SSL was set)
        // respond with plain password + \0 (MySQL 8 caching_sha2 over secure channel)
        const pass = Buffer.from((ctx.password || '') + '\0', 'utf8');
        await writePacket(sock, pass);
        const ok = await readPacket(sock);
        if (ok[0] === 0x00) {
            return { sock, threadId: 0, authPlugin: ctx.authPlugin, nonce: ctx.nonce, serverCaps: ctx.clientCaps, charset: ctx.charset, database: ctx.database };
        }
        throw parseErr(ok);
    }

    throw parseErr(pkt);
}

// --- Generic packet IO (framed 3-byte len + 1-byte seq) ---
let seq = 0;
export function resetSeq() { seq = 0; }
export async function writePacket(sock: WireSocket, payload: Buffer) {
    const header = Buffer.allocUnsafe(4);
    header.writeUIntLE(payload.length, 0, 3);
    header[3] = seq++ & 0xff;
    sock.write(header);
    sock.write(payload);
}
export function readPacket(sock: WireSocket): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        let need = 4, state: 'hdr' | 'body' = 'hdr';
        let hdr: Buffer | null = null;
        let body: Buffer | null = null;
        const onData = (chunk: Buffer) => {
            while (chunk.length) {
                if (state === 'hdr') {
                    if (chunk.length < need) return;
                    hdr = chunk.subarray(0, 4);
                    chunk = chunk.subarray(4);
                    need = hdr.readUIntLE(0, 3);
                    seq = (hdr[3] + 1) & 0xff;
                    state = 'body'; body = Buffer.allocUnsafe(0);
                } else {
                    const take = Math.min(need, chunk.length);
                    body = Buffer.concat([body!, chunk.subarray(0, take)]);
                    need -= take;
                    chunk = chunk.subarray(take);
                    if (need === 0) { cleanup(); resolve(body!); return; }
                }
            }
        };
        const onErr = (e: any) => { cleanup(); reject(e); };
        const cleanup = () => {
            sock.off('data', onData);
            sock.off('error', onErr);
        };
        sock.on('data', onData);
        sock.once('error', onErr);
    });
}

function parseErr(pkt: Buffer): Error {
    // minimal ERR parser
    if (pkt[0] !== 0xff) return new Error('Unexpected packet during auth');
    const code = pkt.readUInt16LE(1);
    let msg = pkt.subarray(9).toString('utf8');
    return new Error(`MySQL ERR ${code}: ${msg}`);
}
