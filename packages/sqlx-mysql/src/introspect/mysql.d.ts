import type { CIR_Snapshot } from "@nublox/sqlx-core";
export declare function introspectMySQL(exec: (sql: string, params?: any[]) => Promise<{
    rows: any[];
}>): Promise<CIR_Snapshot>;
