<script>
	let { data } = $props();

	function formatDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<div class="page-header">
	<div>
		<h1>Dashboard</h1>
		<p class="subtitle">Overview of your portfolio</p>
	</div>
	<a href="/admin/artworks/new" class="upload-btn">
		<i class="fa-solid fa-plus"></i>
		Upload Artwork
	</a>
</div>

<!-- Stats row -->
<div class="stats">
	<a href="/admin/artworks" class="stat-card">
		<div class="stat-icon artworks">
			<i class="fa-solid fa-images"></i>
		</div>
		<div class="stat-body">
			<span class="stat-num">{data.artworkCount}</span>
			<span class="stat-label">Artworks</span>
		</div>
	</a>
	<a href="/admin/tags" class="stat-card">
		<div class="stat-icon tags">
			<i class="fa-solid fa-tags"></i>
		</div>
		<div class="stat-body">
			<span class="stat-num">{data.tagCount}</span>
			<span class="stat-label">Tags</span>
		</div>
	</a>
	<a href="/admin/case-studies" class="stat-card">
		<div class="stat-icon cases">
			<i class="fa-solid fa-book-open"></i>
		</div>
		<div class="stat-body">
			<span class="stat-num">{data.caseStudyCount}</span>
			<span class="stat-label">Case Studies</span>
		</div>
	</a>
	<div class="stat-card">
		<div class="stat-icon processed">
			<i class="fa-solid fa-wand-magic-sparkles"></i>
		</div>
		<div class="stat-body">
			<span class="stat-num">{data.processedCount}<span class="stat-total">/{data.artworkCount}</span></span>
			<span class="stat-label">Processed</span>
		</div>
	</div>
</div>

<!-- Two columns: Recent + Categories -->
<div class="grid-2">
	<!-- Recent artworks -->
	<section class="panel">
		<div class="panel-header">
			<h2>Recent Uploads</h2>
			<a href="/admin/artworks" class="panel-link">View all</a>
		</div>
		{#if data.recentArtworks.length === 0}
			<div class="panel-empty">
				<i class="fa-regular fa-image"></i>
				<p>No artworks yet</p>
				<a href="/admin/artworks/new">Upload your first</a>
			</div>
		{:else}
			<div class="recent-list">
				{#each data.recentArtworks as item (item.id)}
					<a href="/admin/artworks/{item.id}/edit" class="recent-item">
						<img src={item.thumbnailUrl || item.imageUrl} alt={item.title} />
						<div class="recent-info">
							<span class="recent-title">{item.title}</span>
							<span class="recent-meta">{formatDate(item.createdAt)}</span>
						</div>
						{#if item.processed}
							<span class="mini-badge processed" title="Processed — {item.imageProcessed}/{item.imageTotal} images optimized">
								<i class="fa-solid fa-check"></i> {item.imageProcessed}/{item.imageTotal}
							</span>
						{:else}
							<span class="mini-badge unprocessed" title="Not processed — original files only">
								<i class="fa-solid fa-clock"></i>
							</span>
						{/if}
						{#if item.hasCaseStudy}
							<span class="mini-badge case-study">CS</span>
						{/if}
						<i class="fa-solid fa-chevron-right recent-arrow"></i>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Category breakdown -->
	<section class="panel">
		<div class="panel-header">
			<h2>By Category</h2>
		</div>
		{#if data.categories.length === 0}
			<div class="panel-empty">
				<i class="fa-regular fa-folder-open"></i>
				<p>No categories yet</p>
			</div>
		{:else}
			<div class="category-list">
				{#each data.categories as cat}
					<div class="category-row">
						<span class="cat-name">{cat.category}</span>
						<div class="cat-bar-track">
							<div
								class="cat-bar-fill"
								style="width: {data.artworkCount ? (cat.count / data.artworkCount) * 100 : 0}%"
							></div>
						</div>
						<span class="cat-count">{cat.count}</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	/* ── Page header ───────────────────────── */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.page-header h1 {
		font-size: 1.75rem;
		margin-bottom: 0.2rem;
	}
	.subtitle {
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.9rem;
	}
	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.25rem;
		background: #ff2222;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		font-family: 'Satoshi', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}
	.upload-btn:hover {
		background: #e61515;
	}

	/* ── Stats row ─────────────────────────── */
	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: #141414;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		text-decoration: none;
		transition: border-color 0.15s;
	}
	.stat-card:hover {
		border-color: rgba(255, 255, 255, 0.12);
	}
	.stat-icon {
		width: 44px;
		height: 44px;
		border-radius: 0.6rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
		flex-shrink: 0;
	}
	.stat-icon.artworks { background: rgba(255, 50, 50, 0.12); color: #ff5555; }
	.stat-icon.tags     { background: rgba(80, 160, 255, 0.12); color: #50a0ff; }
	.stat-icon.cases    { background: rgba(255, 180, 50, 0.12); color: #ffb432; }
	.stat-icon.processed { background: rgba(0, 200, 100, 0.12); color: #00c864; }
	.stat-icon.processed i {
		animation: sparkle 2s ease-in-out infinite;
	}
	@keyframes sparkle {
		0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
		50% { opacity: 0.7; transform: scale(1.15) rotate(8deg); }
	}
	.stat-total {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.3);
		font-weight: 400;
	}
	.stat-body {
		display: flex;
		flex-direction: column;
	}
	.stat-num {
		font-family: 'Clash Display', sans-serif;
		font-size: 1.6rem;
		font-weight: 700;
		color: #fff;
		line-height: 1;
	}
	.stat-label {
		font-family: 'Satoshi', sans-serif;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8rem;
		margin-top: 0.15rem;
	}

	/* ── Two column grid ───────────────────── */
	.grid-2 {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 1rem;
	}

	/* ── Panel shared ──────────────────────── */
	.panel {
		background: #141414;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		padding: 1.25rem;
	}
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.panel-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}
	.panel-link {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.35);
		text-decoration: none;
		transition: color 0.15s;
	}
	.panel-link:hover {
		color: #fff;
	}
	.panel-empty {
		text-align: center;
		padding: 2rem 0;
		color: rgba(255, 255, 255, 0.25);
	}
	.panel-empty i {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		display: block;
	}
	.panel-empty a {
		color: #ff3333;
		font-size: 0.85rem;
	}

	/* ── Recent list ───────────────────────── */
	.recent-list {
		display: flex;
		flex-direction: column;
	}
	.recent-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.25rem;
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.1s;
		border-radius: 0.3rem;
	}
	.recent-item:last-child {
		border-bottom: none;
	}
	.recent-item:hover {
		background: rgba(255, 255, 255, 0.03);
	}
	.recent-item img {
		width: 48px;
		height: 36px;
		object-fit: cover;
		border-radius: 0.3rem;
		flex-shrink: 0;
	}
	.recent-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.recent-title {
		font-size: 0.88rem;
		color: #fff;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.recent-meta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
		font-family: 'Satoshi', sans-serif;
	}
	.mini-badge {
		font-size: 0.6rem;
		font-weight: 700;
		padding: 0.15rem 0.35rem;
		border-radius: 0.25rem;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}
	.mini-badge.processed {
		color: #00c864;
		background: rgba(0, 200, 100, 0.12);
	}
	.mini-badge.unprocessed {
		color: #ff9933;
		background: rgba(255, 153, 51, 0.12);
	}
	.mini-badge.case-study {
		color: #ffb432;
		background: rgba(255, 180, 50, 0.12);
	}
	.recent-arrow {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.15);
		flex-shrink: 0;
	}

	/* ── Category breakdown ────────────────── */
	.category-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.category-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.cat-name {
		width: 110px;
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.6);
		text-transform: capitalize;
		flex-shrink: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cat-bar-track {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		overflow: hidden;
	}
	.cat-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #ff2222, #ff5555);
		border-radius: 3px;
		min-width: 4px;
		transition: width 0.3s ease;
	}
	.cat-count {
		font-family: 'Clash Display', sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		width: 30px;
		text-align: right;
		flex-shrink: 0;
	}

	/* ── Responsive ────────────────────────── */
	@media (max-width: 900px) {
		.stats {
			grid-template-columns: 1fr;
		}
		.grid-2 {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 500px) {
		.page-header {
			flex-direction: column;
		}
	}
</style>
