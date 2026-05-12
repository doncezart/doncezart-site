export const load = ({ url, data }) => {
	const { pathname } = url;

	return {
		...data,
		pathname
	};
};