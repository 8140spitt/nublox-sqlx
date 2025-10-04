export interface QueryResult {
    rows: any[];
    affectedRows?: number;
    insertId?: number | bigint;
}
export declare class MysqlWire {
    private sock;
    private seq;
    private threadId?;
    private authPlugin;
    private nonce;
    getThreadId(): number | undefined;
    connect(url: string): Promise<void>;
    close(): Promise<void>;
    ping(): Promise<void>;
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    kill(): Promise<void>;
    query(sql: string): Promise<QueryResult>;
    private command;
    private readResultset;
    private writePacket;
    private readPacket;
    private read;
}
