<script>
	// Instagram-style profile + insights body for a "grown from zero" case.
	// Data lives in src/lib/data/cases/*.json (see instagram-growth.json).
	// Post thumbnails are optional: drop them in static/cases/<slug>/post-<n>.webp
	// and list "thumb": "post-1.webp" on the post; otherwise a gradient tile shows.
	import { onMount, untrack } from 'svelte';
	import { fmtCount, fmtMonth } from '$lib/data/cases/format.js';

	/** @type {{ data: any, slug: string, active?: boolean }} */
	let { data, slug, active = true } = $props();

	const growth = data.growth;
	const last = growth.length - 1;
	const peak = growth[last].followers;
	const yMax = niceMax(peak);

	function niceMax(v) {
		const step = 10 ** Math.floor(Math.log10(v || 1));
		return Math.ceil((v * 1.08) / step) * step;
	}

	const px = (i) => (i / last) * 1000;
	const py = (v) => 100 - (v / yMax) * 100;
	const pct = (i) => (i / last) * 100;
	const linePath = growth.map((g, i) => `${i ? 'L' : 'M'}${px(i).toFixed(2)},${py(g.followers).toFixed(2)}`).join(' ');
	const areaPath = `${linePath} L1000,100 L0,100 Z`;
	const yTicks = [yMax, yMax / 2, 0];
	// Every other month on the axis keeps the labels from colliding.
	const xTicks = growth.map((g, i) => ({ i, label: fmtMonth(g.month) })).filter((t) => t.i % 2 === 0 || t.i === last);

	// Same reveal as the Studio chart: draws + counts up on every activation.
	let progress = $state(1);
	let visible = $state(false);
	let root;
	let reduceMotion = $state(true);

	onMount(() => {
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) return;
		if (!active) progress = 0;
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.35 });
		io.observe(root);
		return () => io.disconnect();
	});

	$effect(() => {
		if (reduceMotion) return;
		if (!active) {
			const t = setTimeout(() => (progress = 0), 700);
			return () => clearTimeout(t);
		}
		const from = untrack(() => progress);
		if (!visible || from === 1) return;
		const t0 = performance.now();
		let raf;
		const tick = (now) => {
			const x = Math.min(1, (now - t0) / 1800);
			progress = from + (1 - from) * (1 - Math.pow(1 - x, 3));
			if (x < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	let hover = $state(null);
	function onPlotMove(e) {
		const r = e.currentTarget.getBoundingClientRect();
		hover = Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / r.width) * last)));
	}

	// Tile hues for posts without a thumbnail.
	const hues = [
		'linear-gradient(160deg, #833ab4, #fd1d1d 60%, #fcb045)',
		'linear-gradient(200deg, #4f5bd5, #962fbf 55%, #d62976)',
		'linear-gradient(140deg, #fa7e1e, #d62976 70%)',
		'linear-gradient(180deg, #feda75, #fa7e1e 50%, #d62976)',
		'linear-gradient(220deg, #962fbf, #4f5bd5)',
		'linear-gradient(160deg, #d62976, #fa7e1e)'
	];
</script>

<div class="visual" class:active bind:this={root}>
	<header class="profile">
		<span class="ring"><span class="avatar" aria-hidden="true"></span></span>
		<div class="who">
			<span class="handle">@{data.handle}</span>
			<dl class="counts">
				<div><dd>{data.posts}</dd><dt>posts</dt></div>
				<div><dd>{fmtCount(Math.round(peak * progress))}</dd><dt>followers</dt></div>
				<div><dd>{data.following}</dd><dt>following</dt></div>
			</dl>
		</div>
	</header>

	<div class="insights">
		<section class="card">
			<div class="card-head">
				<span class="c-label">Followers</span>
				<span class="c-value">{fmtCount(Math.round(peak * progress))}</span>
				<span class="c-note">
					<i class="fa-solid fa-arrow-trend-up"></i>
					from 0 in {last} months
				</span>
			</div>
			<div class="chart">
				<div
					class="plot"
					role="img"
					aria-label="Followers grew from 0 to {fmtCount(peak)} between {fmtMonth(growth[0].month)} and {fmtMonth(growth[last].month)}"
					onpointermove={onPlotMove}
					onpointerleave={() => (hover = null)}
				>
					{#each yTicks as g}
						<span class="grid" style="top: {py(g)}%"></span>
					{/each}
					<svg viewBox="0 0 1000 100" preserveAspectRatio="none" style="clip-path: inset(-5% {(1 - progress) * 100}% -5% 0)">
						<defs>
							<linearGradient id="ig-stroke" x1="0" y1="0" x2="1" y2="0">
								<stop offset="0" stop-color="#feda75" />
								<stop offset="0.35" stop-color="#fa7e1e" />
								<stop offset="0.65" stop-color="#d62976" />
								<stop offset="1" stop-color="#962fbf" />
							</linearGradient>
							<linearGradient id="ig-fill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stop-color="#d62976" stop-opacity="0.28" />
								<stop offset="1" stop-color="#d62976" stop-opacity="0" />
							</linearGradient>
						</defs>
						<path d={areaPath} fill="url(#ig-fill)" />
						<path d={linePath} fill="none" stroke="url(#ig-stroke)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
					</svg>
					{#if hover !== null}
						<span class="cursor" style="left: {pct(hover)}%"></span>
						<span class="dot" style="left: {pct(hover)}%; top: {py(growth[hover].followers)}%"></span>
						<div class="tip" class:flip={hover > last * 0.6} style="left: {pct(hover)}%; top: {py(growth[hover].followers)}%">
							<small>{fmtMonth(growth[hover].month, true)}</small>
							<strong>{fmtCount(growth[hover].followers)} followers</strong>
						</div>
					{/if}
				</div>
				<div class="y-axis" aria-hidden="true">
					{#each yTicks as g}
						<span style="top: {py(g)}%">{fmtCount(g)}</span>
					{/each}
				</div>
				<div class="x-axis" aria-hidden="true">
					{#each xTicks as t}
						<span style="left: {pct(t.i)}%" class:first={t.i === 0} class:last={t.i === last}>{t.label}</span>
					{/each}
				</div>
			</div>
		</section>

		<section class="posts" aria-label="Top posts">
			<span class="c-label">Top reels</span>
			<ul>
				{#each data.topPosts as post, i}
					<li style="--i: {i}; --tile: {hues[i % hues.length]}">
						{#if post.thumb}<img src="/cases/{slug}/{post.thumb}" alt="" loading="lazy" />{/if}
						<i class="fa-solid fa-clapperboard reel" aria-hidden="true"></i>
						<span class="plays"><i class="fa-solid fa-play"></i>{fmtCount(post.views)}</span>
					</li>
				{/each}
			</ul>
		</section>
	</div>

	<p class="fetched" class:placeholder={data.placeholder}>
		{#if data.placeholder}
			Placeholder data: replace before launch
		{:else}
			Data from {data.source}{data.fetchedAt ? ` · fetched ${data.fetchedAt}` : ''}
		{/if}
	</p>
</div>

<style>
	.visual {
		--ig-bg: #000;
		--ig-raised: #121212;
		--ig-line: #262626;
		--ig-text: #f5f5f5;
		--ig-sub: #a8a8a8;

		padding: 1.75rem;
		background: var(--ig-bg);
		font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		color: var(--ig-text);
		text-align: left;
	}

	/* ── Profile header ── */
	.profile { display: flex; align-items: center; gap: 1.75rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--ig-line); }
	.ring {
		flex: none;
		display: grid;
		place-items: center;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background: conic-gradient(from 200deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75);
	}
	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		border: 3px solid var(--ig-bg);
		background:
			radial-gradient(circle at 40% 35%, #ffd2b0 0 16%, transparent 17%),
			linear-gradient(160deg, #3a2c6b, #d62976 60%, #fa7e1e);
		filter: saturate(1.1);
	}
	.who { display: flex; flex-direction: column; gap: 0.8rem; min-width: 0; }
	.handle { font-size: 1.15rem; font-weight: 600; }
	.counts { display: flex; gap: 2rem; margin: 0; }
	.counts div { display: flex; gap: 0.35rem; align-items: baseline; }
	.counts dd { margin: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
	.counts dt { color: var(--ig-sub); font-size: 0.9rem; }

	/* ── Insights ── */
	.insights { display: grid; grid-template-columns: 1.35fr 1fr; gap: 1.25rem; margin-top: 1.5rem; }
	.card { padding: 1.2rem 1.25rem 1rem; background: var(--ig-raised); border-radius: 12px; min-width: 0; }
	.card-head { display: grid; grid-template-columns: 1fr auto; align-items: end; row-gap: 0.25rem; }
	.c-label { font-size: 0.8rem; font-weight: 600; color: var(--ig-sub); }
	.card-head .c-label { grid-column: 1 / -1; }
	.c-value { font-size: 2rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
	.c-note { display: flex; gap: 0.4rem; align-items: center; font-size: 0.78rem; color: #58c322; }

	.chart { position: relative; margin-top: 1.25rem; padding-right: 2.75rem; padding-bottom: 1.5rem; }
	.plot { position: relative; height: 170px; cursor: crosshair; touch-action: pan-y; }
	.plot svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
	.grid { position: absolute; left: 0; right: 0; height: 1px; background: var(--ig-line); }
	.cursor { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255, 255, 255, 0.3); pointer-events: none; }
	.dot {
		position: absolute;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 0 3px rgba(214, 41, 118, 0.5);
		pointer-events: none;
	}
	.tip {
		position: absolute;
		z-index: 3;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.5rem 0.7rem;
		background: #262626;
		border-radius: 8px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
		pointer-events: none;
		transform: translate(14px, -50%);
	}
	.tip.flip { transform: translate(calc(-100% - 14px), -50%); }
	.tip small { font-size: 0.7rem; color: var(--ig-sub); }
	.tip strong { font-size: 0.85rem; font-weight: 600; }
	.y-axis { position: absolute; top: 0; right: 0; height: 170px; width: 2.4rem; }
	.y-axis span { position: absolute; right: 0; transform: translateY(-50%); font-size: 0.7rem; color: var(--ig-sub); }
	.x-axis { position: absolute; left: 0; right: 2.75rem; bottom: 0; height: 1rem; }
	.x-axis span { position: absolute; transform: translateX(-50%); font-size: 0.7rem; color: var(--ig-sub); white-space: nowrap; }
	.x-axis span.first { transform: none; }
	.x-axis span.last { transform: translateX(-100%); }

	/* ── Top posts ── */
	.posts { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
	.posts ul { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 0; padding: 0; list-style: none; }
	.posts li {
		position: relative;
		aspect-ratio: 4 / 5;
		overflow: hidden;
		background: var(--tile);
		transition: opacity 0.6s, filter 0.6s, transform 0.6s cubic-bezier(0.2, 0.7, 0.1, 1);
		transition-delay: calc(0.25s + var(--i) * 60ms);
	}
	.posts img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.reel { position: absolute; top: 8px; right: 8px; font-size: 0.8rem; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5); }
	.plays {
		position: absolute;
		left: 8px;
		bottom: 7px;
		display: flex;
		gap: 0.35rem;
		align-items: center;
		font-size: 0.78rem;
		font-weight: 600;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
	}
	.plays i { font-size: 0.6rem; }
	.visual:not(.active) .posts li { opacity: 0; filter: blur(8px); transform: translateY(10px); transition-delay: 0s; }

	.fetched {
		margin: 1.25rem 0 0;
		font-family: var(--font-body);
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		text-align: right;
	}
	.fetched.placeholder { color: #ffc23d; }

	@container (max-width: 760px) {
		.insights { grid-template-columns: 1fr; }
		.posts ul { grid-template-columns: repeat(6, 1fr); }
		.plays { left: 5px; bottom: 4px; font-size: 0.65rem; }
		.reel { display: none; }
	}
	@container (max-width: 520px) {
		.visual { padding: 1rem 0.75rem; }
		.profile { gap: 1rem; padding-bottom: 1rem; }
		.ring { width: 60px; height: 60px; }
		.avatar { width: 54px; height: 54px; }
		.handle { font-size: 0.95rem; }
		.counts { gap: 1rem; }
		.counts div { flex-direction: column; gap: 0; }
		.counts dt { font-size: 0.72rem; }
		.insights { margin-top: 1rem; gap: 0.9rem; }
		.card { padding: 0.9rem 0.9rem 0.75rem; }
		.c-value { font-size: 1.5rem; }
		.plot, .y-axis { height: 110px; }
		.posts ul { grid-template-columns: repeat(3, 1fr); }
		.posts li { aspect-ratio: 1; }
		.fetched { text-align: left; font-size: 0.65rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.posts li { transition: none; }
	}
</style>
