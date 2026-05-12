<script>
    import Button from '$lib/components/ui/Button.svelte';
    import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
    let { form } = $props();

    const hasFieldError = $derived(form?.missing_email || form?.missing_name || form?.missing_message);

    $effect(() => {
        if (form?.success) {
            window.umami?.track('contact-form-submitted');
        }
    });
</script>

<svelte:head>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="page">
    <div class="header">
        <h1>Get in touch</h1>
        <p>Send me a message using the form below, or use the alternative methods at the bottom.</p>
    </div>

    <form method="POST" action="?/send">
        {#if hasFieldError}
            <div class="form-message form-message--error">Please fill in all required fields.</div>
        {/if}
        {#if form?.captcha_failed}
            <div class="form-message form-message--error">Bot check failed — please try again.</div>
        {/if}
        {#if form?.success}
            <div class="form-message form-message--success">Message sent successfully.</div>
        {/if}

        <div class="fields">
            <div class="field">
                <label for="email">Email address</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    class:error={form?.missing_email}
                    maxlength="50"
                    placeholder="john@doe.com"
                    autocomplete="email"
                    value={form?.email ?? ''}
                />
            </div>

            <div class="field">
                <label for="name">Name</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    class:error={form?.missing_name}
                    maxlength="50"
                    placeholder="John Doe"
                    autocomplete="name"
                    value={form?.name ?? ''}
                />
            </div>
        </div>

        <div class="field">
            <label for="message">Message</label>
            <textarea
                id="message"
                name="message"
                class:error={form?.missing_message}
                placeholder="Your message…"
                maxlength="1000"
                value={form?.message ?? ''}
            ></textarea>
        </div>

        <div class="cf-turnstile" data-sitekey={PUBLIC_TURNSTILE_SITE_KEY} data-theme="dark"></div>

        <Button variant="outline" type="submit" style="width: 100%">Send message</Button>
    </form>

    <p class="footer-note">
        Can't complete the form? Email me at <a href="mailto:me@doncez.art">me@doncez.art</a> or reach me on my <a href="/socials">socials</a>.
    </p>
</div>

<style>
    .page {
        padding: var(--space-2xl) var(--container-pad);
        max-width: 36rem;
        margin: 0 auto;
    }

    .header {
        text-align: center;
        margin-bottom: var(--space-2xl);
    }

    .header h1 {
        margin-bottom: 0.5rem;
    }

    .header p {
        color: var(--color-text-secondary);
        font-size: var(--text-base);
        margin: 0;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .fields {
        display: flex;
        gap: 1rem;
    }

    @media (max-width: 560px) {
        .fields {
            flex-direction: column;
        }
    }

    .field {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    label {
        display: block;
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        margin-bottom: 0.4rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    input,
    textarea {
        background: transparent;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.75rem 1rem;
        font-family: var(--font-body);
        font-size: var(--text-base);
        width: 100%;
        box-sizing: border-box;
        border-radius: var(--radius, 0);
    }

    textarea {
        height: 8rem;
        resize: vertical;
    }

    input:focus,
    textarea:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.5);
    }

    input.error,
    textarea.error {
        border-color: var(--color-accent);
    }

    .form-message {
        font-size: var(--text-sm);
        padding: 0.6rem 1rem;
    }

    .form-message--error {
        border-left: 2px solid var(--color-accent);
        color: var(--color-accent);
    }

    .form-message--success {
        border-left: 2px solid rgba(80, 200, 120, 0.8);
        color: rgba(80, 200, 120, 0.8);
    }

    .footer-note {
        text-align: center;
        margin-top: var(--space-2xl);
        color: var(--color-text-secondary);
        font-size: var(--text-sm);
    }

    .footer-note a {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 3px;
    }
</style>