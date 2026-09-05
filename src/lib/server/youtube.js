// YouTube video information service.
// Primary: YouTube Data API v3 (needs YOUTUBE_API_KEY, 2 quota units per lookup).
// Fallback: oEmbed + direct i.ytimg.com thumbnail URLs (no key required).
// Results are cached in memory (TTL 30 min) to protect free API quota.
// When the Data API fails, the fallback result carries a `dataError` field
// ({ status, message }) so the client can explain what happened.

import { HttpError } from './http-error.js';
import { formatViews, relativeDate } from '../data/yt-format.js';
import { env } from '$env/dynamic/private';

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 500;
const FETCH_TIMEOUT = 10_000;

const cache = new Map(); // videoId → { data, expires }

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * @param {string} input — youtube URL or bare video id
 * @returns {string|null} 11-char video id
 */
export function extractVideoId(input) {
	if (!input) return null;
	const trimmed = String(input).trim();
	if (YT_ID_RE.test(trimmed)) return trimmed;

	const patterns = [
		/(?:youtube\.com\/watch\?(?:[^#]*?&)?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
		/youtube\.com\/watch\?(?:[^#]*?&)?v=([A-Za-z0-9_-]{11})/
	];
	for (const re of patterns) {
		const m = trimmed.match(re);
		if (m && YT_ID_RE.test(m[1])) return m[1];
	}
	return null;
}

/**
 * "PT1H2M3S" / "PT3M32S" / "PT45S" → { seconds, formatted, formattedHours }
 * @param {string} iso
 */
export function parseIsoDuration(iso) {
	if (!iso) return null;
	const m = String(iso).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
	if (!m) return null;
	const h = Number(m[1]) || 0;
	const min = Number(m[2]) || 0;
	const s = Number(m[3]) || 0;
	const total = h * 3600 + min * 60 + s;
	const pad = (n) => String(n).padStart(2, '0');
	return {
		seconds: total,
		formatted: h ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`,
		formattedHours: `${h}:${pad(min)}:${pad(s)}`
	};
}

/**
 * Direct i.ytimg.com thumbnail chain — no API key needed.
 * maxres 404s only on very old videos; the client falls back sd → hq.
 */
export function ytThumbnails(id) {
	return {
		maxres: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
		sd: `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
		hq: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
	};
}

/**
 * Fetch normalized video info for a YouTube URL.
 * @param {string} url
 */
export async function fetchYouTubeVideoInfo(url) {
	const id = extractVideoId(url);
	if (!id) throw new HttpError(400, 'Could not find a valid YouTube video id in that URL.');

	const cached = cache.get(id);
	if (cached && cached.expires > Date.now()) return cached.data;

	const apiKey = env.YOUTUBE_API_KEY;
	let data = null;
	let dataError = null;
	if (apiKey) {
		try {
			data = await fetchDataApi(id, apiKey);
		} catch (e) {
			if (e instanceof HttpError && e.status === 404) throw e;
			dataError = e instanceof HttpError
				? { status: e.status, message: e.message?.slice(0, 160) ?? 'Unknown error' }
				: { status: 0, message: 'Network error' };
			console.error(`[youtube] Data API failed for ${id}: ${dataError.status} — ${dataError.message}`);
		}
	}
	if (!data) {
		data = await fetchOembed(url, id);
		data = { ...data, dataError };
	}

	if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
	cache.set(id, { data, expires: Date.now() + CACHE_TTL });
	return data;
}

// ── Providers ───────────────────────────────────────────────────────────────

/** fetch with an abort timeout; throws HttpError on non-OK responses. */
async function fetchJson(url) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
	try {
		const r = await fetch(url, { signal: ctrl.signal });
		if (!r.ok) {
			let msg = `HTTP ${r.status}`;
			try {
				const j = await r.json();
				msg = j?.error?.message ?? msg;
			} catch { /* non-JSON error body */ }
			throw new HttpError(r.status, msg);
		}
		return await r.json();
	} catch (e) {
		if (e instanceof HttpError) throw e;
		if (e?.name === 'AbortError') throw new HttpError(504, 'YouTube request timed out');
		throw new HttpError(502, 'YouTube request failed');
	} finally {
		clearTimeout(timer);
	}
}

async function fetchOembed(url, id) {
	const j = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
	return {
		id,
		source: 'oembed',
		title: j.title ?? 'Untitled',
		description: null,
		thumbnails: ytThumbnails(id),
		duration: null,
		channel: j.author_name ? { id: null, name: j.author_name, avatarUrl: null } : null,
		views: null,
		publishedAt: null
	};
}

async function fetchDataApi(id, apiKey) {
	const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${apiKey}`;
	const vj = await fetchJson(videoUrl);
	const item = vj.items?.[0];
	if (!item) throw new HttpError(404, 'Video not found.');

	const s = item.snippet ?? {};
	const channelId = s.channelId ?? null;

	const resolved = resolveThumbnails(s.thumbnails, id);

	let channel = { id: channelId, name: s.channelTitle ?? null, avatarUrl: null };
	if (channelId) {
		try {
			const cj = await fetchJson(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`
			);
			const av = cj.items?.[0]?.snippet?.thumbnails;
			channel.avatarUrl = av?.high?.url ?? av?.medium?.url ?? av?.default?.url ?? null;
		} catch {
			// avatar is optional — fail silently
		}
	}

	return {
		id,
		source: 'api',
		title: s.title ?? 'Untitled',
		description: s.description?.trim() ? s.description : null,
		thumbnails: resolved,
		duration: parseIsoDuration(item.contentDetails?.duration),
		channel,
		views: item.statistics?.viewCount != null ? Number(item.statistics.viewCount) : null,
		publishedAt: s.publishedAt ?? null
	};
}

/** Prefer API thumbnails in quality order; fill gaps with constructed i.ytimg.com URLs. */
function resolveThumbnails(apiThumbs, id) {
	const order = ['maxres', 'standard', 'high', 'medium', 'default'];
	const candidates = order.map((k) => apiThumbs?.[k]?.url).filter(Boolean);
	const fallback = ytThumbnails(id);
	return {
		maxres: candidates[0] ?? fallback.maxres,
		sd: candidates[1] ?? fallback.sd,
		hq: candidates[2] ?? fallback.hq
	};
}