import { db } from '$lib/server/db/index.js';
import { artwork, artworkImage, tag, category } from '$lib/server/db/schema.ts';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
import { fail } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/tiff', 'image/avif'];
const MAX_SIZE = 50 * 1024 * 1024;

export async function load() {
	const tags = await db.select().from(tag).orderBy(tag.name);
	const categories = await db.select().from(category).orderBy(category.name);
	return { tags, categories };
}

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const category = data.get('category')?.toString().trim();
		const imageFiles = data.getAll('images').filter(f => f instanceof File && f.size > 0);

		if (!category) {
			return fail(400, { error: 'Category is required.' });
		}

		if (imageFiles.length === 0) {
			return fail(400, { error: 'Select at least one image.' });
		}

		for (const f of imageFiles) {
			if (!ALLOWED_TYPES.includes(f.type)) {
				return fail(400, { error: `${f.name}: unsupported format.` });
			}
			if (f.size > MAX_SIZE) {
				return fail(400, { error: `${f.name}: must be under 50 MB.` });
			}
		}

		const results = { success: 0, failed: [] };

		for (const file of imageFiles) {
			try {
				const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
				const title = name.charAt(0).toUpperCase() + name.slice(1);
				const slug = slugify(title) || `artwork-${Date.now()}`;
				const ts = Date.now();
				const baseKey = `artworks/${slug}-${ts}-0`;

				const buffer = Buffer.from(await file.arrayBuffer());
				const processed = await processImage(buffer, baseKey);

				const uploads = await Promise.all(
					processed.variants.map(async (v) => {
						const url = await uploadToR2(v.buffer, v.key, v.contentType);
						return { name: v.name, url };
					})
				);

				const urlMap = Object.fromEntries(uploads.map(u => [u.name, u.url]));

				const [inserted] = await db.insert(artwork).values({
					title,
					slug: `${slug}-${ts}`,
					imageUrl: urlMap.full,
					thumbnailUrl: urlMap.thumb,
					blurDataUrl: processed.blurDataURL,
					category,
					displayMode: 'single'
				}).returning();

				await db.insert(artworkImage).values({
					artworkId: inserted.id,
					imageUrl: urlMap.full,
					thumbnailUrl: urlMap.thumb,
					blurDataUrl: processed.blurDataURL,
					position: 0
				});

				results.success++;
			} catch (e) {
				console.error(`Bulk upload failed for ${file.name}:`, e);
				results.failed.push(file.name);
			}
		}

		return {
			success: true,
			uploaded: results.success,
			failed: results.failed
		};
	}
};
