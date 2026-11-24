// Fills src/lib/data/cases/santea-streams.json with title, upload date, view
// count and duration for each video, using yt-dlp. Thumbnails already live in
// static/cases/santea-streams/<id>.webp.
//
//   node scripts/fetch-case-videos.mjs
//   COOKIES_BROWSER=chrome node scripts/fetch-case-videos.mjs   # if YouTube asks to sign in
//
// Runs one request at a time with a pause between them to stay polite.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../src/lib/data/cases/santea-streams.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));
const cookies = process.env.COOKIES_BROWSER ? ['--cookies-from-browser', process.env.COOKIES_BROWSER] : [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
for (const v of [...data.before, ...data.after]) {
	try {
		const out = execFileSync(
			'yt-dlp',
			[...cookies, '--skip-download', '--no-warnings', '--print', '%(title)s\t%(upload_date)s\t%(view_count)s\t%(duration)s', `https://www.youtube.com/watch?v=${v.id}`],
			{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
		).trim();
		const [title, date, views, duration] = out.split('\t');
		Object.assign(v, {
			title,
			date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
			views: Number(views),
			duration: Number(duration)
		});
		console.log(`ok   ${v.id}  ${v.date}  ${v.views.toLocaleString()}  ${title}`);
	} catch (e) {
		failed++;
		console.log(`FAIL ${v.id}  ${(e.stderr || e.message).toString().split('\n').find((l) => l.includes('ERROR')) ?? ''}`);
	}
	await sleep(2500);
}

if (!failed) {
	data.source = 'YouTube';
	data.fetchedAt = new Date().toISOString().slice(0, 10);
}
writeFileSync(file, JSON.stringify(data, null, '\t') + '\n');
console.log(failed ? `\n${failed} failed; rerun later or with COOKIES_BROWSER=chrome` : '\nAll videos updated.');
