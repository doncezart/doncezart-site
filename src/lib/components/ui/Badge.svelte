<script>
    let { dark = false, position = 'top-right', children } = $props();
</script>

<span class="badge" class:badge--dark={dark} class:badge--top-left={position === 'top-left'}>
    {@render children?.()}
</span>

<style>
    .badge {
        position: absolute;
        top: var(--space-sm);
        right: var(--space-sm);
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.2rem 0.5rem;
        background: var(--color-accent);
        color: var(--color-text-primary);
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: 600;
        pointer-events: none;
        border-radius: var(--radius);
    }

    .badge--top-left {
        right: auto;
        left: var(--space-sm);
    }

    .badge--dark {
        background: rgba(0, 0, 0, 0.7);
        border: var(--border);
    }
</style>
