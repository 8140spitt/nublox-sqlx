import type { Capabilities } from '@nublox/sqlx-core';
export declare function probeMySQL(exec: (sql: string) => Promise<{
    rows: any[];
}>, versionHint?: string): Promise<Capabilities>;
