import html2canvas from 'html2canvas';

/**
 * Render a card element to a canvas at its true layout size.
 *
 * html2canvas measures via getBoundingClientRect, which is shrunk by any
 * ancestor transform: scale() (the previews scale cards to fit). So the
 * element is mounted on the body, outside the scaled tree, for the capture
 * and put back in its original slot afterwards.
 *
 * @param {HTMLElement} el
 * @param {string|null} backgroundColor  null keeps transparency (PNG/WebP)
 */
export async function captureElement(el, backgroundColor = null) {
    if (!el) throw new Error('Card not ready.');
    await document.fonts.ready;
    const holder = document.createElement('div');
    holder.style.cssText = `position:fixed;left:-100000px;top:0;width:${el.offsetWidth}px`;
    document.body.appendChild(holder);
    const parent = el.parentElement;
    const next = el.nextSibling;
    holder.appendChild(el);
    try {
        return await html2canvas(el, { scale: 1, backgroundColor, useCORS: true });
    } finally {
        if (parent) parent.insertBefore(el, next);
        holder.remove();
    }
}

/** Canvas → Blob. JPEG has no alpha, so callers capture it on white. */
export function canvasBlob(canvas, format = 'png') {
    return new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, format === 'jpeg' ? 0.92 : undefined));
}
