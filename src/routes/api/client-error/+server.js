// Receives reports from static/diag.js (script errors, pages that never
// started) and writes them to the server log. Nothing is stored; the IP is
// only used for a per-minute cap and never logged.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map();

export async function POST({ request, getClientAddress }) {
	const ip = getClientAddress();
	const now = Date.now();
	const h = hits.get(ip);
	if (h && now - h.start < WINDOW_MS) {
		if (++h.n > MAX_PER_WINDOW) return new Response(null, { status: 429 });
	} else {
		hits.set(ip, { start: now, n: 1 });
		if (hits.size > 5000) hits.clear();
	}

	const text = (await request.text()).slice(0, 4000);
	let report;
	try {
		report = JSON.parse(text);
	} catch {
		return new Response(null, { status: 400 });
	}
	const pick = (k, n = 300) => String(report?.[k] ?? '').slice(0, n);
	console.warn(
		'[client-error]',
		JSON.stringify({
			kind: pick('kind', 20),
			page: pick('page', 200),
			t: pick('t', 12),
			off: pick('off', 40),
			visible: pick('visible', 12),
			ua: pick('ua'),
			screen: pick('screen', 40),
			hydrated: report?.hydrated === true,
			webgl: pick('webgl', 160),
			modules: report?.modules === true,
			containerQueries: report?.containerQueries === true,
			detail: pick('detail', 1500)
		})
	);
	return new Response(null, { status: 204 });
}
