"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePlan = makePlan;
const hash_1 = require("../util/hash");
const ORDER = {
    drop_fk: 10,
    drop_index: 12,
    drop_view: 14,
    drop_column: 16,
    drop_table: 18,
    create_table: 30,
    add_column: 32,
    create_index: 34,
    add_fk: 36,
    create_view: 38,
    rename_table: 50,
    rename_column: 52,
    modify_column: 53,
    alter_table_options: 54,
    alter_table_collation: 56,
    alter_index_visibility: 58,
    alter_view: 60,
    exec_sql: 90,
    barrier_comment: 99
};
function stableSortSteps(steps) {
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    return [...steps].sort((a, b) => {
        const ka = ORDER[a.kind] ?? 100;
        const kb = ORDER[b.kind] ?? 100;
        if (ka !== kb)
            return ka - kb;
        const na = norm(a.sql);
        const nb = norm(b.sql);
        if (na < nb)
            return -1;
        if (na > nb)
            return 1;
        return 0;
    });
}
function makePlan(from, to, cs) {
    const steps = [];
    // TODO: generate steps from ChangeSet here
    const ordered = stableSortSteps(steps);
    const summary = ordered.reduce((s, st) => {
        if (st.kind.startsWith('create'))
            s.create++;
        else if (st.kind.startsWith('drop'))
            s.drop++;
        else if (st.kind.startsWith('alter') || st.kind.startsWith('rename') || st.kind === 'modify_column')
            s.alter++;
        else
            s.other++;
        return s;
    }, { create: 0, alter: 0, drop: 0, other: 0 });
    const planHash = (0, hash_1.sha256)(ordered.map(s => s.sql).join('\n'));
    return { steps: ordered, summary, planHash };
}
