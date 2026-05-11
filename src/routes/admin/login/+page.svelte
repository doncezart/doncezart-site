<script>
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>

<div class="login-page">
	<div class="login-card">
		<h1>Admin Login</h1>
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
		<form method="POST" use:enhance>
			<label>
				Username
				<input type="text" name="username" autocomplete="username" required />
			</label>
			<label>
				Password
				<input type="password" name="password" autocomplete="current-password" required />
			</label>
			<button type="submit" class="btn-cta">Log in</button>
		</form>
	</div>
</div>

<style>
	.login-page {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 70vh;
	}
	.login-card {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
	}
	.login-card h1 {
		margin-bottom: 1.5rem;
		text-align: center;
	}
	label {
		display: block;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
	}
	input {
		display: block;
		width: 100%;
		margin-top: 0.3rem;
		padding: 0.6rem 0.8rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 1rem;
		box-sizing: border-box;
	}
	input:focus {
		outline: none;
		border-color: #ff0000;
	}
	button {
		width: 100%;
		margin-top: 0.5rem;
	}
	.error {
		color: #ff4444;
		text-align: center;
		margin-bottom: 1rem;
	}
</style>
