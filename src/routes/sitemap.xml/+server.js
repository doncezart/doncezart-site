import { db } from '$lib/server/db/index.js';
import { artwork, discoverySection } from '$lib/server/db/schema.ts';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { tools } from '$lib/data/tools.js';
import { SITE } from '$lib/data/site.js';

// Every public page, for search engines (linked from /robots.txt). Fixed
// pages are listed here; tools, Discovery sections and case studies come
// from their registries, so new ones show up on their own.
const PAGES = ['/', '/designer', '/contact', '/my-work', '/tools', '/discovery', '/socials', '/discord', '/privacy'];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET() {
	const [sections, studies] = await Promise.all([
		db.select({ slug: discoverySection.slug }).from(discoverySection).orderBy(asc(discoverySection.position)),
		db
			.select({ slug: artwork.slug, updatedAt: artwork.updatedAt })
			.from(artwork)
			.where(and(eq(artwork.hasCaseStudy, true), eq(artwork.visible, true), isNull(artwork.deletedAt)))
	]);

	const urls = [
		...PAGES.map((path) => ({ path })),
		...tools.filter((t) => t.status === 'live').map((t) => ({ path: t.href })),
		...sections.map((s) => ({ path: `/discovery/${s.slug}` })),
		...studies.map((a) => ({ path: `/work/${a.slug}`, lastmod: a.updatedAt }))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) =>
			`  <url><loc>${esc(SITE + u.path)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`
	)
	.join('\n')}
</urlset>
`;
	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
	});
}
