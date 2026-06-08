<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	let { data } = $props();

	const statusColors: Record<string, string> = {
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		under_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		clarification_needed: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		accepted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	const statusLabels: Record<string, string> = {
		submitted: 'Submitted',
		under_review: 'Under Review',
		clarification_needed: 'Clarification Needed',
		accepted: 'Accepted',
		rejected: 'Rejected'
	};

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	let isUploading = $state(false);
	let uploadError = $state('');

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files?.length) return;

		isUploading = true;
		uploadError = '';

		const formData = new FormData();
		for (const file of input.files) {
			formData.append('files', file);
		}

		try {
			const res = await secureFetch(`/api/rm/submissions/${data.submission.submission_id}/documents`, {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			if (!result.success) {
				uploadError = result.error || 'Upload failed';
			} else {
				await invalidateAll();
			}
		} catch {
			uploadError = 'Network error';
		} finally {
			isUploading = false;
			input.value = '';
		}
	}
</script>

<svelte:head>
	<title>RM: Submission Detail | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a
			href="/dashboard/rm/submissions"
			class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
			>Back to Submissions</a
		>
		<div class="mt-2 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-[var(--dash-text)]">{data.submission.lender_name}</h1>
				<p class="mt-1 text-sm text-[var(--dash-text-muted)]">{data.submission.submission_id}</p>
			</div>
			<span
				class="inline-flex rounded-full px-3 py-1 text-sm font-medium {statusColors[
					data.submission.status
				] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
			>
				{statusLabels[data.submission.status] || data.submission.status}
			</span>
		</div>
	</div>

	<!-- Submission Details -->
	<div class="card-surface rounded-xl p-6">
		<h2 class="text-sm font-semibold text-[var(--dash-text)]">Details</h2>
		<div class="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
			<div>
				<p class="text-[var(--dash-text-muted)]">Urgency</p>
				<p class="mt-0.5 font-medium text-[var(--dash-text)] capitalize">
					{data.submission.urgency}
				</p>
			</div>
			{#if data.submission.product_type}
				<div>
					<p class="text-[var(--dash-text-muted)]">Product</p>
					<p class="mt-0.5 font-medium text-[var(--dash-text)]">{data.submission.product_type}</p>
				</div>
			{/if}
			<div>
				<p class="text-[var(--dash-text-muted)]">Submitted</p>
				<p class="mt-0.5 font-medium text-[var(--dash-text)]">
					{formatDate(data.submission.created_at)}
				</p>
			</div>
			<div>
				<p class="text-[var(--dash-text-muted)]">Last Updated</p>
				<p class="mt-0.5 font-medium text-[var(--dash-text)]">
					{formatDate(data.submission.updated_at)}
				</p>
			</div>
		</div>
		<div class="mt-4 border-t border-[var(--dash-border-light)] pt-4">
			<p class="text-sm text-[var(--dash-text-muted)]">Description</p>
			<p class="mt-1 text-sm whitespace-pre-wrap text-[var(--dash-text)]">
				{data.submission.description}
			</p>
		</div>
	</div>

	<!-- Documents -->
	<div class="card-surface rounded-xl p-6">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold text-[var(--dash-text)]">
				Evidence Documents ({data.documents.length})
			</h2>
			{#if ['submitted', 'clarification_needed'].includes(data.submission.status)}
				<label
					class="cursor-pointer rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-1.5 text-xs font-medium text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					{isUploading ? 'Uploading...' : 'Upload Files'}
					<input
						type="file"
						multiple
						accept=".pdf,.jpg,.jpeg,.png,.webp"
						onchange={handleFileUpload}
						class="hidden"
					/>
				</label>
			{/if}
		</div>
		{#if uploadError}
			<p class="mt-2 text-xs text-[var(--dash-contrast-text)]">{uploadError}</p>
		{/if}
		{#if data.documents.length === 0}
			<p class="mt-3 text-sm text-[var(--dash-text-muted)]">No documents uploaded yet</p>
		{:else}
			<div class="mt-3 space-y-2">
				{#each data.documents as doc}
					<div
						class="flex items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-3 py-2.5"
					>
						<div class="flex items-center gap-3">
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{doc.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}</span
							>
							<span class="text-sm text-[var(--dash-text)]">{doc.original_name}</span>
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{(doc.size_bytes / 1024).toFixed(0)} KB</span
							>
						</div>
						<a
							href={doc.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs font-medium text-[var(--dash-accent-text)] hover:text-[var(--dash-accent-text)]"
						>
							View
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Comments -->
	{#if data.comments.length > 0}
		<div class="card-surface rounded-xl p-6">
			<h2 class="text-sm font-semibold text-[var(--dash-text)]">
				Comments ({data.comments.length})
			</h2>
			<div class="mt-3 space-y-3">
				{#each data.comments as comment}
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-[var(--dash-text)]">{comment.author_name}</span>
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{formatDate(comment.created_at)}</span
							>
						</div>
						<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">{comment.text}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
