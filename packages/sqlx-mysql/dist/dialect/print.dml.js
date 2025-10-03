"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printDML = printDML;
const print_expr_1 = require("./print.expr");
const print_util_1 = require("./print.util");
function printDML(ir) {
    if (ir.kind === 'insert')
        return printInsert(ir);
    if (ir.kind === 'update')
        return printUpdate(ir);
    if (ir.kind === 'delete')
        return printDelete(ir);
    if (ir.kind === 'upsert')
        return printUpsert(ir);
    throw new Error('unknown DML');
}
function printInsert(ir) {
    const cols = Object.keys(ir.rows[0] || {});
    const values = ir.rows.map(r => `(${cols.map(c => (0, print_util_1.lit)(r[c])).join(',')})`).join(',');
    const sql = `INSERT INTO ${(0, print_util_1.tname)(ir.into.schema, ir.into.name)} (${cols.map(print_util_1.q).join(',')}) VALUES ${values}` + (ir.returning?.length ? ` /* RETURNING emulation */` : '');
    return { sql, params: [] };
}
function printUpdate(ir) {
    const set = Object.entries(ir.set).map(([k, v]) => `${(0, print_util_1.q)(k)}=${(0, print_util_1.lit)(v)}`).join(',');
    const where = ir.where ? ` WHERE ${(0, print_expr_1.printExpr)(ir.where)}` : '';
    return { sql: `UPDATE ${(0, print_util_1.tname)(ir.table.schema, ir.table.name)} SET ${set}${where}`, params: [] };
}
function printDelete(ir) {
    const where = ir.where ? ` WHERE ${(0, print_expr_1.printExpr)(ir.where)}` : '';
    return { sql: `DELETE FROM ${(0, print_util_1.tname)(ir.from.schema, ir.from.name)}${where}`, params: [] };
}
function printUpsert(ir) {
    const cols = Object.keys(ir.row);
    const values = `(${cols.map(c => (0, print_util_1.lit)(ir.row[c])).join(',')})`;
    const set = Object.entries(ir.conflict.set).map(([k]) => `${(0, print_util_1.q)(k)}=VALUES(${(0, print_util_1.q)(k)})`).join(',');
    return { sql: `INSERT INTO ${(0, print_util_1.tname)(ir.into.schema, ir.into.name)} (${cols.map(print_util_1.q).join(',')}) VALUES ${values} ON DUPLICATE KEY UPDATE ${set}`, params: [] };
}
