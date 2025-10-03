"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSELECT = printSELECT;
const print_expr_1 = require("./print.expr");
const print_util_1 = require("./print.util");
function printSELECT(sel) {
    const cols = sel.columns.map(c => `${(0, print_expr_1.printExpr)(c.expr)}${c.as ? ` AS ${(0, print_util_1.q)(c.as)}` : ''}`).join(', ');
    const from = ` FROM ${(0, print_util_1.tname)(sel.from.schema, sel.from.name)}`;
    const joins = (sel.joins || []).map(j => ` ${j.kind.toUpperCase()} JOIN ${(0, print_util_1.tname)(j.table.schema, j.table.name)} ON ${(0, print_expr_1.printExpr)(j.on)}`).join('');
    const where = sel.where ? ` WHERE ${(0, print_expr_1.printExpr)(sel.where)}` : '';
    const group = sel.groupBy?.length ? ` GROUP BY ${sel.groupBy.map(print_expr_1.printExpr).join(', ')}` : '';
    const having = sel.having ? ` HAVING ${(0, print_expr_1.printExpr)(sel.having)}` : '';
    const order = sel.orderBy?.length ? ` ORDER BY ${sel.orderBy.map(o => `${(0, print_expr_1.printExpr)(o.expr)} ${o.dir?.toUpperCase() || 'ASC'}`).join(', ')}` : '';
    const limit = sel.limit != null ? ` LIMIT ${sel.limit}` : '';
    const offset = sel.offset != null ? ` OFFSET ${sel.offset}` : '';
    return `SELECT ${cols}${from}${joins}${where}${group}${having}${order}${limit}${offset}`;
}
