/*
 * Client diagnostics. Plain ES5 on purpose: it has to run on browsers too old
 * for the site's own code, since those are the ones it is here to catch.
 *
 * - Script errors and failed promises are sent to /api/client-error (with the
 *   browser's user agent), at most 5 per page view.
 * - If the app hasn't started (+layout.svelte sets data-hydrated) 8s after
 *   load, that is reported too: it's the "blank page" case.
 * - Open any page with ?diag to also see a panel with the same information
 *   (screenshot it and send it over). With ?diag the page also reports right
 *   away and then every 2s for 30s ("beat"), so the log shows whether the tab
 *   died (beats stop) or stayed alive behind a black screen (beats go on).
 * - ?diag&off=bg,anim,mat switches parts off to find the culprit:
 *     bg   - the WebGL ember background (CSS gradient instead)
 *     anim - every animation and transition
 *     mat  - the cutting mat preview
 *   Each becomes an `off-<name>` class on <html>.
 * - Components can report through window.__diag(kind, detail).
 */
(function () {
	var errors = [];
	var sent = 0;
	var show = /[?&]diag\b/.test(location.search);
	var offMatch = /[?&]off=([a-z,]+)/.exec(location.search);
	var off = offMatch ? offMatch[1].split(',') : [];
	for (var o = 0; o < off.length; o++) document.documentElement.className += ' off-' + off[o];
	var t0 = Date.now();

	// Probed once, and the context released straight away: each probe is a
	// real WebGL context, and too many make the browser drop the embers' one.
	var gl = null;
	function webgl() {
		if (gl !== null) return gl;
		gl = 'no';
		try {
			var c = document.createElement('canvas');
			var ctx = c.getContext('webgl') || c.getContext('experimental-webgl');
			if (ctx) {
				gl = 'yes';
				var ext = ctx.getExtension('WEBGL_debug_renderer_info');
				if (ext) gl += ' (' + ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) + ')';
				var lose = ctx.getExtension('WEBGL_lose_context');
				if (lose) lose.loseContext();
			}
		} catch (e) {
			gl = 'error: ' + e.message;
		}
		return gl;
	}

	function info() {
		return {
			ua: navigator.userAgent,
			page: location.pathname,
			screen: window.innerWidth + 'x' + window.innerHeight + ' @' + (window.devicePixelRatio || 1),
			hydrated: document.documentElement.hasAttribute('data-hydrated'),
			webgl: webgl(),
			modules: 'noModule' in document.createElement('script'),
			containerQueries: !!(window.CSS && CSS.supports && CSS.supports('container-type', 'inline-size')),
			off: off.join(',') || 'none',
			t: ((Date.now() - t0) / 1000).toFixed(1) + 's',
			visible: document.visibilityState
		};
	}

	function send(kind, detail, force) {
		if (sent >= 5 && !force) return;
		if (!force) sent++;
		var body = info();
		body.kind = kind;
		body.detail = String(detail || '').slice(0, 1500);
		var json = JSON.stringify(body);
		try {
			if (navigator.sendBeacon) navigator.sendBeacon('/api/client-error', json);
			else {
				var x = new XMLHttpRequest();
				x.open('POST', '/api/client-error');
				x.send(json);
			}
		} catch (e) {}
	}

	function record(kind, detail) {
		errors.push(kind + ': ' + detail);
		send(kind, detail);
		render();
	}

	window.addEventListener('error', function (e) {
		// Resource load failures (img, script, css) arrive here without a message.
		if (!e.message && e.target && e.target !== window) {
			var t = e.target;
			record('load-failed', (t.tagName || '?') + ' ' + (t.src || t.href || ''));
			return;
		}
		record('error', e.message + ' @ ' + (e.filename || '?') + ':' + e.lineno + ':' + e.colno + (e.error && e.error.stack ? '\n' + e.error.stack : ''));
	}, true);

	window.addEventListener('unhandledrejection', function (e) {
		var r = e.reason;
		record('rejection', r && r.stack ? r.stack : String(r));
	});

	window.__diag = function (kind, detail) {
		record(kind, detail);
	};

	if (show) {
		send('beat', 'start', true);
		var beats = 0;
		var beat = setInterval(function () {
			beats++;
			send('beat', errors.length ? errors[errors.length - 1] : '', true);
			if (beats >= 15) clearInterval(beat);
		}, 2000);
	}

	window.addEventListener('load', function () {
		setTimeout(function () {
			if (!document.documentElement.hasAttribute('data-hydrated')) send('no-hydrate', errors.join('\n'));
			render();
		}, 8000);
	});

	var panel;
	function render() {
		if (!show || !document.body) return;
		if (!panel) {
			panel = document.createElement('pre');
			panel.setAttribute('style', 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;max-height:60vh;overflow:auto;margin:0;padding:10px;background:#fff;color:#000;font:11px/1.4 monospace;white-space:pre-wrap;word-break:break-all;border:2px solid #f00;border-radius:6px');
			document.body.appendChild(panel);
		}
		var i = info();
		var lines = [];
		for (var k in i) lines.push(k + ': ' + i[k]);
		lines.push('errors: ' + (errors.length ? '\n' + errors.join('\n') : 'none'));
		panel.textContent = lines.join('\n');
	}
	if (show) {
		document.addEventListener('DOMContentLoaded', render);
		setInterval(render, 2000);
	}
})();
