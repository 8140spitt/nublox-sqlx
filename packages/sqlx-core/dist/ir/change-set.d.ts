import type { CIR_Table, CIR_View, CIR_FK, CIR_Index, CIR_Column } from './cir';
export type ObjRef = {
    schema: string;
    name: string;
};
export type TableAlterOp = {
    op: 'addColumn';
    col: CIR_Column;
} | {
    op: 'modifyColumn';
    col: CIR_Column;
} | {
    op: 'dropColumn';
    name: string;
} | {
    op: 'renameColumn';
    from: string;
    to: string;
} | {
    op: 'alterOptions';
    options: Record<string, unknown>;
};
export type Change = {
    kind: 'createTable';
    table: CIR_Table;
} | {
    kind: 'dropTable';
    ref: ObjRef;
} | {
    kind: 'renameTable';
    from: ObjRef;
    to: ObjRef;
} | {
    kind: 'alterTable';
    ref: ObjRef;
    ops: TableAlterOp[];
} | {
    kind: 'createIndex';
    ref: ObjRef;
    index: CIR_Index;
} | {
    kind: 'dropIndex';
    ref: ObjRef;
    name: string;
} | {
    kind: 'addFK';
    ref: ObjRef;
    fk: CIR_FK;
} | {
    kind: 'dropFK';
    ref: ObjRef;
    name: string;
} | {
    kind: 'createView';
    view: CIR_View;
} | {
    kind: 'dropView';
    ref: ObjRef;
};
export interface ChangeSet {
    changes: Change[];
    phases?: string[];
    summary?: Record<string, number>;
    planHash?: string;
}
