<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let mediaType = $state('image');
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let hiddenInput = $state(null);
	let dragOver = $state(false);

	function syncHidden(files) {
		if (!hiddenInput) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		hiddenInput.files = dt.files;
	}

	function handleFileChange(e) {
		const files = Array.from(e.target.files || []);
		if (mediaType === 'image') {
			selectedFiles = files.slice(0, 1);
		} else {
			selectedFiles = [...selectedFiles, ...files];
		}
		syncHidden(selectedFiles);
	}

	function handleDrop(e) {
		e.preventDefault();
		dragOver = false;
		// Don't filter by MIME type — Linux file managers often send type=""
		const files = Array.from(e.dataTransfer.files);
		if (!files.length) return;
		if (mediaType === 'image') {
			selectedFiles = files.slice(0, 1);
		} else if (mediaType === 'video') {
			selectedFiles = files.slice(0, 1);
		} else {
			selectedFiles = [...selectedFiles, ...files];
		}
		syncHidden(selectedFiles);
	}

	function removeFile(i) {
		selectedFiles = selectedFiles.filter((_, idx) => idx !== i);
		syncHidden(selectedFiles);
	}

	$effect(() => {
		// Reset selected files when media type changes
		mediaType;
		selectedFiles = [];
		if (hiddenInput) hiddenInput.value = '';
	});
</script>

<div class="page-header">
	<h1>New Discovery Item</h1>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		uploading = true;
		return async ({ update }) => { uploading = false; await update(); };
	}}
	class="item-form"
>
	<label>
		Title *
		<input type="text" name="title" required value={form?.title ?? ''} />
	</label>

	<label>
		Description
		<textarea name="description" rows="3">{form?.description ?? ''}</textarea>
	</label>

	<div class="row">
		<label>
			Section *
			<select name="section_id" required>
				<option value="">Select…</option>
				{#each data.sections as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</label>

		<label>
			Media Type *
			<select name="media_type" bind:value={mediaType}>
				<option value="image">Image</option>
				<option value="carousel">Carousel (multiple images)</option>
				<option value="video">Video (self-hosted)</option>
				<option value="youtube">YouTube</option>
			</select>
		</label>
	</div>

	{#if mediaType === 'youtube'}
		<label>
			YouTube URL or Video ID *
			<input type="text" name="youtube_url" placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ" required />
		</label>
	{:else}
		<!-- Hidden real file input for form submission -->
		<input
			bind:this={hiddenInput}
			type="file"
			name={mediaType === 'video' ? 'video' : mediaType === 'carousel' ? 'images' : 'image'}
			multiple={mediaType === 'carousel'}
			class="sr-only"
			tabindex="-1"
			aria-hidden="true"
		/>

		<p class="field-label">
			{#if mediaType === 'image'}Image *{:else if mediaType === 'carousel'}Images * (at least 2){:else}Video * (mp4, webm, mov — max 200 MB){/if}
		</p>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="dropzone"
			class:drag-over={dragOver}
			class:has-files={selectedFiles.length > 0}
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) dragOver = false; }}
			ondrop={handleDrop}
		>
			{#if selectedFiles.length === 0}
				<i class="fa-solid {mediaType === 'video' ? 'fa-film' : 'fa-cloud-arrow-up'} dropzone-icon"></i>
				<p class="dropzone-text">Drag & drop {mediaType === 'video' ? 'a video' : 'images'} here</p>
				<span class="dropzone-or">or</span>
				<label class="browse-btn">
					Browse Files
					<input
						type="file"
						accept={mediaType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/webp,image/png,image/jpeg,image/gif,image/avif'}
						multiple={mediaType === 'carousel'}
						onchange={handleFileChange}
					/>
				</label>
				<span class="dropzone-hint">
					{#if mediaType === 'video'}MP4, WebM, MOV — max 200 MB{:else}WebP, PNG, JPEG, GIF, AVIF{/if}
				</span>
			{:else}
				<div class="file-preview-list">
					{#each selectedFiles as f, i (f.name + i)}
						<div class="file-preview-item">
							{#if mediaType !== 'video'}
								<img src={URL.createObjectURL(f)} alt={f.name} />
							{:else}
								<div class="file-preview-icon"><i class="fa-solid fa-film"></i></div>
							{/if}
							<div class="file-preview-info">
								<span class="file-name">{f.name}</span>
								<span class="file-size">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
							</div>
							{#if mediaType === 'carousel'}
								<span class="position-badge">#{i + 1}</span>
							{/if}
							<button type="button" class="remove-file" onclick={() => removeFile(i)} aria-label="Remove">
								<i class="fa-solid fa-xmark"></i>
							</button>
						</div>
					{/each}
				</div>
				<label class="add-more-btn">
					<i class="fa-solid fa-plus"></i> {mediaType === 'image' || mediaType === 'video' ? 'Replace' : 'Add more'}
					<input
						type="file"
						accept={mediaType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/webp,image/png,image/jpeg,image/gif,image/avif'}
						multiple={mediaType === 'carousel'}
						onchange={handleFileChange}
					/>
				</label>
			{/if}
		</div>
	{/if}

	<hr />

	<div class="row">
		<label>
			Creator Name
			<input type="text" name="creator_name" value={form?.creatorName ?? ''} />
		</label>
		<label>
			Creator URL
			<input type="url" name="creator_url" placeholder="https://…" value={form?.creatorUrl ?? ''} />
		</label>
	</div>

	<label>
		Source / Original URL
		<input type="url" name="source_url" placeholder="https://…" value={form?.sourceUrl ?? ''} />
	</label>

	<label class="toggle-label">
		<input type="checkbox" name="visible" value="true" checked />
		Visible on public site
	</label>

	{#if data.tags.length > 0}
		<fieldset>
			<legend>Tags</legend>
			<div class="tag-checks">
				{#each data.tags as t}
					<label class="tag-check">
						<input type="checkbox" name="tags" value={t.id} />
						{t.name}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div class="form-actions">
		<a href="/admin/discovery" class="btn-secondary">Cancel</a>
		<button type="submit" class="btn-cta" disabled={uploading}>
			{#if uploading}<i class="fa-solid fa-spinner fa-spin"></i> Uploading…{:else}Create Item{/if}
		</button>
	</div>
</form>

<style>
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
	.page-header { margin-bottom: 1.5rem; }
	.item-form { display: flex; flex-direction: column; gap: 1.25rem; max-width: 640px; margin-top: 1rem; }
	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
	}
	input[type="text"], input[type="url"], textarea, select {
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 1rem;
		font-family: inherit;
	}
	input:focus, textarea:focus, select:focus { outline: none; border-color: #ff0000; }
	select { cursor: pointer; }
	select option { background: #1a1a1a; }
	textarea { resize: vertical; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); }
	.field-label { font-size: 0.9rem; color: rgba(255,255,255,0.7); margin: 0; }

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
	.dropzone.has-files { padding: 1rem; gap: 0.75rem; }
	.dropzone-icon { font-size: 2rem; color: rgba(255,255,255,0.25); margin-bottom: 0.25rem; }
	.dropzone-text { color: rgba(255,255,255,0.5); font-size: 0.95rem; margin: 0; }
	.dropzone-or { color: rgba(255,255,255,0.25); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
	.browse-btn {
		padding: 0.5rem 1.2rem;
		background: #ff0000;
		color: #fff;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: opacity 0.15s;
	}
	.browse-btn:hover { opacity: 0.9; }
	.browse-btn input { display: none; }
	.dropzone-hint { color: rgba(255,255,255,0.25); font-size: 0.75rem; margin-top: 0.25rem; }
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

	/* File previews */
	.file-preview-list { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
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
		width: 56px; height: 42px;
		object-fit: cover;
		border-radius: 0.3rem;
		flex-shrink: 0;
	}
	.file-preview-icon {
		width: 56px; height: 42px;
		display: flex; align-items: center; justify-content: center;
		background: rgba(255,255,255,0.06);
		border-radius: 0.3rem;
		color: rgba(255,255,255,0.4);
		font-size: 1.2rem;
		flex-shrink: 0;
	}
	.file-preview-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
	.file-name { font-size: 0.82rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.file-size { font-size: 0.72rem; color: rgba(255,255,255,0.35); }
	.position-badge {
		font-size: 0.7rem; font-weight: 600;
		padding: 0.15rem 0.5rem;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
		border-radius: 0.3rem;
		flex-shrink: 0;
	}
	.remove-file {
		background: transparent; border: none;
		color: rgba(255,255,255,0.3);
		cursor: pointer; padding: 0.25rem 0.4rem;
		border-radius: 0.25rem; font-size: 0.85rem; flex-shrink: 0;
	}
	.remove-file:hover { color: #ff4444; }

	fieldset { border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 1rem; }
	legend { color: rgba(255,255,255,0.7); font-size: 0.9rem; padding: 0 0.4rem; }
	.tag-checks { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
	.tag-check {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.75rem;
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.82rem;
		color: rgba(255,255,255,0.55);
		transition: all 0.15s;
	}
	.tag-check:has(input:checked) {
		border-color: #ff2222;
		background: rgba(255,34,34,0.1);
		color: #fff;
	}
	.tag-check input[type="checkbox"] { display: none; }
	.toggle-label { flex-direction: row; align-items: center; gap: 0.6rem; cursor: pointer; }
	.toggle-label input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: #ff0000; }
	.form-actions { display: flex; gap: 0.75rem; padding-top: 0.5rem; align-items: center; }
	.btn-cta {
		padding: 0.7rem 1.5rem;
		background: #ff0000;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.btn-cta:hover { background: #e00000; }
	.btn-cta:disabled { opacity: 0.6; cursor: not-allowed; }
	.btn-secondary {
		padding: 0.7rem 1.2rem;
		background: rgba(255,255,255,0.07);
		color: rgba(255,255,255,0.7);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: all 0.15s;
	}
	.btn-secondary:hover { background: rgba(255,255,255,0.12); color: #fff; }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
	}
</style>
