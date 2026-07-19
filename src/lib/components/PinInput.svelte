<script>
    let { error = '' } = $props();

    let chars = $state(['', '', '', '']);
    let refs = $state([null, null, null, null]);
    let submitting = $state(false);
    let formRef = $state(null);
    let pinInput = $state(null);

    function doSubmit() {
        if (!formRef || submitting) return;
        submitting = true;
        // Set the hidden pin value right before submit
        pinInput.value = chars.join('');
        formRef.requestSubmit();
    }

    function handleInput(index, e) {
        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
        chars[index] = val;
        e.target.value = val;
        if (val && index < 3) {
            refs[index + 1]?.focus();
        }
        // Auto-submit when 4th digit is entered
        if (index === 3 && val) {
            doSubmit();
        }
    }

    function handleKeydown(index, e) {
        if (e.key === 'Backspace' && !chars[index] && index > 0) {
            refs[index - 1]?.focus();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        for (let i = 0; i < Math.min(4, text.length); i++) {
            chars[i] = text[i];
            if (refs[i]) refs[i].value = text[i];
        }
        const next = Math.min(3, text.length);
        refs[next]?.focus();
        // Auto-submit if paste filled all 4
        if (text.length >= 4) {
            doSubmit();
        }
    }
</script>

<form method="POST" bind:this={formRef}>
    <div class="pin-container">
        <p class="pin-label">Enter your 4-digit PIN</p>
        <div class="pin-squares">
            {#each [0, 1, 2, 3] as i}
                <input
                    bind:this={refs[i]}
                    type="text"
                    class="pin-square"
                    maxlength="1"
                    autocomplete="off"
                    inputmode="numeric"
                    oninput={(e) => handleInput(i, e)}
                    onkeydown={(e) => handleKeydown(i, e)}
                    onpaste={i === 0 ? handlePaste : undefined}
                    disabled={submitting}
                />
            {/each}
        </div>
        <input type="hidden" name="pin" bind:this={pinInput} />
        {#if error}
            <p class="pin-error">{error}</p>
        {/if}
    </div>
</form>

<style>
    .pin-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.2rem;
        position: relative;
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
    }
    .pin-square:focus {
        border-color: rgba(255, 255, 255, 0.5);
    }
    .pin-square:disabled {
        opacity: 0.5;
    }
    .pin-error {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        text-align: center;
        color: #f87171;
        font-size: 0.85rem;
        margin: 0.5rem 0 0;
    }
</style>
