export interface CIR_Snapshot {
    db?: string | null;
    schemas: string[];
    tables: CIR_Table[];
    views: CIR_View[];
    generatedAt: string;
    fingerprint?: string;
}
export interface CIR_Table {
    schema: string;
    name: string;
    comment?: string | null;
    columns: CIR_Column[];
    indexes: CIR_Index[];
    fks: CIR_FK[];
    checks: CIR_Check[];
    ext?: Record<string, unknown>;
}
export interface CIR_Column {
    name: string;
    type: string;
    nullable: boolean;
    default?: {
        kind: 'literal' | 'expr';
        text: string;
    } | null;
    generated?: {
        expr: string;
        stored: boolean;
    } | null;
    autoIncrement?: boolean;
    collation?: string | null;
    comment?: string | null;
}
export interface CIR_Index {
    name: string;
    unique?: boolean;
    using?: 'btree' | 'hash' | 'fulltext' | 'spatial' | 'gist' | 'gin' | 'brin' | 'unknown';
    parts: Array<{
        colOrExpr: string;
        prefixLen?: number | null;
    }>;
    invisible?: boolean;
}
export interface CIR_FK {
    name: string;
    columns: string[];
    refSchema: string;
    refTable: string;
    refColumns: string[];
    onDelete?: 'NO ACTION' | 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'NO ACTION' | 'CASCADE' | 'SET NULL' | 'RESTRICT';
}
export interface CIR_Check {
    name?: string | null;
    expr: string;
}
export interface CIR_View {
    schema: string;
    name: string;
    sql: string;
    security?: 'DEFINER' | 'INVOKER' | null;
    definer?: string | null;
}
