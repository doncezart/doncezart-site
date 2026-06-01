import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

// Lazy singleton — connection is only created on first query, not at module load.
// This allows the SvelteKit build-time analysis step to import this module
// without DATABASE_URL being present in the build environment.
let _db = null;

function getDb() {
	if (!_db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		const isLocal = /(?:@|\/\/)(?:localhost|127\.0\.0\.1|::1|10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3}|172\.(?:1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})(?::|\/|$)/.test(env.DATABASE_URL);
		const useSsl = env.DB_SSL?.toLowerCase() !== 'false' && !isLocal;
		_db = drizzle(postgres(env.DATABASE_URL, useSsl ? { ssl: 'require' } : {}));
	}
	return _db;
}

export const db = new Proxy(/** @type {any} */ ({}), {
	get(_, prop) {
		const target = getDb();
		const value = target[prop];
		return typeof value === 'function' ? value.bind(target) : value;
	}
});
