<script lang="ts">
	import DocumentChecklist from '$lib/components/dashboard/DocumentChecklist.svelte';
	import { formatCurrency } from '$lib/i18n';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	// ── Props ────────────────────────────────────────────────────
	interface LenderApp {
		lender_application_id: string;
		lender_id: string;
		lender_name: string;
		status: string;
		eligibility_snapshot?: {
			traffic_light: 'green' | 'amber' | 'red' | 'grey';
			message: string;
			computed_at: string;
			offered_amount?: number;
			roi?: number;
			emi?: number;
			approval_probability?: number;
			foir?: number;
			ltv?: number;
		};
		document_checklist: Array<{
			doc_id: string;
			doc_name: string;
			status: string;
		}>;
		queries: Array<{
			query_id: string;
			status: string;
		}>;
		lender_tracking?: {
			login_number?: string;
			login_date?: string;
			technical_status?: string;
			legal_status?: string;
			credit_approval?: string;
			conditions?: string[];
		};
		sanction?: {
			amount?: number;
			roi?: number;
			tenure_months?: number;
			sanction_date?: string;
			conditions?: string[];
		};
		file_snapshots: any[];
		created_at: string;
		updated_at: string;
	}

	interface Props {
		lenderApp: LenderApp;
		caseId: string;
		availableStatuses?: Array<{ value: string; label: string }>;
		onRemove?: (lenderAppId: string) => void;
		onRefresh?: () => void;
	}

	let { lenderApp, caseId, availableStatuses = [], onRemove, onRefresh }: Props = $props();

	// ── Status labels & colors ──────────────────────────────────
	const STATUS_LABELS: Record<string, string> = {
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

	const STATUS_COLORS: Record<string, string> = {
		selected: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		file_building: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		ready: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		processing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		query: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		query_responded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		sanctioned: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		disbursed: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		withdrawn: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	// ── Traffic light colors ────────────────────────────────────
	const TRAFFIC_LIGHT_COLORS: Record<string, { bg: string; ring: string; label: string }> = {
		green: { bg: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Eligible' },
		amber: { bg: 'bg-stone-500', ring: 'ring-stone-200', label: 'Marginal' },
		red: { bg: 'bg-red-500', ring: 'ring-red-200', label: 'Not Eligible' },
		grey: { bg: 'bg-gray-400', ring: 'ring-gray-200', label: 'Unknown' }
	};

	// ── Computed values ─────────────────────────────────────────
	const docTotal = $derived(lenderApp.document_checklist.length);
	const docCompleted = $derived(
		lenderApp.document_checklist.filter(
			(d) => d.status === 'uploaded' || d.status === 'received' || d.status === 'not_applicable'
		).length
	);
	const docPercent = $derived(docTotal > 0 ? Math.round((docCompleted / docTotal) * 100) : 0);
	const openQueries = $derived(lenderApp.queries.filter((q) => q.status === 'open').length);

	const isPostSubmission = $derived(
		['submitted', 'processing', 'query', 'query_responded', 'sanctioned', 'disbursed'].includes(
			lenderApp.status
		)
	);

	const isTerminal = $derived(['disbursed', 'rejected', 'withdrawn'].includes(lenderApp.status));

	// ── Status change state ─────────────────────────────────────
	let showStatusMenu = $state(false);
	let statusChanging = $state(false);
	let statusError = $state('');

	async function changeStatus(newStatus: string) {
		statusChanging = true;
		statusError = '';

		try {
			const res = await secureFetch(
				`/api/cases/${caseId}/lender-applications/${lenderApp.lender_application_id}/status`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: newStatus })
				}
			);

			const result = await res.json();

			if (result.success) {
				showStatusMenu = false;
				await invalidateAll();
			} else {
				statusError = result.error || 'Failed to update status';
			}
		} catch {
			statusError = 'Network error. Please try again.';
		} finally {
			statusChanging = false;
		}
	}

	function handleRemove() {
		if (onRemove) {
			onRemove(lenderApp.lender_application_id);
		}
	}

	// ── Format helpers ────────────────────────────────────────── Cr`;

	// ── Tracking status badge helpers ───────────────────────────
	const trackingStatusColors: Record<string, string> = {
		pending: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
		ordered: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		received: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		positive: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		negative: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		clear: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		not_clear: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		approved: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		conditional: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	// ── Inline tracking edit state (one-time snapshot from prop) ──
	// svelte-ignore state_referenced_locally
	let trackingLoginNumber = $state(lenderApp.lender_tracking?.login_number || '');
	// svelte-ignore state_referenced_locally
	let trackingLoginDate = $state(
		lenderApp.lender_tracking?.login_date
			? typeof lenderApp.lender_tracking.login_date === 'string'
				? lenderApp.lender_tracking.login_date.substring(0, 10)
				: new Date(lenderApp.lender_tracking.login_date).toISOString().substring(0, 10)
			: ''
	);
	// svelte-ignore state_referenced_locally
	let trackingTechnicalStatus = $state(lenderApp.lender_tracking?.technical_status || '');
	// svelte-ignore state_referenced_locally
	let trackingLegalStatus = $state(lenderApp.lender_tracking?.legal_status || '');
	// svelte-ignore state_referenced_locally
	let trackingCreditApproval = $state(lenderApp.lender_tracking?.credit_approval || '');
	// svelte-ignore state_referenced_locally
	let trackingConditions = $state((lenderApp.lender_tracking?.conditions || []).join(', '));
	let trackingSaving = $state(false);
	let trackingSaveMsg = $state('');
	let trackingSaveMsgTimeout: ReturnType<typeof setTimeout> | undefined;

	// ── Dropdown options ────────────────────────────────────────
	const TECHNICAL_OPTIONS = [
		{ value: '', label: 'Not set' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'ordered', label: 'Ordered' },
		{ value: 'received', label: 'Received' },
		{ value: 'positive', label: 'Positive' },
		{ value: 'negative', label: 'Negative' }
	];

	const LEGAL_OPTIONS = [
		{ value: '', label: 'Not set' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'ordered', label: 'Ordered' },
		{ value: 'received', label: 'Received' },
		{ value: 'clear', label: 'Clear' },
		{ value: 'not_clear', label: 'Not Clear' }
	];

	const CREDIT_APPROVAL_OPTIONS = [
		{ value: '', label: 'Not set' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'conditional', label: 'Conditional' }
	];

	// ── Document checklist panel state ──────────────────────────
	let showDocuments = $state(false);
	let documentsData = $state<any[]>([]);
	let documentsLoading = $state(false);
	let documentsLoaded = $state(false);

	async function loadDocuments() {
		if (documentsLoaded) return;
		documentsLoading = true;

		try {
			const res = await secureFetch(
				`/api/cases/${caseId}/lender-applications/${lenderApp.lender_application_id}/documents`
			);
			const result = await res.json();

			if (result.success) {
				documentsData = result.data;
				documentsLoaded = true;
			}
		} catch {
			// silently fail — user can retry by toggling
		} finally {
			documentsLoading = false;
		}
	}

	function toggleDocuments() {
		showDocuments = !showDocuments;
		if (showDocuments && !documentsLoaded) {
			loadDocuments();
		}
	}

	function handleDocRefresh() {
		documentsLoaded = false;
		loadDocuments();
		if (onRefresh) {
			onRefresh();
		}
	}

	// ── Auto-save tracking field on blur/change ─────────────────
	async function saveTrackingField(field: string, value: any) {
		trackingSaving = true;
		trackingSaveMsg = '';
		clearTimeout(trackingSaveMsgTimeout);

		try {
			const payload: Record<string, any> = {};
			if (field === 'conditions') {
				// Convert comma-separated string to array
				payload[field] = value
					? (value as string)
							.split(',')
							.map((s: string) => s.trim())
							.filter((s: string) => s.length > 0)
					: [];
			} else if (field === 'login_date') {
				payload[field] = value || undefined;
			} else {
				payload[field] = value || undefined;
			}

			const res = await secureFetch(
				`/api/cases/${caseId}/lender-applications/${lenderApp.lender_application_id}`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ lender_tracking: payload })
				}
			);

			const result = await res.json();

			if (result.success) {
				trackingSaveMsg = 'Saved';
			} else {
				trackingSaveMsg = result.error || 'Save failed';
			}
		} catch {
			trackingSaveMsg = 'Network error';
		} finally {
			trackingSaving = false;
			trackingSaveMsgTimeout = setTimeout(() => {
				trackingSaveMsg = '';
			}, 2000);
		}
	}
</script>

<div
	class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm transition-all hover:shadow-md"
>
	<!-- Card Header -->
	<div class="flex items-center justify-between border-b border-[var(--dash-border)] px-4 py-3">
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
				<h4 class="text-sm font-bold text-[var(--dash-text)]">{lenderApp.lender_name}</h4>
				<span
					class="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold {STATUS_COLORS[
						lenderApp.status
					] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
				>
					{STATUS_LABELS[lenderApp.status] || lenderApp.status}
				</span>
			</div>
		</div>

		<!-- Eligibility traffic light -->
		{#if lenderApp.eligibility_snapshot}
			{@const tl =
				TRAFFIC_LIGHT_COLORS[lenderApp.eligibility_snapshot.traffic_light] ||
				TRAFFIC_LIGHT_COLORS.grey}
			<div class="flex items-center gap-2" title={lenderApp.eligibility_snapshot.message}>
				<div class="h-3.5 w-3.5 rounded-full ring-2 {tl.bg} {tl.ring}"></div>
				<span class="text-[12px] font-medium text-[var(--dash-text-secondary)]">{tl.label}</span>
			</div>
		{/if}
	</div>

	<!-- Eligibility metrics row (shown when rule engine populates snapshot) -->
	{#if lenderApp.eligibility_snapshot?.offered_amount}
		{@const snap = lenderApp.eligibility_snapshot}
		<div
			class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--dash-border-light)] px-4 py-2 text-[13px]"
		>
			<span class="font-semibold text-[var(--dash-text)]"
				>{formatCurrency(snap.offered_amount!, true)}</span
			>
			{#if snap.roi}
				<span class="text-[var(--dash-text-secondary)]">@ {snap.roi}%</span>
			{/if}
			{#if snap.emi}
				<span class="text-[var(--dash-text-secondary)]">EMI {formatCurrency(snap.emi, true)}</span>
			{/if}
			{#if snap.approval_probability != null}
				<span
					class="font-medium {snap.approval_probability >= 70
						? 'text-emerald-600'
						: snap.approval_probability >= 40
							? 'text-stone-600'
							: 'text-red-600'}">{Math.round(snap.approval_probability)}% prob</span
				>
			{/if}
			{#if snap.foir != null}
				<span class="text-[var(--dash-text-muted)]">FOIR {(snap.foir * 100).toFixed(0)}%</span>
			{/if}
			{#if snap.ltv != null}
				<span class="text-[var(--dash-text-muted)]">LTV {(snap.ltv * 100).toFixed(0)}%</span>
			{/if}
		</div>
	{/if}

	<!-- Card Body -->
	<div class="space-y-3 px-4 py-3">
		<!-- Document completion -->
		{#if docTotal > 0}
			<div>
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-[var(--dash-text-secondary)]">Documents</span>
					<span class="text-xs font-bold text-[var(--dash-text-secondary)]"
						>{docCompleted}/{docTotal} ready</span
					>
				</div>
				<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
					<div
						class="h-full rounded-full transition-all duration-500 ease-out {docPercent === 100
							? 'bg-[var(--dash-btn-bg)]'
							: docPercent >= 50
								? 'bg-[var(--dash-btn-bg)]'
								: 'bg-[var(--dash-text-muted)]'}"
						style="width: {docPercent}%"
					></div>
				</div>
			</div>
		{/if}

		<!-- Open queries -->
		{#if openQueries > 0}
			<div class="flex items-center gap-2 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2">
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
					{openQueries} open {openQueries === 1 ? 'query' : 'queries'}
				</span>
			</div>
		{/if}

		<!-- Post-submission tracking: inline editable fields -->
		{#if isPostSubmission}
			<div class="space-y-2.5 rounded-lg bg-[var(--dash-bg-alt)] px-3 py-3">
				<div class="flex items-center justify-between">
					<span
						class="text-[13px] font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase"
						>Lender Tracking</span
					>
					{#if trackingSaving}
						<span class="text-[12px] text-[var(--dash-text-muted)]">Saving...</span>
					{:else if trackingSaveMsg}
						<span
							class="text-[12px] {trackingSaveMsg === 'Saved'
								? 'text-[var(--dash-accent-text)]'
								: 'text-[var(--dash-contrast-text)]'}">{trackingSaveMsg}</span
						>
					{/if}
				</div>

				<!-- Login Number -->
				<div class="space-y-1">
					<label
						for="tracking-login-number"
						class="block text-[13px] text-[var(--dash-text-secondary)]">Login No.</label
					>
					<input
						id="tracking-login-number"
						type="text"
						value={trackingLoginNumber}
						oninput={(e) => (trackingLoginNumber = e.currentTarget.value)}
						onblur={() => saveTrackingField('login_number', trackingLoginNumber)}
						placeholder="e.g. LN-2026-001234"
						class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 font-mono text-xs text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					/>
				</div>

				<!-- Login Date -->
				<div class="space-y-1">
					<label
						for="tracking-login-date"
						class="block text-[13px] text-[var(--dash-text-secondary)]">Login Date</label
					>
					<input
						id="tracking-login-date"
						type="date"
						value={trackingLoginDate}
						oninput={(e) => {
							trackingLoginDate = e.currentTarget.value;
							saveTrackingField('login_date', trackingLoginDate);
						}}
						class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					/>
				</div>

				<!-- Technical Status -->
				<div class="space-y-1">
					<label
						for="tracking-technical-status"
						class="block text-[13px] text-[var(--dash-text-secondary)]">Technical Status</label
					>
					<select
						id="tracking-technical-status"
						value={trackingTechnicalStatus}
						onchange={(e) => {
							trackingTechnicalStatus = e.currentTarget.value;
							saveTrackingField('technical_status', trackingTechnicalStatus);
						}}
						class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					>
						{#each TECHNICAL_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
					{#if trackingTechnicalStatus}
						<span
							class="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold {trackingStatusColors[
								trackingTechnicalStatus
							] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
						>
							{trackingTechnicalStatus}
						</span>
					{/if}
				</div>

				<!-- Legal Status -->
				<div class="space-y-1">
					<label
						for="tracking-legal-status"
						class="block text-[13px] text-[var(--dash-text-secondary)]">Legal Status</label
					>
					<select
						id="tracking-legal-status"
						value={trackingLegalStatus}
						onchange={(e) => {
							trackingLegalStatus = e.currentTarget.value;
							saveTrackingField('legal_status', trackingLegalStatus);
						}}
						class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					>
						{#each LEGAL_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
					{#if trackingLegalStatus}
						<span
							class="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold {trackingStatusColors[
								trackingLegalStatus
							] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
						>
							{trackingLegalStatus}
						</span>
					{/if}
				</div>

				<!-- Credit Approval -->
				<div class="space-y-1">
					<label
						for="tracking-credit-approval"
						class="block text-[13px] text-[var(--dash-text-secondary)]">Credit Approval</label
					>
					<select
						id="tracking-credit-approval"
						value={trackingCreditApproval}
						onchange={(e) => {
							trackingCreditApproval = e.currentTarget.value;
							saveTrackingField('credit_approval', trackingCreditApproval);
						}}
						class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					>
						{#each CREDIT_APPROVAL_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
					{#if trackingCreditApproval}
						<span
							class="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold {trackingStatusColors[
								trackingCreditApproval
							] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
						>
							{trackingCreditApproval}
						</span>
					{/if}
				</div>

				<!-- Conditions -->
				<div class="space-y-1">
					<label
						for="tracking-conditions"
						class="block text-[13px] text-[var(--dash-text-secondary)]"
						>Conditions <span class="text-[var(--dash-text-muted)]">(comma-separated)</span></label
					>
					<input
						id="tracking-conditions"
						type="text"
						value={trackingConditions}
						oninput={(e) => (trackingConditions = e.currentTarget.value)}
						onblur={() => saveTrackingField('conditions', trackingConditions)}
						placeholder="e.g. ITR required, Property valuation pending"
						class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					/>
				</div>
			</div>
		{/if}

		<!-- Sanction details -->
		{#if lenderApp.sanction?.amount}
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
							>{formatCurrency(lenderApp.sanction.amount, true)}</span
						>
					</div>
					{#if lenderApp.sanction.roi}
						<div class="flex items-center justify-between">
							<span class="text-xs text-[var(--dash-accent-text)]">ROI</span>
							<span class="text-xs font-semibold text-[var(--dash-accent-text)]"
								>{lenderApp.sanction.roi}%</span
							>
						</div>
					{/if}
					{#if lenderApp.sanction.tenure_months}
						<div class="flex items-center justify-between">
							<span class="text-xs text-[var(--dash-accent-text)]">Tenure</span>
							<span class="text-xs font-semibold text-[var(--dash-accent-text)]"
								>{lenderApp.sanction.tenure_months} months</span
							>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Status error -->
		{#if statusError}
			<div
				class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
			>
				{statusError}
			</div>
		{/if}
	</div>

	<!-- ── Document Checklist Panel ── -->
	{#if showDocuments}
		<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
			{#if documentsLoading}
				<div class="flex items-center justify-center py-4">
					<span class="text-xs text-[var(--dash-text-muted)]">Loading documents...</span>
				</div>
			{:else}
				<DocumentChecklist
					{caseId}
					lenderAppId={lenderApp.lender_application_id}
					documents={documentsData}
					onRefresh={handleDocRefresh}
				/>
			{/if}
		</div>
	{/if}

	<!-- Card Actions -->
	<div
		class="lender-card-actions flex items-center gap-2 border-t border-[var(--dash-border)] px-4 py-3"
	>
		<button
			onclick={toggleDocuments}
			class="flex items-center gap-1 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--ddsa-accent-500)]/50 hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--ddsa-accent-500)]"
			title="Toggle document checklist"
		>
			<svg
				class="h-3.5 w-3.5"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
				/>
			</svg>
			Docs
			{#if docTotal > 0}
				<span
					class="rounded-full bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--dash-text-secondary)]"
					>{docCompleted}/{docTotal}</span
				>
			{/if}
		</button>

		<a
			href="/dashboard/dsa/cases/{caseId}/file-builder?lender={lenderApp.lender_application_id}"
			class="flex-1 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-center text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--ddsa-accent-500)]/50 hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--ddsa-accent-500)]"
		>
			File Builder
		</a>

		{#if !isTerminal && availableStatuses.length > 0}
			<div class="relative">
				<button
					onclick={() => (showStatusMenu = !showStatusMenu)}
					class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Status
					<svg
						class="ml-1 inline h-3 w-3"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
					</svg>
				</button>

				{#if showStatusMenu}
					<div
						class="absolute right-0 bottom-full z-20 mb-1 min-w-[160px] rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-1 shadow-xl"
					>
						{#each availableStatuses as status}
							<button
								onclick={() => changeStatus(status.value)}
								disabled={statusChanging}
								class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
							>
								<span
									class="h-2 w-2 rounded-full {STATUS_COLORS[status.value]?.split(' ')[0] ||
										'bg-[var(--dash-border)]'}"
								></span>
								{status.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#if !isTerminal && onRemove}
			<button
				onclick={handleRemove}
				class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-2 text-xs text-[var(--dash-text-muted)] transition-colors hover:border-[var(--dash-contrast-ghost-border)] hover:bg-[var(--dash-contrast-ghost-bg)] hover:text-[var(--dash-contrast-text)]"
				title="Remove lender"
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
						d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>
