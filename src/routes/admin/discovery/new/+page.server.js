import { db } from '$lib/server/db/index.js';
import {
	discoveryItem,
	discoveryItemImage,
	discoveryItemTag,
	discoverySection,
	discoveryTag,
	auditEvent
} from '$lib/server/db/schema.ts';
import { asc } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { applyFaststart } from '$lib/server/video.js';
import { generatePreviewAsync } from '$lib/server/generatePreview.js';
import { fail, redirect } from '@sveltejs/kit';
import { slugify, validateUploads, processAndUpload } from '$lib/server/upload.js';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

function extractYoutubeId(input) {
	if (!input) return null;
	const trimmed = input.trim();
	if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
	try {
		const url = new URL(trimmed);
		if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
		if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0];
	} catch {
		/* not a URL */
	}
	return null;
}

export async function load() {
	const sections = await db.select().from(discoverySection).orderBy(asc(discoverySection.position));
	const tags = await db.select().from(discoveryTag).orderBy(discoveryTag.name);
	return { sections, tags };
}

export const actions = {
	default: async ({ request, locals, getClientAddress }) => {
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
		let videoFile = null;
		let imageFiles = [];
		if (youtubeInput) {
			mediaType = 'youtube';
		} else {
			const allFiles = data.getAll('media').filter((f) => f instanceof File && f.size > 0);
			if (allFiles.length === 0) {
				return fail(400, { error: 'Please upload a file or enter a YouTube URL.' });
			}
			const first = allFiles[0];
			if (ALLOWED_VIDEO_TYPES.includes(first.type)) {
				if (allFiles.length > 1) {
					return fail(400, { error: 'Upload one video at a time.' });
				}
				videoFile = first;
				mediaType = 'video';
			} else {
				imageFiles = allFiles;
				const v = validateUploads(imageFiles);
				if (!v.ok) return fail(400, { error: v.message });
				mediaType = imageFiles.length > 1 ? 'carousel' : 'image';
			}
		}

		const slug = slugify(title) || `item-${Date.now()}`;
		const ts = Date.now();
		let imageUrl = null;
		let thumbnailUrl = null;
		let youtubeId = null;
		let carouselImages = [];

		try {
			if (mediaType === 'youtube') {
				youtubeId = extractYoutubeId(youtubeInput);
				if (!youtubeId) return fail(400, { error: 'Invalid YouTube URL or video ID.' });
				thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
			} else if (mediaType === 'image') {
				const r = await processAndUpload(imageFiles[0], `discovery/${slug}-${ts}`);
				imageUrl = r.imageUrl;
				thumbnailUrl = r.thumbnailUrl;
			} else if (mediaType === 'carousel') {
				carouselImages = await Promise.all(
					imageFiles.map((f, i) => processAndUpload(f, `discovery/${slug}-${ts}-${i}`))
				);
				imageUrl = carouselImages[0].imageUrl;
				thumbnailUrl = carouselImages[0].thumbnailUrl;
			} else if (mediaType === 'video') {
				if (videoFile.size > MAX_VIDEO_SIZE) {
					return fail(400, { error: 'Video must be under 200 MB.' });
				}
				let buffer = Buffer.from(await videoFile.arrayBuffer());
				const ext = (videoFile.name.split('.').pop() || 'mp4').toLowerCase();
				try {
					buffer = applyFaststart(buffer, ext);
				} catch {
					/* faststart is best-effort */
				}
				imageUrl = await uploadToR2(buffer, `discovery/${slug}-${ts}.${ext}`, videoFile.type);
			}
		} catch (e) {
			console.error('[admin/discovery/new] media pipeline failed:', e);
			return fail(400, { error: e.message || 'Media upload failed.' });
		}

		let insertedId;
		try {
			await db.transaction(async (tx) => {
				const [row] = await tx
					.insert(discoveryItem)
					.values({
						sectionId,
						title,
						description,
						notes,
						mediaType,
						imageUrl,
						thumbnailUrl,
						youtubeId,
						sourceUrl,
						creatorName,
						creatorUrl,
						visible
					})
					.returning({ id: discoveryItem.id });
				insertedId = row.id;

				if (mediaType === 'carousel' && carouselImages.length > 0) {
					await tx.insert(discoveryItemImage).values(
						carouselImages.map((img, i) => ({
							itemId: row.id,
							imageUrl: img.imageUrl,
							thumbnailUrl: img.thumbnailUrl,
							position: i
						}))
					);
				}

				if (tagIds.length > 0) {
					await tx
						.insert(discoveryItemTag)
						.values(tagIds.map((tagId) => ({ itemId: row.id, tagId })));
				}

				await tx.insert(auditEvent).values({
					actorId: locals.user?.id ?? null,
					actorUsername: locals.user?.username ?? null,
					action: 'discovery.create',
					entityType: 'discovery_item',
					entityId: String(row.id),
					payload: { sectionId, mediaType, slug },
					ip: getClientAddress()
				});
			});
		} catch (e) {
			console.error('[admin/discovery/new] DB insert failed:', e);
			return fail(500, { error: 'Database error. Please retry.' });
		}

		if (mediaType === 'video' && imageUrl) {
			generatePreviewAsync(insertedId, imageUrl).catch((e) =>
				console.error('[preview]', e.message)
			);
		}

		redirect(303, '/admin/discovery');
	}
};
