<script>
	import Seo from '$lib/components/Seo.svelte';
	let { data } = $props();
	const { artwork } = data;
</script>

<Seo title="{artwork.title} | Case study" description={artwork.description || `Case study for ${artwork.title}`} />

<article class="case-study">
	<a href="/my-work" class="back-link reveal" style="--d: 0">
		<i class="fa-solid fa-arrow-left"></i> Back to gallery
	</a>

	<div class="hero reveal" style="--d: 1">
		<img src={artwork.imageUrl} alt={artwork.title} />
	</div>

	<header class="reveal" style="--d: 2">
		<p class="eyebrow">Case study</p>
		<h1>{artwork.title}</h1>
		<div class="meta">
			<span class="category">{artwork.category}</span>
			{#if artwork.tags.length}
				<div class="tags">
					{#each artwork.tags as t}
						<span class="tag">{t.name}</span>
					{/each}
				</div>
			{/if}
		</div>
		{#if artwork.description}
			<p class="description">{artwork.description}</p>
		{/if}
	</header>

	{#if artwork.caseStudyContent}
		<div class="content reveal" style="--d: 3">
			{@html artwork.caseStudyContent}
		</div>
	{/if}
</article>

<style>
	.case-study {
		max-width: 860px;
		margin: 0 auto;
		padding: clamp(1.75rem, 5vh, 3rem) clamp(1.25rem, 4vw, 3rem) clamp(3rem, 8vh, 5rem);
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.68);
		text-decoration: none;
		font-size: 0.88rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
		transition: color 0.2s;
	}
	.back-link i { font-size: 0.8em; color: var(--accent, #ff2b1f); transition: transform 0.2s; }
	.back-link:hover { color: #fff; }
	.back-link:hover i { transform: translateX(-3px); }
	.hero {
		margin-bottom: 2rem;
		padding: 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		background: rgba(14, 14, 14, 0.55);
		-webkit-backdrop-filter: blur(28px) saturate(140%);
		backdrop-filter: blur(28px) saturate(140%);
	}
	.hero img {
		display: block;
		width: 100%;
		border-radius: 8px;
		background: #1b1b1b;
	}
	header {
		margin-bottom: 2rem;
	}
	.eyebrow {
		margin: 0 0 0.75rem;
		font-family: var(--font-display);
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
	}
	h1 {
		margin: 0 0 1rem;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2rem, 4.5vw, 3.25rem);
		line-height: 1.05;
		letter-spacing: -0.01em;
		color: #fff;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.category {
		font-family: var(--font-display);
		font-size: 0.8rem;
		color: var(--accent, #ff2b1f);
		text-transform: capitalize;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.tag {
		font-size: 0.78rem;
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: rgba(255, 255, 255, 0.7);
	}
	.description {
		margin: 1.25rem 0 0;
		font-size: clamp(1rem, 1.3vw, 1.1rem);
		color: rgba(255, 255, 255, 0.68);
		line-height: 1.6;
	}
	.content {
		line-height: 1.8;
		color: rgba(255, 255, 255, 0.85);
	}
	.content :global(h2) {
		margin-top: 2.5rem;
		margin-bottom: 0.75rem;
		font-family: var(--font-display);
		font-weight: 600;
		color: #fff;
	}
	.content :global(p) {
		margin-bottom: 1rem;
	}
	.content :global(a) {
		color: #fff;
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 43, 31, 0.6);
	}
	.content :global(img) {
		max-width: 100%;
		border-radius: 10px;
		margin: 1rem 0;
	}
</style>
