<script>
	// Google Search Console-style performance window for the Camere Trafic
	// case: the four summary tiles and the daily clicks/impressions chart.
	// Daily rows live in $lib/data/cases/cameretrafic.json (a Search Console
	// export).
	import { onMount, untrack } from 'svelte';
	import { fmtCount } from '$lib/data/cases/format.js';

	/**
	 * active: whether this case is the one on screen (drives the reveal).
	 * data: the cameretrafic.json shape.
	 */
	let { active = true, data } = $props();

	const days = data.days;
	const last = days.length - 1;
	const clicks = days.reduce((a, d) => a + d.clicks, 0);
	const impressions = days.reduce((a, d) => a + d.impressions, 0);
	const position = days.reduce((a, d) => a + (d.position ?? 0) * d.impressions, 0) / impressions;

	const tiles = [
		{ key: 'clicks', label: 'Total clicks', value: clicks, fmt: (v) => fmtCount(Math.round(v)), on: true },
		{ key: 'impr', label: 'Total impressions', value: impressions, fmt: (v) => fmtCount(Math.round(v)), on: true },
		{ key: 'ctr', label: 'Average CTR', value: (clicks / impressions) * 100, fmt: (v) => `${v.toFixed(1)}%` },
		{ key: 'pos', label: 'Average position', value: position, fmt: (v) => v.toFixed(1) }
	];

	// Two axes, like Search Console: clicks on the left, impressions on the right.
	const C_MAX = 80;
	const I_MAX = 800;
	const ticks = [0, 0.25, 0.5, 0.75, 1];
	const px = (i) => (i / last) * 1000;
	const path = (key, max) => days.map((d, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${(100 - (d[key] / max) * 100).toFixed(2)}`).join(' ');
	const clickPath = path('clicks', C_MAX);
	const imprPath = path('impressions', I_MAX);

	const fmtDate = (s, opts) => new Date(s).toLocaleDateString('en-GB', opts);
	const xTicks = [0, Math.round(last / 3), Math.round((last * 2) / 3), last].map((i) => ({
		i,
		label: fmtDate(days[i].date, { day: 'numeric', month: 'short' })
	}));
	const range = `${fmtDate(days[0].date, { day: 'numeric', month: 'short' })} – ${fmtDate(days[last].date, { day: 'numeric', month: 'short', year: 'numeric' })}`;

	// Reveal: tiles count up and the lines draw left to right every time this
	// case becomes the active one. Server render shows the final state.
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
			const x = Math.min(1, (now - t0) / 1600);
			progress = from + (1 - from) * (1 - Math.pow(1 - x, 3));
			if (x < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	let hover = $state(null);
	function onMove(e) {
		const r = e.currentTarget.getBoundingClientRect();
		hover = Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / r.width) * last)));
	}
</script>

<div class="visual" bind:this={root}>
	<header class="head">
		<span class="prop"><i class="fa-solid fa-globe" aria-hidden="true"></i>https://{data.site}/</span>
		<span class="title">Performance on Search results</span>
		<span class="chip">Search type: Web</span>
		<span class="chip">{range}</span>
	</header>

	<div class="card">
		<div class="tiles">
			{#each tiles as t}
				<div class="tile {t.key}" class:on={t.on}>
					<span class="t-label">{#if t.on}<i class="fa-solid fa-square-check" aria-hidden="true"></i>{/if}{t.label}</span>
					<span class="t-value">{t.fmt(t.value * progress)}</span>
				</div>
			{/each}
		</div>

		<div class="chart">
			<div class="axis left" aria-hidden="true">
				<span>Clicks</span>
				{#each [...ticks].reverse() as k}<b style="top: {(1 - k) * 100}%">{C_MAX * k}</b>{/each}
			</div>
			<div class="plot" role="img" aria-label="Daily clicks and impressions, {range}" onpointermove={onMove} onpointerleave={() => (hover = null)}>
				{#each ticks as k}<i class="grid" style="top: {(1 - k) * 100}%"></i>{/each}
				<svg viewBox="0 0 1000 100" preserveAspectRatio="none" style="clip-path: inset(-5% {100 - progress * 100}% -5% 0)">
					<path d={imprPath} class="impr" vector-effect="non-scaling-stroke" />
					<path d={clickPath} class="clicks" vector-effect="non-scaling-stroke" />
				</svg>
				{#if hover !== null}
					{@const d = days[hover]}
					<i class="cursor" style="left: {(hover / last) * 100}%"></i>
					<div class="tip" class:flip={hover > last * 0.6} style="left: {(hover / last) * 100}%">
						<strong>{fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
						<span><i class="dot clicks"></i>Clicks <b>{d.clicks}</b></span>
						<span><i class="dot impr"></i>Impressions <b>{d.impressions}</b></span>
					</div>
				{/if}
			</div>
			<div class="axis right" aria-hidden="true">
				<span>Impressions</span>
				{#each [...ticks].reverse() as k}<b style="top: {(1 - k) * 100}%">{I_MAX * k}</b>{/each}
			</div>
			<div class="x" aria-hidden="true">
				{#each xTicks as t}<span style="left: {(t.i / last) * 100}%">{t.label}</span>{/each}
			</div>
		</div>
	</div>

	<p class="source">Data from {data.source} · fetched {fmtDate(data.fetchedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
</div>

<style>
	/* Body only: the window frame and chrome belong to ResultsCases. */
	.visual {
		/* Shared window palette from ResultsCases' frame; Search Console
		   blue/purple for the selected metrics and their lines. */
		--gs-bg: var(--w-bg);
		--gs-card: var(--w-raised);
		--gs-line: var(--w-line);
		--gs-text: var(--w-text);
		--gs-sub: var(--w-sub);
		--gs-blue: #4285f4;
		--gs-purple: #5e35b1;

		display: flex;
		flex-direction: column;
		padding: 1.75rem;
		background: var(--gs-bg);
		font-family: var(--w-font);
		color: var(--gs-text);
		text-align: left;
	}

	.head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin-bottom: 1.1rem; }
	.prop { display: flex; align-items: center; gap: 0.5rem; width: 100%; font-size: 0.78rem; color: var(--gs-sub); }
	.prop i { font-size: 0.75rem; }
	.title { font-size: 1.25rem; margin-right: auto; }
	.chip {
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--gs-line);
		border-radius: 8px;
		font-size: 0.78rem;
		color: var(--gs-sub);
		white-space: nowrap;
	}

	.card {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--gs-card);
		border: 1px solid var(--gs-line);
		border-radius: var(--w-radius);
		overflow: hidden;
	}
	.tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-bottom: 1px solid var(--gs-line); }
	.tile {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.1rem 1.1rem;
		color: var(--gs-sub);
		border-right: 1px solid var(--gs-line);
		min-width: 0;
	}
	.tile:last-child { border-right: 0; }
	.tile.on { color: #fff; border-right-color: transparent; }
	.tile.on.clicks { background: var(--gs-blue); }
	.tile.on.impr { background: var(--gs-purple); }
	.t-label { display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; white-space: nowrap; }
	.t-label i { font-size: 0.85rem; }
	.t-value { font-size: 2rem; line-height: 1.1; font-variant-numeric: tabular-nums; }

	.chart {
		position: relative;
		display: grid;
		grid-template-columns: 3rem 1fr 3.4rem;
		/* Takes any extra window height. */
		flex: 1;
		min-height: 250px;
		padding: 1.6rem 0.6rem 2rem;
	}
	.axis { position: relative; font-size: 0.7rem; color: var(--gs-sub); }
	.axis span { position: absolute; top: -1.4rem; white-space: nowrap; }
	.axis.left span { left: 0.4rem; }
	.axis.right span { right: 0.2rem; }
	.axis b { position: absolute; font-weight: 400; transform: translateY(-50%); }
	.axis.left b { right: 0.6rem; }
	.axis.right b { left: 0.6rem; }
	.plot { position: relative; cursor: crosshair; }
	.grid { position: absolute; left: 0; right: 0; height: 1px; background: var(--gs-line); }
	svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
	path { fill: none; stroke-width: 2.25; stroke-linejoin: round; }
	path.clicks { stroke: var(--gs-blue); }
	path.impr { stroke: #9575cd; }
	.cursor { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255, 255, 255, 0.35); pointer-events: none; }
	.tip {
		position: absolute;
		top: 0.5rem;
		transform: translateX(0.75rem);
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.65rem 0.8rem;
		background: var(--w-raised-2);
		border-radius: 6px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
		font-size: 0.75rem;
		white-space: nowrap;
		pointer-events: none;
		z-index: 2;
	}
	.tip.flip { transform: translateX(calc(-100% - 0.75rem)); }
	.tip span { display: flex; align-items: center; gap: 0.45rem; color: var(--gs-sub); }
	.tip b { margin-left: auto; padding-left: 1rem; color: var(--gs-text); font-weight: 600; }
	.dot { width: 8px; height: 8px; border-radius: 50%; }
	.dot.clicks { background: var(--gs-blue); }
	.dot.impr { background: #9575cd; }
	.x { position: absolute; left: calc(0.6rem + 3rem); right: calc(0.6rem + 3.4rem); bottom: 0.6rem; height: 1rem; font-size: 0.7rem; color: var(--gs-sub); }
	.x span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
	.x span:first-child { transform: none; }
	.x span:last-child { transform: translateX(-100%); }

	.source { margin: 0.9rem 0 0; text-align: right; font-size: 0.72rem; color: var(--w-muted); }

	@container (max-width: 620px) {
		.visual { padding: 1rem 0.75rem; }
		.chip { display: none; }
		.title { font-size: 1rem; }
		.tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.tile { padding: 0.75rem; }
		.t-value { font-size: 1.4rem; }
		.chart { min-height: 190px; }
		.x span:not(:first-child, :last-child) { display: none; }
	}
</style>
