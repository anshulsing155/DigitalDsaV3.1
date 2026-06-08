<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf.js';

	let {
		caseId,
		lenderAppId,
		docId,
		docName,
		currentUpload,
		onUploadComplete
	}: {
		caseId: string;
		lenderAppId: string;
		docId: string;
		docName: string;
		currentUpload?: {
			file_url: string;
			file_id: string;
			file_type: string;
			file_size: number;
			uploaded_at: string | Date;
		};
		onUploadComplete?: (upload: any) => void;
	} = $props();

	const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
	const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.webp';
	const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

	let uploading = $state(false);
	let error = $state('');
	let dragOver = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getFileTypeLabel(mimeType: string): string {
		const map: Record<string, string> = {
			'application/pdf': 'PDF',
			'image/jpeg': 'JPEG',
			'image/png': 'PNG',
			'image/webp': 'WebP'
		};
		return map[mimeType] || mimeType;
	}

	function formatDate(d: string | Date): string {
		const date = new Date(d);
		return date.toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function validateFile(file: File): string | null {
		if (!ALLOWED_TYPES.includes(file.type)) {
			return `Invalid file type "${file.type}". Allowed: PDF, JPEG, PNG, WebP.`;
		}
		if (file.size > MAX_SIZE) {
			return `File too large (${formatFileSize(file.size)}). Maximum: 10 MB.`;
		}
		return null;
	}

	async function handleUpload(file: File) {
		const validationError = validateFile(file);
		if (validationError) {
			error = validationError;
			return;
		}

		error = '';
		uploading = true;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const res = await secureFetch(
				`/api/cases/${caseId}/lender-applications/${lenderAppId}/documents/${docId}/upload`,
				{
					method: 'POST',
					body: formData
				}
			);

			const result = await res.json();

			if (result.success) {
				if (onUploadComplete) {
					onUploadComplete(result.data.upload);
				}
			} else {
				error = result.error || 'Upload failed. Please try again.';
			}
		} catch {
			error = 'Network error. Please check your connection and try again.';
		} finally {
			uploading = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleUpload(files[0]);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			handleUpload(files[0]);
		}
		// Reset input so the same file can be re-selected
		input.value = '';
	}

	function openFilePicker() {
		fileInput?.click();
	}
</script>

<div class="doc-upload">
	{#if currentUpload}
		<!-- ── Currently uploaded file ── -->
		<div class="doc-upload__current">
			<div class="doc-upload__file-info">
				<span class="doc-upload__type-badge">{getFileTypeLabel(currentUpload.file_type)}</span>
				<span class="doc-upload__size">{formatFileSize(currentUpload.file_size)}</span>
				<span class="doc-upload__date">{formatDate(currentUpload.uploaded_at)}</span>
			</div>
			<div class="doc-upload__actions">
				<a
					href={currentUpload.file_url}
					target="_blank"
					rel="noopener noreferrer"
					class="doc-upload__view-btn"
				>
					View
				</a>
				<button
					type="button"
					onclick={openFilePicker}
					disabled={uploading}
					class="doc-upload__replace-btn"
				>
					{uploading ? 'Uploading...' : 'Replace'}
				</button>
			</div>
		</div>
	{:else}
		<!-- ── Drop zone ── -->
		<button
			type="button"
			class="doc-upload__dropzone"
			class:doc-upload__dropzone--active={dragOver}
			class:doc-upload__dropzone--uploading={uploading}
			ondrop={handleDrop}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			onclick={openFilePicker}
		>
			{#if uploading}
				<div class="doc-upload__spinner"></div>
				<span class="doc-upload__label">Uploading...</span>
			{:else}
				<svg
					class="doc-upload__icon"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
					/>
				</svg>
				<span class="doc-upload__label">
					{dragOver ? 'Drop file here' : 'Click or drag file'}
				</span>
				<span class="doc-upload__hint">PDF, JPEG, PNG, WebP (max 10 MB)</span>
			{/if}
		</button>
	{/if}

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		accept={ALLOWED_EXTENSIONS}
		onchange={handleFileSelect}
		class="doc-upload__hidden-input"
	/>

	<!-- Error display -->
	{#if error}
		<div class="doc-upload__error">
			{error}
		</div>
	{/if}
</div>

<style>
	.doc-upload {
		width: 100%;
	}

	/* ── Drop zone ── */
	.doc-upload__dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border: 2px dashed var(--ddsa-gray-300, #d1d5db);
		border-radius: 0.5rem;
		background: var(--ddsa-gray-50, #f9fafb);
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 5rem;
		width: 100%;
		font: inherit;
		color: inherit;
		text-align: center;
	}

	.doc-upload__dropzone:hover {
		border-color: var(--ddsa-accent-400, #60a5fa);
		background: var(--ddsa-primary-50, #eff6ff);
	}

	.doc-upload__dropzone--active {
		border-color: var(--ddsa-accent-500, #3b82f6);
		background: var(--ddsa-primary-100, #dbeafe);
		border-style: solid;
	}

	.doc-upload__dropzone--uploading {
		pointer-events: none;
		opacity: 0.7;
	}

	.doc-upload__icon {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--ddsa-gray-400, #9ca3af);
	}

	.doc-upload__label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--ddsa-secondary-700, #374151);
	}

	.doc-upload__hint {
		font-size: 0.625rem;
		color: var(--ddsa-gray-400, #9ca3af);
	}

	/* ── Spinner ── */
	.doc-upload__spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--ddsa-gray-200, #e5e7eb);
		border-top-color: var(--ddsa-accent-500, #3b82f6);
		border-radius: 50%;
		animation: doc-spin 0.6s linear infinite;
	}

	@keyframes doc-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Current upload display ── */
	.doc-upload__current {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--ddsa-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		background: var(--dash-bg-card);
	}

	.doc-upload__file-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex-wrap: wrap;
	}

	.doc-upload__type-badge {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		background: var(--ddsa-primary-100, #dbeafe);
		color: var(--ddsa-accent-600, #2563eb);
	}

	.doc-upload__size {
		font-size: 0.6875rem;
		color: var(--ddsa-gray-500, #6b7280);
	}

	.doc-upload__date {
		font-size: 0.6875rem;
		color: var(--ddsa-gray-400, #9ca3af);
	}

	.doc-upload__actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.doc-upload__view-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--ddsa-gray-200, #e5e7eb);
		border-radius: 0.375rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--ddsa-secondary-700, #374151);
		background: var(--dash-bg-card);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.doc-upload__view-btn:hover {
		border-color: var(--ddsa-accent-500, #3b82f6);
		color: var(--ddsa-accent-500, #3b82f6);
	}

	.doc-upload__replace-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--ddsa-gray-200, #e5e7eb);
		border-radius: 0.375rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--ddsa-gray-500, #6b7280);
		background: var(--dash-bg-card);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.doc-upload__replace-btn:hover {
		border-color: var(--ddsa-accent-400, #60a5fa);
		background: var(--ddsa-primary-50, #eff6ff);
		color: var(--ddsa-accent-500, #3b82f6);
	}

	.doc-upload__replace-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ── Hidden input ── */
	.doc-upload__hidden-input {
		display: none;
	}

	/* ── Error ── */
	.doc-upload__error {
		margin-top: 0.375rem;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: #dc2626;
		background: #fef2f2;
	}
</style>
