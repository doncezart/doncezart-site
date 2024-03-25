import { fail } from '@sveltejs/kit';
import { WEBHOOK_URL, FORM_ID } from '$env/static/private';
export const actions = {

contact: async ({request}) => {
    const data = await request.formData();
    const email = data.get('email');
    const name = data.get('name');
    const message = data.get('message');
    
    /* Handle errors in case any of the fields are left empty */
    if (!email) {return fail(400, { name, email, message, missing_email: true });}
    if (!name) {return fail(400, { name, email, message, missing_name: true });}
    if (!message) {return fail(400, { name, email, message, missing_message: true });}

    /* Send their message via Google Forms */
    var options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json',}}
    fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse?usp=pp_url&entry.1089531311=${encodeURIComponent(email)}&entry.72416378=${encodeURIComponent(name)}&entry.1681488982=${encodeURIComponent(message)}`, options)

    /* Send a Discord Webhook with message contents */
    var options = {
      method: 'POST', headers: {'Content-Type': 'application/json',},
      body: JSON.stringify({content: 'New Message from `'+email+'` |`'+name+'`'+`\n\n`+message ,username: 'System Alert',}),}
    fetch(WEBHOOK_URL, options)

    return { success: true };
}
};