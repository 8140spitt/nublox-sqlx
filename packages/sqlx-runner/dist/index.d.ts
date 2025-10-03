import type { Plan } from '@nublox/sqlx-core';
export type Exec = (sql: string, params?: any[]) => Promise<any>;
export declare function applyPlan(exec: Exec, plan: Plan, opts?: {
    dryRun?: boolean;
    lock?: boolean;
    resume?: boolean;
    confirmHash?: string;
}): Promise<void>;
