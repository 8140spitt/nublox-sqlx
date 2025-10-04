import { SqlxClient } from '@nublox/sqlx-client';
import { createMysqlWireDriver } from '@nublox/sqlx-driver-mysql-wire';

const db = new SqlxClient({
    url: process.env.DATABASE_URL!,
    driverFactory: createMysqlWireDriver,
});

await db.connect();
const { rows } = await db.exec('SELECT 1 AS ok');
console.log(rows);
await db.close();
