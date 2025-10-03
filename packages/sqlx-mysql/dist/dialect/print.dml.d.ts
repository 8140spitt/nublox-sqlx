import type { DmlIR } from '@nublox/sqlx-core';
export declare function printDML(ir: DmlIR): {
    sql: string;
    params: any[];
};
