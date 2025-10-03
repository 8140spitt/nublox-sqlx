"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainNormalized = explainNormalized;
async function explainNormalized(exec, q) {
    try {
        const r = await exec(`EXPLAIN FORMAT=JSON ${q}`);
        const raw = r.rows?.[0]?.EXPLAIN || r.rows?.[0]?.['EXPLAIN FORMAT=JSON'] || Object.values(r.rows?.[0] || {})[0];
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return obj;
    }
    catch {
        const r = await exec(`EXPLAIN ${q}`);
        return r.rows;
    }
}
