export const q = (s: string) => '`' + s.replaceAll('`', '``') + '`';
export const tname = (s?: string, n?: string) => s ? `${q(s)}.${q(n!)}` : q(n!);
export const lit = (v: any) =>
    v === null ? 'NULL'
        : v instanceof Date ? `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`
            : typeof v === 'string' ? `'${v.replaceAll("'", "''")}'`
                : String(v);
