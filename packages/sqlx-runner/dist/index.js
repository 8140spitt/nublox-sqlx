"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPlan = applyPlan;
async function applyPlan(exec, plan, opts) {
    // safety: destructive ops require confirm-hash
    const destructive = plan.steps.some(s => s.kind.startsWith('drop_') || s.sql.match(/\b(DROP|TRUNCATE|RENAME)\b/i));
    if (destructive && opts?.confirmHash !== plan.planHash) {
        throw new Error(`Refusing to apply destructive plan without --confirm-hash.\n` +
            `Expected: ${plan.planHash}\n` +
            `Pass: --confirm-hash ${plan.planHash}`);
    }
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
    for (let i = 0; i < plan.steps.length; i++) {
        const st = plan.steps[i];
        if (st.kind === 'barrier_comment')
            continue;
        await exec(`INSERT INTO sqlx_migration_log(plan_hash, step, statement) VALUES (?,?,?)`, [plan.planHash, i, st.sql]);
        if (opts?.dryRun)
            continue;
        try {
            await exec(st.sql);
            await exec(`UPDATE sqlx_migration_log SET ended_at=NOW(), status='ok' WHERE plan_hash=? AND step=?`, [plan.planHash, i]);
        }
        catch (e) {
            await exec(`UPDATE sqlx_migration_log SET ended_at=NOW(), status='error', error_text=? WHERE plan_hash=? AND step=?`, [String(e), plan.planHash, i]);
            throw e;
        }
    }
}
