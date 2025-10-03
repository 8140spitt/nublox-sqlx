import type { Capabilities } from '@nublox/sqlx-core';
export async function probeMySQL(exec: (sql: string) => Promise<{ rows: any[] }>, versionHint?: string): Promise<Capabilities> {
    let version = versionHint || '';
    try { const { rows } = await exec('SELECT VERSION() v'); version = rows?.[0]?.v || version; } catch { }
    const v = parseMySQLVersion(version);
    return {
        dialect: 'mysql', version,
        features: {
            explainJson: v >= 5.7,
            checkConstraints: v >= 8.0,
            invisibleIndex: v >= 8.0,
            instantAddColumn: v >= 8.0,
            onlineIndexCreate: v >= 8.0
        }
    };
}
function parseMySQLVersion(v: string) {
    const m = /^(\d+)\.(\d+)/.exec(v || ''); return m ? parseFloat(`${m[1]}.${m[2]}`) : 0;
}
