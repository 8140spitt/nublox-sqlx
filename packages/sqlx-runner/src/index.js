"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPlan = applyPlan;
const sqlx_core_1 = require("@nublox/sqlx-core");
async function applyPlan(exec, statements, opts) {
    await exec(`CREATE TABLE IF NOT EXISTS sqlx_migration_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_hash CHAR(64) NOT NULL,
    step INT NOT NULL,
    statement LONGTEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    status ENUM('ok','error') DEFAULT 'ok',
    error_text TEXT NULL
  )`);
    const planHash = (0, sqlx_core_1.sha256)(statements.join('\n'));
    let startFrom = 0;
    if (opts?.resume) {
        const r = await exec(`SELECT MAX(step) as s FROM sqlx_migration_log WHERE plan_hash=? AND status='ok'`, [planHash]);
        const s = Number(r.rows?.[0]?.s ?? 0);
        if (s > 0)
            startFrom = s + 1;
    }
    if (opts?.lock)
        await exec(`SELECT GET_LOCK('sqlx:migrate', 30)`);
    try {
        for (let i = startFrom; i < statements.length; i++) {
            const sql = statements[i];
            await exec(`INSERT INTO sqlx_migration_log(plan_hash, step, statement) VALUES (?,?,?)`, [planHash, i, sql]);
            if (opts?.dryRun)
                continue;
            try {
                await exec(sql);
                await exec(`UPDATE sqlx_migration_log SET ended_at=NOW(), status='ok' WHERE plan_hash=? AND step=?`, [planHash, i]);
            }
            catch (e) {
                await exec(`UPDATE sqlx_migration_log SET ended_at=NOW(), status='error', error_text=? WHERE plan_hash=? AND step=?`, [String(e), planHash, i]);
                throw e;
            }
        }
    }
    finally {
        if (opts?.lock)
            await exec(`SELECT RELEASE_LOCK('sqlx:migrate')`);
    }
    return { planHash, executed: statements.length - startFrom };
}
