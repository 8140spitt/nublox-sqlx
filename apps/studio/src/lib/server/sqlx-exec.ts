// apps/studio/src/lib/server/sqlx-exec.ts
export type Exec = (sql: string, params?: any[]) => Promise<{ rows: any[] }>;

export async function getExecForConn(url: string): Promise<Exec> {
    const mysql = await import('mysql2/promise');
    const pool = mysql.createPool(url);
    return async (sql: string, params?: any[]) => {
        const [rows] = await pool.query(sql, params);
        return { rows: Array.isArray(rows) ? rows : [] };
    };
}
