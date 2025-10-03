#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = require("yargs");
const helpers_1 = require("yargs/helpers");
const sqlx_mysql_1 = require("@nublox/sqlx-mysql");
const sqlx_runner_1 = require("@nublox/sqlx-runner");
const sqlx_mysql_2 = require("@nublox/sqlx-mysql");
const fs = require("node:fs");
/**
 * Minimal, deterministic diff generator (tables only for now).
 * Produces a plan with ordered steps and a planHash.
 * This is intentionally self-contained to avoid export drift.
 */
function sha256(s) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s).digest('hex');
}
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
function sortSteps(steps) {
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    return [...steps].sort((a, b) => {
        const da = ORDER[a.kind] ?? 100, db = ORDER[b.kind] ?? 100;
        if (da !== db)
            return da - db;
        const sa = norm(a.sql), sb = norm(b.sql);
        return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
}
function diffSnapshots(a, b) {
    const steps = [];
    const aTables = new Set();
    const bTables = new Set();
    for (const t of a.tables ?? [])
        aTables.add(`${t.schema}.${t.name}`);
    for (const t of b.tables ?? [])
        bTables.add(`${t.schema}.${t.name}`);
    // create tables present in b not in a
    for (const t of b.tables ?? []) {
        const key = `${t.schema}.${t.name}`;
        if (!aTables.has(key))
            steps.push({ kind: 'create_table', sql: `CREATE TABLE \`${t.schema}\`.\`${t.name}\` ( /* columns... */ )` });
    }
    // drop tables present in a not in b
    for (const t of a.tables ?? []) {
        const key = `${t.schema}.${t.name}`;
        if (!bTables.has(key))
            steps.push({ kind: 'drop_table', sql: `DROP TABLE \`${t.schema}\`.\`${t.name}\`` });
    }
    const ordered = sortSteps(steps);
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
    const planHash = sha256(ordered.map(x => x.sql).join('\n'));
    return { steps: ordered, summary, planHash };
}
// Pretty printer for plan.json review
function printPlan(plan) {
    console.log(`Plan ${plan.planHash}`);
    console.table(plan.summary);
    for (const s of plan.steps) {
        const tag = s.kind.startsWith('drop') ? '[-]' :
            s.kind.startsWith('create') ? '[+]' :
                (s.kind.startsWith('alter') || s.kind.startsWith('rename') || s.kind === 'modify_column') ? '[~]' : '[ ]';
        console.log(`${tag} ${s.kind} :: ${s.sql}`);
    }
}
async function main() {
    const argv = await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .command('introspect [url] [out]', 'Write snapshot JSON', y => y
        .positional('url', { type: 'string' })
        .positional('out', { type: 'string', default: 'snapshot.json' }))
        .command('diff [from] [to] [out]', 'Diff two JSON snapshots', y => y
        .positional('from', { type: 'string' })
        .positional('to', { type: 'string' })
        .positional('out', { type: 'string', default: 'plan.json' })
        .option('print', { type: 'boolean', default: true, describe: 'Pretty-print plan to stdout' }))
        .command('apply [plan] [url]', 'Apply plan to target DB', y => y
        .positional('plan', { type: 'string' })
        .positional('url', { type: 'string' })
        .option('dry', { type: 'boolean', default: false })
        .option('resume', { type: 'boolean', default: true })
        .option('lock', { type: 'boolean', default: true })
        .option('confirm-hash', { type: 'string', describe: 'Required when plan contains DROP/RENAME/TRUNCATE' }))
        .command('advise [url]', 'Run schema advisors on live DB', y => y
        .positional('url', { type: 'string' }))
        .demandCommand(1)
        .help()
        .parse();
    const cmd = argv._[0];
    if (cmd === 'introspect') {
        const url = String(argv.url);
        const out = String(argv.out);
        const exec = await mkMySqlExec(url);
        const snap = await (0, sqlx_mysql_1.introspectMySQL)(exec);
        fs.writeFileSync(out, JSON.stringify(snap, null, 2));
        console.log('Wrote', out);
        return;
    }
    if (cmd === 'diff') {
        const a = JSON.parse(fs.readFileSync(String(argv.from), 'utf8'));
        const b = JSON.parse(fs.readFileSync(String(argv.to), 'utf8'));
        const plan = diffSnapshots(a, b);
        if (argv.print)
            printPlan(plan);
        fs.writeFileSync(String(argv.out), JSON.stringify(plan, null, 2));
        console.log('Wrote', String(argv.out));
        return;
    }
    if (cmd === 'apply') {
        const plan = JSON.parse(fs.readFileSync(String(argv.plan), 'utf8'));
        const exec = await mkMySqlExec(String(argv.url));
        await (0, sqlx_runner_1.applyPlan)(exec, plan, {
            dryRun: Boolean(argv.dry),
            resume: Boolean(argv.resume),
            lock: Boolean(argv.lock),
            confirmHash: typeof argv['confirm-hash'] === 'string' ? String(argv['confirm-hash']) : undefined
        });
        console.log('Applied plan');
        return;
    }
    if (cmd === 'advise') {
        const url = String(argv.url);
        const exec = await mkMySqlExec(url);
        const snap = await (0, sqlx_mysql_1.introspectMySQL)(exec);
        const findings = (0, sqlx_mysql_2.adviseMySQL)(snap);
        if (!findings.length) {
            console.log('No findings 🎉');
            return;
        }
        for (const f of findings) {
            const cols = f.columns?.length ? ` [${f.columns.join(', ')}]` : '';
            const where = [f.table, f.index].filter(Boolean).join(' · ');
            console.log(`${f.severity.toUpperCase()} ${f.code}${where ? ' :: ' + where : ''}${cols}`);
            console.log(`  → ${f.message}`);
        }
        return;
    }
}
// Temporary MySQL wire: return shape matches runner signature expectations
async function mkMySqlExec(url) {
    const mysql = await Promise.resolve().then(() => require('mysql2/promise'));
    const pool = mysql.createPool(url);
    return async (sql, params) => {
        const [rows] = await pool.query(sql, params);
        // runner expects at least { rows: any[] }
        return { rows: Array.isArray(rows) ? rows : [] };
    };
}
main().catch((e) => { console.error(e); process.exit(1); });
