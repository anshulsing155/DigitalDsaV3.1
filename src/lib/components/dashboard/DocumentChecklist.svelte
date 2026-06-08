<script lang="ts">
	import DocumentUpload from '$lib/components/dashboard/DocumentUpload.svelte';

	let {
		caseId,
		lenderAppId,
		documents,
		onRefresh
	}: {
		caseId: string;
		lenderAppId: string;
		documents: any[];
		onRefresh?: () => void;
	} = $props();

	// ── State ───────────────────────────────────────────────────
	let expandedDocId = $state<string | null>(null);

	// ── Status display config ───────────────────────────────────
	const STATUS_CONFIG: Record<string, { label: string; colorClass: string }> = {
		not_started: { label: 'Not Started', colorClass: 'status--not-started' },
		requested: { label: 'Requested', colorClass: 'status--requested' },
		received: { label: 'Received', colorClass: 'status--received' },
		uploaded: { label: 'Uploaded', colorClass: 'status--uploaded' },
		not_applicable: { label: 'N/A', colorClass: 'status--na' }
	};

	// ── Category display config ─────────────────────────────────
	const CATEGORY_CONFIG: Record<string, { label: string; colorClass: string }> = {
		identity: { label: 'Identity', colorClass: 'cat--identity' },
		income: { label: 'Income', colorClass: 'cat--income' },
		property: { label: 'Property', colorClass: 'cat--property' },
		lender_specific: { label: 'Lender Specific', colorClass: 'cat--lender' },
		other: { label: 'Other', colorClass: 'cat--other' }
	};

	// ── Computed ────────────────────────────────────────────────
	const totalDocs = $derived(documents.length);
	const completedDocs = $derived(
		documents.filter(
			(d) => d.status === 'uploaded' || d.status === 'received' || d.status === 'not_applicable'
		).length
	);
	const mandatoryDocs = $derived(documents.filter((d) => d.is_mandatory));
	const mandatoryCompleted = $derived(
		mandatoryDocs.filter(
			(d: any) =>
				d.status === 'uploaded' || d.status === 'received' || d.status === 'not_applicable'
		).length
	);

	// ── Freshness helper ────────────────────────────────────────
	function getFreshnessInfo(doc: any): { label: string; colorClass: string } | null {
		if (!doc.validity?.valid_until) return null;

		if (doc.is_expired) {
			return { label: 'Expired', colorClass: 'freshness--expired' };
		}
		if (doc.is_expiring_soon) {
			const days = doc.days_until_expiry ?? 0;
			return {
				label: `Expires in ${days}d`,
				colorClass: 'freshness--expiring'
			};
		}
		return { label: 'Fresh', colorClass: 'freshness--fresh' };
	}

	// ── Toggle expand ───────────────────────────────────────────
	function toggleExpand(docId: string) {
		expandedDocId = expandedDocId === docId ? null : docId;
	}

	// ── Upload complete handler ─────────────────────────────────
	function handleUploadComplete(docId: string, upload: any) {
		// Update the local document data to reflect the upload immediately
		const doc = documents.find((d) => d.doc_id === docId);
		if (doc) {
			doc.upload = upload;
			doc.status = 'uploaded';
		}
		// Also trigger parent refresh so data is reloaded from server
		if (onRefresh) {
			onRefresh();
		}
	}
</script>

<div class="doc-checklist">
	<!-- ── Summary bar ── -->
	<div class="doc-checklist__summary">
		<div class="doc-checklist__summary-left">
			<span class="doc-checklist__summary-label">Documents</span>
			<span class="doc-checklist__summary-count">{completedDocs}/{totalDocs} ready</span>
		</div>
		{#if mandatoryDocs.length > 0}
			<span class="doc-checklist__mandatory-count">
				{mandatoryCompleted}/{mandatoryDocs.length} mandatory
			</span>
		{/if}
	</div>

	<!-- ── Progress bar ── -->
	{#if totalDocs > 0}
		{@const percent = Math.round((completedDocs / totalDocs) * 100)}
		<div class="doc-checklist__progress-track">
			<div
				class="doc-checklist__progress-bar"
				class:doc-checklist__progress-bar--complete={percent === 100}
				class:doc-checklist__progress-bar--mid={percent >= 50 && percent < 100}
				class:doc-checklist__progress-bar--low={percent < 50}
				style="width: {percent}%"
			></div>
		</div>
	{/if}

	<!-- ── Document list ── -->
	{#if documents.length === 0}
		<div class="doc-checklist__empty">
			<p class="doc-checklist__empty-text">No documents in checklist</p>
		</div>
	{:else}
		<div class="doc-checklist__list">
			{#each documents as doc (doc.doc_id)}
				{@const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.not_started}
				{@const catCfg = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.other}
				{@const freshness = getFreshnessInfo(doc)}
				{@const isExpanded = expandedDocId === doc.doc_id}
				{@const isNA = doc.status === 'not_applicable'}

				<div class="doc-item" class:doc-item--na={isNA}>
					<!-- ── Row header (always visible) ── -->
					<button type="button" class="doc-item__header" onclick={() => toggleExpand(doc.doc_id)}>
						<div class="doc-item__left">
							<span class="doc-item__name" class:doc-item__name--na={isNA}>
								{doc.doc_name}
							</span>
							{#if doc.is_mandatory}
								<span class="doc-item__mandatory">*</span>
							{/if}
						</div>
						<div class="doc-item__right">
							<span class="doc-item__category {catCfg.colorClass}">{catCfg.label}</span>
							{#if freshness}
								<span class="doc-item__freshness {freshness.colorClass}">
									{freshness.label}
								</span>
							{/if}
							<span class="doc-item__status {statusCfg.colorClass}">
								{statusCfg.label}
							</span>
							<svg
								class="doc-item__chevron"
								class:doc-item__chevron--open={isExpanded}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 8.25l-7.5 7.5-7.5-7.5"
								/>
							</svg>
						</div>
					</button>

					<!-- ── Expanded details ── -->
					{#if isExpanded}
						<div class="doc-item__details">
							<!-- Description -->
							{#if doc.description}
								<p class="doc-item__description">{doc.description}</p>
							{/if}

							<!-- Validity dates -->
							{#if doc.validity}
								<div class="doc-item__validity">
									{#if doc.validity.valid_from}
										<span class="doc-item__validity-item">
											Valid from: {new Date(doc.validity.valid_from).toLocaleDateString('en-IN', {
												day: 'numeric',
												month: 'short',
												year: 'numeric'
											})}
										</span>
									{/if}
									{#if doc.validity.valid_until}
										<span class="doc-item__validity-item">
											Valid until: {new Date(doc.validity.valid_until).toLocaleDateString('en-IN', {
												day: 'numeric',
												month: 'short',
												year: 'numeric'
											})}
										</span>
									{/if}
									{#if doc.validity.freshness_rule_days > 0}
										<span class="doc-item__validity-item">
											Freshness: {doc.validity.freshness_rule_days} days
										</span>
									{/if}
								</div>
							{/if}

							<!-- DSA notes -->
							{#if doc.dsa_notes}
								<div class="doc-item__notes">
									<span class="doc-item__notes-label">Notes:</span>
									{doc.dsa_notes}
								</div>
							{/if}

							<!-- Upload area -->
							{#if !isNA}
								<div class="doc-item__upload-area">
									<DocumentUpload
										{caseId}
										{lenderAppId}
										docId={doc.doc_id}
										docName={doc.doc_name}
										currentUpload={doc.upload}
										onUploadComplete={(upload) => handleUploadComplete(doc.doc_id, upload)}
									/>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* ── Container ── */
	.doc-checklist {
		width: 100%;
	}

	/* ── Summary bar ── */
	.doc-checklist__summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.doc-checklist__summary-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.doc-checklist__summary-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text);
	}

	.doc-checklist__summary-count {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--ddsa-gray-500, #6b7280);
	}

	.doc-checklist__mandatory-count {
		font-size: 0.625rem;
		font-weight: 500;
		color: var(--ddsa-gray-400, #9ca3af);
	}

	/* ── Progress bar ── */
	.doc-checklist__progress-track {
		height: 0.375rem;
		width: 100%;
		border-radius: 9999px;
		background: var(--ddsa-gray-100, #f3f4f6);
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.doc-checklist__progress-bar {
		height: 100%;
		border-radius: 9999px;
		transition: width 0.5s ease-out;
	}

	.doc-checklist__progress-bar--complete {
		background: #10b981;
	}

	.doc-checklist__progress-bar--mid {
		background: #3b82f6;
	}

	.doc-checklist__progress-bar--low {
		background: #cb997e;
	}

	/* ── Empty state ── */
	.doc-checklist__empty {
		padding: 1.5rem;
		text-align: center;
	}

	.doc-checklist__empty-text {
		font-size: 0.75rem;
		color: var(--ddsa-gray-400, #9ca3af);
	}

	/* ── Document list ── */
	.doc-checklist__list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	/* ── Document item ── */
	.doc-item {
		border: 1px solid var(--ddsa-gray-100, #f3f4f6);
		border-radius: 0.5rem;
		background: var(--dash-bg-card);
		overflow: hidden;
		transition: border-color 0.15s ease;
	}

	.doc-item:hover {
		border-color: var(--ddsa-gray-200, #e5e7eb);
	}

	.doc-item--na {
		opacity: 0.6;
	}

	/* ── Header row ── */
	.doc-item__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		gap: 0.5rem;
	}

	.doc-item__header:hover {
		background: var(--ddsa-gray-50, #f9fafb);
	}

	.doc-item__left {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
		flex: 1;
	}

	.doc-item__name {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--dash-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.doc-item__name--na {
		text-decoration: line-through;
		color: var(--ddsa-gray-400, #9ca3af);
	}

	.doc-item__mandatory {
		color: #ef4444;
		font-weight: 700;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.doc-item__right {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	/* ── Category badge ── */
	.doc-item__category {
		display: inline-block;
		padding: 0.0625rem 0.375rem;
		border-radius: 9999px;
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.cat--identity {
		background: #dbeafe;
		color: #1d4ed8;
	}
	.cat--income {
		background: #d1fae5;
		color: #047857;
	}
	.cat--property {
		background: #ebd7cc;
		color: #8e5739;
	}
	.cat--lender {
		background: #e0e7ff;
		color: #4338ca;
	}
	.cat--other {
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
	}

	/* ── Freshness indicator ── */
	.doc-item__freshness {
		display: inline-block;
		padding: 0.0625rem 0.375rem;
		border-radius: 9999px;
		font-size: 0.5625rem;
		font-weight: 600;
	}

	.freshness--fresh {
		background: #d1fae5;
		color: #047857;
	}
	.freshness--expiring {
		background: #ebd7cc;
		color: #8e5739;
	}
	.freshness--expired {
		background: #fee2e2;
		color: #dc2626;
	}

	/* ── Status badge ── */
	.doc-item__status {
		display: inline-block;
		padding: 0.0625rem 0.375rem;
		border-radius: 9999px;
		font-size: 0.5625rem;
		font-weight: 600;
	}

	.status--not-started {
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
	}
	.status--requested {
		background: #ebd7cc;
		color: #8e5739;
	}
	.status--received {
		background: #dbeafe;
		color: #1d4ed8;
	}
	.status--uploaded {
		background: #d1fae5;
		color: #047857;
	}
	.status--na {
		background: var(--dash-bg-alt);
		color: var(--dash-text-muted);
	}

	/* ── Chevron ── */
	.doc-item__chevron {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--ddsa-gray-400, #9ca3af);
		transition: transform 0.15s ease;
		flex-shrink: 0;
	}

	.doc-item__chevron--open {
		transform: rotate(180deg);
	}

	/* ── Details panel ── */
	.doc-item__details {
		padding: 0.5rem 0.75rem 0.75rem;
		border-top: 1px solid var(--ddsa-gray-100, #f3f4f6);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.doc-item__description {
		font-size: 0.6875rem;
		color: var(--ddsa-gray-500, #6b7280);
		line-height: 1.4;
	}

	.doc-item__validity {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.doc-item__validity-item {
		font-size: 0.625rem;
		color: var(--ddsa-gray-500, #6b7280);
		background: var(--ddsa-gray-50, #f9fafb);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.doc-item__notes {
		font-size: 0.6875rem;
		color: var(--ddsa-gray-500, #6b7280);
		font-style: italic;
	}

	.doc-item__notes-label {
		font-weight: 600;
		font-style: normal;
		color: var(--ddsa-gray-600, #4b5563);
	}

	.doc-item__upload-area {
		margin-top: 0.25rem;
	}

	/* ── Mobile adjustments ── */
	@media (max-width: 640px) {
		.doc-item__right {
			flex-wrap: wrap;
			justify-content: flex-end;
		}

		.doc-item__category {
			display: none;
		}
	}
</style>
