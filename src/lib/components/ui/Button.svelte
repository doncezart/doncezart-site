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
    /* Same family as the shell's .btn: 4px corners, white solid, frosted
       outline, hover warms to the accent. Repeated classes keep these ahead
       of the shell's global .btn rules. */
    .btn.btn.btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 0.95rem 1.6rem;
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-weight: 600;
        line-height: 1.2;
        text-decoration: none;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s, color 0.2s, border-color 0.2s;
    }

    .btn.btn.btn--solid {
        background: #fff;
        color: #000;
        border: 1px solid #fff;
    }
    .btn.btn.btn--solid:hover {
        background: var(--accent, #ff2b1f);
        border-color: var(--accent, #ff2b1f);
        color: #fff;
    }

    .btn.btn.btn--outline {
        background: rgba(0, 0, 0, 0.35);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.28);
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
    }
    .btn.btn.btn--outline:hover {
        background: var(--accent, #ff2b1f);
        border-color: var(--accent, #ff2b1f);
        color: #fff;
    }

    .btn.btn.btn--cta {
        gap: 0.6rem;
        padding: 0 0 0.25rem;
        background: none;
        border: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 0;
        color: #fff;
        font-family: var(--font-display);
        font-size: 1.05rem;
        font-weight: 600;
    }
    .btn.btn.btn--cta :global(i) { font-size: 0.8em; color: var(--accent, #ff2b1f); transition: transform 0.2s; }
    .btn.btn.btn--cta:hover {
        background: none;
        color: #fff;
        border-color: var(--accent, #ff2b1f);
    }
    .btn.btn.btn--cta:hover :global(i) { transform: translateX(3px); }

    .btn.btn.btn--sm {
        padding: 0.55rem 1rem;
        font-size: 0.85rem;
    }
    .btn.btn.btn--cta.btn--sm { padding: 0 0 0.2rem; }
</style>
