// Parametric self-healing cutting mat → SVG string.
// Pure and deterministic: the same config always yields the same SVG, so the
// live preview, the SVG download and the PNG export (that SVG rasterised onto a
// canvas) all share one source. Internally everything is drawn in millimetres
// (1 SVG user unit = 1 mm) for both cm and inch mats.

import logoSvg from '../../../../static/logo-long.svg?raw';

export const MM_PER = { cm: 10, in: 25.4 };

// The site logo as a single path (white fill stripped so it takes the watermark colour).
const LOGO_PATH = logoSvg.match(/<path[^>]*\sd="([^"]+)"/)?.[1] ?? '';
const LOGO_VB = (() => {
	const m = logoSvg.match(/width="([\d.]+)"\s+height="([\d.]+)"/);
	return m ? { w: +m[1], h: +m[2] } : { w: 1193, h: 93 };
})();

/** Browser canvas limits: keep PNG exports well inside what every engine allows. */
export const PNG_MAX_SIDE = 8192;
export const PNG_MAX_AREA = 40_000_000;

export const MAT_COLORS = {
	green: { label: 'Classic green', mat: '#1f5a45', line: '#f1eed6' },
	blue: { label: 'Blue', mat: '#1c4a7e', line: '#e8f0fa' },
	black: { label: 'Black', mat: '#18191b', line: '#e2e2e2' },
	grey: { label: 'Grey', mat: '#5f6368', line: '#f4f4f4' },
	pink: { label: 'Pink', mat: '#e597ae', line: '#fffafc' },
	cream: { label: 'Cream', mat: '#ebe1c6', line: '#3a382f' },
	emerald: { label: 'Emerald', mat: '#1b9374', line: '#effaf5' },
	orange: { label: 'Burnt orange', mat: '#d45d1c', line: '#fff4ea' },
	paper: { label: 'Paper', mat: '#f9f5f2', line: '#6d6862' }
};

/** Wallpaper sizes in pixels, grouped by device. */
export const SIZE_PRESETS = {
	desktop: [
		{ id: 'fhd', label: 'Full HD', w: 1920, h: 1080 },
		{ id: 'qhd', label: 'QHD', w: 2560, h: 1440 },
		{ id: '4k', label: '4K', w: 3840, h: 2160 },
		{ id: '5k', label: '5K', w: 5120, h: 2880 },
		{ id: 'uw', label: 'Ultrawide', w: 3440, h: 1440 },
		{ id: 'mbp', label: 'MacBook Pro', w: 3456, h: 2234 },
		{ id: 'mba', label: 'MacBook Air', w: 2560, h: 1664 }
	],
	phone: [
		{ id: 'ip', label: 'iPhone', w: 1179, h: 2556 },
		{ id: 'ipm', label: 'iPhone Pro Max', w: 1320, h: 2868 },
		{ id: 'and', label: 'Android', w: 1080, h: 2400 },
		{ id: 'andq', label: 'Android QHD', w: 1440, h: 3200 }
	],
	tablet: [
		{ id: 'ipad', label: 'iPad', w: 1640, h: 2360 },
		{ id: 'ipadp', label: 'iPad Pro 13"', w: 2064, h: 2752 },
		{ id: 'tab', label: 'Android tablet', w: 1600, h: 2560 }
	]
};

/** Values that depend on the unit system (applied when the unit switches). */
export const UNIT_DEFAULTS = {
	cm: { margin: 1.5, gridSpacing: 1, minorDivisions: 2, rulerDivisions: 10, circleSpacing: 2, pxPerUnit: 60 },
	in: { margin: 0.625, gridSpacing: 1, minorDivisions: 2, rulerDivisions: 16, circleSpacing: 1, pxPerUnit: 150 }
};

export const DEFAULT_CONFIG = {
	// size: the output is a wallpaper in pixels; pxPerUnit is the zoom
	// (how many pixels one cm/inch of mat covers), which sets the mat's size.
	pxWidth: 2560,
	pxHeight: 1440,
	pxPerUnit: 60,
	unit: 'cm', // ruler units
	cornerRadius: 0, // mm (0 = full-bleed wallpaper)
	margin: 1.5, // units: border band around the grid
	// colour
	colorPreset: 'green',
	matColor: MAT_COLORS.green.mat,
	lineColor: MAT_COLORS.green.line,
	majorOpacity: 0.85,
	minorOpacity: 0.45,
	// grid
	gridSpacing: 1, // units
	minorDivisions: 2,
	minorStyle: 'dotted', // solid | dashed | dotted
	accentEvery: 5, // heavier line every N cells (0 = off)
	majorWeight: 0.3, // mm
	minorWeight: 0.2,
	accentWeight: 0.55,
	crosshair: false,
	gridStyle: 'lines', // lines | dots | crosses (marks at the intersections)
	// ruler
	tickEdges: { top: true, right: true, bottom: true, left: true },
	numberEdges: { top: true, right: false, bottom: false, left: true },
	rulerDivisions: 10,
	numberSize: 3.2, // mm
	numberEvery: 1, // units
	origin: 'tl', // tl | bl
	// guides
	angles: { a30: true, a45: true, a60: true },
	angleFrom: 'bottom', // bl | bottom | all
	angleLabels: true,
	circles: false,
	circleCount: 4,
	circleSpacing: 2, // units
	// watermark
	brand: true,
	brandMode: 'logo', // text | logo
	brandText: 'DONCEZART',
	brandSub: '',
	brandPos: 'bc', // [t|m|b][l|c|r]
	brandSize: 1.6, // % of the short side
	brandOpacity: 0.8,
	brandStyle: 'plain', // plain | plate | outline
	brandColor: 'lines', // lines | white | black | custom
	brandColorCustom: '#ff2b1f',
	brandFont: 'sans', // sans | mono | serif
	// text on the mat (each one sits on a patch of mat cleared of grid lines)
	message: '', // centred; new lines allowed
	messageFont: 'serif', // serif | sans | mono
	messageSize: 3.4, // % of the short side
	messagePanel: true, // clear the grid behind the text
	caption: '', // small paragraph, bottom right
	captionSize: 1, // % of the short side
	sideLabel: '', // small vertical label, top left; new lines allowed
	// surface
	light: 0, // light and shadow falling across the mat
	grain: 0.35,
	wear: 0.25,
	texture: 0.4,
	vignette: 0.25,
	edge: false, // moulded rim around the mat
	seed: 1337
};

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
// Newsreader (OFL) ships in static/fonts; exports embed it (opts.fontCss).
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const TEXT_FONTS = {
	serif: { family: SERIF, weight: 400, est: 0.5 },
	sans: { family: FONT, weight: 500, est: 0.54 },
	mono: { family: MONO, weight: 400, est: 0.6 }
};

/** @font-face rules for the serif, with the font files inlined as data URLs. */
export async function serifFontCss() {
	const files = [
		['/fonts/newsreader-latin.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212'],
		['/fonts/newsreader-latin-ext.woff2', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+1EF2-1EFF, U+20A0-20AB, U+20AD-20C4, U+2C60-2C7F, U+A720-A7FF']
	];
	const rules = await Promise.all(
		files.map(async ([url, range]) => {
			const blob = await (await fetch(url)).blob();
			const data = await new Promise((res, rej) => {
				const r = new FileReader();
				r.onload = () => res(r.result);
				r.onerror = rej;
				r.readAsDataURL(blob);
			});
			return `@font-face{font-family:Newsreader;src:url(${data}) format('woff2');font-weight:400;unicode-range:${range}}`;
		})
	);
	return rules.join('');
}

/** Does this config draw serif text (so an export needs the font inlined)? */
export const needsSerif = (c) => !!String(c.message ?? '').trim() && (c.messageFont ?? 'serif') === 'serif';

// Text width: measured with a canvas in the browser (once the font is in),
// estimated from character classes elsewhere. Panels are padded generously,
// so the estimate only has to be close.
let measureCtx = null;
function textWidth(str, size, font, letterSpacing = 0) {
	const ls = letterSpacing * Math.max(0, str.length - 1);
	if (typeof document !== 'undefined') {
		const first = font.family.split(',')[0].trim();
		if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
		if (measureCtx && (!document.fonts || document.fonts.check(`${font.weight} 12px ${first}`))) {
			measureCtx.font = `${font.weight} 100px ${font.family}`;
			return (measureCtx.measureText(str).width / 100) * size + ls;
		}
	}
	let w = 0;
	for (const ch of str) {
		if (' '.includes(ch)) w += 0.26;
		else if ('il.,;:!|\'"'.includes(ch)) w += 0.27;
		else if ('fjrt()[]'.includes(ch)) w += 0.36;
		else if ('mwMW@'.includes(ch)) w += 0.86;
		else if (ch >= 'A' && ch <= 'Z') w += 0.66;
		else w += font.est;
	}
	return w * size + ls;
}

/** Greedy word wrap to a width. */
function wrap(text, size, font, maxW) {
	const out = [];
	for (const para of String(text).split('\n')) {
		let line = '';
		for (const word of para.split(/\s+/).filter(Boolean)) {
			const next = line ? `${line} ${word}` : word;
			if (line && textWidth(next, size, font) > maxW) {
				out.push(line);
				line = word;
			} else line = next;
		}
		out.push(line);
	}
	return out;
}

const f = (v) => +v.toFixed(3);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const esc = (s) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** Small, fast seeded PRNG (mulberry32). */
function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Mat size in millimetres. */
export function matMM(c) {
	const u = MM_PER[c.unit] ?? 10;
	return { W: Math.max(1, c.width) * u, H: Math.max(1, c.height) * u };
}

/**
 * The wallpaper config → the mat config renderMat draws: the mat's physical
 * size follows from the pixel size and the zoom (px per cm/inch).
 */
export function toMat(c) {
	const k = Math.max(1, c.pxPerUnit || 60);
	return { ...c, width: Math.max(1, c.pxWidth) / k, height: Math.max(1, c.pxHeight) / k };
}

/** PNG pixel size, capped to browser canvas limits. */
export function exportSize(c) {
	const reqW = Math.max(1, Math.round(c.pxWidth));
	const reqH = Math.max(1, Math.round(c.pxHeight));
	let k = Math.min(1, PNG_MAX_SIDE / Math.max(reqW, reqH));
	k = Math.min(k, Math.sqrt(PNG_MAX_AREA / (reqW * reqH)));
	return {
		reqW,
		reqH,
		w: Math.max(1, Math.floor(reqW * k)),
		h: Math.max(1, Math.floor(reqH * k)),
		capped: k < 1
	};
}

/** Tick length factor for tick index i of a ruler with d divisions per unit. */
function tickLevel(i, d) {
	if (i % d === 0) return 1;
	if (d % 2 === 0 && i % (d / 2) === 0) return 0.7;
	if (d % 4 === 0 && i % (d / 4) === 0) return 0.52;
	if (d >= 16 && i % 2 === 1) return 0.28;
	return 0.4;
}

/**
 * Render the mat.
 * @param {typeof DEFAULT_CONFIG} c
 * @param {{ id?: string, pxWidth?: number, pxHeight?: number, physical?: boolean }} [opts]
 *   id: prefix for defs ids (unique per inline SVG on a page);
 *   pxWidth/pxHeight: intrinsic size attributes (PNG rasterising);
 *   physical: write width/height in mm (the downloadable SVG, print-true).
 */
export function renderMat(c, opts = {}) {
	const id = opts.id ?? 'cm';
	const U = MM_PER[c.unit] ?? 10;
	const { W, H } = matMM(c);
	const S = Math.max(0.1, c.gridSpacing) * U;

	// ── grid rectangle ──
	// Built from the exact centre outwards: a grid line runs through the middle
	// of the image both ways, and each side gets as many whole squares as fit
	// inside the border. Whatever is left over widens the border evenly, so
	// the grid is always perfectly centred.
	const m = clamp(c.margin * U, 0, Math.min(W, H) / 2 - Math.min(S, Math.min(W, H) / 4));
	const hx = Math.max(1, Math.floor((W / 2 - m) / S + 1e-6)); // squares from the centre to each side
	const hy = Math.max(1, Math.floor((H / 2 - m) / S + 1e-6));
	// With fine lines, the grid also takes the part-square left over, out to
	// the last fine line that fits, so big squares don't leave a wide empty
	// border (a 5 cm grid on a phone would otherwise cover half its width).
	const divG = Math.max(0, Math.round(c.minorDivisions));
	const fstep = divG >= 2 ? S / divG : 0;
	const extra = (half, h) => (fstep ? Math.max(0, Math.floor((half - m - h * S) / fstep + 1e-6)) : 0);
	const exN = Math.min(extra(W / 2, hx), divG - 1); // fine steps beyond the last whole square
	const eyN = Math.min(extra(H / 2, hy), divG - 1);
	const ex = exN * fstep;
	const ey = eyN * fstep;
	const gw = Math.min(W, 2 * (hx * S + ex));
	const gh = Math.min(H, 2 * (hy * S + ey));
	const gx0 = (W - gw) / 2;
	const gy0 = (H - gh) / 2;
	const gx1 = gx0 + gw;
	const gy1 = gy0 + gh;
	const bandX = gx0; // left/right margin width
	const bandY = gy0; // top/bottom margin height
	const fromBottom = c.origin === 'bl';

	// ── text panels: worked out first, the grid is masked around them ──
	const texts = layoutText(c, { W, H, S, gx0, gy0, gx1, gy1 });
	const panels = texts.filter((t) => t.panel).map((t) => t.box);

	const ink = esc(c.lineColor);
	const mat = esc(c.matColor);
	const out = [];

	const sizeAttrs = opts.physical
		? `width="${f(W)}mm" height="${f(H)}mm"`
		: opts.pxWidth
			? `width="${opts.pxWidth}" height="${opts.pxHeight}"`
			: '';
	out.push(
		`<svg xmlns="http://www.w3.org/2000/svg" ${sizeAttrs} viewBox="${opts.view ? `${f(opts.view.x)} ${f(opts.view.y)} ${f(opts.view.w)} ${f(opts.view.h)}` : `0 0 ${f(W)} ${f(H)}`}" preserveAspectRatio="xMidYMid meet">`
	);

	// ── defs ──
	const r = clamp(c.cornerRadius, 0, Math.min(W, H) / 2);
	const seed = Math.abs(Math.round(c.seed)) % 100000;
	out.push('<defs>');
	out.push(`<clipPath id="${id}-mat"><rect width="${f(W)}" height="${f(H)}" rx="${f(r)}"/></clipPath>`);
	out.push(`<clipPath id="${id}-grid"><rect x="${f(gx0)}" y="${f(gy0)}" width="${f(gw)}" height="${f(gh)}"/></clipPath>`);
	// Grid lines, guides and labels stop at the text panels.
	const gridMask = panels.length ? ` mask="url(#${id}-txt)"` : '';
	if (panels.length) {
		out.push(
			`<mask id="${id}-txt" maskUnits="userSpaceOnUse" x="0" y="0" width="${f(W)}" height="${f(H)}">` +
				`<rect width="${f(W)}" height="${f(H)}" fill="#fff"/>` +
				panels.map((b) => `<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" fill="#000"/>`).join('') +
				'</mask>'
		);
	}
	if (opts.fontCss && texts.some((t) => t.font === TEXT_FONTS.serif)) out.push(`<style>${opts.fontCss}</style>`);
	// Texture is sized in OUTPUT pixels, not millimetres: grain stays a crisp
	// ~1 px speck and the surface pebble a few px at any resolution or zoom.
	// (The live preview passes its own px/mm so it shows the same look as 1:1.)
	const pxPerMm = Math.max(0.5, opts.texPxPerMm ?? (c.pxPerUnit ? c.pxPerUnit / U : 6));
	// A scaled-down preview tones fine texture down, the way downscaling would.
	const fade = clamp(opts.texFade ?? 1, 0, 1);
	// Preferred: image tiles from cutting-mat-tex.js (opts.tex), mapped 1:1 to
	// output pixels. Without them (e.g. the small tool-card thumbnail) fall
	// back to SVG noise filters.
	const tex = opts.tex;
	if (tex) {
		const pat = (name, size) =>
			`<pattern id="${id}-p${name}" patternUnits="userSpaceOnUse" width="${f(size / pxPerMm)}" height="${f(size / pxPerMm)}">` +
			`<image href="${tex[name]}" width="${f(size / pxPerMm)}" height="${f(size / pxPerMm)}"/></pattern>`;
		if (c.grain > 0) out.push(pat('grain', tex.sizes.grain));
		if (c.texture > 0) out.push(pat('texture', tex.sizes.texture));
	} else if (c.grain > 0 || c.texture > 0) {
		// Each filter maps noise around mid-grey to white specks (above) and
		// dark specks (below), so it lightens and darkens the mat colour evenly.
		const speck = (gain) =>
			`<feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${gain} 0 0 0 ${-gain / 2}" result="lt"/>` +
			`<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${-gain} 0 0 0 ${gain / 2}" result="dk"/>` +
			`<feMerge><feMergeNode in="lt"/><feMergeNode in="dk"/></feMerge>`;
		// Only filter what's visible: a cropped view (the 100% preview) limits the
		// expensive noise/lighting work to its own window.
		const fr = opts.view ?? { x: 0, y: 0, w: W, h: H };
		const region = `filterUnits="userSpaceOnUse" x="${f(fr.x)}" y="${f(fr.y)}" width="${f(fr.w)}" height="${f(fr.h)}" color-interpolation-filters="sRGB"`;
		out.push(
			`<filter id="${id}-grain" ${region}><feTurbulence type="fractalNoise" baseFrequency="${f(pxPerMm / 1.15)}" numOctaves="1" seed="${seed}" result="n"/>${speck(3.2)}</filter>`
		);
		// Pebbled matte surface: a few-px bump map lit from the top left.
		const flat = Math.sin((58 * Math.PI) / 180);
		const g = 2.6;
		out.push(
			`<filter id="${id}-tex" ${region}><feTurbulence type="fractalNoise" baseFrequency="${f(pxPerMm / 3.2)}" numOctaves="2" seed="${seed + 3}" result="b"/>` +
				`<feDiffuseLighting in="b" surfaceScale="3" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting>` +
				`<feColorMatrix in="l" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${g} 0 0 0 ${f(-g * flat)}" result="lt"/>` +
				`<feColorMatrix in="l" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${-g} 0 0 0 ${f(g * flat)}" result="dk"/>` +
				`<feMerge><feMergeNode in="lt"/><feMergeNode in="dk"/></feMerge></filter>`
		);
		out.push(
			`<filter id="${id}-mottle" ${region}><feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="${seed + 7}" result="n"/>${speck(2)}</filter>`
		);
	}
	if (c.vignette > 0) {
		out.push(
			`<radialGradient id="${id}-vig" cx="50%" cy="50%" r="72%"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${f(c.vignette * 0.65)}"/></radialGradient>`
		);
	}
	out.push('</defs>');

	out.push(`<g clip-path="url(#${id}-mat)">`);
	out.push(`<rect width="${f(W)}" height="${f(H)}" fill="${mat}"/>`);
	if (c.grain > 0) {
		out.push(tex
			? `<image href="${tex.mottle}" width="${f(W)}" height="${f(H)}" preserveAspectRatio="none" opacity="${f(c.grain * 0.22)}"/>`
			: `<rect width="${f(W)}" height="${f(H)}" filter="url(#${id}-mottle)" opacity="${f(c.grain * 0.22)}"/>`);
	}

	// ── grid ──
	const markStyle = c.gridStyle === 'dots' || c.gridStyle === 'crosses';
	out.push(`<g clip-path="url(#${id}-grid)" fill="none" stroke="${ink}"${markStyle ? '' : gridMask}>`);
	const nx = Math.round(gw / S * 1e4) / 1e4;
	const ny = Math.round(gh / S * 1e4) / 1e4;
	const div = Math.max(0, Math.round(c.minorDivisions));
	const style = c.gridStyle === 'dots' || c.gridStyle === 'crosses' ? c.gridStyle : 'lines';
	if (style !== 'lines') {
		// Marks at the intersections instead of lines: a dot at every fine
		// intersection, and a bigger dot or a "+" where the main lines cross.
		// Marks on or inside a text panel are skipped whole (masking would
		// leave half crosses around the panel).
		const pad = Math.min(S * 0.2, 2.5);
		const free = (x, y) => !panels.some((b) => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad);
		const cols = 2 * hx;
		const rows = 2 * hy;
		const fineX = Math.round(gw / (S / Math.max(1, div)));
		const fineY = Math.round(gh / (S / Math.max(1, div)));
		const fine = div >= 2 && c.minorOpacity > 0 && (fineX + 1) * (fineY + 1) <= 60000;
		if (fine) {
			const step = S / div;
			let d = '';
			const onMajor = (j, off) => ((j - off) % div + div) % div === 0;
			for (let j = 0; j <= fineX; j++) {
				for (let k = 0; k <= fineY; k++) {
					if (onMajor(j, exN) && onMajor(k, eyN)) continue;
					const y = fromBottom ? gy1 - k * step : gy0 + k * step;
					if (free(gx0 + j * step, y)) d += `M${f(gx0 + j * step)} ${f(y)}h0`;
				}
			}
			if (d) out.push(`<path d="${d}" stroke-width="${f(c.minorWeight * 2.2)}" stroke-linecap="round" opacity="${f(c.minorOpacity)}"/>`);
		}
		let d = '';
		const arm = Math.min(S * 0.16, 2.2);
		for (let j = 0; j <= cols; j++) {
			for (let k = 0; k <= rows; k++) {
				const x = gx0 + ex + j * S;
				const y = fromBottom ? gy1 - ey - k * S : gy0 + ey + k * S;
				if (!free(x, y)) continue;
				d += style === 'dots' ? `M${f(x)} ${f(y)}h0` : `M${f(x - arm)} ${f(y)}h${f(arm * 2)}M${f(x)} ${f(y - arm)}v${f(arm * 2)}`;
			}
		}
		if (d) {
			out.push(
				style === 'dots'
					? `<path d="${d}" stroke-width="${f(Math.max(c.majorWeight * 2.4, c.minorWeight * 3.2))}" stroke-linecap="round" opacity="${f(c.majorOpacity)}"/>`
					: `<path d="${d}" stroke-width="${f(c.majorWeight)}" opacity="${f(c.majorOpacity)}"/>`
			);
		}
	}
	if (style === 'lines' && div >= 2 && c.minorOpacity > 0) {
		const step = S / div;
		let d = '';
		const onMajor = (j, off) => ((j - off) % div + div) % div === 0;
		for (let j = 1; j * step < gw - 1e-6; j++) if (!onMajor(j, exN)) d += `M${f(gx0 + j * step)} ${f(gy0)}V${f(gy1)}`;
		for (let j = 1; j * step < gh - 1e-6; j++) {
			if (onMajor(j, eyN)) continue;
			const y = fromBottom ? gy1 - j * step : gy0 + j * step;
			d += `M${f(gx0)} ${f(y)}H${f(gx1)}`;
		}
		const w = c.minorWeight;
		const dash =
			c.minorStyle === 'dotted'
				? ` stroke-dasharray="0 ${f(Math.max(w * 3.2, step / 5))}" stroke-linecap="round"`
				: c.minorStyle === 'dashed'
					? ` stroke-dasharray="${f(step / 5)} ${f(step / 5)}" stroke-dashoffset="${f(step / 10)}"`
					: '';
		if (d) out.push(`<path d="${d}" stroke-width="${f(w * (c.minorStyle === 'dotted' ? 1.6 : 1))}" opacity="${f(c.minorOpacity)}"${dash}/>`);
	}
	if (style === 'lines') {
		let major = '';
		let accent = '';
		const acc = Math.max(0, Math.round(c.accentEvery));
		// bold lines counted from the centre line, so they're symmetric too
		for (let i = 0; i <= 2 * hx; i++) {
			const seg = `M${f(gx0 + ex + i * S)} ${f(gy0)}V${f(gy1)}`;
			if (acc && (i - hx) % acc === 0) accent += seg;
			else major += seg;
		}
		for (let i = 0; i <= 2 * hy; i++) {
			const y = fromBottom ? gy1 - ey - i * S : gy0 + ey + i * S;
			const seg = `M${f(gx0)} ${f(y)}H${f(gx1)}`;
			if (acc && (i - hy) % acc === 0) accent += seg;
			else major += seg;
		}
		if (major) out.push(`<path d="${major}" stroke-width="${f(c.majorWeight)}" opacity="${f(c.majorOpacity)}"/>`);
		if (accent) out.push(`<path d="${accent}" stroke-width="${f(c.accentWeight)}" opacity="${f(c.majorOpacity)}"/>`);
	}
	out.push('</g>');
	// frame around the grid
	out.push(
		`<rect x="${f(gx0)}" y="${f(gy0)}" width="${f(gw)}" height="${f(gh)}" fill="none" stroke="${ink}" stroke-width="${f(c.accentWeight)}" opacity="${f(c.majorOpacity)}"/>`
	);

	// ── guides (angles, circles, crosshair) ──
	const cx = gx0 + gw / 2;
	const cy = gy0 + gh / 2;
	const fs = clamp(c.numberSize, 0.5, 40);
	const halo = `stroke="${mat}" stroke-width="${f(fs * 0.28)}" stroke-linejoin="round" paint-order="stroke"`;
	const labels = [];
	out.push(`<g clip-path="url(#${id}-grid)" fill="none" stroke="${ink}" opacity="${f(c.majorOpacity)}"${gridMask}>`);
	const angleList = [
		[30, c.angles?.a30],
		[45, c.angles?.a45],
		[60, c.angles?.a60]
	].filter(([, on]) => on);
	if (angleList.length) {
		const corners = [[gx0, gy1, 1, -1]]; // bottom-left
		if (c.angleFrom === 'bottom' || c.angleFrom === 'all') corners.push([gx1, gy1, -1, -1]);
		if (c.angleFrom === 'all') corners.push([gx0, gy0, 1, 1], [gx1, gy0, -1, 1]);
		let d = '';
		for (const [ox, oy, sx, sy] of corners) {
			for (const [deg] of angleList) {
				const a = (deg * Math.PI) / 180;
				const dx = sx * Math.cos(a);
				const dy = sy * Math.sin(a);
				const t = Math.min(gw / Math.abs(dx), gh / Math.abs(dy));
				d += `M${f(ox)} ${f(oy)}L${f(ox + dx * t)} ${f(oy + dy * t)}`;
				if (c.angleLabels) {
					const lt = Math.max(t * 0.5, t - fs * 6);
					let rot = (Math.atan2(dy, dx) * 180) / Math.PI;
					if (rot > 90) rot -= 180;
					if (rot < -90) rot += 180;
					const rr = (rot * Math.PI) / 180;
					// offset to the "upper" side of the upright text
					const px = ox + dx * lt + Math.sin(rr) * fs * 0.75;
					const py = oy + dy * lt - Math.cos(rr) * fs * 0.75;
					labels.push(
						`<text x="${f(px)}" y="${f(py)}" transform="rotate(${f(rot)} ${f(px)} ${f(py)})" text-anchor="middle" font-size="${f(fs * 0.9)}">${deg}°</text>`
					);
				}
			}
		}
		out.push(`<path d="${d}" stroke-width="${f(c.majorWeight * 1.15)}"/>`);
	}
	if (c.circles && c.circleCount > 0) {
		const cs = Math.max(0.1, c.circleSpacing) * U;
		for (let k = 1; k <= Math.round(c.circleCount); k++) {
			out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(k * cs)}" stroke-width="${f(c.majorWeight * 1.1)}"/>`);
		}
	}
	if (c.crosshair) {
		out.push(
			`<path d="M${f(gx0)} ${f(cy)}H${f(gx1)}M${f(cx)} ${f(gy0)}V${f(gy1)}" stroke-width="${f(c.accentWeight * 1.2)}"/>` +
				`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.min(S * 0.4, 6))}" stroke-width="${f(c.accentWeight)}"/>`
		);
	}
	out.push('</g>');

	// ── ruler ticks + numbers ──
	const rd = Math.max(1, Math.round(c.rulerDivisions));
	const tstep = U / rd;
	const edgeGeom = {
		top: { band: bandY, len: gw },
		bottom: { band: bandY, len: gw },
		left: { band: bandX, len: gh },
		right: { band: bandX, len: gh }
	};
	const ticks = { unit: '', fine: '' };
	const numbers = [];
	for (const edge of ['top', 'right', 'bottom', 'left']) {
		const { band, len } = edgeGeom[edge];
		const outward = band >= 7;
		const Lf = outward ? Math.min(band * 0.4, 6) : Math.min(4, Math.max(2, S * 0.4));
		const dir = outward ? -1 : 1; // -1: away from the grid, into the margin
		const horiz = edge === 'top' || edge === 'bottom';
		const sign = edge === 'top' || edge === 'left' ? 1 : -1; // inward direction along the normal
		const base = edge === 'top' ? gy0 : edge === 'bottom' ? gy1 : edge === 'left' ? gx0 : gx1;
		// The ruler's zero sits on a grid line (a whole unit before the first
		// whole square), so the numbers line up with the grid; ticks carry on
		// back into the part square.
		const off = ((horiz ? ex : ey) + 1e-6) % U - 1e-6 > 0 ? ((horiz ? ex : ey) + 1e-6) % U - 1e-6 : 0;
		const pos = (i) => (horiz ? gx0 + off + i * tstep : fromBottom ? gy1 - off - i * tstep : gy0 + off + i * tstep);
		if (c.tickEdges?.[edge]) {
			const i0 = -Math.floor(off / tstep + 1e-6);
			const n = Math.floor((len - off) / tstep + 1e-6);
			for (let i = i0; i <= n; i++) {
				const L = Lf * tickLevel(((i % rd) + rd) % rd, rd);
				const p = pos(i);
				const tip = base + sign * dir * L;
				const seg = horiz ? `M${f(p)} ${f(base)}V${f(tip)}` : `M${f(base)} ${f(p)}H${f(tip)}`;
				if (((i % rd) + rd) % rd === 0) ticks.unit += seg;
				else ticks.fine += seg;
			}
		}
		if (c.numberEdges?.[edge]) {
			const every = Math.max(0.001, c.numberEvery);
			const units = Math.floor((len - off) / U + 1e-6);
			const stepN = Math.max(1, Math.round(every));
			for (let k = stepN; k <= units; k += stepN) {
				const p = horiz ? gx0 + off + k * U : fromBottom ? gy1 - off - k * U : gy0 + off + k * U;
				let x, y, anchor;
				if (outward) {
					const mid = Lf + (band - Lf) / 2; // centre of the band left after the ticks
					const off = base - sign * Math.max(mid, Lf + fs * 0.75);
					if (horiz) [x, y, anchor] = [p, off, 'middle'];
					else [x, y, anchor] = [off, p, 'middle'];
				} else {
					const off = base + sign * (Lf + fs * 0.35);
					if (horiz) [x, y, anchor] = [p, off + sign * fs * 0.45, 'middle'];
					else [x, y, anchor] = [off, p, sign > 0 ? 'start' : 'end'];
				}
				// central baseline via a dy shift (more consistent than dominant-baseline when rasterised)
				numbers.push(`<text x="${f(x)}" y="${f(y)}" dy="0.35em" text-anchor="${anchor}">${k}</text>`);
			}
		}
	}
	out.push(`<g fill="none" stroke="${ink}" opacity="${f(c.majorOpacity)}">`);
	if (ticks.fine) out.push(`<path d="${ticks.fine}" stroke-width="${f(c.majorWeight * 0.85)}"/>`);
	if (ticks.unit) out.push(`<path d="${ticks.unit}" stroke-width="${f(c.majorWeight * 1.25)}"/>`);
	out.push('</g>');
	if (numbers.length) {
		// unit label in the origin corner
		if (bandX >= 7 && bandY >= 7 && (c.numberEdges?.top || c.numberEdges?.left || c.numberEdges?.bottom)) {
			const ux = bandX / 2;
			const uy = fromBottom ? H - bandY / 2 : bandY / 2;
			numbers.push(
				`<text x="${f(ux)}" y="${f(uy)}" dy="0.35em" text-anchor="middle" font-size="${f(fs * 0.7)}" letter-spacing="${f(fs * 0.06)}">${c.unit === 'in' ? 'IN' : 'CM'}</text>`
			);
		}
		out.push(
			`<g fill="${ink}" ${halo} font-family="${FONT}" font-size="${f(fs)}" font-weight="500" opacity="${f(Math.min(1, c.majorOpacity + 0.1))}">${numbers.join('')}</g>`
		);
	}
	if (labels.length) {
		out.push(`<g fill="${ink}" ${halo} font-family="${FONT}" font-weight="500" opacity="${f(c.majorOpacity)}"${gridMask}>${labels.join('')}</g>`);
	}

	// ── text and its panels ──
	if (texts.length) out.push(drawText(texts, { ink, style, c }));

	// ── watermark ──
	if (c.brand) out.push(watermark(c, { W, H, S, gx0, gy0, gx1, gy1, bandY, ink, mat }));

	// ── wear: faint healed cuts, mostly along the grid like real use ──
	const wear = clamp(c.wear, 0, 1);
	if (wear > 0) {
		const rand = rng(seed * 7919 + 17);
		const count = Math.round(Math.pow(wear, 1.15) * ((W * H) / 1400));
		const light = [];
		const dark = [];
		for (let i = 0; i < count; i++) {
			// fixed number of draws per cut, so raising wear only adds cuts
			const x = rand() * W;
			const y = rand() * H;
			const rl = rand();
			const kind = rand();
			const side = rand();
			const jit = rand() - 0.5;
			const bowR = rand() - 0.5;
			const opR = rand();
			const wR = rand();
			const len = 1.5 + Math.pow(rl, 2.2) * Math.min(W, H) * 0.45;
			let ang;
			if (kind < 0.55) ang = (side < 0.5 ? 0 : 90) + jit * 3;
			else if (kind < 0.75) ang = (side < 0.5 ? 45 : 135) + jit * 4;
			else ang = side * 180;
			const a = (ang * Math.PI) / 180;
			const ux = Math.cos(a);
			const uy = Math.sin(a);
			const x1 = x - (ux * len) / 2;
			const y1 = y - (uy * len) / 2;
			const x2 = x + (ux * len) / 2;
			const y2 = y + (uy * len) / 2;
			const bow = bowR * len * 0.035;
			const qx = x - uy * bow;
			const qy = y + ux * bow;
			const op = (0.08 + opR * 0.22) * (0.6 + wear * 0.4);
			const w = 0.1 + wR * 0.22;
			const d = `M${f(x1)} ${f(y1)}Q${f(qx)} ${f(qy)} ${f(x2)} ${f(y2)}`;
			light.push(`<path d="${d}" stroke-width="${f(w)}" opacity="${f(op)}"/>`);
			// the cut's shadowed lip, offset a hair to one side
			const ox = -uy * (w * 0.9);
			const oy = ux * (w * 0.9);
			dark.push(
				`<path d="M${f(x1 + ox)} ${f(y1 + oy)}Q${f(qx + ox)} ${f(qy + oy)} ${f(x2 + ox)} ${f(y2 + oy)}" stroke-width="${f(w)}" opacity="${f(op * 0.7)}"/>`
			);
		}
		out.push(`<g fill="none" stroke="#000" stroke-linecap="round">${dark.join('')}</g>`);
		out.push(`<g fill="none" stroke="#fff" stroke-linecap="round">${light.join('')}</g>`);
	}

	// ── light and shadow, falling across everything on the mat ──
	const light = clamp(c.light ?? 0, 0, 1);
	if (light > 0) {
		if (tex?.light) {
			out.push(`<image href="${tex.light}" width="${f(W)}" height="${f(H)}" preserveAspectRatio="none" opacity="${f(light)}"/>`);
		} else {
			// No texture tiles (small thumbnails): plain diagonal bands.
			const L = Math.max(W, H);
			out.push(
				`<defs><linearGradient id="${id}-light" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(L * 0.16)}" y2="${f(-L * 0.1)}" spreadMethod="repeat">` +
					`<stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="0.45" stop-color="#000" stop-opacity="0"/>` +
					`<stop offset="0.7" stop-color="#fff" stop-opacity="0.18"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient></defs>` +
					`<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}-light)" opacity="${f(light)}"/>`
			);
		}
	}

	// ── surface ──
	if (c.texture > 0) {
		out.push(tex
			? `<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}-ptexture)" opacity="${f(c.texture * 0.45)}"/>`
			: `<rect width="${f(W)}" height="${f(H)}" filter="url(#${id}-tex)" opacity="${f(c.texture * 0.5 * fade)}"/>`);
	}
	if (c.grain > 0) {
		out.push(tex
			? `<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}-pgrain)" opacity="${f(c.grain * 0.3)}"/>`
			: `<rect width="${f(W)}" height="${f(H)}" filter="url(#${id}-grain)" opacity="${f(c.grain * 0.22 * fade)}"/>`);
	}
	if (c.vignette > 0) out.push(`<rect width="${f(W)}" height="${f(H)}" fill="url(#${id}-vig)"/>`);
	// moulded edge (optional): darker rim with a faint highlight just inside it
	if (c.edge) out.push(
		`<rect x="0" y="0" width="${f(W)}" height="${f(H)}" rx="${f(r)}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="1.6"/>` +
			`<rect x="1" y="1" width="${f(W - 2)}" height="${f(H - 2)}" rx="${f(Math.max(0, r - 1))}" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="0.5"/>`
	);
	out.push('</g></svg>');
	return out.join('');
}

/**
 * Where the message, caption and side label go. Each sits on a panel: a
 * patch of mat the grid is cleared from, sized to the text and snapped so its
 * edges land on grid lines: the centred message in half cells (when the fine
 * lines split each cell in two) or whole cells, so it stays symmetric; the
 * corner panels on the nearest fine line. The message is centred on the middle lines,
 * the caption fills the bottom-right corner, the label the top-left one.
 */
function layoutText(c, g) {
	const { W, H, S, gx0, gy0, gx1, gy1 } = g;
	const short = Math.min(W, H);
	const gw = gx1 - gx0;
	const gh = gy1 - gy0;
	const div = Math.max(0, Math.round(c.minorDivisions));
	const u = div >= 2 && div % 2 === 0 ? S / 2 : S;
	const snapUp = (v, max) => Math.min(max, Math.max(u, Math.ceil(v / u - 1e-6) * u));
	// Corner panels needn't be symmetric, so they snap to the fine lines.
	const uf = div >= 2 ? S / div : S;
	const snapFine = (v, max) => Math.min(max, Math.max(uf, Math.ceil(v / uf - 1e-6) * uf));
	const lineList = (v, n) =>
		String(v ?? '')
			.replace(/\r/g, '')
			.split('\n')
			.map((l) => l.trim())
			.slice(0, n);
	const out = [];

	const msg = lineList(c.message, 4);
	while (msg.length && !msg[msg.length - 1]) msg.pop();
	if (msg.length) {
		const font = TEXT_FONTS[c.messageFont] ?? TEXT_FONTS.serif;
		const size = (clamp(c.messageSize ?? 3.4, 0.5, 20) / 100) * short;
		const lh = size * 1.18;
		const tw = Math.max(...msg.map((l) => textWidth(l, size, font)));
		const th = msg.length * lh;
		const hw = snapUp(tw / 2 + size * 1.1, gw / 2);
		const hh = snapUp(th / 2 + size * 0.7, gh / 2);
		const cx = gx0 + gw / 2;
		const cy = gy0 + gh / 2;
		out.push({
			font,
			size,
			panel: c.messagePanel !== false,
			box: { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2 },
			lines: msg.map((l, i) => ({ text: l, x: cx, y: cy - th / 2 + lh * (i + 0.5) })),
			anchor: 'middle'
		});
	}

	const capText = String(c.caption ?? '').trim();
	if (capText) {
		const font = TEXT_FONTS.sans;
		const size = (clamp(c.captionSize ?? 1, 0.3, 6) / 100) * short;
		const pad = size * 1.3;
		const lh = size * 1.4;
		const lines = wrap(capText, size, font, Math.min(size * 26, gw * 0.5 - pad * 2)).slice(0, 12);
		const tw = Math.max(...lines.map((l) => textWidth(l, size, font)));
		const w = snapFine(tw + pad * 2, gw * 0.6);
		const h = snapFine(lines.length * lh + pad * 2 - (lh - size), gh * 0.6);
		const box = { x: gx1 - w, y: gy1 - h, w, h };
		out.push({
			font,
			size,
			panel: true,
			box,
			lines: lines.map((l, i) => ({ text: l, x: box.x + pad, y: box.y + pad + size / 2 + lh * i })),
			anchor: 'start'
		});
	}

	const side = lineList(c.sideLabel, 4).filter(Boolean).map((l) => l.toUpperCase());
	if (side.length) {
		const font = TEXT_FONTS.sans;
		const size = (clamp(c.captionSize ?? 1, 0.3, 6) / 100) * short * 0.8;
		const ls = size * 0.14;
		const lh = size * 1.45;
		const pad = size * 1.4;
		const len = Math.max(...side.map((l) => textWidth(l, size, font, ls)));
		const w = snapFine(side.length * lh - (lh - size) + pad * 2, gw * 0.3);
		const h = snapFine(len + pad * 2, gh * 0.8);
		const box = { x: gx0, y: gy0, w, h };
		// Turned a quarter clockwise (reads top to bottom), so the first line
		// is the rightmost column.
		out.push({
			font,
			size,
			panel: true,
			box,
			letterSpacing: ls,
			rotate: 90,
			lines: side.map((l, i) => ({ text: l, x: box.x + w / 2 + ((side.length - 1) / 2 - i) * lh, y: box.y + pad })),
			anchor: 'start'
		});
	}
	return out;
}

/** Panels (outlined on a line grid) and their text. */
function drawText(texts, { ink, style, c }) {
	const out = [];
	const op = f(Math.min(1, c.majorOpacity + 0.15));
	for (const t of texts) {
		if (t.panel && style === 'lines') {
			const b = t.box;
			out.push(
				`<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" fill="none" stroke="${ink}" stroke-width="${f(c.majorWeight)}" opacity="${f(c.majorOpacity)}"/>`
			);
		}
		const attrs = `font-family="${t.font.family}" font-weight="${t.font.weight}" font-size="${f(t.size)}" text-anchor="${t.anchor}"${t.letterSpacing ? ` letter-spacing="${f(t.letterSpacing)}"` : ''}`;
		const lines = t.lines
			.filter((l) => l.text)
			.map((l) => {
				const rot = t.rotate ? ` transform="rotate(${t.rotate} ${f(l.x)} ${f(l.y)})"` : '';
				return `<text x="${f(l.x)}" y="${f(l.y)}" dy="0.35em"${rot}>${esc(l.text)}</text>`;
			})
			.join('');
		out.push(`<g fill="${ink}" opacity="${op}" ${attrs}>${lines}</g>`);
	}
	return out.join('');
}

const WM_FONTS = {
	sans: { family: FONT, k: 0.68, weight: 800 },
	mono: { family: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace", k: 0.62, weight: 700 },
	serif: { family: "Georgia, 'Times New Roman', serif", k: 0.62, weight: 700 }
};

/** The watermark: text or the logo, an optional second line, at one of nine spots. */
function watermark(c, g) {
	const mode = c.brandMode === 'logo' && LOGO_PATH ? 'logo' : 'text';
	const text = mode === 'text' ? String(c.brandText ?? '').trim() : '';
	const sub = String(c.brandSub ?? '').trim();
	if (mode === 'text' && !text && !sub) return '';

	const font = WM_FONTS[c.brandFont] ?? WM_FONTS.sans;
	const bs = (clamp(c.brandSize ?? 1.6, 0.3, 20) / 100) * Math.min(g.W, g.H);
	const spacing = bs * 0.04;
	let mainW = 0;
	let mainH = 0;
	if (mode === 'logo') {
		mainH = bs * 0.75;
		mainW = (mainH * LOGO_VB.w) / LOGO_VB.h;
	} else if (text) {
		mainH = bs;
		mainW = text.length * (bs * font.k + spacing);
	}
	const subSize = bs * 0.42;
	const subW = sub ? sub.length * subSize * (font.k * 0.9 + 0.18) : 0;
	const gap = mainH && sub ? bs * 0.35 : 0;
	const blockH = mainH + gap + (sub ? subSize : 0);
	const blockW = Math.max(mainW, subW);

	const pos = /^[tmb][lcr]$/.test(c.brandPos ?? '') ? c.brandPos : 'br';
	const v = pos[0];
	const h = pos[1];
	const style = c.brandStyle ?? 'plain';
	const pad = style === 'plain' ? 0 : bs * 0.7;
	const parts = [];

	// Plain text on the top/bottom edge goes into the border band when it fits
	// and that edge carries no numbers; everything else sits inside the grid.
	const edge = v === 't' ? 'top' : 'bottom';
	const tickL = c.tickEdges?.[edge] && g.bandY >= 7 ? Math.min(g.bandY * 0.4, 6) : 0;
	const inMargin = style === 'plain' && v !== 'm' && !c.numberEdges?.[edge] && g.bandY - tickL - 1 >= blockH;

	let bx, by;
	if (inMargin) {
		bx = h === 'l' ? g.gx0 : h === 'c' ? g.W / 2 - blockW / 2 : g.gx1 - blockW;
		const top = v === 't' ? 0 : g.gy1 + tickL;
		const bottom = v === 't' ? g.gy0 - tickL : g.H;
		by = (top + bottom) / 2 - blockH / 2;
	} else {
		const ow = blockW + pad * 2;
		const oh = blockH + pad * 2;
		const inset = Math.min(g.S, Math.min(g.gx1 - g.gx0, g.gy1 - g.gy0) * 0.1);
		const ox = h === 'l' ? g.gx0 + inset : h === 'c' ? g.W / 2 - ow / 2 : g.gx1 - inset - ow;
		const oy = v === 't' ? g.gy0 + inset : v === 'm' ? g.H / 2 - oh / 2 : g.gy1 - inset - oh;
		if (style === 'plate') {
			parts.push(`<rect x="${f(ox)}" y="${f(oy)}" width="${f(ow)}" height="${f(oh)}" rx="${f(bs * 0.15)}" fill="${g.mat}" stroke="none"/>`);
		} else if (style === 'outline') {
			const sw = Math.max(0.15, bs * 0.06);
			parts.push(`<rect x="${f(ox)}" y="${f(oy)}" width="${f(ow)}" height="${f(oh)}" rx="${f(oh * 0.22)}" fill="none" stroke="currentColor" stroke-width="${f(sw)}"/>`);
		}
		bx = ox + pad;
		by = oy + pad;
	}

	const anchor = h === 'l' ? 'start' : h === 'c' ? 'middle' : 'end';
	const ax = h === 'l' ? bx : h === 'c' ? bx + blockW / 2 : bx + blockW;
	let y = by;
	if (mode === 'logo') {
		const s = mainH / LOGO_VB.h;
		const lx = h === 'l' ? bx : h === 'c' ? bx + blockW / 2 - mainW / 2 : bx + blockW - mainW;
		parts.push(`<path transform="translate(${f(lx)} ${f(y)}) scale(${f(s)})" d="${LOGO_PATH}" stroke="none"/>`);
		y += mainH + gap;
	} else if (text) {
		parts.push(
			`<text x="${f(ax)}" y="${f(y + bs * 0.8)}" text-anchor="${anchor}" font-size="${f(bs)}" font-weight="${font.weight}" letter-spacing="${f(spacing)}" stroke="none">${esc(text)}</text>`
		);
		y += mainH + gap;
	}
	if (sub) {
		parts.push(
			`<text x="${f(ax)}" y="${f(y + subSize * 0.8)}" text-anchor="${anchor}" font-size="${f(subSize)}" font-weight="500" letter-spacing="${f(subSize * 0.18)}" stroke="none">${esc(sub)}</text>`
		);
	}

	const color =
		c.brandColor === 'white' ? '#ffffff'
		: c.brandColor === 'black' ? '#000000'
		: c.brandColor === 'custom' ? esc(c.brandColorCustom ?? '#ffffff')
		: g.ink;
	return `<g fill="${color}" color="${color}" font-family="${esc(font.family)}" opacity="${f(clamp(c.brandOpacity ?? 0.8, 0.05, 1))}">${parts.join('')}</g>`;
}

/** Rasterise an SVG string to a PNG blob at w×h pixels. Browser only. */
export async function svgToPngBlob(svg, w, h) {
	const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
	try {
		const img = new Image();
		img.decoding = 'async';
		img.src = url;
		await img.decode();
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas unavailable');
		ctx.drawImage(img, 0, 0, w, h);
		const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
		if (!blob) throw new Error('PNG encoding failed (canvas too large?)');
		return blob;
	} finally {
		URL.revokeObjectURL(url);
	}
}
