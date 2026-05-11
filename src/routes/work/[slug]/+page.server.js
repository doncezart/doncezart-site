import { db } from '$lib/server/db/index.js';
import { artwork, artworkTag, tag } from '$lib/server/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const [item] = await db
		.select()
		.from(artwork)
		.where(and(eq(artwork.slug, params.slug), eq(artwork.hasCaseStudy, true)))
		.limit(1);

	if (!item) throw error(404, 'Case study not found');

	const tagRows = await db
		.select({ name: tag.name, slug: tag.slug })
		.from(artworkTag)
		.innerJoin(tag, eq(artworkTag.tagId, tag.id))
		.where(eq(artworkTag.artworkId, item.id));

	return {
		artwork: {
			title: item.title,
			description: item.description,
			imageUrl: item.imageUrl,
			category: item.category,
			caseStudyContent: item.caseStudyContent,
			tags: tagRows
		}
	};
}
