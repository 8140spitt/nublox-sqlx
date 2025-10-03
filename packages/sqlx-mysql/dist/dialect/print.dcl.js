"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printDCL = printDCL;
function printDCL(ir) {
    switch (ir.kind) {
        case 'createUser':
            return `CREATE USER '${ir.name}'@'%'${ir.password ? ` IDENTIFIED BY '${ir.password.replaceAll("'", "''")}'` : ''}${ir.requireSsl ? ' REQUIRE SSL' : ''}`;
        case 'alterUser':
            return `ALTER USER '${ir.name}'@'%'${ir.password ? ` IDENTIFIED BY '${ir.password.replaceAll("'", "''")}'` : ''}${ir.lock ? ' ACCOUNT LOCK' : ''}`;
        case 'grant':
            return `GRANT ${ir.privileges.join(', ')} ON ${scope(ir.on)} TO '${ir.to}'@'%'${ir.withGrantOption ? ' WITH GRANT OPTION' : ''}`;
        case 'revoke':
            return `REVOKE ${ir.privileges.join(', ')} ON ${scope(ir.on)} FROM '${ir.from}'@'%'`;
    }
}
function scope(s) { if (s === '*')
    return '*.*'; if (s.name)
    return `\`${s.schema}\`.\`${s.name}\``; return `\`${s.schema}\`.*`; }
