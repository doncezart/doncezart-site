import { error } from '@sveltejs/kit';
import { takeJob } from '$lib/server/card-render.js';

// Internal page the API's headless browser screenshots. It only renders for a
// live one-time job token, so there's nothing here for anyone else to load.
export function load({ url, setHeaders }) {
	const job = takeJob(url.searchParams.get('job'));
	if (!job) error(404, 'Not found');
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
	return { video: job.video, config: job.config };
}
