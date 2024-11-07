<script>
    import Navbar from '$lib/components/Navbar.svelte'
    import '@fortawesome/fontawesome-free/css/all.min.css'
    import { slide } from 'svelte/transition';
    let { data, children } = $props();
</script>


<Navbar />
{#key data.pathname}
    <div class="slot" transition:slide>
        {@render children?.()}
    </div>
{/key}

<style>
.slot {
    margin: 0;
    margin-left: auto;
    margin-right: auto;
    padding: 2rem;
    max-width: 1920px;
    padding-top: 0;
}
</style>