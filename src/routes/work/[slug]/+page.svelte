<script>
	let { data } = $props();
	const { artwork } = data;
</script>

<svelte:head>
	<title>{artwork.title} — Case Study | DONCEZART</title>
	<meta name="description" content={artwork.description || `Case study for ${artwork.title}`} />
</svelte:head>

<article class="case-study">
	<a href="/" class="back-link">
		<i class="fa-solid fa-arrow-left"></i> Back to gallery
	</a>

	<div class="hero">
		<img src={artwork.imageUrl} alt={artwork.title} />
	</div>

	<header>
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
		<div class="content">
			{@html artwork.caseStudyContent}
		</div>
	{/if}
</article>

<style>
	.case-study {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 0;
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: rgba(255,255,255,0.5);
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}
	.back-link:hover {
		color: #fff;
	}
	.hero {
		margin-bottom: 2rem;
	}
	.hero img {
		width: 100%;
		border-radius: 0.75rem;
	}
	header {
		margin-bottom: 2rem;
	}
	h1 {
		font-size: 2rem;
		margin-bottom: 0.75rem;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.category {
		font-size: 0.85rem;
		color: rgba(255,255,255,0.4);
		text-transform: capitalize;
	}
	.tags {
		display: flex;
		gap: 0.3rem;
	}
	.tag {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 1rem;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
	}
	.description {
		margin-top: 1rem;
		color: rgba(255,255,255,0.7);
		line-height: 1.6;
	}
	.content {
		line-height: 1.8;
		color: rgba(255,255,255,0.85);
	}
	.content :global(h2) {
		margin-top: 2rem;
		margin-bottom: 0.75rem;
	}
	.content :global(p) {
		margin-bottom: 1rem;
	}
	.content :global(img) {
		max-width: 100%;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}
</style>
