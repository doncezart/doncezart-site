<script>
    let { dark = false, position = 'top-right', children } = $props();
</script>

<span class="badge" class:badge--dark={dark} class:badge--top-left={position === 'top-left'}>
    {@render children?.()}
</span>

<style>
    /* Small pill over media tiles: accent by default, frosted when `dark`. */
    .badge {
        position: absolute;
        top: 0.55rem;
        right: 0.55rem;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.28rem 0.6rem;
        background: var(--accent, #ff2b1f);
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.7rem;
        font-weight: 600;
        line-height: 1.2;
        pointer-events: none;
        border-radius: 999px;
    }
    .badge :global(i) { font-size: 0.9em; }

    .badge--top-left {
        right: auto;
        left: 0.55rem;
    }

    .badge--dark {
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }
</style>
