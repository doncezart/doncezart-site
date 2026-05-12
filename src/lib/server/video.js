/**
 * Server-side video helpers using ffmpeg.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Re-mux a video buffer so the moov atom is at the front (faststart).
 * This lets the browser begin playback before the file is fully downloaded.
 * Returns the re-muxed Buffer (same format, no re-encoding).
 * @param {Buffer} inputBuffer
 * @param {string} [ext='mp4']
 * @returns {Buffer}
 */
export function applyFaststart(inputBuffer, ext = 'mp4') {
	const dir = mkdtempSync(join(tmpdir(), 'fs-'));
	try {
		const inFile  = join(dir, `in.${ext}`);
		const outFile = join(dir, `out.${ext}`);
		writeFileSync(inFile, inputBuffer);
		execFileSync('ffmpeg', [
			'-y', '-i', inFile,
			'-c', 'copy',
			'-movflags', '+faststart',
			outFile
		], { stdio: 'pipe' });
		return readFileSync(outFile);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * Extract a single frame from a video URL or file path at a given time offset.
 * Returns a JPEG Buffer.
 * @param {string} source  URL or absolute file path
 * @param {number} [offsetSeconds=1]
 * @returns {Buffer}
 */
export function extractFrame(source, offsetSeconds = 1) {
	const dir = mkdtempSync(join(tmpdir(), 'frame-'));
	try {
		const outFile = join(dir, 'frame.jpg');
		execFileSync('ffmpeg', [
			'-y',
			'-ss', String(offsetSeconds),
			'-i', source,
			'-frames:v', '1',
			'-q:v', '2',
			outFile
		], { stdio: 'pipe' });
		return readFileSync(outFile);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}
