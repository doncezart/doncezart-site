import { db } from '$lib/server/db/index.js';
import {
	discoveryItem, discoveryItemImage, discoveryItemTag,
	discoverySection, discoveryTag
} from '$lib/server/db/schema.ts';
import { eq, asc } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
import { applyFaststart, extractFrame } from '$lib/server/video.js';
import { generatePreviewAsync } from '$lib/server/generatePreview.js';
import { fail, redirect, error } from '@sveltejs/kit';

function slugify(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractYoutubeId(input) {
	if (!input) return null;
	const trimmed = input.trim();
	if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
	try {
		const url = new URL(trimmed);
		if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
		if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
	} catch {}
	return null;
}

const ALLOWED_IMAGE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

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
	return { imageUrl: urlMap.full, thumbnailUrl: urlMap.thumb };
}

export async function load({ params }) {
	const id = Number(params.id);
	if (!id) error(404, 'Not found');

	const [item] = await db.select().from(discoveryItem).where(eq(discoveryItem.id, id));
	if (!item) error(404, 'Item not found');

	const images = await db
		.select()
		.from(discoveryItemImage)
		.where(eq(discoveryItemImage.itemId, id))
		.orderBy(asc(discoveryItemImage.position));

	const itemTagRows = await db
		.select()
		.from(discoveryItemTag)
		.where(eq(discoveryItemTag.itemId, id));
	const currentTagIds = new Set(itemTagRows.map(r => r.tagId));

	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const allTags = await db.select().from(discoveryTag).orderBy(discoveryTag.name);

	return {
		item,
		images,
		sections,
		allTags: allTags.map(t => ({ ...t, checked: currentTagIds.has(t.id) }))
	};
}

export const actions = {
	update: async ({ request, params }) => {
		const id = Number(params.id);
		if (!id) return fail(400, { error: 'Invalid id.' });

		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const notes = data.get('notes')?.toString().trim() || null;
		const sectionId = Number(data.get('section_id'));
		const creatorName = data.get('creator_name')?.toString().trim() || null;
		const creatorUrl = data.get('creator_url')?.toString().trim() || null;
		const sourceUrl = data.get('source_url')?.toString().trim() || null;
		const tagIds = data.getAll('tags').map(Number).filter(Boolean);
		const youtubeInput = data.get('youtube_url')?.toString().trim() || null;
		const visible = data.get('visible') === 'true';

		if (!title || !sectionId) {
			return fail(400, { error: 'Title and section are required.' });
		}

		const [existing] = await db.select().from(discoveryItem).where(eq(discoveryItem.id, id));
		if (!existing) return fail(404, { error: 'Item not found.' });

		const slug = slugify(title);
		const ts = Date.now();
		let imageUrl = existing.imageUrl;
		let thumbnailUrl = existing.thumbnailUrl;
		let youtubeId = existing.youtubeId;
		let existingPreviewUrl = existing.previewUrl;
		let carouselImages = null;

		// Determine mediaType: youtube toggle > uploaded file type > keep existing
		let mediaType = existing.mediaType;

		if (youtubeInput) {
			mediaType = 'youtube';
			youtubeId = extractYoutubeId(youtubeInput);
			if (!youtubeId) return fail(400, { error: 'Invalid YouTube URL or video ID.' });
			thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
			imageUrl = null;

		} else {
			youtubeId = null;
			const mediaFile = data.get('media');
			const hasNewFile = mediaFile instanceof File && mediaFile.size > 0;

			if (hasNewFile) {
				if (ALLOWED_VIDEO_TYPES.includes(mediaFile.type)) {
					mediaType = 'video';
					if (mediaFile.size > MAX_VIDEO_SIZE) return fail(400, { error: 'Video must be under 200 MB.' });
					try {
						let buffer = Buffer.from(await mediaFile.arrayBuffer());
						const ext = mediaFile.name.split('.').pop() || 'mp4';
						try { buffer = applyFaststart(buffer, ext); } catch { /* non-fatal */ }
						imageUrl = await uploadToR2(buffer, `discovery/${slug}-${ts}.${ext}`, mediaFile.type);
						thumbnailUrl = null;
						existingPreviewUrl = null;
					} catch (e) {
						console.error(e);
						return fail(500, { error: 'Video upload failed.' });
					}

				} else if (ALLOWED_IMAGE_TYPES.includes(mediaFile.type)) {
					const allFiles = data.getAll('media').filter(f => f instanceof File && f.size > 0);
					if (allFiles.length > 1) {
						mediaType = 'carousel';
						try {
							const results = await Promise.all(
								allFiles.map((f, i) => processAndUpload(f, `discovery/${slug}-${ts}-${i}`))
							);
							imageUrl = results[0].imageUrl;
							thumbnailUrl = results[0].thumbnailUrl;
							carouselImages = results;
						} catch (e) {
							console.error(e);
							return fail(500, { error: 'Image upload failed.' });
						}
					} else {
						mediaType = 'image';
						try {
							const r = await processAndUpload(mediaFile, `discovery/${slug}-${ts}`);
							imageUrl = r.imageUrl;
							thumbnailUrl = r.thumbnailUrl;
						} catch (e) {
							console.error(e);
							return fail(500, { error: 'Image upload failed.' });
						}
					}
					youtubeId = null;
				} else {
					return fail(400, { error: 'Unsupported file type.' });
				}
			}
		}

		// non-video types have no preview
		if (mediaType !== 'video') existingPreviewUrl = null;

		await db.update(discoveryItem)
			.set({
				title, description, notes, sectionId, mediaType,
				imageUrl, thumbnailUrl, youtubeId,
				previewUrl: existingPreviewUrl,
				sourceUrl, creatorName, creatorUrl, visible,
				updatedAt: new Date()
			})
			.where(eq(discoveryItem.id, id));

		if (mediaType === 'carousel' && carouselImages !== null) {
			await db.delete(discoveryItemImage).where(eq(discoveryItemImage.itemId, id));
			await db.insert(discoveryItemImage).values(
				carouselImages.map((img, i) => ({
					itemId: id,
					imageUrl: img.imageUrl,
					thumbnailUrl: img.thumbnailUrl,
					position: i
				}))
			);
		}

		await db.delete(discoveryItemTag).where(eq(discoveryItemTag.itemId, id));
		if (tagIds.length > 0) {
			await db.insert(discoveryItemTag).values(tagIds.map(tagId => ({ itemId: id, tagId })));
		}

		// fire-and-forget preview generation when video was replaced
		if (mediaType === 'video' && imageUrl && imageUrl !== existing.imageUrl) {
			generatePreviewAsync(id, imageUrl).catch(e => console.error('[preview]', e.message));
		}

		redirect(303, '/admin/discovery');
	},

	regen_thumb: async ({ request, params }) => {
		const id = Number(params.id);
		if (!id) return fail(400, { error: 'Invalid id.' });

		const data = await request.formData();
		const offsetRaw = data.get('offset')?.toString().trim();
		const offset = Math.max(0, parseFloat(offsetRaw) || 0);

		const [item] = await db.select().from(discoveryItem).where(eq(discoveryItem.id, id));
		if (!item) return fail(404, { error: 'Item not found.' });
		if (item.mediaType !== 'video' || !item.imageUrl) {
			return fail(400, { error: 'Thumbnail regeneration is only supported for video items.' });
		}

		try {
			const frameBuffer = extractFrame(item.imageUrl, offset);
			const ts = Date.now();
			const thumbUrl = await uploadToR2(frameBuffer, `discovery/thumbs/${id}-${ts}.jpg`, 'image/jpeg');
			await db.update(discoveryItem)
				.set({ thumbnailUrl: thumbUrl, updatedAt: new Date() })
				.where(eq(discoveryItem.id, id));
			return { success: true, thumbUrl };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Thumbnail generation failed: ' + (e.message ?? String(e)) });
		}
	}
};
