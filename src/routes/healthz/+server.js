import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

export async function GET() {
	let dbOk = false;
	try {
		await db.execute(sql`select 1`);
		dbOk = true;
	} catch {
		dbOk = false;
	}
	const body = JSON.stringify({ ok: dbOk, db: dbOk, ts: Date.now() });
	return new Response(body, {
		status: dbOk ? 200 : 503,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store'
		}
	});
}
