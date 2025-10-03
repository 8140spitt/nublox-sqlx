import { CIR_Snapshot, diffSnapshots } from '@nublox/sqlx-core';
import { compileDDL_MySQL } from '@nublox/sqlx-mysql';
import { applyPlan } from '@nublox/sqlx-runner';
import mysql from 'mysql2/promise';

const url = process.env.MYSQL_URL!;
const snapA: CIR_Snapshot = { schemas: ['app'], tables: [], views: [], generatedAt: new Date().toISOString() };

const snapB: CIR_Snapshot = {
    schemas: ['app'], generatedAt: new Date().toISOString(), views: [],
    tables: [{
        schema: 'app', name: 'users', comment: 'Users table',
        columns: [
            { name: 'id', type: 'bigint', nullable: false, autoIncrement: true },
            { name: 'email', type: 'varchar(255)', nullable: false }
        ],
        indexes: [{ name: 'ux_users_email', unique: true, using: 'btree', parts: [{ colOrExpr: 'email' }] }],
        fks: [], checks: []
    }]
};

(async () => {
    const cs = diffSnapshots(snapA, snapB);
    const ddl = compileDDL_MySQL(cs);
    const pool = await mysql.createPool(url);
    const exec = async (sql: string, params?: any[]) => { const [rows] = await pool.query(sql, params); return { rows }; };
    await applyPlan(exec, ddl, { lock: true, resume: true });
    console.log('Created table `app.users` via pipeline ✅');
})();
