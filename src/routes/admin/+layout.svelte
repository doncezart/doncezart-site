<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	let { data, children } = $props();

	let isLoginPage = $derived(page.url.pathname === '/admin/login');
	let currentPath = $derived(page.url.pathname);

	function isActive(href) {
		if (href === '/admin') return currentPath === '/admin';
		return currentPath.startsWith(href);
	}
</script>

{#if isLoginPage}
	<div class="login-shell">
		{@render children?.()}
	</div>
{:else}
	<div class="admin-shell">
		<aside class="sidebar">
			<div class="sidebar-top">
				<a href="/admin" class="sidebar-brand">
					<span class="brand-label">Dashboard</span>
				</a>

				<nav class="sidebar-nav">
					<a href="/admin/artworks" class="nav-item" class:active={isActive('/admin/artworks')}>
						<i class="fa-solid fa-images"></i>
						<span>Artworks</span>
					</a>
					<a href="/admin/categories" class="nav-item" class:active={isActive('/admin/categories')}>
						<i class="fa-solid fa-folder-tree"></i>
						<span>Categories</span>
					</a>
					<a href="/admin/tags" class="nav-item" class:active={isActive('/admin/tags')}>
						<i class="fa-solid fa-tags"></i>
						<span>Tags</span>
					</a>
					<a href="/admin/case-studies" class="nav-item" class:active={isActive('/admin/case-studies')}>
						<i class="fa-solid fa-book-open"></i>
						<span>Case Studies</span>
					</a>
				</nav>
			</div>

			<div class="sidebar-bottom">
				<a href="/" target="_blank" class="nav-item external">
					<i class="fa-solid fa-arrow-up-right-from-square"></i>
					<span>View Site</span>
				</a>
				<div class="sidebar-user">
					<div class="user-avatar">
						<i class="fa-solid fa-user"></i>
					</div>
					<span class="user-name">{data.user?.username}</span>
					<form method="POST" action="/admin?/logout" use:enhance>
						<button type="submit" class="logout-btn" aria-label="Logout">
							<i class="fa-solid fa-right-from-bracket"></i>
						</button>
					</form>
				</div>
			</div>
		</aside>

		<main class="admin-main">
			{@render children?.()}
		</main>
	</div>
{/if}

<style>
	.login-shell {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #0a0a0a;
	}

	/* ── Shell ───────────────────────────── */
	.admin-shell {
		display: flex;
		min-height: 100vh;
		background: #0a0a0a;
	}

	/* ── Sidebar ─────────────────────────── */
	.sidebar {
		width: 240px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 1.25rem 0.75rem;
		background: #111;
		border-right: 1px solid rgba(255, 255, 255, 0.06);
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
		overflow-y: auto;
	}

	.sidebar-top {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Brand */
	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border-radius: 0.5rem;
		transition: background 0.15s ease;
	}
	.sidebar-brand:hover {
		background: rgba(255, 255, 255, 0.06);
	}
	.brand-label {
		font-family: 'Clash Display', sans-serif;
		font-weight: 600;
		font-size: 1.15rem;
		color: #fff;
		letter-spacing: -0.02em;
	}

	/* Nav items */
	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.45);
		font-family: 'Satoshi', sans-serif;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}
	.nav-item i {
		width: 1.25rem;
		text-align: center;
		font-size: 0.9rem;
	}
	.nav-item:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.04);
	}
	.nav-item.active {
		color: #fff;
		background: rgba(255, 255, 255, 0.08);
	}
	.nav-item.active i {
		color: #ff3333;
	}

	/* Bottom section */
	.sidebar-bottom {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.external {
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		padding-top: 0.75rem;
	}

	/* User bar */
	.sidebar-user {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0.5rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.03);
	}
	.user-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}
	.user-name {
		flex: 1;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.6);
		font-family: 'Satoshi', sans-serif;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.logout-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.85rem;
		transition: color 0.15s;
		display: flex;
	}
	.logout-btn:hover {
		color: #ff4444;
	}

	/* ── Main content ────────────────────── */
	.admin-main {
		flex: 1;
		padding: 2.5rem 3rem;
		overflow-y: auto;
		min-width: 0;
	}

	@media (max-width: 768px) {
		.admin-shell {
			flex-direction: column;
		}
		.sidebar {
			width: 100%;
			height: auto;
			position: relative;
			flex-direction: row;
			padding: 0.75rem 1rem;
			border-right: none;
			border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		}
		.sidebar-top {
			flex-direction: row;
			align-items: center;
			gap: 1rem;
			flex: 1;
		}
		.sidebar-nav {
			flex-direction: row;
			gap: 0.1rem;
		}
		.nav-item span {
			display: none;
		}
		.sidebar-bottom {
			flex-direction: row;
			align-items: center;
			gap: 0.25rem;
		}
		.sidebar-bottom .external {
			border-top: none;
			padding-top: 0;
		}
		.sidebar-user {
			display: none;
		}
		.admin-main {
			padding: 1.5rem 1rem;
		}
	}
</style>
