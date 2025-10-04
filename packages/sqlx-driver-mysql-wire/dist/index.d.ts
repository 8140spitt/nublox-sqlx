export interface SqlxDriver {
    connect(url: string): Promise<void>;
    close(): Promise<void>;
    ping(): Promise<void>;
    exec(sql: string, params?: unknown[]): Promise<{
        rows: any[];
        affectedRows?: number;
        insertId?: number | bigint;
    }>;
    begin(opts?: {
        isolation?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
    }): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    kill?(): Promise<void>;
    threadId?(): number | string;
}
export declare class MysqlWireDriver implements SqlxDriver {
    private wire;
    connect(url: string): Promise<void>;
    close(): Promise<void>;
    ping(): Promise<void>;
    exec(sql: string): Promise<{
        rows: any[];
        affectedRows?: number;
        insertId?: number | bigint;
    }>;
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    threadId(): number;
    kill(): Promise<void>;
}
export declare const createMysqlWireDriver: () => MysqlWireDriver;
