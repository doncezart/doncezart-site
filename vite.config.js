import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Older Android browsers (Huawei Browser, Samsung Internet, stale WebViews)
// run Chromium in the 80s-90s. Vite's default target is early 2023, and at
// that level the CSS minifier rewrites `(max-width: x)` as `(width <= x)` and
// drops fallbacks like `100vh` before `100lvh`, which those browsers can't read,
// so phones lost every mobile style. Targeting Chrome 87 keeps both intact.
// (Syntax only: newer JS APIs still need to be avoided in client code.)
const legacy = ['chrome87', 'edge88', 'firefox78', 'safari14'];

export default defineConfig({
	plugins: [sveltekit()],
	build: { target: legacy, cssTarget: legacy }
});
