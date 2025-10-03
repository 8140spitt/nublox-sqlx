import type { SelectIR } from '@nublox/sqlx-core';
import { printExpr } from './print.expr';
import { q, tname } from './print.util';

export function printSELECT(sel: SelectIR): string {
    const cols = sel.columns.map(c => `${printExpr(c.expr)}${c.as ? ` AS ${q(c.as)}` : ''}`).join(', ');
    const from = ` FROM ${tname(sel.from.schema, sel.from.name)}`;
    const joins = (sel.joins || []).map(j => ` ${j.kind.toUpperCase()} JOIN ${tname(j.table.schema, j.table.name)} ON ${printExpr(j.on)}`).join('');
    const where = sel.where ? ` WHERE ${printExpr(sel.where)}` : '';
    const group = sel.groupBy?.length ? ` GROUP BY ${sel.groupBy.map(printExpr).join(', ')}` : '';
    const having = sel.having ? ` HAVING ${printExpr(sel.having)}` : '';
    const order = sel.orderBy?.length ? ` ORDER BY ${sel.orderBy.map(o => `${printExpr(o.expr)} ${o.dir?.toUpperCase() || 'ASC'}`).join(', ')}` : '';
    const limit = sel.limit != null ? ` LIMIT ${sel.limit}` : '';
    const offset = sel.offset != null ? ` OFFSET ${sel.offset}` : '';
    return `SELECT ${cols}${from}${joins}${where}${group}${having}${order}${limit}${offset}`;
}
