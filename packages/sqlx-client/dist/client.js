import { Emitter } from './emitter';
import { expoBackoff } from './backoff';
import { isDeadlockOrLockWaitTimeout, isTransientNetwork } from './errors';
export class SqlxClient {
    cfg;
    drv;
    healthy = false;
    stopHealth;
    emitter = new Emitter();
    constructor(cfg) {
        this.cfg = cfg;
        if (cfg.onEvent) {
            // Fan-out to user callback
            this.onAny(cfg.onEvent);
        }
    }
    // Event helpers
    on(name, fn) { return this.emitter.on(name, fn); }
    onAny(fn) {
        const names = ['connect', 'disconnect', 'error', 'retry', 'reconnect', 'query:start', 'query:end'];
        const offs = names.map(n => this.on(n, (e) => fn(n, e)));
        return () => offs.forEach(off => off());
    }
    get isHealthy() { return this.healthy; }
    get threadId() { try {
        return this.drv?.threadId?.();
    }
    catch {
        return undefined;
    } }
    async connect() {
        this.drv = this.cfg.driverFactory();
        await this.drv.connect(this.cfg.url);
        this.healthy = true;
        this.emitter.emit('connect', { url: this.cfg.url });
        if (this.cfg.enableHealthChecks !== false) {
            const interval = this.cfg.pingIntervalMs ?? 30_000;
            const timer = setInterval(() => this.ping().catch((e) => {
                this.healthy = false;
                this.emitter.emit('error', { error: e });
            }), interval);
            this.stopHealth = () => clearInterval(timer);
        }
    }
    async close() {
        this.stopHealth?.();
        await this.drv?.close();
        this.healthy = false;
        this.emitter.emit('disconnect', { reason: 'closed' });
    }
    async ping() {
        await this.drv.ping();
    }
    async tx(fn, opts) {
        await this.drv.begin(opts);
        try {
            const out = await fn();
            await this.drv.commit();
            return out;
        }
        catch (e) {
            await this.drv.rollback().catch(() => { });
            throw e;
        }
    }
    /**
     * Execute a query with retries, timeout, and events.
     * If driver supports kill(), a timeout triggers kill() best-effort.
     */
    async exec(sql, params, opt) {
        const start = performance.now();
        const timeoutMs = opt?.timeoutMs ?? this.cfg.defaultQueryTimeoutMs ?? 0;
        const maxRetries = opt?.maxRetries ?? this.cfg.maxRetries ?? 2;
        const retryDeadlock = opt?.retryOnDeadlock ?? (this.cfg.deadlockRetry ?? true);
        this.emitter.emit('query:start', { sql, params, threadId: this.threadId });
        let attempt = 0;
        while (true) {
            attempt++;
            let timeoutHandle;
            let timedOut = false;
            try {
                const p = this.drv.exec(sql, params);
                const guarded = (timeoutMs && timeoutMs > 0)
                    ? new Promise((resolve, reject) => {
                        timeoutHandle = setTimeout(async () => {
                            timedOut = true;
                            try {
                                await this.drv.kill?.();
                            }
                            catch { /* ignore */ }
                            reject(new Error(`SQLxClient timeout after ${timeoutMs}ms`));
                        }, timeoutMs);
                        p.then((v) => { clearTimeout(timeoutHandle); resolve(v); }, (e) => { clearTimeout(timeoutHandle); reject(e); });
                    })
                    : p;
                const res = await guarded;
                const dur = performance.now() - start;
                this.emitter.emit('query:end', { sql, durationMs: dur });
                return res;
            }
            catch (err) {
                const dur = performance.now() - start;
                this.emitter.emit('error', { error: err });
                this.emitter.emit('query:end', { sql, durationMs: dur, error: err });
                // Decide retry
                const deadlock = retryDeadlock && isDeadlockOrLockWaitTimeout(err);
                const transient = isTransientNetwork(err);
                const shouldRetry = (deadlock || transient) && attempt <= maxRetries && !timedOut;
                if (!shouldRetry)
                    throw err;
                const delay = expoBackoff(attempt);
                this.emitter.emit('retry', { attempt, delayMs: delay, reason: deadlock ? 'deadlock' : 'transient' });
                await new Promise((r) => setTimeout(r, delay));
                // try to reconnect on transient error
                if (transient) {
                    this.emitter.emit('reconnect', { attempt });
                    try {
                        await this.close();
                    }
                    catch { }
                    await this.connect();
                }
            }
        }
    }
    // Stubs for future prepared statements (per-driver impl will fill these)
    async prepare(_sql) { throw new Error('prepare() not implemented in client; use driver-specific prepare'); }
    async kill() { await this.drv.kill?.(); }
}
