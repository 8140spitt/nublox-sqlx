// packages/sqlx-core/src/diff/diff.ts
import { sha256 } from '../util/hash';

export type PlanStepKind =
    | 'create_table' | 'drop_table' | 'rename_table'
    | 'add_column' | 'modify_column' | 'drop_column' | 'rename_column'
    | 'create_index' | 'drop_index' | 'alter_index_visibility'
    | 'add_fk' | 'drop_fk'
    | 'alter_table_options' | 'alter_table_collation'
    | 'create_view' | 'drop_view' | 'alter_view'
    | 'exec_sql' | 'barrier_comment';

export interface DiffPlanStep { kind: PlanStepKind; sql: string; meta?: Record<string, unknown>; }
export interface DiffPlan { steps: DiffPlanStep[]; summary: { create: number; alter: number; drop: number; other: number }; planHash: string; }

const ORDER: Record<PlanStepKind, number> = {
    drop_fk: 10, drop_index: 12, drop_view: 14, drop_column: 16, drop_table: 18,
    create_table: 30, add_column: 32, create_index: 34, add_fk: 36, create_view: 38,
    rename_table: 50, rename_column: 52, modify_column: 53, alter_table_options: 54, alter_table_collation: 56, alter_index_visibility: 58, alter_view: 60,
    exec_sql: 90, barrier_comment: 99
};

function sortSteps(steps: DiffPlanStep[]): DiffPlanStep[] {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    return [...steps].sort((a, b) => {
        const da = ORDER[a.kind] ?? 100, db = ORDER[b.kind] ?? 100;
        if (da !== db) return da - db;
        const sa = norm(a.sql), sb = norm(b.sql);
        return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
}

/** Minimal diff: tables only (create/drop) — extend over time. */
export function diffSnapshots(a: any, b: any): DiffPlan {
    const steps: DiffPlanStep[] = [];

    const aTables = new Set<string>();
    const bTables = new Set<string>();
    for (const t of a?.tables ?? []) aTables.add(`${t.schema}.${t.name}`);
    for (const t of b?.tables ?? []) bTables.add(`${t.schema}.${t.name}`);

    for (const t of b?.tables ?? []) {
        const key = `${t.schema}.${t.name}`;
        if (!aTables.has(key)) steps.push({ kind: 'create_table', sql: `CREATE TABLE \`${t.schema}\`.\`${t.name}\` ( /* columns... */ )` });
    }
    for (const t of a?.tables ?? []) {
        const key = `${t.schema}.${t.name}`;
        if (!bTables.has(key)) steps.push({ kind: 'drop_table', sql: `DROP TABLE \`${t.schema}\`.\`${t.name}\`` });
    }

    const ordered = sortSteps(steps);
    const summary = ordered.reduce((s, st) => {
        if (st.kind.startsWith('create')) s.create++;
        else if (st.kind.startsWith('drop')) s.drop++;
        else if (st.kind.startsWith('alter') || st.kind.startsWith('rename') || st.kind === 'modify_column') s.alter++;
        else s.other++;
        return s;
    }, { create: 0, alter: 0, drop: 0, other: 0 });

    const planHash = sha256(ordered.map(x => x.sql).join('\n'));
    return { steps: ordered, summary, planHash };
}
