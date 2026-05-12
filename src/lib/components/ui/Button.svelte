<script>
    let { variant = 'solid', href = null, size = 'md', type = 'button', style = '', children, ...rest } = $props();
</script>

{#if href}
    <a {href} {style} class="btn btn--{variant} btn--{size}" {...rest}>
        {@render children?.()}
    </a>
{:else}
    <button {type} {style} class="btn btn--{variant} btn--{size}" {...rest}>
        {@render children?.()}
    </button>
{/if}

<style>
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 2rem;
        font-family: var(--font-body);
        font-size: var(--text-base);
        font-weight: 400;
        text-decoration: none;
        cursor: pointer;
        border: none;
        border-radius: var(--radius);
        transition:
            background var(--transition-base),
            color var(--transition-base),
            border-color var(--transition-base);
    }

    .btn--solid {
        background: var(--color-text-primary);
        color: var(--color-bg);
        border: var(--border-solid);
    }
    .btn--solid:hover {
        background: var(--color-bg);
        color: var(--color-text-primary);
    }

    .btn--outline {
        background: transparent;
        color: var(--color-text-primary);
        border: var(--border-solid);
    }
    .btn--outline:hover {
        text-decoration: underline;
    }

    .btn--cta {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0 0 0.25rem 0;
        background: none;
        border: none;
        border-bottom: var(--border-width) solid transparent;
        color: var(--color-text-primary);
        font-family: var(--font-display);
        font-size: var(--text-lg);
        font-weight: 600;
        transition: border-color var(--transition-base);
    }
    .btn--cta:hover {
        border-bottom-color: var(--color-text-primary);
    }

    .btn--sm {
        padding: 0.5rem 1.25rem;
        font-size: var(--text-sm);
    }
</style>
