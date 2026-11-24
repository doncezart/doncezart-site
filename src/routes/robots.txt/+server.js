import { SITE } from '$lib/data/site.js';

// Keep the admin, API, card render and private balance pages out of search.
export function GET() {
	const body = `User-agent: *
Disallow: /admin/
Disallow: /admin
Disallow: /api/
Disallow: /render/
Disallow: /balances/
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
