<script>
	import Seo from '$lib/components/Seo.svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
</script>

<Seo title="Privacy Policy" description="How DONCEZART handles your data." />

<PageHeader eyebrow="Legal" title="Privacy Policy" subtitle="Last updated: November 2026" />

<div class="content">

    <section>
        <h2>What we collect</h2>
        <p>When you use the contact form, we collect your <strong>name</strong>, <strong>email address</strong> and <strong>message</strong>, plus the optional <strong>link</strong> and <strong>topics</strong> you choose. No account is created. No password is stored.</p>
    </section>

    <section>
        <h2>Where it goes</h2>
        <p>Contact form submissions are forwarded to <strong>Google Forms</strong> (stored by Google under their privacy policy) and trigger a <strong>Discord webhook</strong> notification to a private server. You get one automatic confirmation email at the address you entered, sent through <strong>Purelymail</strong>; it does not repeat your message. Your message is not sold, shared with third parties, or used for marketing.</p>
    </section>

    <section>
        <h2>Cookies</h2>
        <p>This site sets a <code>session_id</code> cookie only for authenticated admin users. Public visitors receive no cookies, no tracking pixels, and no analytics scripts.</p>
    </section>

    <section>
        <h2>Third-party services</h2>
        <ul>
            <li><strong>Google</strong>: contact form data is stored in Google Forms</li>
            <li><strong>Discord</strong>: contact form notifications are delivered via webhook</li>
            <li><strong>Purelymail</strong>: sends the confirmation email after you use the contact form</li>
            <li><strong>Cloudflare</strong>: DNS, CDN, and bot protection (Turnstile). Cloudflare may process IP addresses and request metadata per their privacy policy.</li>
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
    /* One frosted reading column; sections split by hairlines. */
    .content {
        display: flex;
        flex-direction: column;
        max-width: 46rem;
        margin: 0 auto var(--space-4xl);
        padding: clamp(1.5rem, 4vw, 2.75rem);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(14, 14, 14, 0.55);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
    }
    @media (max-width: 800px) {
        .content { margin-inline: clamp(1.25rem, 4vw, 3rem); }
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1.5rem 0;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    section:first-child { padding-top: 0; border-top: 0; }
    section:last-child { padding-bottom: 0; }

    h2 {
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 600;
        color: #fff;
    }
    p, li {
        font-family: var(--font-body);
        font-size: 0.98rem;
        line-height: 1.7;
        color: var(--muted);
    }
    ul {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0;
        padding-left: 1.2rem;
    }
    li::marker { color: var(--accent); }
    strong { color: #fff; font-weight: 600; }
    code {
        padding: 0.1em 0.4em;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        font-family: monospace;
        font-size: 0.88em;
        color: #fff;
    }
    a {
        color: #fff;
        text-decoration: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        transition: border-color 0.2s;
    }
    a:hover { border-color: var(--accent); }
</style>
