<script>
	// Title, description, canonical link and share preview for one page.
	// Every public page renders exactly one of these, so titles share one
	// format ("Page | DONCEZART") and every page has a proper link preview.
	//
	//   title        the page's own name; leave out for the bare brand title
	//   full         use this exact title instead (the landing page)
	//   description  one or two sentences, also used for the share preview
	//   image        share image under /static (1200x630), default /og.png
	//   noindex      keep the page out of search results (private pages)
	import { page } from '$app/state';
	import { SITE } from '$lib/data/site.js';

	let { title = '', full = '', description = '', image = '/og.png', noindex = false } = $props();

	const fullTitle = $derived(full || (title ? `${title} | DONCEZART` : 'DONCEZART'));
	const url = $derived(SITE + page.url.pathname);
	const imageUrl = $derived(/^https?:/.test(image) ? image : SITE + image);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	{#if description}<meta name="description" content={description} />{/if}
	{#if noindex}
		<meta name="robots" content="noindex" />
	{:else}
		<link rel="canonical" href={url} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DONCEZART" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={fullTitle} />
	{#if description}<meta property="og:description" content={description} />{/if}
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
