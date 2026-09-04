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
 * Layout metadata. `titleSize` is the reference size at a 360px thumbnail
 * (multiplied by YT_SCALE and the user's titleScale at render time).
 */
export const LAYOUTS = {
	classic: { label: 'Classic', hint: 'YouTube-native feed card', titleSize: 16, titleWeight: 500, font: 'Roboto', descriptionOn: false },
	split: { label: 'Wide Split', hint: 'Side-by-side hero', titleSize: 18, titleWeight: 500, font: 'Roboto', descriptionOn: false },
	stacked: { label: 'Stacked', hint: 'Full-bleed thumb, editorial block', titleSize: 22, titleWeight: 600, font: 'Space Grotesk', descriptionOn: true },
	hero: { label: 'Hero', hint: 'Poster overlay on scrim', titleSize: 24, titleWeight: 700, font: 'Archivo', descriptionOn: false },
	vertical: { label: 'Vertical', hint: '9:16 — Shorts/Reels references', titleSize: 16, titleWeight: 500, font: 'Inter', descriptionOn: true },
	terminal: { label: 'Terminal', hint: 'Brutalist mono, hard edges', titleSize: 16, titleWeight: 500, font: 'JetBrains Mono', descriptionOn: true },
	minimal: { label: 'Minimal', hint: 'Thumb + title, nothing else', titleSize: 20, titleWeight: 600, font: 'Inter', descriptionOn: false },
	magazine: { label: 'Magazine', hint: 'Serif editorial with hairline rules', titleSize: 26, titleWeight: 900, font: 'Playfair Display', descriptionOn: true }
};

export const DEFAULT_CONFIG = {
	layout: 'classic', // key into LAYOUTS
	aspect: 'auto', // auto | 16:9 | 4:3 | 1:1 | 4:5 | 9:16
	ratio: 50, // thumb share % (split / vertical)
	radius: 12, // 0–24 px
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
	if (layout === 'vertical') return 9 / 16;
	if (layout === 'split') return 16 / 9;
	return 16 / 9;
}