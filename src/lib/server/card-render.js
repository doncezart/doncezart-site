// Server-side rendering of YouTube cards for the public API.
//
// A headless Chromium opens /render/youtube-card (a bare page that mounts the
// same YouTubeCard component as the tool) and screenshots the card, so API
// images match the tool's exports. The page reads its video + config from a
// one-time job token held here in memory.
//
// Chromium comes with the install: playwright is a dependency and the
// postinstall script downloads its Chromium. A bare Linux server may also
// need the system libraries once: `npx playwright install-deps chromium`.
// CHROMIUM_PATH can point at a system Chromium/Chrome instead.

import { boxWidth } from '$lib/components/tools/yt-config.js';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { env } from '$env/dynamic/private';
import { HttpError } from './http-error.js';

const JOB_TTL = 30_000;
const RENDER_TIMEOUT = 20_000;
const MAX_CONCURRENT = 2;
const BROWSER_IDLE = 5 * 60_000;
const CACHE_TTL = 15 * 60_000;
const CACHE_MAX_BYTES = 64 * 1024 * 1024;

// ── Jobs: what the render page should draw ─────────────────────────────────

/** @type {Map<string, { video: any, config: any, expires: number }>} */
const jobs = new Map();

/** Called by /render/youtube-card's load(); a token works once. */
export function takeJob(token) {
	const job = token ? jobs.get(token) : null;
	if (!job) return null;
	jobs.delete(token);
	return job.expires > Date.now() ? job : null;
}

function addJob(video, config) {
	const now = Date.now();
	for (const [k, j] of jobs) if (j.expires < now) jobs.delete(k);
	const token = crypto.randomBytes(24).toString('base64url');
	jobs.set(token, { video, config, expires: now + JOB_TTL });
	return token;
}

// ── Browser: one shared Chromium, closed when idle ─────────────────────────

/** @type {Promise<import('playwright').Browser> | null} */
let browserPromise = null;
let idleTimer = null;

async function getBrowser() {
	clearTimeout(idleTimer);
	if (!browserPromise) {
		browserPromise = (async () => {
			let chromium;
			try {
				({ chromium } = await import('playwright'));
			} catch {
				throw new HttpError(503, 'Card rendering is not available on this server.');
			}
			const browser = await chromium.launch({
				executablePath: env.CHROMIUM_PATH || undefined,
				args: ['--disable-dev-shm-usage', '--font-render-hinting=none']
			});
			browser.on('disconnected', () => { browserPromise = null; });
			return browser;
		})().catch((e) => {
			browserPromise = null;
			console.error('[card-render] Chromium failed to start:', e.message);
			throw e instanceof HttpError ? e : new HttpError(503, 'Card rendering is not available right now.');
		});
	}
	return browserPromise;
}

function scheduleIdleClose() {
	clearTimeout(idleTimer);
	idleTimer = setTimeout(async () => {
		if (active > 0 || !browserPromise) return;
		const b = await browserPromise.catch(() => null);
		browserPromise = null;
		await b?.close().catch(() => {});
	}, BROWSER_IDLE);
	idleTimer.unref?.();
}

// Small semaphore so a burst of requests queues instead of opening dozens of tabs.
let active = 0;
/** @type {Array<() => void>} */
const waiting = [];
async function acquire() {
	if (active < MAX_CONCURRENT) {
		active++;
		return;
	}
	await new Promise((r) => waiting.push(() => r(undefined)));
}
function release() {
	const next = waiting.shift();
	if (next) next();
	else {
		active--;
		if (active === 0) scheduleIdleClose();
	}
}

// ── Output cache: same video + config + format → same bytes ────────────────

/** @type {Map<string, { buf: Buffer, expires: number }>} */
const cache = new Map();
let cacheBytes = 0;

function cacheGet(key) {
	const hit = cache.get(key);
	if (!hit) return null;
	if (hit.expires < Date.now()) {
		cache.delete(key);
		cacheBytes -= hit.buf.length;
		return null;
	}
	return hit.buf;
}

function cacheSet(key, buf) {
	cache.set(key, { buf, expires: Date.now() + CACHE_TTL });
	cacheBytes += buf.length;
	for (const [k, v] of cache) {
		if (cacheBytes <= CACHE_MAX_BYTES) break;
		cache.delete(k);
		cacheBytes -= v.buf.length;
	}
}

// ── Render ─────────────────────────────────────────────────────────────────

/**
 * @param {{ video: any, config: any, format: 'png'|'jpeg'|'webp', origin: string }} opts
 * @returns {Promise<{ buf: Buffer, cached: boolean, width: number, height: number }>}
 */
export async function renderCard({ video, config, format, origin }) {
	const key = crypto.createHash('sha256').update(JSON.stringify([video, config, format])).digest('hex');
	const hit = cacheGet(key);
	if (hit) {
		const meta = await sharp(hit).metadata();
		return { buf: hit, cached: true, width: meta.width ?? 0, height: meta.height ?? 0 };
	}

	await acquire();
	let context = null;
	try {
		const browser = await getBrowser();
		const base = (env.RENDER_ORIGIN || origin).replace(/\/$/, '');
		const token = addJob(video, config);
		// Room for the whole card: up to 3840 px wide plus its frame, and tall
		// aspects (9:16) at that width.
		const boxW = boxWidth(config);
		context = await browser.newContext({
			viewport: { width: Math.max(2200, boxW + 200), height: Math.max(1400, Math.ceil(boxW * 1.9)) },
			deviceScaleFactor: 1
		});
		const page = await context.newPage();
		await page.goto(`${base}/render/youtube-card?job=${token}`, { waitUntil: 'load', timeout: RENDER_TIMEOUT });
		await page.waitForFunction(() => /** @type {any} */ (window).__cardReady === true, null, { timeout: RENDER_TIMEOUT });
		const card = await page.$('[data-render-stage] > .ycard');
		if (!card) throw new Error('render page did not mount the card');
		const png = await card.screenshot({ type: 'png', omitBackground: true, timeout: RENDER_TIMEOUT });

		// Same as the tool's exports: PNG/WebP keep the transparent corners,
		// JPEG has no alpha so it goes on white.
		let img = sharp(png);
		if (format === 'jpeg') img = img.flatten({ background: '#ffffff' }).jpeg({ quality: 92, mozjpeg: true });
		else if (format === 'webp') img = img.webp({ quality: 92 });
		else img = img.png({ compressionLevel: 8 });
		const { data: buf, info } = await img.toBuffer({ resolveWithObject: true });

		cacheSet(key, buf);
		return { buf, cached: false, width: info.width, height: info.height };
	} catch (e) {
		if (e instanceof HttpError) throw e;
		console.error('[card-render]', e.message);
		throw new HttpError(500, 'Rendering the card failed. Try again in a moment.');
	} finally {
		await context?.close().catch(() => {});
		release();
	}
}
