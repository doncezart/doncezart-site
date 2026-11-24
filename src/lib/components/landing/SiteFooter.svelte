<script>
	// Compact site footer for the landing and designer pages, pinned to the
	// bottom of their last screen by the section that renders it.
	import { SOCIALS } from '$lib/data/site.js';
	let {
		links = [
			{ href: '/my-work', label: 'Portfolio' },
			{ href: '/#results', label: 'Results' },
			{ href: '/designer', label: 'For designers' },
			{ href: '/tools', label: 'Free tools' },
			{ href: '/privacy', label: 'Privacy' }
		]
	} = $props();

	const year = new Date().getFullYear();
</script>

<footer class="foot">
	<a href="/" class="brand" aria-label="DONCEZART home"><img src="/logo-long.svg" alt="" /></a>
	<nav aria-label="Footer">
		{#each links as l}<a href={l.href} onclick={() => window.umami?.track('footer-click', { link: l.href })}>{l.label}</a>{/each}
	</nav>
	<div class="socials">
		{#each SOCIALS as s}
			<a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name}
				onclick={() => window.umami?.track('social-click', { platform: s.name, location: 'footer' })}><i class={s.icon}></i></a>
		{/each}
	</div>
	<small>© {year} DONCEZART</small>
</footer>

<style>
	/* Same look as the full site footer (../Footer.svelte), in one row. */
	.foot,
	.foot * { box-sizing: border-box; }
	.foot {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 1rem 2.25rem;
		padding: 1.25rem 0 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		font-family: var(--font-body);
	}
	.brand { display: flex; }
	.brand img { height: 11px; width: auto; display: block; }
	nav { display: flex; flex-wrap: wrap; gap: 0.5rem 1.6rem; }
	nav a {
		position: relative;
		font-size: 0.86rem;
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		transition: color 0.2s;
	}
	nav a::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -3px;
		height: 1px;
		background: #ff2b1f;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.3s cubic-bezier(0.2, 0.7, 0.1, 1);
	}
	nav a:hover { color: #fff; }
	nav a:hover::after { transform: scaleX(1); }
	.socials { display: flex; gap: 0.4rem; }
	.socials a {
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.75);
		font-size: 0.85rem;
		text-decoration: none;
		transition: border-color 0.2s, background 0.2s, color 0.2s;
	}
	.socials a:hover { border-color: #ff2b1f; background: rgba(255, 43, 31, 0.12); color: #fff; }
	small { font-size: 0.78rem; color: rgba(255, 255, 255, 0.45); white-space: nowrap; }

	/* Phones: logo + socials, then the links, then the copyright. */
	@media (max-width: 960px) {
		.foot { grid-template-columns: 1fr auto; gap: 1rem; }
		nav { grid-column: 1 / -1; grid-row: 2; gap: 0.6rem 1.25rem; }
		small { grid-column: 1 / -1; }
	}
</style>
