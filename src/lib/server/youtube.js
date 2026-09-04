// YouTube video information service.
// Primary: YouTube Data API v3 (needs YOUTUBE_API_KEY, 2 quota units per lookup).
// Fallback: oEmbed + direct i.ytimg.com thumbnail URLs (no key required).
// Results are cached in memory (TTL 30 min) to protect free API quota.

import { HttpError } from './http-error.js';

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 500;

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

/** 1234567 → "1.2M" */
export function formatViews(n) {
	if (n == null || Number.isNaN(n)) return null;
	return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** ISO date → "2 weeks ago" */
export function relativeDate(iso) {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return null;
	const days = Math.floor((Date.now() - then) / 86_400_000);
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
	if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
	return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
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

	const apiKey = process.env.YOUTUBE_API_KEY;
	let data = null;
	if (apiKey) {
		try {
			data = await fetchDataApi(id, apiKey);
		} catch (e) {
			if (e instanceof HttpError && e.status >= 400 && e.status < 500) throw e;
			// 5xx / network — fall through to oEmbed
		}
	}
	if (!data) data = await fetchOembed(url, id);

	if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
	cache.set(id, { data, expires: Date.now() + CACHE_TTL });
	return data;
}

// ── Providers ───────────────────────────────────────────────────────────────

async function fetchOembed(url, id) {
	const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
	if (!r.ok) {
		if (r.status === 404) throw new HttpError(404, 'Video not found.');
		throw new HttpError(502, 'YouTube oEmbed request failed.');
	}
	const j = await r.json();
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
	const vr = await fetch(videoUrl);
	if (!vr.ok) throw new HttpError(502, 'YouTube Data API request failed.');
	const vj = await vr.json();
	const item = vj.items?.[0];
	if (!item) throw new HttpError(404, 'Video not found.');

	const s = item.snippet ?? {};
	const channelId = s.channelId ?? null;

	const resolved = resolveThumbnails(s.thumbnails, id);

	let channel = { id: channelId, name: s.channelTitle ?? null, avatarUrl: null };
	if (channelId) {
		try {
			const cr = await fetch(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`
			);
			if (cr.ok) {
				const cj = await cr.json();
				const av = cj.items?.[0]?.snippet?.thumbnails;
				channel.avatarUrl = av?.high?.url ?? av?.medium?.url ?? av?.default?.url ?? null;
			}
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