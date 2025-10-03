"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adviseMySQL = adviseMySQL;
function idxCols(idx) {
    // CIR_Index typically has parts: [{ colOrExpr, prefixLen }]
    const parts = Array.isArray(idx?.parts) ? idx.parts : [];
    return parts.map((p) => String(p?.colOrExpr ?? '')).filter(Boolean);
}
function adviseMySQL(snapshot) {
    const findings = [];
    const tables = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
    for (const t of tables) {
        const tableName = `${t?.schema}.${t?.name}`;
        const indexes = Array.isArray(t?.indexes) ? t.indexes : [];
        const fks = Array.isArray(t?.foreignKeys) ? t.foreignKeys
            : Array.isArray(t?.fks) ? t.fks
                : []; // tolerate either property
        // Detect PK by looking for PRIMARY index
        const primary = indexes.find((ix) => String(ix?.name).toUpperCase() === 'PRIMARY');
        const pkCols = primary ? idxCols(primary) : [];
        if (pkCols.length === 0) {
            findings.push({ code: 'MISSING_PK', severity: 'warn', table: tableName, message: 'Table has no PRIMARY KEY' });
        }
        // Duplicate index signatures (unique flag + exact column list)
        const seen = new Map();
        for (const ix of indexes) {
            const cols = idxCols(ix);
            const sig = `${ix?.unique ? 'U' : 'N'}:${cols.join(',')}`;
            if (seen.has(sig)) {
                findings.push({
                    code: 'IDX_DUPLICATE',
                    severity: 'warn',
                    table: tableName,
                    index: ix?.name,
                    columns: cols,
                    message: `Duplicate index signature with ${seen.get(sig)}`
                });
            }
            else {
                seen.set(sig, String(ix?.name ?? ''));
            }
        }
        // Overlap: same leading prefix
        for (let i = 0; i < indexes.length; i++) {
            for (let j = i + 1; j < indexes.length; j++) {
                const a = indexes[i], b = indexes[j];
                const ac = idxCols(a), bc = idxCols(b);
                const min = Math.min(ac.length, bc.length);
                if (min > 0 && ac.slice(0, min).join(',') === bc.slice(0, min).join(',')) {
                    findings.push({
                        code: 'IDX_OVERLAP',
                        severity: 'info',
                        table: tableName,
                        message: `Indexes ${a?.name} and ${b?.name} share the same leading column prefix (${ac.slice(0, min).join(',')}). Consider consolidating.`
                    });
                }
            }
        }
        // FK support: ensure an index exists on child columns (prefix match)
        for (const fk of fks) {
            const childCols = Array.isArray(fk?.columns) ? fk.columns : [];
            if (!childCols.length)
                continue;
            const childStr = childCols.join(',');
            const supported = indexes.some((ix) => {
                const cols = idxCols(ix);
                return cols.slice(0, childCols.length).join(',') === childStr;
            });
            if (!supported) {
                findings.push({
                    code: 'FK_NO_SUPPORTING_INDEX',
                    severity: 'warn',
                    table: tableName,
                    message: `Foreign key ${fk?.name ?? '(unnamed)'} not supported by an index on (${childStr})`
                });
            }
        }
        // Redundant: unique index equals PK columns
        if (pkCols.length > 0) {
            const pkSig = `U:${pkCols.join(',')}`;
            for (const ix of indexes) {
                const cols = idxCols(ix);
                const sig = `${ix?.unique ? 'U' : 'N'}:${cols.join(',')}`;
                if (sig === pkSig && String(ix?.name).toUpperCase() !== 'PRIMARY') {
                    findings.push({
                        code: 'REDUNDANT_UNIQUE_PK',
                        severity: 'info',
                        table: tableName,
                        index: ix?.name,
                        message: `Unique index duplicates PRIMARY KEY definition`
                    });
                }
            }
        }
    }
    return findings;
}
