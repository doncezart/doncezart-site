import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, tag, category, auditEvent } from '$lib/server/db/schema.ts';
import { fail } from '@sveltejs/kit';
import {
	slugify,
	uniqueArtworkSlug,
	validateUploads,
	processAndUpload
} from '$lib/server/upload.js';

export async function load() {
	const tags = await db.select().from(tag).orderBy(tag.name);
	const categories = await db.select().from(category).orderBy(category.name);
	return { tags, categories };
}

export const actions = {
	default: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const cat = data.get('category')?.toString().trim();
		const imageFiles = data.getAll('images').filter((f) => f instanceof File && f.size > 0);

		if (!cat) return fail(400, { error: 'Category is required.' });
		if (imageFiles.length === 0) return fail(400, { error: 'Select at least one image.' });

		const v = validateUploads(imageFiles);
		if (!v.ok) return fail(400, { error: v.message });

		const results = { success: 0, failed: [] };

		for (const file of imageFiles) {
			try {
				const stem = (file.name || 'artwork').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
				const title = stem.charAt(0).toUpperCase() + stem.slice(1) || 'Untitled';
				const slug = await uniqueArtworkSlug(slugify(title));
				const ts = Date.now();

				const processed = await processAndUpload(file, `artworks/${slug}-${ts}-0`);

				await db.transaction(async (tx) => {
					const [row] = await tx
						.insert(artwork)
						.values({
							title,
							slug,
							imageUrl: processed.imageUrl,
							thumbnailUrl: processed.thumbnailUrl,
							blurDataUrl: processed.blurDataURL,
							category: cat,
							displayMode: 'single'
						})
						.returning();

					await tx.insert(artworkImage).values({
						artworkId: row.id,
						imageUrl: processed.imageUrl,
						thumbnailUrl: processed.thumbnailUrl,
						blurDataUrl: processed.blurDataURL,
						position: 0
					});

					await tx.insert(auditEvent).values({
						actorId: locals.user?.id ?? null,
						actorUsername: locals.user?.username ?? null,
						action: 'artwork.bulk_create',
						entityType: 'artwork',
						entityId: String(row.id),
						payload: { slug, category: cat, source: file.name },
						ip: getClientAddress()
					});
				});

				results.success++;
			} catch (e) {
				console.error(`[admin/artworks/bulk] failed for ${file.name}:`, e);
				results.failed.push({ name: file.name, reason: e.message || 'unknown error' });
			}
		}

		return { success: true, uploaded: results.success, failed: results.failed };
	}
};
