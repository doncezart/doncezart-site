<script>
    import Button from '$lib/components/ui/Button.svelte';
    import { page } from '$app/state';

    let is404 = $derived(page.status === 404);
</script>

<svelte:head>
    <title>{page.status} — DONCEZART</title>
</svelte:head>

<div class="error-page">
    {#if is404}
        <div class="code">404</div>
        <h1>Nothing here.</h1>
        <p class="message">This page doesn't exist — or not yet. Check the URL or head back.</p>
        <p class="notified">I've been notified of this error.</p>
    {:else}
        <div class="code">{page.status}</div>
        <h1>Something went wrong.</h1>
        <p class="message">{page.error?.message ?? 'An unexpected error occurred.'}</p>
    {/if}

    <div class="actions">
        <Button href="/" variant="solid">Go Home</Button>
        <Button href="/contact" variant="outline">Get in touch</Button>
    </div>
</div>

<style>
    .error-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 70vh;
        text-align: center;
        padding: var(--space-4xl) var(--container-pad);
    }

    .code {
        font-family: var(--font-display);
        font-size: clamp(6rem, 18vw, 13rem);
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0.04em;
        -webkit-text-stroke: 2px var(--color-text-primary);
        color: transparent;
        margin-bottom: var(--space-xl);
    }

    h1 {
        font-family: var(--font-display);
        font-size: var(--text-3xl);
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: var(--space-md);
    }

    .message {
        font-family: var(--font-body);
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        max-width: 36ch;
        line-height: 1.6;
        margin-bottom: var(--space-sm);
    }

    .notified {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        color: var(--color-text-secondary);
        opacity: 0.4;
        margin-bottom: var(--space-2xl);
    }

    .actions {
        display: flex;
        gap: var(--space-md);
        flex-wrap: wrap;
        justify-content: center;
    }
</style>