// Headless verification of /tools/youtube-card.
// Usage: node scripts/verify-youtube-card.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:6969';
const outDir = '/tmp/opencode/ytc-shots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    permissions: ['clipboard-read', 'clipboard-write']
});
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
const badResponses = [];
page.on('console', (msg) => {
    if (msg.type() === 'error') {
        const loc = msg.location();
        consoleErrors.push(`${msg.text()} @ ${loc.url}:${loc.lineNumber}`);
    }
});
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('response', (res) => { if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`); });

const results = [];
function record(name, ok, extra = '') {
    results.push({ name, ok, extra });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
}

// 1. Tool page loads
await page.goto(`${base}/tools/youtube-card`, { waitUntil: 'networkidle' });
record('tool page loads', (await page.title()).includes('YouTube Card Generator'));

// 2. Invalid URL error path
await page.fill('.url-input', 'notaurl');
await page.click('.gen-btn');
await page.waitForSelector('.error-msg', { timeout: 8000 });
record('invalid URL shows inline error', true);

// 3. Valid URL → card renders
await page.fill('.url-input', 'https://youtu.be/dQw4w9WgXcQ');
await page.click('.gen-btn');
await page.waitForSelector('.ycard', { timeout: 15000 });
// Wait for thumbnail bg to resolve + card height to settle
await page.waitForFunction(() => document.querySelector('.ycard')?.offsetHeight > 100, null, { timeout: 15000 });
await page.waitForTimeout(1500);
record('video fetch + card render', true);

// Scroll-to-results animation
const scrollY = await page.evaluate(() => window.scrollY);
record('page scrolls to tool containers', scrollY > 0, `scrollY=${scrollY}`);

const card = page.locator('.ycard');
const h0 = await card.evaluate((el) => el.offsetHeight);
record('classic card has height', h0 > 700, `${h0}px`);

await page.screenshot({ path: `${outDir}/1-classic.png` });

// 4. All 6 layouts render without errors
const layouts = [
    ['split', 'Wide Split'], ['stacked', 'Stacked'], ['hero', 'Hero'],
    ['underlay', 'Underlay'], ['compact', 'Compact']
];
for (const [key, label] of layouts) {
    await page.click(`.layout-btn:has(.layout-name:text-is("${label}"))`);
    await page.waitForTimeout(900);
    const h = await card.evaluate((el) => el.offsetHeight);
    // hero/underlay use a cover background; all others use .yt-thumb
    const hasMedia = await card.evaluate((el) => !!el.querySelector('.yt-thumb') || !!el.querySelector('.hr-bg') || !!el.querySelector('.ul-bg'));
    record(`layout ${key} renders`, h > 300 && hasMedia, `${h}px`);
    await page.screenshot({ path: `${outDir}/2-${key}.png` });
}

// 4a2. Underlay: title below the image; channel + meta stay overlaid on it
await page.click('.layout-btn:has(.layout-name:text-is("Underlay"))');
await page.waitForTimeout(600);
const underlay = await page.evaluate(() => {
    const card = document.querySelector('.ycard');
    return {
        titleBelow: !!card.querySelector('.ul-title-bar .yt-title'),
        titleOnImg: !!card.querySelector('.ul-overlay .yt-title'),
        channelOnImg: !!card.querySelector('.ul-overlay .yt-channel'),
        metaOnImg: !!card.querySelector('.ul-overlay .yt-meta'),
        scrim: !!card.querySelector('.ul-scrim')
    };
});
record('underlay: title below image (not overlaid)', !!(underlay.titleBelow && !underlay.titleOnImg), JSON.stringify(underlay));
record('underlay: channel/meta stay on image', !!(underlay.channelOnImg && underlay.metaOnImg), JSON.stringify(underlay));

// 4a3. Compact: channel row and avatar are never rendered
await page.click('.layout-btn:has(.layout-name:text-is("Compact"))');
await page.waitForTimeout(600);
const compact = await page.evaluate(() => {
    const card = document.querySelector('.ycard');
    return { channel: !!card.querySelector('.yt-channel'), avatar: !!card.querySelector('.yt-avatar') };
});
record('compact: no channel/avatar', !compact.channel && !compact.avatar, JSON.stringify(compact));

// Back to classic before further checks
await page.click('.layout-btn:has(.layout-name:text-is("Classic"))');
await page.waitForTimeout(500);

// 4a. Preview is smaller: visual card width is capped, pane height capped
const previewDims = await page.evaluate(() => {
    const scaled = document.querySelector('.preview-scaled');
    const pane = document.querySelector('.preview-pane');
    return { visualW: Math.round(scaled.getBoundingClientRect().width), paneH: pane.clientHeight };
});
record('preview much smaller (classic < 560px visual)', previewDims.visualW <= 560, `${previewDims.visualW}px wide`);
record('preview pane height capped', previewDims.paneH <= 480, `${previewDims.paneH}px`);

// 4a4. Preview background picker: dropdown, palette colors, custom color
await page.click('.preview-bg-btn');
await page.waitForSelector('.preview-bg-menu');
const bgOptCount = await page.locator('.bg-opt').count();
record('preview bg menu opens', bgOptCount >= 6, `${bgOptCount} options`);
await page.locator('.bg-opt:has-text("OLED Black")').click();
await page.waitForTimeout(200);
const paneBg = await page.evaluate(() => document.querySelector('.preview-pane').style.background);
record('preview bg palette color applies', paneBg.includes('rgb(0, 0, 0)'), paneBg);
await page.click('.preview-bg-btn');
await page.locator('.bg-color-input').evaluate((el) => {
    el.value = '#123456';
    el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
const paneBg2 = await page.evaluate(() => document.querySelector('.preview-pane').style.background);
record('preview bg custom color applies', paneBg2.includes('18, 52, 86'), paneBg2);
// restore default checkerboard for later screenshots
await page.click('.preview-bg-btn');
await page.locator('.bg-opt:has-text("Checkerboard")').click();
await page.waitForTimeout(100);

// 4b. Data API live (YOUTUBE_API_KEY configured): full data, no fallback notice
const apiData = await page.evaluate(() => {
    const card = document.querySelector('.ycard');
    return {
        duration: card.querySelector('.yt-duration')?.innerText ?? null,
        avatar: !!card.querySelector('.yt-avatar'),
        meta: card.querySelector('.yt-meta')?.innerText ?? null,
        noteCount: document.querySelectorAll('.api-note').length
    };
});
record('data API provides duration', apiData.duration === '3:34', apiData.duration ?? 'missing');
record('data API provides channel avatar', apiData.avatar, '');
record('data API provides views/subscribers/date meta', (apiData.meta ?? '').includes('views') && (apiData.meta ?? '').includes('subscribers'), apiData.meta ?? 'missing');
record('no fallback notice when API works', apiData.noteCount === 0, `${apiData.noteCount} notice(s)`);

// 4b2. Avatar actually loads (not just an element with a src)
const avatarLoaded = await page.evaluate(() => {
    const img = document.querySelector('.yt-avatar');
    return img ? img.complete && img.naturalWidth > 0 : false;
});
record('avatar image actually loads', avatarLoaded, '');

// 4c. Variables via SnapSlider pointer drags
async function dragSlider(label, targetValue) {
    const field = page.locator('.field', { hasText: label });
    const track = field.locator('.snap .track');
    const bounds = await track.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = el.closest('.hitbox');
        return {
            min: +hit.getAttribute('aria-valuemin'),
            max: +hit.getAttribute('aria-valuemax'),
            left: r.left,
            width: r.width
        };
    });
    const x = bounds.left + bounds.width * ((targetValue - bounds.min) / (bounds.max - bounds.min));
    await track.evaluate((el, cx) => {
        const hitbox = el.closest('.hitbox');
        hitbox.dispatchEvent(new PointerEvent('pointerdown', { clientX: cx, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: cx + 0.1, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: cx + 0.1, bubbles: true }));
    }, x);
    await page.waitForTimeout(350);
}

// Text spacing (title↔channel↔meta) — container still 1280 here, so S = 1
const textGapBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.yt-text')).gap);
await dragSlider('Text spacing', 18); // between notches 16/24 → snaps to 16
const textGapAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.yt-text')).gap);
record('text spacing applies', textGapBefore !== textGapAfter && textGapAfter === '16px', `${textGapBefore} -> ${textGapAfter}`);

// Thumbnail spacing (thumb↔text block, classic uses .cl-wrap)
const thumbGapBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.cl-wrap')).gap);
await dragSlider('Thumbnail spacing', 54); // free value between 48/64
const thumbGapAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.cl-wrap')).gap);
record('thumb spacing applies (classic)', thumbGapBefore !== thumbGapAfter && thumbGapAfter === '54px', `${thumbGapBefore} -> ${thumbGapAfter}`);

await dragSlider('Card radius', 16); // notch
const cardRadius = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).borderRadius);
record('card radius applies', cardRadius === '16px', cardRadius);

// Split wideness: flattens the split card (min-height = width / aspect)
await page.click('.layout-btn:has(.layout-name:text-is("Wide Split"))');
await page.waitForTimeout(500);
const spMinBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.sp-wrap')).minHeight);
await dragSlider('Split wideness', 2.8); // free value between notches 2.4/3.2
const spMinAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.sp-wrap')).minHeight);
record('split wideness adjusts card height', spMinBefore !== spMinAfter && spMinAfter === '457px', `${spMinBefore} -> ${spMinAfter}`);
await page.click('.layout-btn:has(.layout-name:text-is("Classic"))');
await page.waitForTimeout(400);

// Container size (free value 1600 between 1440/1920) — uniform zoom: design px scale ×1.25
await dragSlider('Container size', 1600);
const contW = await card.evaluate((el) => el.offsetWidth);
const contThumbW = await card.evaluate((el) => el.querySelector('.yt-thumb').offsetWidth);
record('container size applies', contW === 1700, `${contW}px (content 1600 + frame ${2 * Math.round(40 * 1.25)})`);
record('content keeps its width at new container size', contThumbW === 1600, `${contThumbW}px`);

// Uniform zoom: thumbnail radius default 24 ×1.25 = 30, card radius 16 (tuned) ×1.25 = 20
const scaledRadiuses = await page.evaluate(() => {
    const card = document.querySelector('.ycard');
    const thumb = card.querySelector('.yt-thumb');
    return {
        thumbR: getComputedStyle(thumb).borderRadius,
        cardR: getComputedStyle(card).borderRadius
    };
});
record('radiuses scale with container (uniform zoom)', scaledRadiuses.thumbR === '30px' && scaledRadiuses.cardR === '20px',
    `thumb ${scaledRadiuses.thumbR} / card ${scaledRadiuses.cardR}`);

// Padding = outer frame that scales with the container: card grows, content width unchanged
await dragSlider('Card padding', 43); // free value (dist 3 from notches 40/48)
const padAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).padding);
const padCardW = await card.evaluate((el) => el.offsetWidth);
const padThumbW = await card.evaluate((el) => el.querySelector('.yt-thumb').offsetWidth);
record('padding applies as outer frame only', padAfter === '54px' && padCardW === 1708 && padThumbW === 1600,
    `frame ${padAfter}, card ${padCardW}px, content ${padThumbW}px`);

// Snap: near-notch values snap, mid-notch values stay free — both scaled ×1.25
await dragSlider('Card padding', 50); // dist 2 from notch 48 → snap
const snapPad = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).padding);
record('slider snaps to notch', snapPad === '60px', snapPad);
await dragSlider('Card padding', 56); // dist 8 from notches → free
const freePad = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).padding);
record('free values reachable between notches', freePad === '70px', freePad);

// tuned values persist across layout switches
await page.click('.layout-btn:has(.layout-name:text-is("Stacked"))');
await page.waitForTimeout(300);
const padStacked = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).padding);
record('custom padding persists on layout switch', padStacked.includes('70px'), padStacked);

// hero scrim: default 0.85, configurable
await page.click('.layout-btn:has(.layout-name:text-is("Hero"))');
await page.waitForTimeout(400);
const scrimDefault = await page.evaluate(() => getComputedStyle(document.querySelector('.hr-scrim')).backgroundImage);
record('hero scrim dark by default', scrimDefault.includes('0.85'), scrimDefault.slice(0, 90));
await dragSlider('Scrim darkness', 50); // notch
const scrimTuned = await page.evaluate(() => getComputedStyle(document.querySelector('.hr-scrim')).backgroundImage);
record('scrim darkness configurable', scrimDefault !== scrimTuned && scrimTuned.includes('0.5'), scrimTuned.slice(0, 90));

await page.click('.layout-btn:has(.layout-name:text-is("Classic"))');
await page.waitForTimeout(400);

// 4d. Numeric readouts: sync with slider, clamp out-of-range, accept manual values
const readout = page.locator('.field', { hasText: 'Card padding' }).locator('input[type=number]');
await dragSlider('Card padding', 53);
record('readout syncs with slider', (await readout.inputValue()) === '53', await readout.inputValue());
await readout.fill('999');
await readout.press('Enter');
await page.waitForTimeout(200);
record('readout clamps to max', (await readout.inputValue()) === '80', await readout.inputValue());
await readout.fill('17');
await readout.blur();
await page.waitForTimeout(200);
record('readout accepts manual value', (await readout.inputValue()) === '17', await readout.inputValue());

// 4e. Slider hitbox: expanded + pointer cursor
const hitCursor = await page.evaluate(() => getComputedStyle(document.querySelector('.hitbox')).cursor);
record('slider hitbox has pointer cursor', hitCursor === 'pointer', hitCursor);

// 5. Palettes apply
await page.locator('.palette-btn').filter({ hasText: 'YouTube Light' }).click();
await page.waitForTimeout(400);
const lightBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
record('light palette applies', lightBg === 'rgb(255, 255, 255)', lightBg);
await page.screenshot({ path: `${outDir}/3-light.png` });
await page.locator('.palette-btn').filter({ hasText: 'OLED Black' }).click();
await page.waitForTimeout(400);

// 6. Module toggles hide content (box grid)
const before = await card.evaluate((el) => el.innerText.length);
const chk = page.locator('.module-btn', { hasText: 'Channel' });
record('module box 2-state', (await chk.getAttribute('aria-checked')) === 'true', 'aria-checked');
await chk.click();
await page.waitForTimeout(300);
const after = await card.evaluate((el) => el.innerText.length);
record('module toggle removes content', after < before && (await chk.getAttribute('aria-checked')) === 'false', `${before}→${after}`);
await chk.click();

// 6b. Verified check colors
await page.locator('.module-btn', { hasText: 'Verified' }).click();
await page.waitForTimeout(250);
await page.locator('.ver-swatch[data-v="accent"]').click();
await page.waitForTimeout(250);
const vBgAccent = await card.evaluate((el) => getComputedStyle(el.querySelector('.yt-verified')).backgroundColor);
record('verified color: accent', vBgAccent === 'rgb(255, 0, 0)', vBgAccent);
await page.locator('.ver-swatch[data-v="white"]').click();
await page.waitForTimeout(250);
const vBgWhite = await card.evaluate((el) => getComputedStyle(el.querySelector('.yt-verified')).backgroundColor);
record('verified color: white', vBgWhite === 'rgb(255, 255, 255)', vBgWhite);
await page.locator('.ver-swatch[data-v="gray"]').click();
await page.waitForTimeout(250);

// 6c. Date formats
const dateSelect = page.locator('.field', { hasText: 'Date format' }).locator('select');
await dateSelect.selectOption('relative');
await page.waitForTimeout(250);
const relMeta = await card.evaluate((el) => el.querySelector('.yt-meta')?.innerText ?? '');
record('date format: relative', relMeta.includes('ago'), relMeta);
await dateSelect.selectOption('absolute');
await page.waitForTimeout(250);
const absMeta = await card.evaluate((el) => el.querySelector('.yt-meta')?.innerText ?? '');
record('date format: absolute (US)', /\w+ \d{1,2}, \d{4}/.test(absMeta), absMeta);

// 7. Export: real Download button → capture playback download, verify PNG dimensions
await page.locator('.palette-btn').filter({ hasText: 'OLED Black' }).click();
await page.waitForTimeout(400);
const expectedExportW = await card.evaluate((el) => el.offsetWidth);
const downloadPromise = page.waitForEvent('download');
await page.locator('.btn-download').click();
const download = await downloadPromise;
const dlPath = await download.path();
const pngBuf = await readFile(dlPath ?? '');
// PNG IHDR: bytes 16-19 width, 20-23 height (big-endian)
const w = pngBuf.readUInt32BE(16);
const h = pngBuf.readUInt32BE(20);
record('download PNG width matches card', w === expectedExportW, `${w}x${h} (card ${expectedExportW})`);
record('download filename', download.suggestedFilename().startsWith('dQw4w9WgXcQ'), download.suggestedFilename());

// JPEG format switch
function jpegDims(buf) {
    let i = 2;
    while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) { i += 2; continue; }
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        }
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
    }
    return null;
}
await page.locator('.btn-action:has-text("JPEG")').click();
await page.waitForTimeout(200);
const dlJpgPromise = page.waitForEvent('download');
await page.locator('.btn-download').click();
const dlJpg = await dlJpgPromise;
const jpgBuf = await readFile(await dlJpg.path());
const jpgD = jpegDims(jpgBuf);
record('JPEG export matches card width', jpgD?.w === expectedExportW, `w=${jpgD?.w} (card ${expectedExportW})`);
record('JPEG filename extension', dlJpg.suggestedFilename().endsWith('.jpg'), dlJpg.suggestedFilename());

// Copy to clipboard
await page.locator('.btn-action:has-text("PNG")').click();
await page.waitForTimeout(200);
await page.locator('.btn-copy').click();
await page.waitForTimeout(1500);
const copyLabel = await page.locator('.btn-copy').innerText();
record('copy to clipboard works', copyLabel.includes('Copied!'), copyLabel);

// The copied PNG must be the true card size (mount-out capture), not a preview-scaled shrink
const clipW = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    for (const it of items) {
        const t = it.types.find((x) => x.startsWith('image/'));
        if (!t) continue;
        const blob = await it.getType(t);
        const buf = new Uint8Array(await blob.arrayBuffer());
        return (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
    }
    return 0;
});
record('copy to clipboard size matches card', clipW === expectedExportW, `${clipW}px vs card ${expectedExportW}px`);

await page.screenshot({ path: `${outDir}/4-oled.png` });

// 8. Navbar Tools dropdown must stay fully on-screen
await page.locator('.dropdown .trigger').first().click();
await page.waitForSelector('.menu');
const ddBox = await page.evaluate(() => {
    const menu = document.querySelector('.menu');
    if (!menu) return null;
    const r = menu.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth };
});
record('tools dropdown stays on screen', !!ddBox && ddBox.left >= 0 && ddBox.right <= ddBox.vw, JSON.stringify(ddBox));
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// 8. Console hygiene (ignore the deliberate invalid-URL 400)
const errs = [...new Set([...consoleErrors, ...pageErrors])]
    .filter((e) => !e.includes('notaurl'));
record('no console/page errors', errs.length === 0, errs.join(' || '));
const bad = badResponses.filter((b) => !b.includes('url=notaurl'));
record('no 4xx/5xx responses (besides deliberate test)', bad.length === 0, bad.slice(0, 5).join(' | '));

// ── Safe-Zone Checker ──
await page.goto(`${base}/tools/safe-zone`, { waitUntil: 'networkidle' });
const szTitle = await page.title();
record('safe-zone page loads', szTitle.includes('Safe-Zone'), szTitle);

// Generate a synthetic 1280×720 PNG in-page → base64 → write to disk → upload it
const filePath = '/tmp/opencode/ytc-shots/test-thumb.png';
const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, '#ff0000');
    g.addColorStop(1, '#0000ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px Arial';
    ctx.fillText('TEST', 100, 300);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
});
const { writeFile } = await import('node:fs/promises');
await writeFile(filePath, Buffer.from(b64, 'base64'));

await page.locator('input[type=file]').setInputFiles(filePath);
await page.waitForTimeout(1200);
const px = await page.evaluate(() => {
    const canvas = document.querySelector('canvas.main-canvas');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlack = 0;
    for (let i = 0; i < data.length; i += 40) {
        if (data[i] || data[i + 1] || data[i + 2]) nonBlack++;
    }
    return { nonBlack, w: canvas.width, h: canvas.height };
});
record('safe-zone canvas draws content', px.nonBlack > 1000, `${px.nonBlack} sampled non-black px, ${px.w}x${px.h}`);

// Toggle an overlay off → canvas re-renders
async function canvasChecksum() {
    return page.evaluate(() => {
        const canvas = document.querySelector('canvas.main-canvas');
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, 1280, 720).data;
        let h = 0;
        for (let i = 0; i < data.length; i += 16) {
            h = (h * 31 + data[i] * 7 + data[i + 1] * 3 + data[i + 2] + data[i + 3]) >>> 0;
        }
        return h;
    });
}
const beforeSum = await canvasChecksum();
await page.locator('.toggle', { hasText: 'Duration badge' }).locator('input').uncheck();
await page.waitForTimeout(300);
const afterSum = await canvasChecksum();
record('overlay toggle re-renders canvas', beforeSum !== afterSum, `checksum ${beforeSum}->${afterSum}`);

// Export annotated PNG
const dlAnnotPromise = page.waitForEvent('download');
await page.locator('.btn-download').click();
const dlAnnot = await dlAnnotPromise;
const annotBuf = await readFile(await dlAnnot.path());
record('safe-zone export is 1280×720 PNG', annotBuf.readUInt32BE(16) === 1280 && annotBuf.readUInt32BE(20) === 720,
    `${annotBuf.readUInt32BE(16)}x${annotBuf.readUInt32BE(20)}`);

await browser.close();
console.log('\n---');
console.log(results.filter((r) => !r.ok).length === 0 ? 'ALL PASS' : `${results.filter((r) => !r.ok).length} FAILURES`);