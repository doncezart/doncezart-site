<script>
	import Seo from '$lib/components/Seo.svelte';
	// Contact, redesigned: one frosted container holding the form, quick
	// links underneath in case it doesn't work. After sending, the container
	// turns into a confirmation (and, if SMTP is set up, the sender gets a
	// confirmation email). Posts to ./+page.server.js, which shares delivery
	// (rate limit, Turnstile, Discord + Google Forms) with /contact.
	import { enhance } from '$app/forms';
	import { env } from '$env/dynamic/public';
	import LandingShell from '$lib/components/landing/LandingShell.svelte';
	import { TOPICS } from '$lib/data/contact.js';

	let { form } = $props();

	const SITE_KEY = env.PUBLIC_TURNSTILE_SITE_KEY;
	const EMAIL = 'me@doncez.art';
	const MAX = 1500;

	const quick = [
		{ label: 'Instagram', icon: 'fa-brands fa-instagram', href: 'https://instagram.com/doncezart' }
	];
	const first = $derived(form?.name?.trim().split(/\s+/)[0] ?? '');

	// Bound fields, seeded from the server's echo after a failed send.
	let name = $state(form?.name ?? '');
	let email = $state(form?.email ?? '');
	let link = $state(form?.link ?? '');
	let message = $state(form?.message ?? '');
	let sending = $state(false);
	let copied = $state(false);

	const picked = (t) => form?.topics?.includes(t) ?? false;

	// Fields are checked here before sending (the server checks the spam
	// test first, so it would never get to say the email is wrong).
	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
	let local = $state({ name: false, email: false, message: false });
	let tried = $state(false);
	const invalid = $derived({
		name: local.name || (!tried && !!form?.missing_name),
		email: local.email || (!tried && (!!form?.missing_email || form?.error === 'Please enter a valid email address.')),
		message: local.message || (!tried && !!form?.missing_message)
	});
	const error = $derived(
		invalid.name || invalid.email || invalid.message
			? local.email && !local.name && !local.message
				? "That email doesn't look right. Check it and send again."
				: 'Fill in the highlighted fields and send again.'
			: tried
				? null
				: form?.captcha_failed
					? "The spam check didn't go through. Please send again."
					: (form?.error ?? null)
	);
	/** Clear a field's error as soon as it's edited. */
	const fix = (k) => () => (local[k] = false);

	const track = (name, data) => window.umami?.track(name, data);

	function submit({ formData, cancel }) {
		const v = (k) => formData.get(k)?.toString().trim() ?? '';
		local = { name: !v('name'), email: !EMAIL_RE.test(v('email')), message: !v('message') };
		tried = true;
		if (local.name || local.email || local.message) {
			cancel();
			document.querySelector(`.contact [name="${['name', 'email', 'message'].find((k) => local[k])}"]`)?.focus();
			return;
		}
		tried = false;
		sending = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			sending = false;
			if (result.type === 'success') track('contact-form-submitted', { page: 'contact' });
			else if (result.type === 'failure') track('contact-form-error', { status: result.status });
			else window.turnstile?.reset();
		};
	}

	async function copyEmail() {
		try {
			await navigator.clipboard.writeText(EMAIL);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			window.location.href = `mailto:${EMAIL}`;
		}
		track('landing-cta', { name: 'contact-copy-email' });
	}
</script>

<Seo
	title="Start a project"
	description="Tell me what's not working. You get a written plan back with what I'd change and what it costs."
/>
<svelte:head>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<LandingShell>
	<main class="l-sec contact">
		<div class="col">
			<div class="box reveal" style="--d: 0">
				{#if form?.success}
					<!-- Confirmation -->
					<div class="done" role="status">
						<span class="tick"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
						<h1>Message sent{first ? `, ${first}` : ''}.</h1>
						{#if form.confirmed}
							<p>
								You should receive a confirmation email at <b>{form.email}</b> soon. If it doesn't show up (check
								spam too), contact me directly at <a href="mailto:{EMAIL}">{EMAIL}</a>.
							</p>
						{:else}
							<p>
								It's in, and I'll reply in writing at <b>{form.email}</b>. If you don't hear back, contact me directly at
								<a href="mailto:{EMAIL}">{EMAIL}</a>.
							</p>
						{/if}
						<a href="/" class="btn">Back to the site <i class="fa-solid fa-arrow-right"></i></a>
					</div>
				{:else}
					<header class="head">
						<h1>Start a project</h1>
						<p>Tell me what's not working. A few lines is enough.</p>
					</header>

					<form method="POST" action="?/send" use:enhance={submit} novalidate>
						{#if error}
							<p class="error" role="alert"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>{error}</p>
						{/if}

						<div class="two">
							<label class="field" class:bad={invalid.name}>
								<span>Name</span>
								<input name="name" autocomplete="name" maxlength="100" placeholder="Your name" required bind:value={name} aria-invalid={invalid.name} oninput={fix('name')} />
							</label>
							<label class="field" class:bad={invalid.email}>
								<span>Email</span>
								<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required bind:value={email} aria-invalid={invalid.email} oninput={fix('email')} />
							</label>
						</div>

						<label class="field">
							<span>Link <small>optional</small></span>
							<input name="link" type="url" inputmode="url" maxlength="300" placeholder="Your channel, page or site" bind:value={link} />
						</label>

						<fieldset class="field">
							<legend>What do you need?</legend>
							<div class="chips">
								{#each TOPICS as t}
									<label class="chip">
										<input type="checkbox" name="topics" value={t} checked={picked(t)} />
										<span>{t}</span>
									</label>
								{/each}
							</div>
						</fieldset>

						<label class="field" class:bad={invalid.message}>
							<span>Message</span>
							<textarea
								name="message"
								maxlength={MAX}
								required
								rows="4"
								placeholder="What's not working, and what would you like to change?"
								bind:value={message}
								aria-invalid={invalid.message}
								oninput={fix('message')}
							></textarea>
							<small class="count" class:near={message.length > MAX * 0.9}>{message.length} / {MAX}</small>
						</label>

						<div class="submit">
							<!-- Only appears if Cloudflare wants an interactive check. -->
							<div class="cf-turnstile" data-sitekey={SITE_KEY} data-theme="dark" data-appearance="interaction-only"></div>
							<button type="submit" class="btn send" disabled={sending}>
								{#if sending}Sending…{:else}Send message <i class="fa-solid fa-paper-plane"></i>{/if}
							</button>
						</div>
					</form>
				{/if}
			</div>

			<nav class="quick reveal" style="--d: 1" aria-label="Other ways to reach me">
				<span class="q-label">Form not working?</span>
				<button type="button" class="q" onclick={copyEmail}>
					<i class="fa-regular {copied ? 'fa-circle-check' : 'fa-envelope'}" aria-hidden="true"></i>
					{copied ? 'Copied' : EMAIL}
				</button>
				{#each quick as q}
					<a class="q" href={q.href} target="_blank" rel="noopener noreferrer">
						<i class={q.icon} aria-hidden="true"></i>{q.label}
					</a>
				{/each}
			</nav>
		</div>
	</main>
</LandingShell>

<style>
	.contact .col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		max-width: 680px;
	}

	/* ── The container: frosted glass over the embers. ── */
	.box {
		width: 100%;
		padding: clamp(1.5rem, 4vw, 2.5rem);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		background: rgba(14, 14, 14, 0.55);
		backdrop-filter: blur(28px) saturate(140%);
		-webkit-backdrop-filter: blur(28px) saturate(140%);
		box-shadow: 0 40px 120px -30px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.head { margin-bottom: 1.4rem; }
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(1.6rem, 3vw, 2.1rem);
		letter-spacing: -0.01em;
		line-height: 1.1;
	}
	.head p { margin: 0.5rem 0 0; font-size: 0.95rem; color: var(--muted); }

	form { display: flex; flex-direction: column; gap: 1rem; }

	.error {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
		padding: 0.75rem 0.9rem;
		border: 1px solid rgba(255, 43, 31, 0.4);
		border-radius: 6px;
		background: rgba(255, 43, 31, 0.12);
		font-size: 0.88rem;
	}
	.error i { color: var(--accent); }

	/* ── Fields: label above, quiet filled input. ── */
	.two { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.field { position: relative; display: flex; flex-direction: column; gap: 0.45rem; min-width: 0; margin: 0; padding: 0; border: 0; }
	.field > span,
	.field legend {
		padding: 0;
		font-size: 0.82rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.75);
	}
	.field small { font-weight: 400; color: rgba(255, 255, 255, 0.4); }
	.field legend { margin-bottom: 0.45rem; }
	input:not([type='checkbox']),
	textarea {
		width: 100%;
		padding: 0.8rem 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		outline: 0;
		background: rgba(255, 255, 255, 0.04);
		font: inherit;
		font-size: 0.95rem;
		color: #fff;
		transition: border-color 0.2s, background 0.2s;
	}
	input::placeholder,
	textarea::placeholder { color: rgba(255, 255, 255, 0.35); }
	input:not([type='checkbox']):hover,
	textarea:hover { border-color: rgba(255, 255, 255, 0.2); }
	input:not([type='checkbox']):focus,
	textarea:focus { border-color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.06); }
	.bad > span { color: var(--accent); }
	.bad input,
	.bad textarea { border-color: var(--accent); }
	textarea { resize: vertical; min-height: 6.5rem; line-height: 1.55; }
	.count { position: absolute; right: 0.75rem; bottom: 0.6rem; font-size: 0.72rem; font-variant-numeric: tabular-nums; pointer-events: none; }
	.count.near { color: var(--accent); }

	.chips { display: flex; flex-wrap: wrap; gap: 0.45rem; }
	.chip { position: relative; cursor: pointer; }
	.chip input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.chip span {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 999px;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		transition: color 0.2s, background 0.2s, border-color 0.2s;
	}
	.chip:hover span { color: #fff; border-color: rgba(255, 255, 255, 0.3); }
	.chip input:checked + span { color: #fff; background: rgba(255, 43, 31, 0.16); border-color: rgba(255, 43, 31, 0.55); }
	.chip input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }

	.submit { display: flex; flex-direction: column; align-items: center; margin-top: 0.3rem; }
	.send { width: 100%; font-family: var(--font-body); }
	.send:disabled { opacity: 0.6; cursor: progress; }

	/* ── Confirmation ── */
	.done { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 1.5rem 0 0.5rem; text-align: center; }
	.tick {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		background: rgba(255, 43, 31, 0.16);
		box-shadow: inset 0 0 0 1px rgba(255, 43, 31, 0.55);
		font-size: 1.25rem;
		color: var(--accent);
		animation: pop 0.6s cubic-bezier(0.2, 0.7, 0.1, 1) both;
	}
	@keyframes pop {
		from { opacity: 0; transform: scale(0.6); }
	}
	.done p { margin: 0; max-width: 30rem; font-size: 0.98rem; line-height: 1.6; color: var(--muted); }
	.done b { color: #fff; font-weight: 600; overflow-wrap: anywhere; }
	.done p a { color: #fff; font-weight: 600; text-decoration: none; border-bottom: 1px solid rgba(255, 255, 255, 0.3); }
	.done p a:hover { border-color: var(--accent); }
	.done .btn { margin-top: 0.75rem; }

	/* ── Quick links under the container ── */
	.quick { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; }
	.q-label { margin-right: 0.35rem; font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); }
	.q {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		font: inherit;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s;
	}
	.q:hover { color: #fff; border-color: rgba(255, 255, 255, 0.35); }
	.q i { font-size: 0.85rem; color: var(--accent); }

	@media (max-width: 560px) {
		.two { grid-template-columns: 1fr; }
		.q-label { width: 100%; margin: 0 0 0.2rem; text-align: center; }
	}
	@media (prefers-reduced-motion: reduce) {
		.tick { animation: none; }
	}
</style>
