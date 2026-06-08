<script lang="ts">
	/**
	 * ObligationCapture — 2-Section Obligation Capture
	 * ══════════════════════════════════════════════════════════════════
	 * Section 1 (top): Always-visible form for adding/editing obligations
	 * Section 2 (bottom): Table of saved obligation entries
	 *
	 * The form stays visible after each add so users can quickly enter
	 * multiple obligations. Saved entries appear in a scannable table.
	 * ══════════════════════════════════════════════════════════════════
	 */
	import SelectField from './SelectField.svelte';
	import TextField from './TextField.svelte';
	import { bankData } from '$lib/config/bankSelection/bankName';
	import { v4 as uuidv4 } from 'uuid';
	import { Check, Plus, Trash2, Pencil, TriangleAlert } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n';
	import type {
		ObligationEntry,
		ObligationRole,
		EvidenceLevel,
		EmiPaidBy,
		EmiDelayHistory
	} from '$lib/types/obligation';
	import { computeApplicantEmiShare } from '$lib/utils/emiShareCalculator';
	import {
		getLoanTypesForApplicant,
		deriveFacilityType,
		isInstaLoan,
		getClosureOptionsFiltered,
		ROLE_OPTIONS,
		EVIDENCE_OPTIONS,
		EMI_PAID_BY_OPTIONS,
		CO_APPLICANT_COUNT_OPTIONS,
		EMI_DELAY_OPTIONS
	} from '$lib/config/obligationOptions';
	import {
		hasPendingValidEntry as computeHasPendingValidEntry,
		computeEmiMismatch
	} from './obligationCaptureLogic';

	// ── Props ────────────────────────────────────────────────────
	interface Props {
		loanProduct: string;
		currentAnswers: Record<string, any>;
		onupdateApplicant?: ((data: Record<string, any>) => void) | null;
		allApplicants?: any[];
		currentApplicantIndex?: number;
		loanScope?: string;
		onObligationsRunningChange?: (value: string) => void;
		/** Notifies parent when the form has a valid pending entry (for Done button logic) */
		onPendingValidChange?: (hasPendingValid: boolean) => void;
	}

	let {
		loanProduct,
		currentAnswers = $bindable({}),
		onupdateApplicant = null,
		allApplicants = [],
		currentApplicantIndex = 0,
		loanScope = '',
		onObligationsRunningChange,
		onPendingValidChange
	}: Props = $props();

	// ── Determine applicant type for loan type filtering ─────────
	const applicantType = $derived(
		(allApplicants[currentApplicantIndex]?.applicantType as 'Individual' | 'Company') ??
			'Individual'
	);

	// ── Obligation running toggle ────────────────────────────────
	const SCOPES_THAT_IMPLY_OBLIGATIONS = [
		'Debt Consolidation',
		'Debt Consolidation with Extra Funds'
	];
	let isObligationImplied = $derived(SCOPES_THAT_IMPLY_OBLIGATIONS.includes(loanScope));

	// BT/Top-up cases: the loan being transferred or topped-up is captured on a SEPARATE page,
	// so we warn users NOT to enter it here (would double-count in FOIR).
	// Debt Consolidation: obligation IS entered here, marked "Close — Self Funded".
	//
	// Substring match (not exact equality) intentionally: catches both
	// 'Top-up Only' and 'Balance Transfer With Top-up' under a single check.
	// Renamed from `loanVariant` → `loanScope` 2026-06-01 (S209,
	// TECH-DEBT-CLEANUP D1/D2) — prop now tells the truth about what it carries.
	const isBTCase = $derived(loanScope?.includes('Balance Transfer'));
	const isTopUpCase = $derived(loanScope?.includes('Top-up'));
	const showBTWarning = $derived(isBTCase || isTopUpCase);

	$effect(() => {
		if (isObligationImplied && currentAnswers.ObligationsRunning !== 'Yes') {
			currentAnswers.ObligationsRunning = 'Yes';
			onObligationsRunningChange?.('Yes');
		}
	});

	// Show obligation form when: debt consolidation implied, OR has existing loans, OR is guarantor on someone else's loan
	let showObligationForm = $derived(
		isObligationImplied ||
			currentAnswers.ObligationsRunning === 'Yes' ||
			currentAnswers.isGuarantorOnOtherLoan === 'Yes'
	);

	// When user said No to running obligations but Yes to guarantor,
	// only Guarantor role is valid — co-borrower entries are hidden
	const guarantorOnlyMode = $derived(
		currentAnswers.ObligationsRunning === 'No' && currentAnswers.isGuarantorOnOtherLoan === 'Yes'
	);

	// ── Entries array ────────────────────────────────────────────
	let entries: ObligationEntry[] = $derived(
		Array.isArray(currentAnswers.obligations) ? currentAnswers.obligations : []
	);

	// Count of entries visible in current mode (hides co-borrower entries in guarantor-only mode)
	let visibleEntryCount = $derived(
		guarantorOnlyMode ? entries.filter((e: any) => e.role === 'guarantor').length : entries.length
	);

	// ── Form state ───────────────────────────────────────────────
	// No isAdding toggle — form is always visible when ObligationsRunning = Yes
	let editingIndex = $state(-1);

	// Form fields
	let loanType = $state('');
	let bankName = $state('');
	let emi = $state('');
	let tenure = $state('');
	let interestRate = $state('');
	let principalOutstanding = $state('');
	let sanctionedLimit = $state('');
	let utilizedAmount = $state('');
	let role: ObligationRole = $state('co_applicant');
	let borrowerCount = $state(1);
	let coApplicantNames: string[] = $state([]);
	let hasProofOverride = $state(false);
	let monthlyShare = $state('');
	let evidence: EvidenceLevel = $state('no_documents');
	let selectedToClose = $state('Keep running');
	let emiPaidBy: EmiPaidBy = $state('self');
	let emiDelayHistory: EmiDelayHistory = $state('none');

	let errors: Record<string, string> = $state({});

	// ── Derived from loan type ───────────────────────────────────
	const facilityType = $derived(deriveFacilityType(loanType));
	const isTermLoan = $derived(facilityType === 'term_loan');
	const isCreditLine = $derived(facilityType === 'credit_line');
	const isDropline = $derived(facilityType === 'dropline');
	const isInsta = $derived(isInstaLoan(loanType));

	// ── Loan type options ────────────────────────────────────────
	const loanTypeOptions = $derived(
		getLoanTypesForApplicant(applicantType).map((o) => ({ label: o.label, value: o.value }))
	);

	// ── Closure options (filtered by context) ────────────────────
	// Pitfall #58: a Director/Partner under a corporate DC case must not see
	// "Close by this loan" on their personal obligations — corporate loans
	// can only close company-level debt.
	const caseHasCompany = $derived(allApplicants.some((a) => a?.applicantType === 'Company'));
	const closureOpts = $derived(
		getClosureOptionsFiltered(role, loanType, loanScope, applicantType, caseHasCompany).map(
			(o) => ({
				label: o.label,
				value: o.value
			})
		)
	);

	// ── Role filtering ──────────────────────────────────────────
	// Auto-set role to guarantor when in guarantor-only mode (new entry form)
	$effect(() => {
		if (guarantorOnlyMode && role !== 'guarantor') {
			role = 'guarantor';
		}
	});

	const filteredRoleOptions = $derived(
		guarantorOnlyMode ? ROLE_OPTIONS.filter((o) => o.value === 'guarantor') : ROLE_OPTIONS
	);

	// ── ShowWhen derived states ──────────────────────────────────
	const isGuarantor = $derived((role as string) === 'guarantor');
	const hasMultipleApplicants = $derived(borrowerCount > 1);
	const showCoApplicantNames = $derived(!isGuarantor && hasMultipleApplicants);
	const showShareSection = $derived(!isGuarantor && hasMultipleApplicants);
	const showEmiPaidBy = $derived((selectedToClose as string) === 'Keep running');
	const showEmiDelay = $derived(!(selectedToClose as string).startsWith('Not my'));

	// Filter "Co-Applicant" out of EMI paid by options when borrowerCount is 1 ("Just me").
	// If you're the only person on this loan, a co-applicant can't be paying the EMI.
	const filteredEmiPaidByOptions = $derived(
		borrowerCount <= 1
			? EMI_PAID_BY_OPTIONS.filter((o) => o.value !== 'co_applicant')
			: EMI_PAID_BY_OPTIONS
	);

	// Auto-reset emiPaidBy when borrowerCount drops to 1 and "co_applicant" was selected
	$effect(() => {
		if (borrowerCount <= 1 && emiPaidBy === 'co_applicant') {
			emiPaidBy = 'self';
		}
	});

	// ── EMI cross-check (pure math in obligationCaptureLogic.computeEmiMismatch) ──
	const emiMismatchWarning = $derived.by(() => {
		const result = computeEmiMismatch({
			loanType,
			principalOutstanding,
			tenure,
			interestRate,
			emi
		});
		if (!result.triggered) return '';
		return `Calculated EMI is ${formatCurrency(result.calculatedEmi)} based on principal, tenure & rate. Difference of ${formatCurrency(result.difference)} — please verify these details with the lender.`;
	});

	// ── Pending form validity (pure check in obligationCaptureLogic.hasPendingValidEntry) ──
	const hasPendingValidEntry = $derived.by(() =>
		computeHasPendingValidEntry({ loanType, bankName, emi, tenure, sanctionedLimit })
	);

	// Notify parent whenever pending validity changes
	$effect(() => {
		onPendingValidChange?.(hasPendingValidEntry);
		return () => {
			onPendingValidChange?.(false);
		};
	});

	// ── Auto-behaviors ───────────────────────────────────────────

	// Guarantor: auto-set closure to "Not my liability"
	$effect(() => {
		if (isGuarantor) {
			selectedToClose = 'Not my actual liability (Guarantor/Paper only)';
			borrowerCount = 1;
			coApplicantNames = [];
		}
	});

	// Insta Loan: auto-select "Close - self funded"
	$effect(() => {
		if (isInsta && selectedToClose === 'Keep running') {
			selectedToClose = 'Self-funded closure before disbursement';
		}
	});

	// Single applicant: auto full responsibility
	$effect(() => {
		if (borrowerCount <= 1) {
			hasProofOverride = false;
			monthlyShare = '';
		}
	});

	// Resize co-applicant names array
	$effect(() => {
		const needed = Math.max(0, borrowerCount - 1);
		if (coApplicantNames.length !== needed) {
			const updated = [...coApplicantNames];
			while (updated.length < needed) updated.push('');
			coApplicantNames = updated.slice(0, needed);
		}
	});

	// ── Loan-type-aware validation limits ────────────────────────
	// Different loan types have different practical ranges for
	// tenure, interest rate, EMI, and principal outstanding.

	interface ValidationLimits {
		emiMin: number;
		emiMax: number;
		tenureMin: number;
		tenureMax: number;
		rateMin: number;
		rateMax: number;
		principalMin: number;
		principalMax: number;
	}

	function getLimitsForLoanType(loan: string): ValidationLimits {
		// Secured high-value: Home, LAP, Plot — NBFCs now offer up to 40 years
		if (['Home Loan', 'Plot & Construction', 'Loan Against Property'].includes(loan)) {
			return {
				emiMin: 1000,
				emiMax: 10_00_000,
				tenureMin: 1,
				tenureMax: 480,
				rateMin: 5,
				rateMax: 48,
				principalMin: 1_00_000,
				principalMax: 50_00_00_000
			};
		}
		if (['Business Loan (Secured)', 'Machinery Loan'].includes(loan)) {
			return {
				emiMin: 1000,
				emiMax: 10_00_000,
				tenureMin: 1,
				tenureMax: 300,
				rateMin: 8,
				rateMax: 48,
				principalMin: 50_000,
				principalMax: 50_00_00_000
			};
		}

		// Vehicle — some NBFCs go up to 10 years, rates up to 30%
		if (loan === 'Vehicle Loan') {
			return {
				emiMin: 1000,
				emiMax: 5_00_000,
				tenureMin: 1,
				tenureMax: 120,
				rateMin: 5,
				rateMax: 30,
				principalMin: 50_000,
				principalMax: 2_00_00_000
			};
		}

		// Education — moratorium can extend effective tenure
		if (loan === 'Education Loan') {
			return {
				emiMin: 500,
				emiMax: 2_00_000,
				tenureMin: 1,
				tenureMax: 240,
				rateMin: 5,
				rateMax: 24,
				principalMin: 50_000,
				principalMax: 1_00_00_000
			};
		}

		// Gold — some NBFCs offer up to 48% for short tenures
		if (loan === 'Gold Loan') {
			return {
				emiMin: 500,
				emiMax: 5_00_000,
				tenureMin: 1,
				tenureMax: 60,
				rateMin: 7,
				rateMax: 48,
				principalMin: 10_000,
				principalMax: 1_00_00_000
			};
		}

		// Unsecured: Personal, Consumer Durable, Insta, Credit Card — NBFCs can go high on rates
		if (
			['Personal Loan', 'Consumer Durable Loan', 'Insta Loan', 'Credit Card Dues'].includes(loan)
		) {
			return {
				emiMin: 500,
				emiMax: 5_00_000,
				tenureMin: 1,
				tenureMax: 96,
				rateMin: 8,
				rateMax: 48,
				principalMin: 5_000,
				principalMax: 50_00_000
			};
		}

		// Business unsecured — NBFCs can charge up to 36%+
		if (loan === 'Business Loan (Unsecured)') {
			return {
				emiMin: 1000,
				emiMax: 10_00_000,
				tenureMin: 1,
				tenureMax: 120,
				rateMin: 10,
				rateMax: 48,
				principalMin: 50_000,
				principalMax: 10_00_00_000
			};
		}

		// Fallback for "Other Type Loan" and any unknown — generous limits
		return {
			emiMin: 500,
			emiMax: 10_00_000,
			tenureMin: 1,
			tenureMax: 600,
			rateMin: 0.01,
			rateMax: 99,
			principalMin: 5_000,
			principalMax: 999_00_00_000
		};
	}

	const currentLimits = $derived(getLimitsForLoanType(loanType));

	// ── Validation ───────────────────────────────────────────────

	function validate(): boolean {
		const e: Record<string, string> = {};
		const lim = currentLimits;

		if (!loanType) e.loanType = 'Select loan type';
		if (!bankName) e.bankName = 'Select a bank';

		if (isTermLoan || isInsta) {
			const emiNum = parseFloat(emi);
			if (!emiNum || emiNum < lim.emiMin)
				e.emi = `EMI must be at least ${formatCurrency(lim.emiMin)}`;
			if (emiNum > lim.emiMax) e.emi = `EMI cannot exceed ${formatCurrency(lim.emiMax)}`;

			const tenureNum = parseInt(tenure);
			if (!tenureNum || tenureNum < lim.tenureMin) e.tenure = `Minimum ${lim.tenureMin} month`;
			if (tenureNum > lim.tenureMax) e.tenure = `Maximum ${lim.tenureMax} months for ${loanType}`;

			const rateNum = parseFloat(interestRate);
			if (rateNum && (rateNum < lim.rateMin || rateNum > lim.rateMax))
				e.interestRate = `Rate must be ${lim.rateMin}% – ${lim.rateMax}% for ${loanType}`;

			const principalNum = parseFloat(principalOutstanding);
			if (principalNum) {
				if (principalNum < lim.principalMin)
					e.principalOutstanding = `Minimum ${formatCurrency(lim.principalMin)}`;
				if (principalNum > lim.principalMax)
					e.principalOutstanding = `Maximum ${formatCurrency(lim.principalMax)}`;
			}
		}

		if (isCreditLine || isDropline) {
			const limitNum = parseFloat(sanctionedLimit);
			if (!limitNum || limitNum < 10_000) e.sanctionedLimit = 'Limit must be at least ₹10,000';
			if (limitNum > 100_000_000) e.sanctionedLimit = 'Limit cannot exceed ₹10 Cr';

			const usedNum = parseFloat(utilizedAmount);
			if (usedNum && usedNum > limitNum) e.utilizedAmount = 'Cannot exceed sanctioned limit';
		}

		if (isDropline) {
			const dropEmi = parseFloat(emi);
			if (!dropEmi || dropEmi < 1000) e.emi = 'Monthly reduction must be at least ₹1,000';
			const dropTenure = parseInt(tenure);
			if (dropTenure && dropTenure > lim.tenureMax) e.tenure = `Maximum ${lim.tenureMax} months`;
		}

		if (showShareSection && hasProofOverride) {
			const shareNum = parseFloat(monthlyShare);
			if (!shareNum || shareNum < 0) e.monthlyShare = 'Enter your monthly share';
			if (isTermLoan && shareNum > parseFloat(emi || '0')) {
				e.monthlyShare = 'Share cannot exceed total EMI';
			}
		}

		errors = e;
		return Object.keys(e).length === 0;
	}

	// ── Build entry from form ────────────────────────────────────

	function buildEntry(): ObligationEntry {
		const now = new Date().toISOString();
		const emiNum = parseFloat(emi) || undefined;
		const tenureNum = parseInt(tenure) || undefined;
		const rateNum = parseFloat(interestRate) || undefined;
		const principalNum = parseFloat(principalOutstanding) || undefined;
		const limitNum = parseFloat(sanctionedLimit) || undefined;
		const usedNum = parseFloat(utilizedAmount) || undefined;
		const shareNum = parseFloat(monthlyShare) || undefined;

		// Determine emiResponsibility
		const responsibility = isGuarantor
			? ('full' as const)
			: borrowerCount > 1
				? ('shared' as const)
				: ('full' as const);

		// Compute share for equal split when no proof
		let finalShare = shareNum;
		if (responsibility === 'shared' && !hasProofOverride && borrowerCount > 1) {
			const totalAmount = isTermLoan ? (emiNum ?? 0) : (limitNum ?? 0);
			finalShare = Math.round(totalAmount / borrowerCount);
		}

		// Compute applicantEmiShare using existing calculator for backward compat
		const compatEntry = {
			role: role === 'guarantor' ? 'guarantor' : 'co_borrower',
			emiMethod: hasProofOverride ? 'Custom split (documented)' : 'Equal split',
			emiPaidBy: emiPaidBy ?? 'self',
			borrowerCount: String(borrowerCount),
			hasProofOverride,
			monthlyShare: String(finalShare ?? 0),
			emi: String(emiNum ?? 0),
			totalLimit: String(limitNum ?? 0),
			obligationType: isCreditLine ? 'credit_line' : 'term_loan'
		};
		const computedShare = computeApplicantEmiShare(compatEntry);

		return {
			id: editingIndex >= 0 ? entries[editingIndex].id : uuidv4(),
			loanType,
			bankName,
			...(isTermLoan || isDropline ? { emi: String(emiNum ?? '') } : {}),
			...(isCreditLine || isDropline ? { totalLimit: String(limitNum ?? '') } : {}),
			...(isTermLoan
				? {
						tenure: String(tenureNum ?? ''),
						interestRate: String(rateNum ?? ''),
						principalOutstanding: String(principalNum ?? '')
					}
				: {}),
			...(isDropline ? { tenure: String(tenureNum ?? '') } : {}),
			...(isCreditLine || isDropline
				? { sanctionedLimit: String(limitNum ?? ''), utilizedAmount: String(usedNum ?? '') }
				: {}),
			role,
			borrowerCount,
			...(coApplicantNames.length > 0 ? { coApplicantNames: [...coApplicantNames] } : {}),
			emiResponsibility: responsibility,
			...(responsibility === 'shared' && hasProofOverride
				? { monthlyShare: String(finalShare ?? '') }
				: {}),
			hasProofOverride,
			applicantEmiShare: computedShare,
			evidence,
			selectedToClose,
			...(selectedToClose === 'Keep running' ? { emiPaidBy } : {}),
			...(!(selectedToClose as string).startsWith('Not my') ? { emiDelayHistory } : {}),
			createdAt: editingIndex >= 0 ? entries[editingIndex].createdAt : now,
			updatedAt: now
		};
	}

	// ── Handlers ─────────────────────────────────────────────────

	function handleAdd() {
		if (!validate()) return;
		const entry = buildEntry();
		const updated = [...entries];
		if (editingIndex >= 0) {
			// Editing existing entry — update in place
			updated[editingIndex] = entry;
		} else {
			updated.push(entry);
		}
		currentAnswers.obligations = updated;
		onupdateApplicant?.(currentAnswers);
		// Clear form for next entry (form stays visible)
		clearFormFields();
	}

	function handleEdit(index: number) {
		const e = entries[index] as any;
		if (!e) return;
		loanType = e.loanType ?? '';
		bankName = e.bankName ?? '';
		emi = String(e.emi ?? '');
		tenure = String(e.tenure ?? '');
		interestRate = String(e.interestRate ?? '');
		principalOutstanding = String(e.principalOutstanding ?? '');
		sanctionedLimit = String(e.sanctionedLimit ?? e.totalLimit ?? '');
		utilizedAmount = String(e.utilizedAmount ?? '');
		// Handle legacy role values: primary_borrower, co_borrower → co_applicant
		const legacyRole = e.role ?? e.loanRole ?? 'co_applicant';
		role = legacyRole === 'guarantor' ? 'guarantor' : 'co_applicant';
		borrowerCount = Number(e.borrowerCount) || 1;
		coApplicantNames = Array.isArray(e.coApplicantNames) ? [...e.coApplicantNames] : [];
		hasProofOverride = !!e.hasProofOverride;
		monthlyShare = String(e.monthlyShare ?? '');
		evidence = e.evidence ?? 'no_documents';
		selectedToClose = e.selectedToClose ?? 'Keep running';
		emiPaidBy = e.emiPaidBy ?? 'self';
		emiDelayHistory = e.emiDelayHistory ?? 'none';
		editingIndex = index;
		errors = {};
	}

	function handleDelete(index: number) {
		currentAnswers.obligations = entries.filter((_, i) => i !== index);
		onupdateApplicant?.(currentAnswers);
	}

	/** Clears form fields for entering a new obligation (form stays visible) */
	function clearFormFields() {
		loanType = '';
		bankName = '';
		emi = '';
		tenure = '';
		interestRate = '';
		principalOutstanding = '';
		sanctionedLimit = '';
		utilizedAmount = '';
		role = 'co_applicant';
		borrowerCount = 1;
		coApplicantNames = [];
		hasProofOverride = false;
		monthlyShare = '';
		evidence = 'no_documents';
		selectedToClose = 'Keep running';
		emiPaidBy = 'self';
		emiDelayHistory = 'none';
		editingIndex = -1;
		errors = {};
	}

	/** Cancel editing — clears the form back to add mode */
	function cancelEdit() {
		clearFormFields();
	}

	/**
	 * Called by parent (via bind:this) before modal close.
	 * If the form has valid data, saves it as an entry.
	 * Returns true if an entry was committed.
	 */
	export function commitPendingEntry(): boolean {
		if (!hasPendingValidEntry) return false;
		if (!validate()) return false;
		handleAdd();
		return true;
	}

	// ── Table display helpers ────────────────────────────────────

	function displayAmount(entry: any): string {
		const facility = deriveFacilityType(entry.loanType);
		if (facility === 'term_loan') {
			return entry.emi ? formatCurrency(parseFloat(entry.emi)) : '—';
		}
		const limit = entry.sanctionedLimit || entry.totalLimit;
		return limit ? formatCurrency(parseFloat(limit)) : '—';
	}

	function shortClosure(raw: string): string {
		if (raw.startsWith('Self-funded')) return 'Close (Self)';
		if (raw.startsWith('Will be closed')) return 'Close (Top-up)';
		if (raw.startsWith('Not my')) return 'Not Liable';
		if (raw === 'Keep running') return 'Keep Running';
		return raw;
	}

	// True when a saved obligation's stored closure value is no longer among
	// the visible options for the current journey (e.g. cross-loan restore
	// from Personal-DC to Plot-New leaves "Will be closed by Top-up amount"
	// stranded). Drives the Saved Obligations "Action needed" chip and the
	// page-level Next-disabled gate. See CLAUDE.md Pitfall #31.
	function isClosureStale(entry: {
		selectedToClose?: string;
		role?: string;
		loanType?: string;
	}): boolean {
		const sel = String(entry?.selectedToClose ?? '');
		if (!sel) return false;
		const role = ((entry.role as string | undefined) ||
			'co-applicant') as (typeof ROLE_OPTIONS)[number]['value'];
		// getClosureOptionsFiltered uses the OBLIGATION's loanType (for the LAP
		// special case) and the journey's loanScope.
		const obligationLoanType = String(entry.loanType ?? '');
		// Pitfall #58: re-evaluate staleness with the applicant-type filter.
		// A saved Director "Close by this loan" entry from before the rule
		// became visible-stale once we switched to corporate DC enforcement.
		const visible = getClosureOptionsFiltered(
			role,
			obligationLoanType,
			loanScope,
			applicantType,
			caseHasCompany
		);
		return !visible.some((o) => o.value === sel);
	}

	function shortRole(entryRole: string): string {
		return entryRole === 'guarantor' ? 'Guarantor' : 'Co-App';
	}

	function displayPrincipal(entry: any): string {
		return entry.principalOutstanding
			? formatCurrency(parseFloat(entry.principalOutstanding))
			: '—';
	}
</script>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- OBLIGATIONS RUNNING TOGGLE                                  -->
<!-- ═══════════════════════════════════════════════════════════ -->

{#if !isObligationImplied}
	<div class="mb-5">
		<p class="text-labelQuestion">
			{#if showBTWarning}
				Does the applicant have any other running loans or obligations?
			{:else}
				Does the applicant have any existing loans or obligations?
			{/if}
		</p>
		{#if showBTWarning}
			<p class="smallText mb-3 text-[var(--form-text-label)]">
				Exclude the loan being transferred — it's captured separately.
			</p>
		{/if}
		<div class="flex gap-3">
			{#each [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }] as opt}
				{@const isSelected = currentAnswers.ObligationsRunning === opt.value}
				<button
					type="button"
					class="radio-card text-labelText font-titleMedium !m-0 w-20 rounded-xl !py-2.5 text-center
						{isSelected
						? 'radio-card-selected text-[var(--form-text-label)] '
						: 'text-[var(--form-text-muted)]'}"
					onclick={() => {
						currentAnswers.ObligationsRunning = opt.value;
						onObligationsRunningChange?.(opt.value);
					}}
				>
					<span class="w-full">{opt.label}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- EXTERNAL GUARANTOR LIABILITY QUESTION                       -->
<!-- Asked for applicants on EMI: CIBIL reveals guarantor        -->
<!-- liabilities and lenders reduce eligibility by that amount.  -->
<!-- ═══════════════════════════════════════════════════════════ -->

{#if !isObligationImplied}
	<div class="mb-5">
		<p class="text-labelQuestion">Is this person a guarantor on any other person's loan?</p>
		<p class="smallText mb-3 text-[var(--form-text-label)]">
			CIBIL will reveal this. Lenders may reduce eligibility by the guaranteed EMI amount.
		</p>
		<div class="flex gap-3">
			{#each [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }] as opt}
				{@const isSelected = currentAnswers.isGuarantorOnOtherLoan === opt.value}
				<button
					type="button"
					class="radio-card text-labelText font-titleMedium !m-0 w-20 rounded-xl !py-2.5 text-center
						{isSelected
						? 'radio-card-selected text-[var(--form-text-label)] '
						: 'text-[var(--form-text-muted)]'}"
					onclick={() => {
						currentAnswers.isGuarantorOnOtherLoan = opt.value;
						onupdateApplicant?.({ isGuarantorOnOtherLoan: opt.value });
					}}
				>
					<span class="w-full">{opt.label}</span>
				</button>
			{/each}
		</div>
		{#if currentAnswers.isGuarantorOnOtherLoan === 'Yes'}
			<div class="warning-message mt-3">
				<TriangleAlert class="h-5 w-5 shrink-0" />
				<p class="alertText">
					Please add the guaranteed loan as an obligation below with role set to <strong
						class="font-titleMedium">"Guarantor"</strong
					>. The applicant may need to get their name removed from that guarantee before applying,
					or eligibility could be severely affected.
				</p>
			</div>
		{/if}
	</div>
{/if}

{#if showObligationForm}
	<div class="flex flex-col gap-5">
		<!-- BT/Top-up warning: don't enter the loan being transferred here -->
		{#if showBTWarning}
			<div class="warning-message">
				<TriangleAlert class="h-5 w-5 shrink-0" />
				<div>
					{#if isBTCase}
						<p class="font-titleMedium">Do NOT enter the BT loan here</p>
						<p class="smallText mt-0.5">
							The loan being transferred (Balance Transfer) will be captured separately on the next
							page. Only enter <strong>other</strong> running loans and obligations here. Entering the
							BT loan here would count it twice in FOIR calculation.
						</p>
					{:else}
						<p class="font-titleMedium">Do NOT enter the existing loan being topped-up here</p>
						<p class="smallText mt-0.5">
							The loan being topped-up is captured separately on the next page. Only enter <strong
								>other</strong
							> running loans and obligations here.
						</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- TOP-LEVEL FIELDS (no card — matches Income Details layout) -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		<!-- Editing banner (matches IncomeSourceForm edit banner) -->
		{#if editingIndex >= 0}
			<div
				class="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/40 dark:bg-blue-900/20"
			>
				<Pencil class="h-4 w-4 shrink-0 text-blue-800 dark:text-blue-200" />
				<span class="alertText flex-1 text-blue-800 dark:text-blue-200">
					Editing: <strong
						>{entries[editingIndex]?.loanType} — {entries[editingIndex]?.bankName}</strong
					>
				</span>
				<button
					type="button"
					class="alertText font-titleMedium cursor-pointer text-blue-600 underline-offset-4 hover:text-blue-800 dark:text-blue-400 dark:hover:underline"
					onclick={cancelEdit}
				>
					Cancel Edit
				</button>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-10 sm:grid-cols-2">
			<SelectField
				id="obl_loanType"
				label="Loan Type"
				options={loanTypeOptions}
				value={loanType}
				onChange={(val) => {
					loanType = String(val);
					errors.loanType = '';
				}}
				icon="list"
				error={errors.loanType}
			/>
			<SelectField
				id="obl_bankName"
				label="Bank / Lender"
				options={bankData}
				value={bankName}
				onChange={(val) => {
					bankName = String(val);
					errors.bankName = '';
				}}
				icon="landmark"
				error={errors.bankName}
			/>
		</div>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- LOAN AMOUNTS (subsection card)                             -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		{#if loanType}
			<div
				class="flex flex-col gap-4 border-[var(--form-border)] pt-2 sm:rounded-xl sm:border sm:bg-[var(--form-bg-card)] sm:p-4 sm:shadow-sm"
			>
				<div class="flex items-center gap-2 pb-1">
					<div class="h-1 w-4 rounded-full bg-gradient-to-r from-stone-500 to-neutral-400"></div>
					<span
						class="tinyText font-titleBold text-[var(--form-text-label)] uppercase underline underline-offset-4 sm:no-underline"
					>
						Loan Amounts
					</span>
				</div>

				<div class="grid grid-cols-1 gap-10 sm:grid-cols-2">
					{#if isTermLoan || isDropline}
						<div class="flex flex-col">
							<TextField
								id="obl_emi"
								label={isDropline ? 'Monthly Reduction' : 'EMI Amount'}
								value={emi}
								placeholder="₹"
								type="text"
								uiType="number"
								icon="indian-rupee"
								onInput={(val) => {
									emi = val;
									errors.emi = '';
								}}
							/>
							{#if errors.emi}
								<p class="error-message tinyText mt-1 px-3 py-1.5">
									{errors.emi}
								</p>
							{/if}
						</div>
						<div class="flex flex-col">
							<TextField
								id="obl_tenure"
								label="Remaining Tenure (months)"
								value={tenure}
								placeholder="Months"
								type="text"
								uiType="number"
								icon="calendar"
								onInput={(val) => {
									tenure = val;
									errors.tenure = '';
								}}
							/>
							{#if errors.tenure}
								<p class="error-message tinyText mt-1 px-3 py-1.5">
									{errors.tenure}
								</p>
							{/if}
						</div>
					{/if}

					{#if isTermLoan && !isDropline}
						<div class="flex flex-col">
							<TextField
								id="obl_rate"
								label="Interest Rate %"
								value={interestRate}
								placeholder="e.g. 8.75"
								type="text"
								uiType="number"
								fieldType="percentage"
								icon="percent"
								minLimit={1}
								maxLimit={40}
								onInput={(val) => {
									interestRate = val;
									errors.interestRate = '';
								}}
							/>
							{#if errors.interestRate}<p class="error-message tinyText mt-1 px-3 py-1.5">
									{errors.interestRate}
								</p>{/if}
						</div>
						<div class="flex flex-col">
							<TextField
								id="obl_principal"
								label="Principal Outstanding"
								value={principalOutstanding}
								placeholder="₹"
								type="text"
								uiType="number"
								icon="indian-rupee"
								onInput={(val) => {
									principalOutstanding = val;
									errors.principalOutstanding = '';
								}}
							/>
							{#if errors.principalOutstanding}<p class="error-message tinyText mt-1 px-3 py-1.5">
									{errors.principalOutstanding}
								</p>{/if}
						</div>
					{/if}

					{#if isCreditLine || isDropline}
						<div class="flex flex-col">
							<TextField
								id="obl_limit"
								label="Sanctioned Limit"
								value={sanctionedLimit}
								placeholder="₹"
								type="text"
								uiType="number"
								icon="indian-rupee"
								onInput={(val) => {
									sanctionedLimit = val;
									errors.sanctionedLimit = '';
								}}
							/>
							{#if errors.sanctionedLimit}<p class="error-message tinyText mt-1 px-3 py-1.5">
									{errors.sanctionedLimit}
								</p>{/if}
						</div>
						<div class="flex flex-col">
							<TextField
								id="obl_utilized"
								label="Current Utilization"
								value={utilizedAmount}
								placeholder="₹"
								type="text"
								uiType="number"
								icon="indian-rupee"
								onInput={(val) => {
									utilizedAmount = val;
									errors.utilizedAmount = '';
								}}
							/>
							{#if errors.utilizedAmount}<p class="error-message tinyText mt-1 px-3 py-1.5">
									{errors.utilizedAmount}
								</p>{/if}
						</div>
					{/if}
				</div>

				{#if emiMismatchWarning}
					<div class="warning-message">
						<TriangleAlert class="h-5 w-5 shrink-0" />
						<p class="alertText">{emiMismatchWarning}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- SECTION B: YOUR ROLE                                       -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		{#if loanType}
			<div
				class="flex flex-col gap-4 border-[var(--form-border)] pt-2 sm:rounded-xl sm:border sm:bg-[var(--form-bg-card)] sm:p-4 sm:shadow-sm"
			>
				<div class="flex items-center gap-2 pb-1">
					<div class="h-1 w-4 rounded-full bg-gradient-to-r from-stone-500 to-neutral-400"></div>
					<span
						class="tinyText font-titleBold text-[var(--form-text-label)] uppercase underline underline-offset-4 sm:no-underline"
					>
						Your Role
					</span>
				</div>

				<div class="mb-5">
					<p class="text-labelQuestion">Role on this loan</p>
					<div class="flex gap-3">
						{#each filteredRoleOptions as opt}
							{@const isSelected = role === opt.value}
							<button
								type="button"
								class="radio-card text-labelText font-titleMedium !m-0 rounded-xl !py-2.5 text-center
								{isSelected
									? 'radio-card-selected text-[var(--form-text-label)] '
									: 'text-[var(--form-text-muted)]'}"
								onclick={() => {
									role = opt.value;
								}}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>

				{#if !isGuarantor}
					<div class="mb-5">
						<p class="text-labelQuestion">Total people on this loan (including you)</p>
						<div class="flex items-center gap-2">
							{#each CO_APPLICANT_COUNT_OPTIONS as opt}
								{@const isSelected =
									opt.value < 4 ? borrowerCount === opt.value : borrowerCount >= 4}
								<button
									type="button"
									class="radio-card text-labelText font-titleMedium !m-0 rounded-xl !py-2.5 text-center
								{isSelected
										? 'radio-card-selected text-[var(--form-text-label)] '
										: 'text-[var(--form-text-muted)]'}"
									onclick={() => {
										borrowerCount = opt.value;
									}}
								>
									{opt.label}
								</button>
							{/each}
							{#if borrowerCount >= 4}
								<input
									type="number"
									min="4"
									max="10"
									value={borrowerCount}
									class="smalltext font-titleMedium w-16 rounded-xl border-2 border-transparent bg-[var(--form-bg-card)] px-2 py-1.5 text-center text-[var(--form-text)] shadow-md outline-none"
									style="background-image: linear-gradient(var(--form-bg-card), var(--form-bg-card)), linear-gradient(135deg, var(--ddsa-primary-500), var(--ddsa-accent-500)); background-origin: border-box; background-clip: padding-box, border-box;"
									oninput={(e) => {
										const val = parseInt(e.currentTarget.value);
										if (val >= 4 && val <= 10) borrowerCount = val;
									}}
								/>
								<span class="tinyText text-[var(--form-text-label)]">people</span>
							{/if}
						</div>
					</div>

					{#if showCoApplicantNames}
						<div class="grid grid-cols-1 gap-10 sm:grid-cols-2">
							{#each coApplicantNames as _, i}
								<TextField
									id="obl_coapp_{i}"
									label="Co-applicant {i + 1} name"
									value={coApplicantNames[i]}
									placeholder="Enter name"
									type="text"
									icon="user"
									onInput={(val) => {
										coApplicantNames[i] = val;
									}}
								/>
							{/each}
						</div>
					{/if}

					{#if showShareSection}
						<div class="rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-3">
							<div class="mb-2 flex items-center gap-3">
								<label
									class="alertText font-titleMedium flex items-center gap-2 text-[var(--form-text-label)]"
								>
									<input
										type="checkbox"
										class="accent-[var(--ddsa-primary-500)]"
										bind:checked={hasProofOverride}
									/>
									Proof of EMI split available
								</label>
							</div>
							{#if hasProofOverride}
								<div class="max-w-xs">
									<TextField
										id="obl_share"
										label="Your monthly share"
										value={monthlyShare}
										placeholder="₹"
										type="text"
										uiType="number"
										icon="indian-rupee"
										onInput={(val) => {
											monthlyShare = val;
											errors.monthlyShare = '';
										}}
									/>
									{#if errors.monthlyShare}<p class="error-message tinyText mt-1 px-3 py-1.5">
											{errors.monthlyShare}
										</p>{/if}
								</div>
							{:else}
								{@const totalAmt = isTermLoan
									? parseFloat(emi) || 0
									: parseFloat(sanctionedLimit) || 0}
								{@const equalShare =
									borrowerCount > 0 ? Math.round(totalAmt / borrowerCount) : totalAmt}
								<p class="smallText mt-1 text-[var(--form-text-label)]">
									Equal split: <strong>{formatCurrency(equalShare)}</strong>/month
									<span class="tinyText text-[var(--form-text-muted)]"
										>(total ÷ {borrowerCount})</span
									>
								</p>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- SECTION C: STATUS & DOCUMENTATION                          -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		{#if loanType}
			<div
				class="flex flex-col gap-4 border-[var(--form-border)] pt-2 sm:rounded-xl sm:border sm:bg-[var(--form-bg-card)] sm:p-4 sm:shadow-sm"
			>
				<div class="flex items-center gap-2 pb-1">
					<div class="h-1 w-4 rounded-full bg-gradient-to-r from-stone-500 to-neutral-400"></div>
					<span
						class="tinyText font-titleBold text-[var(--form-text-label)] uppercase underline underline-offset-4 sm:no-underline"
					>
						Status & Documentation
					</span>
				</div>

				<div class="grid grid-cols-1 gap-10 sm:grid-cols-2">
					<SelectField
						id="obl_evidence"
						label="Documentary Evidence"
						options={EVIDENCE_OPTIONS}
						value={evidence}
						onChange={(val) => {
							evidence = val as EvidenceLevel;
						}}
						icon="file-text"
					/>

					{#if showEmiPaidBy}
						<SelectField
							id="obl_paidBy"
							label="EMI paid by"
							options={filteredEmiPaidByOptions}
							value={emiPaidBy}
							onChange={(val) => {
								emiPaidBy = val as EmiPaidBy;
							}}
							icon="wallet"
						/>
					{/if}

					<div>
						<p class="text-labelQuestion">Closure plan</p>
						<div class="flex flex-wrap gap-2">
							{#each closureOpts as opt}
								{@const isSelected = selectedToClose === opt.value}
								<button
									type="button"
									class="radio-card font-titleMedium tinyText !m-0 rounded-xl !py-2.5 text-center
								{isSelected
										? 'radio-card-selected text-[var(--form-text-label)]'
										: 'text-[var(--form-text-muted)]'}"
									onclick={() => {
										selectedToClose = opt.value;
									}}
									disabled={isGuarantor}
								>
									{opt.label}
								</button>
							{/each}
						</div>
						{#if isObligationImplied}
							<p class="tinyText mt-2 text-primary">
								Select <strong>"Close by this new loan"</strong> for the loan being consolidated by this
								application.
							</p>
						{/if}
					</div>

					{#if showEmiDelay}
						<div>
							<p class="text-labelQuestion">EMI delay history</p>
							<div class="flex gap-2">
								{#each EMI_DELAY_OPTIONS as opt}
									{@const isSelected = emiDelayHistory === opt.value}
									<button
										type="button"
										class="radio-card font-titleMedium tinyText !m-0 rounded-xl !py-2.5 text-center
											{isSelected
											? 'radio-card-selected text-[var(--form-text-label)]'
											: 'text-[var(--form-text-muted)]'}"
										onclick={() => {
											emiDelayHistory = opt.value as EmiDelayHistory;
										}}
									>
										{opt.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="grid grid-cols-1 gap-10 sm:grid-cols-2"></div>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- ADD / UPDATE BUTTON                                        -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		<button
			type="button"
			class="nav-btn-gradient buttonText font-titleMedium flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[var(--bg-header-text)] shadow-[0_4px_12px_rgba(221,190,169,0.25)] transition-all hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(221,190,169,0.35)] active:scale-[0.98]"
			onclick={handleAdd}
		>
			{#if editingIndex >= 0}
				<Check class="h-4 w-4" />
				Update Obligation
			{:else}
				<Plus class="h-4 w-4" />
				Add Obligation to List
			{/if}
		</button>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- SAVED ENTRIES — Cards                                      -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		{#if visibleEntryCount > 0}
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<div class="h-1 w-4 rounded-full bg-gradient-to-r from-stone-500 to-neutral-400"></div>
					<span
						class="tinyText font-titleBold text-[var(--form-text-label)] uppercase underline underline-offset-4 sm:no-underline"
					>
						Saved Obligations ({visibleEntryCount})
					</span>
				</div>
				{#each entries as entry, i (entry.id)}
					{@const isHiddenInGuarantorMode =
						guarantorOnlyMode && (entry as any).role !== 'guarantor'}
					{#if !isHiddenInGuarantorMode}
						<div
							class="rounded-2xl border-2 p-4 transition-all duration-300
							{editingIndex === i
								? 'radio-card-selected'
								: 'border-[var(--form-border)] bg-[var(--form-bg-card)] hover:scale-[1.01] hover:border-[var(--form-border-hover)] hover:shadow-md'}"
						>
							<!-- Row 1: Loan identity + amounts -->
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="alertText font-titleMedium !m-0 text-[var(--form-text-secondary)]"
											>{entry.loanType}</span
										>
										<span class="tinyText text-[var(--form-text-label)]">— {entry.bankName}</span>
									</div>
									<div
										class="smallText mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[var(--form-text-label)]"
									>
										<span
											>EMI: <strong class="font-titleMedium !m-0 text-[var(--form-text-secondary)]"
												>{displayAmount(entry)}</strong
											></span
										>
										{#if entry.tenure}
											<span
												>Tenure: <strong
													class="font-titleMedium !m-0 text-[var(--form-text-secondary)]"
													>{entry.tenure}mo</strong
												></span
											>
										{/if}
										{#if (entry as any).principalOutstanding}
											<span
												>Principal: <strong
													class="font-titleMedium !m-0 text-[var(--form-text-secondary)]"
													>{displayPrincipal(entry)}</strong
												></span
											>
										{/if}
										{#if (entry as any).interestRate}
											<span
												>Rate: <strong
													class="font-titleMedium !m-0 text-[var(--form-text-secondary)]"
													>{(entry as any).interestRate}%</strong
												></span
											>
										{/if}
									</div>
								</div>
								<div class="flex shrink-0 gap-1">
									<button
										type="button"
										class="cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]"
										onclick={() => handleEdit(i)}
										title="Edit"
									>
										<Pencil class="h-4 w-4" />
									</button>
									<button
										type="button"
										class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-500"
										onclick={() => handleDelete(i)}
										title="Delete"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</div>

							<!-- Row 2: Status badges -->
							<div class="mt-2.5 flex flex-wrap gap-2">
								<span
									class="tinyText font-titleMedium inline-flex items-center rounded-full border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-2.5 py-0.5 text-[var(--form-text-label)]"
								>
									{shortRole(entry.role)}{entry.borrowerCount > 1
										? ` (1 of ${entry.borrowerCount})`
										: ''}
								</span>
								{#if isClosureStale(entry)}
									<span
										class="tinyText font-titleMedium inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400"
										title="Stored closure plan ({shortClosure(
											entry.selectedToClose ?? ''
										)}) is not valid for this loan journey. Edit the obligation and pick a closure plan."
									>
										⚠ Action needed
									</span>
								{:else}
									<span
										class="tinyText font-titleMedium inline-flex items-center rounded-full border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-2.5 py-0.5 text-[var(--form-text-label)]"
									>
										{shortClosure(entry.selectedToClose ?? 'Keep running')}
									</span>
								{/if}
								{#if entry.evidence && entry.evidence !== 'no_documents'}
									<span
										class="tinyText font-titleMedium inline-flex items-center rounded-full border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-2.5 py-0.5 text-[var(--form-text-label)]"
									>
										{entry.evidence === 'sanction_and_statement'
											? 'SL + BS'
											: entry.evidence === 'statement_only'
												? 'BS'
												: entry.evidence === 'sanction_only'
													? 'SL'
													: 'CIBIL'}
									</span>
								{/if}
								{#if entry.emiPaidBy && entry.emiPaidBy !== 'self'}
									<span
										class="tinyText font-titleMedium inline-flex items-center rounded-full border border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] px-2.5 py-0.5 text-[var(--ddsa-primary-500)]"
									>
										Paid by: {entry.emiPaidBy}
									</span>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Reuse nav-btn-gradient from Company.svelte for the Add button */
	:global(.nav-btn-gradient) {
		background: linear-gradient(
			to right,
			var(--ddsa-primary-500) 0%,
			var(--ddsa-accent-500) 51%,
			var(--ddsa-primary-500) 100%
		);
		background-size: 200% auto;
		transition: all 0.4s ease;
	}
	:global(.nav-btn-gradient:hover:not(:disabled)) {
		background-position: right center;
	}
</style>
