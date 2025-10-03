export type Literal = string | number | boolean | null | Date;
export type Row = Record<string, Literal>;
export type QName = { schema?: string; name: string };

export type ExprIR =
    | { kind: 'col'; name: string }
    | { kind: 'lit'; value: Literal }
    | { kind: 'call'; name: string; args: ExprIR[] }
    | { kind: 'bin'; left: ExprIR; op: string; right: ExprIR }
    | { kind: 'un'; op: string; expr: ExprIR };

export type InsertIR = { kind: 'insert'; into: QName; rows: Row[]; returning?: string[] };
export type UpdateIR = { kind: 'update'; table: QName; set: Row; where?: ExprIR; returning?: string[] };
export type DeleteIR = { kind: 'delete'; from: QName; where?: ExprIR; returning?: string[] };
export type UpsertIR = { kind: 'upsert'; into: QName; row: Row; conflict: { on: string[]; set: Row }; returning?: string[] };
export type DmlIR = InsertIR | UpdateIR | DeleteIR | UpsertIR;
