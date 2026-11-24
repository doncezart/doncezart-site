// Contact form delivery for /contact.
//
// submitContact() runs the whole pipeline: rate limit, Turnstile check, field
// validation, then forwards the message to Google Forms and the Discord
// webhook. It returns null on success, or { status, body } for the route to
// pass to fail(status, { ...echoedFields, ...body }).
import { env } from '$env/dynamic/private';
import { rateLimit } from '$lib/server/rate-limit.js';

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

/**
 * @param {{ ip: string, email: string, name: string, message: string, token: string }} input
 * @returns {Promise<null | { status: number, body: Record<string, unknown> }>}
 */
export async function submitContact({ ip, email, name, message, token }) {
	const { WEBHOOK_URL, FORM_ID, TURNSTILE_SECRET_KEY } = env;
	const err = (status, body) => ({ status, body });

	// 5 submissions / hour / IP
	const rl = rateLimit(`contact:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
	if (rl.limited) {
		return err(429, { error: `Too many requests. Try again in ${Math.ceil(rl.retryAfter / 60)} minutes.` });
	}

	if (token && consumedTokens.has(token)) return err(400, { captcha_failed: true });

	let verifyData;
	try {
		const verifyRes = await fetchWithTimeout(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ secret: TURNSTILE_SECRET_KEY, response: token, remoteip: ip })
			},
			5000
		);
		verifyData = await verifyRes.json();
	} catch (e) {
		console.error('Turnstile verify error:', e);
		return err(502, { error: 'Bot check temporarily unavailable. Try again shortly.' });
	}
	if (!verifyData?.success) return err(400, { captcha_failed: true });
	consumedTokens.set(token, Date.now());

	if (!email) return err(400, { missing_email: true });
	if (!name) return err(400, { missing_name: true });
	if (!message) return err(400, { missing_message: true });
	if (email.length > 254 || !EMAIL_RE.test(email)) return err(400, { error: 'Please enter a valid email address.' });
	if (name.length > 100) return err(400, { error: 'Name is too long.' });
	if (message.length > 5000) return err(400, { error: 'Message must be under 5000 characters.' });

	if (FORM_ID) {
		try {
			const url =
				`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse?usp=pp_url` +
				`&entry.1089531311=${encodeURIComponent(email)}` +
				`&entry.72416378=${encodeURIComponent(name)}` +
				`&entry.1681488982=${encodeURIComponent(message)}`;
			await fetchWithTimeout(url, { method: 'POST' }, 5000);
		} catch (e) {
			console.error('Google Forms forward failed:', e);
		}
	}

	if (WEBHOOK_URL && WEBHOOK_URL.startsWith('https://')) {
		try {
			const safeEmail = sanitizeDiscord(email).slice(0, 254);
			const safeName = sanitizeDiscord(name).slice(0, 100);
			const safeMessage = sanitizeDiscord(message).slice(0, 1700);
			await fetchWithTimeout(
				WEBHOOK_URL,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: `New Message from \`${safeEmail}\` |\`${safeName}\`\n\n${safeMessage}`,
						username: 'System Alert'
					})
				},
				5000
			);
		} catch (e) {
			console.error('Discord webhook failed:', e);
		}
	}

	return null;
}
