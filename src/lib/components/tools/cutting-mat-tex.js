// Surface textures for the cutting mat, as small images instead of SVG
// filters. Browsers compute feTurbulence/lighting on the CPU (about a second
// per megapixel), which made big exports slow and the 100% view unusable.
// These tiles are generated once per seed in a few milliseconds and drawn as
// SVG patterns that map 1:1 onto output pixels, so grain stays crisp at any
// resolution. Browser only (needs a canvas).

const GRAIN_TILE = 256;
const TEX_TILE = 240; // the pebble periods (3 px and 1.5 px) divide it exactly

/** Seeded PRNG (mulberry32), same as the mat's wear. */
function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Value noise on a lattice that wraps every `px` × `py` cells (tileable). */
function lattice(rand, px, py) {
	const v = new Float32Array(px * py);
	for (let i = 0; i < v.length; i++) v[i] = rand();
	return (x, y) => {
		const x0 = Math.floor(x);
		const y0 = Math.floor(y);
		const tx = smooth(x - x0);
		const ty = smooth(y - y0);
		const xa = ((x0 % px) + px) % px;
		const xb = (xa + 1) % px;
		const ya = ((y0 % py) + py) % py;
		const yb = (ya + 1) % py;
		const a = v[ya * px + xa] + (v[ya * px + xb] - v[ya * px + xa]) * tx;
		const b = v[yb * px + xa] + (v[yb * px + xb] - v[yb * px + xa]) * tx;
		return a + (b - a) * ty;
	};
}

/**
 * Signed field (-1…1) → RGBA: positive lightens (white), negative darkens
 * (black), alpha = strength. Drawn over the mat colour it shifts it evenly.
 */
function toCanvas(w, h, field, gain) {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	const img = ctx.createImageData(w, h);
	const d = img.data;
	for (let i = 0, p = 0; i < field.length; i++, p += 4) {
		const v = field[i];
		const c = v > 0 ? 255 : 0;
		d[p] = c;
		d[p + 1] = c;
		d[p + 2] = c;
		d[p + 3] = Math.min(255, Math.abs(v) * gain * 255);
	}
	ctx.putImageData(img, 0, 0);
	return canvas;
}

/** Per-pixel grain: every pixel its own speck, roughly Gaussian. */
function grainCanvas(seed) {
	const rand = rng(seed * 31 + 1);
	const n = GRAIN_TILE * GRAIN_TILE;
	const f = new Float32Array(n);
	for (let i = 0; i < n; i++) f[i] = (rand() + rand() + rand() - 1.5) / 1.5;
	return toCanvas(GRAIN_TILE, GRAIN_TILE, f, 1.6);
}

/** Pebbled matte surface: a 3 px bump map lit from the top left. */
function textureCanvas(seed) {
	const rand = rng(seed * 131 + 7);
	const T = TEX_TILE;
	const n1 = lattice(rand, T / 3, T / 3);
	const n2 = lattice(rand, T / 1.5, T / 1.5);
	const hgt = new Float32Array(T * T);
	for (let y = 0; y < T; y++) {
		for (let x = 0; x < T; x++) hgt[y * T + x] = n1(x / 3, y / 3) + 0.5 * n2(x / 1.5, y / 1.5);
	}
	// light from the top left, ~58° up
	const lx = -0.6;
	const ly = -0.6;
	const lz = 0.53;
	const ll = Math.hypot(lx, ly, lz);
	const flat = lz / ll;
	const s = 1.2; // bump strength
	const f = new Float32Array(T * T);
	for (let y = 0; y < T; y++) {
		const ym = ((y - 1 + T) % T) * T;
		const yp = ((y + 1) % T) * T;
		for (let x = 0; x < T; x++) {
			const xm = (x - 1 + T) % T;
			const xp = (x + 1) % T;
			const dx = (hgt[y * T + xp] - hgt[y * T + xm]) * s;
			const dy = (hgt[yp + x] - hgt[ym + x]) * s;
			const nl = Math.hypot(dx, dy, 1);
			const shade = (-dx * lx - dy * ly + lz) / (nl * ll);
			f[y * T + x] = (shade - flat) * 1.1;
		}
	}
	return toCanvas(T, T, f, 1);
}

/** Large soft blotches across the whole mat (low-res, stretched smoothly). */
function mottleCanvas(seed, aspect) {
	const rand = rng(seed * 977 + 3);
	const w = 256;
	const h = Math.max(8, Math.round(w / Math.max(0.1, aspect)));
	const cells = 9; // blotches across the long side
	const k = cells / Math.max(w, h);
	const n1 = lattice(rand, 64, 64);
	const n2 = lattice(rand, 64, 64);
	const f = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const v = n1(x * k, y * k) + 0.5 * n2(x * k * 2.1, y * k * 2.1);
			f[y * w + x] = (v / 1.5 - 0.5) * 2;
		}
	}
	return toCanvas(w, h, f, 0.9);
}

const toBlobUrl = (canvas) =>
	new Promise((res) => canvas.toBlob((b) => res(b ? URL.createObjectURL(b) : canvas.toDataURL('image/png')), 'image/png'));

/**
 * Build the texture set for a seed + mat aspect.
 * `preview` uses blob: URLs (cheap to re-render inline); `embed` uses data:
 * URLs, which an SVG needs when it is drawn into a canvas or downloaded.
 */
export async function makeTextures(seed, aspect) {
	const canvases = { grain: grainCanvas(seed), texture: textureCanvas(seed), mottle: mottleCanvas(seed, aspect) };
	const preview = {};
	const embed = {};
	for (const [k, c] of Object.entries(canvases)) {
		preview[k] = await toBlobUrl(c);
		embed[k] = c.toDataURL('image/png');
	}
	const sizes = { grain: GRAIN_TILE, texture: TEX_TILE };
	return {
		preview: { ...preview, sizes },
		embed: { ...embed, sizes },
		revoke: () => Object.values(preview).forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u))
	};
}
