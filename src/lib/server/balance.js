import { db } from '$lib/server/db/index.js';
import { balance, balanceItem } from '$lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SHORT_ID_LENGTH = 8;

/** Generate a random 8-char alphanumeric shortId */
export function generateShortId() {
    const bytes = crypto.randomBytes(SHORT_ID_LENGTH);
    let result = '';
    for (let i = 0; i < SHORT_ID_LENGTH; i++) {
        result += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return result;
}

/** Hash a 4-digit PIN with scrypt. */
export async function hashPin(pin) {
    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
        crypto.scrypt(pin, salt, 64, (err, derived) => {
            if (err) return reject(err);
            resolve(`${salt}:${derived.toString('hex')}`);
        });
    });
}

/**
 * Verify a PIN against a stored scrypt hash.
 * Returns false for malformed stored hashes.
 */
export async function verifyPin(pin, stored) {
    if (typeof stored !== 'string' || !stored.includes(':')) return false;
    const [salt, hashHex] = stored.split(':');
    if (!salt || !hashHex || !/^[0-9a-f]+$/i.test(hashHex)) return false;
    let hashBuf;
    try {
        hashBuf = Buffer.from(hashHex, 'hex');
    } catch {
        return false;
    }
    if (hashBuf.length !== 64) return false;
    return new Promise((resolve, reject) => {
        crypto.scrypt(pin, salt, 64, (err, derived) => {
            if (err) return reject(err);
            try {
                resolve(crypto.timingSafeEqual(hashBuf, derived));
            } catch {
                resolve(false);
            }
        });
    });
}

/**
 * Run a dummy scrypt verification against a known hash.
 * Used when a balance doesn't exist, so timing is identical
 * to a real (but incorrect) PIN attempt.
 */
export async function dummyVerify() {
    // Pre-computed hash of "0000" — just a fixed target for timing padding.
    const dummy = '00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    return verifyPin('0000', dummy);
}

/**
 * Get a balance by shortId.
 * Returns null if not found.
 */
export async function getBalanceByShortId(shortId) {
    const rows = await db
        .select()
        .from(balance)
        .where(eq(balance.shortId, shortId))
        .limit(1);
    return rows[0] ?? null;
}

/**
 * Get a balance with items by id.
 * Returns { balance, items } or null.
 */
export async function getBalanceWithItems(balanceId) {
    const [bal] = await db
        .select()
        .from(balance)
        .where(eq(balance.id, balanceId))
        .limit(1);
    if (!bal) return null;
    const items = await db
        .select()
        .from(balanceItem)
        .where(eq(balanceItem.balanceId, balanceId))
        .orderBy(balanceItem.sortOrder, balanceItem.createdAt);
    return { balance: bal, items };
}

/** Session cookie name pattern */
export function sessionCookieName(shortId) {
    return `balance_session_${shortId}`;
}
