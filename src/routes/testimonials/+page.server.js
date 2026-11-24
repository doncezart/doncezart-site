import { redirect } from '@sveltejs/kit';

// Testimonials moved onto the landing page's results; old links land there.
export function load() {
	redirect(308, '/#results');
}
