import { validateSession } from '$lib/server/auth.js';

const SESSION_COOKIE = 'session_id';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get(SESSION_COOKIE);
	const result = await validateSession(sessionId);

	event.locals.user = result?.user ?? null;
	event.locals.session = result?.session ?? null;

	// Protect /admin routes
	if (event.url.pathname.startsWith('/admin') && !event.url.pathname.startsWith('/admin/login')) {
		if (!event.locals.user) {
			return new Response(null, {
				status: 302,
				headers: { location: '/admin/login' }
			});
		}
	}

	return resolve(event);
}
