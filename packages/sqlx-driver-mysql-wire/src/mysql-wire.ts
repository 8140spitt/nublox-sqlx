import tls from 'node:tls';
import { CMD, FIELD_TYPES, NULL_LENGTH } from './protocol';
import { Reader } from './reader';
import { Writer } from './writer';
import { connectHandshake, readPacket, resetSeq, writePacket, WireSocket } from './handshake';
import { convertValue } from './util';
import type { DriverOptions, QueryResult, SqlxDriver, Isolation } from './types';

type Column = { schema: string; table: string; orgTable: string; name: string; orgName: string; type: number };

export class MysqlWireDriver implements SqlxDriver {
    private sock!: WireSocket;
    private thread?: number;
    private opts: Required<DriverOptions> = {
        ssl: 'require',
        bigIntMode: 'string',
        dateMode: 'string',
        connectTimeoutMs: 10000,
        socketTimeoutMs: 0,
        timeZone: undefined
    };

    async connect(url: string, opts?: DriverOptions) {
        this.opts = { ...this.opts, ...(opts || {}) };
        const hs = await connectHandshake(url, this.opts);
        this.sock = hs.sock;
        this.thread = hs.threadId; // if server doesn’t report, keep undefined
        if (this.opts.socketTimeoutMs > 0) {
            this.sock.setTimeout?.(this.opts.socketTimeoutMs, () => {
                this.sock.destroy(new Error('Socket timeout'));
            });
        }
        // optional: set time_zone
        if (this.opts.timeZone) {
            await this.exec(`SET time_zone='${this.opts.timeZone}'`);
        }
    }

    async close() {
        try {
            resetSeq();
            await writePacket(this.sock, Buffer.from([CMD.QUIT]));
        } catch { }
        this.sock?.destroy();
    }

    threadId() { return this.thread ?? 'n/a'; }

    async ping() {
        resetSeq();
        await writePacket(this.sock, Buffer.from([CMD.PING]));
        const pkt = await readPacket(this.sock);
        if (pkt[0] !== 0x00) throw new Error('Ping failed');
    }

    async begin(opts?: { isolation?: Isolation }) {
        if (opts?.isolation) {
            await this.exec(`SET TRANSACTION ISOLATION LEVEL ${opts.isolation.toUpperCase()}`);
        }
        await this.exec('START TRANSACTION');
    }
    async commit() { await this.exec('COMMIT'); }
    async rollback() { await this.exec('ROLLBACK'); }

    async kill() {
        if (this.thread) await this.exec(`KILL QUERY ${this.thread}`);
    }

    async exec(sql: string, params?: unknown[]): Promise<QueryResult> {
        // If params provided -> use prepared path for safety
        if (params && params.length) {
            const stmt = await this.prepare(sql);
            try { return await stmt.execute(params); }
            finally { await stmt.close(); }
        }
        // text protocol
        resetSeq();
        const w = new Writer(); w.u8(CMD.QUERY).str(sql);
        await writePacket(this.sock, w.build());
        return this.readAnyResult();
    }

    async prepare(sql: string) {
        resetSeq();
        const w = new Writer(); w.u8(CMD.STMT_PREPARE).str(sql);
        await writePacket(this.sock, w.build());

        let pkt = await readPacket(this.sock);
        if (pkt[0] === 0xff) throw parseErr(pkt);

        // STMT_PREPARE_OK
        const r = new Reader(pkt);
        r.u8(); // 0x00 ok header
        const stmtId = r.u32();
        const numCols = r.u16();
        const numParams = r.u16();
        r.u8(); // filler
        const warningCount = r.u16();

        // param definitions
        const params: any[] = [];
        for (let i = 0; i < numParams; i++) {
            await readPacket(this.sock); // each column def
        }
        if (numParams) await readPacket(this.sock); // EOF/OK (deprecate eof)

        // column definitions
        const columnDefs: Column[] = [];
        for (let i = 0; i < numCols; i++) {
            const col = await this.readColumnDef();
            columnDefs.push(col);
        }
        if (numCols) await readPacket(this.sock);

        const columnNames = columnDefs.map(c => c.name);

        const close = async () => {
            resetSeq();
            const w = new Writer(); w.u8(CMD.STMT_CLOSE);
            const b = w.build();
            const header = Buffer.allocUnsafe(4); header.writeUIntLE(1 + 4, 0, 3); header[3] = 0; // not used here
            // we can write STMT_CLOSE without extra payload detail (server closes by id)
            // but mysql protocol needs stmtId following command
            const body = new Writer().u8(CMD.STMT_CLOSE).u32(stmtId).build();
            await writePacket(this.sock, body);
            // no response for STMT_CLOSE
        };

        const execute = async (params?: unknown[]) => {
            resetSeq();
            // COM_STMT_EXECUTE:
            // 1 byte cmd, 4 bytes stmtId, 1 byte flags, 4 bytes iteration-count
            const w = new Writer();
            w.u8(CMD.STMT_EXECUTE).u32(stmtId).u8(0) /* flags */.u32(1) /* iteration */;
            // null-bitmap: (numParams + 7) / 8
            const nullBitsLen = Math.floor((numParams + 7) / 8);
            const nullMap = Buffer.alloc(nullBitsLen, 0);
            const types = Buffer.alloc(numParams * 2, 0);
            const values: Buffer[] = [];

            const p = params || [];
            for (let i = 0; i < numParams; i++) {
                const v = p[i];
                if (v === null || v === undefined) {
                    nullMap[Math.floor(i / 8)] |= (1 << (i % 8));
                    // type can be left zero
                    continue;
                }
                // encode all as VAR_STRING for simplicity (server coerces)
                types.writeUInt8(FIELD_TYPES.VAR_STRING, i * 2);
                types.writeUInt8(0, i * 2 + 1);
                const b = Buffer.from(String(v), 'utf8');
                values.push(Buffer.concat([lenenc(b.length), b]));
            }

            w.buf(nullMap).u8(1) /* new params bound */.buf(types);
            for (const v of values) w.buf(v);

            await writePacket(this.sock, w.build());
            return this.readAnyResult(columnDefs);
        };

        return { stmtId, paramCount: numParams, columnNames, close, execute };
    }

    // ---- internals ----
    private async readAnyResult(columnDefs?: Column[]): Promise<QueryResult> {
        let pkt = await readPacket(this.sock);
        if (pkt[0] === 0xff) throw parseErr(pkt);

        // OK packet (no resultset)
        if (pkt[0] === 0x00 && pkt.length >= 7) {
            const r = new Reader(pkt); r.u8();
            const affected = r.lenenc() ?? 0;
            const insertId = r.lenenc() ?? 0;
            // status, warnings, info may follow—skip parsing details for brevity
            return { rows: [], affectedRows: Number(affected), insertId: Number(insertId) };
        }

        // Resultset header (column count)
        let colCount: number;
        if (columnDefs) {
            colCount = columnDefs.length;
        } else {
            const rr = new Reader(pkt);
            colCount = rr.lenenc()!;
            columnDefs = [];
            for (let i = 0; i < colCount; i++) columnDefs.push(await this.readColumnDef());
            // read EOF/OK
            await readPacket(this.sock);
        }

        const rows: any[] = [];
        while (true) {
            pkt = await readPacket(this.sock);
            // EOF or OK after rows
            if ((pkt[0] === 0xfe && pkt.length <= 5) || (pkt[0] === 0x00 && pkt.length >= 7)) break;

            // Text row: sequence of lenenc strings / NULL
            const r = new Reader(pkt);
            const row: Record<string, unknown> = {};
            for (let i = 0; i < colCount; i++) {
                const len = r.lenenc();
                const raw = (len === null) ? null : r.str(len);
                const def = columnDefs![i];
                row[def.name] = convertValue(def.type, raw, { bigIntMode: this.opts.bigIntMode, dateMode: this.opts.dateMode });
            }
            rows.push(row);
        }
        return { rows };
    }

    private async readColumnDef(): Promise<Column> {
        const pkt = await readPacket(this.sock);
        const r = new Reader(pkt);
        // catalog,schema,table,org_table,name,org_name are all lenenc strings preceded by length
        const catalogLen = r.lenenc()!; r.skip(catalogLen);
        const schemaLen = r.lenenc()!; const schema = r.str(schemaLen);
        const tableLen = r.lenenc()!; const table = r.str(tableLen);
        const orgTableLen = r.lenenc()!; const orgTable = r.str(orgTableLen);
        const nameLen = r.lenenc()!; const name = r.str(nameLen);
        const orgNameLen = r.lenenc()!; const orgName = r.str(orgNameLen);
        const fixLen = r.lenenc()!; r.skip(fixLen); // 0x0c
        const charset = r.u16();
        const colLen = r.u32();
        const type = r.u8();
        const flags = r.u16();
        const dec = r.u8();
        r.u16(); // filler
        return { schema, table, orgTable, name, orgName, type };
    }
}

// helpers
function lenenc(n: number) {
    if (n < 0xfb) return Buffer.from([n]);
    if (n < 0x10000) { const b = Buffer.allocUnsafe(3); b[0] = 0xfc; b.writeUInt16LE(n, 1); return b; }
    if (n < 0x1000000) { const b = Buffer.allocUnsafe(4); b[0] = 0xfd; b.writeUIntLE(n, 1, 3); return b; }
    const b = Buffer.allocUnsafe(9); b[0] = 0xfe; b.writeBigUInt64LE(BigInt(n), 1); return b;
}

function parseErr(pkt: Buffer): Error {
    const code = pkt.readUInt16LE(1);
    const sqlState = pkt.subarray(4, 9).toString('ascii');
    const msg = pkt.subarray(9).toString('utf8');
    return new Error(`MySQL ERR ${code} [${sqlState}] ${msg}`);
}
