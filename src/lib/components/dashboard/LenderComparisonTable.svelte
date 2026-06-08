<script lang="ts">
	import { formatCurrency } from '$lib/i18n';
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
		};
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
		created_at: string;
		updated_at: string;
	}

	interface Props {
		lenderApplications: LenderApp[];
		primaryLenderId?: string | null;
		caseId: string;
		onPrimaryChange?: (lenderAppId: string) => void;
	}

	let { lenderApplications, primaryLenderId = null, caseId, onPrimaryChange }: Props = $props();

	// ── State ────────────────────────────────────────────────────
	let settingPrimary = $state('');
	let errorMsg = $state('');

	// ── Status labels ────────────────────────────────────────────
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
		file_building: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		ready: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		submitted: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		processing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		query: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		query_responded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		sanctioned: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		disbursed: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		withdrawn: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	// ── Computed: Best offer highlights ──────────────────────────
	const sanctionedApps = $derived(lenderApplications.filter((la) => la.sanction?.amount));

	const lowestRoiId = $derived.by(() => {
		if (sanctionedApps.length === 0) return null;
		let best: LenderApp | null = null;
		for (const la of sanctionedApps) {
			if (
				la.sanction?.roi != null &&
				(best === null || la.sanction.roi < (best.sanction?.roi ?? Infinity))
			) {
				best = la;
			}
		}
		return best?.lender_application_id ?? null;
	});

	const highestSanctionId = $derived.by(() => {
		if (sanctionedApps.length === 0) return null;
		let best: LenderApp | null = null;
		for (const la of sanctionedApps) {
			if (
				la.sanction?.amount != null &&
				(best === null || la.sanction.amount > (best.sanction?.amount ?? 0))
			) {
				best = la;
			}
		}
		return best?.lender_application_id ?? null;
	});

	// ── Traffic light colors ────────────────────────────────────
	const TRAFFIC_LIGHT_DOT: Record<string, string> = {
		green: 'bg-emerald-500',
		amber: 'bg-stone-500',
		red: 'bg-red-500',
		grey: 'bg-[var(--dash-text-muted)]'
	};

	// ── Processing days (days since created_at) ─────────────────
	function getProcessingDays(la: LenderApp): number {
		const created = new Date(la.created_at);
		const now = new Date();
		return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
	}

	// ── Format helpers ────────────────────────────────────────── Cr`;

	// ── Toggle primary lender ───────────────────────────────────
	async function setPrimaryLender(lenderAppId: string) {
		settingPrimary = lenderAppId;
		errorMsg = '';

		try {
			const res = await secureFetch(`/api/cases/${caseId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ primary_lender_id: lenderAppId })
			});

			const result = await res.json();

			if (result.success) {
				if (onPrimaryChange) {
					onPrimaryChange(lenderAppId);
				}
			} else {
				errorMsg = result.error || 'Failed to set primary lender';
			}
		} catch {
			errorMsg = 'Network error. Please try again.';
		} finally {
			settingPrimary = '';
		}
	}
</script>

{#if lenderApplications.length < 2}
	<!-- Not enough lenders to compare -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
	>
		<p class="text-center text-xs text-[var(--dash-text-muted)]">
			Add 2 or more lenders to compare offers side-by-side.
		</p>
	</div>
{:else}
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- DESKTOP TABLE (hidden on small screens)                    -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div
		class="hidden overflow-x-auto rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm md:block"
	>
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Lender</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Eligibility</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Status</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Login No.</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>ROI</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Sanction Amt</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Tenure</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Conditions</th
					>
					<th
						class="px-4 py-3 text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Days</th
					>
					<th
						class="px-4 py-3 text-center text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
						>Primary</th
					>
				</tr>
			</thead>
			<tbody>
				{#each lenderApplications as la}
					{@const isPrimary = primaryLenderId === la.lender_application_id}
					{@const isBestRoi = lowestRoiId === la.lender_application_id}
					{@const isBestSanction = highestSanctionId === la.lender_application_id}
					<tr
						class="border-b border-[var(--dash-border)] transition-colors hover:bg-[var(--dash-hover)] {isPrimary
							? 'bg-[var(--dash-btn-ghost-bg)]/30'
							: ''}"
					>
						<!-- Lender Name -->
						<td class="px-4 py-3">
							<div class="flex items-center gap-2">
								{#if isPrimary}
									<svg
										class="h-4 w-4 shrink-0 text-[var(--dash-accent-text)]"
										fill="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
										/>
									</svg>
								{/if}
								<span class="text-xs font-bold text-[var(--dash-text)]">{la.lender_name}</span>
							</div>
						</td>
						<!-- Eligibility -->
						<td class="px-4 py-3">
							{#if la.eligibility_snapshot}
								<div class="flex items-center gap-1.5">
									<div
										class="h-2.5 w-2.5 rounded-full {TRAFFIC_LIGHT_DOT[
											la.eligibility_snapshot.traffic_light
										] || 'bg-[var(--dash-text-muted)]'}"
									></div>
									{#if la.eligibility_snapshot.offered_amount}
										<span class="text-xs font-semibold text-[var(--dash-text-secondary)]"
											>{formatCurrency(la.eligibility_snapshot.offered_amount, true)}</span
										>
									{/if}
								</div>
							{:else}
								<span class="text-xs text-[var(--dash-text-muted)]">--</span>
							{/if}
						</td>
						<!-- Status -->
						<td class="px-4 py-3">
							<span
								class="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold {STATUS_COLORS[
									la.status
								] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
							>
								{STATUS_LABELS[la.status] || la.status}
							</span>
						</td>
						<!-- Login Number -->
						<td class="px-4 py-3">
							<span class="font-mono text-xs text-[var(--dash-text-secondary)]">
								{la.lender_tracking?.login_number || '--'}
							</span>
						</td>
						<!-- ROI -->
						<td class="px-4 py-3">
							{#if la.sanction?.roi != null}
								<span
									class="text-xs font-semibold {isBestRoi
										? 'text-[var(--dash-accent-text)]'
										: 'text-[var(--dash-text-secondary)]'}"
								>
									{la.sanction.roi}%
									{#if isBestRoi}
										<span
											class="ml-1 inline-block rounded bg-[var(--dash-btn-ghost-bg)] px-1 py-0.5 text-[12px] font-bold text-[var(--dash-accent-text)]"
											>BEST</span
										>
									{/if}
								</span>
							{:else}
								<span class="text-xs text-[var(--dash-text-muted)]">--</span>
							{/if}
						</td>
						<!-- Sanction Amount -->
						<td class="px-4 py-3">
							{#if la.sanction?.amount}
								<span
									class="text-xs font-semibold {isBestSanction
										? 'text-[var(--dash-accent-text)]'
										: 'text-[var(--dash-text-secondary)]'}"
								>
									{formatCurrency(la.sanction.amount, true)}
									{#if isBestSanction}
										<span
											class="ml-1 inline-block rounded bg-[var(--dash-btn-ghost-bg)] px-1 py-0.5 text-[12px] font-bold text-[var(--dash-accent-text)]"
											>BEST</span
										>
									{/if}
								</span>
							{:else}
								<span class="text-xs text-[var(--dash-text-muted)]">--</span>
							{/if}
						</td>
						<!-- Tenure -->
						<td class="px-4 py-3">
							{#if la.sanction?.tenure_months}
								<span class="text-xs text-[var(--dash-text-secondary)]"
									>{la.sanction.tenure_months} mo</span
								>
							{:else}
								<span class="text-xs text-[var(--dash-text-muted)]">--</span>
							{/if}
						</td>
						<!-- Conditions -->
						<td class="px-4 py-3">
							{#if la.sanction?.conditions?.length}
								<span
									class="text-xs text-[var(--dash-text-secondary)]"
									title={la.sanction.conditions.join(', ')}
								>
									{la.sanction.conditions.length} condition{la.sanction.conditions.length > 1
										? 's'
										: ''}
								</span>
							{:else}
								<span class="text-xs text-[var(--dash-text-muted)]">--</span>
							{/if}
						</td>
						<!-- Processing Days -->
						<td class="px-4 py-3">
							<span class="text-xs text-[var(--dash-text-secondary)]">{getProcessingDays(la)}d</span
							>
						</td>
						<!-- Set Primary -->
						<td class="px-4 py-3 text-center">
							{#if isPrimary}
								<span class="text-[12px] font-semibold text-[var(--dash-accent-text)]">Primary</span
								>
							{:else}
								<button
									onclick={() => setPrimaryLender(la.lender_application_id)}
									disabled={settingPrimary !== ''}
									class="rounded-md border border-[var(--dash-border)] px-2 py-1 text-[12px] font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--ddsa-accent-500)] hover:text-[var(--ddsa-accent-500)] disabled:opacity-50"
								>
									{settingPrimary === la.lender_application_id ? 'Setting...' : 'Set'}
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- MOBILE CARDS (visible on small screens only)               -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="space-y-3 md:hidden">
		{#each lenderApplications as la}
			{@const isPrimary = primaryLenderId === la.lender_application_id}
			{@const isBestRoi = lowestRoiId === la.lender_application_id}
			{@const isBestSanction = highestSanctionId === la.lender_application_id}
			<div
				class="rounded-xl border bg-[var(--dash-bg-card)] p-4 shadow-sm {isPrimary
					? 'border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)]/30'
					: 'border-[var(--dash-border-light)]'}"
			>
				<!-- Header -->
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						{#if isPrimary}
							<svg
								class="h-4 w-4 shrink-0 text-[var(--dash-accent-text)]"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
								/>
							</svg>
						{/if}
						<h4 class="text-sm font-bold text-[var(--dash-text)]">{la.lender_name}</h4>
					</div>
					<span
						class="inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold {STATUS_COLORS[
							la.status
						] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
					>
						{STATUS_LABELS[la.status] || la.status}
					</span>
				</div>

				<!-- Eligibility row (from rule engine) -->
				{#if la.eligibility_snapshot}
					<div class="mb-2 flex items-center gap-2 rounded-lg bg-[var(--dash-bg-alt)] px-3 py-2">
						<div
							class="h-2.5 w-2.5 shrink-0 rounded-full {TRAFFIC_LIGHT_DOT[
								la.eligibility_snapshot.traffic_light
							] || 'bg-[var(--dash-text-muted)]'}"
						></div>
						<span class="text-xs text-[var(--dash-text-secondary)]">
							{#if la.eligibility_snapshot.offered_amount}{formatCurrency(
									la.eligibility_snapshot.offered_amount,
									true
								)}{/if}
							{#if la.eligibility_snapshot.roi}@ {la.eligibility_snapshot.roi}%{/if}
							{#if la.eligibility_snapshot.approval_probability != null}
								<span
									class="ml-1 font-medium {la.eligibility_snapshot.approval_probability >= 70
										? 'text-[var(--dash-accent-text)]'
										: la.eligibility_snapshot.approval_probability >= 40
											? 'text-[var(--dash-text-secondary)]'
											: 'text-[var(--dash-contrast-text)]'}"
									>{Math.round(la.eligibility_snapshot.approval_probability)}%</span
								>
							{/if}
						</span>
					</div>
				{/if}

				<!-- Details grid -->
				<div class="space-y-2">
					{#if la.lender_tracking?.login_number}
						<div class="flex items-center justify-between">
							<span class="text-[13px] text-[var(--dash-text-secondary)]">Login No.</span>
							<span class="font-mono text-xs font-semibold text-[var(--dash-text)]"
								>{la.lender_tracking.login_number}</span
							>
						</div>
					{/if}
					{#if la.sanction?.roi != null}
						<div class="flex items-center justify-between">
							<span class="text-[13px] text-[var(--dash-text-secondary)]">ROI</span>
							<span
								class="text-xs font-semibold {isBestRoi
									? 'text-[var(--dash-accent-text)]'
									: 'text-[var(--dash-text-secondary)]'}"
							>
								{la.sanction.roi}%
								{#if isBestRoi}
									<span
										class="ml-1 rounded bg-[var(--dash-btn-ghost-bg)] px-1 py-0.5 text-[12px] font-bold text-[var(--dash-accent-text)]"
										>BEST</span
									>
								{/if}
							</span>
						</div>
					{/if}
					{#if la.sanction?.amount}
						<div class="flex items-center justify-between">
							<span class="text-[13px] text-[var(--dash-text-secondary)]">Sanction</span>
							<span
								class="text-xs font-semibold {isBestSanction
									? 'text-[var(--dash-accent-text)]'
									: 'text-[var(--dash-text-secondary)]'}"
							>
								{formatCurrency(la.sanction.amount, true)}
								{#if isBestSanction}
									<span
										class="ml-1 rounded bg-[var(--dash-btn-ghost-bg)] px-1 py-0.5 text-[12px] font-bold text-[var(--dash-accent-text)]"
										>BEST</span
									>
								{/if}
							</span>
						</div>
					{/if}
					{#if la.sanction?.tenure_months}
						<div class="flex items-center justify-between">
							<span class="text-[13px] text-[var(--dash-text-secondary)]">Tenure</span>
							<span class="text-xs text-[var(--dash-text-secondary)]"
								>{la.sanction.tenure_months} months</span
							>
						</div>
					{/if}
					{#if la.sanction?.conditions?.length}
						<div class="flex items-center justify-between">
							<span class="text-[13px] text-[var(--dash-text-secondary)]">Conditions</span>
							<span class="text-xs text-[var(--dash-text-secondary)]"
								>{la.sanction.conditions.length} condition{la.sanction.conditions.length > 1
									? 's'
									: ''}</span
							>
						</div>
					{/if}
					<div class="flex items-center justify-between">
						<span class="text-[13px] text-[var(--dash-text-secondary)]">Processing</span>
						<span class="text-xs text-[var(--dash-text-secondary)]"
							>{getProcessingDays(la)} days</span
						>
					</div>
				</div>

				<!-- Primary toggle -->
				<div class="mt-3 border-t border-[var(--dash-border-light)] pt-3">
					{#if isPrimary}
						<span class="text-[13px] font-semibold text-[var(--dash-accent-text)]"
							>Primary Lender</span
						>
					{:else}
						<button
							onclick={() => setPrimaryLender(la.lender_application_id)}
							disabled={settingPrimary !== ''}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--ddsa-accent-500)] hover:text-[var(--ddsa-accent-500)] disabled:opacity-50"
						>
							{settingPrimary === la.lender_application_id ? 'Setting...' : 'Set as Primary'}
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Error message -->
	{#if errorMsg}
		<div
			class="mt-2 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
		>
			{errorMsg}
		</div>
	{/if}
{/if}
