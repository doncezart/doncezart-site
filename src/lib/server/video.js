/**
 * Server-side video helpers using ffmpeg.
 *
 * SECURITY NOTES
 *  - All extension args are validated against an allow-list to prevent
 *    arbitrary path components.
 *  - `extractFrame` accepts only URLs whose host is in our R2/CDN allow-list,
 *    or absolute file paths under the OS tmpdir.
 *  - All ffmpeg invocations have a hard wall-clock timeout.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';

const SAFE_EXT_RE = /^[a-z0-9]{2,5}$/;
const FFMPEG_TIMEOUT_MS = 60_000;
const FFMPEG_MAX_BUFFER = 32 * 1024 * 1024;

function safeExt(ext, fallback = 'mp4') {
	const lower = String(ext || '').toLowerCase();
	return SAFE_EXT_RE.test(lower) ? lower : fallback;
}

function assertSafeSource(source) {
	if (typeof source !== 'string' || !source) {
		throw new Error('Invalid video source');
	}
	// Allow absolute paths inside the OS tmpdir (used internally).
	if (source.startsWith('/')) {
		if (!source.startsWith(tmpdir())) {
			throw new Error('File path outside tmpdir is not allowed');
		}
		return;
	}
	let u;
	try { u = new URL(source); } catch { throw new Error('Invalid video URL'); }
	if (u.protocol !== 'https:' && u.protocol !== 'http:') {
		throw new Error(`Disallowed scheme: ${u.protocol}`);
	}
	const allowed = new Set();
	for (const v of [
		env.R2_PUBLIC_URL,
		'https://cdn.doncez.art',
		'https://doncezart.nyc3.cdn.digitaloceanspaces.com'
	]) {
		if (!v) continue;
		try { allowed.add(new URL(v).host); } catch { /* ignore */ }
	}
	if (!allowed.has(u.host)) {
		throw new Error(`Host not in allow-list: ${u.host}`);
	}
}

/**
 * Re-mux a video buffer so the moov atom is at the front (faststart).
 * @param {Buffer} inputBuffer
 * @param {string} [ext='mp4']
 * @returns {Buffer}
 */
export function applyFaststart(inputBuffer, ext = 'mp4') {
	const e = safeExt(ext, 'mp4');
	const dir = mkdtempSync(join(tmpdir(), 'fs-'));
	try {
		const inFile  = join(dir, `in.${e}`);
		const outFile = join(dir, `out.${e}`);
		writeFileSync(inFile, inputBuffer);
		execFileSync('ffmpeg', [
			'-y', '-i', inFile,
			'-c', 'copy',
			'-movflags', '+faststart',
			outFile
		], { stdio: 'pipe', timeout: FFMPEG_TIMEOUT_MS, maxBuffer: FFMPEG_MAX_BUFFER });
		return readFileSync(outFile);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * Extract a single frame from a video URL/path at a given time offset.
 * @param {string} source
 * @param {number} [offsetSeconds=1]
 * @returns {Buffer}
 */
export function extractFrame(source, offsetSeconds = 1) {
	assertSafeSource(source);
	const offset = Math.max(0, Math.min(Number(offsetSeconds) || 0, 3600));
	const dir = mkdtempSync(join(tmpdir(), 'frame-'));
	try {
		const outFile = join(dir, 'frame.jpg');
		execFileSync('ffmpeg', [
			'-y',
			'-ss', String(offset),
			'-i', source,
			'-frames:v', '1',
			'-q:v', '2',
			outFile
		], { stdio: 'pipe', timeout: FFMPEG_TIMEOUT_MS, maxBuffer: FFMPEG_MAX_BUFFER });
		return readFileSync(outFile);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}
