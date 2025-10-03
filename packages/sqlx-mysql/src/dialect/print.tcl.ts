import type { TclIR } from '@nublox/sqlx-core';
export function printTCL(ir: TclIR): string {
    switch (ir.kind) {
        case 'begin': return `START TRANSACTION${ir.isolation ? ` ISOLATION LEVEL ${ir.isolation.toUpperCase()}` : ''}`;
        case 'commit': return 'COMMIT';
        case 'rollback': return ir.toSavepoint ? `ROLLBACK TO ${ir.toSavepoint}` : 'ROLLBACK';
        case 'savepoint': return `SAVEPOINT ${ir.name}`;
        case 'release': return `RELEASE SAVEPOINT ${ir.name}`;
    }
}
