// Registry of public tools. Single source of truth for the navbar Tools dropdown,
// the /tools index page, and the footer. Add a new tool here and it appears everywhere.

export const tools = [
	{
		slug: 'youtube-card',
		name: 'YouTube Card Generator',
		description: 'Turn any YouTube video into a clean, branded reference card.',
		href: '/tools/youtube-card',
		icon: 'fa-brands fa-youtube',
		status: 'live'
	},
	{
		slug: 'profile-card',
		name: 'Social Profile Card',
		description: 'Turn any social handle into a designer profile card.',
		href: '/tools/profile-card',
		icon: 'fa-solid fa-id-badge',
		status: 'live'
	},
	{
		slug: 'cutting-mat',
		name: 'Cutting Mat Generator',
		description: 'Generate a self-healing cutting mat texture. Export PNG or SVG.',
		href: '/tools/cutting-mat',
		icon: 'fa-solid fa-ruler-combined',
		status: 'live'
	}
];