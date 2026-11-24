// Configuration model for the Social Profile Card tool.
// Single source of truth for defaults, palettes, fonts, and template metadata.
// Mirrors the YouTube card tool's config approach so both tools feel identical.

export const DESIGN_WIDTH = 1280; // design px; containerSize is a pure uniform zoom of this

/** Template gallery. Each entry defines its natural aspect + generic defaults. */
export const TEMPLATES = {
	ring: {
		label: 'Gradient Ring', hint: 'Social profile with a glowing avatar ring',
		aspect: 3 / 2, defaultPadding: 32, defaultRadius: 32, font: 'Inter', titleWeight: 700,
		background: 'gradient'
	},
	minimal: {
		label: 'Minimal', hint: 'Centered avatar, calm and clean',
		aspect: 3 / 2, defaultPadding: 36, defaultRadius: 24, font: 'Inter', titleWeight: 600,
		background: 'solid'
	},
	bold: {
		label: 'Bold Poster', hint: 'Oversized name, poster energy',
		aspect: 16 / 9, defaultPadding: 28, defaultRadius: 0, font: 'Anton', titleWeight: 400,
		background: 'gradient'
	},
	grid: {
		label: 'Card Grid', hint: 'Avatar, bio and a stats grid',
		aspect: 16 / 9, defaultPadding: 28, defaultRadius: 12, font: 'Inter', titleWeight: 600,
		background: 'solid'
	},
	terminal: {
		label: 'Terminal', hint: 'Monospace, dark, accent lines',
		aspect: 16 / 9, defaultPadding: 28, defaultRadius: 8, font: 'JetBrains Mono', titleWeight: 600,
		background: 'solid'
	},

	// ── Platform-native ("vanilla") templates: how the platform itself would
	// render this profile. Each sets a platform-appropriate palette + font. ──
	instagram: {
		label: 'Instagram', hint: 'Native Instagram profile header',
		aspect: 16 / 9, defaultPadding: 28, defaultRadius: 20, font: 'Inter', titleWeight: 600,
		background: 'solid', defaultPalette: 'paper', native: true
	},
	tiktok: {
		label: 'TikTok', hint: 'Native TikTok profile',
		aspect: 16 / 9, defaultPadding: 28, defaultRadius: 20, font: 'Inter', titleWeight: 700,
		background: 'solid', defaultPalette: 'midnight', native: true
	},
	youtube: {
		label: 'YouTube', hint: 'Native channel header with banner',
		aspect: 16 / 9, defaultPadding: 0, defaultRadius: 16, font: 'Roboto', titleWeight: 600,
		background: 'solid', defaultPalette: 'paper', native: true
	},
	x: {
		label: 'X', hint: 'Native X profile with cover',
		aspect: 16 / 9, defaultPadding: 0, defaultRadius: 20, font: 'Inter', titleWeight: 700,
		background: 'solid', defaultPalette: 'midnight', native: true
	},
	twitch: {
		label: 'Twitch', hint: 'Native Twitch channel header',
		aspect: 16 / 9, defaultPadding: 0, defaultRadius: 12, font: 'Inter', titleWeight: 700,
		background: 'solid', defaultPalette: 'midnight', native: true
	},
	github: {
		label: 'GitHub', hint: 'Native GitHub profile card',
		aspect: 16 / 9, defaultPadding: 28, defaultRadius: 16, font: 'Inter', titleWeight: 600,
		background: 'solid', defaultPalette: 'midnight', native: true
	}
};

export const PALETTES = {
	midnight: { bg: '#0b0b0f', text: '#ffffff', secondary: '#9aa0a6', accent: '#ff0050' },
	carbon: { bg: '#111315', text: '#f5f5f5', secondary: '#8b989c', accent: '#25f4ee' },
	paper: { bg: '#f4f1ea', text: '#141414', secondary: '#6b6b6b', accent: '#e1306c' },
	mono: { bg: '#000000', text: '#ffffff', secondary: '#7a7a7a', accent: '#ffffff' }
};

export const PALETTE_NAMES = {
	midnight: 'Midnight',
	carbon: 'Carbon',
	paper: 'Paper',
	mono: 'Mono',
	custom: 'Custom'
};

export const FONTS = [
	'Inter',
	'Space Grotesk',
	'Archivo',
	'Anton',
	'Bebas Neue',
	'Playfair Display',
	'JetBrains Mono',
	'Roboto',
	'Satoshi'
];

export const ASPECTS = {
	'16:9': 16 / 9,
	'4:3': 4 / 3,
	'1:1': 1,
	'4:5': 4 / 5,
	'9:16': 9 / 16
};

export const DEFAULT_CONFIG = {
	template: 'ring',
	aspect: 'auto', // auto (per template) | 16:9 | 4:3 | 1:1 | 4:5 | 9:16
	containerSize: 1280, // 720–1920 px, pure uniform zoom of the composition
	padding: 32, // outer frame around the design width
	containerRadius: 32, // whole-card corner radius
	avatarRadius: 50, // avatar corner radius as % of its size (50 = circle)
	palette: 'midnight',
	colors: { bg: '#0b0b0f', text: '#ffffff', secondary: '#9aa0a6', accent: '#ff0050' },
	font: 'Inter',
	background: { type: 'gradient', angle: 135 }, // solid | gradient
	titleScale: 1, // 0.6–1.6
	textScale: 1, // 0.6–1.5
	statCount: 3, // how many stats to show (1–5)
	modules: {
		avatar: true,
		name: true,
		handle: true,
		verified: true,
		platform: true,
		bio: true,
		stats: true,
		location: false,
		link: true
	}
};

export function resolveColors(config) {
	if (config.palette === 'custom') return { ...config.colors };
	return { ...PALETTES[config.palette] };
}

export function naturalAspect(config) {
	return TEMPLATES[config.template]?.aspect ?? 16 / 9;
}

export const PLATFORM_FALLBACK_ACCENT = '#8b989c';
