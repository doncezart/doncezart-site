<script>
    import Navbar from '$lib/components/Navbar.svelte'
    import Footer from '$lib/components/Footer.svelte'
    import '@fortawesome/fontawesome-free/css/all.min.css'
    import { fly } from 'svelte/transition';
    import { page } from '$app/state';
    let { data, children } = $props();

    let isAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>


<svelte:head>
    <script defer src="https://analytics.ceza.ro/script.js" data-website-id="acf6ca2d-5e48-4171-ab60-5dda92cbd17e"></script>
</svelte:head>

{#if !isAdmin}
    <Navbar discoverySections={data.discoverySections ?? []} />
{/if}
{#if isAdmin}
    <div class="slot admin-reset">
        {@render children?.()}
    </div>
{:else}
    {#key data.pathname}
        <div class="slot crt" in:fly={{ y: 10, duration: 180, opacity: 0 }}>
            {@render children?.()}
        </div>
    {/key}
    <Footer discoverySections={data.discoverySections ?? []} />
{/if}

<style>
/* .crt::before {
    content: " ";
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    z-index: 2;
    background-size: 100% 2px, 3px 100%;
    pointer-events: none;
}

@keyframes flicker {
    0% {
    opacity: 0.27861;
    }
    5% {
    opacity: 0.34769;
    }
    10% {
    opacity: 0.23604;
    }
    15% {
    opacity: 0.10626;
    }
    20% {
    opacity: 0.18128;
    }
    25% {
    opacity: 0.10626;
    }
    30% {
    opacity: 0.18128;
    }
    35% {
    opacity: 0.23604;
    }
}

.crt::after {
    content: " ";
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: rgba(18, 16, 16, 0.1);
    opacity: 0;
    z-index: 2;
    pointer-events: none;
    animation: flicker 0.15s infinite;
} */
 
:global(html) {
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    scrollbar-color: #444 transparent;
}

:global(::-webkit-scrollbar) {
    width: 6px;
}

:global(::-webkit-scrollbar-track) {
    background: transparent;
}

:global(::-webkit-scrollbar-thumb) {
    background: #444;
    border-radius: 3px;
}

:global(::-webkit-scrollbar-thumb:hover) {
    background: #666;
}

:global(body) {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.slot {
    flex: 1;
    padding: 0;
}
.admin-reset {
    padding: 0;
    max-width: none;
}
</style>