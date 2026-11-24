// The case studies shown in the pinned Results section, in order.
//
// To add one: build (or reuse) a body component that takes `active` (true while
// the case is on screen), then add an entry below. Everything else (scroll
// length, chapter rail, counter, snapping) adapts to the number of cases.
//
//   key       unique id
//   name      short label for the chapter rail
//   type      what I did, shown after the name ("Video editing")
//   platform  'youtube' | 'instagram' | 'tiktok' | 'reddit' | 'google' (picks the icon)
//   url       window address bar; `blur` is shown blurred (redacted)
//   title/hot headline: white part, then the hot gradient part
//   sub       one-line explanation under the headline
//   stats     exactly 3 headline numbers { label, value, hot? }
//   visual    body component rendered inside the window frame
//   props     extra props for the body component
import ChannelResults from './ChannelResults.svelte';
import BeforeAfter from './BeforeAfter.svelte';
import RedditInsights from './RedditInsights.svelte';
import SearchConsole from './SearchConsole.svelte';
import santeaStreams from '$lib/data/cases/santea-streams.json';
import santea from '$lib/data/cases/santea.json';
import scarface from '$lib/data/cases/scarface.json';
import cameretrafic from '$lib/data/cases/cameretrafic.json';
import { avgViews, fmtCount, fmtMultiple } from '$lib/data/cases/format.js';

const before = avgViews(santeaStreams.before);
const after = avgViews(santeaStreams.after);
const streamsX = before && after ? fmtMultiple(after / before) : null;

// Camere Trafic: weekly clicks in the first full week vs. the latest one.
const ct = cameretrafic.days;
const weekClicks = (from, to) => ct.slice(from, to).reduce((a, d) => a + d.clicks, 0);
const firstWeek = weekClicks(4, 11); // Mon 28 Sep - Sun 4 Oct, the first full week with data
const lastWeek = weekClicks(ct.length - 7);
const last7 = ct.slice(-7);
const last7Pos = last7.reduce((a, d) => a + d.position * d.impressions, 0) / last7.reduce((a, d) => a + d.impressions, 0);

const scarfaceSince = new Date(scarface.modSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export const cases = [
	{
		key: 'santea',
		name: santea.name,
		type: 'Video editing',
		platform: 'youtube',
		url: { pre: `studio.youtube.com/channel/${santea.channelId}/analytics` },
		title: '11M views.',
		hot: '90 days.',
		sub: `Santea's main channel, ${fmtCount(santea.subscribers)} subscribers. Real numbers from YouTube Studio.`,
		stats: [
			{ label: 'Views', value: '11M' },
			{ label: 'Vs. previous 90 days', value: '+152%', hot: true },
			{ label: 'Watch time', value: '1.2M hrs' }
		],
		visual: ChannelResults,
		props: { channel: santea }
	},
	{
		key: 'streams',
		name: 'Santea Streams',
		type: 'Video editing',
		platform: 'youtube',
		url: { pre: 'youtube.com/@santeatv' },
		title: streamsX ? `${streamsX}× the views.` : 'Before.',
		hot: streamsX ? 'Same channel.' : 'After.',
		sub: 'Twitch stream recaps on Santea\'s second channel. 6 videos from before I joined vs. 6 from a few months in.',
		stats: [
			{ label: 'Avg. views before', value: fmtCount(Math.round(before)) },
			{ label: 'Avg. views after', value: fmtCount(Math.round(after)) },
			{ label: 'Per video', value: streamsX ? `${streamsX}×` : '–', hot: true }
		],
		visual: BeforeAfter,
		props: { data: santeaStreams, slug: 'santea-streams' }
	},
	{
		key: 'scarface',
		name: 'r/Scarface',
		type: 'Community management',
		platform: 'reddit',
		url: { pre: 'reddit.com/mod/Scarface/insights' },
		title: `+${fmtCount(scarface.members.delta)} members.`,
		hot: 'One year.',
		sub: `I've run r/Scarface since ${scarfaceSince}. Last 12 months, straight from Reddit's mod insights.`,
		stats: [
			{ label: 'Views', value: fmtCount(scarface.views.value) },
			{ label: 'Members', value: fmtCount(scarface.members.value) },
			{ label: 'Comments vs. last year', value: `${fmtMultiple(scarface.comments.value / (scarface.comments.value - scarface.comments.delta))}×`, hot: true }
		],
		visual: RedditInsights,
		props: { data: scarface }
	},
	{
		key: 'cameretrafic',
		name: 'Camere Trafic',
		type: 'SEO',
		platform: 'google',
		url: { pre: 'search.google.com/search-console/performance' },
		title: `${Math.round(lastWeek / firstWeek)}× the clicks.`,
		hot: 'Zero ad spend.',
		sub: 'My own project, cameretrafic.ro. Grown purely organically through SEO, from launch to the first page of Google in under two months.',
		stats: [
			{ label: 'Clicks per week', value: `${firstWeek} → ${lastWeek}` },
			{ label: 'Impressions', value: fmtCount(ct.reduce((a, d) => a + d.impressions, 0)) },
			{ label: 'Avg. position, last 7 days', value: last7Pos.toFixed(1), hot: true }
		],
		visual: SearchConsole,
		props: { data: cameretrafic }
	}
];
