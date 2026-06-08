<script lang="ts">
	/**
	 * DocumentUploadSection — Contextual document upload
	 * ═══════════════════════════════════════════════════════════════════
	 * Displays relevant document upload slots based on the applicant's
	 * selected income profiles and obligation status.
	 *
	 * Features:
	 *   - Auto-detects relevant docs from selected income profiles
	 *   - Groups by category (Income Proof, Tax Returns, etc.)
	 *   - Each upload is individually skippable
	 *   - Multi-file support per document type
	 *   - File type validation
	 *   - Upload progress tracking
	 *   - Mobile-friendly card layout
	 *
	 * All uploads are OPTIONAL. Applicant can skip any or all.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import {
		getDocumentsForProfiles,
		groupDocumentsByCategory,
		OBLIGATION_DOCUMENTS,
		type DocumentSpec
	} from '$lib/config/incomeProfiles/documentConfig';
	import type { IncomeProfileType } from '$lib/types/incomeProfile';
	import { deviceState } from '$lib/stores/device.svelte';
	import { AlertCircle, Check, X, Plus, Info } from '$lib/utils/iconRegistry';
	import { secureFetch } from '$lib/utils/csrf';

	interface UploadedFile {
		id: string;
		docId: string;
		name: string;
		size: number;
		type: string;
		status: 'uploading' | 'uploaded' | 'error';
		url?: string;
		error?: string;
	}

	interface Props {
		/** Selected income profile types (determines which docs to show) */
		selectedProfiles: IncomeProfileType[];
		/** Whether applicant has running obligations (shows obligation docs) */
		hasObligations: boolean;
		/** Uploaded files (bindable) */
		uploadedFiles?: UploadedFile[];
		/** Upload endpoint URL */
		uploadUrl?: string;
		/** Share link token (for authentication) */
		token?: string;
		/** Applicant mobile number (for OTP verification) */
		mobileNumber?: string;
		/** Whether section is disabled */
		disabled?: boolean;
		/** Callback when files change */
		onFilesChange?: (files: UploadedFile[]) => void;
	}

	let {
		selectedProfiles,
		hasObligations = false,
		uploadedFiles = $bindable([]),
		uploadUrl = '/api/upload',
		token = '',
		mobileNumber = '',
		disabled = false,
		onFilesChange
	}: Props = $props();

	// ── Derive relevant documents based on profiles ──────────────
	let allDocuments = $derived.by(() => {
		const profileDocs = getDocumentsForProfiles(selectedProfiles);
		const obligationDocs = hasObligations ? OBLIGATION_DOCUMENTS : [];
		return [...profileDocs, ...obligationDocs];
	});

	let groupedDocuments = $derived(groupDocumentsByCategory(allDocuments));
	let categoryNames = $derived(Object.keys(groupedDocuments));

	// ── Track which documents have been skipped ──────────────────
	let skippedDocs = $state<Set<string>>(new Set());

	// ── File counts per document type ────────────────────────────
	function getFilesForDoc(docId: string): UploadedFile[] {
		return uploadedFiles.filter((f) => f.docId === docId);
	}

	function isDocComplete(docId: string): boolean {
		return getFilesForDoc(docId).some((f) => f.status === 'uploaded');
	}

	function isDocSkipped(docId: string): boolean {
		return skippedDocs.has(docId);
	}

	// ── Summary stats ────────────────────────────────────────────
	let uploadStats = $derived.by(() => {
		const total = allDocuments.length;
		const uploaded = allDocuments.filter((d) => isDocComplete(d.id)).length;
		const skipped = skippedDocs.size;
		const pending = total - uploaded - skipped;
		return { total, uploaded, skipped, pending };
	});

	// ── Handle file selection ────────────────────────────────────
	async function handleFileSelect(docId: string, event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		const doc = allDocuments.find((d) => d.id === docId);
		if (!doc) return;

		const currentFiles = getFilesForDoc(docId);
		const remaining = doc.maxFiles - currentFiles.length;

		for (let i = 0; i < Math.min(files.length, remaining); i++) {
			const file = files[i];

			// Validate file type
			if (doc.acceptedTypes.length > 0 && !doc.acceptedTypes.includes(file.type)) {
				// Allow common image types regardless
				if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
					continue;
				}
			}

			// Validate file size (10MB max)
			if (file.size > 10 * 1024 * 1024) {
				continue;
			}

			const uploadFile: UploadedFile = {
				id: `${docId}_${Date.now()}_${i}`,
				docId,
				name: file.name,
				size: file.size,
				type: file.type,
				status: 'uploading'
			};

			uploadedFiles = [...uploadedFiles, uploadFile];

			// Upload the file
			try {
				const formData = new FormData();
				formData.append('file', file);
				formData.append('docId', docId);
				if (token) formData.append('token', token);
				if (mobileNumber) formData.append('mobileNumber', mobileNumber);

				const res = await secureFetch(uploadUrl, {
					method: 'POST',
					body: formData
				});

				if (res.ok) {
					const result = await res.json();
					uploadedFiles = uploadedFiles.map((f) =>
						f.id === uploadFile.id
							? { ...f, status: 'uploaded' as const, url: result.url || result.path }
							: f
					);
				} else {
					uploadedFiles = uploadedFiles.map((f) =>
						f.id === uploadFile.id ? { ...f, status: 'error' as const, error: 'Upload failed' } : f
					);
				}
			} catch {
				uploadedFiles = uploadedFiles.map((f) =>
					f.id === uploadFile.id ? { ...f, status: 'error' as const, error: 'Network error' } : f
				);
			}
		}

		// Remove skipped status if files uploaded
		skippedDocs.delete(docId);
		skippedDocs = new Set(skippedDocs);

		onFilesChange?.(uploadedFiles);

		// Reset input
		input.value = '';
	}

	// ── Remove file ──────────────────────────────────────────────
	function removeFile(fileId: string) {
		uploadedFiles = uploadedFiles.filter((f) => f.id !== fileId);
		onFilesChange?.(uploadedFiles);
	}

	// ── Skip document ────────────────────────────────────────────
	function skipDoc(docId: string) {
		skippedDocs.add(docId);
		skippedDocs = new Set(skippedDocs);
	}

	// ── Unskip document ──────────────────────────────────────────
	function unskipDoc(docId: string) {
		skippedDocs.delete(docId);
		skippedDocs = new Set(skippedDocs);
	}

	// ── Format file size ─────────────────────────────────────────
	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

{#if allDocuments.length > 0}
	<div class="flex flex-col gap-6">
		<!-- Section Header -->
		<div class="flex items-start justify-between gap-3">
			<div>
				<h3 class="text-sectionHeadingText font-semibold text-[var(--form-text)]">
					Supporting Documents
				</h3>
				<p class="mt-1.5 text-xs leading-relaxed text-[var(--form-text-muted)]">
					Upload relevant documents to support your application. All uploads are <strong
						>optional</strong
					> — you can skip any document.
				</p>
			</div>

			<!-- Summary Badge -->
			<div class="flex shrink-0 items-center gap-2 text-xs">
				{#if uploadStats.uploaded > 0}
					<span class="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700">
						{uploadStats.uploaded} uploaded
					</span>
				{/if}
				{#if uploadStats.skipped > 0}
					<span
						class="rounded-full bg-[var(--form-bg-alt)] px-2.5 py-1 font-medium text-[var(--form-text-muted)]"
					>
						{uploadStats.skipped} skipped
					</span>
				{/if}
			</div>
		</div>

		<!-- Info Banner -->
		<div
			class="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/40 dark:bg-blue-900/20"
		>
			<Info class="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
			<p class="text-xs leading-relaxed text-blue-700">
				Documents based on your selected income sources are shown below. PDF, JPEG, PNG accepted.
				Max 10MB per file. You can skip any document you don't have right now.
			</p>
		</div>

		<!-- Document Groups -->
		{#each categoryNames as category}
			{@const docs = groupedDocuments[category]}
			<div class="flex flex-col gap-3">
				<!-- Category Header -->
				<h4 class="flex items-center gap-2 text-sm font-semibold text-[var(--form-text-secondary)]">
					<span class="h-1.5 w-1.5 rounded-full bg-[var(--trial-accent)]"></span>
					{category}
				</h4>

				<!-- Document Cards -->
				<div class="flex flex-col gap-2.5">
					{#each docs as doc}
						{@const files = getFilesForDoc(doc.id)}
						{@const complete = isDocComplete(doc.id)}
						{@const skipped = isDocSkipped(doc.id)}

						<div
							class="overflow-hidden rounded-xl border transition-all duration-200
								{complete
								? 'border-green-300 bg-green-50/30'
								: skipped
									? 'border-[var(--form-border)] bg-[var(--form-bg-alt)]/50 opacity-60'
									: 'border-[var(--form-border)] bg-[var(--form-bg-card)] hover:border-[var(--form-border)]'}"
						>
							<!-- Doc Header -->
							<div
								class="flex items-start justify-between gap-3 p-3 {deviceState.isMobile
									? ''
									: 'px-4'}"
							>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										{#if complete}
											<Check class="h-4 w-4 shrink-0 text-green-600" />
										{/if}
										<span
											class="text-sm font-medium text-[var(--form-text)] {complete
												? 'text-green-800 dark:text-green-400'
												: ''}"
										>
											{doc.label}
										</span>
									</div>
									<p
										class="mt-0.5 text-xs text-[var(--form-text-muted)] {deviceState.isMobile
											? ''
											: 'ml-6'}"
									>
										{doc.description}
									</p>
								</div>

								<!-- Actions -->
								<div class="flex shrink-0 items-center gap-1.5">
									{#if !skipped && !disabled}
										{#if files.length < doc.maxFiles}
											<label
												class="flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--trial-accent)]/10 px-3
													py-1.5 text-xs font-medium text-[var(--trial-accent-300)] transition-colors hover:bg-[var(--trial-accent)]/20"
											>
												<Plus class="h-3.5 w-3.5" />
												Upload
												<input
													type="file"
													accept={doc.acceptedTypes.join(',')}
													multiple={doc.maxFiles > 1}
													onchange={(e) => handleFileSelect(doc.id, e)}
													class="hidden"
												/>
											</label>
										{/if}

										{#if !complete && files.length === 0}
											<button
												onclick={() => skipDoc(doc.id)}
												class="px-2.5 py-1.5 text-xs text-[var(--form-text-muted)] transition-colors hover:text-[var(--form-text-secondary)]"
											>
												Skip
											</button>
										{/if}
									{/if}

									{#if skipped}
										<button
											onclick={() => unskipDoc(doc.id)}
											class="px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
										>
											Undo skip
										</button>
									{/if}
								</div>
							</div>

							<!-- Uploaded Files List -->
							{#if files.length > 0}
								<div
									class="border-t border-[var(--form-border)] px-3 py-2 {deviceState.isMobile
										? ''
										: 'px-4'} flex flex-col gap-1.5"
								>
									{#each files as file}
										<div class="flex items-center justify-between gap-2 py-1">
											<div class="flex min-w-0 items-center gap-2">
												{#if file.status === 'uploading'}
													<div
														class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
													></div>
												{:else if file.status === 'uploaded'}
													<Check class="h-4 w-4 shrink-0 text-green-500" />
												{:else}
													<AlertCircle class="h-4 w-4 shrink-0 text-red-500" />
												{/if}
												<span class="truncate text-xs text-[var(--form-text-secondary)]"
													>{file.name}</span
												>
												<span class="shrink-0 text-[10px] text-[var(--form-text-muted)]"
													>{formatSize(file.size)}</span
												>
											</div>

											{#if !disabled}
												<button
													onclick={() => removeFile(file.id)}
													class="shrink-0 p-1 text-[var(--form-text-muted)] transition-colors hover:text-red-500"
												>
													<X class="h-3.5 w-3.5" />
												</button>
											{/if}
										</div>
									{/each}

									<!-- File count -->
									{#if files.length > 0 && files.length < doc.maxFiles}
										<p class="mt-0.5 text-[10px] text-[var(--form-text-muted)]">
											{files.length} of {doc.maxFiles} files uploaded
										</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
