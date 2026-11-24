// Outgoing email (the contact form's confirmation to the sender), over SMTP.
// Configured by SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM; with
// no SMTP_USER/SMTP_PASS it is off and sendConfirmation() returns false.
//
// The recipient address comes from an anonymous form, so the email never
// repeats anything they typed beyond a sanitised first name: it can't be used
// to deliver someone else's text from this domain.
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

export const CONTACT_EMAIL = 'me@doncez.art';

let transport;
function getTransport() {
	if (!env.SMTP_USER || !env.SMTP_PASS) return null;
	const port = Number(env.SMTP_PORT || 465);
	transport ??= nodemailer.createTransport({
		host: env.SMTP_HOST || 'smtp.purelymail.com',
		port,
		secure: port === 465,
		auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
		connectionTimeout: 8000,
		greetingTimeout: 8000,
		socketTimeout: 10000
	});
	return transport;
}

/** First name only, and only if it can't carry a link or address. */
function greeting(name) {
	const first = name.trim().split(/\s+/)[0]?.slice(0, 30) ?? '';
	return /^[\p{L}\p{M}'-]+$/u.test(first) ? first : 'there';
}

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The confirmation email's HTML: a short plain letter, no card or buttons.
// It uses the site's text font (Satoshi) from Fontshare; Apple Mail,
// iOS Mail and Outlook for Mac load them, Gmail and Outlook for Windows fall
// back to Helvetica/Arial. Tables and inline styles because mail apps ignore
// most other CSS.
const TEXT = "'Satoshi','Helvetica Neue',Helvetica,Arial,sans-serif";
const P = `margin:0 0 18px;font-family:${TEXT};font-size:16px;line-height:1.65;color:#1a1a1a`;

function confirmationHtml(hi) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400&display=swap" rel="stylesheet">
<title>Got your message</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your message came through. I'll reply to this address in writing.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff">
<tr><td style="padding:48px 24px">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
	<tr><td>
		<p style="${P}">Hi ${esc(hi)},</p>
		<p style="${P}">Thanks for reaching out. Your message came through, and I'll reply to this address in writing, usually with a plan and a price.</p>
		<p style="${P};margin-bottom:0">If you need to add anything, just reply to this email.</p>
	</td></tr>
	<tr><td style="padding-top:40px">
		<p style="margin:0;padding-top:16px;border-top:1px solid #ececec;font-family:${TEXT};font-size:12px;line-height:1.6;color:#a3a3a3">Sent because this address was entered in the contact form at doncez.art. If that wasn't you, please let me know at <a href="mailto:${CONTACT_EMAIL}" style="color:#a3a3a3;text-decoration:underline">${CONTACT_EMAIL}</a> or through the <a href="https://doncez.art/contact" style="color:#a3a3a3;text-decoration:underline">contact form</a>.</p>
	</td></tr>
	</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Tell the sender their message arrived. Returns true if the email was sent.
 * @param {{ to: string, name: string }} input
 */
export async function sendConfirmation({ to, name }) {
	const t = getTransport();
	if (!t) return false;
	const hi = greeting(name);
	const text = [
		`Hi ${hi},`,
		'',
		"Thanks for reaching out. Your message came through, and I'll reply to this address in writing, usually with a plan and a price.",
		'',
		'If you need to add anything, just reply to this email.',
		'',
		'---',
		`Sent because this address was entered in the contact form at doncez.art. If that wasn't you, please let me know at ${CONTACT_EMAIL} or through the contact form: https://doncez.art/contact`
	].join('\n');
	const html = confirmationHtml(hi);
	try {
		await t.sendMail({
			from: env.MAIL_FROM || `DONCEZART <${env.SMTP_USER}>`,
			to,
			replyTo: CONTACT_EMAIL,
			subject: 'Got your message',
			text,
			html
		});
		return true;
	} catch (e) {
		console.error('Confirmation email failed:', e);
		return false;
	}
}
