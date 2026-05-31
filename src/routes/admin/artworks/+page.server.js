import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, artworkTag, tag, auditEvent } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { deleteFromR2 } from '$lib/server/r2.js';

// Convert a public R2 URL to its storage key
function urlToKey(url) {
	if (!url) return null;
	try { return new URL(url).pathname.slice(1); } catch { return null; }
}

// Given the full-size URL, derive all 5 processed variant keys (full/lg/md/sm/thumb)
function allVariantKeys(fullUrl) {
	const key = urlToKey(fullUrl);
	if (!key) return [];
	const base = key.replace(/-full\.webp$/, '');
	if (base === key) return [key]; // non-standard key — delete as-is
	return ['full', 'lg', 'md', 'sm', 'thumb'].map(v => `${base}-${v}.webp`);
}

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
	delete: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid id' });

		// Gather all R2 URLs before deleting rows
		const [item] = await db.select().from(artwork).where(eq(artwork.id, id)).limit(1);
		if (!item) return fail(404, { error: 'Not found' });
		const images = await db.select().from(artworkImage).where(eq(artworkImage.artworkId, id));

		try {
			await db.transaction(async (tx) => {
				await tx.delete(artworkImage).where(eq(artworkImage.artworkId, id));
				await tx.delete(artworkTag).where(eq(artworkTag.artworkId, id));
				await tx.delete(artwork).where(eq(artwork.id, id));
				await tx.insert(auditEvent).values({
					actorId: locals.user?.id ?? null,
					actorUsername: locals.user?.username ?? null,
					action: 'artwork.delete',
					entityType: 'artwork',
					entityId: String(id),
					payload: { slug: item.slug, title: item.title, imageCount: images.length },
					ip: getClientAddress()
				});
			});
		} catch (e) {
			console.error('[admin/artworks/delete] tx failed:', e);
			return fail(500, { error: 'Database error.' });
		}

		// Delete R2 objects best-effort after DB commit
		const keys = [
			...allVariantKeys(item.imageUrl),
			...images.flatMap((img) => allVariantKeys(img.imageUrl))
		];
		const unique = [...new Set(keys)];
		await Promise.allSettled(unique.map((k) => deleteFromR2(k)));

		return { deleted: true };
	}
};
