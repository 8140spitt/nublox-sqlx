export type PlanStepKind = 'create_table' | 'drop_table' | 'rename_table' | 'add_column' | 'modify_column' | 'drop_column' | 'rename_column' | 'create_index' | 'drop_index' | 'alter_index_visibility' | 'add_fk' | 'drop_fk' | 'alter_table_options' | 'alter_table_collation' | 'create_view' | 'drop_view' | 'alter_view' | 'exec_sql' | 'barrier_comment';
export interface DiffPlanStep {
    kind: PlanStepKind;
    sql: string;
    meta?: Record<string, unknown>;
}
export interface DiffPlan {
    steps: DiffPlanStep[];
    summary: {
        create: number;
        alter: number;
        drop: number;
        other: number;
    };
    planHash: string;
}
/** Minimal diff: tables only (create/drop) — extend over time. */
export declare function diffSnapshots(a: any, b: any): DiffPlan;
