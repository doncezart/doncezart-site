/**
 * Seed an admin user.
 * Usage: node scripts/seed-admin.js <username> <password>
 */
import 'dotenv/config';
import postgres from 'postgres';
import crypto from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const [, , username, password] = process.argv;
if (!username || !password) {
	console.error('Usage: node scripts/seed-admin.js <username> <password>');
	process.exit(1);
}

function hashPassword(pw) {
	const salt = crypto.randomBytes(16).toString('hex');
	return new Promise((resolve, reject) => {
		crypto.scrypt(pw, salt, 64, (err, derived) => {
			if (err) reject(err);
			resolve(`${salt}:${derived.toString('hex')}`);
		});
	});
}

const sql = postgres(DATABASE_URL);
const id = crypto.randomUUID();
const passwordHash = await hashPassword(password);

await sql`INSERT INTO "user" (id, username, password_hash) VALUES (${id}, ${username}, ${passwordHash})
           ON CONFLICT (username) DO UPDATE SET password_hash = ${passwordHash}`;

console.log(`Admin user "${username}" created/updated.`);
await sql.end();
