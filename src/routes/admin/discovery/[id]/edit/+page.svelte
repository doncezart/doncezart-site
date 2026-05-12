<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let mediaType = $state(data.item.mediaType);
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let hiddenInput = $state(null);
	let dragOver = $state(false);
	let regenning = $state(false);
	let regenResult = $state(null);
	// live thumbnail preview after regen
	let thumbPreview = $state(data.item.thumbnailUrl ?? null);
	// video scrubber for thumbnail selection
	let scrubVideo = $state(null);
	let scrubOffset = $state(0);
	let videoDuration = $state(0);

	function syncHidden(files) {
		if (!hiddenInput) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		hiddenInput.files = dt.files;
	}

	function handleFileChange(e) {
		const files = Array.from(e.target.files || []);
		if (mediaType === 'image' || mediaType === 'video') {
			selectedFiles = files.slice(0, 1);
		} else {
			selectedFiles = [...selectedFiles, ...files];
		}
		syncHidden(selectedFiles);
	}

	function handleDrop(e) {
		e.preventDefault();
		dragOver = false;
		const files = Array.from(e.dataTransfer.files);
		if (!files.length) return;
		if (mediaType === 'image' || mediaType === 'video') {
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
</script>

<div class="page-header">
	<h1>Edit Discovery Item</h1>
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
		<input type="text" name="title" required value={data.item.title} />
	</label>

	<label>
		Description
		<textarea name="description" rows="3">{data.item.description ?? ''}</textarea>
	</label>

	<div class="row">
		<label>
			Section *
			<select name="section_id" required>
				{#each data.sections as s}
					<option value={s.id} selected={s.id === data.item.sectionId}>{s.name}</option>
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

	{#if data.item.thumbnailUrl || data.item.imageUrl}
		<div class="current-media">
			<p class="current-label">Current media</p>
			<div class="media-preview-box">
				{#if data.item.mediaType === 'video'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						src={data.item.imageUrl}
						controls
						disablepictureinpicture
						controlslist="nopictureinpicture nodownload"
						class="media-preview-el"
					></video>
				{:else if data.item.mediaType === 'carousel'}
					<img
						src={data.item.thumbnailUrl || data.item.imageUrl}
						alt="carousel thumbnail"
						class="media-preview-el"
					/>
					<span class="preview-badge"><i class="fa-solid fa-images"></i> Carousel</span>
				{:else}
					<img src={data.item.imageUrl} alt="current" class="media-preview-el" />
				{/if}
			</div>
		</div>
	{/if}

	<hr />
	<p class="section-heading"><i class="fa-solid fa-cloud-arrow-up"></i> Replace media</p>

	{#if mediaType === 'youtube'}
		<label>
			YouTube URL or Video ID *
			<input
				type="text"
				name="youtube_url"
				placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ"
				value={data.item.youtubeId ?? ''}
				required
			/>
		</label>
	{:else}
		<!-- Hidden real file input -->
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
			{#if mediaType === 'image'}Replace image (leave empty to keep current){:else if mediaType === 'carousel'}Replace all frames (upload 2+ to replace, leave empty to keep){:else}Replace video (leave empty to keep current){/if}
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
					<i class="fa-solid fa-plus"></i> {mediaType === 'carousel' ? 'Add more' : 'Replace'}
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
			<input type="text" name="creator_name" value={data.item.creatorName ?? ''} />
		</label>
		<label>
			Creator URL
			<input type="url" name="creator_url" value={data.item.creatorUrl ?? ''} />
		</label>
	</div>

	<label>
		Source / Original URL
		<input type="url" name="source_url" value={data.item.sourceUrl ?? ''} />
	</label>

	<label class="toggle-label">
		<input type="checkbox" name="visible" value="true" checked={data.item.visible} />
		Visible on public site
	</label>

	{#if data.allTags.length > 0}
		<fieldset>
			<legend>Tags</legend>
			<div class="tag-checks">
				{#each data.allTags as t}
					<label class="tag-check">
						<input type="checkbox" name="tags" value={t.id} checked={t.checked} />
						{t.name}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div class="form-actions">
		<a href="/admin/discovery" class="btn-secondary">Cancel</a>
		<button type="submit" class="btn-cta" disabled={uploading}>
			{#if uploading}<i class="fa-solid fa-spinner fa-spin"></i> Saving…{:else}Save Changes{/if}
		</button>
	</div>
</form>

{#if data.item.mediaType === 'video' && data.item.imageUrl}
	<div class="regen-section">
		<p class="section-heading"><i class="fa-solid fa-image"></i> Thumbnail</p>
		{#if thumbPreview}
			<img src={thumbPreview} alt="thumbnail" class="thumb-preview-img" />
		{:else}
			<p class="regen-hint">No thumbnail — first frame used as fallback.</p>
		{/if}

		<div class="scrubber-wrap">
			<p class="scrubber-hint">Scrub to pick a frame, then save it as the thumbnail:</p>
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={scrubVideo}
				src={data.item.imageUrl}
				muted
				playsinline
				preload="auto"
				disablepictureinpicture
				controlslist="nopictureinpicture nodownload noplaybackrate"
				class="scrub-video"
				onloadedmetadata={() => { videoDuration = scrubVideo?.duration ?? 0; }}
			></video>
			<input
				type="range"
				min="0"
				max={videoDuration || 100}
				step="0.05"
				bind:value={scrubOffset}
				oninput={() => { if (scrubVideo) scrubVideo.currentTime = scrubOffset; }}
				class="scrub-slider"
			/>
			<span class="scrub-time">{scrubOffset.toFixed(1)}s{videoDuration ? ` / ${videoDuration.toFixed(1)}s` : ''}</span>
		</div>

		<form
			method="POST"
			action="?/regen_thumb"
			use:enhance={() => {
				regenning = true;
				return async ({ result, update }) => {
					regenning = false;
					if (result.type === 'success' && result.data?.thumbUrl) {
						thumbPreview = result.data.thumbUrl + '?t=' + Date.now();
						regenResult = 'Thumbnail updated!';
					} else {
						await update();
					}
				};
			}}
			class="regen-form"
		>
			<input type="hidden" name="offset" value={scrubOffset} />
			<button type="submit" class="btn-secondary" disabled={regenning}>
				{#if regenning}<i class="fa-solid fa-spinner fa-spin"></i> Generating…{:else}<i class="fa-solid fa-camera"></i> Save as Thumbnail{/if}
			</button>
		</form>
		{#if regenResult}<p class="regen-success">{regenResult}</p>{/if}
		{#if form?.regenError}<p class="error">{form.regenError}</p>{/if}
	</div>
{/if}

<style>
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
	.page-header { margin-bottom: 1.5rem; }
	.item-form { display: flex; flex-direction: column; gap: 1.25rem; max-width: 640px; margin-top: 1rem; }
	label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; color: rgba(255,255,255,0.7); }
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
	.current-media { display: flex; flex-direction: column; gap: 0.5rem; }
	.current-label { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
	.media-preview-box {
		position: relative;
		background: #000;
		border-radius: 0.6rem;
		overflow: hidden;
		max-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(255,255,255,0.08);
	}
	.media-preview-el {
		max-width: 100%;
		max-height: 400px;
		object-fit: contain;
		display: block;
		width: 100%;
	}
	.preview-badge {
		position: absolute;
		bottom: 0.5rem; left: 0.5rem;
		background: rgba(0,0,0,0.7);
		color: rgba(255,255,255,0.8);
		padding: 0.2rem 0.5rem;
		border-radius: 0.3rem;
		font-size: 0.75rem;
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
	.dropzone.drag-over { border-color: #ff3333; background: rgba(255,34,34,0.06); }
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
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.5rem;
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.5rem;
	}
	.file-preview-item img { width: 56px; height: 42px; object-fit: cover; border-radius: 0.3rem; flex-shrink: 0; }
	.file-preview-icon {
		width: 56px; height: 42px;
		display: flex; align-items: center; justify-content: center;
		background: rgba(255,255,255,0.06); border-radius: 0.3rem;
		color: rgba(255,255,255,0.4); font-size: 1.2rem; flex-shrink: 0;
	}
	.file-preview-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
	.file-name { font-size: 0.82rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.file-size { font-size: 0.72rem; color: rgba(255,255,255,0.35); }
	.position-badge {
		font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.5rem;
		background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
		border-radius: 0.3rem; flex-shrink: 0;
	}
	.remove-file {
		background: transparent; border: none; color: rgba(255,255,255,0.3);
		cursor: pointer; padding: 0.25rem 0.4rem; border-radius: 0.25rem;
		font-size: 0.85rem; flex-shrink: 0;
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
		color: #ff4444; background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3); padding: 0.75rem 1rem; border-radius: 0.5rem;
	}

	/* Regen thumbnail section */
	.regen-section {
		display: flex; flex-direction: column; gap: 0.75rem;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 0.6rem;
		padding: 1rem;
		max-width: 640px;
	}
	.section-heading {
		font-size: 0.82rem; font-weight: 600;
		color: rgba(255,255,255,0.45);
		text-transform: uppercase; letter-spacing: 0.06em;
		margin: 0; display: flex; align-items: center; gap: 0.4rem;
	}
	.thumb-preview-img {
		max-width: 240px; max-height: 160px; object-fit: cover;
		border-radius: 0.4rem; border: 1px solid rgba(255,255,255,0.1);
	}
	.regen-hint { font-size: 0.8rem; color: rgba(255,255,255,0.3); margin: 0; }
	/* Scrubber */
	.scrubber-wrap {
		display: flex; flex-direction: column; gap: 0.5rem;
	}
	.scrubber-hint { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
	.scrub-video {
		width: 100%; max-height: 280px; object-fit: contain;
		border-radius: 0.4rem; background: #000;
		border: 1px solid rgba(255,255,255,0.1);
		display: block;
	}
	.scrub-slider {
		width: 100%; accent-color: #ff0000; cursor: pointer; height: 4px;
	}
	.scrub-time {
		font-size: 0.75rem; color: rgba(255,255,255,0.4); font-variant-numeric: tabular-nums;
	}
	.regen-form { display: flex; align-items: center; gap: 0.75rem; }
	.regen-success { font-size: 0.82rem; color: #4caf50; margin: 0; }
</style>
