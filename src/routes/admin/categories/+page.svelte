<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let editingCat = $state(null);
	let editingCatName = $state('');
	let editingSub = $state(null);
	let editingSubName = $state('');

	function startEditCat(cat) {
		editingCat = cat.id;
		editingCatName = cat.name;
	}

	function cancelEditCat() {
		editingCat = null;
		editingCatName = '';
	}

	function startEditSub(sub) {
		editingSub = sub.id;
		editingSubName = sub.name;
	}

	function cancelEditSub() {
		editingSub = null;
		editingSubName = '';
	}

	function subsFor(catId) {
		return data.subcategories.filter(s => s.categoryId === catId);
	}
</script>

<div class="page-header">
	<h1>Categories</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<!-- Add category -->
<form method="POST" action="?/addCategory" use:enhance class="add-form">
	<input type="text" name="name" placeholder="New category name…" required />
	<button type="submit"><i class="fa-solid fa-plus"></i> Add Category</button>
</form>

<div class="categories-list">
	{#each data.categories as cat (cat.id)}
		<div class="category-card">
			<div class="category-header">
				{#if editingCat === cat.id}
					<form method="POST" action="?/renameCategory" use:enhance={() => { return async ({ update }) => { cancelEditCat(); await update(); }; }} class="inline-edit">
						<input type="hidden" name="id" value={cat.id} />
						<input type="text" name="name" bind:value={editingCatName} />
						<button type="submit" class="btn-sm save" aria-label="Save"><i class="fa-solid fa-check"></i></button>
						<button type="button" class="btn-sm cancel" onclick={cancelEditCat} aria-label="Cancel"><i class="fa-solid fa-xmark"></i></button>
					</form>
				{:else}
					<div class="category-name">
						<span class="name">{cat.name}</span>
						<span class="slug">{cat.slug}</span>
					</div>
					<div class="category-actions">
						<form method="POST" action="?/updateAspectRatio" use:enhance class="ratio-form">
							<input type="hidden" name="id" value={cat.id} />
							<input
								type="text"
								name="aspect_ratio"
								value={cat.aspectRatio}
								list="ratio-presets"
								placeholder="e.g. 16/9"
								aria-label="Aspect ratio"
								onchange={(e) => e.target.form.requestSubmit()}
							/>
						</form>
						<button class="btn-sm edit" onclick={() => startEditCat(cat)} aria-label="Edit category"><i class="fa-solid fa-pen"></i></button>
						<form method="POST" action="?/deleteCategory" use:enhance class="inline-form">
							<input type="hidden" name="id" value={cat.id} />
							<button type="submit" class="btn-sm delete" aria-label="Delete category"><i class="fa-solid fa-trash"></i></button>
						</form>
					</div>
				{/if}
			</div>

			<!-- Subcategories -->
			<div class="subcategories">
				{#each subsFor(cat.id) as sub (sub.id)}
					<div class="sub-item">
						{#if editingSub === sub.id}
							<form method="POST" action="?/renameSubcategory" use:enhance={() => { return async ({ update }) => { cancelEditSub(); await update(); }; }} class="inline-edit">
								<input type="hidden" name="id" value={sub.id} />
								<input type="text" name="name" bind:value={editingSubName} />
							<button type="submit" class="btn-sm save" aria-label="Save"><i class="fa-solid fa-check"></i></button>
							<button type="button" class="btn-sm cancel" onclick={cancelEditSub} aria-label="Cancel"><i class="fa-solid fa-xmark"></i></button>
						</form>
					{:else}
						<span class="sub-name">{sub.name}</span>
						<span class="sub-slug">{sub.slug}</span>
						<div class="sub-actions">
							<button class="btn-sm edit" onclick={() => startEditSub(sub)} aria-label="Edit subcategory"><i class="fa-solid fa-pen"></i></button>
							<form method="POST" action="?/deleteSubcategory" use:enhance class="inline-form">
								<input type="hidden" name="id" value={sub.id} />
								<button type="submit" class="btn-sm delete" aria-label="Delete subcategory"><i class="fa-solid fa-trash"></i></button>
								</form>
							</div>
						{/if}
					</div>
				{/each}
				<form method="POST" action="?/addSubcategory" use:enhance class="add-sub-form">
					<input type="hidden" name="category_id" value={cat.id} />
					<input type="text" name="name" placeholder="Add subcategory…" required />
					<button type="submit" aria-label="Add subcategory"><i class="fa-solid fa-plus"></i></button>
				</form>
			</div>
		</div>
	{/each}
</div>

{#if data.categories.length === 0}
	<p class="empty">No categories yet. Add one above.</p>
{/if}

<datalist id="ratio-presets">
	<option value="1/1">1:1</option>
	<option value="16/9">16:9</option>
	<option value="9/16">9:16</option>
	<option value="4/3">4:3</option>
	<option value="3/4">3:4</option>
	<option value="3/2">3:2</option>
	<option value="2/3">2:3</option>
	<option value="21/9">21:9</option>
</datalist>

<style>
	.page-header { margin-bottom: 1.5rem; }
	.page-header h1 { font-size: 1.5rem; font-weight: 600; }

	.error {
		background: rgba(255,60,60,0.1);
		border: 1px solid rgba(255,60,60,0.3);
		color: #ff6b6b;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.add-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
	}
	.add-form input {
		flex: 1;
		padding: 0.6rem 0.8rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.05);
		color: #fff;
		font-size: 0.9rem;
	}
	.add-form button {
		padding: 0.6rem 1rem;
		border-radius: 0.5rem;
		background: #ff0000;
		color: #fff;
		border: none;
		cursor: pointer;
		font-size: 0.85rem;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.add-form button:hover { opacity: 0.9; }

	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.category-card {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.category-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}

	.category-name {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.category-name .name {
		font-weight: 600;
		font-size: 1rem;
		color: #fff;
	}
	.category-name .slug {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.35);
		font-family: monospace;
	}

	.category-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.ratio-form { display: inline; }
	.ratio-form input[type="text"] {
		width: 5rem;
		padding: 0.2rem 0.4rem;
		border-radius: 0.35rem;
		border: 1px solid rgba(255,255,255,0.12);
		background: rgba(255,255,255,0.06);
		color: rgba(255,255,255,0.7);
		font-size: 0.75rem;
		text-align: center;
		font-family: monospace;
	}

	.inline-form { display: inline; }

	.btn-sm {
		width: 28px;
		height: 28px;
		border-radius: 0.35rem;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		transition: background 0.15s;
	}
	.btn-sm.edit {
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
	}
	.btn-sm.edit:hover { background: rgba(255,255,255,0.14); color: #fff; }
	.btn-sm.delete {
		background: rgba(255,60,60,0.1);
		color: rgba(255,60,60,0.6);
	}
	.btn-sm.delete:hover { background: rgba(255,60,60,0.2); color: #ff4444; }
	.btn-sm.save {
		background: rgba(0,200,100,0.15);
		color: rgba(0,200,100,0.8);
	}
	.btn-sm.save:hover { background: rgba(0,200,100,0.25); }
	.btn-sm.cancel {
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.5);
	}
	.btn-sm.cancel:hover { background: rgba(255,255,255,0.14); }

	.inline-edit {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex: 1;
	}
	.inline-edit input {
		flex: 1;
		padding: 0.35rem 0.6rem;
		border-radius: 0.35rem;
		border: 1px solid rgba(255,255,255,0.2);
		background: rgba(255,255,255,0.08);
		color: #fff;
		font-size: 0.9rem;
	}

	.subcategories {
		padding: 0.75rem 1.25rem 1rem;
	}

	.sub-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid rgba(255,255,255,0.04);
	}
	.sub-item:last-of-type { border-bottom: none; }

	.sub-name {
		font-size: 0.9rem;
		color: rgba(255,255,255,0.8);
	}
	.sub-slug {
		font-size: 0.7rem;
		color: rgba(255,255,255,0.3);
		font-family: monospace;
		margin-right: auto;
	}

	.sub-actions {
		display: flex;
		gap: 0.25rem;
		margin-left: auto;
	}

	.add-sub-form {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.6rem;
	}
	.add-sub-form input[type="text"] {
		flex: 1;
		padding: 0.35rem 0.6rem;
		border-radius: 0.35rem;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.04);
		color: #fff;
		font-size: 0.85rem;
	}
	.add-sub-form button {
		padding: 0.35rem 0.6rem;
		border-radius: 0.35rem;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
		border: none;
		cursor: pointer;
		font-size: 0.75rem;
	}
	.add-sub-form button:hover { background: rgba(255,255,255,0.14); color: #fff; }

	.empty {
		text-align: center;
		color: rgba(255,255,255,0.4);
		padding: 2rem;
	}
</style>
