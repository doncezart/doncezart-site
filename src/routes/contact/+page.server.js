import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
const { WEBHOOK_URL, FORM_ID, TURNSTILE_SECRET_KEY } = env;

// RFC-5321 compliant length limits; simple structural check
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Strip Discord @everyone / @here pings to prevent notification spam
function sanitizeDiscord(text) {
	return text.replace(/@(everyone|here)/gi, '[@$1]');
}

export const actions = {

send: async ({request, getClientAddress}) => {
    const data = await request.formData();
    const email = data.get('email');
    const name = data.get('name');
    const message = data.get('message');
    const turnstileToken = data.get('cf-turnstile-response');

    /* Verify Turnstile captcha */
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: TURNSTILE_SECRET_KEY,
            response: turnstileToken,
            remoteip: getClientAddress()
        })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
        return fail(400, { name, email, message, captcha_failed: true });
    }
    if (!email || typeof email !== 'string') {return fail(400, { name, email, message, missing_email: true });}
    if (!name || typeof name !== 'string') {return fail(400, { name, email, message, missing_name: true });}
    if (!message || typeof message !== 'string') {return fail(400, { name, email, message, missing_message: true });}
    if (email.length > 254 || !EMAIL_RE.test(email)) {return fail(400, { name, email, message, error: 'Please enter a valid email address.' });}
    if (name.length > 100) {return fail(400, { name, email, message, error: 'Name is too long.' });}
    if (message.length > 5000) {return fail(400, { name, email, message, error: 'Message must be under 5000 characters.' });}

    /* Send their message via Google Forms */
    var options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json',}}
    await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse?usp=pp_url&entry.1089531311=${encodeURIComponent(email)}&entry.72416378=${encodeURIComponent(name)}&entry.1681488982=${encodeURIComponent(message)}`, options)

    /* Send a Discord Webhook with message contents (sanitized to prevent @everyone/@here) */
    const safeEmail = sanitizeDiscord(email);
    const safeName = sanitizeDiscord(name);
    const safeMessage = sanitizeDiscord(message);
    var options = {
      method: 'POST', headers: {'Content-Type': 'application/json',},
      body: JSON.stringify({content: 'New Message from `'+safeEmail+'` |`'+safeName+'`'+`\n\n`+safeMessage ,username: 'System Alert',}),}
    await fetch(WEBHOOK_URL, options)

    return { success: true };
}
};