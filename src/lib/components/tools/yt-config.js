// Card configuration model for the YouTube Card Generator.
// Single source of truth for defaults, palettes, and layout metadata.

export const DESIGN_WIDTH = 1280;
/** YouTube feed reference: metrics defined at a 360px thumbnail are scaled by this. */
export const YT_SCALE = DESIGN_WIDTH / 360;

export const PALETTES = {
	light: { bg: '#ffffff', text: '#0f0f0f', secondary: '#606060', accent: '#ff0000' },
	dark: { bg: '#0f0f0f', text: '#f1f1f1', secondary: '#aaaaaa', accent: '#ff0000' },
	oled: { bg: '#000000', text: '#ffffff', secondary: '#8b989c', accent: '#ff0000' }
};

export const PALETTE_NAMES = {
	light: 'YouTube Light',
	dark: 'YouTube Dark',
	oled: 'OLED Black',
	custom: 'Custom'
};

export const FONTS = [
	'Roboto',
	'Inter',
	'Space Grotesk',
	'Archivo',
	'Anton',
	'Bebas Neue',
	'Playfair Display',
	'JetBrains Mono',
	'Satoshi'
];

/**
 * Layout metadata.
 * - `titleSize`: reference title size at a 360px thumbnail (scaled by the container width).
 * - `defaultPadding`: card frame applied by default for this layout (0 = full-bleed).
 * - `defaults`: per-layout gap defaults: { thumb, column, text } in px at 1280 design width.
 */
export const LAYOUTS = {
	modern: {
		label: 'Modern', hint: 'Avatar beside the info block',
		titleSize: 16, titleWeight: 500, font: 'Roboto', descriptionOn: false,
		defaultPadding: 40,
		defaults: { thumb: 48, column: 48, text: 28 }
	},
	classic: {
		label: 'Classic', hint: 'YouTube-native feed card',
		titleSize: 16, titleWeight: 500, font: 'Roboto', descriptionOn: false,
		defaultPadding: 40,
		defaults: { thumb: 48, column: 48, text: 28 },
		moduleDefaults: { avatar: true, channel: true, duration: true }
	},
	compact: {
		label: 'Compact', hint: 'Thumb, title, views · date',
		titleSize: 14, titleWeight: 500, font: 'Roboto', descriptionOn: false,
		defaultPadding: 24,
		defaults: { thumb: 28, column: 48, text: 20 },
		moduleDefaults: { avatar: false, channel: false }
	},
	split: {
		label: 'Wide Split', hint: 'Side-by-side hero',
		titleSize: 16, titleWeight: 500, font: 'Roboto', descriptionOn: true,
		defaultPadding: 40,
		defaultTitleLines: 1, // wide flat card: one title line keeps the natural thumbnail height
		defaultTextScale: 0.5, // text ~half size so the 16:9 thumbnail dominates the wide card
		defaults: { thumb: 48, column: 48, text: 16 },
		moduleDefaults: { scrim: false } // optional scrim on the split thumbnail, off by default
	},
	stacked: {
		label: 'Stacked', hint: 'Full-bleed thumb, editorial block',
		titleSize: 22, titleWeight: 600, font: 'Space Grotesk', descriptionOn: true,
		defaultPadding: 40,
		defaults: { thumb: 48, column: 48, text: 28 }
	},
	hero: {
		label: 'Hero', hint: 'Poster overlay on scrim',
		titleSize: 24, titleWeight: 700, font: 'Archivo', descriptionOn: false,
		defaultPadding: 0,
		defaultTitleScale: 0.8, // hero poster title at 0.8× by default
		defaults: { thumb: 48, column: 48, text: 28 },
		moduleDefaults: { duration: false } // poster layouts keep the corner clean by default
	},
	underlay: {
		label: 'Underlay', hint: 'Hero poster, title below',
		titleSize: 24, titleWeight: 700, font: 'Archivo', descriptionOn: false,
		defaultPadding: 0,
		moduleDefaults: { avatar: true, channel: true, duration: true },
		defaults: { thumb: 48, column: 48, text: 28 }
	}
};

export const DEFAULT_CONFIG = {
	layout: 'modern', // key into LAYOUTS
	aspect: 'auto', // auto | 16:9 | 4:3 | 1:1 | 4:5 | 9:16
	ratio: 34, // thumb share % (split: text column ≈ 2× the thumbnail, 25–85)
	splitWideness: 3.2, // split card aspect (1.2–4) — higher = wider/flatter
	containerSize: 1280, // design width 720–1920 px — pure uniform zoom of the composition
	thumbGap: 48, // space between thumbnail and text block (classic, stacked, compact)
	columnGap: 48, // space between columns (split)
	textGap: 28, // space between title / channel / meta / description
	radius: 24, // thumbnail corner radius (design px)
	containerRadius: 32, // whole card corner radius (design px)
	padding: 40, // outer frame around the design width (design px)
	scrimOpacity: 85, // hero bottom-scrim strength 30–100
	verifiedColor: 'gray', // gray | white | accent | custom
	verifiedColorCustom: '#a3a3a3',
	dateFormat: 'absolute', // absolute ("July 5, 2025") | relative ("5 months ago")
	palette: 'dark', // light | dark | oled | custom
	colors: { bg: '#0f0f0f', text: '#f1f1f1', secondary: '#aaaaaa', accent: '#ff0000' },
	font: 'Roboto',
	titleScale: 1, // 0.8–1.6
	textScale: 1, // 0.5–1.5 — global text multiplier (per-layout defaults; split uses 0.5)
	modules: {
		duration: true,
		title: true,
		description: false,
		channel: true,
		avatar: true,
		views: true,
		subscribers: false,
		date: true,
		verified: false,
		live: false,
		scrim: true
	},
	titleLines: 2,
	descriptionLines: 2
};

export function resolveColors(config) {
	if (config.palette === 'custom') return { ...config.colors };
	return { ...PALETTES[config.palette] };
}

/** Aspect ratios selectable in the UI. */
export const ASPECTS = {
	'16:9': 16 / 9,
	'4:3': 4 / 3,
	'1:1': 1,
	'4:5': 4 / 5,
	'9:16': 9 / 16
};

/** Natural aspect of the card per layout (used when config.aspect === 'auto'). */
export function naturalAspect(layout) {
	return 16 / 9;
}