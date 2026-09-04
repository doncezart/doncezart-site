// Headless verification of /tools/youtube-card.
// Usage: node scripts/verify-youtube-card.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:6969';
const outDir = '/tmp/opencode/ytc-shots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

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

const card = page.locator('.ycard');
const h0 = await card.evaluate((el) => el.offsetHeight);
record('classic card has height', h0 > 700, `${h0}px`);

await page.screenshot({ path: `${outDir}/1-classic.png` });

// 4. All 6 layouts render without errors
const layouts = [['split', 'Wide Split'], ['stacked', 'Stacked'], ['hero', 'Hero'], ['vertical', 'Vertical'], ['minimal', 'Minimal']];
for (const [key, label] of layouts) {
    await page.click(`.layout-btn:has(.layout-name:text-is("${label}"))`);
    await page.waitForTimeout(900);
    const h = await card.evaluate((el) => el.offsetHeight);
    // hero uses .hr-bg (background-image cover); all others use .yt-thumb
    const hasMedia = await card.evaluate((el) => !!el.querySelector('.yt-thumb') || !!el.querySelector('.hr-bg'));
    record(`layout ${key} renders`, h > 300 && hasMedia, `${h}px`);
    await page.screenshot({ path: `${outDir}/2-${key}.png` });
}

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

// 4b. Vertical: 720px design width and top is NOT clipped in the pane
await page.click('.layout-btn:has(.layout-name:text-is("Vertical"))');
await page.waitForTimeout(600);
const vert = await page.evaluate(() => {
    const pane = document.querySelector('.preview-pane');
    pane.scrollTop = 0;
    pane.scrollLeft = 0;
    const card = document.querySelector('.ycard');
    const pr = pane.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    return { cardW: card.offsetWidth, cardH: card.offsetHeight, topDelta: Math.round(cr.top - pr.top) };
});
record('vertical renders at 720px width', vert.cardW === 720, `${vert.cardW}px`);
record('vertical top visible (no clip)', vert.topDelta >= -2, `top delta ${vert.topDelta}px`);

await page.click('.layout-btn:has(.layout-name:text-is("Classic"))');
await page.waitForTimeout(500);

// 4c. New variables apply
async function setRange(label, value) {
    const field = page.locator('.field', { hasText: label });
    await field.locator('input[type=range]').evaluate((el, v) => {
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
}

const spacingBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.cl-wrap')).gap);
await setRange('Element spacing', 1.5);
await page.waitForTimeout(300);
const spacingAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.cl-wrap')).gap);
record('spacing multiplier applies', spacingBefore !== spacingAfter, `${spacingBefore} -> ${spacingAfter}`);

await setRange('Card radius', 16);
await page.waitForTimeout(300);
const cardRadius = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).borderRadius);
record('card radius applies', cardRadius === '16px', cardRadius);

const padBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).padding);
await setRange('Card padding', 60);
await page.waitForTimeout(300);
const padAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).padding);
record('card padding applies', padBefore !== padAfter, `${padBefore} -> ${padAfter}`);

// touched padding persists across layout switches
await page.click('.layout-btn:has(.layout-name:text-is("Stacked"))');
await page.waitForTimeout(300);
const padStacked = await page.evaluate(() => getComputedStyle(document.querySelector('.ycard')).padding);
record('custom padding persists on layout switch', padStacked.includes('60px'), padStacked);

// hero scrim: default 0.85, configurable
await page.click('.layout-btn:has(.layout-name:text-is("Hero"))');
await page.waitForTimeout(400);
const scrimDefault = await page.evaluate(() => getComputedStyle(document.querySelector('.hr-scrim')).backgroundImage);
record('hero scrim dark by default', scrimDefault.includes('0.85'), scrimDefault.slice(0, 90));
await setRange('Scrim darkness', 50);
await page.waitForTimeout(300);
const scrimTuned = await page.evaluate(() => getComputedStyle(document.querySelector('.hr-scrim')).backgroundImage);
record('scrim darkness configurable', scrimDefault !== scrimTuned && scrimTuned.includes('0.5'), scrimTuned.slice(0, 90));

await page.click('.layout-btn:has(.layout-name:text-is("Classic"))');
await page.waitForTimeout(400);

// 5. Palettes apply
await page.locator('.palette-btn').filter({ hasText: 'YouTube Light' }).click();
await page.waitForTimeout(400);
const lightBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
record('light palette applies', lightBg === 'rgb(255, 255, 255)', lightBg);
await page.screenshot({ path: `${outDir}/3-light.png` });
await page.locator('.palette-btn').filter({ hasText: 'OLED Black' }).click();
await page.waitForTimeout(400);

// 6. Module toggles hide content
const before = await card.evaluate((el) => el.innerText.length);
await page.click('.toggle:has-text("Channel name") input, .toggle >> text=Channel name >> .. >> input').catch(() => {});
// click via label text reliably:
const chk = page.locator('.toggle', { hasText: 'Channel name' }).locator('input');
await chk.uncheck();
await page.waitForTimeout(300);
const after = await card.evaluate((el) => el.innerText.length);
record('channel toggle removes content', after < before, `${before}→${after}`);
await chk.check();

// 7. Export: real Download button → capture playback download, verify PNG dimensions
await page.locator('.palette-btn').filter({ hasText: 'OLED Black' }).click();
await page.waitForTimeout(400);
await page.locator('.seg-btn:has-text("1x")').click();
const downloadPromise = page.waitForEvent('download');
await page.locator('.btn-download').click();
const download = await downloadPromise;
const dlPath = await download.path();
const pngBuf = await readFile(dlPath ?? '');
// PNG IHDR: bytes 16-19 width, 20-23 height (big-endian)
const w = pngBuf.readUInt32BE(16);
const h = pngBuf.readUInt32BE(20);
record('download button produces PNG', w === 1280, `${w}x${h} (expected 1280x~1000)`);
record('download filename', download.suggestedFilename().startsWith('dQw4w9WgXcQ'), download.suggestedFilename());

// 2x export
const dl2Promise = page.waitForEvent('download');
await page.locator('.seg-btn:has-text("2x")').click();
await page.locator('.btn-download').click();
const dl2 = await dl2Promise;
const pngBuf2 = await readFile(await dl2.path());
record('2x export is 2560px wide', pngBuf2.readUInt32BE(16) === 2560, `w=${pngBuf2.readUInt32BE(16)}`);

await page.screenshot({ path: `${outDir}/4-oled.png` });

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