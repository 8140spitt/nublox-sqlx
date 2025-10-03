#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = require("yargs");
const helpers_1 = require("yargs/helpers");
const fs = require("fs");
const sqlx_core_1 = require("@nublox/sqlx-core");
const sqlx_mysql_1 = require("@nublox/sqlx-mysql");
const sqlx_runner_1 = require("@nublox/sqlx-runner");
function destructive(sqls) {
    return sqls.some(s => /\b(DROP|RENAME|MODIFY)\b/i.test(s));
}
async function main() {
    const argv = await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .command('introspect [url] [out]', 'Write snapshot JSON', (y) => y.positional('url', { type: 'string', demandOption: true })
        .positional('out', { type: 'string', default: 'snapshot.json' }))
        .command('diff [from] [to] [out]', 'Diff two CIR snapshots', (y) => y.positional('from', { type: 'string', demandOption: true })
        .positional('to', { type: 'string', demandOption: true })
        .positional('out', { type: 'string', default: 'changes.json' }))
        .command('plan [changes] [out]', 'Compile DDL for MySQL', (y) => y.positional('changes', { type: 'string', demandOption: true })
        .positional('out', { type: 'string', default: 'plan.sql.json' }))
        .command('apply [plan] [url]', 'Apply plan to MySQL', (y) => y.positional('plan', { type: 'string', demandOption: true })
        .positional('url', { type: 'string', demandOption: true })
        .option('dry', { type: 'boolean', default: false })
        .option('resume', { type: 'boolean', default: true })
        .option('lock', { type: 'boolean', default: true })
        .option('confirm-hash', { type: 'string' }))
        .demandCommand(1)
        .help()
        .parse();
    const cmd = String(argv._[0] || '');
    if (cmd === 'introspect') {
        const url = String(argv.url);
        const out = String(argv.out || 'snapshot.json');
        const exec = await mkMySqlExec(url);
        const snap = await (0, sqlx_mysql_1.introspectMySQL)(exec);
        fs.writeFileSync(out, JSON.stringify(snap, null, 2));
        console.log('Wrote', out);
        return;
    }
    if (cmd === 'diff') {
        const a = JSON.parse(fs.readFileSync(String(argv.from), 'utf8'));
        const b = JSON.parse(fs.readFileSync(String(argv.to), 'utf8'));
        const cs = (0, sqlx_core_1.diffSnapshots)(a, b);
        fs.writeFileSync(String(argv.out), JSON.stringify(cs, null, 2));
        console.log('Wrote', String(argv.out));
        return;
    }
    if (cmd === 'plan') {
        const cs = JSON.parse(fs.readFileSync(String(argv.changes), 'utf8'));
        const ddl = (0, sqlx_mysql_1.compileDDL_MySQL)(cs);
        const out = { planHash: (0, sqlx_core_1.sha256)(ddl.join('\n')), statements: ddl };
        fs.writeFileSync(String(argv.out), JSON.stringify(out, null, 2));
        console.log('Wrote', String(argv.out));
        return;
    }
    if (cmd === 'apply') {
        const plan = JSON.parse(fs.readFileSync(String(argv.plan), 'utf8'));
        if (destructive(plan.statements)) {
            const provided = argv['confirm-hash'];
            if (provided !== plan.planHash) {
                console.error(`Refusing destructive plan without --confirm-hash ${plan.planHash}`);
                process.exit(2);
            }
        }
        const exec = await mkMySqlExec(String(argv.url));
        await (0, sqlx_runner_1.applyPlan)(exec, plan.statements, {
            dryRun: Boolean(argv.dry),
            resume: Boolean(argv.resume),
            lock: Boolean(argv.lock)
        });
        console.log('Applied plan');
        return;
    }
}
async function mkMySqlExec(url) {
    const mysql = await Promise.resolve().then(() => require('mysql2/promise'));
    const pool = mysql.createPool(url);
    return async (sql, params) => {
        const [rows] = await pool.query(sql, params);
        return { rows: rows };
    };
}
main().catch(e => { console.error(e); process.exit(1); });
