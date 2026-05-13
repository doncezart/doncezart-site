<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let useYoutube = $state(false);
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let hiddenInput = $state(null);
	let dragOver = $state(false);

	// Derived detected type from selected files
	let detectedType = $derived.by(() => {
		if (selectedFiles.length === 0) return null;
		const first = selectedFiles[0];
		if (first.type.startsWith('video/')) return 'video';
		if (selectedFiles.length > 1) return 'carousel';
		return 'image';
	});

	function syncHidden(files) {
		if (!hiddenInput) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		hiddenInput.files = dt.files;
	}

	function handleFileChange(e) {
		const files = Array.from(e.target.files || []);
		const isVideo = files[0]?.type.startsWith('video/');
		selectedFiles = isVideo ? files.slice(0, 1) : [...selectedFiles, ...files];
		syncHidden(selectedFiles);
	}

	function handleDrop(e) {
		e.preventDefault();
		dragOver = false;
		const files = Array.from(e.dataTransfer.files);
		if (!files.length) return;
		const isVideo = files[0]?.type.startsWith('video/');
		selectedFiles = isVideo ? files.slice(0, 1) : [...selectedFiles, ...files];
		syncHidden(selectedFiles);
	}

	function removeFile(i) {
		selectedFiles = selectedFiles.filter((_, idx) => idx !== i);
		syncHidden(selectedFiles);
	}

	$effect(() => {
		if (useYoutube) {
			selectedFiles = [];
			if (hiddenInput) hiddenInput.value = '';
		}
	});
</script>

<div class="page-header">
	<h1>New Discovery Item</h1>
	<div class="header-actions">
		<a href="/admin/discovery" class="btn-secondary">Cancel</a>
		<button type="submit" class="btn-cta" disabled={uploading} form="new-form">
			{#if uploading}<i class="fa-solid fa-spinner fa-spin"></i> Uploading…{:else}Create Item{/if}
		</button>
	</div>
</div>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<div class="page-layout">
<form
	id="new-form"
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		uploading = true;
		return async ({ update }) => { uploading = false; await update(); };
	}}
	class="form-contents"
>
	<!-- ── LEFT: all fields ───────────────────────── -->
	<div class="col col-left">
		<label>
			Title *
			<input type="text" name="title" required value={form?.title ?? ''} />
		</label>

		<label>
			Section *
			<select name="section_id" required>
				<option value="">Select…</option>
				{#each data.sections as s}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
		</label>

		<label class="toggle-label">
			<input type="checkbox" name="visible" value="true" checked />
			Visible on public site
		</label>

		<label>
			Description
			<textarea name="description" rows="3">{form?.description ?? ''}</textarea>
		</label>

		<label>
			Notes <span class="field-hint">(public — shown in the full-view popup)</span>
			<textarea name="notes" rows="3">{form?.notes ?? ''}</textarea>
		</label>

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
	</div>

	<!-- ── RIGHT: media ───────────────────────────── -->
	<div class="col col-media">
		<p class="section-heading"><i class="fa-solid fa-cloud-arrow-up"></i> Media</p>

		<label class="toggle-label">
			<input type="checkbox" bind:checked={useYoutube} />
			Use YouTube URL instead of file upload
		</label>

		{#if useYoutube}
			<label>
				YouTube URL or Video ID *
				<input type="text" name="youtube_url" placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ" />
			</label>
		{:else}
			<input
				bind:this={hiddenInput}
				type="file"
				name="media"
				multiple
				class="sr-only"
				tabindex="-1"
				aria-hidden="true"
			/>

			{#if detectedType}
				<p class="detected-type">
					<i class="fa-solid {detectedType === 'video' ? 'fa-film' : detectedType === 'carousel' ? 'fa-images' : 'fa-image'}"></i>
					Detected: <strong>{detectedType === 'carousel' ? `Carousel (${selectedFiles.length} images)` : detectedType === 'video' ? 'Video' : 'Image'}</strong>
				</p>
			{/if}

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
					<i class="fa-solid fa-cloud-arrow-up dropzone-icon"></i>
					<p class="dropzone-text">Drag & drop image(s) or a video here</p>
					<span class="dropzone-or">or</span>
					<label class="browse-btn">
						Browse Files
						<input
							type="file"
							accept="image/webp,image/png,image/jpeg,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
							multiple
							onchange={handleFileChange}
						/>
					</label>
					<span class="dropzone-hint">Images (WebP, PNG, JPEG…) or Video (MP4, WebM, MOV — max 200 MB). Multiple images = carousel.</span>
				{:else}
					<div class="file-preview-list">
						{#each selectedFiles as f, i (f.name + i)}
							<div class="file-preview-item">
								{#if f.type.startsWith('image/')}
									<img src={URL.createObjectURL(f)} alt={f.name} />
								{:else}
									<div class="file-preview-icon"><i class="fa-solid fa-film"></i></div>
								{/if}
								<div class="file-preview-info">
									<span class="file-name">{f.name}</span>
									<span class="file-size">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
								</div>
								{#if selectedFiles.length > 1}
									<span class="position-badge">#{i + 1}</span>
								{/if}
								<button type="button" class="remove-file" onclick={() => removeFile(i)} aria-label="Remove">
									<i class="fa-solid fa-xmark"></i>
								</button>
							</div>
						{/each}
					</div>
					<label class="add-more-btn">
						<i class="fa-solid fa-plus"></i> Add more
						<input
							type="file"
							accept="image/webp,image/png,image/jpeg,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
							multiple
							onchange={handleFileChange}
						/>
					</label>
				{/if}
			</div>
		{/if}
	</div>
</form>
</div>

<style>
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
	.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
	.header-actions { display: flex; gap: 0.75rem; align-items: center; flex-shrink: 0; }

	/* ── Layout grid ─────────────────────────────── */
	.page-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		margin-top: 1rem;
		align-items: start;
	}
	.form-contents { display: contents; }
	.col { display: flex; flex-direction: column; gap: 1.25rem; }
	.section-heading {
		font-size: 0.82rem; font-weight: 600;
		color: rgba(255,255,255,0.45);
		text-transform: uppercase; letter-spacing: 0.06em;
		margin: 0; display: flex; align-items: center; gap: 0.4rem;
	}

	@media (min-width: 768px) {
		.page-layout { grid-template-columns: 1fr 1.4fr; }
		.col-left  { grid-column: 1; }
		.col-media { grid-column: 2; }
	}
	.field-hint { font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: normal; }
	.detected-type { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin: 0; }
	.detected-type strong { color: #fff; }
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
