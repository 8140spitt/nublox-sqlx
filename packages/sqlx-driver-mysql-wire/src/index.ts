import { MysqlWire } from './mysql-wire';

// Local copy of the SqlxDriver shape (keeps this pkg standalone)
export interface SqlxDriver {
    connect(url: string): Promise<void>;
    close(): Promise<void>;
    ping(): Promise<void>;
    exec(sql: string, params?: unknown[]): Promise<{ rows: any[]; affectedRows?: number; insertId?: number | bigint }>;
    begin(opts?: { isolation?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable' }): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    kill?(): Promise<void>;
    threadId?(): number | string;
}

export class MysqlWireDriver implements SqlxDriver {
    private wire = new MysqlWire();
    async connect(url: string) { await this.wire.connect(url); }
    async close() { await this.wire.close(); }
    async ping() { await this.wire.ping(); }
    async exec(sql: string): Promise<{ rows: any[]; affectedRows?: number; insertId?: number | bigint }> {
        return this.wire.query(sql);
    }
    async begin() { await this.wire.begin(); }
    async commit() { await this.wire.commit(); }
    async rollback() { await this.wire.rollback(); }
    threadId() { return this.wire.getThreadId()!; }
    async kill() { await this.wire.kill(); }
}

export const createMysqlWireDriver = () => new MysqlWireDriver();
