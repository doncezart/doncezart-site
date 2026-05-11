import { verifyPassword, createSession } from '$lib/server/auth.js';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required.' });
		}

		const rows = await db.select().from(user).where(eq(user.username, username)).limit(1);
		if (!rows.length) {
			return fail(401, { error: 'Invalid credentials.' });
		}

		const valid = await verifyPassword(password, rows[0].passwordHash);
		if (!valid) {
			return fail(401, { error: 'Invalid credentials.' });
		}

		const sessionId = await createSession(rows[0].id);
		cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 30 * 24 * 60 * 60
		});

		throw redirect(303, '/admin');
	}
};
