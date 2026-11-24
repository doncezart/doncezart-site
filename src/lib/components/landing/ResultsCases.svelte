<script>
	// Results: a pinned, scroll-driven case-study stage.
	//
	// The section is one screen tall plus one STEP of scroll per extra case. Its
	// inner stage sticks to the viewport while the scroll position picks the
	// active case. The frame stays put (eyebrow, counter, stat cells, chapter
	// rail, window chrome) and only the contents swap: headline lines roll
	// through a mask, numbers roll, and the window racks focus to the next body
	// while resizing to fit it. Each case is a stop in the page-wide stepped
	// scroll (./snap-scroll.js), so one gesture moves one case.
	//
	// Cases are configured in ./cases.js.
	import { onMount, tick, untrack } from 'svelte';
	import gsap from 'gsap';
	import ScrollTrigger from 'gsap/ScrollTrigger';
	import { cases } from './cases.js';
	import { addStops, scrollToY } from './snap-scroll.js';

	const N = cases.length;
	const pad = (n) => String(n).padStart(2, '0');
	const icons = { youtube: 'fa-youtube', instagram: 'fa-instagram', tiktok: 'fa-tiktok', reddit: 'fa-reddit-alien', google: 'fa-google' };

	let section;
	let trigger;
	let progress = $state(0);
	// While a step animates, show its destination straight away, so the content
	// swaps on the gesture instead of halfway through the scroll.
	let target = $state(null);
	const index = $derived(target ?? (N > 1 ? Math.round(progress * (N - 1)) : 0));
	const phase = (i) => (i === index ? 'on' : i < index ? 'past' : 'next');

	// ── Window sizing ──
	// Every window is the same size: exactly as tall as the copy column beside
	// it (on narrow screens, the space left under the copy). Bodies are laid out
	// at the stage's width; one shared scale, set by the tallest body, shrinks
	// them all if needed, and shorter bodies stretch to fill (each visual has a
	// flexible region, usually its chart).
	//
	// Stacked (phones) there is little height, so shrinking a body to fit would
	// leave a narrow window. Instead each body is laid out wider than the
	// stage (it reflows shorter) and scaled back down to the full stage width:
	// the narrowest such width whose scaled height fits is used.
	const CHROME = 43; // address bar (41px) + frame border, px
	const MAX_W = 1080;
	const WIDEN = [1, 1.12, 1.25, 1.4, 1.55, 1.7, 1.85, 2]; // stacked layout widths, x stage width
	let stageW = $state(0);
	let stageH = $state(0);
	let copyH = $state(0);
	let stacked = $state(false);
	let natural = $state(cases.map(() => 0));
	let bodyW = $state(cases.map(() => 0)); // layout width per body (stacked)
	let stackS = $state(cases.map(() => 1)); // scale per body (stacked)
	let measuring = $state(true);
	let bodies = $state([]);
	const layoutW = $derived(Math.min(stageW, MAX_W));
	const boxH = $derived(stacked ? stageH : Math.min(stageH, copyH));
	const availH = $derived(Math.max(0, boxH - CHROME));
	const tallest = $derived(Math.max(...natural));
	const fit = (h) => (h && availH ? Math.min(1, availH / h) : 1);
	// Side by side: one scale for all, so every window is identical.
	const scales = $derived(stacked ? stackS : natural.map(() => fit(tallest)));
	const widthOf = (i) => (stacked && bodyW[i] ? bodyW[i] : layoutW || MAX_W);
	const frameW = $derived(widthOf(index) * scales[index]);
	const measured = $derived(layoutW > 0 && tallest > 0 && availH > 0);

	/** Natural (unstretched) body heights, and on phones the widths to use. */
	let run = 0;
	async function measure() {
		const me = ++run;
		measuring = true;
		if (stacked && layoutW > 0 && availH > 0) {
			const pick = cases.map(() => null);
			for (const f of WIDEN) {
				const w = Math.round(layoutW * f);
				bodyW = cases.map((_, i) => pick[i]?.w ?? w);
				await tick();
				if (me !== run) return;
				bodies.forEach((b, i) => {
					if (pick[i]) return;
					const h = b?.offsetHeight ?? 0;
					const sc = layoutW / w;
					if (h * sc <= availH) pick[i] = { w, h, s: sc };
					else if (f === WIDEN[WIDEN.length - 1]) pick[i] = { w, h, s: Math.min(sc, availH / h) };
				});
				if (pick.every(Boolean)) break;
			}
			bodyW = pick.map((p) => p.w);
			natural = pick.map((p) => p.h);
			stackS = pick.map((p) => p.s);
		} else {
			bodyW = cases.map(() => 0);
			await tick();
			if (me !== run) return;
			natural = bodies.map((b) => b?.offsetHeight ?? 0);
		}
		measuring = false;
	}
	$effect(() => {
		// Re-fit when the width, the space or the layout mode changes.
		if (layoutW > 0) {
			stacked;
			if (stacked) availH;
			untrack(measure);
		}
	});

	// ── Scroll ──
	// ScrollTrigger only reports progress; the stepping itself is page-wide
	// (snap-scroll.js). Each case is one stop.
	const caseY = (i) => trigger.start + (N > 1 ? i / (N - 1) : 0) * (trigger.end - trigger.start);
	const posOf = (y) => ((y - trigger.start) / (trigger.end - trigger.start)) * (N - 1);

	function go(i) {
		window.umami?.track('results-chapter', { case: cases[i].key });
		if (trigger) scrollToY(caseY(i));
	}

	// Which cases people actually look at: one event per case per visit, once
	// it has been on screen for a moment while the stage is pinned (cases
	// flicked past don't count).
	let pinned = $state(false);
	const seen = new Set();
	$effect(() => {
		const key = cases[index].key;
		if (!pinned || seen.has(key)) return;
		const t = setTimeout(() => {
			seen.add(key);
			window.umami?.track('results-case', { case: key });
		}, 1200);
		return () => clearTimeout(t);
	});

	onMount(() => {
		gsap.registerPlugin(ScrollTrigger);
		trigger = ScrollTrigger.create({
			trigger: section,
			start: 'top top',
			end: 'bottom bottom',
			onUpdate: (self) => (progress = self.progress),
			onRefresh: (self) => (progress = self.progress)
		});
		progress = trigger.progress;
		// Phones: the back-to-top button hides while this stage is pinned, so
		// it never covers the window (checked on every scroll: the stepped
		// scroll lands exactly on the first case, where ScrollTrigger's own
		// active flag hasn't flipped yet).
		const onScroll = () => {
			const y = window.scrollY;
			pinned = y >= trigger.start - 2 && y <= trigger.end + 2;
			document.documentElement.classList.toggle('results-pinned', pinned);
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		const mq = window.matchMedia('(max-width: 960px)');
		const onMq = () => (stacked = mq.matches);
		onMq();
		mq.addEventListener('change', onMq);
		// Web fonts and thumbnails can change body heights after first layout.
		document.fonts?.ready.then(measure);
		window.addEventListener('load', measure);
		const removeStops = addStops(
			() => cases.map((_, i) => caseY(i)),
			(y) => {
				// Show the destination case straight away while a step animates.
				const inside = y !== null && y >= trigger.start - 2 && y <= trigger.end + 2;
				target = inside && N > 1 ? Math.max(0, Math.min(N - 1, Math.round(posOf(y)))) : null;
			}
		);
		return () => {
			mq.removeEventListener('change', onMq);
			window.removeEventListener('load', measure);
			removeStops();
			trigger.kill();
			window.removeEventListener('scroll', onScroll);
			document.documentElement.classList.remove('results-pinned');
		};
	});
</script>

<section id="results" class="results" style="--n: {N}" bind:this={section} aria-label="Results">
	<div class="pin">
		<div class="glow" aria-hidden="true" style="--gx: {index % 2 ? '-14%' : '10%'}">
			<span class="g-hot"></span>
			<span class="g-ig" class:on={cases[index].platform === 'instagram'}></span>
		</div>

		<div class="layout">
			<div class="copy">
				<div class="copy-in" bind:offsetHeight={copyH}>
				<div class="eyebrow-row">
					<p class="eyebrow">The results</p>
					<span class="rule"></span>
					<span class="count" aria-label="Case {index + 1} of {N}">
						<span class="swap roll" aria-hidden="true">
							{#each cases as _, i}<span class={phase(i)}>{pad(i + 1)}</span>{/each}
						</span>
						<small aria-hidden="true">/ {pad(N)}</small>
					</span>
				</div>

				<p class="swap fade tag">
					{#each cases as c, i}
						<span class={phase(i)} aria-hidden={i !== index}>
							<i class="fa-brands {icons[c.platform]}"></i>{c.name}<span class="type">· {c.type}</span>
						</span>
					{/each}
				</p>

				<h2 class="swap headline">
					{#each cases as c, i}
						<span class="h {phase(i)}" aria-hidden={i !== index}>
							<span class="mask"><span class="line">{c.title}</span></span>
							<span class="mask"><span class="line hot">{c.hot}</span></span>
						</span>
					{/each}
				</h2>

				<p class="swap fade sub">
					{#each cases as c, i}<span class={phase(i)} aria-hidden={i !== index}>{c.sub}</span>{/each}
				</p>

				<dl class="stats">
					{#each [0, 1, 2] as s}
						<div class="stat" style="--k: {s}">
							<dt class="swap fade">
								{#each cases as c, i}<span class={phase(i)} aria-hidden={i !== index}>{c.stats[s].label}</span>{/each}
							</dt>
							<dd class="swap roll">
								{#each cases as c, i}
									<span class={phase(i)} class:hot={c.stats[s].hot} aria-hidden={i !== index}>{c.stats[s].value}</span>
								{/each}
							</dd>
						</div>
					{/each}
				</dl>

				<nav class="chapters" aria-label="Case studies" style="--p: {progress}">
					<span class="rail" aria-hidden="true"><i></i></span>
					<ol>
						{#each cases as c, i}
							<li>
								<button
									type="button"
									class:on={i === index}
									class:done={i < index}
									aria-current={i === index ? 'step' : undefined}
									onclick={() => go(i)}
								>
									<span class="dot" aria-hidden="true"></span>
									<small>{pad(i + 1)}</small>
									<i class="c-icon fa-brands {icons[c.platform]}" aria-hidden="true"></i>
									<span class="c-name">{c.name}</span>
									<span class="c-type">· {c.type}</span>
								</button>
							</li>
						{/each}
					</ol>
					<span class="cue" class:gone={index === N - 1} aria-hidden="true">
						Scroll <i class="fa-solid fa-arrow-down"></i>
					</span>
				</nav>
				</div>
			</div>

			<div class="stage" bind:clientWidth={stageW} bind:clientHeight={stageH}>
				<div class="frame" class:measured style="width: {measured ? `${frameW}px` : '100%'}">
					<div class="chrome">
						<span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
						<span class="swap fade url">
							{#each cases as c, i}
								<span class={phase(i)} aria-hidden={i !== index}>
									<i class="fa-brands {icons[c.platform]}"></i>
									{c.url.pre}{#if c.url.blur}<em>{c.url.blur}</em>{/if}{c.url.post ?? ''}
								</span>
							{/each}
						</span>
					</div>
					<div class="viewport" style={measured ? `height: ${availH}px` : ''}>
						{#each cases as c, i}
							<div
								class="body {phase(i)}"
								style="width: {widthOf(i)}px; --s: {scales[i]}; min-height: {measured && !measuring ? `${availH / scales[i]}px` : '0'}"
								bind:this={bodies[i]}
								inert={i !== index}
								aria-hidden={i !== index}
							>
								<c.visual {...c.props ?? {}} active={i === index} phone={stacked} />
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.results,
	.results * { box-sizing: border-box; }

	.results {
		--step: 100vh;
		--ease: cubic-bezier(0.2, 0.7, 0.1, 1);
		--in: 0.75s;
		--out: 0.38s;

		position: relative;
		z-index: 1;
		height: calc(100svh + (var(--n) - 1) * var(--step));
	}

	/* The sticky stage: one screen tall, under the fixed nav. */
	.pin {
		position: sticky;
		top: 0;
		height: 100vh;
		height: 100svh;
		display: flex;
		flex-direction: column;
		padding: clamp(4.75rem, 11vh, 6.5rem) clamp(1.25rem, 4vw, 3rem) clamp(1.25rem, 4vh, 2.75rem);
	}
	.layout {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
		/* Rows must not grow with the window, or it could never scale to fit. */
		grid-template-rows: minmax(0, 1fr);
		gap: clamp(2rem, 4vw, 4.5rem);
		width: 100%;
		max-width: 1500px;
		margin: 0 auto;
	}

	/* Glow behind the window: slides between sides per case, and blushes
	   Instagram pink on Instagram cases. */
	.glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.glow span {
		position: absolute;
		top: 18%;
		right: 2%;
		width: 62%;
		height: 70%;
		border-radius: 50%;
		filter: blur(80px);
		transform: translateX(var(--gx));
		transition: transform 1.4s var(--ease), opacity 1s;
	}
	.g-hot { background: radial-gradient(closest-side, rgba(255, 50, 0, 0.12), transparent); }
	.g-ig { background: radial-gradient(closest-side, rgba(214, 41, 118, 0.1), transparent); opacity: 0; }
	.g-ig.on { opacity: 1; }

	/* ── Swapping slots: every case renders into one grid cell; only the
	   active one is shown. Past cases exit upward, upcoming ones wait below,
	   so scrolling back plays everything in reverse. ── */
	.swap { display: grid; margin: 0; }
	.swap > * {
		grid-area: 1 / 1;
		transition:
			transform var(--out) var(--ease),
			opacity var(--out),
			filter var(--out),
			visibility 0s var(--out);
	}
	.swap > :not(.on) { visibility: hidden; opacity: 0; }
	.swap > .on {
		transition:
			transform var(--in) var(--ease) var(--d, 0.1s),
			opacity var(--in) var(--d, 0.1s),
			filter var(--in) var(--d, 0.1s),
			visibility 0s;
	}

	/* fade: soft blur + drift */
	.fade > .next { transform: translateY(14px); filter: blur(8px); }
	.fade > .past { transform: translateY(-14px); filter: blur(8px); }

	/* roll: odometer through a clip */
	.roll { clip-path: inset(-0.3em -1em -0.15em -1em); }
	.roll > .next { transform: translateY(115%); }
	.roll > .past { transform: translateY(-115%); }

	/* ── Copy column ── */
	.copy {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: 0;
		container-type: inline-size;
	}
	.copy-in { display: flex; flex-direction: column; gap: clamp(0.9rem, 2.6vh, 1.6rem); }

	.eyebrow-row { display: flex; align-items: center; gap: 1rem; }
	.eyebrow {
		margin: 0;
		font-family: var(--font-display);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
		white-space: nowrap;
	}
	.rule { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.05)); }
	.count {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		font-family: var(--font-display);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.count .swap { font-size: 1.05rem; color: #fff; }
	.count small { font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); letter-spacing: 0.1em; }

	.tag {
		font-size: 0.9rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
	}
	.tag span { display: flex; align-items: center; gap: 0.65rem; }
	.tag i { font-size: 1rem; color: rgba(255, 255, 255, 0.6); }
	.tag .type { margin-left: -0.3rem; color: rgba(255, 255, 255, 0.45); font-weight: 400; }

	.headline {
		--d: 0.1s;
		font-family: var(--font-display);
		font-weight: 600;
		/* Sized to the column, so the longest line ("2.3× the views.") fits. */
		font-size: clamp(1.7rem, min(11cqi, 8vh), 4.2rem);
		line-height: 1.02;
		letter-spacing: -0.01em;
		color: #fff;
	}
	/* The whole headline swaps instantly; its lines do the motion. */
	.headline > .h { display: flex; flex-direction: column; align-items: flex-start; transition: visibility 0s var(--out); }
	.headline > .h.on { transition: visibility 0s; }
	.headline > :not(.on) { opacity: 1; }
	/* The clip reaches well past the line so the hot glow isn't cut into a box;
	   lines travel twice their height to clear it, fading as they go. */
	.mask { display: block; clip-path: inset(-0.3em -1em -0.3em -1em); }
	.line {
		display: inline-block;
		transition: transform var(--out) var(--ease), opacity var(--out);
	}
	.h:not(.on) .line { opacity: 0; }
	.h.next .line { transform: translateY(200%); }
	.h.past .line { transform: translateY(-200%); }
	.h.on .line { transition: transform 0.9s var(--ease) 0.12s, opacity 0.5s 0.12s; }
	.h.on .mask + .mask .line { transition-delay: 0.22s; }
	.hot { color: var(--accent); }

	.sub {
		--d: 0.3s;
		max-width: 30rem;
		font-size: clamp(0.95rem, 1.2vw, 1.1rem);
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.68);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		margin: 0;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
	}
	.stat {
		--d: calc(0.32s + var(--k) * 0.07s);
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: clamp(0.8rem, 2vh, 1.2rem) 1rem;
		min-width: 0;
	}
	.stat + .stat { border-left: 1px solid rgba(255, 255, 255, 0.14); }
	/* Value first visually (aligned across cells), label underneath. */
	.stat dd { order: -1; }
	.stat dt {
		font-family: var(--font-display);
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.5);
	}
	.stat dd {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(1.3rem, 2.1vw, 2rem);
		line-height: 1;
		white-space: nowrap;
	}

	/* ── Chapter rail ── */
	.chapters {
		position: relative;
		display: flex;
		flex-direction: column;
		margin-top: clamp(0rem, 1.5vh, 1rem);
		--row: 2.5rem;
	}
	.chapters ol { margin: 0; padding: 0; list-style: none; }
	/* Runs from the first dot to the last; the fill tip sits on the active dot. */
	.rail {
		position: absolute;
		left: 4px;
		top: calc(var(--row) / 2);
		height: calc(var(--row) * (var(--n) - 1));
		width: 1px;
		background: rgba(255, 255, 255, 0.15);
	}
	.rail i {
		position: absolute;
		inset: 0;
		background: var(--accent);
		transform-origin: top;
		transform: scaleY(var(--p));
	}
	.chapters button {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		height: var(--row);
		padding: 0;
		border: 0;
		background: none;
		font-size: 0.85rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		transition: color 0.3s;
	}
	.chapters button:hover { color: rgba(255, 255, 255, 0.8); }
	.chapters button.on { color: #fff; }
	.chapters button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
	.chapters small { font-size: 0.62rem; letter-spacing: 0.1em; opacity: 0.7; }
	.chapters .c-icon { width: 1.1em; margin-right: -0.35rem; text-align: center; font-size: 0.85rem; opacity: 0.6; }
	.chapters .c-type { margin-left: -0.5rem; font-weight: 400; opacity: 0.55; }
	.chapters .dot {
		position: relative;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.35);
		background: #000;
		transition: background 0.3s, border-color 0.3s, transform 0.4s var(--ease);
	}
	.chapters .done .dot { background: var(--accent); border-color: var(--accent); }
	.chapters .on .dot { background: #fff; border-color: #fff; transform: scale(1.2); }
	.cue {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-left: 1.6rem;
		font-family: var(--font-display);
		font-size: 0.6rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.4);
		transition: opacity 0.4s;
	}
	.cue i { font-size: 0.7rem; animation: nudge 1.8s ease-in-out infinite; }
	.cue.gone { opacity: 0; }
	@keyframes nudge {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(4px); }
	}

	/* ── Window ── */
	.stage {
		position: relative;
		min-width: 0;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.frame {
		position: relative;
		max-width: 100%;
		/* Window palette (--w-*) comes from the page. */
		border: 1px solid var(--w-line-strong);
		border-radius: 8px;
		overflow: hidden;
		background: var(--w-bg);
		box-shadow: 0 40px 120px -30px rgba(0, 0, 0, 0.9);
	}
	.frame.measured { transition: width 0.8s var(--ease); }
	.chrome {
		display: flex;
		align-items: center;
		height: 41px;
		padding: 0 1rem;
		background: var(--w-chrome);
		border-bottom: 1px solid var(--w-line);
	}
	.lights { display: flex; gap: 0.5rem; }
	.lights i { width: 9px; height: 9px; border-radius: 50%; background: var(--w-line-strong); }
	.url {
		--d: 0.1s;
		flex: 1;
		justify-items: center;
		min-width: 0;
		margin-right: calc(27px + 1rem); /* balances the lights so the bar is centred */
	}
	.url span {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 100%;
		padding: 0.3rem 1.25rem;
		border-radius: 4px;
		background: var(--w-raised);
		font-family: var(--w-font);
		font-size: 0.75rem;
		color: var(--w-sub);
		white-space: nowrap;
		overflow: hidden;
	}
	.url i { font-size: 0.8rem; }
	.url em { font-style: normal; filter: blur(3px); }

	.viewport {
		position: relative;
		overflow: hidden;
		transition: height 0.8s var(--ease);
	}
	/* Bodies are laid out at the stage width and scaled to fit. The active
	   one sets the viewport height; the rest sit on top, out of focus. */
	.body {
		position: absolute;
		top: 0;
		left: 50%;
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		transform-origin: 50% 0;
		transform: translateX(-50%) scale(var(--s));
		transition:
			transform var(--out) var(--ease),
			opacity var(--out),
			filter var(--out),
			visibility 0s var(--out);
	}
	.body.next { opacity: 0; visibility: hidden; filter: blur(14px); transform: translateX(-50%) translateY(40px) scale(calc(var(--s) * 1.03)); }
	.body.past { opacity: 0; visibility: hidden; filter: blur(14px); transform: translateX(-50%) translateY(-40px) scale(calc(var(--s) * 0.97)); }
	.body.on {
		transition:
			transform 0.9s var(--ease) 0.15s,
			opacity 0.6s 0.15s,
			filter 0.7s 0.15s,
			visibility 0s;
	}
	/* The visual fills its body, so it stretches to the window height. */
	.body > :global(*) { flex: 1; }
	/* Before JS has measured anything, let the first body size the window. */
	.frame:not(.measured) .body.on { position: relative; left: 0; transform: none; }

	/* ── Narrow screens: copy on top, window fills what's left. ── */
	@media (max-width: 960px) {
		.layout { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); gap: 1.1rem; }
		.copy { justify-content: flex-start; }
		.copy-in { gap: 0.75rem; }
		.headline { font-size: clamp(1.7rem, min(10cqi, 5vh), 3.2rem); }
		.sub { font-size: 0.9rem; line-height: 1.45; }
		.stat { padding: 0.65rem 0.75rem; gap: 0.3rem; }
		.stat dt { font-size: 0.52rem; letter-spacing: 0.12em; }
		.stat dd { font-size: clamp(1rem, 4.4vw, 1.5rem); }
		/* Chapter rail becomes a thin progress bar above the eyebrow; each
		   third is a tap target for its case. */
		.chapters { order: -1; margin: 0; --row: auto; }
		.chapters ol { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 4px; }
		.chapters button { width: 100%; height: 1.25rem; }
		.chapters button > * { display: none; }
		.chapters button::after {
			content: '';
			display: block;
			width: 100%;
			height: 2px;
			background: rgba(255, 255, 255, 0.15);
		}
		.chapters .done::after { background: var(--accent); }
		.chapters .on::after { background: #fff; }
		.rail { display: none; }
		.cue { display: none; }
		.eyebrow-row .rule { display: none; }
		.eyebrow-row { justify-content: space-between; }
	}
	@media (max-width: 600px) {
		.lights { display: none; }
		.url { margin-right: 0; }
		.url span { padding: 0.3rem 0.75rem; font-size: 0.68rem; }
	}
	/* Short phones: the window repeats the stat numbers, so it gets their room. */
	@media (max-width: 960px) and (max-height: 700px) {
		.sub { display: none; }
		.stats { display: none; }
	}

	@media (prefers-reduced-motion: reduce) {
		.swap > *,
		.line,
		.body,
		.frame.measured,
		.viewport,
		.glow span { transition: none !important; }
		.cue i { animation: none; }
	}
</style>
