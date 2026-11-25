<script>
	// Full-screen animated background modelled on the DONCEZART avatar:
	// two ember gradients (deep red -> red -> orange -> cream) bleeding in from
	// opposite corners over pure black, with heavy animated film grain.
	//
	// Extra layers (each can be switched off through the `fx` prop):
	//   intro   - embers ignite from the corners on load with a brief flash
	//   flames  - ember edges become flame tongues licking toward the centre
	//   sparks  - glowing embers drift upward, flicker and die out
	//   trail   - the cursor leaves a smoky heat trail that warps the gradient
	//   ripple  - clicking sends a heat shockwave through the embers
	//
	// Raw WebGL so we own every pixel; falls back to a CSS gradient if WebGL
	// is unavailable.
	import { onMount } from 'svelte';

	let {
		/** 0..1, how far the hero has scrolled away. Embers recede as it grows. */
		scroll = 0,
		fx = { intro: true, flames: true, sparks: true, trail: true, ripple: false },
		/** Bump this number to replay the ignition intro. */
		replay = 0
	} = $props();

	let canvas;
	let fallback = $state(false);
	// Plain mirrors of the props so the render loop reads them without
	// touching Svelte reactivity every frame.
	let scrollTarget = 0;
	let fxNow = { ...fx };
	let restartIntro = () => {};
	$effect(() => {
		scrollTarget = scroll;
	});
	$effect(() => {
		fxNow = { ...fx };
	});
	$effect(() => {
		replay;
		restartIntro();
	});

	const TRAIL = 24;
	const RIPPLES = 3;

	const vert = `
		attribute vec2 a_pos;
		void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
	`;

	const frag = `
		precision highp float;
		uniform vec2 u_res;
		uniform float u_time;
		uniform vec2 u_mouse;
		uniform float u_scroll;
		uniform float u_intro;          // 0 -> 1 ignition progress
		uniform vec4 u_fx;              // flames, sparks, trail, ripple (0/1)
		uniform vec3 u_trail[${TRAIL}]; // x, y, strength (scales with cursor speed)
		uniform vec3 u_rip[${RIPPLES}]; // x, y, age in seconds (<0 = off)

		// Dave Hoskins' hashes: no visible lattice/streak artifacts.
		float hash(vec2 p) {
			vec3 p3 = fract(vec3(p.xyx) * 0.1031);
			p3 += dot(p3, p3.yzx + 33.33);
			return fract((p3.x + p3.y) * p3.z);
		}
		vec2 hash22(vec2 p) {
			vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
			p3 += dot(p3, p3.yzx + 33.33);
			return fract((p3.xx + p3.yz) * p3.zy);
		}
		float noise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			float a = hash(i), b = hash(i + vec2(1.0, 0.0));
			float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
			return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
		}
		float fbm(vec2 p) {
			float v = 0.0, a = 0.5;
			for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
			return v;
		}

		// black -> deep red -> red -> hot orange -> peach -> cream
		vec3 ramp(float t) {
			vec3 col = vec3(0.0);
			col = mix(col, vec3(0.20, 0.00, 0.00), smoothstep(0.00, 0.30, t));
			col = mix(col, vec3(0.88, 0.02, 0.00), smoothstep(0.22, 0.55, t));
			col = mix(col, vec3(1.00, 0.18, 0.00), smoothstep(0.50, 0.72, t));
			col = mix(col, vec3(1.00, 0.42, 0.14), smoothstep(0.72, 1.00, t));
			return col;
		}

		// One corner ember. The radius is modulated by noise in polar
		// coordinates that flows outward, so the edge becomes flame tongues.
		// v is flipped per corner so atan's seam always sits off-screen.
		float ember(vec2 p, vec2 c, float r, float flip, float seed, float t) {
			vec2 v = (p - c) * flip;
			float d = length(v);
			float a = atan(v.y, v.x);
			float n = fbm(vec2(a * 2.6 + seed, d * 2.2 - t * 0.32));
			float rr = r * (1.0 + u_fx.x * 0.24 * (n - 0.5));
			return pow(clamp(1.0 - d / rr, 0.0, 1.0), 1.35);
		}

		// Three parallax layers of rising sparks. Each grid cell may hold one
		// spark, stretched vertically (motion streak), flickering, with a
		// per-cell lifetime so sparks die out mid-air.
		vec3 sparks(vec2 p, float t) {
			vec3 acc = vec3(0.0);
			for (int i = 0; i < 3; i++) {
				float fi = float(i);
				float sc = 6.0 + fi * 5.0;
				float sp = 0.07 + fi * 0.04;
				vec2 q = p * sc;
				q.y -= t * sp * sc;
				q.x += sin(q.y * 0.35 + t * 0.7 + fi * 2.0) * 0.6;
				vec2 cell = floor(q);
				vec2 h = hash22(cell + fi * 37.0);
				if (h.x > 0.05) continue;
				vec2 f = fract(q) - 0.5;
				vec2 pos = (hash22(cell * 1.7 + 3.1) - 0.5) * 0.6;
				vec2 dd = (f - pos) * vec2(1.0, 0.4);
				float d = length(dd);
				float size = 0.016 + 0.022 * h.y;
				float core = smoothstep(size, 0.0, d);
				float glow = exp(-d * d * 360.0) * 0.3;
				float flick = 0.6 + 0.4 * sin(t * (5.0 + h.y * 9.0) + h.x * 60.0);
				float life = sin(3.14159 * fract(t * (0.12 + 0.1 * h.y) + h.y * 7.0));
				float b = (core + glow) * flick * life * (1.0 - fi * 0.22);
				acc += mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.88, 0.65), core) * b;
			}
			return acc;
		}

		void main() {
			vec2 uv = gl_FragCoord.xy / u_res;
			float aspect = u_res.x / u_res.y;
			vec2 p0 = (uv - 0.5) * vec2(aspect, 1.0);
			float t = u_time;

			// Cursor heat trail. Point strength rises with cursor speed, and the
			// raw sum feeds the same colour ramp as the corners: a slow drag is a
			// dark red wisp, a fast flick glows a brighter red.
			float heatRaw = 0.0;
			if (u_fx.z > 0.5) {
				for (int i = 0; i < ${TRAIL}; i++) {
					vec3 tr = u_trail[i];
					vec2 dv = p0 - tr.xy;
					heatRaw += tr.z * exp(-dot(dv, dv) / 0.0018);
				}
			}
			float heat = 1.0 - exp(-heatRaw * 0.7);

			// Click shockwaves: an expanding ring that pushes the gradient out.
			float rip = 0.0;
			vec2 ripWarp = vec2(0.0);
			if (u_fx.w > 0.5) {
				for (int i = 0; i < ${RIPPLES}; i++) {
					vec3 r = u_rip[i];
					if (r.z < 0.0) continue;
					vec2 dv = p0 - r.xy;
					float d = length(dv);
					float k = (d - r.z * 0.85) / 0.07;
					float ring = exp(-k * k) * exp(-r.z * 1.4);
					rip += ring;
					ripWarp += dv / (d + 1e-4) * ring * 0.05;
				}
			}

			// Slow domain warp so the ember edges breathe like smoke, plus heat
			// haze around the cursor and the shockwave push.
			vec2 p = p0;
			vec2 w = vec2(fbm(p * 1.4 + t * 0.05), fbm(p * 1.4 - t * 0.04 + 7.3)) - 0.5;
			p += w * 0.32;
			p += (vec2(noise(p0 * 9.0 + t * 1.3), noise(p0 * 9.0 - t * 1.1 + 4.0)) - 0.5) * 0.045 * heat;
			p -= ripWarp;

			// Corners lean slightly toward the cursor (parallax).
			vec2 m = u_mouse * 0.05;
			vec2 cA = vec2(-0.5 * aspect, 0.5) + 0.07 * vec2(sin(t * 0.21), cos(t * 0.17)) + m;
			vec2 cB = vec2( 0.5 * aspect, -0.5) + 0.07 * vec2(cos(t * 0.19), sin(t * 0.23)) + m;

			float ig = u_intro;
			float r = (0.44 + 0.12 * aspect)
				* (1.0 + 0.035 * sin(t * 0.6))
				* (1.0 - 0.3 * u_scroll)
				* (0.06 + 0.94 * ig);
			float fBase = max(ember(p, cA, r, 1.0, 0.0, t), ember(p, cB, r * 0.96, -1.0, 11.0, t));
			// Text-safe zone: dim the fire behind the headline so the centre
			// stays black like the avatar, however far the flames reach.
			vec2 cz = p0 * vec2(0.62, 1.15);
			fBase *= 0.82 * (1.0 - 0.85 * exp(-dot(cz, cz) * 4.0));

			// Ignition flash: over-bright while the embers are still expanding.
			float f = fBase * (1.0 + 0.12 * sin(3.14159 * ig));

			// Heat trail reads as smoke, not a flat blob.
			float smoke = fbm(p0 * 3.5 + vec2(0.0, -t * 0.5));
			// Saturating curve: speed still pushes it up the ramp, but even a
			// fast flick tops out at red (never orange/white), and it's damped
			// where the corner embers are already hot.
			float heatF = 0.22 * (1.0 - exp(-heatRaw * 0.6)) * (0.8 + 0.2 * smoke);
			f += heatF * (1.0 - 0.6 * f);
			f += rip * 0.55;

			// Film grain: jitters the ramp (bright edges dissolve into speckle
			// like the avatar) and adds a luminance speckle on top.
			vec2 gp = gl_FragCoord.xy + fract(floor(t * 24.0) * vec2(0.1371, 0.0713)) * 997.0;
			float g1 = hash(gp);
			float g2 = hash(gp + 31.7);
			f = clamp(f + (g1 - 0.5) * 0.06, 0.0, 1.0);

			vec3 col = ramp(f);

			if (u_fx.y > 0.5) {
				// Sparks are densest over the fire, sparser over the black.
				float wgt = (0.08 + 0.4 * fBase + 0.2 * heat) * ig;
				col += sparks(p0 + w * 0.08, t) * wgt;
			}

			col += (g2 - 0.5) * (0.02 + 0.05 * f);
			gl_FragColor = vec4(min(col, 1.0), 1.0);
		}
	`;

	onMount(() => {
		// ?off=bg (static/diag.js): skip WebGL, show the CSS stand-in.
		if (document.documentElement.classList.contains('off-bg')) {
			fallback = true;
			return;
		}
		// Tell the diagnostics if the browser takes the GPU context away.
		canvas.addEventListener('webglcontextlost', () => window.__diag?.('webgl-lost', 'ember canvas'));
		const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
		if (!gl) {
			fallback = true;
			return;
		}

		const compile = (type, src) => {
			const s = gl.createShader(type);
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
				console.warn('Ember shader error:', gl.getShaderInfoLog(s));
				return null;
			}
			return s;
		};
		const vs = compile(gl.VERTEX_SHADER, vert);
		const fs = compile(gl.FRAGMENT_SHADER, frag);
		if (!vs || !fs) {
			fallback = true;
			return;
		}
		const prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			fallback = true;
			return;
		}
		gl.useProgram(prog);

		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(prog, 'a_pos');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

		const u = (name) => gl.getUniformLocation(prog, name);
		const uRes = u('u_res');
		const uTime = u('u_time');
		const uMouse = u('u_mouse');
		const uScroll = u('u_scroll');
		const uIntro = u('u_intro');
		const uFx = u('u_fx');
		const uTrail = u('u_trail');
		const uRip = u('u_rip');

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		// Grain is meant to be pixel-sized; cap DPR so 4K screens stay cheap.
		// Phones and tablets: draw at 1x (the gradient is soft, so it upscales
		// cleanly) and at ~25fps, and skip the cursor trail (no hover on touch).
		// Cuts the per-frame GPU work to well under half.
		const touch = window.matchMedia('(pointer: coarse)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, touch ? 1 : 1.5);
		const frameMs = touch ? 40 : 33;

		const resize = () => {
			const w = Math.round(canvas.clientWidth * dpr);
			const h = Math.round(canvas.clientHeight * dpr);
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport(0, 0, w, h);
			}
		};
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(canvas);

		// Pointer position in the shader's space: centred, y up, x scaled by aspect.
		const toShader = (e) => {
			const aspect = window.innerWidth / window.innerHeight;
			return [(e.clientX / window.innerWidth - 0.5) * aspect, 0.5 - e.clientY / window.innerHeight];
		};

		const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
		const trail = new Float32Array(TRAIL * 3);
		let head = 0;
		let lastPt = null;
		let lastT = 0;
		let speed = 0; // smoothed, in screen-heights per second
		const pushTrail = (x, y, strength) => {
			head = (head + 1) % TRAIL;
			trail[head * 3] = x;
			trail[head * 3 + 1] = y;
			trail[head * 3 + 2] = strength;
		};
		// Slow drag (< ~0.4 screens/s) -> faint red; a fast flick (~3.5+) -> white-hot.
		const strengthFor = (v) => 0.15 + 1.45 * Math.pow(Math.min(1, Math.max(0, (v - 0.4) / 3.1)), 0.8);
		const onMove = (e) => {
			mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
			mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
			const [x, y] = toShader(e);
			if (!lastPt) {
				lastPt = [x, y];
				lastT = e.timeStamp;
				pushTrail(x, y, strengthFor(0));
				return;
			}
			const dx = x - lastPt[0];
			const dy = y - lastPt[1];
			const dist = Math.hypot(dx, dy);
			if (dist < 0.012) return;
			const dt = Math.max(1, e.timeStamp - lastT) / 1000;
			speed = speed * 0.6 + (dist / dt) * 0.4;
			const strength = strengthFor(speed);
			// Fill gaps on fast moves so the trail stays continuous.
			const steps = Math.min(4, Math.ceil(dist / 0.025));
			for (let i = 1; i <= steps; i++) pushTrail(lastPt[0] + (dx * i) / steps, lastPt[1] + (dy * i) / steps, strength);
			lastPt = [x, y];
			lastT = e.timeStamp;
		};
		window.addEventListener('pointermove', onMove, { passive: true });

		const rip = new Float32Array(RIPPLES * 3);
		const ripStart = new Array(RIPPLES).fill(-1);
		let ripNext = 0;
		const onDown = (e) => {
			const [x, y] = toShader(e);
			rip[ripNext * 3] = x;
			rip[ripNext * 3 + 1] = y;
			ripStart[ripNext] = performance.now();
			ripNext = (ripNext + 1) % RIPPLES;
		};
		window.addEventListener('pointerdown', onDown, { passive: true });

		let introStart = null;
		restartIntro = () => {
			introStart = null;
		};
		const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

		let raf;
		let last = 0;
		let smoothScroll = scrollTarget;
		const start = performance.now();

		const render = (now, still = false) => {
			mouse.x += (mouse.tx - mouse.x) * 0.06;
			mouse.y += (mouse.ty - mouse.y) * 0.06;
			smoothScroll += (scrollTarget - smoothScroll) * 0.15;
			for (let i = 0; i < TRAIL; i++) trail[i * 3 + 2] *= 0.86;
			for (let i = 0; i < RIPPLES; i++) {
				const age = (now - ripStart[i]) / 1000;
				rip[i * 3 + 2] = ripStart[i] < 0 || age > 2.5 ? -1 : age;
			}
			if (introStart === null) introStart = now;
			const intro = still || !fxNow.intro ? 1 : easeOutCubic(Math.min(1, (now - introStart) / 2400));

			gl.uniform2f(uRes, canvas.width, canvas.height);
			gl.uniform1f(uTime, still ? 0 : (now - start) / 1000);
			gl.uniform2f(uMouse, mouse.x, mouse.y);
			gl.uniform1f(uScroll, smoothScroll);
			gl.uniform1f(uIntro, intro);
			gl.uniform4f(
				uFx,
				fxNow.flames ? 1 : 0,
				fxNow.sparks ? 1 : 0,
				fxNow.trail && !still && !touch ? 1 : 0,
				fxNow.ripple && !still ? 1 : 0
			);
			gl.uniform3fv(uTrail, trail);
			gl.uniform3fv(uRip, rip);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		const loop = (now) => {
			raf = requestAnimationFrame(loop);
			// ~30fps is plenty for embers + film grain, and halves GPU cost.
			if (now - last < frameMs) return;
			last = now;
			render(now);
		};

		if (reduceMotion) render(performance.now(), true);
		else raf = requestAnimationFrame(loop);
		canvas.dataset.ready = 'true';

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerdown', onDown);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	});
</script>

<div class="ember" class:fallback aria-hidden="true">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	/* Sized to the large viewport (URL bar hidden), not inset: 0, so the
	   canvas doesn't resize, and reallocate, each time a phone's URL bar
	   slides in or out mid-scroll. */
	.ember {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		height: 100lvh;
		z-index: 0;
		pointer-events: none;
		background: #000;
	}
	/* Static stand-in, only used when WebGL is unavailable. */
	.ember.fallback {
		background:
			radial-gradient(70% 60% at 0% 0%, #ff6a24 0%, #c41200 22%, #2a0000 48%, transparent 66%),
			radial-gradient(70% 60% at 100% 100%, #ff6a24 0%, #c41200 22%, #2a0000 48%, transparent 66%),
			#000;
	}
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
