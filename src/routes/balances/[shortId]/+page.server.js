import { verifyPin, dummyVerify, getBalanceByShortId, getBalanceWithItems, sessionCookieName } from '$lib/server/balance.js';
import { rateLimit, rateLimitReset } from '$lib/server/rate-limit.js';
import { fail, redirect } from '@sveltejs/kit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function load({ params, cookies }) {
    const cookieName = sessionCookieName(params.shortId);
    const balanceId = cookies.get(cookieName);
    if (!balanceId) {
        return { authenticated: false };
    }
    const data = await getBalanceWithItems(balanceId);
    if (!data) {
        return { authenticated: false };
    }
    return {
        authenticated: true,
        balance: data.balance,
        items: data.items
    };
}

export const actions = {
    default: async ({ request, cookies, getClientAddress, params, url }) => {
        const ip = getClientAddress();
        const shortId = params.shortId;

        // Rate limit per IP + balance
        const rlKey = `balance_pin:${ip}:${shortId}`;
        const rl = rateLimit(rlKey, { max: MAX_ATTEMPTS, windowMs: WINDOW_MS });
        if (rl.limited) {
            return fail(429, { error: 'Too many attempts. Please try again in 15 minutes.' });
        }

        const data = await request.formData();
        const pin = data.get('pin')?.toString() ?? '';

        if (pin.length !== 4 || !/^[a-zA-Z]{4}$/.test(pin)) {
            return fail(400, { error: 'Invalid PIN.' });
        }

        const bal = await getBalanceByShortId(shortId);

        if (!bal) {
            // Balance doesn't exist — run dummy verify for timing parity, then return generic error
            await dummyVerify();
            return fail(401, { error: 'Invalid PIN.' });
        }

        const valid = await verifyPin(pin, bal.pinHash);
        if (!valid) {
            return fail(401, { error: 'Invalid PIN.' });
        }

        // Correct PIN — reset rate limit, set session cookie and redirect
        rateLimitReset(rlKey);
        const cookieName = sessionCookieName(shortId);
        cookies.set(cookieName, bal.id, {
            path: `/balances/${shortId}`,
            httpOnly: true,
            sameSite: 'lax',
            secure: url.protocol === 'https:',
            maxAge: 86400 // 24 hours
        });

        throw redirect(303, `/balances/${shortId}`);
    }
};
