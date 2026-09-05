<script>
    /**
     * Range slider with sticky notches.
     * - Dragging is continuous: any value between min and max is reachable.
     * - Passing a notch (within `snapDistance`) snaps to it and plays a tick.
     * - Square knob + thin track, consistent with the site's no-radius aesthetic.
     */
    let {
        value = $bindable(),
        label = '',
        min = 0,
        max = 100,
        step = 1,
        notches = [],
        snapDistance = null,
        disabled = false,
        sound = true,
        tune = () => {}
    } = $props();

    let trackEl = $state(null);
    let audioCtx = null;

    const pct = (v) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

    function tick() {
        if (!sound) return;
        try {
            audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'square';
            o.frequency.value = 1200;
            g.gain.setValueAtTime(0.035, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.045);
            o.connect(g).connect(audioCtx.destination);
            o.start();
            o.stop(audioCtx.currentTime + 0.045);
        } catch {
            // audio unavailable (headless, blocked) — dragging still works
        }
    }

    function valueFromClientX(clientX) {
        const rect = trackEl.getBoundingClientRect();
        const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const raw = min + t * (max - min);
        const stepped = Math.round(raw / step) * step;
        return Math.min(max, Math.max(min, +stepped.toFixed(4)));
    }

    /** Nearest notch within snapDistance, or null (free value). */
    function snapTarget(v) {
        if (!notches.length || snapDistance == null) return null;
        let best = notches[0];
        for (const n of notches) {
            if (Math.abs(n - v) < Math.abs(best - v)) best = n;
        }
        return Math.abs(best - v) <= snapDistance ? best : null;
    }

    let lastSnapped = null;

    function commit(v) {
        const target = snapTarget(v);
        if (target != null) {
            if (target !== lastSnapped) {
                tick();
                lastSnapped = target;
                value = target;
                tune();
            }
        } else {
            lastSnapped = null;
            if (v !== value) {
                value = v;
                tune();
            }
        }
    }

    function onDown(e) {
        if (disabled) return;
        e.preventDefault();
        tune();
        commit(valueFromClientX(e.clientX));
        const move = (ev) => commit(valueFromClientX(ev.clientX));
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
    }

    function onKey(e) {
        if (disabled) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            tune();
            value = Math.min(max, value + step);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            tune();
            value = Math.max(min, value - step);
        } else if (e.key === 'Home') {
            e.preventDefault();
            tune();
            value = min;
        } else if (e.key === 'End') {
            e.preventDefault();
            tune();
            value = max;
        }
    }
</script>

<div class="snap" class:disabled>
    <div
        class="track"
        bind:this={trackEl}
        role="slider"
        tabindex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}`}
        aria-disabled={disabled}
        onpointerdown={onDown}
        onkeydown={onKey}
    >
        <div class="fill" style="width:{pct(value)}%"></div>
        <div class="knob" style="left:{pct(value)}%"></div>
        {#each notches as n}
            <div class="tick" style="left:{pct(n)}%"></div>
        {/each}
    </div>
</div>

<style>
    .track {
        position: relative;
        height: 4px;
        background: rgba(255, 255, 255, 0.15);
        cursor: ew-resize;
        touch-action: none;
        outline: none;
    }
    .track:focus-visible {
        outline: 1px solid var(--color-text-primary);
        outline-offset: 4px;
    }
    .snap.disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    .fill {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        background: var(--color-text-primary);
    }

    .knob {
        position: absolute;
        top: 50%;
        width: 10px;
        height: 10px;
        background: var(--color-text-primary);
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .tick {
        position: absolute;
        top: -3px;
        width: 1px;
        height: 10px;
        background: rgba(255, 255, 255, 0.5);
        transform: translateX(-50%);
        pointer-events: none;
    }
</style>