import sharp from 'sharp';

/**
 * Image variant definitions.
 * Each upload produces these variants, all converted to WebP.
 */
const VARIANTS = [
	{ name: 'full', maxWidth: null, quality: 92 },
	{ name: 'lg', maxWidth: 1920, quality: 88 },
	{ name: 'md', maxWidth: 1200, quality: 85 },
	{ name: 'sm', maxWidth: 640, quality: 80 },
	{ name: 'thumb', maxWidth: 300, quality: 75 }
];

const BLUR_WIDTH = 20;
const BLUR_QUALITY = 30;

/**
 * Process a raw image buffer into multiple optimized WebP variants.
 *
 * @param {Buffer} buffer - Raw image bytes
 * @param {string} baseKey - R2 key prefix without extension, e.g. "artworks/my-image-1712000000"
 * @returns {Promise<{ variants: Array<{ name: string, key: string, buffer: Buffer, contentType: string }>, blurDataURL: string }>}
 */
export async function processImage(buffer, baseKey) {
	const image = sharp(buffer).rotate(); // auto-rotate per EXIF
	const metadata = await image.metadata();
	const origWidth = metadata.width || 4000;

	const variants = [];

	for (const v of VARIANTS) {
		const pipeline = sharp(buffer).rotate();

		if (v.maxWidth && origWidth > v.maxWidth) {
			pipeline.resize({ width: v.maxWidth, withoutEnlargement: true });
		}

		const webpBuffer = await pipeline
			.webp({ quality: v.quality, effort: 4 })
			.toBuffer();

		variants.push({
			name: v.name,
			key: `${baseKey}-${v.name}.webp`,
			buffer: webpBuffer,
			contentType: 'image/webp'
		});
	}

	// Generate tiny blur placeholder as base64 data URL
	const blurBuffer = await sharp(buffer)
		.rotate()
		.resize({ width: BLUR_WIDTH })
		.webp({ quality: BLUR_QUALITY })
		.toBuffer();

	const blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

	return { variants, blurDataURL };
}
