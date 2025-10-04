import type { SqlxDriver, QueryResult, Isolation, ClientEvents, EventName } from './types';
export type ClientConfig = {
    url: string;
    driverFactory: () => SqlxDriver;
    pingIntervalMs?: number;
    enableHealthChecks?: boolean;
    defaultQueryTimeoutMs?: number;
    maxRetries?: number;
    deadlockRetry?: boolean;
    onEvent?: <K extends EventName>(name: K, payload: ClientEvents[K]) => void;
};
export declare class SqlxClient {
    private cfg;
    private drv;
    private healthy;
    private stopHealth?;
    private emitter;
    constructor(cfg: ClientConfig);
    on<K extends EventName>(name: K, fn: (e: ClientEvents[K]) => void): () => void;
    onAny(fn: (name: EventName, payload: any) => void): () => void;
    get isHealthy(): boolean;
    get threadId(): string | number | undefined;
    connect(): Promise<void>;
    close(): Promise<void>;
    ping(): Promise<void>;
    tx<T>(fn: () => Promise<T>, opts?: {
        isolation?: Isolation;
    }): Promise<T>;
    /**
     * Execute a query with retries, timeout, and events.
     * If driver supports kill(), a timeout triggers kill() best-effort.
     */
    exec(sql: string, params?: unknown[], opt?: {
        timeoutMs?: number;
        maxRetries?: number;
        retryOnDeadlock?: boolean;
    }): Promise<QueryResult>;
    prepare(_sql: string): Promise<void>;
    kill(): Promise<void>;
}
