import { verifyPin, dummyVerify, getBalanceByShortId, getBalanceWithItems, getPreviousBalances } from '$lib/server/balance.js';
import { rateLimit, rateLimitReset } from '$lib/server/rate-limit.js';
import { fail } from '@sveltejs/kit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function load() {
    // Always show PIN screen — no session persistence
    return { authenticated: false };
}

export const actions = {
    default: async ({ request, getClientAddress, params }) => {
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

        if (pin.length !== 4 || !/^[0-9]{4}$/.test(pin)) {
            return fail(400, { error: 'Invalid PIN.' });
        }

        const bal = await getBalanceByShortId(shortId);

        if (!bal) {
            await dummyVerify();
            return fail(401, { error: 'Invalid PIN.' });
        }

        const valid = await verifyPin(pin, bal.pinHash);
        if (!valid) {
            return fail(401, { error: 'Invalid PIN.' });
        }

        rateLimitReset(rlKey);

        const { balance: balData, items } = await getBalanceWithItems(bal.id);
        const previousBalances = await getPreviousBalances(bal.id);
        return { success: true, balance: balData, items, previousBalances };
    }
};
