<script>
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
</script>

<svelte:head>
    <title>Privacy Policy — DONCEZART</title>
    <meta name="description" content="How DONCEZART handles your data." />
</svelte:head>

<PageHeader title="Privacy Policy" subtitle="Last updated: May 2026" />

<div class="content">

    <section>
        <h2>What we collect</h2>
        <p>When you use the contact form, we collect your <strong>name</strong>, <strong>email address</strong>, and <strong>message</strong>. No account is created. No password is stored.</p>
    </section>

    <section>
        <h2>Where it goes</h2>
        <p>Contact form submissions are forwarded to <strong>Google Forms</strong> (stored by Google under their privacy policy) and trigger a <strong>Discord webhook</strong> notification to a private server. Your message is not sold, shared with third parties, or used for marketing.</p>
    </section>

    <section>
        <h2>Cookies</h2>
        <p>This site sets a <code>session_id</code> cookie only for authenticated admin users. Public visitors receive no cookies, no tracking pixels, and no analytics scripts.</p>
    </section>

    <section>
        <h2>Third-party services</h2>
        <ul>
            <li><strong>Google</strong> — contact form data is stored in Google Forms</li>
            <li><strong>Discord</strong> — contact form notifications are delivered via webhook</li>
            <li><strong>Cloudflare</strong> — DNS, CDN, and bot protection (Turnstile). Cloudflare may process IP addresses and request metadata per their privacy policy.</li>
        </ul>
    </section>

    <section>
        <h2>Your rights</h2>
        <p>To request deletion of any data submitted via the contact form, email <a href="mailto:me@doncez.art">me@doncez.art</a>. We will comply within 30 days.</p>
    </section>

    <section>
        <h2>Contact</h2>
        <p>Questions about this policy? <a href="/contact">Get in touch</a> or email <a href="mailto:me@doncez.art">me@doncez.art</a>.</p>
    </section>

</div>

<style>
    .content {
        max-width: 60rem;
        margin: 0 auto;
        padding: 0 var(--container-pad) var(--space-4xl);
        display: flex;
        flex-direction: column;
        gap: var(--space-2xl);
    }

    section {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
    }

    h2 {
        font-family: var(--font-display);
        font-size: var(--text-xl);
        font-weight: 600;
        color: var(--color-text-primary);
    }

    p, li {
        font-family: var(--font-body);
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        line-height: 1.7;
    }

    ul {
        padding-left: var(--space-xl);
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }

    strong {
        color: var(--color-text-primary);
        font-weight: 500;
    }

    code {
        font-family: monospace;
        font-size: 0.9em;
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.08);
        padding: 0.1em 0.35em;
    }

    a {
        color: var(--color-text-primary);
        text-underline-offset: 3px;
    }
    a:hover {
        opacity: 0.7;
    }
</style>
