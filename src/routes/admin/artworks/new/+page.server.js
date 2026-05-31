import { db } from '$lib/server/db/index.js';
import {
	artwork,
	artworkImage,
	artworkTag,
	tag,
	category,
	subcategory,
	caseStudy,
	auditEvent
} from '$lib/server/db/schema.ts';
import { fail, redirect } from '@sveltejs/kit';
import {
	slugify,
	uniqueArtworkSlug,
	validateUploads,
	processAndUpload
} from '$lib/server/upload.js';

export async function load() {
	const tags = await db.select().from(tag).orderBy(tag.name);
	const categories = await db.select().from(category).orderBy(category.name);
	const subcategories = await db.select().from(subcategory).orderBy(subcategory.name);
	const caseStudies = await db.select().from(caseStudy).orderBy(caseStudy.title);
	return { tags, categories, subcategories, caseStudies };
}

export const actions = {
	default: async ({ request, locals, getClientAddress }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const cat = data.get('category')?.toString().trim();
		const sub = data.get('subcategory')?.toString().trim() || null;
		const displayMode = data.get('display_mode')?.toString() || 'single';
		const carouselDirection = data.get('carousel_direction')?.toString() || 'horizontal';
		const caseStudyIdRaw = data.get('case_study_id')?.toString().trim();
		const caseStudyId = caseStudyIdRaw ? Number(caseStudyIdRaw) : null;
		const visible = data.get('visible') ? true : true; // default true; admin can toggle later
		const tagIds = data.getAll('tags').map(Number).filter(Boolean);
		const imageFiles = data.getAll('images').filter((f) => f instanceof File && f.size > 0);

		if (!title || !cat) {
			return fail(400, { error: 'Title and category are required.' });
		}
		if (imageFiles.length === 0) {
			return fail(400, { error: 'At least one image is required.' });
		}
		if (displayMode === 'before-after' && imageFiles.length !== 2) {
			return fail(400, { error: 'Before/After mode requires exactly 2 images.' });
		}

		const v = validateUploads(imageFiles);
		if (!v.ok) return fail(400, { error: v.message });

		const slug = await uniqueArtworkSlug(slugify(title));
		const ts = Date.now();

		let processedImages;
		try {
			processedImages = await Promise.all(
				imageFiles.map((file, i) =>
					processAndUpload(file, `artworks/${slug}-${ts}-${i}`)
				)
			);
		} catch (e) {
			console.error('[admin/artworks/new] image pipeline failed:', e);
			return fail(400, { error: e.message || 'Image processing failed.' });
		}

		const cover = processedImages[0];

		let insertedId;
		try {
			await db.transaction(async (tx) => {
				const [row] = await tx
					.insert(artwork)
					.values({
						title,
						slug,
						description,
						imageUrl: cover.imageUrl,
						thumbnailUrl: cover.thumbnailUrl,
						blurDataUrl: cover.blurDataURL,
						category: cat,
						subcategory: sub,
						displayMode,
						carouselDirection,
						caseStudyId,
						hasCaseStudy: !!caseStudyId,
						caseStudyContent: null,
						visible
					})
					.returning();
				insertedId = row.id;

				await tx.insert(artworkImage).values(
					processedImages.map((img, i) => ({
						artworkId: row.id,
						imageUrl: img.imageUrl,
						thumbnailUrl: img.thumbnailUrl,
						blurDataUrl: img.blurDataURL,
						position: i
					}))
				);

				if (tagIds.length) {
					await tx
						.insert(artworkTag)
						.values(tagIds.map((tagId) => ({ artworkId: row.id, tagId })));
				}

				await tx.insert(auditEvent).values({
					actorId: locals.user?.id ?? null,
					actorUsername: locals.user?.username ?? null,
					action: 'artwork.create',
					entityType: 'artwork',
					entityId: String(row.id),
					payload: { slug, category: cat, images: processedImages.length },
					ip: getClientAddress()
				});
			});
		} catch (e) {
			console.error('[admin/artworks/new] DB insert failed:', e);
			return fail(500, { error: 'Database error. Please retry.' });
		}

		throw redirect(303, '/admin/artworks');
	}
};
