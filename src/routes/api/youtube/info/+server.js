import { json } from '@sveltejs/kit';
import { fetchYouTubeVideoInfo, HttpError } from '$lib/server/youtube.js';
import { rateLimit } from '$lib/server/rate-limit.js';

export async function GET({ url, getClientAddress }) {
	const rl = rateLimit(`${getClientAddress()}:youtube-info`, { max: 20, windowMs: 60_000 });
	if (rl.limited) {
		return json({ error: 'Too many requests. Try again in a moment.', retryAfter: rl.retryAfter }, { status: 429 });
	}

	const target = url.searchParams.get('url')?.trim();
	if (!target) return json({ error: 'Missing ?url= parameter.' }, { status: 400 });

	try {
		return json(await fetchYouTubeVideoInfo(target));
	} catch (e) {
		if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
		console.error('[youtube/info]', e);
		return json({ error: 'YouTube request failed. Try again in a moment.' }, { status: 502 });
	}
}