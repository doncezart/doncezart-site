<script>
    import html2canvas from 'html2canvas';

    /** @type {{ cardEl: HTMLElement | null, filename: string }} */
    let { cardEl, filename } = $props();

    const FORMATS = [
        { id: 'png', label: 'PNG' },
        { id: 'jpeg', label: 'JPEG' },
        { id: 'webp', label: 'WebP' }
    ];

    let format = $state('png');
    let exporting = $state(false);
    let copied = $state(false);
    let error = $state('');

    async function capture(backgroundColor = null) {
        if (!cardEl) throw new Error('Card not ready.');
        await document.fonts.ready;

        // html2canvas measures the element via getBoundingClientRect, which is
        // shrunk by the preview's ancestor transform: scale(). Mount the card on
        // the body outside the scaled tree so the capture box is the true layout
        // size, then restore it to its original slot.
        const holder = document.createElement('div');
        holder.style.cssText = `position:fixed;left:-100000px;top:0;width:${cardEl.offsetWidth}px`;
        document.body.appendChild(holder);
        const originalParent = cardEl.parentElement;
        const nextSibling = cardEl.nextSibling;
        holder.appendChild(cardEl);

        // JPEG has no alpha channel — render against white instead of transparent black.
        const bg = backgroundColor ?? (format === 'jpeg' ? '#ffffff' : null);
        try {
            return await html2canvas(cardEl, { scale: 1, backgroundColor: bg, useCORS: true });
        } finally {
            if (originalParent) {
                originalParent.insertBefore(cardEl, nextSibling);
            }
            holder.remove();
        }
    }

    async function download() {
        if (!cardEl || exporting) return;
        exporting = true;
        error = '';
        try {
            const canvas = await capture();
            const mime = `image/${format}`;
            const blob = await new Promise((r) => canvas.toBlob(r, mime, format === 'jpeg' ? 0.92 : undefined));
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${filename}.${format === 'jpeg' ? 'jpg' : format}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
            window.umami?.track('tool-export', { tool: 'youtube-card', format, action: 'download' });
        } catch (e) {
            console.error(e);
            error = 'Export failed — try a different layout.';
        } finally {
            exporting = false;
        }
    }

    async function copy() {
        if (!cardEl || exporting) return;
        exporting = true;
        error = '';
        try {
            // Same mount-out capture as Download: PNG at the true card size.
            const canvas = await capture(null);
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            copied = true;
            setTimeout(() => (copied = false), 2000);
            window.umami?.track('tool-export', { tool: 'youtube-card', format: 'png', action: 'copy' });
        } catch (e) {
            console.error(e);
            error = 'Clipboard blocked by the browser — use Download instead.';
        } finally {
            exporting = false;
        }
    }
</script>

<div class="export-bar">
    <div class="export-row">
        <button
            class="btn-action"
            class:active={format === 'png'}
            onclick={() => (format = 'png')}
        >PNG</button>
        <button
            class="btn-action"
            class:active={format === 'jpeg'}
            onclick={() => (format = 'jpeg')}
        >JPEG</button>
        <button
            class="btn-action"
            class:active={format === 'webp'}
            onclick={() => (format = 'webp')}
        >WebP</button>
    </div>

    <div class="export-row">
        <button class="btn-download" disabled={exporting} onclick={download}>
            <i class="fa-solid fa-download"></i>
            {exporting ? 'Rendering…' : 'Download'}
        </button>
        <button class="btn-copy" disabled={exporting} onclick={copy}>
            <i class="fa-solid fa-clipboard"></i>
            {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
    </div>

    {#if error}
        <span class="export-error">{error}</span>
    {/if}
</div>

<style>
    .export-bar {
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
        flex: 1;
    }

    .export-row {
        display: flex;
        gap: var(--space-xs);
        flex-wrap: wrap;
    }
    .export-row > button {
        flex: 1 1 0;
        min-width: 0;
        white-space: nowrap;
    }

    .btn-action {
        background: transparent;
        border: var(--border);
        color: var(--color-text-secondary);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        padding: 0.4rem 0.9rem;
        cursor: pointer;
        transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
    }
    .btn-action:hover {
        color: var(--color-text-primary);
    }
    .btn-action.active {
        background: var(--color-text-primary);
        border-color: var(--color-text-primary);
        color: #000;
    }

    .btn-download,
    .btn-copy {
        border: 0;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 600;
        padding: 0.5rem 1.1rem;
        cursor: pointer;
        transition: opacity var(--transition-fast);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
    }
    .btn-download {
        background: var(--color-text-primary);
        color: #000;
    }
    .btn-copy {
        background: transparent;
        color: var(--color-text-primary);
        border: var(--border-solid);
    }
    .btn-download:hover,
    .btn-copy:hover {
        opacity: 0.8;
    }
    .btn-download:disabled,
    .btn-copy:disabled {
        opacity: 0.4;
        cursor: wait;
    }

    .export-error {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        color: var(--color-accent);
    }
</style>