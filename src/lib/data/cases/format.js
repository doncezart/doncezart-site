// Number/date formatting shared by the Results case studies.

/** 1234 -> "1.2K", 1200000 -> "1.2M". */
export function fmtCount(n) {
	if (n == null) return '–';
	const strip = (s) => s.replace(/\.0$/, '');
	if (n >= 1e6) return `${strip((n / 1e6).toFixed(n >= 1e7 ? 0 : 1))}M`;
	if (n >= 1e3) return `${strip((n / 1e3).toFixed(n >= 1e5 ? 0 : 1))}K`;
	return String(n);
}

/** "2026-03" -> "Mar" (or "Mar 2026" with year). */
export function fmtMonth(ym, year = false) {
	const [y, m] = ym.split('-').map(Number);
	return new Date(y, m - 1, 15).toLocaleDateString('en-GB', year ? { month: 'short', year: 'numeric' } : { month: 'short' });
}

/** Average views of a list of videos, or null if any is missing. */
export function avgViews(list) {
	return list.every((v) => v.views != null) ? list.reduce((a, v) => a + v.views, 0) / list.length : null;
}

/** 2.33 -> "2.3", 14.2 -> "14". */
export function fmtMultiple(x) {
	return x >= 10 ? String(Math.round(x)) : (Math.round(x * 10) / 10).toString();
}
