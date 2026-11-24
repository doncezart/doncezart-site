import { json } from '@sveltejs/kit';
import { fetchYouTubeVideoInfo } from '$lib/server/youtube.js';
import { renderCard } from '$lib/server/card-render.js';
import { logGeneration } from '$lib/server/generations.js';
import { HttpError } from '$lib/server/http-error.js';
import { rateLimit } from '$lib/server/rate-limit.js';
import { parseCardParams, ParamError } from '$lib/components/tools/yt-api.js';

// Public YouTube card API: GET with query params or POST a JSON object with
// the same keys. Returns the image. Docs: /tools/youtube-card#api.

const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
	'access-control-allow-headers': 'content-type',
	'access-control-expose-headers': 'x-card-width, x-card-height, x-cache, retry-after'
};

const fail = (status, error, extra = {}) =>
	json({ error, ...extra }, { status, headers: { ...CORS, ...(extra.retryAfter ? { 'retry-after': String(extra.retryAfter) } : {}) } });

async function handle(params, { getClientAddress, request, url }) {
	const ip = getClientAddress();
	const download = ['1', 'true'].includes(String(params.download ?? ''));
	delete params.download;

	let parsed;
	try {
		parsed = parseCardParams(params);
	} catch (e) {
		if (e instanceof ParamError) return fail(400, e.message);
		throw e;
	}

	// Checked after validation so typos don't use up the quota. Rendered
	// images are cached, but every valid call still counts.
	for (const [scope, max, windowMs] of [['min', 10, 60_000], ['hour', 120, 3_600_000]]) {
		const rl = rateLimit(`${ip}:youtube-card-${scope}`, { max, windowMs });
		if (rl.limited) return fail(429, 'Rate limit reached. Try again later.', { retryAfter: rl.retryAfter });
	}

	try {
		const { dataError, source, ...video } = await fetchYouTubeVideoInfo(parsed.url);
		const out = await renderCard({ video, config: parsed.config, format: parsed.format, origin: url.origin });

		logGeneration({
			source: 'api', action: 'render', video,
			layout: parsed.config.layout, format: parsed.format,
			ip, referrer: request.headers.get('referer') ?? request.headers.get('origin')
		});

		const ext = parsed.format === 'jpeg' ? 'jpg' : parsed.format;
		return new Response(new Uint8Array(out.buf), {
			headers: {
				...CORS,
				'content-type': `image/${parsed.format}`,
				'content-length': String(out.buf.length),
				'content-disposition': `${download ? 'attachment' : 'inline'}; filename="youtube-card-${video.id}.${ext}"`,
				'cache-control': 'public, max-age=3600',
				'x-card-width': String(out.width),
				'x-card-height': String(out.height),
				'x-cache': out.cached ? 'HIT' : 'MISS'
			}
		});
	} catch (e) {
		if (e instanceof HttpError) return fail(e.status, e.message);
		console.error('[youtube/card]', e);
		return fail(500, 'Something went wrong rendering the card.');
	}
}

export async function GET(event) {
	return handle(Object.fromEntries(event.url.searchParams), event);
}

export async function POST(event) {
	let body;
	try {
		body = await event.request.json();
	} catch {
		return fail(400, 'Send a JSON object, e.g. {"url": "https://youtu.be/…", "layout": "hero"}.');
	}
	if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'The JSON body must be an object.');
	// Arrays are fine for show/hide; everything else is a scalar.
	const flat = Object.fromEntries(
		Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v])
	);
	return handle(flat, event);
}

export function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}
