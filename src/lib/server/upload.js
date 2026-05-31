import sharp from 'sharp';
import { db } from '$lib/server/db/index.js';
import { artwork } from '$lib/server/db/schema.ts';
import { like } from 'drizzle-orm';
import { uploadToR2 } from '$lib/server/r2.js';
import { processImage } from '$lib/server/image.js';

export const ALLOWED_TYPES = [
	'image/webp',
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/tiff',
	'image/avif'
];
export const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// sharp format → MIME mapping for magic-byte check.
const FORMAT_MIME = {
	webp: 'image/webp',
	png: 'image/png',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	gif: 'image/gif',
	tiff: 'image/tiff',
	heif: 'image/avif', // sharp reports avif under heif
	avif: 'image/avif'
};

export function slugify(text) {
	return String(text || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 80);
}

/**
 * Find a slug not already used in `artwork`. Returns base or base-NN.
 */
export async function uniqueArtworkSlug(base) {
	if (!base) base = `untitled-${Date.now()}`;
	const existing = await db
		.select({ slug: artwork.slug })
		.from(artwork)
		.where(like(artwork.slug, `${base}%`));
	const taken = new Set(existing.map((r) => r.slug));
	if (!taken.has(base)) return base;
	for (let n = 2; n <= 99; n++) {
		const candidate = `${base}-${String(n).padStart(2, '0')}`;
		if (!taken.has(candidate)) return candidate;
	}
	return `${base}-${Date.now()}`;
}

/**
 * Validate a list of File objects before processing.
 * Returns { ok: true } or { ok: false, message }.
 */
export function validateUploads(files) {
	for (const f of files) {
		if (!ALLOWED_TYPES.includes(f.type)) {
			return {
				ok: false,
				message: `${f.name || 'file'}: unsupported format. Use webp, png, jpeg, gif, tiff, or avif.`
			};
		}
		if (f.size > MAX_SIZE) {
			return { ok: false, message: `${f.name || 'file'}: must be under 50 MB.` };
		}
	}
	return { ok: true };
}

/**
 * Magic-byte check: parse the buffer with sharp; reject if format does not
 * match the claimed MIME or is not in our allowlist. This prevents disguised
 * payloads (e.g. an EXE renamed to .jpg).
 */
async function verifyImageBytes(buffer, claimedMime, label) {
	let meta;
	try {
		meta = await sharp(buffer).metadata();
	} catch {
		throw new Error(`${label}: file is not a valid image.`);
	}
	const actual = FORMAT_MIME[meta.format];
	if (!actual) {
		throw new Error(`${label}: unsupported image format (${meta.format || 'unknown'}).`);
	}
	if (claimedMime && claimedMime !== actual) {
		throw new Error(`${label}: file extension/MIME (${claimedMime}) does not match actual format (${actual}).`);
	}
}

/**
 * Read a File, verify magic bytes, run the image pipeline and upload all
 * variants to R2. Returns cover URLs + blur data URL.
 *
 * @param {File} file
 * @param {string} baseKey
 */
export async function processAndUpload(file, baseKey) {
	const buffer = Buffer.from(await file.arrayBuffer());
	await verifyImageBytes(buffer, file.type, file.name || 'image');
	const result = await processImage(buffer, baseKey);
	const uploads = await Promise.all(
		result.variants.map(async (v) => {
			const url = await uploadToR2(v.buffer, v.key, v.contentType);
			return { name: v.name, url };
		})
	);
	const urlMap = Object.fromEntries(uploads.map((u) => [u.name, u.url]));
	return {
		imageUrl: urlMap.full,
		thumbnailUrl: urlMap.thumb,
		blurDataURL: result.blurDataURL
	};
}
