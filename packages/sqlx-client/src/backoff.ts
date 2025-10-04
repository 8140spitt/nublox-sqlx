export function expoBackoff(attempt: number, baseMs = 100, maxMs = 5000) {
    const pow = Math.min(attempt, 10);
    const ms = Math.min(maxMs, baseMs * Math.pow(2, pow));
    const jitter = Math.floor(Math.random() * Math.min(ms, 250));
    return ms + jitter;
}
