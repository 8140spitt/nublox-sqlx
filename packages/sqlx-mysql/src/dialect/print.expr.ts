import type { ExprIR } from '@nublox/sqlx-core';
import { lit, q } from './print.util';

export function printExpr(e: ExprIR): string {
    switch (e.kind) {
        case 'col': return q(e.name);
        case 'lit': return lit(e.value);
        case 'call': return `${e.name}(${e.args.map(printExpr).join(', ')})`;
        case 'bin': return `(${printExpr(e.left)} ${e.op} ${printExpr(e.right)})`;
        case 'un': return `${e.op} ${printExpr(e.expr)}`;
    }
}
