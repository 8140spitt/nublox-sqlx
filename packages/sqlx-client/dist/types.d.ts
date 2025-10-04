export type Row = Record<string, unknown>;
export interface QueryResult {
    rows: Row[];
    affectedRows?: number;
    insertId?: number | bigint;
}
export type Isolation = 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
export interface SqlxDriver {
    connect(url: string): Promise<void>;
    close(): Promise<void>;
    ping(): Promise<void>;
    exec(sql: string, params?: unknown[]): Promise<QueryResult>;
    begin(opts?: {
        isolation?: Isolation;
    }): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    kill?(): Promise<void>;
    threadId?(): number | string;
}
export type Exec = (sql: string, params?: unknown[]) => Promise<QueryResult>;
export type ClientEvents = {
    connect: {
        url: string;
    };
    disconnect: {
        reason?: string | Error;
    };
    error: {
        error: unknown;
    };
    retry: {
        attempt: number;
        delayMs: number;
        reason: string;
    };
    reconnect: {
        attempt: number;
    };
    'query:start': {
        sql: string;
        params?: unknown[];
        threadId?: number | string;
    };
    'query:end': {
        sql: string;
        durationMs: number;
        error?: unknown;
    };
};
export type EventName = keyof ClientEvents;
