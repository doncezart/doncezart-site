<script>
    const year = new Date().getFullYear();

    const socials = [
        { name: 'Discord', icon: 'fa-brands fa-discord', href: 'https://discord.gg/aJUAyFVyqM' },
        { name: 'X', icon: 'fa-brands fa-x-twitter', href: 'https://x.com/doncezart' },
        { name: 'Instagram', icon: 'fa-brands fa-instagram', href: 'https://instagram.com/doncezart' },
        { name: 'YouTube', icon: 'fa-brands fa-youtube', href: 'https://youtube.com/@doncezart' },
        { name: 'TikTok', icon: 'fa-brands fa-tiktok', href: 'https://tiktok.com/@doncezart' }
    ];
</script>

<footer class="footer">
    <div class="footer-inner">

        <!-- Left: logo + motto -->
        <div class="footer-left">
            <a href="/" class="footer-logo-link">
                <img src="/logo-long.svg" alt="DONCEZART" class="footer-logo" />
            </a>
            <p class="footer-motto">The Swiss army knife of the creative world.</p>
        </div>

        <!-- Right: link columns -->
        <nav class="footer-right" aria-label="Footer navigation">
            <div class="footer-col">
                <span class="footer-col-heading">Work</span>
                <a href="/" class="footer-link">Portfolio</a>
                <a href="/work" class="footer-link">Case Studies</a>
                <a href="/testimonials" class="footer-link">Testimonials</a>
                <a href="/assets" class="footer-link">Assets</a>
            </div>
            <div class="footer-col">
                <span class="footer-col-heading">Discovery</span>
                <a href="/discovery/curated-resources" class="footer-link">Curated Resources</a>
                <a href="/discovery/tutorials" class="footer-link">Tutorials</a>
                <a href="/discovery/pure-art" class="footer-link">Pure Art</a>
                <a href="/discovery/videography" class="footer-link">Videography</a>
            </div>
            <div class="footer-col">
                <span class="footer-col-heading">Connect</span>
                <a href="/contact" class="footer-link">Contact</a>
                <a href="/socials" class="footer-link">Socials</a>
                <a href="/privacy" class="footer-link">Privacy Policy</a>
                <a href="https://discord.gg/aJUAyFVyqM" class="footer-link" target="_blank" rel="noopener noreferrer">Discord Server</a>
            </div>
        </nav>

    </div>

    <!-- Bottom bar: copyright left, socials right -->
    <div class="footer-bottom">
        <span class="footer-copy">© {year} DONCEZART. All rights reserved.</span>
        <div class="footer-socials">
            {#each socials as social}
                <a
                    href={social.href}
                    class="social-icon"
                    title={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <i class={social.icon}></i>
                </a>
            {/each}
        </div>
    </div>
</footer>

<style>
    .footer {
        border-top: var(--border);
        padding: var(--space-2xl) var(--container-pad);
        max-width: var(--container-max);
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
    }

    .footer-inner {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--space-3xl);
        align-items: start;
    }

    /* ── Left column ── */
    .footer-left {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }

    .footer-logo-link {
        display: block;
        margin-bottom: var(--space-xs);
    }

    .footer-logo {
        height: 2.5rem;
        width: auto;
        display: block;
    }

    .footer-motto {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        margin-bottom: var(--space-md);
        line-height: 1.5;
    }

    .footer-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: var(--space-xl);
        padding-top: var(--space-md);
        border-top: var(--border);
        gap: var(--space-md);
        flex-wrap: wrap;
    }

    .footer-copy {
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        opacity: 0.5;
        white-space: nowrap;
    }

    .footer-socials {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }

    .social-icon {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
        text-decoration: none;
        opacity: 0.6;
        transition: opacity var(--transition-fast), color var(--transition-fast);
    }
    .social-icon:hover {
        color: var(--color-text-primary);
        opacity: 1;
    }

    /* ── Right column ── */
    .footer-right {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2xl);
        flex-wrap: wrap;
    }

    .footer-col {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
    }

    .footer-col-heading {
        font-family: var(--font-display);
        font-size: var(--text-xs);
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.5;
        margin-bottom: var(--space-sm);
        display: block;
    }

    .footer-link {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        text-decoration: none;
        transition: color var(--transition-fast);
        padding: 0.2rem 0;
        white-space: nowrap;
    }
    .footer-link:hover {
        color: var(--color-text-primary);
    }

    /* ── Responsive ── */
    @media (max-width: 666px) {
        .footer-inner {
            grid-template-columns: 1fr;
            gap: var(--space-xl);
        }
        .footer-right {
            justify-content: flex-start;
        }
    }
</style>
