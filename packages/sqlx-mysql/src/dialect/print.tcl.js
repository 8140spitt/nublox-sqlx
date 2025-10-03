"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printTCL = printTCL;
function printTCL(ir) {
    switch (ir.kind) {
        case 'begin': return `START TRANSACTION${ir.isolation ? ` ISOLATION LEVEL ${ir.isolation.toUpperCase()}` : ''}`;
        case 'commit': return 'COMMIT';
        case 'rollback': return ir.toSavepoint ? `ROLLBACK TO ${ir.toSavepoint}` : 'ROLLBACK';
        case 'savepoint': return `SAVEPOINT ${ir.name}`;
        case 'release': return `RELEASE SAVEPOINT ${ir.name}`;
    }
}
