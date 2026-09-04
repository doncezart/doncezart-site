<script>
    import html2canvas from 'html2canvas';

    /** @type {{ cardEl: HTMLElement | null, filename: string }} */
    let { cardEl, filename } = $props();

    const FORMATS = [
        { id: 'png', label: 'PNG' },
        { id: 'jpeg', label: 'JPEG' },
        { id: 'webp', label: 'WebP' }
    ];
    const SIZES = [
        { id: 1, label: '1x' },
        { id: 2, label: '2x' },
        { id: 3, label: '3x' }
    ];

    let format = $state('png');
    let size = $state(2);
    let exporting = $state(false);
    let copied = $state(false);
    let error = $state('');

    async function capture() {
        if (!cardEl) throw new Error('Card not ready.');
        await document.fonts.ready;

        // html2canvas measures the element via getBoundingClientRect, which is
        // shrunk by the preview's ancestor transform: scale(). Mount the card on
        // the body outside the scaled tree so the capture box is the true 1280px
        // layout size, then restore it to its original slot.
        const holder = document.createElement('div');
        holder.style.cssText = `position:fixed;left:-100000px;top:0;width:${cardEl.offsetWidth}px`;
        document.body.appendChild(holder);
        const originalParent = cardEl.parentElement;
        const nextSibling = cardEl.nextSibling;
        holder.appendChild(cardEl);

        // JPEG has no alpha channel — render against white instead of transparent black.
        const backgroundColor = format === 'jpeg' ? '#ffffff' : null;
        try {
            return await html2canvas(cardEl, { scale: size, backgroundColor, useCORS: true });
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
        } catch (e) {
            console.error(e);
            error = 'Export failed — try a different size or layout.';
        } finally {
            exporting = false;
        }
    }

    async function copy() {
        if (!cardEl || exporting) return;
        exporting = true;
        error = '';
        try {
            await document.fonts.ready;
            const canvas = await html2canvas(cardEl, { scale: 1, backgroundColor: null, useCORS: true });
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        } catch (e) {
            console.error(e);
            error = 'Clipboard blocked by the browser — use Download instead.';
        } finally {
            exporting = false;
        }
    }
</script>

<div class="export-bar">
    <div class="group">
        <span class="group-label">Format</span>
        <div class="seg">
            {#each FORMATS as f}
                <button
                    class="seg-btn"
                    class:active={format === f.id}
                    onclick={() => (format = f.id)}
                >{f.label}</button>
            {/each}
        </div>
    </div>

    <div class="group">
        <span class="group-label">Size</span>
        <div class="seg">
            {#each SIZES as s}
                <button
                    class="seg-btn"
                    class:active={size === s.id}
                    onclick={() => (size = s.id)}
                    title={s.id === 1 ? '1280px wide' : s.id === 2 ? '2560px wide' : '3840px wide'}
                >{s.label}</button>
            {/each}
        </div>
    </div>

    <button class="btn-download" disabled={exporting} onclick={download}>
        <i class="fa-solid fa-download"></i>
        {exporting ? 'Rendering…' : 'Download'}
    </button>
    <button class="btn-copy" disabled={exporting} onclick={copy}>
        <i class="fa-solid fa-clipboard"></i>
        {copied ? 'Copied!' : 'Copy'}
    </button>

    {#if error}
        <span class="export-error">{error}</span>
    {/if}
</div>

<style>
    .export-bar {
        display: flex;
        align-items: center;
        gap: var(--space-lg);
        flex-wrap: wrap;
        padding: var(--space-md) 0;
        border-top: var(--border);
        margin-top: var(--space-md);
    }

    .group {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }

    .group-label {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
        opacity: 0.7;
    }

    .seg {
        display: flex;
        border: var(--border);
    }
    .seg-btn {
        background: transparent;
        border: 0;
        color: var(--color-text-secondary);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        padding: 0.35rem 0.8rem;
        cursor: pointer;
        transition: background var(--transition-fast), color var(--transition-fast);
    }
    .seg-btn + .seg-btn {
        border-left: var(--border);
    }
    .seg-btn:hover {
        color: var(--color-text-primary);
    }
    .seg-btn.active {
        background: var(--color-text-primary);
        color: #000;
    }

    .btn-download,
    .btn-copy {
        border: 0;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 600;
        padding: 0.5rem 1.2rem;
        cursor: pointer;
        transition: opacity var(--transition-fast);
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
        flex-basis: 100%;
    }
</style>