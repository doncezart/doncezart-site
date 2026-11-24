<script>
	// Reddit Mod Insights-style window for the r/Scarface case: the four
	// headline metrics for the past 12 months, each with its year-over-year
	// change and a this-year vs previous-year bar. Numbers live in
	// $lib/data/cases/scarface.json.
	import { onMount, untrack } from 'svelte';
	import { fmtCount } from '$lib/data/cases/format.js';

	/**
	 * active: whether this case is the one on screen (drives the reveal).
	 * data: the scarface.json shape.
	 */
	// phone: the results stage is stacked on a phone (fuller 2 × 2 cards).
	let { active = true, data, phone = false } = $props();

	const d = data;
	const pct = (m) => Math.round((m.delta / (m.value - m.delta)) * 100);
	const metrics = [
		{
			label: 'Views',
			m: d.views,
			detail: `${fmtCount(d.views.monthlyUniques)} avg monthly unique visitors · ${fmtCount(d.views.weeklyVisitors)} weekly`
		},
		{ label: 'Members', m: d.members, detail: `${fmtCount(d.members.joined)} joined · ${fmtCount(d.members.left)} left` },
		{ label: 'Published posts', m: d.posts, detail: `${fmtCount(d.posts.removed)} removed` },
		{ label: 'Published comments', m: d.comments, detail: `${fmtCount(d.comments.removed)} removed` }
	];

	const since = new Date(d.modSince).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	const fetched = new Date(d.fetchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

	// Reveal: numbers count up and bars grow every time this case becomes the
	// active one. Server render shows the final state.
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
			const x = Math.min(1, (now - t0) / 1400);
			progress = from + (1 - from) * (1 - Math.pow(1 - x, 3));
			if (x < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="visual" class:phone bind:this={root}>
	<header class="head">
		<span class="icon" aria-hidden="true">r/</span>
		<div class="who">
			<strong>r/{d.subreddit}</strong>
			<span>Insights · Moderator since {since}</span>
		</div>
		<span class="range">Past 12 months <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
	</header>

	<div class="cards">
		{#each metrics as { label, m, detail }}
			{@const prev = m.value - m.delta}
			<div class="card">
				<div class="c-top">
					<span class="label">{label}</span>
					<span class="value">{fmtCount(Math.round(m.value * progress))}</span>
					<span class="delta">
						<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
						<span class="d-text">{fmtCount(m.delta)} from the previous year</span>
						<em>+{pct(m)}%</em>
					</span>
				</div>
				<div class="c-bottom">
					<span class="detail">{detail}</span>
					<div class="bars" aria-hidden="true">
						<div class="bar prev">
							<span>{phone ? 'Last year' : 'Previous year'}</span>
							<i style="width: {(prev / m.value) * 100 * progress}%"></i>
							<b>{fmtCount(prev)}</b>
						</div>
						<div class="bar now">
							<span>{phone ? 'This year' : 'Past 12 months'}</span>
							<i style="width: {100 * progress}%"></i>
							<b>{fmtCount(m.value)}</b>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<p class="source">Data from {d.source}, past 12 months · fetched {fetched}</p>
</div>

<style>
	/* Body only: the window frame and chrome belong to ResultsCases. */
	.visual {
		/* Shared window palette from ResultsCases' frame; Reddit orange only
		   for the community icon. */
		--rd-bg: var(--w-bg);
		--rd-card: var(--w-raised);
		--rd-line: var(--w-line);
		--rd-text: var(--w-text);
		--rd-sub: var(--w-sub);
		--rd-orange: #ff4500;
		--rd-green: var(--w-up);

		display: flex;
		flex-direction: column;
		padding: 1.75rem;
		background: var(--rd-bg);
		font-family: var(--w-font);
		color: var(--rd-text);
		text-align: left;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-bottom: 1.25rem;
		margin-bottom: 1.25rem;
		border-bottom: 1px solid var(--rd-line);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: 50%;
		background: var(--rd-orange);
		font-weight: 700;
		font-size: 1rem;
		color: #fff;
	}
	.who { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
	.who strong { font-size: 1.15rem; font-weight: 700; }
	.who span { font-size: 0.82rem; color: var(--rd-sub); }
	.range {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.9rem;
		border: 1px solid var(--rd-line);
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.range i { font-size: 0.65rem; color: var(--rd-sub); }

	/* The cards share out any extra window height. */
	.cards { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 0.9rem; }
	/* Two groups: the headline number on top, its breakdown and the
	   year-on-year bars at the bottom; extra height goes between them. */
	.card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.9rem;
		padding: 1.1rem 1.2rem 1.15rem;
		background: var(--rd-card);
		border: 1px solid var(--rd-line);
		border-radius: var(--w-radius);
		min-width: 0;
	}
	.c-top { display: flex; flex-direction: column; gap: 0.3rem; }
	.c-bottom { display: flex; flex-direction: column; gap: 0.7rem; padding-top: 0.8rem; border-top: 1px solid var(--rd-line); }
	.label { font-size: 0.82rem; font-weight: 600; color: var(--rd-sub); }
	.value { font-size: 2.1rem; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
	.delta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--rd-green);
	}
	.delta i { font-size: 0.7rem; }
	.delta em {
		font-style: normal;
		font-weight: 700;
		padding: 0.05rem 0.4rem;
		border-radius: 999px;
		background: rgba(43, 166, 64, 0.16);
	}
	.detail { font-size: 0.78rem; color: var(--rd-sub); }

	.bars { display: flex; flex-direction: column; gap: 0.4rem; }
	.bar {
		display: grid;
		grid-template-columns: 6.6rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.72rem;
		color: var(--rd-sub);
	}
	.bar i { display: block; height: 8px; border-radius: 4px; min-width: 2px; }
	.bar.prev i { background: var(--w-muted); }
	.bar.now i { background: var(--accent, #ff2b1f); }
	.bar b { font-weight: 600; color: var(--rd-text); font-variant-numeric: tabular-nums; min-width: 2.6rem; text-align: right; }

	.source { margin: 0.9rem 0 0; text-align: right; font-size: 0.72rem; color: var(--w-muted); }

	@container (max-width: 620px) {
		.visual { padding: 1rem 0.75rem; }
		/* Phones: stay 2 × 2 and keep just the number and its change, so the
		   window stays about as tall as the other cases. */
		.head { padding-bottom: 0.9rem; margin-bottom: 0.9rem; }
		.cards { gap: 0.6rem; }
		.card { padding: 0.8rem 0.85rem; }
		.range,
		.d-text,
		.c-bottom { display: none; }
		.value { font-size: 1.5rem; }
	}
	/* Phones: the full width is available, so each card also shows its
	   breakdown and the this-year vs last-year bars. The breakdown always
	   takes two lines, so cards side by side line up. */
	.phone .card { gap: 0.7rem; padding: 0.85rem 0.85rem 0.9rem; }
	.phone .c-top { gap: 0.25rem; }
	.phone .c-bottom { display: flex; gap: 0.55rem; padding-top: 0.6rem; }
	.phone .detail { display: flex; align-items: center; min-height: 2.8em; font-size: 0.68rem; line-height: 1.4; }
	.phone .bars { gap: 0.35rem; }
	.phone .bar { grid-template-columns: 3.7rem 1fr auto; gap: 0.4rem; font-size: 0.62rem; }
	.phone .bar i { height: 6px; }
	.phone .bar b { min-width: 2.2rem; }
</style>
