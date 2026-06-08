<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import EligibilityCard from '$lib/components/dashboard/EligibilityCard.svelte';
	import AccuracyRatingForm from '$lib/components/dashboard/AccuracyRatingForm.svelte';
	import { formatCurrency } from '$lib/i18n';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			caseData: {
				case_id: string;
				label: string;
				stage: string;
				stage_label: string;
				loan: {
					type: string;
					amount_required?: number;
					tenure_years?: number;
					purpose?: string;
				};
				lender_applications: Array<{
					lender_application_id: string;
					lender_id: string;
					lender_name: string;
					status: string;
					eligibility_snapshot: {
						traffic_light: 'green' | 'amber' | 'red' | 'grey';
						message: string;
						computed_at: string;
					} | null;
					document_summary: {
						total: number;
						completed: number;
						percent: number;
					};
					open_queries: number;
					total_queries: number;
					queries: Array<{
						query_id: string;
						query_text: string;
						category: string;
						status: string;
						raised_at: string;
						deadline?: string;
						days_open: number;
						response?: {
							text: string;
							responded_at: string;
						};
					}>;
					sanction: {
						amount?: number;
						roi?: number;
						tenure_months?: number;
						sanction_date?: string;
						conditions?: string[];
					} | null;
					created_at: string;
					updated_at: string;
				}>;
				optional_contact: {
					full_name?: string;
					mobile?: string;
					email?: string;
				} | null;
				created_at: string;
				updated_at: string;
				is_sample: boolean;
				dsa_name: string;
			};
			existingRatings: Record<
				string,
				{
					rating: number;
					category: string;
					comment?: string;
					created_at: string;
				}
			>;
			recentTimeline: Array<{
				event_type: string;
				description: string;
				created_at: string;
				metadata: Record<string, any>;
			}>;
			rmBankName: string;
		}
	);

	// ── Stage badge colors ───────────────────────────────────────
	const stageColors: Record<string, string> = {
		intake: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		profiling: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		file_building: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		processing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		query: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		sanctioned: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		disbursed: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		dropped: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		closed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	// ── Status badge colors ──────────────────────────────────────
	const statusColors: Record<string, string> = {
		selected: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		file_building: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		ready: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		processing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		query: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		query_responded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		sanctioned: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		disbursed: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		withdrawn: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	const statusLabels: Record<string, string> = {
		selected: 'Selected',
		file_building: 'File Building',
		ready: 'Ready',
		submitted: 'Submitted',
		processing: 'Processing',
		query: 'Query',
		query_responded: 'Query Responded',
		sanctioned: 'Sanctioned',
		disbursed: 'Disbursed',
		rejected: 'Rejected',
		withdrawn: 'Withdrawn'
	};

	// ── Timeline event type formatting ───────────────────────────
	const eventTypeLabels: Record<string, string> = {
		case_created: 'Case Created',
		case_updated: 'Case Updated',
		stage_changed: 'Stage Changed',
		lender_added: 'Lender Added',
		lender_status_changed: 'Lender Status Changed',
		document_uploaded: 'Document Uploaded',
		document_status_changed: 'Document Status Changed',
		document_expiring: 'Document Expiring',
		query_raised: 'Query Raised',
		query_responded: 'Query Responded',
		query_resolved: 'Query Resolved',
		review_pdf_generated: 'Review PDF Generated',
		submission_pdf_generated: 'Submission PDF Generated',
		message_sent: 'Message Sent',
		note_added: 'Note Added',
		form_updated: 'Form Updated',
		rejection: 'Rejection',
		sanction: 'Sanction',
		disbursement: 'Disbursement'
	};

	const eventTypeIcons: Record<string, string> = {
		case_created: 'M12 4.5v15m7.5-7.5h-15',
		stage_changed: 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3',
		lender_added:
			'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z',
		document_uploaded:
			'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
		query_raised:
			'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
		sanction: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		rejection: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		disbursement:
			'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18v-.008zm-12 0h.008v.008H6v-.008z'
	};

	// ── Format helpers ─────────────────────────────────────────── Cr`;

	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		try {
			return new Date(dateStr).toLocaleDateString('en-IN', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return '';
		}
	}

	function formatTimeAgo(dateStr: string): string {
		if (!dateStr) return '';
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const diff = now - then;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		const months = Math.floor(days / 30);
		if (months < 12) return `${months}mo ago`;
		return `${Math.floor(months / 12)}y ago`;
	}

	// ── Handle rating completion ──────────────────────────────────
	async function handleRated() {
		// Re-run server load so the rating switches to read-only mode.
		await invalidateAll();
	}

	// ── Quick Query state (6.9) ─────────────────────────────────
	const QUERY_CATEGORIES = [
		{ value: 'income_documents', label: 'Income Documents' },
		{ value: 'property_documents', label: 'Property Documents' },
		{ value: 'identity_documents', label: 'Identity Documents' },
		{ value: 'bank_statements', label: 'Bank Statements' },
		{ value: 'valuation', label: 'Valuation' },
		{ value: 'legal_opinion', label: 'Legal Opinion' },
		{ value: 'eligibility_clarification', label: 'Eligibility Clarification' },
		{ value: 'general', label: 'General' }
	] as const;

	let showQueryModal = $state(false);
	let queryCategory = $state('');
	let queryText = $state('');
	let queryLenderAppId = $state('');
	let isSendingQuery = $state(false);
	let queryError = $state('');
	let querySuccess = $state(false);

	function openQueryModal(lenderAppId: string) {
		queryLenderAppId = lenderAppId;
		queryCategory = '';
		queryText = '';
		queryError = '';
		querySuccess = false;
		showQueryModal = true;
	}

	function closeQueryModal() {
		showQueryModal = false;
		queryCategory = '';
		queryText = '';
		queryLenderAppId = '';
		queryError = '';
		querySuccess = false;
		isSendingQuery = false;
	}

	async function sendQuery() {
		if (!queryCategory || !queryText.trim()) {
			queryError = 'Please select a category and enter your query.';
			return;
		}
		isSendingQuery = true;
		queryError = '';
		querySuccess = false;

		try {
			const res = await secureFetch(`/api/rm/cases/${data.caseData.case_id}/query`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category: queryCategory,
					query_text: queryText.trim(),
					lender_application_id: queryLenderAppId
				})
			});

			const result = await res.json();

			if (res.ok && result.success) {
				querySuccess = true;
				// Auto-close after brief delay
				setTimeout(() => closeQueryModal(), 1500);
			} else {
				queryError = result.error || 'Failed to send query. Please try again.';
			}
		} catch {
			queryError = 'Network error. Please check your connection and try again.';
		} finally {
			isSendingQuery = false;
		}
	}
</script>

<svelte:head>
	<title>{data.caseData.label} - Case Detail - RM Dashboard</title>
</svelte:head>

<div class="space-y-6 pb-20 lg:pb-0">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- BACK NAVIGATION                                            -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<a
		href="/dashboard/rm/cases"
		class="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:text-[var(--ddsa-accent-500)]"
	>
		<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
			/>
		</svg>
		Back to Cases
	</a>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- CASE HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-lg font-bold text-[var(--dash-text)] md:text-xl">
						{data.caseData.label}
					</h1>
					{#if data.caseData.is_sample}
						<span
							class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
							>Sample</span
						>
					{/if}
				</div>

				<div
					class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--dash-text-secondary)]"
				>
					<span class="font-mono text-[var(--dash-text-muted)]">{data.caseData.case_id}</span>
					<span class="text-[var(--dash-text-muted)]">|</span>
					<span>{data.caseData.loan.type}</span>
					{#if data.caseData.loan.amount_required}
						<span class="text-[var(--dash-text-muted)]">|</span>
						<span class="font-medium text-[var(--dash-text-secondary)]"
							>{formatCurrency(data.caseData.loan.amount_required, true)}</span
						>
					{/if}
					{#if data.caseData.loan.tenure_years}
						<span class="text-[var(--dash-text-muted)]">|</span>
						<span>{data.caseData.loan.tenure_years} yrs</span>
					{/if}
				</div>

				<div
					class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--dash-text-secondary)]"
				>
					<span
						>DSA: <strong class="text-[var(--dash-text-secondary)]">{data.caseData.dsa_name}</strong
						></span
					>
					<span class="text-[var(--dash-text-muted)]">|</span>
					<span>Created {formatDate(data.caseData.created_at)}</span>
				</div>
			</div>

			<!-- Stage badge -->
			<span
				class="self-start rounded-full px-3 py-1 text-xs font-semibold {stageColors[
					data.caseData.stage
				] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
			>
				{data.caseData.stage_label}
			</span>
		</div>

		<!-- Optional contact (if provided) -->
		{#if data.caseData.optional_contact && (data.caseData.optional_contact.full_name || data.caseData.optional_contact.mobile || data.caseData.optional_contact.email)}
			<div
				class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-[var(--dash-bg-alt)] px-3 py-2 text-xs text-[var(--dash-text-secondary)]"
			>
				<span
					class="text-[12px] font-semibold tracking-wide text-[var(--dash-text-muted)] uppercase"
					>Contact</span
				>
				{#if data.caseData.optional_contact.full_name}
					<span>{data.caseData.optional_contact.full_name}</span>
				{/if}
				{#if data.caseData.optional_contact.mobile}
					<span class="text-[var(--dash-text-muted)]">|</span>
					<span>{data.caseData.optional_contact.mobile}</span>
				{/if}
				{#if data.caseData.optional_contact.email}
					<span class="text-[var(--dash-text-muted)]">|</span>
					<span>{data.caseData.optional_contact.email}</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- LENDER APPLICATIONS                                        -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if data.caseData.lender_applications.length > 0}
		<div class="space-y-4">
			<h2 class="text-sm font-semibold text-[var(--dash-text)]">
				Lender Applications ({data.caseData.lender_applications.length})
			</h2>

			{#each data.caseData.lender_applications as la (la.lender_application_id)}
				<div
					class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm"
				>
					<!-- Lender card header -->
					<div
						class="flex items-center justify-between border-b border-[var(--dash-border-light)] px-4 py-3"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--ddsa-primary-100)] to-[var(--ddsa-accent-100)]"
							>
								<svg
									class="h-4.5 w-4.5 text-[var(--ddsa-accent-500)]"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
									/>
								</svg>
							</div>
							<div>
								<h3 class="text-sm font-bold text-[var(--dash-text)]">{la.lender_name}</h3>
								<span
									class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold {statusColors[
										la.status
									] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
								>
									{statusLabels[la.status] || la.status}
								</span>
							</div>
						</div>
					</div>

					<!-- Lender card body -->
					<div class="space-y-3 px-4 py-3">
						<!-- Eligibility traffic light -->
						{#if la.eligibility_snapshot}
							<EligibilityCard
								trafficLight={la.eligibility_snapshot.traffic_light}
								message={la.eligibility_snapshot.message}
								computedAt={la.eligibility_snapshot.computed_at}
							/>
						{/if}

						<!-- Document completion -->
						{#if la.document_summary.total > 0}
							<div>
								<div class="mb-1 flex items-center justify-between">
									<span class="text-xs font-medium text-[var(--dash-text-secondary)]"
										>Documents</span
									>
									<span class="text-xs font-bold text-[var(--dash-text-secondary)]">
										{la.document_summary.completed}/{la.document_summary.total} ready
										<span class="ml-1 text-[var(--dash-text-muted)]"
											>({la.document_summary.percent}%)</span
										>
									</span>
								</div>
								<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
									<div
										class="h-full rounded-full transition-all duration-500 ease-out {la
											.document_summary.percent === 100
											? 'bg-[var(--dash-btn-bg)]'
											: la.document_summary.percent >= 50
												? 'bg-[var(--dash-btn-bg)]'
												: 'bg-[var(--dash-text-muted)]'}"
										style="width: {la.document_summary.percent}%"
									></div>
								</div>
							</div>
						{/if}

						<!-- Open queries -->
						{#if la.open_queries > 0}
							<div
								class="flex items-center gap-2 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2"
							>
								<svg
									class="h-4 w-4 text-[var(--dash-contrast-text)]"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
									/>
								</svg>
								<span class="text-xs font-semibold text-[var(--dash-contrast-text)]">
									{la.open_queries} open {la.open_queries === 1 ? 'query' : 'queries'}
								</span>
							</div>
						{:else if la.total_queries > 0}
							<div
								class="flex items-center gap-2 rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-2"
							>
								<svg
									class="h-4 w-4 text-[var(--dash-accent-text)]"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span class="text-xs font-medium text-[var(--dash-accent-text)]">
									All {la.total_queries}
									{la.total_queries === 1 ? 'query' : 'queries'} resolved
								</span>
							</div>
						{/if}

						<!-- Sanction details -->
						{#if la.sanction?.amount}
							<div
								class="rounded-lg border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] px-3 py-2"
							>
								<p
									class="mb-1 text-[12px] font-semibold tracking-wide text-[var(--dash-accent-text)] uppercase"
								>
									Sanction
								</p>
								<div class="space-y-1">
									<div class="flex items-center justify-between">
										<span class="text-xs text-[var(--dash-accent-text)]">Amount</span>
										<span class="text-sm font-bold text-[var(--dash-accent-text)]"
											>{formatCurrency(la.sanction.amount, true)}</span
										>
									</div>
									{#if la.sanction.roi}
										<div class="flex items-center justify-between">
											<span class="text-xs text-[var(--dash-accent-text)]">ROI</span>
											<span class="text-xs font-semibold text-[var(--dash-accent-text)]"
												>{la.sanction.roi}%</span
											>
										</div>
									{/if}
									{#if la.sanction.tenure_months}
										<div class="flex items-center justify-between">
											<span class="text-xs text-[var(--dash-accent-text)]">Tenure</span>
											<span class="text-xs font-semibold text-[var(--dash-accent-text)]"
												>{la.sanction.tenure_months} months</span
											>
										</div>
									{/if}
									{#if la.sanction.sanction_date}
										<div class="flex items-center justify-between">
											<span class="text-xs text-[var(--dash-accent-text)]">Date</span>
											<span class="text-xs font-semibold text-[var(--dash-accent-text)]"
												>{formatDate(la.sanction.sanction_date)}</span
											>
										</div>
									{/if}
									{#if la.sanction.conditions && la.sanction.conditions.length > 0}
										<div class="mt-1 border-t border-[var(--dash-btn-ghost-border)] pt-1">
											<p class="text-[12px] font-medium text-[var(--dash-accent-text)]">
												Conditions:
											</p>
											<ul
												class="mt-0.5 list-inside list-disc text-[13px] text-[var(--dash-accent-text)]"
											>
												{#each la.sanction.conditions as condition}
													<li>{condition}</li>
												{/each}
											</ul>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<!-- Accuracy Rating Form -->
					<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
						<AccuracyRatingForm
							caseId={data.caseData.case_id}
							lenderAppId={la.lender_application_id}
							lenderName={la.lender_name}
							existingRating={data.existingRatings[la.lender_application_id]}
							onRated={handleRated}
						/>
					</div>

					<!-- Raise Query Button -->
					<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
						<button
							onclick={() => openQueryModal(la.lender_application_id)}
							class="flex items-center gap-2 rounded-lg border border-[var(--dash-border)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--ddsa-accent-500)] hover:text-[var(--ddsa-accent-500)]"
						>
							<svg
								class="h-3.5 w-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
								/>
							</svg>
							Raise Query
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6 text-center"
		>
			<p class="text-sm text-[var(--dash-text-secondary)]">
				No lender applications for this case yet.
			</p>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- TIMELINE                                                    -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if data.recentTimeline.length > 0}
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
		>
			<h2 class="mb-4 text-sm font-semibold text-[var(--dash-text)]">Recent Timeline</h2>

			<div class="space-y-3">
				{#each data.recentTimeline as event, i}
					<div class="flex items-start gap-3">
						<!-- Timeline dot and connector -->
						<div class="flex flex-col items-center">
							<div
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
							>
								<svg
									class="h-3.5 w-3.5 text-[var(--dash-text-secondary)]"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d={eventTypeIcons[event.event_type] ||
											'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'}
									/>
								</svg>
							</div>
							{#if i < data.recentTimeline.length - 1}
								<div class="mt-1 h-4 w-px bg-[var(--dash-border)]"></div>
							{/if}
						</div>

						<!-- Event content -->
						<div class="min-w-0 flex-1 pb-2">
							<p class="text-xs font-medium text-[var(--dash-text-secondary)]">
								{eventTypeLabels[event.event_type] ||
									event.event_type
										.replace(/_/g, ' ')
										.replace(/\b\w/g, (c: string) => c.toUpperCase())}
							</p>
							<p class="mt-0.5 text-[13px] text-[var(--dash-text-secondary)]">
								{event.description}
							</p>
							<p class="mt-0.5 text-[12px] text-[var(--dash-text-muted)]">
								{formatTimeAgo(event.created_at)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- QUICK QUERY MODAL                                          -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if showQueryModal}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Raise Query"
			tabindex="-1"
			onclick={(e) => {
				if (e.target === e.currentTarget) closeQueryModal();
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') closeQueryModal();
			}}
		>
			<div class="w-full max-w-md rounded-2xl bg-[var(--dash-bg-card)] p-5 shadow-xl">
				<!-- Modal header -->
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-sm font-bold text-[var(--dash-text)]">Raise Query</h3>
					<button
						onclick={closeQueryModal}
						aria-label="Close"
						class="flex h-7 w-7 items-center justify-center rounded-full text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text-secondary)]"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Success message -->
				{#if querySuccess}
					<div class="flex flex-col items-center gap-2 py-6 text-center">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
						>
							<svg
								class="h-6 w-6 text-[var(--dash-accent-text)]"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<p class="text-sm font-semibold text-[var(--dash-accent-text)]">
							Query sent successfully!
						</p>
					</div>
				{:else}
					<!-- Category select -->
					<div class="mb-3">
						<label
							for="query-category"
							class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
							>Category</label
						>
						<select
							id="query-category"
							bind:value={queryCategory}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-xs text-[var(--dash-text-secondary)] transition-colors outline-none focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]"
						>
							<option value="">Select category...</option>
							{#each QUERY_CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<!-- Query text -->
					<div class="mb-3">
						<label
							for="query-text"
							class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
						>
							Your Query
							<span class="ml-1 text-[var(--dash-text-muted)]">({queryText.length}/1000)</span>
						</label>
						<textarea
							id="query-text"
							bind:value={queryText}
							maxlength={1000}
							rows={4}
							placeholder="Describe what you need from the DSA..."
							class="w-full resize-none rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-xs text-[var(--dash-text-secondary)] transition-colors outline-none placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]"
						></textarea>
					</div>

					<!-- Error message -->
					{#if queryError}
						<div
							class="mb-3 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
						>
							{queryError}
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex items-center justify-end gap-2">
						<button
							onclick={closeQueryModal}
							class="rounded-lg border border-[var(--dash-border)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
						>
							Cancel
						</button>
						<button
							onclick={sendQuery}
							disabled={isSendingQuery || !queryCategory || !queryText.trim()}
							class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--ddsa-accent-600)] disabled:opacity-50"
						>
							{isSendingQuery ? 'Sending...' : 'Send Query'}
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
