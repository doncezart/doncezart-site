// Turns API parameters into a full YouTube card config, and back.
// Shared by the server (/api/youtube/card) and the tool page (the "API URL"
// box), so a card built in the tool and the same card requested through the
// API always resolve to the same config.

import { DEFAULT_CONFIG, LAYOUTS, PALETTES, FONTS, ASPECTS, FRAME_PRESETS } from './yt-config.js';

export const MODULE_KEYS = Object.keys(DEFAULT_CONFIG.modules);
export const FORMATS = ['png', 'jpeg', 'webp'];

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Numeric params: API name → [config key, min, max]. */
const NUMBERS = {
	width: ['containerSize', 160, 3840],
	size: ['size', 2, 100],
	ratio: ['ratio', 25, 85],
	radius: ['radius', 0, 72],
	cardRadius: ['containerRadius', 0, 128],
	padding: ['padding', 0, 80],
	thumbGap: ['thumbGap', 0, 80],
	columnGap: ['columnGap', 0, 80],
	textGap: ['textGap', 0, 80],
	titleScale: ['titleScale', 0.8, 1.6],
	textScale: ['textScale', 0.5, 1.5],
	scrim: ['scrimOpacity', 30, 100],
	titleLines: ['titleLines', 1, 3],
	descriptionLines: ['descriptionLines', 1, 3]
};
/** Integer-only config keys (the rest accept decimals). */
const FLOATS = new Set(['titleScale', 'textScale', 'size']);

/** Every parameter the API accepts, for docs and unknown-key errors. */
export const PARAMS = [
	'url', 'format', 'layout', 'frame', 'aspect', 'palette', 'font', 'dateFormat', 'verified',
	'bg', 'text', 'secondary', 'accent', 'show', 'hide',
	...Object.keys(NUMBERS)
];

export class ParamError extends Error {}

/**
 * Same per-layout defaults the tool applies when you switch layouts: padding,
 * gaps, title lines/scale, text scale, description and module defaults.
 */
export function layoutConfig(layout) {
	const L = LAYOUTS[layout];
	const c = structuredClone(DEFAULT_CONFIG);
	c.layout = layout;
	c.padding = L.defaultPadding ?? 0;
	c.radius = L.defaultRadius ?? 12;
	c.thumbGap = L.defaults.thumb;
	c.columnGap = L.defaults.column;
	c.textGap = L.defaults.text;
	c.titleLines = L.defaultTitleLines ?? 2;
	c.titleScale = L.defaultTitleScale ?? 1;
	c.textScale = L.defaultTextScale ?? 1;
	c.modules.description = L.descriptionOn ?? false;
	Object.assign(c.modules, L.moduleDefaults ?? {});
	return c;
}

const hex = (v, name) => {
	const m = String(v).trim().match(HEX);
	if (!m) throw new ParamError(`"${name}" must be a hex colour like #0f0f0f.`);
	let h = m[1].toLowerCase();
	if (h.length === 3) h = [...h].map((c) => c + c).join('');
	return '#' + h;
};

const oneOf = (v, list, name) => {
	const s = String(v).trim();
	const hit = list.find((x) => x.toLowerCase() === s.toLowerCase());
	if (!hit) throw new ParamError(`"${name}" must be one of: ${list.join(', ')}.`);
	return hit;
};

/** "1080p", "4k", "vertical"… or "1920x1080". */
function parseFrame(v) {
	const s = String(v).trim().toLowerCase();
	if (FRAME_PRESETS[s]) return [...FRAME_PRESETS[s]];
	const m = s.match(/^(\d{3,4})\s*[x×]\s*(\d{3,4})$/);
	if (!m) throw new ParamError(`"frame" must be ${Object.keys(FRAME_PRESETS).join(', ')} or a size like 1920x1080.`);
	const [w, h] = [Number(m[1]), Number(m[2])];
	if (w < 320 || h < 320 || w > 7680 || h > 7680) throw new ParamError('"frame" sides must be between 320 and 7680.');
	return [w, h];
}

const list = (v) => (Array.isArray(v) ? v : String(v).split(','))
	.map((s) => String(s).trim())
	.filter(Boolean);

/**
 * @param {Record<string, any>} params flat params (query string or JSON body)
 * @returns {{ url: string, format: string, config: typeof DEFAULT_CONFIG }}
 */
export function parseCardParams(params) {
	const p = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

	const unknown = Object.keys(p).filter((k) => !PARAMS.includes(k));
	if (unknown.length) throw new ParamError(`Unknown parameter "${unknown[0]}". See the API docs for the full list.`);
	if (!p.url) throw new ParamError('Missing "url" (a YouTube link or 11-character video id).');

	const format = p.format ? oneOf(p.format === 'jpg' ? 'jpeg' : p.format, FORMATS, 'format') : 'png';
	const layout = p.layout ? oneOf(p.layout, Object.keys(LAYOUTS), 'layout') : DEFAULT_CONFIG.layout;
	const config = layoutConfig(layout);

	if (p.frame) config.frame = parseFrame(p.frame);
	if (p.aspect) config.aspect = oneOf(p.aspect, ['auto', ...Object.keys(ASPECTS)], 'aspect');
	if (p.font) config.font = oneOf(p.font, FONTS, 'font');
	if (p.dateFormat) config.dateFormat = oneOf(p.dateFormat, ['absolute', 'relative'], 'dateFormat');

	for (const [name, [key, min, max]] of Object.entries(NUMBERS)) {
		if (p[name] == null) continue;
		const n = Number(p[name]);
		if (!Number.isFinite(n)) throw new ParamError(`"${name}" must be a number.`);
		if (n < min || n > max) throw new ParamError(`"${name}" must be between ${min} and ${max}.`);
		config[key] = FLOATS.has(key) ? n : Math.round(n);
	}

	// Colours: a named palette, or any of bg/text/secondary/accent on top of one
	// (which makes it a custom palette, like editing a swatch in the tool).
	const base = p.palette ? oneOf(p.palette, Object.keys(PALETTES), 'palette') : config.palette;
	config.palette = base;
	const custom = ['bg', 'text', 'secondary', 'accent'].filter((k) => p[k] != null);
	if (custom.length) {
		config.palette = 'custom';
		config.colors = { ...PALETTES[base] };
		for (const k of custom) config.colors[k] = hex(p[k], k);
	}

	if (p.verified) {
		const v = String(p.verified).trim();
		if (['gray', 'white', 'accent'].includes(v)) config.verifiedColor = v;
		else {
			config.verifiedColor = 'custom';
			config.verifiedColorCustom = hex(v, 'verified');
		}
	}

	for (const [field, on] of [['show', true], ['hide', false]]) {
		if (p[field] == null) continue;
		for (const m of list(p[field])) config.modules[oneOf(m, MODULE_KEYS, field)] = on;
	}

	return { url: String(p.url).trim(), format, config };
}

/**
 * The shortest set of API params that reproduces `config`: only what differs
 * from the layout's defaults. Used by the tool's "API URL" box.
 */
export function configToParams(config, format = 'png') {
	const base = layoutConfig(config.layout);
	/** @type {Record<string, string>} */
	const out = {};
	if (config.layout !== DEFAULT_CONFIG.layout) out.layout = config.layout;
	if (format !== 'png') out.format = format;
	if (config.aspect !== base.aspect) out.aspect = config.aspect;
	if (config.font !== base.font) out.font = config.font;
	if (config.dateFormat !== base.dateFormat) out.dateFormat = config.dateFormat;
	if (config.frame[0] !== base.frame[0] || config.frame[1] !== base.frame[1]) {
		const preset = Object.entries(FRAME_PRESETS).find(([, f]) => f[0] === config.frame[0] && f[1] === config.frame[1]);
		out.frame = preset ? preset[0] : `${config.frame[0]}x${config.frame[1]}`;
	}
	for (const [name, [key]] of Object.entries(NUMBERS)) {
		if (config[key] !== base[key]) out[name] = String(config[key]);
	}
	if (config.palette === 'custom') {
		const ref = PALETTES[base.palette];
		for (const k of ['bg', 'text', 'secondary', 'accent']) {
			if (config.colors[k]?.toLowerCase() !== ref[k]) out[k] = config.colors[k];
		}
	} else if (config.palette !== base.palette) out.palette = config.palette;
	if (config.verifiedColor !== base.verifiedColor) {
		out.verified = config.verifiedColor === 'custom' ? config.verifiedColorCustom : config.verifiedColor;
	}
	const show = MODULE_KEYS.filter((k) => config.modules[k] && !base.modules[k]);
	const hide = MODULE_KEYS.filter((k) => !config.modules[k] && base.modules[k]);
	if (show.length) out.show = show.join(',');
	if (hide.length) out.hide = hide.join(',');
	return out;
}
