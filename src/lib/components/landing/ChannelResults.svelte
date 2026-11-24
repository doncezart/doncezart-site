<script>
	// YouTube Studio-style analytics window for the landing page. The numbers
	// come from a real Studio screenshot of Santea's main channel (last 90 days,
	// 7 Aug - 4 Nov 2026, fetched 5 Nov 2026). Daily views were read off that
	// chart pixel by pixel (in thousands, accurate to roughly +-4K) and add up
	// to the 11M total.
	import { onMount, untrack } from 'svelte';

	import { fmtCount } from '$lib/data/cases/format.js';

	/**
	 * active: whether this case is the one on screen (drives the reveal animation).
	 * channel: public channel details ({ name, handle, subscribers, avatar }).
	 */
	let { active = true, channel } = $props();

	const START = new Date(2026, 7, 7); // 7 Aug 2026
	const views = [
		40, 115, 102, 67, 50, 110, 83, 106, 71, 52, 102, 73, 42, 33, 29, 29, 29, 29, 29, 25, 46, 33, 29, 38,
		119, 102, 144, 94, 227, 225, 148, 165, 117, 117, 142, 133, 227, 402, 327, 198, 148, 100, 83, 83, 62,
		54, 60, 194, 94, 194, 112, 92, 67, 56, 112, 100, 119, 79, 88, 79, 83, 144, 200, 190, 140, 196, 302,
		288, 285, 200, 131, 104, 96, 88, 88, 167, 169, 98, 135, 100, 156, 135, 167, 110, 167, 275, 231, 173,
		131, 83
	];
	const Y_MAX = 450; // K
	const last = views.length - 1;

	const metrics = [
		{ label: 'Views', value: 11, fmt: (v) => `${v >= 10 ? Math.round(v) : v.toFixed(1)}M`, note: '152% more than previous 90 days' },
		{ label: 'Watch time (hours)', value: 1.2, fmt: (v) => `${v.toFixed(1)}M`, note: '29% more than previous 90 days' },
		{ label: 'Subscribers', value: 5.8, fmt: (v) => `+${v.toFixed(1)}K` }
	];

	// Long-form uploads in the window (days since 7 Aug), from the channel's
	// public upload dates. Uploads a day apart share one badge, like Studio.
	const uploadDays = [1, 5, 7, 24, 28, 29, 47, 54, 61, 67, 82, 84];
	const uploads = uploadDays.reduce((groups, d) => {
		const g = groups[groups.length - 1];
		if (g && d - g.days[g.days.length - 1] <= 1) g.days.push(d);
		else groups.push({ days: [d] });
		return groups;
	}, []);

	const xTicks = [
		{ day: 0, label: '7 Aug 2026' },
		{ day: 15, label: '22 Aug 2026' },
		{ day: 30, label: '6 Sept 2026' },
		{ day: 45, label: '21 Sept 2026' },
		{ day: 59, label: '5 Oct 2026' },
		{ day: 74, label: '20 Oct 2026' },
		{ day: 89, label: '4 Nov 2026' }
	];

	// SVG drawn in a 1000 x 100 box and stretched to the plot (strokes don't scale).
	const px = (d) => (d / last) * 1000;
	const py = (v) => 100 - (v / Y_MAX) * 100;
	const pct = (d) => (d / last) * 100;
	const linePath = views.map((v, d) => `${d ? 'L' : 'M'}${px(d).toFixed(2)},${py(v).toFixed(2)}`).join(' ');
	const areaPath = `${linePath} L1000,100 L0,100 Z`;

	const dayDate = (d) => new Date(START.getFullYear(), START.getMonth(), START.getDate() + d);
	const fmtDay = (d, opts = {}) =>
		dayDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
	const uploadLabel = (g) =>
		g.days.length === 1
			? `New video · ${fmtDay(g.days[0])}`
			: `${g.days.length} new videos · ${dayDate(g.days[0]).getDate()}–${fmtDay(g.days[g.days.length - 1])}`;

	// Reveal: the chart draws left to right and the numbers count up every
	// time this case becomes the active one. Server render shows the final state.
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
		// Reset once the exit transition has finished, ready for the next entry.
		if (!active) {
			const t = setTimeout(() => (progress = 0), 700);
			return () => clearTimeout(t);
		}
		// untrack: the animation writes progress, so reading it must not re-run this.
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

	// Hover readouts: a chart day, or an upload badge.
	let hoverDay = $state(null);
	let hoverUpload = $state(null);
	function onPlotMove(e) {
		const r = e.currentTarget.getBoundingClientRect();
		const d = Math.round(((e.clientX - r.left) / r.width) * last);
		hoverDay = Math.max(0, Math.min(last, d));
	}
</script>

<div class="visual" bind:this={root}>
	<div class="studio">
		<aside class="sidebar">
			<a class="channel" href="https://www.youtube.com/{channel.handle}" target="_blank" rel="noopener">
				<span class="avatar-wrap"><img class="avatar" src={channel.avatar} alt="" width="108" height="108" /></span>
				<span class="ch-label">This could be your channel</span>
				<span class="ch-name">{channel.name}</span>
				<span class="ch-meta">{channel.handle} · {fmtCount(channel.subscribers)} subscribers</span>
			</a>
		</aside>

		<section class="main">
			<div class="card">
				<div class="metrics">
					{#each metrics as m, i}
						<div class="metric" class:on={i === 0}>
							<span class="m-label">{m.label}</span>
							<span class="m-value">
								{m.fmt(m.value * progress)}
								{#if m.note}
									<i class="trend"><i class="fa-solid fa-arrow-up"></i></i>
								{/if}
							</span>
							{#if m.note}<span class="m-note">{m.note}</span>{/if}
						</div>
					{/each}
				</div>

				<div class="chart">
					<div
						class="plot"
						role="img"
						aria-label="Daily views over the last 90 days, peaking at about 400K views a day in mid September"
						onpointermove={onPlotMove}
						onpointerleave={() => (hoverDay = null)}
					>
						{#each [450, 300, 150] as g}
							<span class="grid" style="top: {py(g)}%"></span>
						{/each}
						<svg viewBox="0 0 1000 100" preserveAspectRatio="none" style="clip-path: inset(-5% {(1 - progress) * 100}% -5% 0)">
							<defs>
								<linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0" stop-color="#3ea6ff" stop-opacity="0.22" />
									<stop offset="1" stop-color="#3ea6ff" stop-opacity="0.04" />
								</linearGradient>
							</defs>
							<path d={areaPath} fill="url(#area-fill)" />
							<path d={linePath} fill="none" stroke="#3ea6ff" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
						</svg>
						<span class="baseline"></span>
						<span class="axis"></span>

						{#if hoverDay !== null}
							<span class="cursor" style="left: {pct(hoverDay)}%"></span>
							<span class="dot" style="left: {pct(hoverDay)}%; top: {py(views[hoverDay])}%"></span>
							<div class="tip" class:flip={hoverDay > last * 0.7} style="left: {pct(hoverDay)}%; top: {py(views[hoverDay])}%">
								<small>{fmtDay(hoverDay, { weekday: 'short' })}</small>
								<strong>{views[hoverDay]}K views</strong>
							</div>
						{/if}
					</div>

					<!-- Outside .plot so hovering a badge doesn't move the chart cursor. -->
					<div class="uploads">
						{#each uploads as u, i}
							{@const mid = (u.days[0] + u.days[u.days.length - 1]) / 2}
							<button
								type="button"
								class="upload"
								style="left: {pct(mid)}%"
								aria-label={uploadLabel(u)}
								onpointerenter={() => (hoverUpload = i)}
								onpointerleave={() => (hoverUpload = null)}
								onfocus={() => (hoverUpload = i)}
								onblur={() => (hoverUpload = null)}
							>
								{#if u.days.length > 1}{u.days.length}{:else}<i class="fa-solid fa-play"></i>{/if}
							</button>
							{#if hoverUpload === i}
								<span class="upload-tip" class:flip={mid > last * 0.75} style="left: {pct(mid)}%">{uploadLabel(u)}</span>
							{/if}
						{/each}
					</div>

					<div class="y-axis" aria-hidden="true">
						{#each [450, 300, 150, 0] as g}
							<span style="top: {py(g)}%">{g ? `${g}K` : '0'}</span>
						{/each}
					</div>
					<div class="x-axis" aria-hidden="true">
						{#each xTicks as t, i}
							<span style="left: {pct(t.day)}%" class:first={i === 0} class:last={i === xTicks.length - 1}>{t.label}</span>
						{/each}
					</div>
				</div>
			</div>
			<p class="fetched">Data from YouTube Studio, last 90 days · fetched 5 November 2026</p>
		</section>
	</div>
</div>

<style>
	/* Body only: the window frame and chrome belong to ResultsCases. */
	.visual {
		/* Shared window palette from ResultsCases' frame; YouTube blue for data. */
		--yt-bg: var(--w-bg);
		--yt-raised: var(--w-raised);
		--yt-line: var(--w-line);
		--yt-text: var(--w-text);
		--yt-sub: var(--w-sub);
		--yt-blue: #3ea6ff;

		display: flex;
		flex-direction: column;
		background: var(--yt-bg);
		font-family: var(--w-font);
		color: var(--yt-text);
		text-align: left;
	}

	/* Flex chain down to the chart, so the chart takes any extra height. */
	.studio { flex: 1; display: grid; grid-template-columns: 220px 1fr; }

	/* ── Channel column ── */
	.sidebar { border-right: 1px solid var(--yt-line); padding: 2rem 0; }
	.channel {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		margin: 0 1rem;
		padding: 0.5rem 0 0.75rem;
		color: inherit;
		text-decoration: none;
		text-align: center;
	}
	.avatar-wrap {
		display: block;
		width: 108px;
		height: 108px;
		margin-bottom: 0.85rem;
		border-radius: 50%;
		overflow: hidden;
		background: var(--w-raised-2);
	}
	.avatar {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.ch-label { font-size: 0.95rem; font-weight: 500; }
	.ch-name { font-size: 0.85rem; color: var(--yt-sub); }
	.ch-meta { font-size: 0.75rem; line-height: 1.45; color: var(--yt-sub); opacity: 0.8; }
	.channel:hover .ch-name { color: var(--w-text); }

	/* ── Main column ── */
	.main { display: flex; flex-direction: column; padding: 1.75rem; min-width: 0; }
	.card {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--w-line-strong);
		border-radius: var(--w-radius);
		overflow: hidden;
		background: var(--w-raised);
		padding-bottom: 1.25rem;
	}
	.metrics { display: grid; grid-template-columns: repeat(3, 1fr); }
	.metric {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 1.1rem 0.75rem 1.2rem;
		background: var(--w-raised-2);
		text-align: center;
	}
	.metric + .metric { border-left: 1px solid var(--w-line-strong); }
	.metric.on { background: var(--w-raised); }
	.m-label { font-size: 0.82rem; color: var(--yt-sub); }
	.metric.on .m-label { color: var(--yt-text); }
	.m-value {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 1.75rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.15;
	}
	.trend {
		display: inline-grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--w-up);
		font-size: 0.65rem;
		color: var(--yt-bg);
	}
	.m-note { font-size: 0.75rem; font-style: italic; color: var(--yt-sub); }

	/* ── Chart ── */
	.chart {
		--plot-min: 230px;
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
		margin: 2.25rem 1.5rem 0;
		padding-right: 3.75rem;
		padding-bottom: 3.4rem;
	}
	.plot { position: relative; flex: 1; min-height: var(--plot-min); cursor: crosshair; touch-action: pan-y; }
	.plot svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
	.grid,
	.baseline {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--w-line);
	}
	.baseline { bottom: 0; background: var(--w-line-strong); }
	/* Studio puts upload markers between the 0 line and the date axis. */
	.axis { position: absolute; left: 0; right: 0; bottom: -2.15rem; height: 1px; background: var(--w-line-strong); }
	.cursor {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: rgba(255, 255, 255, 0.35);
		pointer-events: none;
	}
	.dot {
		position: absolute;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		border-radius: 50%;
		background: var(--yt-blue);
		box-shadow: 0 0 0 3px rgba(62, 166, 255, 0.25);
		pointer-events: none;
	}
	.tip,
	.upload-tip {
		position: absolute;
		z-index: 3;
		background: var(--w-raised-2);
		border-radius: 6px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
		pointer-events: none;
	}
	.tip {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.55rem 0.75rem;
		transform: translate(14px, -50%);
	}
	.tip.flip { transform: translate(calc(-100% - 14px), -50%); }
	.tip small { font-size: 0.72rem; color: var(--yt-sub); }
	.tip strong { font-size: 0.9rem; font-weight: 500; }

	.uploads { position: absolute; left: 0; right: 3.75rem; bottom: calc(3.4rem - 1.45rem); height: 1.1rem; }
	.upload {
		position: absolute;
		top: 0;
		display: grid;
		place-items: center;
		min-width: 15px;
		height: 15px;
		padding: 0 0.2rem;
		transform: translateX(-50%);
		border: 0;
		border-radius: 2px;
		background: var(--w-sub);
		color: var(--w-bg);
		font: 700 0.6rem/1 var(--w-font);
		cursor: default;
		transition: background 0.15s;
	}
	.upload i { font-size: 0.45rem; }
	.upload:hover,
	.upload:focus-visible { background: var(--w-text); outline: none; }
	.upload-tip {
		bottom: calc(100% + 8px);
		padding: 0.4rem 0.6rem;
		font-size: 0.75rem;
		transform: translateX(-50%);
	}
	.upload-tip.flip { transform: translateX(calc(-100% + 10px)); }

	.y-axis { position: absolute; top: 0; right: 0; bottom: 3.4rem; width: 3.25rem; }
	.y-axis span {
		position: absolute;
		right: 0;
		transform: translateY(-50%);
		font-size: 0.75rem;
		color: var(--yt-sub);
	}
	.x-axis { position: absolute; left: 0; right: 3.75rem; bottom: 0; height: 1rem; }
	.x-axis span {
		position: absolute;
		transform: translateX(-50%);
		font-size: 0.72rem;
		color: var(--yt-sub);
		white-space: nowrap;
	}
	.x-axis span.first { transform: none; }
	.x-axis span.last { transform: translateX(-100%); }

	.fetched { margin: 0.9rem 0 0; font-size: 0.72rem; color: var(--w-muted); text-align: right; }

	@container (max-width: 900px) {
		.studio { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
		.sidebar { border-right: 0; border-bottom: 1px solid var(--yt-line); padding: 1rem 1.25rem; }
		.channel { flex-direction: row; justify-content: flex-start; gap: 0.9rem; margin: 0; padding: 0; }
		.avatar-wrap { width: 48px; height: 48px; margin: 0; }
		.channel { display: grid; grid-template-columns: 48px auto; column-gap: 0.9rem; row-gap: 0.1rem; align-content: center; text-align: left; }
		.channel .avatar-wrap { grid-row: 1 / span 3; }
		.ch-label { font-size: 0.9rem; }
		.x-axis span:nth-child(even) { display: none; }
	}
	@container (max-width: 520px) {
		.main { padding: 1rem 0.75rem; }
		.metric { padding: 0.8rem 0.3rem; }
		.m-label { font-size: 0.65rem; }
		.m-value { font-size: 1.1rem; gap: 0.25rem; }
		.trend { width: 14px; height: 14px; font-size: 0.5rem; }
		.m-note { font-size: 0.6rem; }
		.chart { margin: 1.5rem 0.6rem 0; padding-right: 2.6rem; }
		.chart { --plot-min: 150px; }
		.uploads { right: 2.6rem; }
		.upload { min-width: 11px; height: 11px; font-size: 0.5rem; padding: 0 0.1rem; }
		.upload i { font-size: 0.35rem; }
		.y-axis { width: 2.3rem; }
		.y-axis span { font-size: 0.62rem; }
		.x-axis { right: 2.6rem; }
		.x-axis span { font-size: 0.6rem; }
		.x-axis span:not(.first):not(.last) { display: none; }
		.fetched { font-size: 0.65rem; }
	}
</style>
