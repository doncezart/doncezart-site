export function GET({ url }) {
	const body = `User-agent: *
Disallow: /admin/
Disallow: /admin
Allow: /

Sitemap: ${url.origin}/sitemap.xml
`;
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
