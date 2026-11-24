<script>
	// FAQ: the questions people ask before the first message. One open at a
	// time; edit the list below to change them.
	import { snapSection } from './snap-scroll.js';
	import { inview } from './reveal.js';

	const faqs = [
		{
			q: 'Do we ever need to get on a call?',
			a: 'Not unless you want to. Everything, from the first message to the final file, happens in writing. You get clear written updates instead of meetings, and a record of every decision.'
		},
		{
			q: 'How much does it cost?',
			a: 'It depends on what you need and how often. After your first message you get a written plan with a clear price, before you commit to anything.'
		},
		{
			q: 'What do you need from me?',
			a: 'Your goals and access to the raw material: footage, your analytics, your community or your site. The plan lists exactly what, so there is no back and forth.'
		},
		{
			q: 'How soon will I see results?',
			a: "You'll see the work straight away. Growth depends on where you're starting from, but every case on this page moved within months, not years."
		},
		{
			q: 'Do you work with smaller channels and brands?',
			a: "Yes. What matters is that you're already posting and want it to work. If I don't think I can move your numbers, I'll tell you before you spend anything."
		},
		{
			q: 'Can I hire you for just one thing?',
			a: 'Yes. A single video, a set of thumbnails or a look at your channel is a fine place to start. Plenty of long-term work began that way.'
		}
	];

	let open = $state(0);
	const track = (name) => window.umami?.track('landing-cta', { name });
</script>

<section id="faq" class="l-sec faq" use:snapSection use:inview>
	<div class="l-in-wrap grid">
		<div class="intro">
			<div class="l-eyebrow-row l-r" style="--d: 0">
				<p class="l-eyebrow">Questions</p>
				<span class="l-rule"></span>
			</div>
			<h2 class="l-title l-r" style="--d: 1">Fair questions.<span class="l-hot">Straight answers.</span></h2>
			<p class="l-lede l-r" style="--d: 2">Something else on your mind? Ask it in writing, that's how all of this works anyway.</p>
			<a href="/contact" class="l-link l-r" style="--d: 3" onclick={() => track('faq-ask')}>
				Ask me anything <i class="fa-solid fa-arrow-right"></i>
			</a>
		</div>

		<ul class="list">
			{#each faqs as f, i}
				<li class="item l-r" class:open={open === i} style="--d: {i * 0.6 + 1.5}">
					<button
						type="button"
						id="faq-q-{i}"
						aria-expanded={open === i}
						aria-controls="faq-a-{i}"
						onclick={() => {
							open = open === i ? -1 : i;
							if (open === i) track(`faq-${i + 1}`);
						}}
					>
						<span>{f.q}</span>
						<i class="pm" aria-hidden="true"></i>
					</button>
					<div class="answer" id="faq-a-{i}" role="region" aria-labelledby="faq-q-{i}" inert={open !== i}>
						<div><p>{f.a}</p></div>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
		gap: clamp(2rem, 4vw, 4.5rem);
		align-items: center;
	}
	.intro { display: flex; flex-direction: column; gap: clamp(0.9rem, 2.6vh, 1.6rem); }

	.list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
	.item { border-bottom: 1px solid var(--line); }
	button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		width: 100%;
		padding: clamp(0.95rem, 2.4vh, 1.35rem) 0;
		border: 0;
		background: none;
		color: rgba(255, 255, 255, 0.8);
		font: inherit;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(1rem, 1.35vw, 1.2rem);
		text-align: left;
		cursor: pointer;
		transition: color 0.2s;
	}
	button:hover,
	.open button { color: #fff; }

	/* Plus that turns into a minus. */
	.pm { position: relative; width: 14px; height: 14px; flex: none; }
	.pm::before,
	.pm::after {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		width: 100%;
		height: 1.5px;
		background: currentColor;
		transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.1, 1), background 0.2s;
	}
	.pm::after { transform: rotate(90deg); }
	.open .pm::before,
	.open .pm::after { background: var(--accent); }
	.open .pm::after { transform: rotate(0deg); }

	/* Height animates via grid rows: 0fr closed, 1fr open. */
	.answer {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.45s cubic-bezier(0.2, 0.7, 0.1, 1);
	}
	.open .answer { grid-template-rows: 1fr; }
	.answer > div { overflow: hidden; }
	.answer p {
		margin: 0;
		padding: 0 2.5rem clamp(1rem, 2.4vh, 1.4rem) 0;
		max-width: 40rem;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--muted);
		opacity: 0;
		transition: opacity 0.3s;
	}
	.open .answer p { opacity: 1; transition-delay: 0.1s; }

	@media (max-width: 960px) {
		.grid { grid-template-columns: minmax(0, 1fr); gap: 2rem; }
		.answer p { padding-right: 0; }
		/* The display face gets cramped at this size. */
		button { font-family: var(--font-body); font-size: 1rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.answer, .answer p, .pm::before, .pm::after { transition: none; }
	}
</style>
