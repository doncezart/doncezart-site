// Portfolio videos: an artwork with displayMode 'video' points at a YouTube
// video. The cover image defaults to the video's own thumbnail, fetched here
// and run through the normal image pipeline (resized, uploaded to the CDN).
import { extractVideoId, ytThumbnails, fetchYouTubeVideoInfo } from '$lib/server/youtube.js';

/** The YouTube id in a link (or a bare id), or null. */
export function videoIdFrom(input) {
	const s = String(input ?? '').trim();
	if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
	return extractVideoId(s);
}

/** The video's best available thumbnail as a File, for processAndUpload(). */
export async function thumbnailFile(videoId) {
	const t = ytThumbnails(videoId);
	for (const url of [t.maxres, t.sd, t.hq]) {
		const res = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null);
		if (res?.ok) {
			const buf = await res.arrayBuffer();
			return new File([buf], `${videoId}.jpg`, { type: 'image/jpeg' });
		}
	}
	throw new Error('Could not download the YouTube thumbnail. Upload a cover image instead.');
}

/** Title and live numbers for one video; null fields if YouTube can't be reached. */
export async function videoStats(videoId) {
	try {
		const v = await fetchYouTubeVideoInfo(`https://youtu.be/${videoId}`);
		return { title: v.title, views: v.views, duration: v.duration?.formatted ?? null, channel: v.channel?.name ?? null };
	} catch {
		return { title: null, views: null, duration: null, channel: null };
	}
}
