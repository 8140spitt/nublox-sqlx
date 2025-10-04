// apps/studio/src/routes/api/sqlx/introspect/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { introspectMySQL } from '@nublox/sqlx-mysql';
import { getExecForConn } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
    const { url } = await request.json();
    if (!url) return new Response('Missing url', { status: 400 });

    const exec = await getExecForConn(url);
    const snap = await introspectMySQL(exec);
    return new Response(JSON.stringify(snap), {
        headers: { 'content-type': 'application/json' }
    });
};
