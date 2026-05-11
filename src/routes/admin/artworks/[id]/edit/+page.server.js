import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, artworkTag, tag, category, subcategory, caseStudy } from '$lib/server/db/schema.ts';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/tiff', 'image/avif'];
const MAX_SIZE = 50 * 1024 * 1024;

async function processAndUpload(file, baseKey) {
	const buffer = Buffer.from(await file.arrayBuffer());
	const result = await processImage(buffer, baseKey);
	const uploads = await Promise.all(
		result.variants.map(async (v) => {
			const url = await uploadToR2(v.buffer, v.key, v.contentType);
			return { name: v.name, url };
		})
	);
	const urlMap = Object.fromEntries(uploads.map(u => [u.name, u.url]));
	return { imageUrl: urlMap.full, thumbnailUrl: urlMap.thumb, blurDataURL: result.blurDataURL };
}

export async function load({ params }) {
	const id = Number(params.id);
	const [item] = await db.select().from(artwork).where(eq(artwork.id, id)).limit(1);
	if (!item) throw error(404, 'Artwork not found');

	const images = await db.select().from(artworkImage)
		.where(eq(artworkImage.artworkId, id))
		.orderBy(artworkImage.position);
	const tags = await db.select().from(tag).orderBy(tag.name);
	const categories = await db.select().from(category).orderBy(category.name);
	const subcategories = await db.select().from(subcategory).orderBy(subcategory.name);
	const caseStudies = await db.select().from(caseStudy).orderBy(caseStudy.title);
	const currentTagRows = await db.select().from(artworkTag).where(eq(artworkTag.artworkId, id));
	const currentTagIds = currentTagRows.map(r => r.tagId);

	return { artwork: item, images, tags, categories, subcategories, caseStudies, currentTagIds };
}

export const actions = {
	default: async ({ request, params }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const category = data.get('category')?.toString().trim();
		const subcategory = data.get('subcategory')?.toString().trim() || null;
		const displayMode = data.get('display_mode')?.toString() || 'single';
		const carouselDirection = data.get('carousel_direction')?.toString() || 'horizontal';
		const caseStudyIdRaw = data.get('case_study_id')?.toString().trim();
		const caseStudyId = caseStudyIdRaw ? Number(caseStudyIdRaw) : null;
		const tagIds = data.getAll('tags').map(Number).filter(Boolean);
		const imageFiles = data.getAll('images').filter(f => f instanceof File && f.size > 0);

		if (!title || !category) {
			return fail(400, { error: 'Title and category are required.' });
		}

		if (displayMode === 'before-after' && imageFiles.length > 0 && imageFiles.length !== 2) {
			return fail(400, { error: 'Before/After mode requires exactly 2 images.' });
		}

		for (const f of imageFiles) {
			if (!ALLOWED_TYPES.includes(f.type)) {
				return fail(400, { error: `${f.name}: unsupported format.` });
			}
			if (f.size > MAX_SIZE) {
				return fail(400, { error: `${f.name}: must be under 50 MB.` });
			}
		}

		const slug = slugify(title);
		const updates = {
			title,
			slug,
			description,
			category,
			subcategory,
			displayMode,
			carouselDirection,
			caseStudyId,
			hasCaseStudy: !!caseStudyId,
			updatedAt: new Date()
		};

		if (imageFiles.length > 0) {
			const ts = Date.now();
			let processedImages;
			try {
				processedImages = await Promise.all(
					imageFiles.map((file, i) => processAndUpload(file, `artworks/${slug}-${ts}-${i}`))
				);
			} catch (e) {
				console.error('Image processing/upload failed:', e);
				return fail(500, { error: 'Image processing failed.' });
			}

			const cover = processedImages[0];
			updates.imageUrl = cover.imageUrl;
			updates.thumbnailUrl = cover.thumbnailUrl;
			updates.blurDataUrl = cover.blurDataURL;

			await db.delete(artworkImage).where(eq(artworkImage.artworkId, id));
			await db.insert(artworkImage).values(
				processedImages.map((img, i) => ({
					artworkId: id,
					imageUrl: img.imageUrl,
					thumbnailUrl: img.thumbnailUrl,
					blurDataUrl: img.blurDataURL,
					position: i
				}))
			);
		}

		await db.update(artwork).set(updates).where(eq(artwork.id, id));

		await db.delete(artworkTag).where(eq(artworkTag.artworkId, id));
		if (tagIds.length) {
			await db.insert(artworkTag).values(
				tagIds.map(tagId => ({ artworkId: id, tagId }))
			);
		}

		throw redirect(303, '/admin/artworks');
	}
};
