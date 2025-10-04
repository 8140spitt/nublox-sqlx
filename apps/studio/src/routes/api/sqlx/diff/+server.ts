// apps/studio/src/routes/api/sqlx/diff/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { diffSnapshots } from '@nublox/sqlx-core';

export const POST: RequestHandler = async ({ request }) => {
    const { fromSnapshot, toSnapshot } = await request.json();
    if (!fromSnapshot || !toSnapshot) {
        return new Response('Missing snapshots', { status: 400 });
    }

    const plan = diffSnapshots(fromSnapshot, toSnapshot);
    return new Response(JSON.stringify(plan), {
        headers: { 'content-type': 'application/json' }
    });
};
