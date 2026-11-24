// Shared metadata for supported social platforms.
// Client-safe (no server imports) so both the profile service and the card
// renderer read one source of truth for labels, icons, and brand accents.

export const PLATFORMS = {
	youtube: { label: 'YouTube', icon: 'fa-brands fa-youtube', accent: '#ff0000', urlBase: 'https://youtube.com/' },
	instagram: { label: 'Instagram', icon: 'fa-brands fa-instagram', accent: '#e1306c', urlBase: 'https://instagram.com/' },
	tiktok: { label: 'TikTok', icon: 'fa-brands fa-tiktok', accent: '#25f4ee', urlBase: 'https://tiktok.com/@' },
	x: { label: 'X', icon: 'fa-brands fa-x-twitter', accent: '#ffffff', urlBase: 'https://x.com/' },
	facebook: { label: 'Facebook', icon: 'fa-brands fa-facebook', accent: '#1877f2', urlBase: 'https://facebook.com/' },
	twitch: { label: 'Twitch', icon: 'fa-brands fa-twitch', accent: '#9146ff', urlBase: 'https://twitch.tv/' },
	github: { label: 'GitHub', icon: 'fa-brands fa-github', accent: '#ffffff', urlBase: 'https://github.com/' },
	dribbble: { label: 'Dribbble', icon: 'fa-brands fa-dribbble', accent: '#ea4c89', urlBase: 'https://dribbble.com/' }
};

export const PLATFORM_KEYS = Object.keys(PLATFORMS);

/** Resolve a platform key from free text (name, alias, or with a leading @). */
const ALIASES = {
	twitter: 'x', yt: 'youtube', ig: 'instagram', insta: 'instagram',
	fb: 'facebook', gh: 'github', tt: 'tiktok', tk: 'tiktok'
};

export function normalizePlatform(name) {
	if (!name) return null;
	const key = String(name).toLowerCase().replace(/^@/, '').trim();
	const resolved = ALIASES[key] ?? key;
	return PLATFORM_KEYS.includes(resolved) ? resolved : null;
}

/** Canonical profile URL for a platform + handle (best effort). */
export function profileUrl(platform, handle) {
	const meta = PLATFORMS[platform];
	if (!meta || !handle) return null;
	const h = String(handle).replace(/^@/, '');
	return `${meta.urlBase}${h}`;
}
