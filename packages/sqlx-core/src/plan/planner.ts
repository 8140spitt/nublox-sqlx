import type { CIR_Snapshot } from '../ir/cir';
import type { ChangeSet, Change } from '../ir/change-set';
import { sha256 } from '../util/hash';

export function diffSnapshots(a: CIR_Snapshot, b: CIR_Snapshot): ChangeSet {
    const aKeys = new Set(a.tables.map(t => `${t.schema}.${t.name}`));
    const bKeys = new Set(b.tables.map(t => `${t.schema}.${t.name}`));
    const changes: Change[] = [];

    for (const t of b.tables) if (!aKeys.has(`${t.schema}.${t.name}`)) changes.push({ kind: 'createTable', table: t });
    for (const t of a.tables) if (!bKeys.has(`${t.schema}.${t.name}`)) changes.push({ kind: 'dropTable', ref: { schema: t.schema, name: t.name } });

    const phases = ['tables:create', 'tables:alter', 'indexes', 'fks', 'views', 'cleanup'];
    const planHash = sha256(JSON.stringify(changes));
    return { changes, phases, planHash, summary: { creates: changes.filter(c => c.kind === 'createTable').length, drops: changes.filter(c => c.kind === 'dropTable').length } };
}
