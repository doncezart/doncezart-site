<script>
    import { captureElement } from '../capture.js';

    /** @type {{ cardEl: HTMLElement | null, filename: string, tool?: string, onexport?: (e: { format: string, action: 'download'|'copy' }) => void }} */
    let { cardEl, filename, tool = 'youtube-card', onexport } = $props();

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
        // JPEG has no alpha channel — render against white instead of transparent black.
        return captureElement(cardEl, backgroundColor ?? (format === 'jpeg' ? '#ffffff' : null));
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
            window.umami?.track('tool-export', { tool, format, action: 'download' });
            onexport?.({ format, action: 'download' });
        } catch (e) {
            console.error(e);
            error = 'Export failed. Try a different layout.';
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
            window.umami?.track('tool-export', { tool, format: 'png', action: 'copy' });
            onexport?.({ format: 'png', action: 'copy' });
        } catch (e) {
            console.error(e);
            error = 'Clipboard blocked by the browser. Use Download instead.';
        } finally {
            exporting = false;
        }
    }
</script>

<div class="export-bar">
    <div class="export-row formats" role="group" aria-label="Export format">
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
        <button class="btn btn-sm btn-download" disabled={exporting} onclick={download}>
            <i class="fa-solid fa-download"></i>
            {exporting ? 'Rendering…' : 'Download'}
        </button>
        <button class="btn btn-ghost btn-sm btn-copy" disabled={exporting} onclick={copy}>
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
        gap: 0.75rem;
        flex: 1;
    }

    .export-row {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
    .export-row > button {
        flex: 1 1 0;
        min-width: 0;
        white-space: nowrap;
    }

    /* Format picker: one pill track with a red-tinted selected segment */
    .formats {
        gap: 0.25rem;
        padding: 0.25rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
        flex-wrap: nowrap;
    }
    .btn-action {
        padding: 0.42rem 0.9rem;
        border: 1px solid transparent;
        border-radius: 999px;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        font-family: var(--font-body);
        font-size: 0.82rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, color 0.2s, border-color 0.2s;
    }
    .btn-action:hover { color: #fff; }
    .btn-action.active {
        color: #fff;
        background: rgba(255, 43, 31, 0.16);
        border-color: rgba(255, 43, 31, 0.55);
    }

    /* Download / Copy use the site's .btn / .btn-ghost (LandingShell) */
    .export-row .btn-download,
    .export-row .btn-copy {
        font-family: var(--font-body);
        cursor: pointer;
    }
    .export-row .btn-download:disabled,
    .export-row .btn-copy:disabled {
        opacity: 0.5;
        cursor: progress;
    }

    .export-error {
        font-family: var(--font-body);
        font-size: 0.78rem;
        color: #ff8a80;
    }
</style>
