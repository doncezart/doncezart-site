import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, artworkTag, tag, category, subcategory, caseStudy } from '$lib/server/db/schema.ts';
import { eq, like } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
import { fail, redirect } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function uniqueSlug(base) {
	const existing = await db
		.select({ slug: artwork.slug })
		.from(artwork)
		.where(like(artwork.slug, `${base}%`));
	const taken = new Set(existing.map(r => r.slug));
	if (!taken.has(base)) return base;
	for (let n = 2; n <= 99; n++) {
		const candidate = `${base}-${String(n).padStart(2, '0')}`;
		if (!taken.has(candidate)) return candidate;
	}
	return `${base}-${Date.now()}`;
}

const ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/tiff', 'image/avif'];
const MAX_SIZE = 50 * 1024 * 1024;

export async function load() {
	const tags = await db.select().from(tag).orderBy(tag.name);
	const categories = await db.select().from(category).orderBy(category.name);
	const subcategories = await db.select().from(subcategory).orderBy(subcategory.name);
	const caseStudies = await db.select().from(caseStudy).orderBy(caseStudy.title);
	return { tags, categories, subcategories, caseStudies };
}

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

export const actions = {
	default: async ({ request }) => {
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

		if (imageFiles.length === 0) {
			return fail(400, { error: 'At least one image is required.' });
		}

		if (displayMode === 'before-after' && imageFiles.length !== 2) {
			return fail(400, { error: 'Before/After mode requires exactly 2 images.' });
		}

		for (const f of imageFiles) {
			if (!ALLOWED_TYPES.includes(f.type)) {
				return fail(400, { error: `${f.name}: unsupported format. Use webp, png, jpeg, gif, tiff, or avif.` });
			}
			if (f.size > MAX_SIZE) {
				return fail(400, { error: `${f.name}: must be under 50 MB.` });
			}
		}

		const slug = await uniqueSlug(slugify(title));
		const ts = Date.now();

		let processedImages;
		try {
			processedImages = await Promise.all(
				imageFiles.map((file, i) => processAndUpload(file, `artworks/${slug}-${ts}-${i}`))
			);
		} catch (e) {
			console.error('Image processing/upload failed:', e);
			return fail(500, { error: 'Image processing failed. Check R2 configuration.' });
		}

		const cover = processedImages[0];

		const [inserted] = await db.insert(artwork).values({
			title,
			slug,
			description,
			imageUrl: cover.imageUrl,
			thumbnailUrl: cover.thumbnailUrl,
			blurDataUrl: cover.blurDataURL,
			category,
			subcategory,
			displayMode,
			carouselDirection,
			caseStudyId,
			hasCaseStudy: !!caseStudyId,
			caseStudyContent: null
		}).returning();

		// Insert all images into artwork_image
		await db.insert(artworkImage).values(
			processedImages.map((img, i) => ({
				artworkId: inserted.id,
				imageUrl: img.imageUrl,
				thumbnailUrl: img.thumbnailUrl,
				blurDataUrl: img.blurDataURL,
				position: i
			}))
		);

		if (tagIds.length) {
			await db.insert(artworkTag).values(
				tagIds.map(tagId => ({ artworkId: inserted.id, tagId }))
			);
		}

		throw redirect(303, '/admin/artworks');
	}
};
