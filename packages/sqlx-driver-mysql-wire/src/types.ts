export type Row = Record<string, unknown>;
export interface QueryResult {
    rows: Row[];
    affectedRows?: number;
    insertId?: number | bigint;
    warnings?: number;
    info?: string;
}

export type Isolation =
    | 'read uncommitted'
    | 'read committed'
    | 'repeatable read'
    | 'serializable';

export type BigIntMode = 'number' | 'bigint' | 'string';
export interface DriverOptions {
    /** Require TLS or disable it. Default 'require' */
    ssl?: 'require' | 'disable';
    /** Convert BIGINT: default 'string' to avoid precision loss */
    bigIntMode?: BigIntMode;
    /** Return DATETIME/DATE/TIMESTAMP as: 'string' (default) or 'jsdate' */
    dateMode?: 'string' | 'jsdate';
    /** Milliseconds for initial connect timeout (default 10000) */
    connectTimeoutMs?: number;
    /** Per-packet read timeout; 0 = no timeout (default 0) */
    socketTimeoutMs?: number;
    /** Session time zone, e.g. '+00:00' or 'SYSTEM' (optional) */
    timeZone?: string;
}

export interface SqlxDriver {
    connect(url: string, opts?: DriverOptions): Promise<void>;
    close(): Promise<void>;
    ping(): Promise<void>;
    exec(sql: string, params?: unknown[]): Promise<QueryResult>;
    begin(opts?: { isolation?: Isolation }): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    kill?(): Promise<void>;
    threadId?(): number | string;
    // Optional prepared API (used internally)
    prepare?(sql: string): Promise<{ stmtId: number; paramCount: number; columnNames: string[]; close(): Promise<void>; execute(params?: unknown[]): Promise<QueryResult> }>;
}
