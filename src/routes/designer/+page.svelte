<script>
	import Seo from '$lib/components/Seo.svelte';
	// The designer side: free tools, the reference library and the community.
	// Same shell, type and stepped scroll as the client landing page; the ask
	// here is "use it and join", not "hire me".
	import { onMount } from 'svelte';
	import LandingShell from '$lib/components/landing/LandingShell.svelte';
	import SiteFooter from '$lib/components/landing/SiteFooter.svelte';
	import { snapSection } from '$lib/components/landing/snap-scroll.js';
	import { inview } from '$lib/components/landing/reveal.js';
	import ToolGrid from '$lib/components/landing/ToolGrid.svelte';

	let { data } = $props();

	const DISCORD = 'https://discord.gg/aJUAyFVyqM';
	const cta = { href: '#tools', label: 'Open the tools', track: 'designer-nav-tools' };

	const servers = [
		{
			name: 'Nitro Design',
			kind: 'Community server',
			text: 'Share work, find clients and ask other designers for advice.',
			href: 'https://discord.gg/CyMGumJjkp'
		},
		{
			name: 'DONCEZART',
			kind: 'My server',
			text: 'Where I give feedback directly and post new tools first.',
			href: DISCORD
		}
	];

	const library = $derived(data.library ?? []);
	const featured = $derived(library.find((s) => s.covers.length) ?? null);
	const total = $derived(library.reduce((n, s) => n + s.count, 0));

	// Library clips only play while they're on screen.
	let mosaic = $state();
	onMount(() => {
		if (!mosaic || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const vids = [...mosaic.querySelectorAll('video')];
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause();
			},
			{ threshold: 0.25 }
		);
		vids.forEach((v) => io.observe(v));
		return () => io.disconnect();
	});

	const track = (name) => window.umami?.track('designer-cta', { name });
</script>

<Seo
	title="For designers"
	description="Free design tools and a curated reference library for designers. No sign-up, no watermarks."
	image="/og/designer.png"
/>

<LandingShell {cta} toTop>
	<main>
		<!-- ── Hero ── -->
		<section class="hero" use:snapSection>
			<div class="hero-inner">
				<p class="kicker reveal" style="--d: 0">For designers</p>
				<h1>
					<span class="line reveal" style="--d: 0">Steal my</span>
					<span class="line hot reveal" style="--d: 1">workflow.</span>
				</h1>
				<p class="pitch reveal" style="--d: 2">
					The tools I built for my own client work and the references I keep coming back to. Free, no
					sign-up, no watermarks.
				</p>
				<div class="ctas reveal" style="--d: 3">
					<a href="#tools" class="btn" onclick={() => track('hero-tools')}>
						Open the tools <i class="fa-solid fa-arrow-down"></i>
					</a>
				</div>
				<a href="/" class="aside reveal" style="--d: 4" onclick={() => track('hero-clients')}>
					<span>Need an editor or creative director?</span>
					<strong>Go to the client side <i class="fa-solid fa-arrow-right"></i></strong>
				</a>
			</div>
		</section>

		<!-- ── Tools ── -->
		<section id="tools" class="l-sec tools" use:snapSection use:inview>
			<div class="l-eyebrow-row l-r" style="--d: 0">
				<p class="l-eyebrow">Free tools</p>
				<span class="l-rule"></span>
			</div>
			<div class="head">
				<h2 class="l-title l-r" style="--d: 1">Built for my work.<span class="l-hot">Yours to use.</span></h2>
				<p class="l-lede l-r" style="--d: 2">
					Small utilities that save me an hour a week. They run in your browser and export clean files you can
					drop straight into a deck or a moodboard.
				</p>
			</div>

			<ToolGrid reveal="l-r" stagger={3} track={(n) => track(n)} />
		</section>

		<!-- ── Library ── -->
		<section id="library" class="l-sec library" use:snapSection use:inview>
			<div class="l-eyebrow-row l-r" style="--d: 0">
				<p class="l-eyebrow">Discovery library</p>
				<span class="l-rule"></span>
			</div>
			<div class="lib">
				<div class="lib-copy">
					<h2 class="l-title l-r" style="--d: 1">References<span class="l-hot">worth stealing.</span></h2>
					<p class="l-lede l-r" style="--d: 2">
						Every clip, artwork and guide I save while working, sorted so you can find the one you need in a
						minute instead of an evening of scrolling.
					</p>
					<ul class="shelves l-r" style="--d: 3">
						{#each library as s}
							<li>
								<a href="/discovery/{s.slug}" class:empty={!s.count} onclick={() => track(`library-${s.slug}`)}>
									<span class="s-name">{s.name}</span>
									<span class="s-desc">{s.description ?? ''}</span>
									<span class="s-count">{s.count ? s.count : 'Soon'}</span>
								</a>
							</li>
						{/each}
					</ul>
					<a href="/discovery" class="l-link l-r" style="--d: 4" onclick={() => track('library-all')}>
						Browse the library{total ? ` (${total} saved)` : ''} <i class="fa-solid fa-arrow-right"></i>
					</a>
				</div>

				{#if featured}
					<a href="/discovery/{featured.slug}" class="mosaic l-r" style="--d: 2" bind:this={mosaic} aria-label="Open {featured.name}">
						{#each featured.covers as c}
							<figure>
								{#if c.kind === 'video'}
									<video src="{c.src}#t=0.1" poster={c.poster ?? undefined} muted loop playsinline preload="metadata"></video>
								{:else}
									<img src={c.src} alt="" loading="lazy" />
								{/if}
							</figure>
						{/each}
						<span class="tag">{featured.name} · {featured.count} saved</span>
					</a>
				{/if}
			</div>
		</section>

		<!-- ── Community + footer ── -->
		<section id="community" class="l-sec community" use:snapSection use:inview>
			<div class="ask">
				<p class="l-eyebrow l-r" style="--d: 0">Community</p>
				<h2 class="big l-r" style="--d: 1">Don't design<span class="l-hot">alone.</span></h2>
				<p class="l-lede l-r" style="--d: 2">
					Post a work in progress, get honest feedback, find your next reference. Two servers, depending on what
					you're after.
				</p>
				<div class="servers">
					{#each servers as s, i}
						<a
							href={s.href}
							target="_blank"
							rel="noopener noreferrer"
							class="server l-r"
							style="--d: {3 + i}"
							onclick={() => window.umami?.track('discord-join', { server: s.name, page: 'designer' })}
						>
							<i class="fa-brands fa-discord" aria-hidden="true"></i>
							<span class="srv-text">
								<span class="srv-kind">{s.kind}</span>
								<b>{s.name}</b>
								<span class="srv-desc">{s.text}</span>
							</span>
							<span class="join">Join <i class="fa-solid fa-arrow-up-right-from-square"></i></span>
						</a>
					{/each}
				</div>
			</div>
			<SiteFooter
				links={[
					{ href: '/', label: 'Hire me' },
					{ href: '/tools', label: 'All tools' },
					{ href: '/discovery', label: 'Library' },
					{ href: '/socials', label: 'Socials' },
					{ href: '/privacy', label: 'Privacy' }
				]}
			/>
		</section>
	</main>
</LandingShell>

<style>
	.hero,
	.hero *,
	.hero *::before,
	.hero *::after { box-sizing: border-box; }

	/* ── Hero (mirrors the client landing hero) ── */
	.hero {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		min-height: 100svh;
		display: grid;
		place-items: center;
		padding: 6.5rem clamp(1.25rem, 4vw, 3rem) 5rem;
	}
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
	:global(.page.scrolled) .hero-inner { filter: blur(calc(var(--s) * 14px)); }
	/* Re-blurring a full-screen block on every scroll frame is too heavy for
	   phones: there it only fades and drifts. */
	@media (pointer: coarse) {
		:global(.page.scrolled) .hero-inner { filter: none; }
	}
	.kicker {
		margin: 0 0 1.5rem;
		font-family: var(--font-display);
		font-size: 0.75rem;
		letter-spacing: 0.24em;
		margin-right: -0.24em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.6);
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.4rem, min(6.2vw, 11vh), 6rem);
		line-height: 1.02;
		letter-spacing: -0.01em;
	}
	.line { display: block; }
	.hot { color: var(--accent); }
	.pitch {
		max-width: 40rem;
		margin: 2rem 0 0;
		font-size: clamp(1.02rem, 1.4vw, 1.2rem);
		line-height: 1.6;
		color: var(--muted);
	}
	.ctas { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin-top: 2.25rem; }
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

	/* ── Shared section head ── */
	.head {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: end;
		gap: 1.5rem 3rem;
		margin: clamp(1.25rem, 3vh, 2rem) auto clamp(1.5rem, 4vh, 2.5rem);
	}

	/* ── Tools ── */

	/* ── Library ── */
	.lib {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		gap: clamp(2rem, 5vw, 4.5rem);
		align-items: center;
		margin-top: clamp(1.25rem, 3vh, 2rem);
	}
	.lib-copy { display: flex; flex-direction: column; gap: clamp(1rem, 2.6vh, 1.5rem); }
	.shelves { list-style: none; margin: 0.25rem 0 0; padding: 0; border-top: 1px solid var(--line); }
	.shelves a {
		display: grid;
		grid-template-columns: 8.5rem 1fr auto;
		align-items: baseline;
		gap: 1rem;
		padding: 0.8rem 0.25rem;
		border-bottom: 1px solid var(--line);
		color: #fff;
		text-decoration: none;
		transition: background 0.2s, padding 0.2s;
	}
	.shelves a:hover { background: rgba(255, 255, 255, 0.04); padding-inline: 0.6rem; }
	.s-name { font-weight: 600; font-size: 0.95rem; }
	.s-desc { font-size: 0.85rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.s-count { font-family: var(--font-display); font-size: 0.8rem; color: var(--accent); }
	.shelves a.empty .s-count { color: rgba(255, 255, 255, 0.4); letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.68rem; }

	.mosaic {
		position: relative;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.6rem;
		padding: 0.6rem;
		border: 1px solid var(--w-line-strong);
		border-radius: var(--w-radius);
		background: rgba(14, 14, 14, 0.55);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		text-decoration: none;
	}
	.mosaic figure {
		margin: 0;
		aspect-ratio: 9 / 16;
		max-height: 62vh;
		border-radius: 6px;
		overflow: hidden;
		background: var(--w-raised);
	}
	/* Staggered columns that stay inside the frame; the gap under the odd
	   ones holds the label. */
	.mosaic figure:nth-child(odd) { margin-bottom: 2.4rem; }
	.mosaic figure:nth-child(even) { margin-top: 2.4rem; }
	.mosaic video,
	.mosaic img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s; }
	.mosaic:hover video,
	.mosaic:hover img { transform: scale(1.04); }
	.tag {
		position: absolute;
		left: 0.6rem;
		bottom: 0.6rem;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
	}

	/* ── Community: last screen, footer pinned to the bottom ── */
	.community { justify-content: space-between; padding-bottom: 0; }
	.ask {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(1rem, 2.8vh, 1.75rem);
		text-align: center;
		padding: 2rem 0;
	}
	.big {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.4rem, min(6.2vw, 11vh), 6rem);
		line-height: 1.02;
		letter-spacing: -0.01em;
	}
	.big :global(.l-hot) { display: block; }
	.ask .l-lede { max-width: 34rem; }
	.servers {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		width: 100%;
		max-width: 52rem;
		margin-top: 0.5rem;
		text-align: left;
	}
	.server {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.1rem 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		background: rgba(14, 14, 14, 0.55);
		backdrop-filter: blur(28px) saturate(140%);
		-webkit-backdrop-filter: blur(28px) saturate(140%);
		color: #fff;
		text-decoration: none;
		transition: border-color 0.25s, transform 0.25s;
	}
	.server:hover { border-color: rgba(255, 255, 255, 0.35); transform: translateY(-2px); }
	.server > i { font-size: 1.6rem; color: #fff; flex: none; }
	.srv-text { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
	.srv-kind { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255, 255, 255, 0.5); }
	.srv-text b { font-size: 1rem; }
	.srv-desc { font-size: 0.85rem; line-height: 1.45; color: var(--muted); }
	.join { display: inline-flex; align-items: center; gap: 0.4rem; flex: none; font-size: 0.85rem; font-weight: 600; }
	.join i { font-size: 0.75em; color: var(--accent); }

	@media (max-width: 960px) {
		.head { grid-template-columns: 1fr; }
		.lib { grid-template-columns: 1fr; }
		.mosaic figure { max-height: 38vh; }
	}
	@media (max-width: 700px) {
		.servers { grid-template-columns: 1fr; }
		.shelves a { grid-template-columns: 1fr auto; }
		.s-desc { display: none; }
		.mosaic { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.mosaic figure:nth-child(n + 3) { display: none; }
		.mosaic figure:nth-child(odd) { margin-bottom: 0; }
		.mosaic figure:nth-child(even) { margin-top: 0; }
		.mosaic { padding-bottom: 3rem; }
	}
	@media (max-width: 560px) {
		h1 { font-size: clamp(2.3rem, 11.5vw, 4rem); }
		.ctas { flex-direction: column; width: 100%; }
		.ctas .btn { width: 100%; }
		.aside { margin-top: 2.25rem; font-size: 0.85rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-inner { filter: none; transform: none; }
		.server,
		.mosaic video,
		.mosaic img { transition: none; }
	}
</style>
