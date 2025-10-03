"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectMySQL = introspectMySQL;
const sqlx_core_1 = require("@nublox/sqlx-core");
function normalizeIndexType(mysqlType) {
    if (!mysqlType)
        return undefined;
    const t = mysqlType.toLowerCase();
    switch (t) {
        case "btree": return "btree";
        case "hash": return "hash";
        case "fulltext": return "fulltext";
        case "spatial": return "spatial";
        default: return "unknown"; // fallback
    }
}
async function introspectMySQL(exec) {
    const schemasRes = await exec(`SELECT SCHEMA_NAME AS name
       FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME NOT IN ('mysql','information_schema','performance_schema','sys')
      ORDER BY 1`);
    const schemas = schemasRes.rows.map((r) => r.name);
    const tables = [];
    const views = [];
    for (const schema of schemas) {
        const tRes = await exec(`SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_COLLATION, TABLE_COMMENT
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA=?`, [schema]);
        for (const t of tRes.rows) {
            if (t.TABLE_TYPE === "VIEW") {
                const vRes = await exec(`SELECT VIEW_DEFINITION, DEFINER, SECURITY_TYPE
             FROM information_schema.VIEWS
            WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`, [schema, t.TABLE_NAME]);
                views.push({
                    schema,
                    name: t.TABLE_NAME,
                    sql: vRes.rows[0]?.VIEW_DEFINITION || "",
                    definer: vRes.rows[0]?.DEFINER || null,
                    security: vRes.rows[0]?.SECURITY_TYPE || null
                });
                continue;
            }
            const cRes = await exec(`SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
                EXTRA, COLUMN_COMMENT, COLLATION_NAME, GENERATION_EXPRESSION
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA=? AND TABLE_NAME=?
          ORDER BY ORDINAL_POSITION`, [schema, t.TABLE_NAME]);
            const columns = cRes.rows.map((c) => ({
                name: c.COLUMN_NAME,
                type: c.COLUMN_TYPE,
                nullable: c.IS_NULLABLE === "YES",
                default: c.COLUMN_DEFAULT != null
                    ? { kind: "literal", text: String(c.COLUMN_DEFAULT) }
                    : null,
                generated: c.GENERATION_EXPRESSION
                    ? { expr: c.GENERATION_EXPRESSION, stored: String(c.EXTRA || "").includes("STORED") }
                    : null,
                autoIncrement: String(c.EXTRA || "").includes("auto_increment"),
                collation: c.COLLATION_NAME,
                comment: c.COLUMN_COMMENT || null
            }));
            const iRes = await exec(`SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART,
                INDEX_TYPE, IS_VISIBLE
           FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA=? AND TABLE_NAME=?
          ORDER BY INDEX_NAME, SEQ_IN_INDEX`, [schema, t.TABLE_NAME]);
            const indexMap = new Map();
            for (const i of iRes.rows) {
                const arr = indexMap.get(i.INDEX_NAME) || [];
                arr.push(i);
                indexMap.set(i.INDEX_NAME, arr);
            }
            const indexes = Array.from(indexMap.entries()).map(([name, parts]) => ({
                name,
                unique: parts[0].NON_UNIQUE === 0,
                using: normalizeIndexType(parts[0].INDEX_TYPE),
                invisible: parts[0].IS_VISIBLE === "NO",
                parts: parts
                    .sort((a, b) => a.SEQ_IN_INDEX - b.SEQ_IN_INDEX)
                    .map((p) => ({ colOrExpr: p.COLUMN_NAME, prefixLen: p.SUB_PART }))
            }));
            const fRes = await exec(`SELECT k.CONSTRAINT_NAME, k.COLUMN_NAME,
                k.REFERENCED_TABLE_SCHEMA, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME,
                r.UPDATE_RULE, r.DELETE_RULE
           FROM information_schema.KEY_COLUMN_USAGE k
           JOIN information_schema.REFERENTIAL_CONSTRAINTS r
             ON r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
            AND r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
          WHERE k.TABLE_SCHEMA=? AND k.TABLE_NAME=?
            AND k.REFERENCED_TABLE_NAME IS NOT NULL
          ORDER BY k.ORDINAL_POSITION`, [schema, t.TABLE_NAME]);
            const fkMap = new Map();
            for (const f of fRes.rows) {
                const arr = fkMap.get(f.CONSTRAINT_NAME) || [];
                arr.push(f);
                fkMap.set(f.CONSTRAINT_NAME, arr);
            }
            const fks = Array.from(fkMap.entries()).map(([name, parts]) => ({
                name,
                columns: parts.map((p) => p.COLUMN_NAME),
                refSchema: parts[0].REFERENCED_TABLE_SCHEMA,
                refTable: parts[0].REFERENCED_TABLE_NAME,
                refColumns: parts.map((p) => p.REFERENCED_COLUMN_NAME),
                onDelete: parts[0].DELETE_RULE,
                onUpdate: parts[0].UPDATE_RULE
            }));
            tables.push({
                schema,
                name: t.TABLE_NAME,
                comment: t.TABLE_COMMENT,
                columns,
                indexes,
                fks,
                checks: []
            });
        }
    }
    const snapshot = {
        db: null,
        schemas,
        tables,
        views,
        generatedAt: new Date().toISOString()
    };
    snapshot.fingerprint = (0, sqlx_core_1.sha256)(JSON.stringify(snapshot));
    return snapshot;
}
