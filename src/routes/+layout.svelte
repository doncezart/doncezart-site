<script>
    import Navbar from '$lib/components/Navbar.svelte'
    import Footer from '$lib/components/Footer.svelte'
    import '@fortawesome/fontawesome-free/css/all.min.css'
    import { slide } from 'svelte/transition';
    import { page } from '$app/state';
    let { data, children } = $props();

    let isAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>


{#if !isAdmin}
    <Navbar />
{/if}
{#if isAdmin}
    <div class="slot admin-reset">
        {@render children?.()}
    </div>
{:else}
    {#key data.pathname}
        <div class="slot crt" transition:slide>
            {@render children?.()}
        </div>
    {/key}
    <Footer />
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
 
.slot {
    margin: 0;
    margin-left: auto;
    margin-right: auto;
    padding: 2rem;
    max-width: 1920px;
    padding-top: 0;
}
.admin-reset {
    padding: 0;
    max-width: none;
}
</style>