// ✅ must have exports so TS treats it as a module
export function isDeadlockOrLockWaitTimeout(err: unknown): boolean {
    const msg = String((err as any)?.message ?? '').toLowerCase();
    return (
        msg.includes('deadlock') ||
        msg.includes('lock wait timeout') ||
        msg.includes('deadlock found when trying to get lock')
    );
}

export function isTransientNetwork(err: unknown): boolean {
    const msg = String((err as any)?.message ?? '').toLowerCase();
    return (
        msg.includes('connection lost') ||
        msg.includes('socket hang up') ||
        msg.includes('read econnreset') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('econnaborted')
    );
}
