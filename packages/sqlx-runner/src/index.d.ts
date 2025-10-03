export interface ApplyOptions {
    dryRun?: boolean;
    lock?: boolean;
    resume?: boolean;
    tag?: string;
}
export declare function applyPlan(exec: (sql: string, params?: any[]) => Promise<{
    rows: any[];
}>, statements: string[], opts?: ApplyOptions): Promise<{
    planHash: string;
    executed: number;
}>;
