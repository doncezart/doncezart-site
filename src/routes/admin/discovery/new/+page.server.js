import { db } from '$lib/server/db/index.js';
import {
	discoveryItem, discoveryItemImage, discoveryItemTag,
	discoverySection, discoveryTag
} from '$lib/server/db/schema.ts';
import { asc } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';
import { applyFaststart } from '$lib/server/video.js';
import { generatePreviewAsync } from '$lib/server/generatePreview.js';
import { fail, redirect } from '@sveltejs/kit';

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

export async function load() {
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const tags = await db.select().from(discoveryTag).orderBy(discoveryTag.name);
	return { sections, tags };
}

export const actions = {
	default: async ({ request }) => {
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

		// Determine mediaType from what was submitted
		let mediaType;
		if (youtubeInput) {
			mediaType = 'youtube';
		} else {
			const mediaFile = data.get('media');
			if (!(mediaFile instanceof File) || mediaFile.size === 0) {
				return fail(400, { error: 'Please upload a file or enter a YouTube URL.' });
			}
			if (ALLOWED_VIDEO_TYPES.includes(mediaFile.type)) {
				mediaType = 'video';
			} else if (ALLOWED_IMAGE_TYPES.includes(mediaFile.type)) {
				// check if multiple images (carousel)
				const allFiles = data.getAll('media').filter(f => f instanceof File && f.size > 0);
				mediaType = allFiles.length > 1 ? 'carousel' : 'image';
			} else {
				return fail(400, { error: 'Unsupported file type.' });
			}
		}

		const slug = slugify(title);
		const ts = Date.now();
		let imageUrl = null, thumbnailUrl = null, youtubeId = null;
		let carouselImages = [];

		if (mediaType === 'youtube') {
			youtubeId = extractYoutubeId(youtubeInput);
			if (!youtubeId) return fail(400, { error: 'Invalid YouTube URL or video ID.' });
			thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

		} else if (mediaType === 'image') {
			const file = data.get('media');
			try {
				const r = await processAndUpload(file, `discovery/${slug}-${ts}`);
				imageUrl = r.imageUrl;
				thumbnailUrl = r.thumbnailUrl;
			} catch (e) {
				console.error(e);
				return fail(500, { error: 'Image upload failed.' });
			}

		} else if (mediaType === 'carousel') {
			const files = data.getAll('media').filter(f => f instanceof File && f.size > 0);
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

		} else if (mediaType === 'video') {
			const file = data.get('media');
			if (file.size > MAX_VIDEO_SIZE) return fail(400, { error: 'Video must be under 200 MB.' });
			try {
				let buffer = Buffer.from(await file.arrayBuffer());
				const ext = file.name.split('.').pop() || 'mp4';
				try { buffer = applyFaststart(buffer, ext); } catch { /* non-fatal */ }
				imageUrl = await uploadToR2(buffer, `discovery/${slug}-${ts}.${ext}`, file.type);
			} catch (e) {
				console.error(e);
				return fail(500, { error: 'Video upload failed.' });
			}
		}

		const [inserted] = await db.insert(discoveryItem).values({
			sectionId, title, description, notes, mediaType,
			imageUrl, thumbnailUrl, youtubeId,
			sourceUrl, creatorName, creatorUrl, visible
		}).returning({ id: discoveryItem.id });

		if (mediaType === 'carousel' && carouselImages.length > 0) {
			await db.insert(discoveryItemImage).values(
				carouselImages.map((img, i) => ({
					itemId: inserted.id,
					imageUrl: img.imageUrl,
					thumbnailUrl: img.thumbnailUrl,
					position: i
				}))
			);
		}

		if (tagIds.length > 0) {
			await db.insert(discoveryItemTag).values(tagIds.map(tagId => ({ itemId: inserted.id, tagId })));
		}

		if (mediaType === 'video' && imageUrl) {
			generatePreviewAsync(inserted.id, imageUrl).catch(e => console.error('[preview]', e.message));
		}

		redirect(303, '/admin/discovery');
	}
};
