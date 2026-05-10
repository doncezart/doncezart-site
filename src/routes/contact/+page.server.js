import { fail } from '@sveltejs/kit';
import { WEBHOOK_URL, FORM_ID, TURNSTILE_SECRET_KEY } from '$env/static/private';
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
    if (!email) {return fail(400, { name, email, message, missing_email: true });}
    if (!name) {return fail(400, { name, email, message, missing_name: true });}
    if (!message) {return fail(400, { name, email, message, missing_message: true });}

    /* Send their message via Google Forms */
    var options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json',}}
    await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse?usp=pp_url&entry.1089531311=${encodeURIComponent(email)}&entry.72416378=${encodeURIComponent(name)}&entry.1681488982=${encodeURIComponent(message)}`, options)

    /* Send a Discord Webhook with message contents */
    var options = {
      method: 'POST', headers: {'Content-Type': 'application/json',},
      body: JSON.stringify({content: 'New Message from `'+email+'` |`'+name+'`'+`\n\n`+message ,username: 'System Alert',}),}
    await fetch(WEBHOOK_URL, options)

    return { success: true };
}
};