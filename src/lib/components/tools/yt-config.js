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
 * Layouts. Each one recreates a real YouTube component at its real size:
 * - `w0`: the width YouTube draws it at (px). Every metric in the card is the
 *   real YouTube value × (card width / w0), so proportions stay true at any size.
 * - `defaults`: gaps in those same real px: { thumb: below the thumbnail,
 *   column: beside (thumbnail↔text or avatar↔text), text: between lines }.
 * - `defaultRadius`: thumbnail corner radius, real px.
 * - `defaultPadding`: frame around the card (px at a 1280 card width).
 */
export const LAYOUTS = {
	classic: {
		label: 'Classic', hint: 'The card on YouTube’s home page',
		w0: 360, defaults: { thumb: 12, column: 12, text: 4 }, defaultRadius: 12, defaultPadding: 40,
		moduleDefaults: { avatar: true, channel: true, duration: true }
	},
	compact: {
		label: 'Compact', hint: 'YouTube’s grid before 2020',
		w0: 210, defaults: { thumb: 8, column: 8, text: 2 }, defaultRadius: 0, defaultPadding: 40,
		moduleDefaults: { avatar: false, channel: true, views: false, date: false, duration: true }
	},
	upnext: {
		label: 'Up next', hint: 'The sidebar next to a video',
		w0: 402, defaults: { thumb: 8, column: 8, text: 2 }, defaultRadius: 8, defaultPadding: 32,
		moduleDefaults: { avatar: false, channel: true, duration: true }
	},
	split: {
		label: 'Search result', hint: 'A row in YouTube search',
		w0: 720, defaults: { thumb: 12, column: 16, text: 8 }, defaultRadius: 12, defaultPadding: 40,
		descriptionOn: true,
		moduleDefaults: { avatar: true, channel: true, duration: true, scrim: false }
	},
	watch: {
		label: 'Watch page', hint: 'Player, title and Subscribe',
		w0: 640, defaults: { thumb: 12, column: 12, text: 12 }, defaultRadius: 12, defaultPadding: 40,
		descriptionOn: true,
		moduleDefaults: { avatar: true, channel: true, subscribers: true, subscribe: true, duration: false }
	},
	embed: {
		label: 'Embed', hint: 'A YouTube video embedded on a site',
		w0: 640, defaults: { thumb: 12, column: 12, text: 2 }, defaultRadius: 0, defaultPadding: 0,
		moduleDefaults: { avatar: true, channel: true, views: false, date: false, duration: false }
	},
	hero: {
		label: 'Poster', hint: 'Title over the thumbnail',
		w0: 640, defaults: { thumb: 12, column: 10, text: 8 }, defaultRadius: 0, defaultPadding: 0,
		moduleDefaults: { avatar: true, channel: true, duration: false, scrim: true }
	},
	underlay: {
		label: 'Poster + title', hint: 'Thumbnail with the title below',
		w0: 640, defaults: { thumb: 12, column: 10, text: 8 }, defaultRadius: 0, defaultPadding: 0,
		moduleDefaults: { avatar: true, channel: true, duration: true, scrim: true }
	}
};

/** Video frames the card is sized against (the tool's preview and the API's `frame`). */
export const FRAME_PRESETS = {
	'720p': [1280, 720],
	'1080p': [1920, 1080],
	'1440p': [2560, 1440],
	'4k': [3840, 2160],
	vertical: [1080, 1920],
	square: [1080, 1080]
};

export const DEFAULT_CONFIG = {
	layout: 'classic', // key into LAYOUTS
	aspect: 'auto', // auto | 16:9 | 4:3 | 1:1 | 4:5 | 9:16
	ratio: 40, // Search result: thumbnail share of the width, %
	// Size: a share of a video frame (what editors think in). `containerSize`
	// is an explicit width in px that overrides it (API `width`).
	frame: [1920, 1080],
	size: 50, // card width as % of the frame width (frame included)
	containerSize: null,
	thumbGap: 12, // real px, see LAYOUTS
	columnGap: 12,
	textGap: 4,
	radius: 12, // thumbnail corners, real px
	containerRadius: 32, // whole card corners (px at a 1280 card width)
	padding: 40, // frame around the card (px at a 1280 card width)
	scrimOpacity: 85, // poster fade strength 30–100
	verifiedColor: 'gray', // gray | white | accent | custom
	verifiedColorCustom: '#a3a3a3',
	dateFormat: 'relative', // relative ("5 months ago", like YouTube) | absolute ("July 5, 2025")
	palette: 'dark', // light | dark | oled | custom
	colors: { bg: '#0f0f0f', text: '#f1f1f1', secondary: '#aaaaaa', accent: '#ff0000' },
	font: 'Roboto',
	titleScale: 1, // 0.8–1.6
	textScale: 1, // 0.5–1.5
	modules: {
		duration: true,
		title: true,
		description: false,
		channel: true,
		avatar: true,
		views: true,
		subscribers: false,
		subscribe: false,
		date: true,
		verified: false,
		live: false,
		scrim: true
	},
	titleLines: 2,
	descriptionLines: 2
};

/** Width multiplier of the frame (padding) around the content. */
export const frameFactor = (c) => 1 + (2 * (c.padding ?? 0)) / 1280;

/** The card's content width in px: explicit, or its share of the frame. */
export function resolveWidth(c) {
	const w = c.containerSize ?? ((c.frame?.[0] ?? 1920) * (c.size ?? 50)) / 100 / frameFactor(c);
	return Math.round(Math.min(3840, Math.max(160, w)));
}

/** Full card width in px, frame included (what gets exported). */
export function boxWidth(c) {
	const w = resolveWidth(c);
	return w + 2 * Math.round(((c.padding ?? 0) * w) / 1280);
}

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
export function naturalAspect() {
	return 16 / 9;
}
/** Google Fonts stylesheet for every card font (tool page and API renderer). */
export const FONTS_HREF =
	'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600&family=Archivo:wght@400;500;700&family=Anton&family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,900&family=JetBrains+Mono:wght@400;700&display=swap';
