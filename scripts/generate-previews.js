/**
 * Generate 480p MP4 hover previews for video discovery items.
 *
 * Covers both media_type='video' and video-carousel items (carousel where
 * image_url is an mp4/webm/mov file). For each item it:
 *   1. Deletes the old .gif from R2 (if present).
 *   2. Encodes the first 5 seconds at 480p, no audio, H.264 faststart.
 *   3. Uploads as discovery/previews/{id}.mp4.
 *   4. Writes the public URL back to discovery_item.preview_url.
 *
 * Usage:
 *   node --env-file=.env scripts/generate-previews.js
 *   node --env-file=.env scripts/generate-previews.js --all   # re-generate existing too
 *
 * Requirements: ffmpeg installed (apt install ffmpeg)
 */

import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

/**
 * Generate a 480p, first-5-second, muted H.264 preview MP4.
 * Returns a Buffer.
 */
function generatePreviewMp4(videoUrl) {
	const tmpDir = mkdtempSync(join(tmpdir(), 'disc-preview-'));
	try {
		const output = join(tmpDir, 'preview.mp4');
		execFileSync('ffmpeg', [
			'-y',
			'-t', '5',
			'-i', videoUrl,
			'-vf', "scale='if(gte(iw,ih),720,-2)':'if(gte(iw,ih),-2,720)':flags=lanczos",
			'-an',
			'-c:v', 'libx264',
			'-preset', 'fast',
			'-crf', '23',
			'-movflags', '+faststart',
			'-pix_fmt', 'yuv420p',
			output
		], { stdio: 'pipe', timeout: 90000 });
		return readFileSync(output);
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

async function deleteOldGif(itemId) {
	try {
		await R2.send(new DeleteObjectCommand({
			Bucket: R2_BUCKET,
			Key: `discovery/previews/${itemId}.gif`
		}));
	} catch { /* not found — ignore */ }
}

async function uploadMp4(buf, key) {
	await R2.send(new PutObjectCommand({
		Bucket: R2_BUCKET,
		Key: key,
		Body: buf,
		ContentType: 'video/mp4'
	}));
	return `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	const withPreview = await sql`
		SELECT id, title, image_url, preview_url
		FROM discovery_item
		WHERE (
			media_type = 'video'
			OR (
				media_type = 'carousel'
				AND (image_url LIKE '%.mp4' OR image_url LIKE '%.webm' OR image_url LIKE '%.mov')
			)
		)
		AND image_url IS NOT NULL
		ORDER BY id
	`;

	const toProcess = forceAll
		? withPreview
		: withPreview.filter(r => !r.preview_url || r.preview_url.includes('.gif'));

	console.log(`Found ${toProcess.length} item(s) to process${forceAll ? ' (--all)' : ' (missing or GIF preview)'}.`);
	if (toProcess.length === 0) { await sql.end(); return; }

	let done = 0, errors = 0;

	for (const item of toProcess) {
		const label = `[${item.id}] ${(item.title ?? '').slice(0, 45).padEnd(45)}`;
		process.stdout.write(`  ${label} … `);
		try {
			// Delete old GIF from R2 if present
			if (item.preview_url?.includes('.gif')) {
				await deleteOldGif(item.id);
			}

			const buf = generatePreviewMp4(item.image_url);
			const key = `discovery/previews/${item.id}.mp4`;
			const url = await uploadMp4(buf, key);
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
