import { json } from '@sveltejs/kit';
import { fetchProfileInfo } from '$lib/server/profile.js';
import { HttpError } from '$lib/server/http-error.js';
import { rateLimit } from '$lib/server/rate-limit.js';

export async function GET({ url, getClientAddress }) {
	const rl = rateLimit(`${getClientAddress()}:profile-info`, { max: 30, windowMs: 60_000 });
	if (rl.limited) {
		return json({ error: 'Too many requests. Try again in a moment.', retryAfter: rl.retryAfter }, { status: 429 });
	}

	const target = url.searchParams.get('handle')?.trim() || url.searchParams.get('url')?.trim();
	if (!target) return json({ error: 'Missing ?handle= parameter.' }, { status: 400 });

	try {
		return json(await fetchProfileInfo(target));
	} catch (e) {
		if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
		console.error('[profile/info]', e);
		return json({ error: 'Profile request failed. Try again in a moment.' }, { status: 502 });
	}
}
