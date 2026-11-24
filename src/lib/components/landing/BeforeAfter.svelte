<script>
	// Before/after comparison: 6 videos from before I joined a channel vs 6 from
	// a few months in, laid out like a YouTube video grid. Data is hardcoded in
	// src/lib/data/cases/*.json (filled by scripts/fetch-case-videos.mjs) and
	// thumbnails live in static/cases/<slug>/<id>.webp.

	/** @type {{ data: any, slug: string, active?: boolean, phone?: boolean }} */
	// phone: the results stage is stacked on a phone; each row (before, after)
	// is one swipeable line of all its videos, about 4 in view, with a fade on
	// the right edge while more are off screen.
	let { data, slug, active = true, phone = false } = $props();
	let more = $state([true, true]); // per row: videos hidden to the right
	function onRowScroll(e, r) {
		const el = e.currentTarget;
		more[r] = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
	}

	const fmtViews = (n) => {
		if (n == null) return '–';
		if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
		if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K`;
		return String(n);
	};
	const fmtDate = (iso) =>
		iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
	const fmtDuration = (s) => {
		if (!s) return null;
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = String(s % 60).padStart(2, '0');
		return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
	};
	const range = (list) => {
		const dates = list.map((v) => v.date).filter(Boolean).sort();
		if (!dates.length) return null;
		const f = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
		return f(dates[0]) === f(dates[dates.length - 1]) ? f(dates[0]) : `${f(dates[0])} – ${f(dates[dates.length - 1])}`;
	};

	// Duration badges only when every video has one, so the grid stays even.
	const showDurations = [...data.before, ...data.after].every((v) => v.duration);

	const rows = [
		{ key: 'before', label: 'Before', list: data.before },
		{ key: 'after', label: 'After', list: data.after }
	];
</script>

<div class="visual" class:active class:phone>
	<div class="body">
		{#each rows as row, r}
			{#if r === 1}
				<div class="joined"><span>I joined</span></div>
			{/if}
			<div class="row-head">
				<span class="tag" class:after={row.key === 'after'}>{row.label}</span>
				{#if range(row.list)}<span class="when">{range(row.list)}</span>{/if}
			</div>
			<ul class="grid" class:more={more[r]} onscroll={phone ? (e) => onRowScroll(e, r) : undefined}>
				{#each row.list as v, i}
					<li style="--i: {i + r * 6}">
						<a href="https://www.youtube.com/watch?v={v.id}" target="_blank" rel="noopener noreferrer">
							<span class="thumb">
								<img src="/cases/{slug}/{v.id}.webp" alt="" loading="lazy" width="640" height="360" />
								{#if showDurations}<span class="dur">{fmtDuration(v.duration)}</span>{/if}
							</span>
							{#if v.title}
								<span class="title">{v.title}</span>
							{:else}
								<span class="title skeleton"><i></i><i></i></span>
							{/if}
							<span class="meta">
								<span>{v.views != null ? `${fmtViews(v.views)} views` : '– views'}</span>
								{#if v.date}<span class="date">{fmtDate(v.date)}</span>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/each}

		<p class="fetched">
			Data from {data.source ?? 'YouTube'}{data.fetchedAt ? ` · fetched ${fmtDate(data.fetchedAt)}` : ''}
		</p>
	</div>
</div>

<style>
	/* Body only: the window frame, chrome and headline numbers belong to
	   ResultsCases. */
	.visual {
		/* Shared window palette from ResultsCases' frame. */
		--yt-bg: var(--w-bg);
		--yt-raised: var(--w-raised);
		--yt-line: var(--w-line);
		--yt-text: var(--w-text);
		--yt-sub: var(--w-sub);

		display: flex;
		flex-direction: column;
		background: var(--yt-bg);
		font-family: var(--w-font);
		color: var(--yt-text);
		text-align: left;
	}

	/* Extra window height is shared out evenly around the two rows. */
	.body { flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; padding: 1.75rem; }

	.row-head { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.85rem; }
	.tag {
		padding: 0.25rem 0.55rem;
		border-radius: 4px;
		background: var(--yt-raised);
		font-family: var(--font-display);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--yt-sub);
	}
	.tag.after { background: var(--w-text); color: var(--w-bg); }
	.when { font-size: 0.8rem; color: var(--yt-sub); }

	.joined {
		position: relative;
		display: flex;
		justify-content: center;
		margin: 1.6rem 0 1.4rem;
	}
	.joined::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 43, 31, 0.7) 25%, rgba(255, 43, 31, 0.7) 75%, transparent);
	}
	.joined span {
		position: relative;
		padding: 0.3rem 0.9rem;
		background: var(--yt-bg);
		border: 1px solid rgba(255, 43, 31, 0.6);
		border-radius: 4px;
		font-family: var(--font-display);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 1rem 0.85rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.grid a { display: flex; flex-direction: column; gap: 0.45rem; color: inherit; text-decoration: none; }
	.thumb { position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 6px; background: var(--w-raised); }
	.thumb img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
	.grid a:hover img { transform: scale(1.05); }
	.dur {
		position: absolute;
		right: 4px;
		bottom: 4px;
		padding: 0.05rem 0.3rem;
		background: rgba(0, 0, 0, 0.8);
		font-size: 0.68rem;
		font-weight: 500;
	}
	.title {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		font-size: 0.8rem;
		font-weight: 500;
		line-height: 1.35;
	}
	.title.skeleton { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.15rem 0; }
	.title.skeleton i { height: 0.6rem; background: var(--w-raised-2); }
	.title.skeleton i + i { width: 60%; }
	.meta { display: flex; flex-wrap: wrap; column-gap: 0.4rem; font-size: 0.72rem; color: var(--yt-sub); }
	.meta span { white-space: nowrap; }

	/* Cards rack into focus when the case comes on screen. */
	.grid li { transition: opacity 0.6s, filter 0.6s, transform 0.6s cubic-bezier(0.2, 0.7, 0.1, 1); transition-delay: calc(var(--i) * 45ms); }
	.visual:not(.active) .grid li { opacity: 0; filter: blur(8px); transform: translateY(10px); transition-delay: 0s; }

	.fetched { margin: 0.9rem 0 0; font-size: 0.72rem; color: var(--w-muted); text-align: right; }

	/* Mid widths keep all six per row (short enough to stay legible in a
	   pinned window) and drop titles; phones go to three per row. */
	@container (max-width: 760px) {
		.grid { gap: 0.8rem 0.6rem; }
		.title { display: none; }
		.meta { font-size: 0.68rem; }
	}
	@container (max-width: 560px) {
		.body { padding: 1rem 0.75rem; }
		.grid { grid-template-columns: repeat(3, 1fr); }
		.meta { font-size: 0.65rem; }
		.meta .date { display: none; }
		.joined { margin: 1.1rem 0 1rem; }
		.fetched { font-size: 0.65rem; }
	}
	/* Phones (set by the results stage, whatever width the body is laid out
	   at): each row is one swipeable line, about 4.4 videos in view so the
	   next one peeks in, faded at the right edge while there is more. */
	.phone .body { padding: 1rem 0.9rem; }
	.phone .grid {
		display: flex;
		gap: 0.5rem;
		margin-right: -0.9rem;
		padding-right: 0.9rem;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}
	.phone .grid::-webkit-scrollbar { display: none; }
	.phone .grid li { flex: 0 0 calc((100% - 0.9rem - 4 * 0.5rem) / 4.4); scroll-snap-align: start; }
	.phone .grid.more {
		-webkit-mask-image: linear-gradient(to right, #000 78%, transparent);
		mask-image: linear-gradient(to right, #000 78%, transparent);
	}
	.phone .title { display: none; }
	.phone .meta { flex-direction: column; font-size: 0.66rem; line-height: 1.35; }
	.phone .meta .date { display: inline; color: var(--w-muted); }
	.phone .joined { margin: 1.2rem 0 1.1rem; }
	@media (prefers-reduced-motion: reduce) {
		.grid li { transition: none; }
	}
</style>
