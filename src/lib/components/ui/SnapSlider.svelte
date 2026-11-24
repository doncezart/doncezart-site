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
        tune = () => {},
        baseline = null, // the value that counts as "unchanged" (per-layout default)
        reset = () => {}
    } = $props();

    let trackEl = $state(null);
    let audioCtx = null;

    // The reset icon lights up once the slider deviates from its baseline
    // (the layout's default). Clicking it restores the baseline and lets the
    // page clear its "touched" flag, so per-layout defaults apply again.
    const changed = $derived(baseline != null && Math.abs(value - baseline) > Math.max(step * 0.25, 1e-6));

    function doReset() {
        if (!changed) return;
        value = baseline;
        draft = baseline;
        lastSnapped = null;
        reset();
    }

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
        <span class="readout-controls">
            <button
                type="button"
                class="reset-btn"
                class:active={changed}
                title={changed ? 'Reset to layout default' : 'Default value'}
                aria-label={`Reset ${label} to default`}
                disabled={disabled || !changed}
                onclick={doReset}
            >
                <i class="fa-solid fa-rotate-left"></i>
            </button>
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
        font-size: 0.82rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.75);
    }

    .readout-controls {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
    }
    .reset-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.35rem;
        height: 1.35rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: rgba(255, 255, 255, 0.75);
        opacity: 0.22;
        cursor: default;
        font-size: 0.7rem;
        transition: opacity var(--transition-fast), color var(--transition-fast);
    }
    .reset-btn.active {
        opacity: 0.9;
        cursor: pointer;
    }
    .reset-btn.active:hover {
        color: var(--accent, #ff2b1f);
        opacity: 1;
    }
    .readout-input-wrap {
        position: relative;
        display: inline-block;
    }
    .readout-input {
        width: 3.75rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #fff;
        font-family: var(--font-body);
        font-size: 0.82rem;
        font-variant-numeric: tabular-nums;
        text-align: right;
        padding: 0.28rem 0.45rem 0.28rem 1.5rem;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .readout-input::-webkit-outer-spin-button,
    .readout-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    .readout-input:hover {
        border-color: rgba(255, 255, 255, 0.2);
    }
    .readout-input:focus {
        border-color: rgba(255, 255, 255, 0.45);
        background: rgba(255, 255, 255, 0.06);
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
        opacity: 0.45;
        color: #fff;
        pointer-events: none;
    }

    /* Invisible hitbox: big grab area, thin visuals. Pointer cursor, not the
       resize one — the knob reads as the handle but the whole strip works.
       No negative top/bottom margins: the hitbox stays inside its own field
       and never covers the readout textbox or the reset icon. */
    .hitbox {
        position: relative;
        padding: 18px 12px;
        margin: 0 -12px;
        cursor: pointer;
        touch-action: none;
        outline: none;
    }
    .hitbox:focus-visible .track {
        outline: 1px solid rgba(255, 43, 31, 0.7);
        outline-offset: 7px;
        border-radius: 2px;
    }

    .track {
        position: relative;
        height: 3px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
    }

    .fill {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        border-radius: 999px;
        background: var(--accent, #ff2b1f);
    }

    .knob {
        position: absolute;
        top: 50%;
        z-index: 1;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(255, 43, 31, 0.35), 0 2px 6px rgba(0, 0, 0, 0.5);
        transform: translate(-50%, -50%);
        pointer-events: none;
        transition: box-shadow 0.2s;
    }

    .tick {
        position: absolute;
        top: -3px;
        width: 1px;
        height: 9px;
        background: rgba(255, 255, 255, 0.28);
        transform: translateX(-50%);
        pointer-events: none;
    }

    .hitbox:hover .knob,
    .hitbox:active .knob {
        box-shadow: 0 0 0 5px rgba(255, 43, 31, 0.35), 0 2px 6px rgba(0, 0, 0, 0.5);
    }

    .snap.disabled {
        pointer-events: none;
        /* the label stays readable; only the track/input/unit are dimmed so a
           deactivated slider's title is still easy to read */
    }
    .snap.disabled .track {
        opacity: 0.35;
    }
    .snap.disabled .readout-input {
        opacity: 0.45;
    }
    .snap.disabled .readout-unit {
        opacity: 0.3;
    }
    .snap.disabled .reset-btn {
        opacity: 0.15;
    }
</style>