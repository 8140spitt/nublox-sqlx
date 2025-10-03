import type { CIR_Snapshot } from '../ir/cir';
import type { ChangeSet } from '../ir/change-set';
export interface PlanStep {
    kind: 'create_table' | 'drop_table' | 'rename_table' | 'add_column' | 'modify_column' | 'drop_column' | 'rename_column' | 'create_index' | 'drop_index' | 'alter_index_visibility' | 'add_fk' | 'drop_fk' | 'alter_table_options' | 'alter_table_collation' | 'create_view' | 'drop_view' | 'alter_view' | 'exec_sql' | 'barrier_comment';
    sql: string;
    meta?: Record<string, unknown>;
}
export interface Plan {
    steps: PlanStep[];
    summary: {
        create: number;
        alter: number;
        drop: number;
        other: number;
    };
    planHash: string;
}
export declare function makePlan(from: CIR_Snapshot, to: CIR_Snapshot, cs: ChangeSet): Plan;
