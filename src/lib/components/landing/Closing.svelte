<script>
	// Last screen: the closing ask (in writing, never a call) and the footer.
	import { snapSection } from './snap-scroll.js';
	import { inview } from './reveal.js';
	import SiteFooter from './SiteFooter.svelte';

	const EMAIL = 'me@doncez.art';

	let copied = $state(false);
	async function copyEmail() {
		try {
			await navigator.clipboard.writeText(EMAIL);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			window.location.href = `mailto:${EMAIL}`;
		}
		track('closing-copy-email');
	}
	const track = (name) => window.umami?.track('landing-cta', { name });
</script>

<section id="contact" class="l-sec closing" use:snapSection use:inview>
	<div class="ask">
		<p class="l-eyebrow l-r" style="--d: 0">Your move</p>
		<h2 class="big l-r" style="--d: 1">Tell me what's<span class="l-hot">not working.</span></h2>
		<p class="l-lede l-r" style="--d: 2">
			A few lines is enough. You get a written plan back with what I would change and what it costs. No call
			needed.
		</p>
		<div class="actions l-r" style="--d: 3">
			<a href="/contact" class="btn btn-primary" onclick={() => track('closing-fix')}>
				Let's fix your content <i class="fa-solid fa-arrow-right"></i>
			</a>
			<button type="button" class="email" onclick={copyEmail} aria-live="polite">
				<span>or email <b>{EMAIL}</b></span>
				<i class="fa-regular {copied ? 'fa-circle-check' : 'fa-copy'}" aria-hidden="true"></i>
				<span class="sr">{copied ? 'Copied' : 'Copy email address'}</span>
			</button>
		</div>
	</div>

	<SiteFooter />
</section>

<style>
	.closing {
		/* Centred ask, footer pinned to the bottom of the screen. */
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding-bottom: 0;
	}
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

	.actions { display: flex; flex-direction: column; align-items: center; gap: 1.1rem; margin-top: 0.5rem; }
	.email {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.3rem 0.4rem;
		border: 0;
		background: none;
		font: inherit;
		font-size: 0.92rem;
		color: var(--muted);
		cursor: pointer;
	}
	.email b { font-weight: 600; color: #fff; border-bottom: 1px solid rgba(255, 255, 255, 0.3); transition: border-color 0.2s; }
	.email:hover b { border-color: var(--accent); }
	.email i { font-size: 0.85rem; color: var(--accent); }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }


	@media (max-width: 560px) {
		.actions { width: 100%; }
		.actions .btn { width: 100%; }
	}
</style>
