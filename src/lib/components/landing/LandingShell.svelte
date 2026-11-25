<script>
	// The frame every public page shares: ember background, grain, the
	// navbar, the colour/window tokens and the shared building blocks (.btn,
	// .reveal, the l-* section type). Pages render inside it.
	import { onMount } from 'svelte';
	import EmberBackground from './EmberBackground.svelte';
	import { scrollToY } from './snap-scroll.js';
	import Navbar from '../Navbar.svelte';
	import { page } from '$app/state';

	// `cta` swaps the navbar's button (the designer side points at the tools).
	let {
		cta = undefined,
		// Show the back-to-top button once you've scrolled past the first screen.
		toTop = false,
		children
	} = $props();

	// 0 at the top, 1 once the page has scrolled ~70% of the viewport. Pages
	// can read it as the --s custom property (and .page.scrolled).
	let scroll = $state(0);
	let scrolled = $derived(scroll > 0.02);
	let showTop = $derived(toTop && scroll >= 0.86); // ~60% of a screen down

	onMount(() => {
		const onScroll = () => {
			scroll = Math.min(1, window.scrollY / (window.innerHeight * 0.7));
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	const track = (name) => window.umami?.track('landing-cta', { name });
</script>

<div class="page" class:scrolled style="--s: {scroll}">
	<EmberBackground {scroll} />
	<div class="grain" aria-hidden="true"></div>

	<Navbar discoverySections={page.data.discoverySections ?? []} {scrolled} {cta} />

	{@render children()}

	{#if toTop}
		<button
			type="button"
			class="to-top"
			class:shown={showTop}
			aria-label="Back to top"
			title="Back to top"
			onclick={() => {
				track('to-top');
				scrollToY(0);
			}}
		>
			<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
		</button>
	{/if}
</div>

<style>
	.page *,
	.page *::before,
	.page *::after { box-sizing: border-box; }

	.page {
		--accent: #ff2b1f;
		--line: rgba(255, 255, 255, 0.12);
		--muted: rgba(255, 255, 255, 0.68);

		/* Shared window palette: the Results windows and the message thread
		   all draw with these, so every window uses the same greys, type and
		   corners. Platform colours are kept for data only. */
		--w-bg: #0f0f0f;
		--w-chrome: #161616;
		--w-raised: #1b1b1b;
		--w-raised-2: #2a2a2a;
		--w-line: rgba(255, 255, 255, 0.08);
		--w-line-strong: rgba(255, 255, 255, 0.16);
		--w-text: #f1f1f1;
		--w-sub: #a0a0a0;
		--w-muted: #6e6e6e;
		--w-up: #2ba640;
		--w-font: Roboto, 'Helvetica Neue', Arial, sans-serif;
		--w-radius: 10px;

		position: relative;
		min-height: 100vh;
		color: #fff;
		background: #000;
		font-family: var(--font-body);
		overflow-x: clip;
	}

	/* Second grain layer above the UI, so even the type and glow pick up
	   the speckle the way the avatar's lettering does. */
	.grain {
		position: fixed;
		inset: -50%;
		z-index: 50;
		pointer-events: none;
		opacity: 0.06;
		mix-blend-mode: overlay;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	/* Touch devices: no overlay grain. A full-screen blend layer has to be
	   recomposited every frame the embers or the page move, which is what made
	   phones stutter while scrolling; the shader already draws its own grain. */
	/* Touch devices: no backdrop blur anywhere (glass panels keep their tinted
	   backgrounds). Each blurred element is re-blurred whenever the embers or
	   the page move, and the tall ones (the YouTube card guide runs ~8000px)
	   are more than phone GPUs can hold. Android phones never had these
	   blurs anyway: until the declarations were reordered, the CSS minifier
	   kept only the -webkit- version, which Chrome ignores. */
	@media (pointer: coarse) {
		.grain { display: none; }
		.page :global(*) {
			-webkit-backdrop-filter: none !important;
			backdrop-filter: none !important;
		}
	}

	/* ── Buttons: solid and plain; hover just warms to the accent. Global so
	   the section components share them. ── */
	.page :global(.btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.95rem 1.6rem;
		border-radius: 4px;
		font-weight: 600;
		font-size: 0.95rem;
		text-decoration: none;
		color: #000;
		background: #fff;
		border: 1px solid #fff;
		transition: color 0.2s, background 0.2s, border-color 0.2s;
	}
	.page :global(.btn-ghost) {
		color: #fff;
		background: rgba(0, 0, 0, 0.35);
		border-color: rgba(255, 255, 255, 0.28);
		-webkit-backdrop-filter: blur(14px);
		backdrop-filter: blur(14px);
	}
	.page :global(.btn-sm) { padding: 0.55rem 1rem; font-size: 0.85rem; }
	.page :global(.btn:hover) { color: #fff; background: var(--accent); border-color: var(--accent); }
	.page :global(.btn i) { font-size: 0.85em; transition: transform 0.25s; }
	.page :global(.btn:hover i) { transform: translateX(4px); }

	/* ── Sections after Results: shared shell and type (l- prefix so they
	   can't clash with component class names). ── */
	.page :global(.l-sec),
	.page :global(.l-sec *),
	.page :global(.l-sec *::before),
	.page :global(.l-sec *::after) { box-sizing: border-box; }
	.page :global(.l-sec) {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: clamp(4.75rem, 11vh, 6.5rem) clamp(1.25rem, 4vw, 3rem) clamp(1.25rem, 4vh, 2.75rem);
	}
	.page :global(.l-sec > *) { width: 100%; max-width: 1500px; margin-inline: auto; }
	.page :global(.l-eyebrow-row) { display: flex; align-items: center; gap: 1rem; }
	.page :global(.l-eyebrow) {
		margin: 0;
		font-family: var(--font-display);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
		white-space: nowrap;
	}
	.page :global(.l-rule) { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.05)); }
	.page :global(.l-title) {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2rem, min(3.9vw, 7.5vh), 3.75rem);
		line-height: 1.02;
		letter-spacing: -0.01em;
		color: #fff;
	}
	.page :global(.l-title .l-hot) { display: block; }
	.page :global(.l-hot) { color: var(--accent); }
	.page :global(.l-lede) {
		margin: 0;
		max-width: 30rem;
		font-size: clamp(0.95rem, 1.2vw, 1.1rem);
		line-height: 1.55;
		color: var(--muted);
	}
	.page :global(.l-link) {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		align-self: flex-start;
		font-size: 0.92rem;
		font-weight: 600;
		color: #fff;
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.25);
		padding-bottom: 0.2rem;
		transition: border-color 0.2s;
	}
	.page :global(.l-link i) { font-size: 0.8em; color: var(--accent); transition: transform 0.2s; }
	.page :global(.l-link:hover) { border-color: var(--accent); }
	.page :global(.l-link:hover i) { transform: translateX(3px); }

	/* Reveal on first view (see reveal.js), same lens-rack as the hero. */
	.page :global(.l-wait .l-r) { opacity: 0; filter: blur(10px); transform: translateY(14px); }
	.page :global(.l-in .l-r) {
		transition:
			opacity 0.9s cubic-bezier(0.2, 0.7, 0.1, 1),
			filter 0.9s cubic-bezier(0.2, 0.7, 0.1, 1),
			transform 0.9s cubic-bezier(0.2, 0.7, 0.1, 1);
		transition-delay: calc(0.1s + var(--d, 0) * 0.09s);
	}

	/* ── Load-in: blocks pull into focus like a lens racking (add .reveal
	   and a --d stagger index). ── */
	.page :global(.reveal) {
		animation: l-focus 1.1s cubic-bezier(0.2, 0.7, 0.1, 1) both;
		animation-delay: calc(0.15s + var(--d, 0) * 0.12s);
	}
	@keyframes -global-l-focus {
		from { opacity: 0; filter: blur(10px); transform: translateY(12px); }
		to { opacity: 1; filter: none; transform: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.page :global(.reveal) { animation: none; }
	}
	/* Touch devices: fade and rise only, no blur. Blurring a tall block (a
	   tool's whole editor is ~4000 device px high on a phone), with blurred
	   panels inside it, crashed the GPU on some Android phones and left the
	   screen black; it's also the costliest frame of the load-in. */
	@keyframes -global-l-rise {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: none; }
	}
	@media (pointer: coarse) {
		.page :global(.reveal) { animation-name: l-rise; }
		.page :global(.l-wait .l-r) { filter: none; }
	}

	/* ── Back to top ── square, same corners as .btn. Solid background (no
	   backdrop blur) so it costs nothing while the page scrolls. ── */
	.to-top {
		position: fixed;
		right: clamp(1rem, 2.5vw, 1.75rem);
		bottom: clamp(1rem, 2.5vw, 1.75rem);
		z-index: 45;
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		padding: 0;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.22);
		background: #0b0b0b;
		color: #fff;
		font-size: 0.9rem;
		cursor: pointer;
		opacity: 0;
		visibility: hidden;
		transform: translateY(8px);
		transition: opacity 0.25s, transform 0.25s, visibility 0s 0.25s, background 0.2s, border-color 0.2s;
	}
	.to-top.shown { opacity: 1; visibility: visible; transform: none; transition: opacity 0.25s, transform 0.25s, background 0.2s, border-color 0.2s; }
	.to-top:hover { background: var(--accent); border-color: var(--accent); }
	/* Phones: hidden while the Results stage is pinned (it would cover the window). */
	@media (max-width: 960px) {
		:global(html.results-pinned) .to-top.shown { opacity: 0; visibility: hidden; }
	}
	.to-top:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

</style>
