<script>
	// "How it works": the whole job happens in writing. An example message
	// thread on the left (from my inbox, the client is "This could be you"); four
	// steps on the right. The thread plays out when the
	// section comes into view, lighting up the step each message belongs to.
	import { onMount } from 'svelte';
	import { snapSection } from './snap-scroll.js';
	import { inview } from './reveal.js';

	const steps = [
		{ title: 'Tell me what is not working', text: 'Send a message with your channel or site and what you want to change. A few lines is enough.' },
		{ title: 'Get a written plan', text: 'What I would change, what it costs and when you will see the first result, before you commit to anything.' },
		{ title: 'I get to work', text: 'Drafts land where you already are: email, Discord or a shared folder. Feedback stays in writing too.' },
		{ title: 'Watch the numbers move', text: 'Regular updates with the stats that matter, so you can see exactly what changed and why.' }
	];

	const thread = [
		{ me: false, step: 0, text: 'Hey! My videos get clicks, but people leave in the first minute. Can you help?' },
		{
			me: true,
			step: 1,
			text: "Went through your last 10 uploads. Here's what I'd change, what it costs and when you'd see the first edit.",
			file: { icon: 'fa-file-lines', name: 'Plan for your channel', meta: 'PDF · 3 pages' }
		},
		{ me: false, step: 1, text: "This is exactly it. Let's go." },
		{
			me: true,
			step: 2,
			text: 'First edit is in the shared folder. Leave notes here whenever suits you.',
			file: { icon: 'fa-file-video', name: 'episode-01_v1.mp4', meta: 'Video · 14:32' }
		},
		{
			me: true,
			step: 3,
			text: 'Your first month is in. Full numbers and what I would try next are attached.',
			file: { icon: 'fa-chart-line', name: 'Monthly report', meta: 'PDF · 5 pages' }
		}
	];

	// How many messages are out, and whether the next one is "typing".
	// The server render shows the whole thread.
	let shown = $state(thread.length);
	let typing = $state(false);
	let root;
	const current = $derived(shown ? thread[Math.min(shown, thread.length) - 1].step : -1);

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		shown = 0;
		let timers = [];
		const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));
		let started = false;
		async function play() {
			started = true;
			await wait(350);
			for (let i = 0; i < thread.length; i++) {
				typing = true;
				await wait(thread[i].me ? 1100 : 750);
				typing = false;
				shown = i + 1;
				await wait(650);
			}
		}
		const io = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting && !started) play();
			},
			{ threshold: 0.45 }
		);
		io.observe(root);
		return () => {
			io.disconnect();
			timers.forEach(clearTimeout);
		};
	});

	const pad = (n) => String(n).padStart(2, '0');
</script>

<section id="process" class="l-sec process" use:snapSection use:inview>
	<div class="l-in-wrap grid">
		<div class="intro">
			<div class="l-eyebrow-row l-r" style="--d: 0">
				<p class="l-eyebrow">How it works</p>
				<span class="l-rule"></span>
			</div>
			<h2 class="l-title l-r" style="--d: 1">Everything in writing.<span class="l-hot">Nothing lost.</span></h2>
			<p class="l-lede l-r" style="--d: 2">
				Text is simply the faster way to work: you reply when it suits you, every decision and price is on record,
				and nothing waits for a free slot in two calendars.
			</p>

			<ol class="steps l-r" style="--d: 3">
				{#each steps as s, i}
					<li class:on={i === current} class:done={i < current}>
						<span class="n">{pad(i + 1)}</span>
						<div>
							<strong>{s.title}</strong>
							<p>{s.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>

		<div class="win l-r" style="--d: 2" bind:this={root}>
			<div class="chrome">
				<span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
				<span class="url"><i class="fa-solid fa-comment" aria-hidden="true"></i>Messages</span>
			</div>
			<div class="head">
				<span class="av"><i class="fa-solid fa-user" aria-hidden="true"></i></span>
				<div class="who">
					<strong>This could be you</strong>
					<span>Example conversation</span>
				</div>
			</div>
			<ol class="thread" aria-label="Example conversation">
				{#each thread as m, i}
					<li class="msg" class:me={m.me} class:out={i < shown} class:typing={typing && i === shown}>
						<div class="bubble">
							<p>{m.text}</p>
							{#if m.file}
								<span class="file">
									<i class="fa-solid {m.file.icon}" aria-hidden="true"></i>
									<span><b>{m.file.name}</b><small>{m.file.meta}</small></span>
								</span>
							{/if}
						</div>
						<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
					</li>
				{/each}
			</ol>
			<div class="compose" aria-hidden="true">
				<span>Reply…</span>
				<i class="fa-solid fa-paper-plane"></i>
			</div>
		</div>
	</div>
</section>

<style>
	.grid {
		display: grid;
		/* Window on the left, steps on the right. */
		grid-template-columns: minmax(0, 1.22fr) minmax(0, 0.78fr);
		gap: clamp(2rem, 4vw, 4.5rem);
		align-items: center;
	}
	.win { grid-row: 1; grid-column: 1; }
	.intro { grid-row: 1; grid-column: 2; }
	.intro { display: flex; flex-direction: column; gap: clamp(0.9rem, 2.6vh, 1.6rem); }

	/* ── Steps: the one the thread is on lights up. ── */
	.steps { list-style: none; margin: 0.4rem 0 0; padding: 0; display: flex; flex-direction: column; }
	.steps li {
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr);
		gap: 0.5rem;
		padding: clamp(0.55rem, 1.5vh, 0.85rem) 0 clamp(0.55rem, 1.5vh, 0.85rem) 1rem;
		border-left: 1px solid var(--line);
		transition: border-color 0.4s;
	}
	.steps li.on { border-left-color: var(--accent); }
	.steps li.done { border-left-color: rgba(255, 43, 31, 0.4); }
	.n {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		padding-top: 0.1rem;
		color: rgba(255, 255, 255, 0.4);
		font-variant-numeric: tabular-nums;
		transition: color 0.4s;
	}
	.steps li.on .n { color: var(--accent); }
	.steps strong {
		display: block;
		font-weight: 600;
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.7);
		transition: color 0.4s;
	}
	.steps li.on strong,
	.steps li.done strong { color: #fff; }
	.steps p { margin: 0.25rem 0 0; font-size: 0.88rem; line-height: 1.5; color: rgba(255, 255, 255, 0.5); transition: color 0.4s; }
	.steps li.on p { color: var(--muted); }

	/* ── The window: same frame, chrome and palette as the Results windows. ── */
	.win {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 640px;
		justify-self: center;
		border: 1px solid var(--w-line-strong);
		border-radius: 8px;
		overflow: hidden;
		background: var(--w-bg);
		box-shadow: 0 40px 120px -30px rgba(0, 0, 0, 0.9);
		font-family: var(--w-font);
		color: var(--w-text);
	}
	.chrome {
		display: flex;
		align-items: center;
		height: 41px;
		padding: 0 1rem;
		background: var(--w-chrome);
		border-bottom: 1px solid var(--w-line);
	}
	.lights { display: flex; gap: 0.5rem; }
	.lights i { width: 11px; height: 11px; border-radius: 50%; background: var(--w-raised-2); }
	.url {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 auto;
		padding: 0.3rem 0.9rem;
		border-radius: 6px;
		background: var(--w-bg);
		font-size: 0.75rem;
		color: var(--w-sub);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		/* Balance the traffic lights so the pill sits centred. */
		transform: translateX(-24px);
	}
	.url i { font-size: 0.7rem; }

	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 1.25rem;
		border-bottom: 1px solid var(--w-line);
	}
	.av {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: none;
		border-radius: 50%;
		background: var(--w-raised-2);
		overflow: hidden;
	}
	.av i { font-size: 0.95rem; color: var(--w-sub); }
	.who { display: flex; flex-direction: column; gap: 0.1rem; }
	.who strong { font-size: 0.95rem; font-weight: 700; }
	.who span { font-size: 0.75rem; color: var(--w-sub); }

	.thread {
		list-style: none;
		margin: 0;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	/* Every message keeps its space from the start, so the window never
	   changes size as the thread plays out. */
	.msg { position: relative; display: flex; }
	.msg.me { justify-content: flex-end; }
	.bubble {
		max-width: 78%;
		padding: 0.65rem 0.9rem;
		border-radius: 14px 14px 14px 4px;
		background: var(--w-raised-2);
		font-size: 0.88rem;
		line-height: 1.45;
		opacity: 0;
		transform: translateY(8px) scale(0.98);
		transform-origin: bottom left;
		transition: opacity 0.35s, transform 0.45s cubic-bezier(0.2, 0.7, 0.1, 1);
	}
	/* Mine: a quiet red tint rather than a solid block of accent. */
	.me .bubble {
		border-radius: 14px 14px 4px 14px;
		background: rgba(255, 43, 31, 0.16);
		box-shadow: inset 0 0 0 1px rgba(255, 43, 31, 0.35);
		transform-origin: bottom right;
	}
	.msg.out .bubble { opacity: 1; transform: none; }
	.bubble p { margin: 0; color: inherit; }

	.file {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-top: 0.55rem;
		padding: 0.5rem 0.65rem;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.35);
	}
	.file i { font-size: 1rem; color: var(--accent); }
	.file span { display: flex; flex-direction: column; }
	.file b { font-size: 0.8rem; font-weight: 600; }
	.file small { font-size: 0.7rem; opacity: 0.75; }

	/* Typing indicator: sits where the next message will appear. */
	.dots {
		position: absolute;
		bottom: 0;
		display: flex;
		gap: 4px;
		padding: 0.7rem 0.85rem;
		border-radius: 14px;
		background: var(--w-raised-2);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.msg:not(.me) .dots { left: 0; }
	.msg.me .dots { right: 0; }
	.msg.typing .dots { opacity: 1; }
	.dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--w-sub); animation: blink 1s infinite; }
	.dots i:nth-child(2) { animation-delay: 0.15s; }
	.dots i:nth-child(3) { animation-delay: 0.3s; }
	@keyframes blink {
		0%, 60%, 100% { opacity: 0.3; transform: none; }
		30% { opacity: 1; transform: translateY(-2px); }
	}

	.compose {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 1.25rem 1.25rem;
		padding: 0.7rem 1rem;
		border: 1px solid var(--w-line);
		border-radius: 999px;
		font-size: 0.82rem;
		color: var(--w-muted);
	}
	.compose i { color: var(--w-sub); }

	@media (max-width: 960px) {
		.grid { grid-template-columns: minmax(0, 1fr); gap: 2rem; }
		/* Stacked: the steps read first, then the example. */
		.intro { grid-column: 1; grid-row: 1; }
		.win { grid-column: 1; grid-row: 2; max-width: none; }
		.thread { padding: 1rem; }
		.bubble { max-width: 88%; font-size: 0.84rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.dots i { animation: none; }
	}
</style>
