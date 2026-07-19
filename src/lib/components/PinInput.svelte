<script>
    let { error = '' } = $props();

    let chars = $state(['', '', '', '']);
    let refs = $state([null, null, null, null]);
    let submitting = $state(false);

    function handleInput(index, e) {
        const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
        chars[index] = val;
        e.target.value = val;
        if (val && index < 3) {
            refs[index + 1]?.focus();
        }
    }

    function handleKeydown(index, e) {
        if (e.key === 'Backspace' && !chars[index] && index > 0) {
            refs[index - 1]?.focus();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/[^a-zA-Z]/g, '').toUpperCase();
        for (let i = 0; i < Math.min(4, text.length); i++) {
            chars[i] = text[i];
            if (refs[i]) refs[i].value = text[i];
        }
        const next = Math.min(3, text.length);
        refs[next]?.focus();
    }

    function getPin() {
        return chars.join('');
    }

    function canSubmit() {
        return chars.every(c => c.length === 1);
    }
</script>

<form method="POST" onsubmit={() => submitting = true}>
    <div class="pin-container">
        <p class="pin-label">Enter your 4-letter PIN</p>
        <div class="pin-squares">
            {#each [0, 1, 2, 3] as i}
                <input
                    bind:this={refs[i]}
                    type="text"
                    name="pin{i}"
                    class="pin-square"
                    maxlength="1"
                    autocomplete="off"
                    inputmode="text"
                    oninput={(e) => handleInput(i, e)}
                    onkeydown={(e) => handleKeydown(i, e)}
                    onpaste={i === 0 ? handlePaste : undefined}
                    disabled={submitting}
                />
            {/each}
        </div>
        <input type="hidden" name="pin" value={getPin()} />
        {#if error}
            <p class="pin-error">{error}</p>
        {/if}
        <button type="submit" class="pin-submit" disabled={!canSubmit() || submitting}>
            {submitting ? 'Checking...' : 'View Balance'}
        </button>
    </div>
</form>

<style>
    .pin-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.2rem;
        padding: 2rem;
    }
    .pin-label {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
    }
    .pin-squares {
        display: flex;
        gap: 0.75rem;
    }
    .pin-square {
        width: 3.5rem;
        height: 4rem;
        text-align: center;
        font-size: 1.8rem;
        font-weight: 700;
        letter-spacing: 0;
        background: rgba(255, 255, 255, 0.06);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.75rem;
        color: #fff;
        outline: none;
        transition: border-color 0.2s;
        text-transform: uppercase;
    }
    .pin-square:focus {
        border-color: rgba(255, 255, 255, 0.5);
    }
    .pin-square:disabled {
        opacity: 0.5;
    }
    .pin-error {
        color: #f87171;
        font-size: 0.9rem;
        margin: 0;
    }
    .pin-submit {
        padding: 0.7rem 2rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.5rem;
        color: #fff;
        font-size: 0.95rem;
        cursor: pointer;
        transition: background 0.2s;
    }
    .pin-submit:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.18);
    }
    .pin-submit:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
</style>
