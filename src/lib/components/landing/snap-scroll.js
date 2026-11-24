// Page-wide stepped scrolling: one gesture = one stop.
//
// Anything on the page can register "stops" (absolute scroll positions). Inside
// the range from the first stop to the last, every scroll gesture (wheel flick,
// trackpad swipe, arrow/page/space key, touch swipe) animates to the next or
// previous stop instead of scrolling freely. Past the last stop (a footer, say)
// the page scrolls natively again.
//
//   - Sections: `use:snapSection` on the element. A section one screen tall gets
//     a stop at its top; a taller one also gets stops down its length so no
//     content is skipped.
//   - Custom stops: `addStops(() => [y1, y2, ...], onTarget)`. `onTarget(y)` is
//     called with the destination when a step starts and `null` when it ends,
//     so components can swap their content on the gesture rather than halfway
//     through the scroll (ResultsCases does this for its case studies).
//
// Fast-forward: scrolling again while a step is still moving (another flick,
// a long hard wheel spin, a held arrow key, a second swipe) doesn't wait for
// it to finish. The step re-aims one stop further and speeds up, so scrolling
// fast flies through the stops instead of queueing behind each animation.
//
// Turned off for prefers-reduced-motion (the page just scrolls normally).
import gsap from 'gsap';

const groups = new Set();
let teardown = null;
let tween = null;
let dest = null; // where the running step is heading
let lastRetarget = 0;

/** All stops, sorted, de-duplicated and clamped to the scrollable range. */
function stops() {
	const max = document.documentElement.scrollHeight - window.innerHeight;
	const ys = [];
	for (const g of groups) for (const y of g.getStops()) ys.push(Math.round(Math.max(0, Math.min(max, y))));
	ys.sort((a, b) => a - b);
	return ys.filter((y, i) => i === 0 || y - ys[i - 1] > 2);
}

function notify(y) {
	for (const g of groups) g.onTarget?.(y);
}

function stopTween() {
	if (!tween) return;
	tween.kill();
	tween = null;
	dest = null;
	notify(null);
}

/**
 * Tween the page to y. `chained`: re-aiming a step that is already moving, so
 * start at speed (ease-out only) and go quicker than a step from rest.
 */
function animateTo(y, chained) {
	if (tween) tween.kill();
	tween = null;
	const from = window.scrollY;
	const screens = Math.abs(y - from) / window.innerHeight;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduce || screens < 0.005) {
		dest = null;
		if (chained) notify(null);
		window.scrollTo({ top: y, behavior: 'instant' });
		return;
	}
	dest = y;
	notify(y);
	const o = { y: from };
	tween = gsap.to(o, {
		y,
		duration: chained
			? Math.max(0.3, Math.min(0.6, 0.35 + screens * 0.08))
			: Math.max(0.35, Math.min(1, 0.65 + (screens - 1) * 0.12)),
		ease: chained ? 'power2.out' : 'power3.inOut',
		onUpdate: () => window.scrollTo({ top: o.y, behavior: 'instant' }),
		onComplete: () => {
			tween = null;
			dest = null;
			notify(null);
		}
	});
}

/** Animate the page to scroll position y. */
export function scrollToY(y) {
	stopTween();
	animateTo(y, false);
}

/**
 * While a step is moving, re-aim it one stop further in `dir` (or back the
 * other way). Rate-limited so a held key or a long spin can't blur past
 * everything at once. Returns false when there's nothing to do.
 */
function fastForward(dir) {
	if (!tween || dest === null) return false;
	const now = performance.now();
	if (now - lastRetarget < 140) return false;
	const next = stepFrom(stops(), dest, dir);
	if (next === null) return false;
	lastRetarget = now;
	animateTo(next, true);
	return true;
}

/** The stop one step in `dir` from scroll position y, or null to scroll natively. */
function stepFrom(S, y, dir) {
	if (!S.length) return null;
	const last = S.length - 1;
	if (y < S[0] - 2) return dir > 0 ? S[0] : null;
	if (y > S[last] + 2) return dir < 0 ? S[last] : null;
	let near = 0;
	for (let i = 1; i <= last; i++) if (Math.abs(S[i] - y) < Math.abs(S[near] - y)) near = i;
	let i;
	if (Math.abs(S[near] - y) <= 3) i = near + dir;
	else {
		// Between stops (scrollbar drag, load mid-page): go to the one ahead,
		// unless we've barely left the one behind, then settle back onto it.
		const ahead = dir > 0 ? S.findIndex((s) => s > y) : S.findLastIndex((s) => s < y);
		if (ahead < 0) return null;
		const behind = ahead - dir;
		const barely = behind >= 0 && behind <= last && Math.abs(y - S[behind]) < Math.abs(S[ahead] - S[behind]) * 0.25;
		i = barely ? behind : ahead;
	}
	return i < 0 || i > last ? null : S[i];
}

function start() {
	const S = () => stops();
	const inRange = (y, s = S()) => s.length > 0 && y >= s[0] - 2 && y <= s[s.length - 1] + 2;

	// ── Wheel ──
	// A gesture is one mouse-wheel spin or one trackpad swipe, inertia
	// included. A new one starts after a pause, or when the delta jumps up
	// again after having decayed to under half its peak (a fresh swipe on top
	// of inertia). The ramp-up at the start of a swipe doesn't count.
	//
	// Keeping a gesture going also counts: a wheel spun nonstop has no pauses,
	// so it is one long gesture, and every SPIN_STEP px it keeps pushing moves
	// another stop. Only deltas that hold or grow count, so a trackpad's
	// inertia (always shrinking) and its first moments (the ramp-up of one
	// ordinary swipe) never add stops.
	const SPIN_STEP = 300;
	const SPIN_AFTER = 250; // ms into a gesture before pushing counts
	let lastT = 0;
	let gestureT = 0;
	let lastAbs = 0;
	let peak = 0;
	let consumed = false; // the current gesture already moved a step
	let push = 0; // how far the current gesture has pushed since its last step
	let pushDir = 0;
	const onWheel = (e) => {
		if (e.ctrlKey) return; // ctrl+wheel = pinch zoom
		const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
		if (Math.abs(e.deltaX) > Math.abs(dy)) return;
		// The event's own input time, so a busy main thread delivering a
		// backlog of inertia events doesn't look like a pause.
		const t = e.timeStamp;
		const abs = Math.abs(dy);
		const fresh = t - lastT > 200 || (lastAbs < peak * 0.5 && abs > lastAbs * 1.5 + 4);
		const sustained = !fresh && abs >= lastAbs && t - gestureT > SPIN_AFTER;
		peak = fresh ? abs : Math.max(peak, abs);
		lastT = t;
		lastAbs = abs;
		if (!dy) return;
		if (fresh) {
			consumed = false;
			gestureT = t;
			push = 0;
		}

		const s = S();
		if (!s.length) return;
		const y = window.scrollY;
		const first = s[0];
		const last = s[s.length - 1];
		const crossing = (y < first && y + dy > first) || (y > last && y + dy < last);
		if (!inRange(y, s) && !crossing) return;
		const dir = dy > 0 ? 1 : -1;
		if (dir !== pushDir) {
			pushDir = dir;
			push = 0;
		}
		if (sustained) push += abs;
		const to = stepFrom(s, y, dir);
		if (to === null) {
			// Leaving past the first/last stop takes a new gesture (or a spin
			// that keeps going), so the swipe that just landed there doesn't
			// carry straight out.
			if (tween || (consumed && push < SPIN_STEP)) e.preventDefault();
			return;
		}
		e.preventDefault();
		// A new flick, or the spin still going hard: one more stop.
		if (consumed && push < SPIN_STEP) return;
		if (tween) {
			// Already moving: re-aim further, faster. If it was too soon after
			// the last re-aim, keep the push for the next event.
			if (!fastForward(dir)) return;
		} else scrollToY(to);
		consumed = true;
		push = 0;
	};

	// ── Keys ──
	const onKey = (e) => {
		if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
		const el = /** @type {HTMLElement} */ (e.target);
		if (el.closest?.('input, textarea, select, [contenteditable]')) return;
		let dir = 0;
		if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) dir = 1;
		else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) dir = -1;
		else if (e.key === 'Home' || e.key === 'End') {
			const s = S();
			if (!s.length || !inRange(window.scrollY, s)) return;
			e.preventDefault();
			scrollToY(e.key === 'Home' ? s[0] : s[s.length - 1]);
			return;
		}
		if (!dir || (e.key === ' ' && el.closest?.('button, a'))) return;
		const s = S();
		if (!inRange(window.scrollY, s)) return;
		const to = stepFrom(s, window.scrollY, dir);
		if (to === null) return;
		e.preventDefault();
		if (!tween) scrollToY(to);
		else fastForward(dir); // pressing again (or holding) mid-step skips ahead
	};

	// ── Touch ──
	// The first move decides: stepping (block native scroll, step once the
	// finger has travelled a little) or leaving (let the page scroll).
	let ty = null;
	let tx = null;
	let touchMode = null; // 'step' | 'native'
	let touchStepped = false;
	const onTouchStart = (e) => {
		ty = e.touches.length === 1 ? e.touches[0].clientY : null;
		tx = e.touches.length === 1 ? e.touches[0].clientX : null;
		touchMode = null;
		touchStepped = false;
	};
	const onTouchMove = (e) => {
		if (ty === null || e.touches.length > 1 || touchMode === 'native') return;
		const dy = ty - e.touches[0].clientY; // > 0: finger up, page down
		const dx = tx - e.touches[0].clientX;
		if (!touchMode) {
			// Sideways swipes (a horizontal strip of thumbnails) scroll natively.
			if (Math.abs(dx) > Math.abs(dy)) {
				touchMode = 'native';
				return;
			}
			const s = S();
			const y = window.scrollY;
			const to = inRange(y, s) && dy ? stepFrom(s, y, dy > 0 ? 1 : -1) : null;
			touchMode = inRange(y, s) && (to !== null || tween) ? 'step' : 'native';
			if (touchMode === 'native') return;
		}
		if (e.cancelable) e.preventDefault();
		if (touchStepped || Math.abs(dy) < 24) return;
		if (tween) {
			// A new swipe while a step is still moving skips ahead.
			touchStepped = true;
			fastForward(dy > 0 ? 1 : -1);
			return;
		}
		const to = stepFrom(S(), window.scrollY, dy > 0 ? 1 : -1);
		if (to === null) return;
		touchStepped = true;
		scrollToY(to);
	};

	// ── Fallback ──
	// Anything else that leaves the page between two stops (scrollbar drag,
	// touch momentum carrying in, anchor jumps) settles on the nearer one.
	let timer;
	let held = false;
	function settle() {
		if (tween || held) return;
		const s = S();
		const y = window.scrollY;
		if (!inRange(y, s)) return;
		let near = s[0];
		for (const v of s) if (Math.abs(v - y) < Math.abs(near - y)) near = v;
		if (Math.abs(near - y) > 2) scrollToY(near);
	}
	const onScroll = () => {
		if (tween) return;
		clearTimeout(timer);
		timer = setTimeout(settle, 150);
	};
	const onDown = (e) => {
		// Grabbing the scrollbar takes over from a running step.
		if (e.target === document.documentElement) {
			held = true;
			stopTween();
		}
	};
	const onUp = () => {
		if (!held) return;
		held = false;
		clearTimeout(timer);
		timer = setTimeout(settle, 150);
	};

	// ── In-page links ──
	// "#section" links (and "/page#section" links to this same page, like the
	// navbar's Results) animate there like any other step.
	const onClick = (e) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = /** @type {HTMLAnchorElement} */ (/** @type {HTMLElement} */ (e.target).closest?.('a[href*="#"]'));
		if (!a || a.target) return;
		const url = new URL(a.href, location.href);
		if (url.origin !== location.origin || url.pathname !== location.pathname) return;
		const id = decodeURIComponent(url.hash.slice(1));
		const el = id && document.getElementById(id);
		if (!el) return;
		e.preventDefault();
		scrollToY(el.getBoundingClientRect().top + window.scrollY);
	};

	const passive = { passive: true };
	const active = { passive: false };
	const listeners = [
		['wheel', onWheel, active],
		['keydown', onKey, undefined],
		['click', onClick, undefined],
		['touchstart', onTouchStart, passive],
		['touchmove', onTouchMove, active],
		['scroll', onScroll, passive],
		['pointerdown', onDown, passive],
		['pointerup', onUp, passive],
		['pointercancel', onUp, passive]
	];
	for (const [ev, fn, o] of listeners) window.addEventListener(ev, fn, o);
	return () => {
		clearTimeout(timer);
		stopTween();
		for (const [ev, fn, o] of listeners) window.removeEventListener(ev, fn, o);
	};
}

/**
 * Register stops. `getStops` is called on every gesture, so it can read live
 * layout. Returns an unregister function.
 * @param {() => number[]} getStops
 * @param {(y: number | null) => void} [onTarget]
 */
export function addStops(getStops, onTarget) {
	const g = { getStops, onTarget };
	groups.add(g);
	if (!teardown && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) teardown = start();
	return () => {
		groups.delete(g);
		if (!groups.size && teardown) {
			teardown();
			teardown = null;
		}
	};
}

/**
 * Svelte action: make an element a section of the stepped scroll. Its top is a
 * stop; if it is taller than the screen, extra stops walk down it (each step
 * at most ~85% of a screen) and the last one shows its bottom edge.
 * @param {HTMLElement} node
 */
export function snapSection(node) {
	const remove = addStops(() => {
		const top = node.getBoundingClientRect().top + window.scrollY;
		const vh = window.innerHeight;
		const extra = node.offsetHeight - vh;
		// A sliver taller than the screen isn't worth its own step.
		if (extra <= vh * 0.12) return [top];
		const n = Math.ceil(extra / (vh * 0.85));
		return Array.from({ length: n + 1 }, (_, i) => top + (extra * i) / n);
	});
	return { destroy: remove };
}
