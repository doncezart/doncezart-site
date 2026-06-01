import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ["'self'"],
				'script-src': [
					"'self'",
					"'unsafe-inline'",
					'https://challenges.cloudflare.com',
					'https://analytics.ceza.ro'
				],
				'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
				'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
				'img-src': [
					"'self'",
					'data:',
					'blob:',
					'https://doncezart.nyc3.cdn.digitaloceanspaces.com',
					'https://cdn.doncez.art'
				],
				'media-src': ["'self'", 'https://cdn.doncez.art'],
				'connect-src': [
					"'self'",
					'https://challenges.cloudflare.com',
					'https://analytics.ceza.ro'
				],
				'frame-src': ['https://challenges.cloudflare.com'],
				'object-src': ["'none'"],
				'base-uri': ["'self'"],
				'form-action': ["'self'"],
				'frame-ancestors': ["'self'"]
			}
		}
	}
};

export default config;
