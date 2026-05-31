import { db } from '$lib/server/db/index.js';
import {
	artwork,
	artworkImage,
	artworkTag,
	tag,
	category,
	subcategory,
	caseStudy,
	slugRedirect,
	auditEvent
} from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	slugify,
	uniqueArtworkSlug,
	validateUploads,
	processAndUpload
} from '$lib/server/upload.js';

export async function load({ params }) {
	const id = Number(params.id);
	const [item] = await db.select().from(artwork).where(eq(artwork.id, id)).limit(1);
	if (!item) throw error(404, 'Artwork not found');

	const images = await db
		.select()
		.from(artworkImage)
		.where(eq(artworkImage.artworkId, id))
		.orderBy(artworkImage.position);
	const tags = await db.select().from(tag).orderBy(tag.name);
	const categories = await db.select().from(category).orderBy(category.name);
	const subcategories = await db.select().from(subcategory).orderBy(subcategory.name);
	const caseStudies = await db.select().from(caseStudy).orderBy(caseStudy.title);
	const currentTagRows = await db.select().from(artworkTag).where(eq(artworkTag.artworkId, id));
	const currentTagIds = currentTagRows.map((r) => r.tagId);

	return { artwork: item, images, tags, categories, subcategories, caseStudies, currentTagIds };
}

export const actions = {
	default: async ({ request, params, locals, getClientAddress }) => {
		const id = Number(params.id);
		const [existing] = await db.select().from(artwork).where(eq(artwork.id, id)).limit(1);
		if (!existing) throw error(404, 'Artwork not found');

		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const cat = data.get('category')?.toString().trim();
		const sub = data.get('subcategory')?.toString().trim() || null;
		const displayMode = data.get('display_mode')?.toString() || 'single';
		const carouselDirection = data.get('carousel_direction')?.toString() || 'horizontal';
		const caseStudyIdRaw = data.get('case_study_id')?.toString().trim();
		const caseStudyId = caseStudyIdRaw ? Number(caseStudyIdRaw) : null;
		const visibleRaw = data.get('visible');
		const tagIds = data.getAll('tags').map(Number).filter(Boolean);
		const imageFiles = data.getAll('images').filter((f) => f instanceof File && f.size > 0);

		if (!title || !cat) return fail(400, { error: 'Title and category are required.' });
		if (displayMode === 'before-after' && imageFiles.length > 0 && imageFiles.length !== 2) {
			return fail(400, { error: 'Before/After mode requires exactly 2 images.' });
		}
		const v = validateUploads(imageFiles);
		if (!v.ok) return fail(400, { error: v.message });

		// Slug stability: only regenerate when title actually changed.
		let newSlug = existing.slug;
		if (title !== existing.title) {
			const candidate = slugify(title);
			if (candidate !== existing.slug) {
				newSlug = await uniqueArtworkSlug(candidate);
			}
		}

		const updates = {
			title,
			slug: newSlug,
			description,
			category: cat,
			subcategory: sub,
			displayMode,
			carouselDirection,
			caseStudyId,
			hasCaseStudy: !!caseStudyId,
			visible: visibleRaw === null ? existing.visible : !!visibleRaw,
			updatedAt: new Date()
		};

		let processedImages = null;
		if (imageFiles.length > 0) {
			const ts = Date.now();
			try {
				processedImages = await Promise.all(
					imageFiles.map((file, i) =>
						processAndUpload(file, `artworks/${newSlug}-${ts}-${i}`)
					)
				);
			} catch (e) {
				console.error('[admin/artworks/edit] image pipeline failed:', e);
				return fail(400, { error: e.message || 'Image processing failed.' });
			}
			const cover = processedImages[0];
			updates.imageUrl = cover.imageUrl;
			updates.thumbnailUrl = cover.thumbnailUrl;
			updates.blurDataUrl = cover.blurDataURL;
		}

		try {
			await db.transaction(async (tx) => {
				// Record slug change as a 301 redirect.
				if (newSlug !== existing.slug) {
					await tx
						.insert(slugRedirect)
						.values({ fromSlug: existing.slug, toSlug: newSlug })
						.onConflictDoUpdate({
							target: slugRedirect.fromSlug,
							set: { toSlug: newSlug }
						});
				}

				await tx.update(artwork).set(updates).where(eq(artwork.id, id));

				if (processedImages) {
					await tx.delete(artworkImage).where(eq(artworkImage.artworkId, id));
					await tx.insert(artworkImage).values(
						processedImages.map((img, i) => ({
							artworkId: id,
							imageUrl: img.imageUrl,
							thumbnailUrl: img.thumbnailUrl,
							blurDataUrl: img.blurDataURL,
							position: i
						}))
					);
				}

				await tx.delete(artworkTag).where(eq(artworkTag.artworkId, id));
				if (tagIds.length) {
					await tx
						.insert(artworkTag)
						.values(tagIds.map((tagId) => ({ artworkId: id, tagId })));
				}

				await tx.insert(auditEvent).values({
					actorId: locals.user?.id ?? null,
					actorUsername: locals.user?.username ?? null,
					action: 'artwork.update',
					entityType: 'artwork',
					entityId: String(id),
					payload: {
						oldSlug: existing.slug,
						newSlug,
						titleChanged: title !== existing.title,
						imagesReplaced: !!processedImages
					},
					ip: getClientAddress()
				});
			});
		} catch (e) {
			console.error('[admin/artworks/edit] DB update failed:', e);
			return fail(500, { error: 'Database error. Please retry.' });
		}

		throw redirect(303, '/admin/artworks');
	}
};
