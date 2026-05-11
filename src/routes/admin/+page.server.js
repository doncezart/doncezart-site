import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, tag, caseStudy } from '$lib/server/db/schema.ts';
import { sql, desc, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth.js';

export const actions = {
	logout: async ({ cookies }) => {
		const sessionId = cookies.get('session_id');
		if (sessionId) await deleteSession(sessionId);
		cookies.delete('session_id', { path: '/' });
		throw redirect(303, '/admin/login');
	}
};

export async function load() {
	const [artworkCount] = await db.select({ count: sql`count(*)::int` }).from(artwork);
	const [tagCount] = await db.select({ count: sql`count(*)::int` }).from(tag);
	const [caseStudyCount] = await db.select({ count: sql`count(*)::int` }).from(caseStudy);
	const [processedCount] = await db.select({ count: sql`count(*)::int` }).from(artwork).where(sql`thumbnail_url IS NOT NULL AND blur_data_url IS NOT NULL`);
	const recentArtworks = await db.select().from(artwork).orderBy(desc(artwork.createdAt)).limit(5);

	// For each recent artwork, get its image count and processed image count
	const recentIds = recentArtworks.map(a => a.id);
	let imageStats = [];
	if (recentIds.length > 0) {
		imageStats = await db
			.select({
				artworkId: artworkImage.artworkId,
				total: sql`count(*)::int`,
				processed: sql`count(*) FILTER (WHERE thumbnail_url IS NOT NULL)::int`
			})
			.from(artworkImage)
			.where(inArray(artworkImage.artworkId, recentIds))
			.groupBy(artworkImage.artworkId);
	}
	const imageStatsMap = Object.fromEntries(imageStats.map(s => [s.artworkId, s]));

	const recentWithStatus = recentArtworks.map(a => ({
		...a,
		processed: !!(a.thumbnailUrl && a.blurDataUrl),
		imageTotal: imageStatsMap[a.id]?.total ?? 0,
		imageProcessed: imageStatsMap[a.id]?.processed ?? 0
	}));

	// Category breakdown
	const categoryRows = await db
		.select({ category: artwork.category, count: sql`count(*)::int` })
		.from(artwork)
		.groupBy(artwork.category);

	return {
		artworkCount: artworkCount?.count ?? 0,
		tagCount: tagCount?.count ?? 0,
		caseStudyCount: caseStudyCount?.count ?? 0,
		processedCount: processedCount?.count ?? 0,
		recentArtworks: recentWithStatus,
		categories: categoryRows
	};
}
