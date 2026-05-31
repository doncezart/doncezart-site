import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { rateLimit } from '$lib/server/rate-limit.js';

const { WEBHOOK_URL, FORM_ID, TURNSTILE_SECRET_KEY } = env;

// RFC-5321 compliant length limits; simple structural check
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Replay-protection: remember consumed Turnstile tokens for the past hour.
const consumedTokens = new Map();
setInterval(() => {
	const cutoff = Date.now() - 60 * 60 * 1000;
	for (const [t, ts] of consumedTokens) if (ts < cutoff) consumedTokens.delete(t);
}, 5 * 60 * 1000).unref?.();

// Strip Discord @everyone / @here pings to prevent notification spam
function sanitizeDiscord(text) {
	return text.replace(/@(everyone|here)/gi, '[@$1]');
}

async function fetchWithTimeout(url, opts = {}, ms = 5000) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), ms);
	try {
		return await fetch(url, { ...opts, signal: ctrl.signal });
	} finally {
		clearTimeout(t);
	}
}

export const actions = {
	send: async ({ request, getClientAddress }) => {
		const ip = getClientAddress();

		// 5 submissions / hour / IP
		const rl = rateLimit(`contact:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
		if (rl.limited) {
			return fail(429, { error: `Too many requests. Try again in ${Math.ceil(rl.retryAfter / 60)} minutes.` });
		}

		const data = await request.formData();
		const email = data.get('email')?.toString().trim() ?? '';
		const name = data.get('name')?.toString().trim() ?? '';
		const message = data.get('message')?.toString() ?? '';
		const turnstileToken = data.get('cf-turnstile-response')?.toString() ?? '';

		if (turnstileToken && consumedTokens.has(turnstileToken)) {
			return fail(400, { name, email, message, captcha_failed: true });
		}

		let verifyData;
		try {
			const verifyRes = await fetchWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					secret: TURNSTILE_SECRET_KEY,
					response: turnstileToken,
					remoteip: ip
				})
			}, 5000);
			verifyData = await verifyRes.json();
		} catch (err) {
			console.error('Turnstile verify error:', err);
			return fail(502, { name, email, message, error: 'Bot check temporarily unavailable. Try again shortly.' });
		}
		if (!verifyData?.success) {
			return fail(400, { name, email, message, captcha_failed: true });
		}
		consumedTokens.set(turnstileToken, Date.now());

		if (!email) return fail(400, { name, email, message, missing_email: true });
		if (!name) return fail(400, { name, email, message, missing_name: true });
		if (!message) return fail(400, { name, email, message, missing_message: true });
		if (email.length > 254 || !EMAIL_RE.test(email)) {
			return fail(400, { name, email, message, error: 'Please enter a valid email address.' });
		}
		if (name.length > 100) {
			return fail(400, { name, email, message, error: 'Name is too long.' });
		}
		if (message.length > 5000) {
			return fail(400, { name, email, message, error: 'Message must be under 5000 characters.' });
		}

		if (FORM_ID) {
			try {
				const url =
					`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse?usp=pp_url` +
					`&entry.1089531311=${encodeURIComponent(email)}` +
					`&entry.72416378=${encodeURIComponent(name)}` +
					`&entry.1681488982=${encodeURIComponent(message)}`;
				await fetchWithTimeout(url, { method: 'POST' }, 5000);
			} catch (err) {
				console.error('Google Forms forward failed:', err);
			}
		}

		if (WEBHOOK_URL && WEBHOOK_URL.startsWith('https://')) {
			try {
				const safeEmail = sanitizeDiscord(email).slice(0, 254);
				const safeName = sanitizeDiscord(name).slice(0, 100);
				const safeMessage = sanitizeDiscord(message).slice(0, 1700);
				await fetchWithTimeout(WEBHOOK_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: `New Message from \`${safeEmail}\` |\`${safeName}\`\n\n${safeMessage}`,
						username: 'System Alert'
					})
				}, 5000);
			} catch (err) {
				console.error('Discord webhook failed:', err);
			}
		}

		return { success: true };
	}
};
