/**
 * Server-side preview MP4 generation for discovery video items.
 * Generates a 480p, first-5-seconds muted MP4 loop preview,
 * uploads it to R2, and writes the URL back to the DB.
 *
 * Designed to be called fire-and-forget from form actions:
 *   generatePreviewAsync(itemId, videoUrl).catch(console.error);
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

/**
 * Generate a 480p, first-5-second, muted H.264 preview MP4.
 * Returns a Buffer.
 */
function buildPreviewMp4(videoUrl) {
	const tmpDir = mkdtempSync(join(tmpdir(), 'disc-prev-'));
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
		], { stdio: 'pipe' });
		return readFileSync(output);
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

/**
 * Generate a preview MP4 for a discovery video item and persist it.
 * Deletes the old GIF from R2 if present.
 * Safe to call without awaiting — all errors are surfaced only in logs.
 * @param {number} itemId
 * @param {string} videoUrl  Public CDN URL of the video
 */
export async function generatePreviewAsync(itemId, videoUrl) {
	const buf = buildPreviewMp4(videoUrl);
	const key = `discovery/previews/${itemId}.mp4`;

	const R2 = getR2Client();

	// Delete old GIF preview if it exists
	try {
		await R2.send(new DeleteObjectCommand({
			Bucket: env.R2_BUCKET,
			Key: `discovery/previews/${itemId}.gif`
		}));
	} catch { /* not found — ignore */ }

	await R2.send(new PutObjectCommand({
		Bucket: env.R2_BUCKET,
		Key: key,
		Body: buf,
		ContentType: 'video/mp4'
	}));

	const previewUrl = `${env.R2_PUBLIC_URL}/${key}?v=${Date.now()}`;
	await db.update(discoveryItem)
		.set({ previewUrl, updatedAt: new Date() })
		.where(eq(discoveryItem.id, itemId));
}
