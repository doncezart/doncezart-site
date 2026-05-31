// In-memory IP rate limiter with periodic cleanup.
// Suitable for a single-instance Node deployment.

const buckets = new Map();

/**
 * @param {string} key — usually `${ip}:${scope}`
 * @param {{ max: number, windowMs: number }} opts
 * @returns {{ limited: boolean, retryAfter: number }}
 */
export function rateLimit(key, { max, windowMs }) {
	const now = Date.now();
	const entry = buckets.get(key);
	if (!entry || now - entry.start > windowMs) {
		buckets.set(key, { count: 1, start: now });
		return { limited: false, retryAfter: 0 };
	}
	entry.count += 1;
	if (entry.count > max) {
		return { limited: true, retryAfter: Math.ceil((windowMs - (now - entry.start)) / 1000) };
	}
	return { limited: false, retryAfter: 0 };
}

export function rateLimitReset(key) {
	buckets.delete(key);
}

// Sweep expired buckets every 5 minutes so the Map can't grow unbounded.
setInterval(() => {
	const now = Date.now();
	for (const [k, v] of buckets) {
		// 1h is the largest window we use; anything older is dead.
		if (now - v.start > 60 * 60 * 1000) buckets.delete(k);
	}
}, 5 * 60 * 1000).unref?.();
