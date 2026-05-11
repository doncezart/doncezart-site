import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, artworkTag, tag } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export async function load() {
	const artworks = await db.select().from(artwork).orderBy(artwork.createdAt);

	const allTags = await db.select().from(tag);
	const atRows = await db.select().from(artworkTag);
	const aiRows = await db.select().from(artworkImage);

	const tagMap = Object.fromEntries(allTags.map(t => [t.id, t]));
	const artworkTags = {};
	for (const row of atRows) {
		if (!artworkTags[row.artworkId]) artworkTags[row.artworkId] = [];
		if (tagMap[row.tagId]) artworkTags[row.artworkId].push(tagMap[row.tagId]);
	}

	const imageCounts = {};
	for (const row of aiRows) {
		imageCounts[row.artworkId] = (imageCounts[row.artworkId] || 0) + 1;
	}

	return {
		artworks: artworks.map(a => ({
			...a,
			tags: artworkTags[a.id] ?? [],
			imageCount: imageCounts[a.id] || 1,
			processed: !!(a.thumbnailUrl && a.blurDataUrl)
		}))
	};
}

export const actions = {
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id' });

		await db.delete(artworkImage).where(eq(artworkImage.artworkId, id));
		await db.delete(artworkTag).where(eq(artworkTag.artworkId, id));
		await db.delete(artwork).where(eq(artwork.id, id));
		return { deleted: true };
	}
};
