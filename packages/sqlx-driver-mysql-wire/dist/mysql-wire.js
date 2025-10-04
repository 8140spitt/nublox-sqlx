import net from 'node:net';
import { createHash } from 'node:crypto';
import { parse } from 'node:url';
import { Reader } from './reader';
import { Writer } from './writer';
import { DEFAULT_CAPABILITIES } from './capabilities';
function scrambleNativePassword(password, nonce) {
    const sha1 = (d) => createHash('sha1').update(d).digest();
    const p1 = sha1(password);
    const p2 = sha1(p1);
    const p3 = sha1(Buffer.concat([nonce, p2]));
    const out = Buffer.allocUnsafe(p3.length);
    for (let i = 0; i < p3.length; i++)
        out[i] = p3[i] ^ p1[i];
    return out;
}
export class MysqlWire {
    sock;
    seq = 0;
    threadId;
    authPlugin = 'mysql_native_password';
    nonce;
    getThreadId() { return this.threadId; }
    async connect(url) {
        const u = parse(url);
        const host = u.hostname || '127.0.0.1';
        const port = Number(u.port || 3306);
        const [user, password] = (u.auth || 'root:').split(':').map(decodeURIComponent);
        const database = (u.pathname || '').replace(/^\//, '') || undefined;
        await new Promise((resolve, reject) => {
            this.sock = net.createConnection({ host, port }, resolve);
            this.sock.once('error', reject);
        });
        // 1) Handshake
        const hs = await this.readPacket();
        const r = new Reader(hs);
        r.u8();
        r.nulstr(); // protocol, serverVersion
        this.threadId = r.u32();
        const scramble1 = r.slice(8);
        r.u8();
        r.u16();
        r.u8();
        r.u16(); // cap1, charset, status
        const cap2lo = r.u16();
        const cap2hi = r.u16();
        const _capabilities = cap2lo | (cap2hi << 16);
        const authDataLen = r.u8();
        r.slice(10); // reserved
        const scramble2 = r.slice(Math.max(13, authDataLen - 8));
        this.nonce = Buffer.concat([scramble1, scramble2]).subarray(0, 20);
        if (r.remaining > 0)
            this.authPlugin = r.nulstr() || this.authPlugin;
        // 2) Login request
        const flags = DEFAULT_CAPABILITIES;
        const w = new Writer();
        w.u32(flags) // capability flags
            .u32(0x1000000) // max packet
            .u8(45) // charset (utf8_general_ci)
            .buf(Buffer.alloc(23, 0)); // reserved
        w.str(user + '\0');
        const authResp = scrambleNativePassword(password || '', this.nonce);
        w.u8(authResp.length).buf(authResp);
        w.str((database || '') + '\0');
        w.str(this.authPlugin + '\0');
        await this.writePacket(w.build());
        // 3) Auth result
        const auth = await this.readPacket();
        if (auth[0] === 0xff) {
            const er = new Reader(auth);
            er.u8();
            const code = er.u16();
            throw new Error(`MySQL ERR ${code}`);
        }
    }
    async close() { this.sock.end(); }
    async ping() {
        await this.command(0x0e); // COM_PING
        const pkt = await this.readPacket();
        if (pkt[0] !== 0x00)
            throw new Error('Ping failed');
    }
    async begin() { await this.query('START TRANSACTION'); }
    async commit() { await this.query('COMMIT'); }
    async rollback() { await this.query('ROLLBACK'); }
    async kill() {
        if (this.threadId)
            await this.query(`KILL QUERY ${this.threadId}`);
    }
    async query(sql) {
        const w = new Writer();
        w.u8(0x03).str(sql); // COM_QUERY
        await this.writePacket(w.build());
        return this.readResultset();
    }
    async command(cmd) {
        const w = new Writer();
        w.u8(cmd);
        await this.writePacket(w.build());
    }
    async readResultset() {
        let pkt = await this.readPacket();
        // OK packet (DML / no rows)
        if (pkt[0] === 0x00) {
            const r = new Reader(pkt);
            r.u8();
            const affected = r.lenenc() ?? 0;
            const insertId = r.lenenc() ?? 0;
            return { rows: [], affectedRows: Number(affected), insertId: Number(insertId) };
        }
        // Column count
        const r0 = new Reader(pkt);
        const colCount = r0.lenenc();
        // Column definitions (ignored for now)
        for (let i = 0; i < colCount; i++)
            await this.readPacket();
        // Rows
        const rows = [];
        while (true) {
            pkt = await this.readPacket();
            // EOF (classic) or OK (deprecate EOF)
            if ((pkt[0] === 0xfe && pkt.length <= 5) || (pkt[0] === 0x00 && pkt.length >= 7))
                break;
            const rr = new Reader(pkt);
            const row = {};
            for (let c = 0; c < colCount; c++) {
                const len = rr.lenenc();
                row[c] = (len === null) ? null : rr.str(len);
            }
            rows.push(row);
        }
        return { rows };
    }
    async writePacket(payload) {
        const header = Buffer.allocUnsafe(4);
        header.writeUIntLE(payload.length, 0, 3);
        header[3] = this.seq++ & 0xff;
        this.sock.write(header);
        this.sock.write(payload);
    }
    async readPacket() {
        const header = await this.read(4);
        const len = header.readUIntLE(0, 3);
        const seq = header[3];
        this.seq = (seq + 1) & 0xff;
        return this.read(len);
    }
    read(n) {
        return new Promise((resolve, reject) => {
            let got = 0;
            const chunks = [];
            const onData = (b) => {
                chunks.push(b);
                got += b.length;
                if (got >= n) {
                    this.sock.off('data', onData);
                    resolve(Buffer.concat(chunks, n));
                }
            };
            const onErr = (e) => { this.sock.off('error', onErr); this.sock.off('data', onData); reject(e); };
            this.sock.on('data', onData);
            this.sock.once('error', onErr);
        });
    }
}
