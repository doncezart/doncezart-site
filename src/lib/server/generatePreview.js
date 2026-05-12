/**
 * Server-side preview GIF generation for discovery video items.
 * Generates an animated GIF showing evenly-spaced frames from the whole video,
 * uploads it to R2, and writes the URL back to the DB.
 *
 * Designed to be called fire-and-forget from form actions:
 *   generatePreviewAsync(itemId, videoUrl).catch(console.error);
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { discoveryItem } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';

function getR2Client() {
	return new S3Client({
		region: 'auto',
		endpoint: env.R2_ENDPOINT,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY
		}
	});
}

function getVideoDuration(videoUrl) {
	const out = execFileSync('ffprobe', [
		'-v', 'error',
		'-show_entries', 'format=duration',
		'-of', 'default=noprint_wrappers=1:nokey=1',
		videoUrl
	], { stdio: ['pipe', 'pipe', 'pipe'] });
	return parseFloat(out.toString().trim()) || 10;
}

function buildGif(videoUrl) {
	const tmpDir = mkdtempSync(join(tmpdir(), 'disc-prev-'));
	try {
		const palette = join(tmpDir, 'palette.png');
		const output  = join(tmpDir, 'preview.gif');

		const duration    = getVideoDuration(videoUrl);
		const numChapters = duration >= 30 ? 4 : 3;
		const burstLen    = Math.min(2.5, (duration * 0.7) / numChapters);
		const fps   = 5;
		const scale = 'scale=360:-1:flags=lanczos';

		const starts = Array.from({ length: numChapters }, (_, i) =>
			Math.max(0, i === 0 ? 0 : (i * (duration - burstLen)) / (numChapters - 1)).toFixed(3)
		);

		const inputArgs   = starts.flatMap(s => ['-ss', s, '-t', burstLen.toFixed(3), '-i', videoUrl]);
		const videoLabels = starts.map((_, i) => `[${i}:v]`).join('');
		const concatBase  = `${videoLabels}concat=n=${numChapters}:v=1:a=0,fps=${fps},${scale}`;

		// Pass 1: palette
		execFileSync('ffmpeg', [
			'-y',
			...inputArgs,
			'-filter_complex', `${concatBase},palettegen=stats_mode=diff`,
			palette
		], { stdio: 'pipe' });

		// Pass 2: GIF
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

/**
 * Generate a preview GIF for a discovery video item and persist it.
 * Safe to call without awaiting — all errors are surfaced only in logs.
 * @param {number} itemId
 * @param {string} videoUrl  Public CDN URL of the video
 */
export async function generatePreviewAsync(itemId, videoUrl) {
	const buf = buildGif(videoUrl);
	const key = `discovery/previews/${itemId}.gif`;

	const R2 = getR2Client();
	await R2.send(new PutObjectCommand({
		Bucket: env.R2_BUCKET,
		Key: key,
		Body: buf,
		ContentType: 'image/gif'
	}));

	const previewUrl = `${env.R2_PUBLIC_URL}/${key}?v=${Date.now()}`;
	await db.update(discoveryItem)
		.set({ previewUrl, updatedAt: new Date() })
		.where(eq(discoveryItem.id, itemId));
}
