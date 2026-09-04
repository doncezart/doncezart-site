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

// 4. All 8 layouts render without errors
const layouts = [['split', 'Wide Split'], ['stacked', 'Stacked'], ['hero', 'Hero'], ['vertical', 'Vertical'], ['terminal', 'Terminal'], ['minimal', 'Minimal'], ['magazine', 'Magazine']];
for (const [key, label] of layouts) {
    await page.click(`.layout-btn:has(.layout-name:text-is("${label}"))`);
    await page.waitForTimeout(900);
    const h = await card.evaluate((el) => el.offsetHeight);
    // hero uses .hr-bg (background-image cover); all others use .yt-thumb
    const hasMedia = await card.evaluate((el) => !!el.querySelector('.yt-thumb') || !!el.querySelector('.hr-bg'));
    record(`layout ${key} renders`, h > 300 && hasMedia, `${h}px`);
    await page.screenshot({ path: `${outDir}/2-${key}.png` });
}

// Back to classic before palette tests
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

await browser.close();
console.log('\n---');
console.log(results.filter((r) => !r.ok).length === 0 ? 'ALL PASS' : `${results.filter((r) => !r.ok).length} FAILURES`);