import { validateSession } from '$lib/server/auth.js';

const SESSION_COOKIE = 'session_id';

const CSP = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://analytics.ceza.ro",
	"style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com",
	"font-src 'self' https://fonts.cdnfonts.com https://fonts.gstatic.com",
	"img-src 'self' data: blob: https://doncezart.nyc3.cdn.digitaloceanspaces.com https://cdn.doncez.art",
	"media-src 'self' https://cdn.doncez.art",
	"connect-src 'self' https://challenges.cloudflare.com https://analytics.ceza.ro",
	"frame-src https://challenges.cloudflare.com",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'"
].join('; ');

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

	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	response.headers.set('Content-Security-Policy', CSP);

	return response;
}
