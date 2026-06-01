import { validateSession } from '$lib/server/auth.js';
import { db } from '$lib/server/db/index.js';
import { slugRedirect } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';

const SESSION_COOKIE = 'session_id';

// Cloudflare Rocket Loader rewrites nonce-protected scripts and breaks SvelteKit hydration.
function disableRocketLoader(html) {
	return html.replace(/<script(?![^>]*\bdata-cfasync=)/g, '<script data-cfasync="false"');
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get(SESSION_COOKIE);
	const result = await validateSession(sessionId);

	event.locals.user = result?.user ?? null;
	event.locals.session = result?.session ?? null;

	if (event.url.pathname.startsWith('/admin') && !event.url.pathname.startsWith('/admin/login')) {
		if (!event.locals.user) {
			return new Response(null, {
				status: 302,
				headers: { location: '/admin/login' }
			});
		}
	}

	// 301 redirect for renamed artwork slugs
	if (event.url.pathname.startsWith('/work/')) {
		const oldSlug = event.url.pathname.slice('/work/'.length).split('/')[0];
		if (oldSlug) {
			try {
				const [r] = await db
					.select()
					.from(slugRedirect)
					.where(eq(slugRedirect.fromSlug, oldSlug))
					.limit(1);
				if (r && r.toSlug !== oldSlug) {
					return new Response(null, {
						status: 301,
						headers: { location: `/work/${r.toSlug}` }
					});
				}
			} catch {
				// slug_redirect table may not exist yet; ignore.
			}
		}
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => disableRocketLoader(html)
	});

	// CSP is set by SvelteKit (see svelte.config.js -> kit.csp).
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
	response.headers.set('X-DNS-Prefetch-Control', 'off');

	// Block search engines from indexing /admin/* and ensure no caching.
	if (event.url.pathname.startsWith('/admin')) {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
		response.headers.set('Cache-Control', 'no-store, max-age=0');
	}

	return response;
}
