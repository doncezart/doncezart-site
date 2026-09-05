// Pure formatters shared by the server (youtube.js) and the client (card renderer).

/** 1234567 → "1.2M" */
export function formatViews(n) {
	if (n == null || Number.isNaN(n)) return null;
	return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** ISO date → US long form, e.g. "July 5, 2025" */
export function formatDate(iso) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(d);
}

/** ISO date → "2 weeks ago" */
export function relativeDate(iso) {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return null;
	const days = Math.floor((Date.now() - then) / 86_400_000);
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
	if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
	return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}