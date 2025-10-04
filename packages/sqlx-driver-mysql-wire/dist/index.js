import { MysqlWire } from './mysql-wire';
export class MysqlWireDriver {
    wire = new MysqlWire();
    async connect(url) { await this.wire.connect(url); }
    async close() { await this.wire.close(); }
    async ping() { await this.wire.ping(); }
    async exec(sql) {
        return this.wire.query(sql);
    }
    async begin() { await this.wire.begin(); }
    async commit() { await this.wire.commit(); }
    async rollback() { await this.wire.rollback(); }
    threadId() { return this.wire.getThreadId(); }
    async kill() { await this.wire.kill(); }
}
export const createMysqlWireDriver = () => new MysqlWireDriver();
