// Social profile information service.
//
// Tiered data strategy (mirrors the YouTube card tool's philosophy):
//   1. Official API  — YouTube Data API v3, GitHub REST, TikTok oEmbed.
//   2. Manual fill    — platforms that do not expose public profile data
//      (Instagram, Facebook, X, Dribbble, Twitch for now) return a pre-filled
//      "manual" stub so the editor can complete the fields by hand.
//
// Only official, documented endpoints are called. No HTML scraping of
// login-walled platforms. Results are cached in memory (TTL 30 min) to protect
// free quota; every result carries `source` and an optional `error` so the
// client can explain a degraded fetch.

import { HttpError } from './http-error.js';
import { formatViews } from '../data/yt-format.js';
import { PLATFORMS, normalizePlatform, profileUrl } from '../data/social-platforms.js';
import { env } from '$env/dynamic/private';

const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 500;
const FETCH_TIMEOUT = 10_000;
const cache = new Map(); // `${platform}:${handle}` → { data, expires }

const HOST_TO_PLATFORM = {
	'youtube.com': 'youtube',
	'youtu.be': 'youtube',
	'instagram.com': 'instagram',
	'tiktok.com': 'tiktok',
	'x.com': 'x',
	'twitter.com': 'x',
	'facebook.com': 'facebook',
	'fb.com': 'facebook',
	'fb.me': 'facebook',
	'twitch.tv': 'twitch',
	'github.com': 'github',
	'dribbble.com': 'dribbble'
};

// ── URL / handle parsing ────────────────────────────────────────────────────

/** Trim a path segment into a usable handle, keeping YouTube's long forms. */
function cleanHandle(platform, value) {
	let s = String(value ?? '').trim().replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
	if (platform === 'youtube' && /^(channel|user|c)\//.test(s)) {
		return s.replace(/^(channel|user|c)\/@?/, '$1/');
	}
	return s.replace(/^@/, '');
}

function extractHandle(platform, url) {
	const parts = url.pathname.split('/').filter(Boolean);
	if (!parts.length) return null;
	if (platform === 'youtube') {
		if (parts[0].startsWith('@')) return parts[0];
		if (['channel', 'c', 'user'].includes(parts[0]) && parts[1]) return `${parts[0]}/${parts[1]}`;
		return null;
	}
	if (platform === 'facebook' && parts[0] === 'profile.php') return null;
	return cleanHandle(platform, parts[0]);
}

/**
 * Parse a profile URL, "platform:handle", or bare handle.
 * @param {string} input
 * @returns {{ platform: string|null, handle: string, url: string|null }|null}
 */
export function parseProfileInput(input) {
	if (!input) return null;
	const raw = String(input).trim();
	if (!raw) return null;

	// Full URL with or without a scheme.
	let url = null;
	if (/^https?:\/\//i.test(raw)) {
		try { url = new URL(raw); } catch { return null; }
	} else if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(raw)) {
		try { url = new URL(`https://${raw}`); } catch { return null; }
	}

	if (url) {
		const host = url.hostname.replace(/^(www|m|mobile|music)\./, '').toLowerCase();
		const platform = HOST_TO_PLATFORM[host];
		if (!platform) return null;
		const handle = extractHandle(platform, url);
		if (!handle) return null;
		return { platform, handle, url: url.href };
	}

	// "platform:handle" or "platform/handle".
	const m = raw.match(/^([a-z]{2,12})\s*[:\/]\s*@?([\w.@-]{1,64})$/i);
	if (m) {
		const platform = normalizePlatform(m[1]);
		if (platform) return { platform, handle: cleanHandle(platform, m[2]), url: null };
	}

	// Bare @handle — platform stays unknown until the user picks one.
	const bare = raw.replace(/^@/, '');
	if (/^[\w.-]{1,64}$/.test(bare)) return { platform: null, handle: bare, url: null };
	return null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a normalized profile for any supported input.
 * @param {string} input
 */
export async function fetchProfileInfo(input) {
	const parsed = parseProfileInput(input);
	if (!parsed || !parsed.handle) {
		throw new HttpError(400, 'Could not recognize that handle or profile URL.');
	}

	const { platform, handle } = parsed;
	const key = `${platform ?? 'unknown'}:${handle.toLowerCase()}`;
	const cached = cache.get(key);
	if (cached && cached.expires > Date.now()) return cached.data;

	let data;
	try {
		data = await resolveProfile(platform, handle, input);
	} catch (e) {
		// A definitive "not found" is the caller's problem; everything else
		// degrades to a manual stub so the tool keeps working.
		if (e instanceof HttpError && e.status === 404) throw e;
		const status = e instanceof HttpError ? e.status : 0;
		const message = e instanceof HttpError ? e.message : 'Network error';
		console.error(`[profile] fetch failed for ${key}: ${status}: ${message}`);
		data = manualResult(platform, handle, { status, message: message?.slice(0, 160) ?? 'Unknown error' });
	}

	if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
	cache.set(key, { data, expires: Date.now() + CACHE_TTL });
	return data;
}

async function resolveProfile(platform, handle, input) {
	if (!platform) {
		return manualResult(null, handle, {
			status: 0,
			message: 'Pick a platform to auto-fetch, or fill the fields in manually.'
		});
	}
	switch (platform) {
		case 'youtube':
			return fetchYouTube(handle, input);
		case 'github':
			return fetchGithub(handle);
		case 'tiktok':
			return fetchTikTok(handle);
		default:
			return manualResult(platform, handle, {
				status: 0,
				message: `${PLATFORMS[platform].label} does not expose public profile data. Fill the fields in manually.`
			});
	}
}

// ── Providers ───────────────────────────────────────────────────────────────

/** fetch with an abort timeout; throws HttpError on non-OK responses. */
async function fetchJson(url, headers = {}) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
	try {
		const r = await fetch(url, { signal: ctrl.signal, headers });
		if (!r.ok) {
			let msg = `HTTP ${r.status}`;
			try {
				const j = await r.json();
				msg = j?.error?.message ?? j?.message ?? msg;
			} catch { /* non-JSON error body */ }
			throw new HttpError(r.status, msg);
		}
		return await r.json();
	} catch (e) {
		if (e instanceof HttpError) throw e;
		if (e?.name === 'AbortError') throw new HttpError(504, 'The profile request timed out');
		throw new HttpError(502, 'The profile request failed');
	} finally {
		clearTimeout(timer);
	}
}

async function fetchYouTube(handle, input) {
	const apiKey = env.YOUTUBE_API_KEY;
	if (!apiKey) {
		return manualResult('youtube', handle, {
			status: 0,
			message: 'No YOUTUBE_API_KEY configured. Fill the channel fields in manually.'
		});
	}

	const base = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&key=${apiKey}`;
	let query;
	if (handle.startsWith('channel/')) query = `&id=${encodeURIComponent(handle.slice(8))}`;
	else if (handle.startsWith('user/')) query = `&forUsername=${encodeURIComponent(handle.slice(5))}`;
	else {
		const at = handle.startsWith('@') ? handle : `@${handle.replace(/^c\//, '')}`;
		query = `&forHandle=${encodeURIComponent(at)}`;
	}

	// A channel URL pasted by the user may carry the exact id in the path.
	const idFromUrl = input && /youtube\.com\/channel\/([A-Za-z0-9_-]+)/.exec(input);
	if (idFromUrl) query = `&id=${idFromUrl[1]}`;

	const j = await fetchJson(base + query);
	const item = j.items?.[0];
	if (!item) throw new HttpError(404, 'Channel not found.');

	const s = item.snippet ?? {};
	const st = item.statistics ?? {};
	const banner = item.brandingSettings?.image?.bannerExternalUrl ?? null;
	const custom = s.customUrl ?? (handle.startsWith('@') ? handle : `@${handle}`);

	return {
		platform: 'youtube',
		handle: custom.replace(/^@/, ''),
		source: 'api',
		url: `https://www.youtube.com/${custom}`,
		displayName: s.title ?? handle,
		bio: s.description?.trim() ? s.description.trim().split('\n')[0] : null,
		avatarUrl: s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url ?? null,
		bannerUrl: banner ? `${banner}=w1707` : null,
		verified: false,
		fields: { location: s.country ?? null, link: null },
		stats: [
			count(st.subscriberCount, 'Subscribers', 'followers'),
			count(st.videoCount, 'Videos', 'posts'),
			count(st.viewCount, 'Views', 'likes')
		].filter(Boolean),
		error: null
	};
}

async function fetchGithub(handle) {
	const headers = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'doncezart-tools'
	};
	if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

	const j = await fetchJson(`https://api.github.com/users/${encodeURIComponent(handle)}`, headers);
	if (!j || j.message === 'Not Found') throw new HttpError(404, 'GitHub user not found.');

	return {
		platform: 'github',
		handle: j.login,
		source: 'api',
		url: j.html_url,
		displayName: j.name || j.login,
		bio: j.bio || null,
		avatarUrl: j.avatar_url || null,
		bannerUrl: null,
		verified: false,
		fields: { location: j.location || null, link: j.blog || null },
		stats: [
			count(j.followers, 'Followers', 'followers'),
			count(j.following, 'Following', 'following'),
			count(j.public_repos, 'Repos', 'posts')
		].filter(Boolean),
		error: null
	};
}

async function fetchTikTok(handle) {
	const profileLink = `https://www.tiktok.com/@${encodeURIComponent(handle.replace(/^@/, ''))}`;
	const j = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(profileLink)}`);
	return {
		platform: 'tiktok',
		handle: handle.replace(/^@/, ''),
		source: 'oembed',
		url: profileLink,
		displayName: j.author_name || handle,
		bio: null,
		avatarUrl: j.thumbnail_url || null,
		bannerUrl: null,
		verified: false,
		fields: {},
		stats: [],
		error: {
			status: 0,
			message: 'TikTok oEmbed returns the display name and avatar only. Add followers and other stats manually.'
		}
	};
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function count(value, label, key) {
	if (value == null) return null;
	const n = Number(value);
	if (Number.isNaN(n)) return null;
	return { key, label, value: formatViews(n) };
}

function manualResult(platform, handle, error = null) {
	return {
		platform: platform ?? null,
		handle: handle ?? '',
		source: platform ? 'manual' : 'unknown',
		url: platform ? profileUrl(platform, handle) : null,
		displayName: handle ?? '',
		bio: null,
		avatarUrl: null,
		bannerUrl: null,
		verified: false,
		fields: {},
		stats: [],
		error
	};
}
