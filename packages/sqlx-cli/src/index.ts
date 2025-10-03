#!/usr/bin/env node
import yargs, { type Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';

import { CIR_Snapshot, diffSnapshots, sha256 } from '@nublox/sqlx-core';
import { compileDDL_MySQL, introspectMySQL } from '@nublox/sqlx-mysql';
import { applyPlan } from '@nublox/sqlx-runner';

function destructive(sqls: string[]) {
    return sqls.some(s => /\b(DROP|RENAME|MODIFY)\b/i.test(s));
}

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .command('introspect [url] [out]', 'Write snapshot JSON', (y: Argv) =>
            y.positional('url', { type: 'string', demandOption: true })
                .positional('out', { type: 'string', default: 'snapshot.json' })
        )
        .command('diff [from] [to] [out]', 'Diff two CIR snapshots', (y: Argv) =>
            y.positional('from', { type: 'string', demandOption: true })
                .positional('to', { type: 'string', demandOption: true })
                .positional('out', { type: 'string', default: 'changes.json' })
        )
        .command('plan [changes] [out]', 'Compile DDL for MySQL', (y: Argv) =>
            y.positional('changes', { type: 'string', demandOption: true })
                .positional('out', { type: 'string', default: 'plan.sql.json' })
        )
        .command('apply [plan] [url]', 'Apply plan to MySQL', (y: Argv) =>
            y.positional('plan', { type: 'string', demandOption: true })
                .positional('url', { type: 'string', demandOption: true })
                .option('dry', { type: 'boolean', default: false })
                .option('resume', { type: 'boolean', default: true })
                .option('lock', { type: 'boolean', default: true })
                .option('confirm-hash', { type: 'string' })
        )
        .demandCommand(1)
        .help()
        .parse();

    const cmd = String(argv._[0] || '');

    if (cmd === 'introspect') {
        const url = String(argv.url);
        const out = String(argv.out || 'snapshot.json');
        const exec = await mkMySqlExec(url);
        const snap = await introspectMySQL(exec);
        fs.writeFileSync(out, JSON.stringify(snap, null, 2));
        console.log('Wrote', out);
        return;
    }

    if (cmd === 'diff') {
        const a = JSON.parse(fs.readFileSync(String(argv.from), 'utf8')) as CIR_Snapshot;
        const b = JSON.parse(fs.readFileSync(String(argv.to), 'utf8')) as CIR_Snapshot;
        const cs = diffSnapshots(a, b);
        fs.writeFileSync(String(argv.out), JSON.stringify(cs, null, 2));
        console.log('Wrote', String(argv.out));
        return;
    }

    if (cmd === 'plan') {
        const cs = JSON.parse(fs.readFileSync(String(argv.changes), 'utf8'));
        const ddl = compileDDL_MySQL(cs);
        const out = { planHash: sha256(ddl.join('\n')), statements: ddl };
        fs.writeFileSync(String(argv.out), JSON.stringify(out, null, 2));
        console.log('Wrote', String(argv.out));
        return;
    }

    if (cmd === 'apply') {
        const plan = JSON.parse(fs.readFileSync(String(argv.plan), 'utf8')) as { planHash: string; statements: string[] };
        if (destructive(plan.statements)) {
            const provided = (argv['confirm-hash'] as string | undefined);
            if (provided !== plan.planHash) {
                console.error(`Refusing destructive plan without --confirm-hash ${plan.planHash}`);
                process.exit(2);
            }
        }
        const exec = await mkMySqlExec(String(argv.url));
        await applyPlan(exec, plan.statements, {
            dryRun: Boolean(argv.dry),
            resume: Boolean(argv.resume),
            lock: Boolean(argv.lock)
        });
        console.log('Applied plan');
        return;
    }
}

async function mkMySqlExec(url: string) {
    const mysql = await import('mysql2/promise');
    const pool = mysql.createPool(url);
    return async (sql: string, params?: any[]) => {
        const [rows] = await pool.query(sql, params);
        return { rows: rows as any[] };
    };
}

main().catch(e => { console.error(e); process.exit(1); });
