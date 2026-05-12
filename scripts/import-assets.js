/**
 * Import downloaded Instagram media into discovery DB + R2.
 *
 * Usage:
 *   node scripts/import-assets.js <assets-dir> [json-filename]
 *
 * Examples:
 *   node scripts/import-assets.js ./assets
 *   node scripts/import-assets.js ./assets ig_download_log.json
 *
 * Layout expected:
 *   <assets-dir>/
 *     <json-filename>           ← log of downloaded posts
 *     <section-slug>/           ← folder name becomes section slug + name
 *       SHORTCODE.mp4           ← single video
 *       SHORTCODE.jpg           ← single image
 *       SHORTCODE_01.mp4        ← carousel (numbered suffixes)
 *
 * Behaviour:
 *   - Skips items whose `source_url` already exists in discovery_item.
 *   - Skips items with status != "ok".
 *   - Creates the section if it doesn't exist (from folder name).
 *   - Creates an "imported" tag if it doesn't exist, applies it to every item.
 *   - For carousels, uploads all numbered files as discovery_item_image rows.
 *   - Videos are uploaded as-is (no Sharp processing — Sharp is image-only).
 *   - Images are uploaded as-is (could add Sharp later).
 *   - Prints a summary at the end.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { lookup as mimeLookup } from 'mime-types';

// ── Config ────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

for (const [k, v] of Object.entries({ DATABASE_URL, R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL })) {
	if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

const assetsDir = process.argv[2];
const jsonFilename = process.argv[3] ?? 'ig_download_log.json';

if (!assetsDir) {
	console.error('Usage: node scripts/import-assets.js <assets-dir> [json-filename]');
	process.exit(1);
}

const assetsAbsDir = path.resolve(assetsDir);
if (!fs.existsSync(assetsAbsDir)) {
	console.error(`Assets directory not found: ${assetsAbsDir}`);
	process.exit(1);
}

const jsonPath = path.join(assetsAbsDir, jsonFilename);
if (!fs.existsSync(jsonPath)) {
	console.error(`JSON log not found: ${jsonPath}`);
	process.exit(1);
}

// ── Clients ───────────────────────────────────────────────────────────────────

const sql = postgres(DATABASE_URL);

const R2 = new S3Client({
	region: 'auto',
	endpoint: R2_ENDPOINT,
	credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
});

async function uploadToR2(filePath, key) {
	const body = fs.readFileSync(filePath);
	const contentType = mimeLookup(filePath) || 'application/octet-stream';
	await R2.send(new PutObjectCommand({
		Bucket: R2_BUCKET,
		Key: key,
		Body: body,
		ContentType: contentType
	}));
	return `${R2_PUBLIC_URL}/${key}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Turn a folder/file name into a URL-safe slug */
function toSlug(str) {
	return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Capitalise each word */
function toTitle(str) {
	return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Given a shortcode like "DUD91SkAhdA" find all matching files in the folder.
 * Returns sorted array of absolute paths.
 */
function findFilesForShortcode(folderPath, shortcode) {
	const all = fs.readdirSync(folderPath);
	// Match exact name or shortcode_NN pattern
	const matches = all.filter(f => {
		const base = path.basename(f, path.extname(f));
		return base === shortcode || /^.+_\d+$/.test(base) && base.replace(/_\d+$/, '') === shortcode;
	});
	return matches.sort().map(f => path.join(folderPath, f));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const log = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const items = log.items ?? log; // support both {items:[]} and []

const okItems = items.filter(i => i.status === 'ok');
console.log(`\nFound ${okItems.length} ok items in log (${items.length - okItems.length} skipped/failed)\n`);

// Build a map: shortcode → section folder name (derived from saved_path)
// saved_path uses Windows backslashes: "downloads\\videogenic\\SHORTCODE.mp4"
function sectionFromPath(savedPath) {
	const parts = savedPath.replace(/\\/g, '/').split('/');
	// last segment is filename, second-to-last is the category folder
	return parts.length >= 2 ? parts[parts.length - 2] : null;
}

// Collect all unique sections referenced in the log
const sectionNames = new Set(okItems.map(i => sectionFromPath(i.saved_path)).filter(Boolean));

// Check which actual folders exist under assetsDir
const existingFolders = new Set(
	fs.readdirSync(assetsAbsDir, { withFileTypes: true })
		.filter(d => d.isDirectory())
		.map(d => d.name)
);

const stats = { skipped: 0, inserted: 0, errors: 0, missingFile: 0 };

// ── Ensure "imported" tag exists ──────────────────────────────────────────────
const IMPORT_TAG_NAME = 'Imported';
const IMPORT_TAG_SLUG = 'imported';

let [importTag] = await sql`
	INSERT INTO discovery_tag (name, slug)
	VALUES (${IMPORT_TAG_NAME}, ${IMPORT_TAG_SLUG})
	ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
	RETURNING id
`;
const importTagId = importTag.id;
console.log(`Using tag "${IMPORT_TAG_NAME}" (id=${importTagId})\n`);

// ── Process each item ─────────────────────────────────────────────────────────
for (const item of okItems) {
	const { shortcode, url: sourceUrl, author, title, media_type } = item;
	const sectionFolder = sectionFromPath(item.saved_path);

	if (!sectionFolder) {
		console.warn(`[SKIP] ${shortcode}: cannot determine section from saved_path`);
		stats.skipped++;
		continue;
	}

	// ── Check if already imported ────────────────────────────────────────────
	const [existing] = await sql`
		SELECT id FROM discovery_item WHERE source_url = ${sourceUrl} LIMIT 1
	`;
	if (existing) {
		console.log(`[SKIP] ${shortcode}: already in DB (id=${existing.id})`);
		stats.skipped++;
		continue;
	}

	// ── Resolve section folder (actual folder may differ from log path) ───────
	// The log may say "videogenic" but the real folder is "videography"
	// Strategy: prefer exact match, then fall back to first existing folder
	let resolvedFolder = existingFolders.has(sectionFolder) ? sectionFolder : null;
	if (!resolvedFolder) {
		// Try to find any folder that contains a file matching this shortcode
		for (const folder of existingFolders) {
			const folderPath = path.join(assetsAbsDir, folder);
			const files = findFilesForShortcode(folderPath, shortcode);
			if (files.length > 0) { resolvedFolder = folder; break; }
		}
	}

	if (!resolvedFolder) {
		console.warn(`[SKIP] ${shortcode}: folder "${sectionFolder}" not found and no matching folder`);
		stats.skipped++;
		continue;
	}

	const folderPath = path.join(assetsAbsDir, resolvedFolder);
	const mediaFiles = findFilesForShortcode(folderPath, shortcode);

	if (mediaFiles.length === 0) {
		console.warn(`[SKIP] ${shortcode}: no files found in ${resolvedFolder}/`);
		stats.missingFile++;
		continue;
	}

	// ── Ensure section exists ─────────────────────────────────────────────────
	const sectionSlug = toSlug(resolvedFolder);
	const sectionName = toTitle(resolvedFolder);

	let [section] = await sql`
		INSERT INTO discovery_section (name, slug, position)
		VALUES (${sectionName}, ${sectionSlug}, 0)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`;
	const sectionId = section.id;

	// ── Determine DB media_type ───────────────────────────────────────────────
	// Use the log's media_type, but map carousel correctly
	let dbMediaType = media_type; // 'video', 'carousel', 'image', 'unknown'
	if (dbMediaType === 'unknown') dbMediaType = 'video'; // treat as video

	try {
		// ── Upload primary file ───────────────────────────────────────────────
		const primaryFile = mediaFiles[0];
		const ext = path.extname(primaryFile);
		const r2Key = `discovery/${sectionSlug}/${shortcode}${ext}`;
		console.log(`[UPLOAD] ${shortcode} → ${r2Key}`);
		const primaryUrl = await uploadToR2(primaryFile, r2Key);

		const creatorName = author || null;
		const creatorUrl = author ? `https://www.instagram.com/${author}/` : null;
		const itemTitle = title || `Post by ${author || 'unknown'}`;

		// ── Insert discovery_item ─────────────────────────────────────────────
		const [inserted] = await sql`
			INSERT INTO discovery_item
				(section_id, title, media_type, image_url, source_url, creator_name, creator_url, visible, position)
			VALUES
				(${sectionId}, ${itemTitle}, ${dbMediaType}, ${primaryUrl}, ${sourceUrl}, ${creatorName}, ${creatorUrl}, true, 0)
			RETURNING id
		`;
		const itemId = inserted.id;

		// ── Carousel: upload remaining files as discovery_item_image rows ─────
		if (dbMediaType === 'carousel' && mediaFiles.length > 1) {
			for (let i = 0; i < mediaFiles.length; i++) {
				const f = mediaFiles[i];
				const fExt = path.extname(f);
				const fKey = `discovery/${sectionSlug}/${shortcode}_${String(i + 1).padStart(2, '0')}${fExt}`;
				const fUrl = i === 0 ? primaryUrl : await uploadToR2(f, fKey);
				await sql`
					INSERT INTO discovery_item_image (item_id, image_url, position)
					VALUES (${itemId}, ${fUrl}, ${i})
				`;
			}
		}

		// ── Apply "imported" tag ──────────────────────────────────────────────
		await sql`
			INSERT INTO discovery_item_tag (item_id, tag_id)
			VALUES (${itemId}, ${importTagId})
			ON CONFLICT DO NOTHING
		`;

		console.log(`[OK]    ${shortcode} → item id=${itemId}`);
		stats.inserted++;
	} catch (err) {
		console.error(`[ERROR] ${shortcode}:`, err.message);
		stats.errors++;
	}
}

await sql.end();

console.log(`
────────────────────────────
Inserted : ${stats.inserted}
Skipped  : ${stats.skipped}
No file  : ${stats.missingFile}
Errors   : ${stats.errors}
────────────────────────────
`);
