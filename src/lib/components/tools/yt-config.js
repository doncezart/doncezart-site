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
 * - `titleSize`: reference title size at a 360px thumbnail (scaled by the layout width).
 * - `width`: design width in px (vertical cards are 720 wide like real Shorts frames).
 * - `defaultPadding`: card padding applied by default for this layout.
 */
export const LAYOUTS = {
	classic: { label: 'Classic', hint: 'YouTube-native feed card', titleSize: 16, titleWeight: 500, font: 'Roboto', descriptionOn: false, width: 1280, defaultPadding: 40 },
	split: { label: 'Wide Split', hint: 'Side-by-side hero', titleSize: 18, titleWeight: 500, font: 'Roboto', descriptionOn: false, width: 1280, defaultPadding: 40 },
	stacked: { label: 'Stacked', hint: 'Full-bleed thumb, editorial block', titleSize: 22, titleWeight: 600, font: 'Space Grotesk', descriptionOn: true, width: 1280, defaultPadding: 0 },
	hero: { label: 'Hero', hint: 'Poster overlay on scrim', titleSize: 24, titleWeight: 700, font: 'Archivo', descriptionOn: false, width: 1280, defaultPadding: 0 },
	vertical: { label: 'Vertical', hint: '9:16 — Shorts/Reels references', titleSize: 16, titleWeight: 500, font: 'Inter', descriptionOn: true, width: 720, defaultPadding: 0 },
	minimal: { label: 'Minimal', hint: 'Thumb + title, nothing else', titleSize: 18, titleWeight: 600, font: 'Inter', descriptionOn: false, width: 1280, defaultPadding: 48 }
};

export const DEFAULT_CONFIG = {
	layout: 'classic', // key into LAYOUTS
	aspect: 'auto', // auto | 16:9 | 4:3 | 1:1 | 4:5 | 9:16
	ratio: 50, // thumb share % (split / vertical)
	radius: 12, // thumbnail corner radius 0–24 px
	containerRadius: 0, // whole card corner radius 0–32 px
	padding: 40, // padding around the card content 0–80 px
	spacing: 1, // element spacing multiplier 0.5–2
	scrimOpacity: 85, // hero bottom-scrim strength 30–100
	palette: 'dark', // light | dark | oled | custom
	colors: { bg: '#0f0f0f', text: '#f1f1f1', secondary: '#aaaaaa', accent: '#ff0000' },
	font: 'Roboto',
	titleScale: 1, // 0.8–1.6
	modules: {
		duration: true,
		title: true,
		description: false,
		channel: true,
		avatar: true,
		meta: true,
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
	return layout === 'vertical' ? 9 / 16 : 16 / 9;
}

/** Design width for a layout (vertical cards render at 720 like real Shorts frames). */
export function layoutWidth(layout) {
	return LAYOUTS[layout]?.width ?? DESIGN_WIDTH;
}