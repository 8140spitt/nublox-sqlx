import type { DmlIR, InsertIR, UpdateIR, DeleteIR, UpsertIR } from '@nublox/sqlx-core';
import { printExpr } from './print.expr';
import { q, tname, lit } from './print.util';

export function printDML(ir: DmlIR): { sql: string; params: any[] } {
    if (ir.kind === 'insert') return printInsert(ir);
    if (ir.kind === 'update') return printUpdate(ir);
    if (ir.kind === 'delete') return printDelete(ir);
    if (ir.kind === 'upsert') return printUpsert(ir);
    throw new Error('unknown DML');
}

function printInsert(ir: InsertIR) {
    const cols = Object.keys(ir.rows[0] || {});
    const values = ir.rows.map(r => `(${cols.map(c => lit(r[c])).join(',')})`).join(',');
    const sql = `INSERT INTO ${tname(ir.into.schema, ir.into.name)} (${cols.map(q).join(',')}) VALUES ${values}` + (ir.returning?.length ? ` /* RETURNING emulation */` : '');
    return { sql, params: [] };
}
function printUpdate(ir: UpdateIR) {
    const set = Object.entries(ir.set).map(([k, v]) => `${q(k)}=${lit(v)}`).join(',');
    const where = ir.where ? ` WHERE ${printExpr(ir.where)}` : '';
    return { sql: `UPDATE ${tname(ir.table.schema, ir.table.name)} SET ${set}${where}`, params: [] };
}
function printDelete(ir: DeleteIR) {
    const where = ir.where ? ` WHERE ${printExpr(ir.where)}` : '';
    return { sql: `DELETE FROM ${tname(ir.from.schema, ir.from.name)}${where}`, params: [] };
}
function printUpsert(ir: UpsertIR) {
    const cols = Object.keys(ir.row);
    const values = `(${cols.map(c => lit(ir.row[c])).join(',')})`;
    const set = Object.entries(ir.conflict.set).map(([k]) => `${q(k)}=VALUES(${q(k)})`).join(',');
    return { sql: `INSERT INTO ${tname(ir.into.schema, ir.into.name)} (${cols.map(q).join(',')}) VALUES ${values} ON DUPLICATE KEY UPDATE ${set}`, params: [] };
}
