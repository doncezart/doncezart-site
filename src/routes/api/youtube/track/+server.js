import { json } from '@sveltejs/kit';
import { logGeneration } from '$lib/server/generations.js';
import { rateLimit } from '$lib/server/rate-limit.js';
import { LAYOUTS } from '$lib/components/tools/yt-config.js';
import { FORMATS } from '$lib/components/tools/yt-api.js';

// Beacon from the YouTube card tool when a card is downloaded or copied.
// (Loading a video is logged by /api/youtube/info itself.)
export async function POST({ request, getClientAddress }) {
	const ip = getClientAddress();
	if (rateLimit(`${ip}:youtube-track`, { max: 30, windowMs: 60_000 }).limited) {
		return new Response(null, { status: 204 });
	}
	let b;
	try {
		b = await request.json();
	} catch {
		return json({ error: 'Bad body' }, { status: 400 });
	}
	if (!/^[A-Za-z0-9_-]{11}$/.test(b?.videoId ?? '') || !['download', 'copy'].includes(b?.action)) {
		return json({ error: 'Bad body' }, { status: 400 });
	}
	logGeneration({
		source: 'tool',
		action: b.action,
		video: { id: b.videoId, title: b.title, channel: { name: b.channel } },
		layout: b.layout in LAYOUTS ? b.layout : null,
		format: FORMATS.includes(b.format) ? b.format : null,
		ip
	});
	return new Response(null, { status: 204 });
}
