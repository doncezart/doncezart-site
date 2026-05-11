<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let selectedFiles = $state([]);
	let uploading = $state(false);

	function handleFileChange(e) {
		selectedFiles = Array.from(e.target.files || []);
	}

	function handleDrop(e) {
		e.preventDefault();
		dragOver = false;
		const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
		if (!files.length) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		const input = document.querySelector('input[name="images"]');
		if (input) input.files = dt.files;
		selectedFiles = files;
	}

	let dragOver = $state(false);

	function removeFile(index) {
		const dt = new DataTransfer();
		selectedFiles.filter((_, i) => i !== index).forEach(f => dt.items.add(f));
		const input = document.querySelector('input[name="images"]');
		if (input) input.files = dt.files;
		selectedFiles = Array.from(dt.files);
	}

	function formatSize(bytes) {
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
		return (bytes / 1024 / 1024).toFixed(1) + ' MB';
	}
</script>

<div class="page-header">
	<div>
		<h1>Bulk Upload</h1>
		<p class="subtitle">Upload multiple images at once. Each becomes its own artwork.</p>
	</div>
	<a href="/admin/artworks" class="back-link">
		<i class="fa-solid fa-arrow-left"></i> Back to Artworks
	</a>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

{#if form?.success}
	<div class="success-banner">
		<i class="fa-solid fa-check-circle"></i>
		<div>
			<strong>{form.uploaded} artwork{form.uploaded !== 1 ? 's' : ''} uploaded successfully.</strong>
			{#if form.failed.length > 0}
				<p class="fail-note">{form.failed.length} failed: {form.failed.join(', ')}</p>
			{/if}
		</div>
		<a href="/admin/artworks">View artworks</a>
	</div>
{/if}

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => { uploading = true; return async ({ update }) => { uploading = false; selectedFiles = []; await update(); }; }}
	class="bulk-form"
>
	<label>
		Category *
		<select name="category" required>
			<option value="">Select…</option>
			{#each data.categories as cat}
				<option value={cat.slug}>{cat.name}</option>
			{/each}
		</select>
	</label>

	<!-- Drop zone -->
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
			<i class="fa-solid fa-cloud-arrow-up"></i>
			<p>Drag & drop images here</p>
			<span class="or">or</span>
			<label class="browse-btn">
				Browse Files
				<input
					type="file"
					name="images"
					accept="image/webp,image/png,image/jpeg,image/gif,image/tiff,image/avif"
					multiple
					required
					onchange={handleFileChange}
				/>
			</label>
			<span class="hint">WebP, PNG, JPEG, GIF, TIFF, AVIF — up to 50 MB each</span>
		{:else}
			<div class="file-list">
				<div class="file-list-header">
					<span>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</span>
					<label class="add-more-btn">
						<i class="fa-solid fa-plus"></i> Add more
						<input
							type="file"
							name="images"
							accept="image/webp,image/png,image/jpeg,image/gif,image/tiff,image/avif"
							multiple
							onchange={(e) => {
								const newFiles = Array.from(e.target.files || []);
								const all = [...selectedFiles, ...newFiles];
								const dt = new DataTransfer();
								all.forEach(f => dt.items.add(f));
								const mainInput = document.querySelectorAll('input[name="images"]')[0];
								if (mainInput) mainInput.files = dt.files;
								selectedFiles = all;
							}}
						/>
					</label>
				</div>
				<div class="file-grid">
					{#each selectedFiles as file, i (file.name + i)}
						<div class="file-card">
							<img src={URL.createObjectURL(file)} alt={file.name} />
							<div class="file-card-info">
								<span class="fc-name">{file.name}</span>
								<span class="fc-size">{formatSize(file.size)}</span>
							</div>
							<button type="button" class="fc-remove" onclick={() => removeFile(i)} aria-label="Remove">
								<i class="fa-solid fa-xmark"></i>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<button type="submit" class="submit-btn" disabled={uploading || selectedFiles.length === 0}>
		{#if uploading}
			<i class="fa-solid fa-spinner fa-spin"></i> Processing {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''}…
		{:else}
			<i class="fa-solid fa-upload"></i> Upload {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''}
		{/if}
	</button>
</form>

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.page-header h1 { margin-bottom: 0.2rem; }
	.subtitle { color: rgba(255,255,255,0.35); font-size: 0.9rem; }
	.back-link {
		font-size: 0.85rem;
		color: rgba(255,255,255,0.4);
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}
	.back-link:hover { color: #fff; }

	.error {
		color: #ff4444;
		padding: 0.75rem;
		background: rgba(255,0,0,0.1);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}
	.success-banner {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: rgba(50,200,80,0.1);
		border: 1px solid rgba(50,200,80,0.2);
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
		color: #6fdc8c;
	}
	.success-banner i { font-size: 1.3rem; }
	.success-banner a { color: #fff; font-size: 0.85rem; margin-left: auto; }
	.fail-note { font-size: 0.8rem; color: #ff8888; margin-top: 0.2rem; }

	.bulk-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.bulk-form > label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
		max-width: 300px;
	}
	select {
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
	}
	select option { background: #1a1a1a; }
	select:focus { outline: none; border-color: #ff0000; }

	/* Drop zone */
	.dropzone {
		border: 2px dashed rgba(255,255,255,0.12);
		border-radius: 0.75rem;
		padding: 3rem 2rem;
		text-align: center;
		transition: all 0.15s;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.dropzone.has-files {
		padding: 1rem;
		text-align: left;
		align-items: stretch;
	}
	.dropzone.drag-over {
		border-color: #ff3333;
		background: rgba(255,34,34,0.04);
	}
	.dropzone > i {
		font-size: 2.5rem;
		color: rgba(255,255,255,0.15);
		margin-bottom: 0.5rem;
	}
	.dropzone > p {
		font-size: 1rem;
		color: rgba(255,255,255,0.5);
	}
	.or {
		font-size: 0.8rem;
		color: rgba(255,255,255,0.25);
	}
	.browse-btn {
		display: inline-flex;
		padding: 0.5rem 1.25rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}
	.browse-btn:hover { background: rgba(255,255,255,0.12); }
	.browse-btn input { display: none; }
	.hint {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.2);
		margin-top: 0.5rem;
	}

	/* File list inside dropzone */
	.file-list { width: 100%; }
	.file-list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		font-size: 0.85rem;
		color: rgba(255,255,255,0.5);
	}
	.add-more-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.75rem;
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.4rem;
		color: rgba(255,255,255,0.6);
		font-size: 0.8rem;
		cursor: pointer;
	}
	.add-more-btn:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
	.add-more-btn input { display: none; }

	.file-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.5rem;
		max-height: 400px;
		overflow-y: auto;
	}
	.file-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.06);
		border-radius: 0.4rem;
	}
	.file-card img {
		width: 44px;
		height: 33px;
		object-fit: cover;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}
	.file-card-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.fc-name {
		font-size: 0.75rem;
		color: #fff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fc-size {
		font-size: 0.65rem;
		color: rgba(255,255,255,0.3);
	}
	.fc-remove {
		background: transparent;
		border: none;
		color: rgba(255,255,255,0.2);
		cursor: pointer;
		padding: 0.2rem;
		font-size: 0.75rem;
		flex-shrink: 0;
	}
	.fc-remove:hover { color: #ff4444; }

	/* Submit */
	.submit-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.7rem 1.5rem;
		background: #ff2222;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		font-family: 'Satoshi', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		align-self: flex-start;
	}
	.submit-btn:hover { background: #e61515; }
	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
