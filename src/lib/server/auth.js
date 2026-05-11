import { db } from '$lib/server/db/index.js';
import { user, session } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

/** Hash a password with scrypt (no extra deps). */
export async function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	return new Promise((resolve, reject) => {
		crypto.scrypt(password, salt, 64, (err, derived) => {
			if (err) reject(err);
			resolve(`${salt}:${derived.toString('hex')}`);
		});
	});
}

/** Verify a password against a stored hash. */
export async function verifyPassword(password, stored) {
	const [salt, hash] = stored.split(':');
	return new Promise((resolve, reject) => {
		crypto.scrypt(password, salt, 64, (err, derived) => {
			if (err) reject(err);
			resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived));
		});
	});
}

/** Create a session row and return its id. */
export async function createSession(userId) {
	const id = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
	await db.insert(session).values({ id, userId, expiresAt });
	return id;
}

/** Validate a session id. Returns { user, session } or null. */
export async function validateSession(sessionId) {
	if (!sessionId) return null;
	const rows = await db
		.select()
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, sessionId))
		.limit(1);
	if (!rows.length) return null;
	const row = rows[0];
	if (row.session.expiresAt < new Date()) {
		await db.delete(session).where(eq(session.id, sessionId));
		return null;
	}
	return { user: row.user, session: row.session };
}

/** Delete a session (logout). */
export async function deleteSession(sessionId) {
	await db.delete(session).where(eq(session.id, sessionId));
}
