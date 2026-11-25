<script>
	import Seo from '$lib/components/Seo.svelte';
	import LandingShell from '$lib/components/landing/LandingShell.svelte';
	import ResultsCases from '$lib/components/landing/ResultsCases.svelte';
	import Process from '$lib/components/landing/Process.svelte';
	import Faq from '$lib/components/landing/Faq.svelte';
	import Closing from '$lib/components/landing/Closing.svelte';
	import { snapSection } from '$lib/components/landing/snap-scroll.js';

	function track(name) {
		window.umami?.track('landing-cta', { name });
	}
</script>

<Seo
	full="DONCEZART | Video Editor, Creative Director & Content Strategist"
	description="Editing, creative direction and content strategy for creators and brands who want videos people can't skip."
/>

<LandingShell toTop>
	<main>
		<section class="hero" use:snapSection>
			<div class="hero-inner">
				<h1>
					<span class="line reveal" style="--d: 0">Content people</span>
					<span class="line hot reveal" style="--d: 1">can't skip.</span>
				</h1>

				<p class="pitch reveal" style="--d: 2">
					Editing, creative direction and strategy for creators and brands who are done posting into the
					void. I turn your ideas into videos that hold attention, grow channels and sell.
				</p>

				<div class="ctas reveal" style="--d: 3">
					<a href="/contact" class="btn btn-primary" onclick={() => track('hero-fix')}>
						Let's fix your content <i class="fa-solid fa-arrow-right"></i>
					</a>
				</div>

				<a href="/designer" class="aside reveal" style="--d: 4" onclick={() => track('hero-designers')}>
					<span>Here for design assets and free tools?</span>
					<strong>Go to the designer side <i class="fa-solid fa-arrow-right"></i></strong>
				</a>
			</div>

			<a href="#results" class="scroll-cue" onclick={() => track('hero-scroll')}>
				<span>Scroll for results</span>
				<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
			</a>
		</section>

		<ResultsCases />
		<Process />
		<Faq />
		<Closing />
	</main>

</LandingShell>

<style>
	.hero,
	.hero *,
	.hero *::before,
	.hero *::after { box-sizing: border-box; }

	/* ── Hero ── */
	.hero {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		min-height: 100svh;
		display: grid;
		place-items: center;
		padding: 6.5rem clamp(1.25rem, 4vw, 3rem) 7rem;
	}
	/* Dynamic blur: the hero drifts out of focus as you scroll past it. */
	.hero-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		width: 100%;
		max-width: 1200px;
		opacity: calc(1 - var(--s) * 0.85);
		transform: translateY(calc(var(--s) * -48px)) scale(calc(1 - var(--s) * 0.05));
		will-change: transform, opacity;
	}
	/* Only blur once scrolling starts: any filter on this wrapper (even
	   blur(0)) would stop the glass panels inside it from blurring the embers. */
	:global(.page.scrolled) .hero-inner { filter: blur(calc(var(--s) * 14px)); }
	/* Re-blurring a full-screen block on every scroll frame is too heavy for
	   phones: there it only fades and drifts. */
	@media (pointer: coarse) {
		:global(.page.scrolled) .hero-inner { filter: none; }
	}


	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.4rem, min(6.2vw, 11vh), 6rem);
		line-height: 1.02;
		letter-spacing: -0.01em;
		color: #fff;
	}
	.line { display: block; }
	/* One accent, used sparingly: the payoff line. */
	.hot { color: var(--accent); }

	.pitch {
		max-width: 40rem;
		margin: 2rem 0 0;
		font-size: clamp(1.02rem, 1.4vw, 1.2rem);
		line-height: 1.6;
		color: var(--muted);
	}

	.ctas {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		margin-top: 2.25rem;
	}

	/* Side door for designers: deliberately quieter than the CTAs. */
	.aside {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem 0.75rem;
		margin-top: 3rem;
		padding: 0.8rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		font-size: 0.92rem;
		color: var(--muted);
		text-decoration: none;
		transition: border-color 0.2s, background 0.2s;
	}
	.aside strong { display: inline-flex; align-items: center; gap: 0.45rem; font-weight: 600; color: #fff; }
	.aside i { font-size: 0.8em; color: var(--accent); transition: transform 0.2s; }
	.aside:hover { border-color: rgba(255, 255, 255, 0.35); background: rgba(255, 255, 255, 0.05); }
	.aside:hover i { transform: translateX(3px); }

	.scroll-cue {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		font-family: var(--font-display);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		/* Trailing letter-spacing would push the label off-centre. */
		margin-right: -0.24em;
		text-transform: uppercase;
		white-space: nowrap;
		opacity: calc(1 - var(--s) * 3);
		transition: color 0.2s;
	}
	.scroll-cue:hover { color: #fff; }
	.scroll-cue i {
		margin-right: 0.24em;
		font-size: 1rem;
		color: var(--accent);
		animation: bob 1.8s ease-in-out infinite;
	}
	@keyframes bob {
		0%, 100% { transform: translateY(0); opacity: 1; }
		50% { transform: translateY(7px); opacity: 0.55; }
	}

	@media (max-width: 560px) {
		h1 { font-size: clamp(2.3rem, 11.5vw, 4rem); }
		.ctas { flex-direction: column; width: 100%; }
		.ctas .btn { width: 100%; }
		.aside { margin-top: 2.25rem; font-size: 0.85rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.scroll-cue i { animation: none; }
		.hero-inner { filter: none; transform: none; }
	}
</style>
