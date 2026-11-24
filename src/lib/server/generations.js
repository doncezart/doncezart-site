// Generation log for the public tools (table card_generation). Logging is
// fire-and-forget: a database hiccup must never break a card or a download.

import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { cardGeneration } from '$lib/server/db/schema.ts';

// Callers are grouped by an HMAC of their IP, never the IP itself. Set
// TRACKING_SECRET to keep the grouping stable across restarts.
const secret = env.TRACKING_SECRET || crypto.randomBytes(32).toString('hex');

export function clientHash(ip) {
	if (!ip) return null;
	return crypto.createHmac('sha256', secret).update(ip).digest('hex').slice(0, 16);
}

const cut = (v, n) => (v == null ? null : String(v).slice(0, n));

/** Only the referrer's host: enough to see which site calls the API. */
function referrerHost(ref) {
	if (!ref) return null;
	try {
		return new URL(ref).host.slice(0, 120) || null;
	} catch {
		return null;
	}
}

/**
 * @param {{ tool?: string, source: 'tool'|'api', action: string, video?: any,
 *   videoId?: string, layout?: string, format?: string, ip?: string, referrer?: string|null }} e
 */
export function logGeneration(e) {
	const row = {
		tool: e.tool ?? 'youtube-card',
		source: e.source,
		action: e.action,
		videoId: cut(e.video?.id ?? e.videoId, 32),
		videoTitle: cut(e.video?.title, 300),
		channelName: cut(e.video?.channel?.name, 120),
		layout: cut(e.layout, 24),
		format: cut(e.format, 8),
		clientHash: clientHash(e.ip),
		referrer: referrerHost(e.referrer)
	};
	db.insert(cardGeneration).values(row).catch((err) => {
		console.error('[generations] log failed:', err.message);
	});
}
