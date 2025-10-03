export type AdvisorSeverity = 'info' | 'warn' | 'error';
export interface AdvisorFinding {
    code: 'IDX_DUPLICATE' | 'IDX_OVERLAP' | 'MISSING_PK' | 'FK_NO_SUPPORTING_INDEX' | 'REDUNDANT_UNIQUE_PK';
    message: string;
    table?: string;
    index?: string;
    columns?: string[];
    severity: AdvisorSeverity;
}
export declare function adviseMySQL(snapshot: any): AdvisorFinding[];
