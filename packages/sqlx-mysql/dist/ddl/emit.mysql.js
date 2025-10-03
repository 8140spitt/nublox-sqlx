"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileDDL_MySQL = compileDDL_MySQL;
const q = (s) => '`' + s.replaceAll('`', '``') + '`';
const tname = (r) => `${q(r.schema)}.${q(r.name)}`;
const lit = (s) => `'${s.replaceAll("'", "''")}'`;
function compileDDL_MySQL(cs) {
    const out = [];
    for (const ch of cs.changes) {
        switch (ch.kind) {
            case 'createTable':
                out.push(emitCreateTable(ch.table));
                break;
            case 'dropTable':
                out.push(`DROP TABLE ${tname(ch.ref)}`);
                break;
            case 'renameTable':
                out.push(`RENAME TABLE ${tname(ch.from)} TO ${tname(ch.to)}`);
                break;
            case 'alterTable':
                out.push(...emitAlterTable(ch.ref, ch.ops));
                break;
            case 'createIndex':
                out.push(emitCreateIndex(ch.ref, ch.index));
                break;
            case 'dropIndex':
                out.push(`DROP INDEX ${q(ch.name)} ON ${tname(ch.ref)}`);
                break;
            case 'addFK':
                out.push(emitAddFk(ch.ref, ch.fk));
                break;
            case 'dropFK':
                out.push(`ALTER TABLE ${tname(ch.ref)} DROP FOREIGN KEY ${q(ch.name)}`);
                break;
            case 'createView':
                out.push(`CREATE OR REPLACE VIEW ${q(ch.view.schema)}.${q(ch.view.name)} AS ${ch.view.sql}`);
                break;
            case 'dropView':
                out.push(`DROP VIEW ${tname(ch.ref)}`);
                break;
        }
    }
    return out;
}
function emitCreateTable(t) {
    const cols = t.columns.map(emitColumn);
    const idx = t.indexes.map(ixInline);
    const fks = t.fks.map(fkInline);
    const parts = [...cols, ...idx, ...fks].filter(Boolean);
    const tail = [t.ext?.mysqlEngine ? `ENGINE=${t.ext.mysqlEngine}` : null, t.ext?.mysqlCollation ? `DEFAULT COLLATE=${t.ext.mysqlCollation}` : null, t.comment ? `COMMENT=${lit(t.comment)}` : null].filter(Boolean).join(' ');
    return `CREATE TABLE ${q(t.schema)}.${q(t.name)} (\n  ${parts.join(',\n  ')}\n) ${tail}`.trim();
}
function emitAlterTable(ref, ops) {
    const t = tname(ref);
    return ops.map(op => {
        if (op.op === 'addColumn')
            return `ALTER TABLE ${t} ADD COLUMN ${emitColumn(op.col)}`;
        if (op.op === 'modifyColumn')
            return `ALTER TABLE ${t} MODIFY COLUMN ${emitColumn(op.col)}`;
        if (op.op === 'dropColumn')
            return `ALTER TABLE ${t} DROP COLUMN ${q(op.name)}`;
        if (op.op === 'renameColumn')
            return `ALTER TABLE ${t} RENAME COLUMN ${q(op.from)} TO ${q(op.to)}`;
        if (op.op === 'alterOptions')
            return `ALTER TABLE ${t} /* options */`;
        return `-- unsupported op ${op.op}`;
    });
}
function emitCreateIndex(ref, ix) {
    const cols = ix.parts.map(p => `${/^[A-Za-z0-9_]+$/.test(p.colOrExpr) ? '`' + p.colOrExpr + '`' : p.colOrExpr}${p.prefixLen != null ? `(${p.prefixLen})` : ''}`).join(',');
    const uniq = ix.unique ? 'UNIQUE ' : '';
    const using = ix.using && ix.using.toUpperCase() !== 'BTREE' ? ` USING ${ix.using}` : '';
    const inv = ix.invisible ? ' INVISIBLE' : '';
    return `CREATE ${uniq}INDEX ${q(ix.name)} ON ${tname(ref)} (${cols})${using}${inv}`;
}
function emitAddFk(ref, fk) {
    const cols = fk.columns.map(c => '`' + c + '`').join(',');
    const rcols = fk.refColumns.map(c => '`' + c + '`').join(',');
    const od = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '';
    const ou = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : '';
    return `ALTER TABLE ${tname(ref)} ADD CONSTRAINT ${'`' + fk.name + '`'} FOREIGN KEY (${cols}) REFERENCES ${'`' + fk.refSchema + '`'}.${'`' + fk.refTable + '`'} (${rcols})${od}${ou}`;
}
function emitColumn(c) {
    const nulls = c.nullable ? 'NULL' : 'NOT NULL';
    const gen = c.generated ? ` AS (${c.generated.expr}) ${c.generated.stored ? 'STORED' : 'VIRTUAL'}` : '';
    const dfl = c.default ? (c.default.kind === 'literal' ? ` DEFAULT ${lit(c.default.text)}` : ` DEFAULT ${c.default.text}`) : '';
    const ai = c.autoIncrement ? ' AUTO_INCREMENT' : '';
    const coll = c.collation ? ` COLLATE ${c.collation}` : '';
    const com = c.comment ? ` COMMENT ${lit(c.comment)}` : '';
    return `\`${c.name}\` ${c.type} ${nulls}${gen}${dfl}${ai}${coll}${com}`.replace(/\s+/g, ' ').trim();
}
function ixInline(ix) {
    const cols = ix.parts.map(p => `${'`' + p.colOrExpr + '`'}${p.prefixLen != null ? `(${p.prefixLen})` : ''}`).join(',');
    const uniq = ix.unique ? 'UNIQUE ' : '';
    const using = ix.using && ix.using.toUpperCase() !== 'BTREE' ? ` USING ${ix.using}` : '';
    const inv = ix.invisible ? ' INVISIBLE' : '';
    return `${uniq}KEY ${'`' + ix.name + '`'} (${cols})${using}${inv}`;
}
function fkInline(fk) {
    const cols = fk.columns.map(c => '`' + c + '`').join(',');
    const rcols = fk.refColumns.map(c => '`' + c + '`').join(',');
    const od = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '';
    const ou = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : '';
    return `CONSTRAINT ${'`' + fk.name + '`'} FOREIGN KEY (${cols}) REFERENCES ${'`' + fk.refSchema + '`'}.${'`' + fk.refTable + '`'} (${rcols})${od}${ou}`;
}
