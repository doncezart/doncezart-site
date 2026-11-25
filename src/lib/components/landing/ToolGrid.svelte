<script>
	// Free tools as small browser windows, each previewing what the tool
	// makes, plus a "suggest the next one" card. Shared by /designer and /tools.
	import { tools } from '$lib/data/tools.js';
	import { DEFAULT_CONFIG, renderMat } from '$lib/components/tools/cutting-mat.js';
	import YouTubeCard from '$lib/components/tools/YouTubeCard.svelte';
	import { layoutConfig } from '$lib/components/tools/yt-api.js';

	let {
		/** Reveal class for the cards: 'l-r' inside an inview section, 'reveal' for load-in. */
		reveal = 'reveal',
		/** First --d stagger index. */
		stagger = 0,
		track = () => {}
	} = $props();

	const DISCORD = 'https://discord.gg/aJUAyFVyqM';
	// What each tool's window previews. Keyed by tools.js slug; a tool without
	// one still gets a card, just with its icon instead of a mock.
	const previews = { 'youtube-card': 'yt', 'profile-card': 'profile', 'cutting-mat': 'mat' };
	// A small real mat from the generator itself (no grain filter: cheap to paint).
	// The real card component in its default layout, so the preview always
	// matches what the tool makes. Data from the Santea Streams case study.
	const ytVideo = {
		title: 'SANTEA GIVING $3K TO KIDS IN MEXICO!! (EMOTIONAL)',
		views: 75949,
		publishedAt: '2026-02-12T18:00:00Z',
		duration: 1534,
		thumbnails: { hq: '/cases/santea-streams/hMJvFcpSnto.webp' },
		channel: { name: 'Santea Streams', avatarUrl: '/cases/santea-streams/avatar.jpg' }
	};
	const ytConfig = { ...layoutConfig('classic'), containerSize: 300, padding: 28 };
	// Scale the card down to fit its preview box, whatever the grid width.
	let ytStageW = $state(0);
	let ytStageH = $state(0);
	let ytCardW = $state(0);
	let ytCardH = $state(0);
	const ytScale = $derived(
		ytCardW && ytCardH && ytStageW ? Math.min(1, (ytStageW * 0.8) / ytCardW, (ytStageH * 0.86) / ytCardH) : 0.6
	);
	const matSvg = renderMat(
		{ ...DEFAULT_CONFIG, width: 30, height: 20, margin: 1.5, numberSize: 3, grain: 0, wear: 0.2, vignette: 0.2, brandText: '', brandSub: 'SELF-HEALING' },
		{ id: 'tg-mat' }
	);
</script>

<div class="tool-grid">
	{#each tools as t, i}
		<a href={t.href} class="tool {reveal}" style="--d: {stagger + i}" onclick={() => track(`tool-${t.slug}`)}>
			<div class="chrome" aria-hidden="true">
				<span class="dots"><i></i><i></i><i></i></span>
				<span class="pill">doncez.art{t.href}</span>
			</div>
			{#if previews[t.slug] === 'yt'}
				<div class="stage" aria-hidden="true" bind:clientWidth={ytStageW} bind:clientHeight={ytStageH}>
					<div class="m-yt" style="--yt-s: {ytScale}" bind:clientWidth={ytCardW} bind:clientHeight={ytCardH}>
						<YouTubeCard video={ytVideo} config={ytConfig} />
					</div>
				</div>
			{:else}
				<div class="stage" aria-hidden="true">
					{#if previews[t.slug] === 'profile'}
						<div class="m-pf">
							<div class="m-pf-banner"></div>
							<img class="m-pf-av" src="/avatar.webp" alt="" loading="lazy" />
							<b>DONCEZART</b>
							<span>@doncezart</span>
							<div class="m-pf-stats">
								<span><b>12.4K</b>followers</span><span><b>318</b>posts</span><span><b>86</b>following</span>
							</div>
						</div>
					{:else if previews[t.slug] === 'mat'}
						<div class="m-mat">{@html matSvg}</div>
					{:else}
						<i class="{t.icon} m-icon"></i>
					{/if}
				</div>
			{/if}
			<div class="tool-body">
				<h3><i class={t.icon} aria-hidden="true"></i>{t.name}</h3>
				<p>{t.description}</p>
				<span class="go">Open the tool <i class="fa-solid fa-arrow-right"></i></span>
			</div>
		</a>
	{/each}
	<a
		href={DISCORD}
		target="_blank"
		rel="noopener noreferrer"
		class="tool next {reveal}"
		style="--d: {stagger + tools.length}"
		onclick={() => track('tool-suggest')}
	>
		<i class="fa-solid fa-plus" aria-hidden="true"></i>
		<h3>What should I build next?</h3>
		<p>New tools ship to the Discord first. Tell me what slows you down and it might be next.</p>
		<span class="go">Suggest a tool <i class="fa-solid fa-arrow-right"></i></span>
	</a>
</div>

<style>
	.tool-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; }
	.tool {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--w-line-strong);
		border-radius: var(--w-radius);
		background: var(--w-bg);
		color: #fff;
		text-decoration: none;
		transition: border-color 0.25s, transform 0.25s;
	}
	.tool:hover { border-color: rgba(255, 255, 255, 0.35); transform: translateY(-3px); }
	.chrome {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.8rem;
		background: var(--w-chrome);
		border-bottom: 1px solid var(--w-line);
	}
	.dots { display: flex; gap: 5px; }
	.dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--w-raised-2); }
	.pill {
		flex: 1;
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
		background: var(--w-raised);
		font-family: var(--w-font);
		font-size: 0.7rem;
		color: var(--w-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.stage {
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 9;
		max-height: 30vh;
		width: 100%;
		padding: 1.25rem;
		background:
			radial-gradient(120% 90% at 50% 0%, rgba(255, 43, 31, 0.12), transparent 60%),
			repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.025) 0 10px, transparent 10px 20px),
			#0a0a0a;
		overflow: hidden;
	}
	.tool-body { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.25rem 1.25rem; flex: 1; }
	.tool h3 {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
		font-family: var(--font-body);
		font-size: 1.05rem;
		font-weight: 600;
	}
	.tool h3 i { color: var(--accent); font-size: 0.95em; }
	.tool p { margin: 0; flex: 1; font-size: 0.9rem; line-height: 1.5; color: var(--muted); }
	.go { display: inline-flex; align-items: center; gap: 0.45rem; margin-top: 0.4rem; font-size: 0.85rem; font-weight: 600; }
	.go i { font-size: 0.8em; color: var(--accent); transition: transform 0.2s; }
	.tool:hover .go i { transform: translateX(3px); }

	.tool.next {
		justify-content: center;
		gap: 0.6rem;
		padding: 1.75rem;
		border-style: dashed;
		background: rgba(14, 14, 14, 0.55);
		-webkit-backdrop-filter: blur(20px);
		backdrop-filter: blur(20px);
	}
	.tool.next > i {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 50%;
		border: 1px solid var(--w-line-strong);
		color: var(--accent);
	}
	.tool.next p { flex: 0; }

	/* Preview: the real YouTube card (fixed 300px card, scaled to fit). */
	.m-yt {
		flex: none;
		transform: rotate(-2deg) scale(var(--yt-s, 0.6));
		filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.55));
	}
	.m-yt :global(.ycard) { border-radius: 10px; }
	/* Mock: social profile card */
	.m-pf {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: min(64%, 230px);
		padding: 0 0.9rem 0.8rem;
		border-radius: 12px;
		overflow: hidden;
		background: #141414;
		border: 1px solid var(--w-line-strong);
		font-family: var(--w-font);
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
		transform: rotate(2deg);
	}
	.m-pf-banner { align-self: stretch; height: 2.6rem; margin: 0 -0.9rem; background: linear-gradient(120deg, #ff2b1f, #5a0c07 70%); }
	.m-pf-av { width: 46px; height: 46px; margin-top: -23px; border-radius: 50%; border: 3px solid #141414; object-fit: cover; background: #000; }
	.m-pf > b { margin-top: 0.35rem; font-size: 0.78rem; }
	.m-pf > span { font-size: 0.62rem; color: var(--w-sub); }
	.m-pf-stats { display: flex; gap: 0.9rem; margin-top: 0.55rem; font-size: 0.55rem; color: var(--w-sub); }
	.m-pf-stats span { display: flex; flex-direction: column; align-items: center; }
	.m-pf-stats b { font-size: 0.72rem; color: var(--w-text); }
	/* Mock: cutting mat (rendered by the tool's own generator) */
	.m-mat {
		width: min(80%, 320px);
		aspect-ratio: 3 / 2;
		filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.55));
		transform: rotate(-2deg);
	}
	.m-mat :global(svg) { display: block; width: 100%; height: 100%; }
	.m-icon { font-size: 2.5rem; color: var(--accent); }

	@media (max-width: 1100px) {
		.tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.tool.next { grid-column: 1 / -1; }
	}
	@media (max-width: 700px) {
		.tool-grid { grid-template-columns: 1fr; }
	}
	@media (prefers-reduced-motion: reduce) {
		.tool { transition: none; }
	}
</style>
