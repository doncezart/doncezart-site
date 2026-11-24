import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

// Which YouTube videos are being turned into cards, in the tool and via the API.

const RANGES = { '24h': '1 day', '7d': '7 days', '30d': '30 days', all: null };
const SOURCES = ['all', 'tool', 'api'];

export async function load({ url }) {
	const range = url.searchParams.get('range') in RANGES ? url.searchParams.get('range') : '7d';
	const source = SOURCES.includes(url.searchParams.get('source')) ? url.searchParams.get('source') : 'all';

	const interval = RANGES[range];
	const where = sql.join(
		[
			sql`true`,
			interval ? sql`created_at > now() - ${interval}::interval` : null,
			source !== 'all' ? sql`source = ${source}` : null
		].filter(Boolean),
		sql` and `
	);

	try {
		const [stats] = await db.execute(sql`
			select count(*)::int as total,
				count(*) filter (where action = 'load')::int as loads,
				count(*) filter (where action in ('download', 'copy'))::int as exports,
				count(*) filter (where source = 'api')::int as api,
				count(distinct video_id)::int as videos,
				count(distinct client_hash)::int as clients
			from card_generation where ${where}`);

		const videos = await db.execute(sql`
			select video_id as "videoId",
				(array_agg(video_title order by created_at desc) filter (where video_title is not null))[1] as title,
				(array_agg(channel_name order by created_at desc) filter (where channel_name is not null))[1] as channel,
				count(*)::int as total,
				count(*) filter (where action = 'load')::int as loads,
				count(*) filter (where action in ('download', 'copy'))::int as exports,
				count(*) filter (where source = 'api')::int as api,
				count(distinct client_hash)::int as clients,
				max(created_at) as "lastAt"
			from card_generation
			where ${where} and video_id is not null
			group by video_id
			order by total desc, "lastAt" desc
			limit 50`);

		// Daily totals for the bar chart: the range, capped at the last 30 days.
		const days = await db.execute(sql`
			select to_char(d, 'YYYY-MM-DD') as day,
				coalesce(sum((g.source = 'tool')::int), 0)::int as tool,
				coalesce(sum((g.source = 'api')::int), 0)::int as api
			from generate_series(
				date_trunc('day', now()) - ${(range === '24h' ? 0 : range === '7d' ? 6 : 29) + ' days'}::interval,
				date_trunc('day', now()), '1 day') d
			left join card_generation g
				on date_trunc('day', g.created_at) = d
				${source !== 'all' ? sql`and g.source = ${source}` : sql``}
			group by d order by d`);

		const callers = await db.execute(sql`
			select coalesce(referrer, '(no referrer)') as referrer,
				count(*)::int as total,
				count(distinct client_hash)::int as clients,
				max(created_at) as "lastAt"
			from card_generation
			where ${where} and source = 'api'
			group by 1 order by total desc limit 10`);

		const recent = await db.execute(sql`
			select id, source, action, video_id as "videoId", video_title as title,
				channel_name as channel, layout, format, referrer, created_at as "createdAt"
			from card_generation where ${where}
			order by id desc limit 100`);

		return { range, source, stats, videos: [...videos], days: [...days], callers: [...callers], recent: [...recent], missing: false };
	} catch (e) {
		// Table not created yet (drizzle/manual/004_card_generation.sql).
		if (/card_generation/.test(String(e?.message)) && /does not exist/.test(String(e?.message))) {
			return { range, source, stats: null, videos: [], days: [], callers: [], recent: [], missing: true };
		}
		throw e;
	}
}
