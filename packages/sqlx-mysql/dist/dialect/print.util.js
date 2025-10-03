"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lit = exports.tname = exports.q = void 0;
const q = (s) => '`' + s.replaceAll('`', '``') + '`';
exports.q = q;
const tname = (s, n) => s ? `${(0, exports.q)(s)}.${(0, exports.q)(n)}` : (0, exports.q)(n);
exports.tname = tname;
const lit = (v) => v === null ? 'NULL'
    : v instanceof Date ? `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`
        : typeof v === 'string' ? `'${v.replaceAll("'", "''")}'`
            : String(v);
exports.lit = lit;
