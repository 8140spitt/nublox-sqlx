// ✅ must have exports so TS treats it as a module
export function isDeadlockOrLockWaitTimeout(err) {
    const msg = String(err?.message ?? '').toLowerCase();
    return (msg.includes('deadlock') ||
        msg.includes('lock wait timeout') ||
        msg.includes('deadlock found when trying to get lock'));
}
export function isTransientNetwork(err) {
    const msg = String(err?.message ?? '').toLowerCase();
    return (msg.includes('connection lost') ||
        msg.includes('socket hang up') ||
        msg.includes('read econnreset') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('econnaborted'));
}
