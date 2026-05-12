/**
 * Generate animated GIF hover previews for video discovery items.
 *
 * For each video item that has no previewUrl (or all with --all), this script:
 *   1. Feeds the video URL directly into ffmpeg (streams only what it needs).
 *   2. Generates a palette-optimized animated GIF (2s, 8fps, 360px wide).
 *   3. Uploads the GIF to R2 as discovery/previews/{id}.gif.
 *   4. Writes the public URL back to discovery_item.preview_url.
 *
 * Usage:
 *   node --env-file=.env scripts/generate-previews.js
 *   node --env-file=.env scripts/generate-previews.js --all   # re-generate existing
 *
 * Requirements: ffmpeg installed (apt install ffmpeg)
 */

import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import postgres from 'postgres';

// ── Config ────────────────────────────────────────────────────────────────────

const {
	DATABASE_URL,
	R2_ENDPOINT,
	R2_BUCKET,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_PUBLIC_URL
} = process.env;

for (const [k, v] of Object.entries({ DATABASE_URL, R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL })) {
	if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

const forceAll = process.argv.includes('--all');

const sql = postgres(DATABASE_URL);

const R2 = new S3Client({
	region: 'auto',
	endpoint: R2_ENDPOINT,
	credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadToR2(body, key) {
	await R2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: 'image/gif' }));
	return `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`;
}

/**
 * Get video duration in seconds via ffprobe.
 */
function getVideoDuration(videoUrl) {
	const out = execFileSync('ffprobe', [
		'-v', 'error',
		'-show_entries', 'format=duration',
		'-of', 'default=noprint_wrappers=1:nokey=1',
		videoUrl
	], { stdio: ['pipe', 'pipe', 'pipe'] });
	return parseFloat(out.toString().trim()) || 10;
}

/**
 * Generate a palette-optimized animated GIF using chapter-burst sampling:
 * the video is divided into N evenly-spaced chapters; each chapter contributes
 * a short burst of real consecutive frames (5 fps, up to 2.5 s). The bursts
 * are concatenated with hard cuts so the viewer sees motion from multiple
 * distinct parts of the video.
 * Returns a Buffer.
 */
function generateGif(videoUrl) {
	const tmpDir = mkdtempSync(join(tmpdir(), 'disc-preview-'));
	try {
		const palette = join(tmpDir, 'palette.png');
		const output  = join(tmpDir, 'preview.gif');

		const duration  = getVideoDuration(videoUrl);
		const numChapters = duration >= 30 ? 4 : 3;
		const burstLen  = Math.min(2.5, (duration * 0.7) / numChapters);
		const fps = 5;
		const scale = 'scale=360:-1:flags=lanczos';

		// Distribute chapter start times evenly (first at 0, last ending near the end)
		const starts = Array.from({ length: numChapters }, (_, i) =>
			Math.max(0, i === 0 ? 0 : (i * (duration - burstLen)) / (numChapters - 1)).toFixed(3)
		);

		// Build repeated -ss -t -i triplets (one per chapter, same source URL)
		const inputArgs = starts.flatMap(s => ['-ss', s, '-t', burstLen.toFixed(3), '-i', videoUrl]);
		const videoLabels = starts.map((_, i) => `[${i}:v]`).join('');
		const concatBase = `${videoLabels}concat=n=${numChapters}:v=1:a=0,fps=${fps},${scale}`;

		// Pass 1: palette from the concatenated chapter bursts
		execFileSync('ffmpeg', [
			'-y',
			...inputArgs,
			'-filter_complex', `${concatBase},palettegen=stats_mode=diff`,
			palette
		], { stdio: 'pipe' });

		// Pass 2: render GIF using the palette
		execFileSync('ffmpeg', [
			'-y',
			...inputArgs,
			'-i', palette,
			'-filter_complex',
			`${concatBase}[x];[x][${numChapters}:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
			'-loop', '0',
			output
		], { stdio: 'pipe' });

		return readFileSync(output);
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	const rows = forceAll
		? await sql`SELECT id, title, image_url FROM discovery_item WHERE media_type = 'video' AND image_url IS NOT NULL ORDER BY id`
		: await sql`SELECT id, title, image_url FROM discovery_item WHERE media_type = 'video' AND image_url IS NOT NULL AND preview_url IS NULL ORDER BY id`;

	console.log(`Found ${rows.length} video item(s) to process${forceAll ? ' (--all)' : ' (no previewUrl yet)'}.`);
	if (rows.length === 0) { await sql.end(); return; }

	let done = 0, errors = 0;

	for (const item of rows) {
		const label = `[${item.id}] ${(item.title ?? '').slice(0, 45).padEnd(45)}`;
		process.stdout.write(`  ${label} … `);
		try {
			const buf = generateGif(item.image_url);
			const key = `discovery/previews/${item.id}.gif`;
			const url = await uploadToR2(buf, key);
			await sql`UPDATE discovery_item SET preview_url = ${url} WHERE id = ${item.id}`;
			console.log(`✓  ${(buf.length / 1024).toFixed(0)} KB`);
			done++;
		} catch (err) {
			const msg = (err.stderr ? err.stderr.toString() : err.message ?? String(err)).split('\n').filter(Boolean).pop() ?? 'unknown';
			console.log(`✗  ${msg.slice(0, 80)}`);
			errors++;
		}
	}

	console.log(`\nDone: ${done} generated, ${errors} errors.`);
	await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
