<script>
    /**
     * Range slider with sticky notches + numeric readout.
     * - Reads a number input above the track (label left, input right).
     * - Dragging is continuous: any value between min and max is reachable.
     * - Passing a notch (within `snapDistance`) snaps to it and plays a
     *   mechanical-keyboard clack.
     * - Typed values are clamped to min/max on blur/Enter and are NOT re-snapped.
     * - The visual track stays thin; an invisible hitbox around it makes
     *   grabbing easy and uses a pointer cursor.
     */
    let {
        value = $bindable(),
        label = '',
        unit = '',
        min = 0,
        max = 100,
        step = 1,
        notches = [],
        snapDistance = null,
        disabled = false,
        tune = () => {}
    } = $props();

    let trackEl = $state(null);
    let audioCtx = null;

    // Readout draft: what the user is typing; synced from the slider position.
    let draft = $state(value);

    $effect(() => { draft = value; });

    const pct = (v) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

    /** Mechanical keyboard clack: low triangle "thock" + short noise "click". */
    function clack() {
        try {
            audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const t0 = audioCtx.currentTime;
            const duck = audioCtx.createGain();
            duck.gain.value = 0.9;
            duck.connect(audioCtx.destination);

            // body of the keypress — low triangle thump
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'triangle';
            o.frequency.value = 130 + Math.random() * 40;
            g.gain.setValueAtTime(0.22, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
            o.connect(g).connect(duck);
            o.start(t0);
            o.stop(t0 + 0.06);

            // tactile click — tiny noise burst through a bandpass
            const len = Math.floor(audioCtx.sampleRate * 0.014);
            const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
            const ch = buf.getChannelData(0);
            for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            const ng = audioCtx.createGain();
            ng.gain.setValueAtTime(0.08, t0);
            ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.014);
            const filt = audioCtx.createBiquadFilter();
            filt.type = 'bandpass';
            filt.frequency.value = 3000 + Math.random() * 800;
            filt.Q.value = 1.2;
            src.connect(filt).connect(ng).connect(duck);
            src.start(t0);
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
                clack();
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

    /** Commit typed input: clamp to [min, max]; typed values are final (no re-snap). */
    function commitReadout() {
        const parsed = Number(draft);
        const clamped = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
        if (clamped !== value) {
            value = +clamped.toFixed(4);
            tune();
        }
        draft = value;
    }
</script>

<div class="snap" class:disabled>
    <div class="readout-row">
        <span class="readout-label">{label}</span>
        <span class="readout-input-wrap">
            {#if unit}
                <span class="readout-unit">{unit}</span>
            {/if}
            <input
                class="readout-input"
                type="number"
                min={min}
                max={max}
                step={step}
                bind:value={draft}
                disabled={disabled}
                placeholder={String(min)}
                aria-label={label}
                onblur={commitReadout}
                onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
        </span>
    </div>

    <div
        class="hitbox"
        role="slider"
        tabindex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
        aria-disabled={disabled}
        onpointerdown={onDown}
        onkeydown={onKey}
    >
        <div class="track" bind:this={trackEl}>
            <div class="fill" style="width:{pct(value)}%"></div>
            <div class="knob" style="left:{pct(value)}%"></div>
            {#each notches as n}
                <div class="tick" style="left:{pct(n)}%"></div>
            {/each}
        </div>
    </div>
</div>

<style>
    .readout-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-sm);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }

    .readout-input-wrap {
        position: relative;
        display: inline-block;
    }
    .readout-input {
        width: 4.5rem;
        background: transparent;
        border: var(--border);
        color: var(--color-text-primary);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        text-align: right;
        padding: 0.2rem 0.4rem 0.2rem 1.7rem;
        outline: none;
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .readout-input::-webkit-outer-spin-button,
    .readout-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    .readout-input:focus {
        border-color: var(--color-text-primary);
    }
    .readout-input:disabled {
        opacity: 0.4;
    }
    .readout-unit {
        position: absolute;
        left: 0.45rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.62rem;
        opacity: 0.55;
        color: var(--color-text-secondary);
        pointer-events: none;
    }

    /* Invisible hitbox: big grab area, thin visuals. Pointer cursor, not the
       resize one — the knob reads as the handle but the whole row works. */
    .hitbox {
        position: relative;
        padding: 18px 12px;
        margin: -18px -12px;
        cursor: pointer;
        touch-action: none;
        outline: none;
    }
    .hitbox:focus-visible .track {
        outline: 1px solid var(--color-text-primary);
        outline-offset: 6px;
    }

    .track {
        position: relative;
        height: 4px;
        background: rgba(255, 255, 255, 0.15);
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

    .snap.disabled {
        opacity: 0.4;
        pointer-events: none;
    }
</style>