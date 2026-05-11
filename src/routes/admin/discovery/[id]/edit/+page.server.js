import { db } from '$lib/server/db/index.js';
import {
	discoveryItem, discoveryItemImage, discoveryItemTag,
	discoverySection, discoveryTag
} from '$lib/server/db/schema.ts';
import { eq, asc } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
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
	default: async ({ request, params }) => {
		const id = Number(params.id);
		if (!id) return fail(400, { error: 'Invalid id.' });

		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || null;
		const sectionId = Number(data.get('section_id'));
		const mediaType = data.get('media_type')?.toString();
		const creatorName = data.get('creator_name')?.toString().trim() || null;
		const creatorUrl = data.get('creator_url')?.toString().trim() || null;
		const sourceUrl = data.get('source_url')?.toString().trim() || null;
		const tagIds = data.getAll('tags').map(Number).filter(Boolean);
		const youtubeInput = data.get('youtube_url')?.toString().trim() || null;

		if (!title || !sectionId || !mediaType) {
			return fail(400, { error: 'Title, section, and media type are required.' });
		}

		const [existing] = await db.select().from(discoveryItem).where(eq(discoveryItem.id, id));
		if (!existing) return fail(404, { error: 'Item not found.' });

		const slug = slugify(title);
		const ts = Date.now();
		let imageUrl = existing.imageUrl;
		let thumbnailUrl = existing.thumbnailUrl;
		let youtubeId = existing.youtubeId;
		let carouselImages = null;

		if (mediaType === 'youtube') {
			youtubeId = extractYoutubeId(youtubeInput);
			if (!youtubeId) return fail(400, { error: 'Invalid YouTube URL or video ID.' });
			thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
			imageUrl = null;

		} else if (mediaType === 'image') {
			const file = data.get('image');
			if (file instanceof File && file.size > 0) {
				if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return fail(400, { error: 'Unsupported image format.' });
				try {
					const r = await processAndUpload(file, `discovery/${slug}-${ts}`);
					imageUrl = r.imageUrl;
					thumbnailUrl = r.thumbnailUrl;
				} catch (e) {
					console.error(e);
					return fail(500, { error: 'Image upload failed.' });
				}
			}
			youtubeId = null;

		} else if (mediaType === 'carousel') {
			const files = data.getAll('images').filter(f => f instanceof File && f.size > 0);
			if (files.length > 0) {
				if (files.length < 2) return fail(400, { error: 'Carousel requires at least 2 images.' });
				for (const f of files) {
					if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return fail(400, { error: 'Unsupported image format.' });
				}
				try {
					const results = await Promise.all(
						files.map((f, i) => processAndUpload(f, `discovery/${slug}-${ts}-${i}`))
					);
					imageUrl = results[0].imageUrl;
					thumbnailUrl = results[0].thumbnailUrl;
					carouselImages = results;
				} catch (e) {
					console.error(e);
					return fail(500, { error: 'Image upload failed.' });
				}
			}
			youtubeId = null;

		} else if (mediaType === 'video') {
			const file = data.get('video');
			if (file instanceof File && file.size > 0) {
				if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return fail(400, { error: 'Unsupported video format.' });
				if (file.size > MAX_VIDEO_SIZE) return fail(400, { error: 'Video must be under 200 MB.' });
				try {
					const buffer = Buffer.from(await file.arrayBuffer());
					const ext = file.name.split('.').pop() || 'mp4';
					imageUrl = await uploadToR2(buffer, `discovery/${slug}-${ts}.${ext}`, file.type);
					thumbnailUrl = null;
				} catch (e) {
					console.error(e);
					return fail(500, { error: 'Video upload failed.' });
				}
			}
			youtubeId = null;
		} else {
			return fail(400, { error: 'Invalid media type.' });
		}

		await db.update(discoveryItem)
			.set({
				title, description, sectionId, mediaType,
				imageUrl, thumbnailUrl, youtubeId,
				sourceUrl, creatorName, creatorUrl,
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

		redirect(303, '/admin/discovery');
	}
};
