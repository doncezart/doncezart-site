export function load({ locals }) {
	return { user: { username: locals.user?.username } };
}
