import { fail } from '@sveltejs/kit';
import { submitContact } from '$lib/server/contact.js';
import { sendConfirmation, sendNotification, CONTACT_EMAIL } from '$lib/server/mail.js';
import { TOPICS } from '$lib/data/contact.js';

export const actions = {
	send: async ({ request, getClientAddress }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const link = data.get('link')?.toString().trim().slice(0, 300) ?? '';
		const topics = data.getAll('topics').map(String).filter((t) => TOPICS.includes(t));
		const body = data.get('message')?.toString().trim() ?? '';
		const token = data.get('cf-turnstile-response')?.toString() ?? '';
		const echo = { name, email, link, topics, message: body };

		// The inbox only takes one message field, so the extras ride on top.
		const header = [topics.length && `Needs: ${topics.join(', ')}`, link && `Link: ${link}`].filter(Boolean).join('\n');
		const message = body && (header ? `${header}\n\n${body}` : body);

		const ip = getClientAddress();
		const res = await submitContact({ ip, email, name, message, token });
		if (res) return fail(res.status, { ...echo, ...res.body });
		// The message itself, emailed to the inbox. If that fails, say so
		// rather than show a thank-you for a message nobody will read.
		const notified = await sendNotification({ name, email, topics, link, message: body, ip });
		if (notified === false) {
			return fail(502, { ...echo, error: `Your message couldn't be sent. Please email ${CONTACT_EMAIL} directly.` });
		}
		// The confirmation is best-effort; the page words its thank-you
		// around whether it went out.
		const confirmed = await sendConfirmation({ to: email, name });
		return { success: true, name, email, confirmed };
	}
};
