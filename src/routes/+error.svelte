<script>
    import { page } from '$app/state';
    import Seo from '$lib/components/Seo.svelte';

    let is404 = $derived(page.status === 404);
</script>

<Seo title={is404 ? 'Page not found' : 'Something went wrong'} noindex />

<div class="error-page">
    {#if is404}
        <div class="code reveal" style="--d: 0">404</div>
        <h1 class="reveal" style="--d: 1">Nothing <span class="hot">here.</span></h1>
        <p class="message">This page doesn't exist, or not yet. Check the URL or head back.</p>
    {:else}
        <div class="code">{page.status}</div>
        <h1>Something went wrong.</h1>
        <p class="message">{page.error?.message ?? 'An unexpected error occurred.'}</p>
    {/if}

    <div class="actions">
        <a href="/" class="btn">Go home <i class="fa-solid fa-arrow-right"></i></a>
        <a href="/contact" class="btn btn-ghost">Get in touch</a>
    </div>
</div>

<style>
    .error-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 70vh;
        padding: var(--space-3xl) clamp(1.25rem, 4vw, 3rem);
        text-align: center;
    }
    .code {
        margin-bottom: 1.5rem;
        font-family: var(--font-display);
        font-size: clamp(6rem, 18vw, 13rem);
        font-weight: 600;
        line-height: 1;
        letter-spacing: 0.02em;
        color: transparent;
        -webkit-text-stroke: 2px #fff;
    }
    h1 {
        margin-bottom: 0.9rem;
        font-family: var(--font-display);
        font-size: clamp(2rem, 4vw, 3rem);
        font-weight: 600;
        line-height: 1.05;
        color: #fff;
    }
    h1 .hot { color: var(--accent); }
    .message {
        max-width: 36ch;
        margin-bottom: 2.25rem;
        font-size: 1.02rem;
        line-height: 1.6;
        color: var(--muted);
    }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
</style>
