import type { ExprIR, QName } from './dml';

export interface SelectIR {
    from: QName;
    columns: Array<{ expr: ExprIR; as?: string }>;
    joins?: Array<{ kind: 'inner' | 'left' | 'right' | 'full'; table: QName; on: ExprIR }>;
    where?: ExprIR;
    groupBy?: ExprIR[];
    having?: ExprIR;
    orderBy?: Array<{ expr: ExprIR; dir?: 'asc' | 'desc' }>;
    limit?: number; offset?: number;
}
