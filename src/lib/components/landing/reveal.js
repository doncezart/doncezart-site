// Svelte action: reveal a section's `.l-r` children (blur-to-focus, staggered
// by their `--d`) the first time it scrolls into view.
//
// Content is visible in the server render and without JS. The action only
// hides it once mounted, and only if the section isn't already on screen, so
// nothing flashes.
export function inview(node, { threshold = 0.2 } = {}) {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const r = node.getBoundingClientRect();
	if (r.top < window.innerHeight && r.bottom > 0) return;
	node.classList.add('l-wait');
	const io = new IntersectionObserver(
		([e]) => {
			if (!e.isIntersecting) return;
			node.classList.replace('l-wait', 'l-in');
			io.disconnect();
		},
		{ threshold }
	);
	io.observe(node);
	return { destroy: () => io.disconnect() };
}
