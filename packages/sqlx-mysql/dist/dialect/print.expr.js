"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printExpr = printExpr;
const print_util_1 = require("./print.util");
function printExpr(e) {
    switch (e.kind) {
        case 'col': return (0, print_util_1.q)(e.name);
        case 'lit': return (0, print_util_1.lit)(e.value);
        case 'call': return `${e.name}(${e.args.map(printExpr).join(', ')})`;
        case 'bin': return `(${printExpr(e.left)} ${e.op} ${printExpr(e.right)})`;
        case 'un': return `${e.op} ${printExpr(e.expr)}`;
    }
}
