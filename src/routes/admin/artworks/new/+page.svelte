<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let displayMode = $state('single');
	let carouselDirection = $state('horizontal');
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let selectedCategory = $state('');
	let dragOver = $state(false);
	let hiddenInput = $state(null);

	function syncHiddenInput(files) {
		if (!hiddenInput) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		hiddenInput.files = dt.files;
	}

	function handleFileChange(e) {
		const files = Array.from(e.target.files || []);
		if (displayMode === 'single') {
			selectedFiles = files.slice(0, 1);
		} else {
			selectedFiles = [...selectedFiles, ...files];
		}
		syncHiddenInput(selectedFiles);
	}

	function handleDrop(e) {
		e.preventDefault();
		dragOver = false;
		const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
		if (!files.length) return;
		if (displayMode === 'single') {
			selectedFiles = files.slice(0, 1);
		} else {
			selectedFiles = [...selectedFiles, ...files];
		}
		syncHiddenInput(selectedFiles);
	}

	function removeFile(index) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
		syncHiddenInput(selectedFiles);
	}

	function swapFiles(a, b) {
		const arr = [...selectedFiles];
		[arr[a], arr[b]] = [arr[b], arr[a]];
		selectedFiles = arr;
		syncHiddenInput(selectedFiles);
	}

	let filteredSubs = $derived(
		selectedCategory ? data.subcategories.filter(s => {
			const cat = data.categories.find(c => c.slug === selectedCategory);
			return cat && s.categoryId === cat.id;
		}) : []
	);
</script>

<h1>Upload Artwork</h1>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<form method="POST" enctype="multipart/form-data" use:enhance={() => { uploading = true; return async ({ update }) => { uploading = false; await update(); }; }} class="artwork-form">
	<label>
		Title *
		<input type="text" name="title" required />
	</label>

	<label>
		Description
		<textarea name="description" rows="3"></textarea>
	</label>

	<div class="row">
		<label>
			Category *
			<select name="category" required bind:value={selectedCategory}>
				<option value="">Select…</option>
				{#each data.categories as cat}
					<option value={cat.slug}>{cat.name}</option>
				{/each}
			</select>
		</label>

		<label>
			Subcategory
			<select name="subcategory">
				<option value="">None</option>
				{#each filteredSubs as sub}
					<option value={sub.slug}>{sub.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<!-- Display mode -->
	<fieldset class="mode-fieldset">
		<legend>Display Mode</legend>
		<div class="mode-options">
			<label class="mode-option" class:selected={displayMode === 'single'}>
				<input type="radio" name="display_mode" value="single" bind:group={displayMode} />
				<i class="fa-solid fa-image"></i>
				<span>Single</span>
			</label>
			<label class="mode-option" class:selected={displayMode === 'carousel'}>
				<input type="radio" name="display_mode" value="carousel" bind:group={displayMode} />
				<i class="fa-solid fa-images"></i>
				<span>Carousel</span>
			</label>
			<label class="mode-option" class:selected={displayMode === 'before-after'}>
				<input type="radio" name="display_mode" value="before-after" bind:group={displayMode} />
				<i class="fa-solid fa-right-left"></i>
				<span>Before / After</span>
			</label>
		</div>
	</fieldset>

	{#if displayMode === 'carousel'}
		<fieldset class="mode-fieldset">
			<legend>Carousel Direction</legend>
			<div class="mode-options">
				<label class="mode-option" class:selected={carouselDirection === 'horizontal'}>
					<input type="radio" name="carousel_direction" value="horizontal" bind:group={carouselDirection} />
					<i class="fa-solid fa-arrows-left-right"></i>
					<span>Horizontal</span>
				</label>
				<label class="mode-option" class:selected={carouselDirection === 'vertical'}>
					<input type="radio" name="carousel_direction" value="vertical" bind:group={carouselDirection} />
					<i class="fa-solid fa-arrows-up-down"></i>
					<span>Vertical</span>
				</label>
			</div>
		</fieldset>
	{/if}

	<!-- Hidden persistent file input for form submission -->
	<input
		bind:this={hiddenInput}
		type="file"
		name="images"
		multiple={displayMode !== 'single'}
		class="sr-only"
		tabindex="-1"
		aria-hidden="true"
	/>

	<!-- Images -->
	<p class="field-label">
		{displayMode === 'single' ? 'Image *' : displayMode === 'before-after' ? 'Images * (exactly 2: before, then after)' : 'Images * (select multiple for carousel)'}
	</p>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="dropzone"
		class:drag-over={dragOver}
		class:has-files={selectedFiles.length > 0}
		ondragover={(e) => { e.preventDefault(); dragOver = true; }}
		ondragleave={() => { dragOver = false; }}
		ondrop={handleDrop}
	>
		{#if selectedFiles.length === 0}
			<i class="fa-solid fa-cloud-arrow-up dropzone-icon"></i>
			<p class="dropzone-text">Drag & drop images here</p>
			<span class="dropzone-or">or</span>
			<label class="browse-btn">
				Browse Files
				<input
					type="file"
					accept="image/webp,image/png,image/jpeg,image/gif,image/tiff,image/avif"
					multiple={displayMode !== 'single'}
					onchange={handleFileChange}
				/>
			</label>
			<span class="dropzone-hint">WebP, PNG, JPEG, GIF, TIFF, AVIF — up to 50 MB each</span>
		{:else}
			<div class="file-preview-list">
				{#each selectedFiles as file, i (file.name + i)}
					<div class="file-preview-item">
						<img src={URL.createObjectURL(file)} alt={file.name} />
						<div class="file-preview-info">
							<span class="file-name">{file.name}</span>
							<span class="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
						</div>
						{#if displayMode === 'before-after'}
							<span class="position-badge">{i === 0 ? 'Before' : 'After'}</span>
							{#if selectedFiles.length === 2}
								<button type="button" class="swap-btn" onclick={() => swapFiles(0, 1)} aria-label="Swap before and after">
									<i class="fa-solid fa-right-left"></i>
								</button>
							{/if}
						{:else if displayMode === 'carousel'}
							<span class="position-badge">#{i + 1}</span>
						{/if}
						<button type="button" class="remove-file" onclick={() => removeFile(i)} aria-label="Remove image">
							<i class="fa-solid fa-xmark"></i>
						</button>
					</div>
				{/each}
			</div>
			<label class="add-more-btn">
				<i class="fa-solid fa-plus"></i> {displayMode === 'single' ? 'Replace' : 'Add more'}
				<input
					type="file"
					accept="image/webp,image/png,image/jpeg,image/gif,image/tiff,image/avif"
					multiple={displayMode !== 'single'}
					onchange={handleFileChange}
				/>
			</label>
		{/if}
	</div>

	{#if data.tags.length}
		<fieldset>
			<legend>Tags</legend>
			<div class="tag-grid">
				{#each data.tags as t}
					<label class="tag-check">
						<input type="checkbox" name="tags" value={t.id} />
						{t.name}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<label>
		Case Study
		<select name="case_study_id">
			<option value="">None</option>
			{#each data.caseStudies as cs}
				<option value={cs.id}>{cs.title}</option>
			{/each}
		</select>
	</label>

	<button type="submit" class="btn-cta" disabled={uploading}>
		{#if uploading}
			<i class="fa-solid fa-spinner fa-spin"></i> Processing…
		{:else}
			Upload Artwork
		{/if}
	</button>
</form>

<style>
	.artwork-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 600px;
		margin-top: 1.5rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
	}
	input[type="text"], textarea, select {
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 1rem;
		font-family: inherit;
	}
	input:focus, textarea:focus, select:focus {
		outline: none;
		border-color: #ff0000;
	}
	select { cursor: pointer; }
	select option { background: #1a1a1a; }
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.field-label {
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
		margin: 0;
	}

	/* Dropzone */
	.dropzone {
		border: 2px dashed rgba(255,255,255,0.15);
		border-radius: 0.75rem;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
		background: rgba(255,255,255,0.02);
	}
	.dropzone.drag-over {
		border-color: #ff3333;
		background: rgba(255,34,34,0.06);
	}
	.dropzone.has-files {
		padding: 1rem;
		gap: 0.75rem;
	}
	.dropzone-icon {
		font-size: 2rem;
		color: rgba(255,255,255,0.25);
		margin-bottom: 0.25rem;
	}
	.dropzone-text {
		color: rgba(255,255,255,0.5);
		font-size: 0.95rem;
		margin: 0;
	}
	.dropzone-or {
		color: rgba(255,255,255,0.25);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.browse-btn {
		padding: 0.5rem 1.2rem;
		background: #ff0000;
		color: #fff;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		text-align: center;
		transition: opacity 0.15s;
	}
	.browse-btn:hover { opacity: 0.9; }
	.browse-btn input { display: none; }
	.dropzone-hint {
		color: rgba(255,255,255,0.25);
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}
	.add-more-btn {
		padding: 0.4rem 0.8rem;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
		border-radius: 0.4rem;
		cursor: pointer;
		font-size: 0.8rem;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		align-self: flex-start;
		transition: all 0.15s;
	}
	.add-more-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
	.add-more-btn input { display: none; }

	/* Mode selector */
	.mode-fieldset {
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.5rem;
		padding: 1rem;
	}
	.mode-options {
		display: flex;
		gap: 0.5rem;
	}
	.mode-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem 0.5rem;
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
	}
	.mode-option input[type="radio"] { display: none; }
	.mode-option i { font-size: 1.2rem; color: rgba(255,255,255,0.4); }
	.mode-option span { font-size: 0.8rem; }
	.mode-option:hover { border-color: rgba(255,255,255,0.2); }
	.mode-option.selected {
		border-color: #ff2222;
		background: rgba(255,34,34,0.08);
	}
	.mode-option.selected i { color: #ff3333; }

	/* File previews */
	.file-preview-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.file-preview-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.file-preview-item img {
		width: 56px;
		height: 42px;
		object-fit: cover;
		border-radius: 0.3rem;
		flex-shrink: 0;
	}
	.file-preview-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.file-name {
		font-size: 0.82rem;
		color: #fff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.file-size {
		font-size: 0.72rem;
		color: rgba(255,255,255,0.35);
	}
	.position-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
		border-radius: 0.3rem;
		flex-shrink: 0;
	}
	.remove-file {
		background: transparent;
		border: none;
		color: rgba(255,255,255,0.3);
		cursor: pointer;
		padding: 0.25rem 0.4rem;
		border-radius: 0.25rem;
		font-size: 0.85rem;
		flex-shrink: 0;
	}
	.remove-file:hover { color: #ff4444; }
	.swap-btn {
		background: rgba(80,160,255,0.12);
		border: none;
		color: #50a0ff;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 0.3rem;
		font-size: 0.75rem;
		flex-shrink: 0;
		transition: all 0.15s;
	}
	.swap-btn:hover { background: rgba(80,160,255,0.25); }

	/* Tags / toggles */
	fieldset {
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.5rem;
		padding: 1rem;
	}
	legend {
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
		padding: 0 0.3rem;
	}
	.tag-grid {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.tag-check {
		flex-direction: row;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
	}
	.toggle-label {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}
	.error {
		color: #ff4444;
		padding: 0.75rem;
		background: rgba(255,0,0,0.1);
		border-radius: 0.5rem;
	}

	/* Submit button */
	.btn-cta {
		padding: 0.75rem 1.5rem;
		background: #ff0000;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		font-family: 'Satoshi', sans-serif;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.btn-cta:hover { background: #e00000; }
	.btn-cta:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
