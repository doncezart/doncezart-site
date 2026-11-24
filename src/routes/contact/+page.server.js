import { fail } from '@sveltejs/kit';
import { submitContact } from '$lib/server/contact.js';
import { sendConfirmation } from '$lib/server/mail.js';
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

		const res = await submitContact({ ip: getClientAddress(), email, name, message, token });
		if (res) return fail(res.status, { ...echo, ...res.body });
		// The message is already delivered; the confirmation is best-effort and
		// the page words its thank-you around whether it went out.
		const confirmed = await sendConfirmation({ to: email, name });
		return { success: true, name, email, confirmed };
	}
};
