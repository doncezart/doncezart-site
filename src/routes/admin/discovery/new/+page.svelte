<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let mediaType = $state('image');
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let hiddenInput = $state(null);

	function syncHidden(files) {
		if (!hiddenInput) return;
		const dt = new DataTransfer();
		files.forEach(f => dt.items.add(f));
		hiddenInput.files = dt.files;
	}

	function handleCarouselChange(e) {
		const files = Array.from(e.target.files || []);
		selectedFiles = [...selectedFiles, ...files];
		syncHidden(selectedFiles);
	}

	function removeFile(i) {
		selectedFiles = selectedFiles.filter((_, idx) => idx !== i);
		syncHidden(selectedFiles);
	}
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

	{#if mediaType === 'image'}
		<label>
			Image *
			<input type="file" name="image" accept="image/*" required />
		</label>
	{:else if mediaType === 'carousel'}
		<label>
			Images * (at least 2)
			<input type="file" accept="image/*" multiple onchange={handleCarouselChange} />
			<input type="file" name="images" multiple bind:this={hiddenInput} style="display:none" />
		</label>
		{#if selectedFiles.length > 0}
			<div class="file-preview">
				{#each selectedFiles as f, i}
					<div class="file-chip">
						<span>{f.name}</span>
						<button type="button" onclick={() => removeFile(i)} aria-label="Remove">×</button>
					</div>
				{/each}
			</div>
		{/if}
	{:else if mediaType === 'video'}
		<label>
			Video * (mp4, webm, mov — max 200 MB)
			<input type="file" name="video" accept="video/mp4,video/webm,video/quicktime" required />
		</label>
	{:else if mediaType === 'youtube'}
		<label>
			YouTube URL or Video ID *
			<input type="text" name="youtube_url" placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ" required />
		</label>
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
			{uploading ? 'Uploading…' : 'Create Item'}
		</button>
	</div>
</form>

<style>
	.page-header { margin-bottom: 1.5rem; }
	.item-form { display: flex; flex-direction: column; gap: 1.25rem; max-width: 700px; }
	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
	}
	input[type="text"], input[type="url"], textarea, select {
		padding: 0.6rem 0.8rem;
		background: rgba(255,255,255,0.07);
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.95rem;
		font-family: inherit;
	}
	input:focus, textarea:focus, select:focus { outline: none; border-color: #ff0000; }
	textarea { resize: vertical; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); }
	fieldset { border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 1rem; }
	legend { color: rgba(255,255,255,0.7); font-size: 0.9rem; padding: 0 0.4rem; }
	.tag-checks { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
	.tag-check {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: rgba(255,255,255,0.6);
		cursor: pointer;
	}
	.file-preview { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.file-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.6rem;
		background: rgba(255,255,255,0.07);
		border-radius: 0.35rem;
		font-size: 0.8rem;
	}
	.file-chip button { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1rem; }
	.form-actions { display: flex; gap: 0.75rem; padding-top: 0.5rem; }
	.error {
		color: #ff4444;
		background: rgba(255,68,68,0.1);
		border: 1px solid rgba(255,68,68,0.3);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
	}
</style>
