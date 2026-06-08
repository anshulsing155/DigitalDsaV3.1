<script lang="ts">
	import { ChevronDown, ChevronUp, Phone, FileText, ArrowRight, MessageSquarePlus, X } from '$lib/utils/iconRegistry';
	import type { LenderResult } from '$lib/types/lenderResults';
	import type { LenderChangeDelta } from '$lib/types/lenderResultsSnapshot';
	import type { LenderSelectionState } from '$lib/types/lenderResultsSnapshot';
	import DecisionFactorsPanel from './DecisionFactorsPanel.svelte';
	import ImprovementTips from './ImprovementTips.svelte';
	import CorporateDsaPayout from './CorporateDsaPayout.svelte';
	import LenderTrancheBreakdown from './LenderTrancheBreakdown.svelte';
	import LenderPlotEquityBreakdown from './LenderPlotEquityBreakdown.svelte';
	import AffordabilityBreakdown from './AffordabilityBreakdown.svelte';
	import { formatCurrency } from '$lib/i18n';
	import { secureFetch } from '$lib/utils/csrf.js';

	interface Props {
		result: LenderResult;
		rank: number;
		bestFlags: {
			bestAmount: boolean;
			bestRoi: boolean;
			bestEmi: boolean;
		};
		caseId: string;
		/** Loan product name for suggestion routing (e.g. "Home Loan") */
		loanProduct: string;
		changeDelta?: LenderChangeDelta;
		selectionState?: LenderSelectionState;
		onSelectionChange?: (lenderId: string, state: LenderSelectionState) => void;
		previouslyRejected?: boolean;
	}

	let {
		result,
		rank,
		bestFlags,
		caseId,
		loanProduct,
		changeDelta,
		selectionState = 'neutral',
		onSelectionChange,
		previouslyRejected = false
	}: Props = $props();

	// ── Expand/collapse state ──────────────────────────────────
	let showFactors = $state(false);
	let showSuggestions = $state(false);
	let showDsaChannels = $state(false);
	let showRedDetails = $state(false);

	const isRed = $derived(result.traffic_light === 'red');

	// ── Policy suggestion form ─────────────────────────────────
	let showSuggestForm = $state(false);
	let suggestNote = $state('');
	let suggestFieldPath = $state('');
	let suggestSubmitting = $state(false);
	let suggestError = $state('');
	let suggestSuccess = $state(false);

	/** Common policy field paths DSAs can flag */
	const COMMON_FIELDS = [
		{ label: 'CIBIL threshold', value: 'eligibility.minCibilScore' },
		{ label: 'FOIR limit (salaried)', value: 'foir.salariedMaxFoir' },
		{ label: 'FOIR limit (self-employed)', value: 'foir.selfEmployedMaxFoir' },
		{ label: 'Max loan amount', value: 'eligibility.maxLoanAmount' },
		{ label: 'Interest rate', value: 'roi.baseRate' },
		{ label: 'LTV limit', value: 'ltv.maxLtvPercent' },
		{ label: 'Processing fee', value: 'fees.processingFeePercent' },
		{ label: 'Income type acceptance', value: 'income.allowedProfileTypes' },
		{ label: 'Other / General', value: '' }
	];

	async function submitSuggestion() {
		if (suggestNote.trim().length < 20) {
			suggestError = 'Please describe the issue in at least 20 characters.';
			return;
		}

		suggestSubmitting = true;
		suggestError = '';

		try {
			const res = await secureFetch('/api/pms/suggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lenderId: result.lender_id,
					loanProduct,
					fieldPath: suggestFieldPath || null,
					dsaNote: suggestNote.trim(),
					caseReference: caseId
				})
			});
			const json = await res.json();

			if (!res.ok) {
				suggestError = json.error ?? 'Failed to submit. Please try again.';
			} else {
				suggestSuccess = true;
				suggestNote = '';
				suggestFieldPath = '';
			}
		} catch {
			suggestError = 'Network error. Please try again.';
		} finally {
			suggestSubmitting = false;
		}
	}

	// ── Traffic light config (dots only) ──────────────────────
	const LIGHT_DOT: Record<string, string> = {
		green: 'dot-green',
		amber: 'dot-amber',
		red: 'dot-red',
		grey: 'dot-grey'
	};

	const LIGHT_LABEL: Record<string, string> = {
		green: 'Eligible',
		amber: 'Marginal',
		red: 'Not Eligible',
		grey: 'Unknown'
	};

	const GEO_CHIP_LABEL: Record<string, string> = {
		strong_presence: 'Strong Presence',
		available: 'Available',
		limited_presence: 'Limited Presence',
		verify_availability: 'Verify Availability'
	};

	// ── Format helpers ───────────────────────────────────────── Cr`;

	function formatWhatsAppLink(phone: string): string {
		const raw = phone.replace(/[\s\-+]/g, '');
		const withCountry = raw.startsWith('91') ? raw : `91${raw}`;
		return `https://wa.me/${withCountry}`;
	}

	function toggleSection(section: 'factors' | 'suggestions' | 'dsaChannels') {
		if (section === 'factors') showFactors = !showFactors;
		else if (section === 'suggestions') showSuggestions = !showSuggestions;
		else showDsaChannels = !showDsaChannels;
	}

	// ── Change delta helpers ──────────────────────────────────
	const isNewContender = $derived(changeDelta?.is_new_contender ?? false);
	const isNewlyAdded = $derived(changeDelta?.is_newly_added ?? false);
	const hasChanges = $derived(changeDelta ? Object.keys(changeDelta.changes).length > 0 : false);

	function formatDelta(delta: number, prefix = '₹'): string {
		const abs = Math.abs(delta);
		// formatCurrency(_, true) already returns a ₹-prefixed compact string
		// (e.g. "₹14.2 L") — do NOT add another ₹ here or it renders "₹₹14.2 L".
		const formatted =
			prefix === '₹' ? formatCurrency(abs, true) : `${abs}${prefix === '%' ? '%' : ''}`;
		return delta > 0 ? `+${formatted}` : `-${formatted}`;
	}

	// ── Badge list (show ALL applicable badges) ──────────────
	const badges = $derived.by(() => {
		const list: Array<{ text: string; class: string }> = [];
		if (previouslyRejected)
			list.push({ text: 'PREVIOUSLY REJECTED', class: 'badge-prev-rejected' });
		if (isNewContender) list.push({ text: 'NEW CONTENDER', class: 'badge-contender' });
		if (isNewlyAdded) list.push({ text: 'NEW', class: 'badge-new' });
		if (bestFlags.bestAmount) list.push({ text: 'BEST AMOUNT', class: 'badge-best-amount' });
		if (bestFlags.bestRoi) list.push({ text: 'BEST RATE', class: 'badge-best-roi' });
		if (bestFlags.bestEmi) list.push({ text: 'BEST EMI', class: 'badge-best-emi' });
		if (result.registry_urgency === 'urgent') list.push({ text: 'URGENT', class: 'badge-urgent' });
		if (!list.length && hasChanges) list.push({ text: 'UPDATED', class: 'badge-updated' });
		return list;
	});

	// ── Selection helpers ─────────────────────────────────────
	function cycleSelection() {
		if (!onSelectionChange) return;
		const next: LenderSelectionState =
			selectionState === 'neutral'
				? 'shortlisted'
				: selectionState === 'shortlisted'
					? 'selected'
					: 'neutral';
		onSelectionChange(result.lender_application_id, next);
	}
</script>

<div
	class="card {isRed ? 'card-red' : ''} {selectionState === 'selected'
		? 'card-selected'
		: selectionState === 'shortlisted'
			? 'card-shortlisted'
			: ''}"
>
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- CARD HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="card-header">
		<div class="header-left">
			<span class="rank">#{rank}</span>
			<h3 class="lender-name">{result.lender_name}</h3>
			<span class="traffic-dot {LIGHT_DOT[result.traffic_light] ?? 'dot-grey'}" aria-hidden="true"
			></span>
			<span class="traffic-label">{LIGHT_LABEL[result.traffic_light] ?? 'Unknown'}</span>
			{#if result.geo_presence}
				<span class="geo-chip geo-{result.geo_presence.chip}" title={result.geo_presence.reason}>
					{GEO_CHIP_LABEL[result.geo_presence.chip] ?? ''}
				</span>
			{/if}
		</div>
		<div class="header-right">
			{#each badges as b}
				<span class="badge {b.class}">{b.text}</span>
			{/each}
			{#if onSelectionChange && !isRed}
				<button
					type="button"
					class="sel-btn {selectionState === 'selected'
						? 'sel-selected'
						: selectionState === 'shortlisted'
							? 'sel-shortlisted'
							: 'sel-neutral'}"
					onclick={cycleSelection}
					title={selectionState === 'neutral'
						? 'Shortlist'
						: selectionState === 'shortlisted'
							? 'Select'
							: 'Deselect'}
				>
					{#if selectionState === 'selected'}
						<svg class="sel-icon" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else if selectionState === 'shortlisted'}
						<svg
							class="sel-icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
							/>
						</svg>
					{:else}
						<svg
							class="sel-icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
						</svg>
					{/if}
				</button>
			{/if}
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- RED CARD — COLLAPSED VIEW                                  -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if isRed && !showRedDetails}
		<div class="red-collapsed">
			<p class="red-reason">{result.traffic_light_message}</p>
			<button type="button" onclick={() => (showRedDetails = true)} class="red-expand">
				Show Details
			</button>
		</div>
	{:else}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- METRICS ROW                                                -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="metrics">
			<div class="metric {bestFlags.bestAmount ? 'metric-highlight-amount' : ''}">
				<span class="metric-val {bestFlags.bestAmount ? 'metric-val-best-amount' : ''}"
					>{formatCurrency(result.offered_amount, true)}</span
				>
				<span class="metric-key">Amount</span>
				{#if changeDelta?.changes.offered_amount}
					<span
						class="delta {changeDelta.changes.offered_amount.delta > 0 ? 'delta-up' : 'delta-down'}"
					>
						{formatDelta(changeDelta.changes.offered_amount.delta)}
					</span>
				{/if}
			</div>
			<div class="metric {bestFlags.bestRoi ? 'metric-highlight-roi' : ''}">
				<span class="metric-val {bestFlags.bestRoi ? 'metric-val-best-roi' : ''}"
					>{result.roi}%</span
				>
				<span class="metric-key">ROI</span>
				{#if changeDelta?.changes.roi}
					<span class="delta {changeDelta.changes.roi.delta < 0 ? 'delta-up' : 'delta-down'}">
						{changeDelta.changes.roi.delta > 0 ? '+' : ''}{changeDelta.changes.roi.delta.toFixed(
							2
						)}%
					</span>
				{/if}
			</div>
			<div class="metric {bestFlags.bestEmi ? 'metric-highlight-emi' : ''}">
				<span class="metric-val {bestFlags.bestEmi ? 'metric-val-best-emi' : ''}"
					>{formatCurrency(result.emi, true)}</span
				>
				<span class="metric-key">EMI/mo</span>
				{#if changeDelta?.changes.emi}
					<span class="delta {changeDelta.changes.emi.delta < 0 ? 'delta-up' : 'delta-down'}">
						{formatDelta(changeDelta.changes.emi.delta)}
					</span>
				{/if}
			</div>
			<div class="metric">
				<span class="metric-val">{result.tenure_months}<span class="metric-unit">mo</span></span>
				<span class="metric-key">Tenure</span>
				{#if changeDelta?.changes.tenure_months}
					<span
						class="delta {changeDelta.changes.tenure_months.delta > 0 ? 'delta-up' : 'delta-down'}"
					>
						{changeDelta.changes.tenure_months.delta > 0 ? '+' : ''}{changeDelta.changes
							.tenure_months.delta}mo
					</span>
				{/if}
			</div>
		</div>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- TRANCHE BREAKDOWN (Phase 4)                                -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if result.tranche_breakdown}
			<LenderTrancheBreakdown breakdown={result.tranche_breakdown} />
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- PLOT & EQUITY 4-NUMBER BREAKDOWN (LEND-1 Phase 4)          -->
		<!-- Engine populates these 4 fields only when                   -->
		<!-- loanVariant === 'Plot & Equity Loan'. Presence-check IS the -->
		<!-- variant gate — no separate prop plumbing needed.            -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if result.plot_equity_sanction_headline !== undefined && result.plot_equity_seller_disbursement !== undefined && result.plot_equity_buyer_cash_component !== undefined && result.plot_equity_buyer_net_out_of_pocket !== undefined}
			<LenderPlotEquityBreakdown
				sanctionHeadline={result.plot_equity_sanction_headline}
				sellerDisbursement={result.plot_equity_seller_disbursement}
				buyerCashComponent={result.plot_equity_buyer_cash_component}
				buyerNetOutOfPocket={result.plot_equity_buyer_net_out_of_pocket}
				marketValue={result.plot_equity_market_value}
				registryValue={result.plot_equity_registry_value}
			/>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- AFFORDABILITY SCENARIOS (RE-7)                              -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if result.affordability}
			<AffordabilityBreakdown affordability={result.affordability} loanName={loanProduct} />
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- KEY METRICS (compact inline)                               -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="key-metrics">
			{#if result.key_metrics.foir !== undefined}
				<span class="km"
					>FOIR <strong
						class={result.key_metrics.foir > 50
							? 'text-red-600'
							: result.key_metrics.foir > 40
								? 'text-stone-600'
								: 'text-emerald-600'}>{result.key_metrics.foir}%</strong
					></span
				>
			{/if}
			{#if result.key_metrics.ltv !== undefined}
				{#if result.key_metrics.foir !== undefined}<span class="km-sep"></span>{/if}
				<span class="km">LTV <strong>{result.key_metrics.ltv}%</strong></span>
				<span class="km-sep"></span>
			{:else if result.key_metrics.foir !== undefined}
				<span class="km-sep"></span>
			{/if}
			<span class="km">CIBIL <strong>{result.key_metrics.cibil}</strong></span>
			<span class="km-sep"></span>
			<span class="km"
				>Approval <strong
					class={result.key_metrics.approval_probability >= 80
						? 'text-emerald-600'
						: result.key_metrics.approval_probability >= 60
							? 'text-stone-600'
							: 'text-red-600'}>{Math.round(result.key_metrics.approval_probability)}%</strong
				></span
			>
			{#if result.processing_fee_percent}
				<span class="km-sep"></span>
				<span class="km">Fee <strong>{result.processing_fee_percent}%</strong></span>
			{/if}
			{#if result.bt_appreciation}
				<span class="km-sep"></span>
				<span class="km"
					>Appreciation <strong class="bt-appreciation bt-{result.bt_appreciation.strength}"
						>{result.bt_appreciation.appreciation_percent > 0 ? '+' : ''}{result.bt_appreciation
							.appreciation_percent}%</strong
					></span
				>
			{/if}
		</div>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- GUARANTOR ELIGIBILITY ROW                                  -->
		<!-- Per docs/specs/GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md:    -->
		<!-- Two states only (accepted / rejected). Hidden entirely      -->
		<!-- when no guarantor on the case (single-applicant or co-app   -->
		<!-- only loans render no row, not a placeholder).               -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if result.guarantor}
			<div
				class="guarantor-row {result.guarantor.accepted_by_lender
					? 'guarantor-accepted'
					: 'guarantor-rejected'}"
			>
				<span class="guarantor-icon" aria-hidden="true"
					>{result.guarantor.accepted_by_lender ? '✓' : '✗'}</span
				>
				<span class="guarantor-text">
					<strong>Guarantor{result.guarantor.name ? ` (${result.guarantor.name})` : ''}</strong>
					{#if result.guarantor.accepted_by_lender}
						— Accepted ({result.guarantor.capacity_percent}% capacity)
					{:else if result.guarantor.failure_reason === 'age_at_maturity'}
						— Rejected (age at maturity exceeds lender limit)
					{:else if result.guarantor.failure_reason === 'not_accepted'}
						— Rejected (lender does not accept guarantors)
					{:else}
						— Rejected ({result.guarantor.capacity_percent}% capacity vs {result.guarantor
							.required_percent}% required)
					{/if}
				</span>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- NRI GPA BANNER (Phase 4)                                   -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if result.nri_gpa_policy}
			<div class="nri-gpa-banner">
				<svg class="nri-gpa-icon" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="nri-gpa-text">{result.nri_gpa_policy}</span>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- EXPANDABLE SECTIONS                                        -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="expand-sections">
			{#if result.factors.length > 0}
				<button type="button" class="expand-btn" onclick={() => toggleSection('factors')}>
					<span
						>What Shaped This Result <span class="expand-count">{result.factors.length}</span></span
					>
					{#if showFactors}<ChevronUp
							size={14}
							class="text-[var(--dash-text-muted)]"
						/>{:else}<ChevronDown size={14} class="text-[var(--dash-text-muted)]" />{/if}
				</button>
				{#if showFactors}
					<div class="expand-content"><DecisionFactorsPanel factors={result.factors} /></div>
				{/if}
			{/if}

			{#if result.suggestions.length > 0}
				<button type="button" class="expand-btn" onclick={() => toggleSection('suggestions')}>
					<span>How to Improve <span class="expand-count">{result.suggestions.length}</span></span>
					{#if showSuggestions}<ChevronUp
							size={14}
							class="text-[var(--dash-text-muted)]"
						/>{:else}<ChevronDown size={14} class="text-[var(--dash-text-muted)]" />{/if}
				</button>
				{#if showSuggestions}
					<div class="expand-content"><ImprovementTips suggestions={result.suggestions} /></div>
				{/if}
			{/if}

			{#if result.corporate_dsas.length > 0}
				<button type="button" class="expand-btn" onclick={() => toggleSection('dsaChannels')}>
					<span
						>Best DSA Channels <span class="expand-count">{result.corporate_dsas.length}</span
						></span
					>
					{#if showDsaChannels}<ChevronUp
							size={14}
							class="text-[var(--dash-text-muted)]"
						/>{:else}<ChevronDown size={14} class="text-[var(--dash-text-muted)]" />{/if}
				</button>
				{#if showDsaChannels}
					<div class="expand-content">
						<CorporateDsaPayout recommendations={result.corporate_dsas} />
					</div>
				{/if}
			{/if}
		</div>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- CTA ROW                                                    -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div class="cta-row">
			{#if result.rm_contact}
				<div class="cta-contacts">
					{#if result.rm_contact.phone}
						<a href="tel:{result.rm_contact.phone.replace(/\s+/g, '')}" class="cta-link">
							<Phone size={13} />
							{result.rm_contact.rm_name}
						</a>
					{/if}
					{#if result.rm_contact.whatsapp}
						<a
							href={formatWhatsAppLink(result.rm_contact.whatsapp)}
							target="_blank"
							rel="noopener noreferrer"
							class="cta-link cta-wa"
							title="WhatsApp"
						>
							<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
								/>
							</svg>
						</a>
					{/if}
				</div>
			{:else}
				<div></div>
			{/if}

			<a
				href="/dashboard/dsa/cases/{caseId}/file-builder?lender={result.lender_application_id}"
				class="cta-file"
			>
				<FileText size={13} />
				Prepare File
				<ArrowRight size={13} />
			</a>
		</div>

		<!-- ── Suggest policy update (DSA → RM feedback) ───────────── -->
		<div class="border-t border-gray-100 pt-2">
			{#if suggestSuccess}
				<!-- Confirmation — auto-dismissed if they re-open -->
				<p class="py-1 text-center text-xs text-green-700">
					✓ Suggestion sent to the RM. Thank you!
				</p>
			{:else if showSuggestForm}
				<!-- Inline suggestion form -->
				<div class="space-y-2 py-2">
					<div class="flex items-center justify-between">
						<p class="text-[11px] font-semibold text-gray-600">Flag a policy issue to the RM</p>
						<button
							type="button"
							onclick={() => { showSuggestForm = false; suggestError = ''; }}
							class="text-gray-400 hover:text-gray-600"
							aria-label="Close"
						>
							<X size={13} />
						</button>
					</div>

					<select
						bind:value={suggestFieldPath}
						class="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
					>
						<option value="">Select area (optional)</option>
						{#each COMMON_FIELDS as field (field.value)}
							<option value={field.value}>{field.label}</option>
						{/each}
					</select>

					<textarea
						bind:value={suggestNote}
						placeholder="Describe the issue — e.g. 'Client CIBIL 698, bank verbally said 700 is flexible for govt employees but system rejected.' (min 20 chars)"
						rows={3}
						maxlength={500}
						class="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
					></textarea>

					<div class="flex items-center justify-between">
						<span class="text-[10px] text-gray-400">{suggestNote.length}/500</span>

						{#if suggestError}
							<p class="text-[11px] text-red-600">{suggestError}</p>
						{/if}

						<button
							type="button"
							onclick={submitSuggestion}
							disabled={suggestSubmitting || suggestNote.trim().length < 20}
							class="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
						>
							<MessageSquarePlus size={12} />
							{suggestSubmitting ? 'Sending…' : 'Send to RM'}
						</button>
					</div>
				</div>
			{:else}
				<!-- Collapsed trigger -->
				<button
					type="button"
					onclick={() => { showSuggestForm = true; suggestSuccess = false; }}
					class="flex w-full items-center justify-center gap-1.5 py-1.5 text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
				>
					<MessageSquarePlus size={12} />
					Flag a policy issue to RM
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ── Card Shell ────────────────────────────────────────────── */

	.card {
		border-radius: 0.75rem;
		border: 1px solid var(--dash-border);
		box-shadow: 0 1px 3px -1px rgba(0, 0, 0, 0.04);
		background: var(--dash-bg-card);
		overflow: hidden;
		transition: box-shadow 0.15s ease;
	}

	.card:hover {
		box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.08);
	}

	.card-red {
		opacity: 0.7;
	}

	.card-selected {
		border-color: var(--dash-btn-ghost-border);
		box-shadow: 0 0 0 1px var(--dash-btn-ghost-border);
	}

	.card-shortlisted {
		border-color: var(--ddsa-primary-500, #cb997e);
		box-shadow: 0 0 0 1px var(--ddsa-primary-500, #cb997e);
	}

	/* ── Card Header ──────────────────────────────────────────── */

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1rem;
		border-bottom: 1px solid var(--dash-border);
		gap: 0.5rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.rank {
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--dash-text-muted);
	}

	.lender-name {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--dash-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.traffic-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dot-green {
		background: #10b981;
	}
	.dot-amber {
		background: #cb997e;
	}
	.dot-red {
		background: #ef4444;
	}
	.dot-grey {
		background: #9ca3af;
	}

	.traffic-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
	}

	/* ── Geo Presence Chip ─────────────────────────────────────── */

	.geo-chip {
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		white-space: nowrap;
		letter-spacing: 0.02em;
	}

	.geo-strong_presence {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.geo-available {
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
	}

	.geo-limited_presence {
		background: var(--dash-contrast-ghost-bg);
		color: var(--dash-contrast-text);
	}

	.geo-verify_availability {
		background: var(--dash-bg-alt);
		color: var(--dash-text-muted);
	}

	/* ── Single Badge ─────────────────────────────────────────── */

	.badge {
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.1875rem 0.5rem;
		border-radius: 0.25rem;
		white-space: nowrap;
	}

	.badge-prev-rejected {
		background: #fef2f2;
		color: #dc2626;
	}
	:global(.dark) .badge-prev-rejected {
		background: rgba(220, 38, 38, 0.15);
		color: #f87171;
	}

	.badge-contender {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.badge-new {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.badge-best-amount {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.badge-best-roi {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.badge-best-emi {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.badge-updated {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	/* ── Selection Button ─────────────────────────────────────── */

	.sel-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		border: 1.5px solid;
		cursor: pointer;
		transition: all 0.12s ease;
		background: var(--dash-bg-card);
	}

	.sel-icon {
		width: 0.875rem;
		height: 0.875rem;
	}

	.sel-neutral {
		border-color: var(--dash-border);
		color: var(--dash-text-muted);
	}

	.sel-neutral:hover {
		border-color: var(--dash-btn-ghost-border);
		color: var(--dash-accent-text);
		background: var(--dash-btn-ghost-bg);
	}

	.sel-shortlisted {
		border-color: var(--ddsa-primary-500, #cb997e);
		color: var(--ddsa-primary-700, #8e5739);
		background: var(--ddsa-primary-50, #f5ebe5);
	}

	.sel-shortlisted:hover {
		border-color: var(--dash-btn-ghost-border);
		color: var(--dash-accent-text);
		background: var(--dash-btn-ghost-bg);
	}

	.sel-selected {
		border-color: var(--dash-btn-ghost-border);
		color: var(--dash-btn-text);
		background: var(--dash-btn-bg);
	}

	.sel-selected:hover {
		opacity: 0.9;
	}

	/* ── Metrics Row ──────────────────────────────────────────── */

	.metrics {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		padding: 1rem 1rem;
		border-bottom: 1px solid var(--dash-border);
		gap: 0;
	}

	.metric {
		text-align: center;
		padding: 0.375rem 0.375rem;
	}

	.metric + .metric {
		border-left: 1px solid var(--dash-border);
	}

	.metric-val {
		display: block;
		font-family: var(--font-title);
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--dash-text);
		line-height: 1.3;
	}

	.metric-unit {
		font-size: 0.6875rem;
		font-weight: 400;
		color: var(--dash-text-muted);
	}

	.metric-key {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-top: 0.125rem;
	}

	/* ── Metric Highlights (best flags) ──────────────────────── */

	.metric-highlight-amount {
		background: rgba(16, 185, 129, 0.08);
		border-radius: 0.5rem;
		border-bottom: 2.5px solid var(--ddsa-success, #10b981);
	}

	.metric-highlight-roi {
		background: rgba(59, 130, 246, 0.07);
		border-radius: 0.5rem;
		border-bottom: 2.5px solid var(--ddsa-info, #3b82f6);
	}

	.metric-highlight-emi {
		background: rgba(203, 153, 126, 0.08);
		border-radius: 0.5rem;
		border-bottom: 2.5px solid var(--ddsa-primary, #cb997e);
	}

	.metric-val-best-amount {
		color: var(--ddsa-success-dark, #059669);
	}

	.metric-val-best-roi {
		color: var(--ddsa-info-dark, #2563eb);
	}

	.metric-val-best-emi {
		color: var(--ddsa-primary-700, #8e5739);
	}

	.delta {
		display: block;
		font-size: 0.625rem;
		font-weight: 700;
		margin-top: 0.1875rem;
	}

	.delta-up {
		color: #059669;
	}
	.delta-down {
		color: #dc2626;
	}

	/* ── Key Metrics (compact) ────────────────────────────────── */

	.key-metrics {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		background: var(--dash-bg-alt);
		border-bottom: 1px solid var(--dash-border);
		flex-wrap: wrap;
		gap: 0;
	}

	.km {
		font-size: 0.6875rem;
		color: var(--dash-text-secondary);
		padding: 0 0.5rem;
	}

	.km strong {
		font-weight: 700;
		color: var(--dash-text);
	}

	.km-sep {
		width: 1px;
		height: 0.75rem;
		background: var(--dash-border);
	}

	/* ── Expandable Sections ──────────────────────────────────── */

	.expand-sections {
		border-bottom: 1px solid var(--dash-border);
	}

	.expand-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.625rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
		background: none;
		border: none;
		border-bottom: 1px solid var(--dash-border);
		cursor: pointer;
	}

	.expand-btn:hover {
		background: var(--dash-bg-alt);
	}

	.expand-count {
		font-size: 0.625rem;
		font-weight: 700;
		color: var(--dash-text-muted);
		background: var(--dash-bg-alt);
		padding: 0 0.25rem;
		border-radius: 0.25rem;
		margin-left: 0.25rem;
	}

	.expand-content {
		padding: 0 1rem;
		animation: fadeIn 0.15s ease-out;
	}

	/* ── CTA Row ──────────────────────────────────────────────── */

	.cta-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		gap: 0.5rem;
	}

	.cta-contacts {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.cta-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--dash-text-secondary);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid var(--dash-border);
		transition: all 0.12s ease;
	}

	.cta-link:hover {
		color: var(--dash-text);
		border-color: var(--dash-text-muted);
	}

	.cta-wa {
		color: #16a34a;
		border-color: #dcfce7;
	}

	.cta-wa:hover {
		background: #f0fdf4;
		border-color: #bbf7d0;
	}

	.cta-file {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-btn-text);
		background: var(--dash-btn-bg);
		padding: 0.4375rem 0.875rem;
		border-radius: 0.4375rem;
		text-decoration: none;
		transition: all 0.12s ease;
	}

	.cta-file:hover {
		opacity: 0.9;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.15);
	}

	/* ── Red Card ─────────────────────────────────────────────── */

	.red-collapsed {
		padding: 0.75rem 1rem;
	}

	.red-reason {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
	}

	.red-expand {
		margin-top: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	/* ── URGENT Badge ────────────────────────────────────────── */

	.badge-urgent {
		background: rgba(239, 68, 68, 0.12);
		color: #dc2626;
		animation: urgentPulse 2s ease-in-out infinite;
	}

	@keyframes urgentPulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	/* ── Tranche Section ─────────────────────────────────────── */

	/* ── NRI GPA Banner ──────────────────────────────────────── */

	.nri-gpa-banner {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 1rem;
		background: rgba(59, 130, 246, 0.06);
		border-bottom: 1px solid rgba(59, 130, 246, 0.1);
	}

	.nri-gpa-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: #3b82f6;
		flex-shrink: 0;
	}

	.nri-gpa-text {
		font-size: 0.6875rem;
		color: #1e40af;
		font-weight: 500;
	}

	/* ── Guarantor Eligibility Row ──────────────────────────── */
	/* Mirrors the NRI GPA banner shape (compact strip below key metrics)
	   with green/red tint instead of blue. Two states only per the
	   GUARANTOR-ELIGIBILITY-ASSESSMENT spec — no expand/collapse, no
	   per-lender table. */

	.guarantor-row {
		display: flex;
		align-items: center;
		gap: 0.4375rem;
		padding: 0.4375rem 1rem;
		font-size: 0.6875rem;
		font-weight: 500;
	}

	.guarantor-accepted {
		background: rgba(16, 185, 129, 0.06);
		border-bottom: 1px solid rgba(16, 185, 129, 0.1);
		color: #065f46;
	}

	.guarantor-rejected {
		background: rgba(239, 68, 68, 0.06);
		border-bottom: 1px solid rgba(239, 68, 68, 0.1);
		color: #991b1b;
	}

	.guarantor-icon {
		font-weight: 700;
		flex-shrink: 0;
	}

	.guarantor-accepted .guarantor-icon {
		color: #059669;
	}

	.guarantor-rejected .guarantor-icon {
		color: #dc2626;
	}

	/* ── BT Appreciation ─────────────────────────────────────── */

	.bt-appreciation {
		font-weight: 700;
	}

	.bt-strong {
		color: #059669;
	}

	.bt-moderate {
		color: #b45309;
	}

	.bt-weak {
		color: #78716c;
	}

	.bt-negative {
		color: #dc2626;
	}

	/* ── Mobile ───────────────────────────────────────────────── */

	@media (max-width: 640px) {
		.metrics {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
			padding: 0.875rem 0.875rem;
		}

		.metric + .metric {
			border-left: none;
		}

		.metric:nth-child(odd) {
			border-right: 1px solid var(--dash-border);
		}

		.metric:nth-child(n + 3) {
			border-top: 1px solid var(--dash-border);
			padding-top: 0.5rem;
		}

		.metric-val {
			font-size: 1rem;
		}

		.lender-name {
			font-size: 0.875rem;
		}

		.card-header {
			flex-wrap: wrap;
			padding: 0.75rem 0.875rem;
		}

		.cta-row {
			flex-direction: column;
			gap: 0.375rem;
			padding: 0.625rem 0.875rem;
		}

		.cta-row > div,
		.cta-contacts {
			width: 100%;
		}

		.cta-file {
			width: 100%;
			justify-content: center;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-2px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
