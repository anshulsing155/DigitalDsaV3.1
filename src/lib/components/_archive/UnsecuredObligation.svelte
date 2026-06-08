<script lang="ts">
	import SelectField from './SelectField.svelte';
	import RadioField from './RadioField.svelte';
	import { bankData } from '$lib/config/bankSelection/bankName';
	import { onMount } from 'svelte';
	import { ChevronDown, ChevronUp, Check, AlertCircle } from '$lib/utils/iconRegistry';
	import TextField from './TextField.svelte';
	import InterestRateTextField from './InterestRateTextField.svelte';
	import ObligationTable from './ObligationTable.svelte';
	import { openModal } from '$lib/stores/modal';
	import { computeApplicantEmiShare, parseBorrowerCount } from '$lib/utils/emiShareCalculator';
	import { formatCurrency } from '$lib/i18n';
	import { userRelationships } from '$lib/components/relationship-capture/relationshipStore';
	import { getFilteredCapacityOptions, needsCapacityEntity, getCapacityEntityLabel } from '$lib/config/incomeProfiles/obligationEnhancements';
	import type { IncomeProfileType } from '$lib/types/incomeProfile';

	interface Props {
		loanProduct: string;
		currentAnswers: Record<string, any>;
		onupdateApplicant?: ((data: Record<string, any>) => void) | null;
		/** All applicants in the application (for co-borrower dropdown) */
		allApplicants?: any[];
		/** Index of current applicant being edited */
		currentApplicantIndex?: number;
		/** Loan sub-type for DC/BT auto-detection (e.g. 'Debt Consolidation', 'Balance Transfer Only') */
		loanVariant?: string;
		/** Callback when ObligationsRunning value changes */
		onObligationsRunningChange?: (value: string) => void;
		/** Whether emiPaidBy is mandatory on every obligation (no income or mismatch) */
		emiPaidByRequired?: boolean;
	}

	let {
		loanProduct,
		currentAnswers = $bindable({}),
		onupdateApplicant = null,
		allApplicants = [],
		currentApplicantIndex = 0,
		loanVariant = '',
		onObligationsRunningChange,
		emiPaidByRequired = false
	}: Props = $props();

	// ═══════════════════════════════════════════════════════════════
	// OBLIGATIONS RUNNING QUESTION (moved from CreditScoreSection)
	// ═══════════════════════════════════════════════════════════════

	// DC/BT types imply existing obligations — skip the question, auto-Yes
	const OBLIGATION_IMPLIED_TYPES = [
		'Debt Consolidation',
		'Debt Consolidation with Extra Funds'
	];

	let isObligationImplied = $derived(OBLIGATION_IMPLIED_TYPES.includes(loanVariant));

	// Auto-set ObligationsRunning to 'Yes' for DC/BT types
	$effect(() => {
		if (isObligationImplied && currentAnswers.ObligationsRunning !== 'Yes') {
			currentAnswers.ObligationsRunning = 'Yes';
			onObligationsRunningChange?.('Yes');
		}
	});

	let showObligationForm = $derived(
		isObligationImplied || currentAnswers.ObligationsRunning === 'Yes'
	);

	let showMessageOnBt = $derived(
		(() => {
			const obligations = Array.isArray(currentAnswers?.obligations)
				? currentAnswers.obligations
				: [
						...(Array.isArray(currentAnswers?.tableLoanEntries)
							? currentAnswers.tableLoanEntries
							: []),
						...(Array.isArray(currentAnswers?.tableLimitEntries)
							? currentAnswers.tableLimitEntries
							: [])
					];
			return obligations.some(
				(item: any) => item?.selectedToClose === 'Will be closed by Top-up amount'
			);
		})()
	);

	// ═══════════════════════════════════════════════════════════════
	// CLOSURE OPTIONS (enhanced with 4th option)
	// ═══════════════════════════════════════════════════════════════

	const closureOptions = [
		{
			label: 'Self-funded (before loan disbursement)',
			value: 'Self-funded (before loan disbursement)'
		},
		{ label: 'Will be closed by Top-up amount', value: 'Will be closed by Top-up amount' },
		{ label: 'Keep running', value: 'Keep running' },
		{
			label: 'Not my actual liability (Guarantor/Paper only)',
			value: 'Not my actual liability'
		}
	];

	onMount(() => {
		if (currentAnswers) {
			// Migrate legacy split arrays to unified obligations[]
			if (!Array.isArray(currentAnswers.obligations)) {
				currentAnswers.obligations = [
					...(currentAnswers.tableLoanEntries || []),
					...(currentAnswers.tableLimitEntries || [])
				];
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// LOAN TYPE OPTIONS (unchanged)
	// ═══════════════════════════════════════════════════════════════

	let personalLoanType = [
		{ label: 'Home Loan', value: 'Home Loan' },
		{ label: 'Plot and Construction Loan', value: 'Plot and Construction Loan' },
		{ label: 'Loan Against Property', value: 'Loan Against Property' },
		{ label: 'Personal Loan', value: 'Personal Loan' },
		{ label: 'Vehicle Loan', value: 'Vehicle Loan' },
		{ label: 'Gold Loan', value: 'Gold Loan' },
		{ label: 'Credit Card Loan', value: 'Credit Card Loan' },
		{ label: 'Consumer Durable Loan', value: 'Consumer Durable Loan' },
		{ label: 'Education Loan', value: 'Education Loan' },
		{ label: 'Insta Loan', value: 'Insta Loan' },
		{ label: 'Business Loan - Unsecured', value: 'Business Loan - Unsecured' },
		{ label: 'OD Limit', value: 'OD Limit' },
		{ label: 'CC Limit', value: 'CC Limit' },
		{ label: 'Dropline OD', value: 'Dropline OD' },
		{ label: 'Other Type Loan', value: 'Other Type Loan' }
	];
	let businessLoanType = [
		{ label: 'Business Loan - Unsecured', value: 'Business Loan - Unsecured' },
		{ label: 'Business Loan - Secured', value: 'Business Loan - Secured' },
		{ label: 'Loan Against Property', value: 'Loan Against Property' },
		{ label: 'Machinery Loan', value: 'Machinery Loan' },
		{ label: 'Vehicle Loan', value: 'Vehicle Loan' },
		{ label: 'Property Loan', value: 'Property Loan' },
		{ label: 'OD Limit', value: 'OD Limit' },
		{ label: 'CC Limit', value: 'CC Limit' },
		{ label: 'Dropline OD', value: 'Dropline OD' },
		{ label: 'Other Type Loan', value: 'Other Type Loan' }
	];
	let professionalLoanType = [
		{ label: 'Home Loan', value: 'Home Loan' },
		{ label: 'Plot and Construction Loan', value: 'Plot and Construction Loan' },
		{ label: 'Loan Against Property', value: 'Loan Against Property' },
		{ label: 'Personal Loan', value: 'Personal Loan' },
		{ label: 'Vehicle Loan', value: 'Vehicle Loan' },
		{ label: 'Gold Loan', value: 'Gold Loan' },
		{ label: 'Credit Card Loan', value: 'Credit Card Loan' },
		{ label: 'Consumer Durable Loan', value: 'Consumer Durable Loan' },
		{ label: 'Education Loan', value: 'Education Loan' },
		{ label: 'Insta Loan', value: 'Insta Loan' },
		{ label: 'Business Loan - Unsecured', value: 'Business Loan - Unsecured' },
		{ label: 'Business Loan - Secured', value: 'Business Loan - Secured' },
		{ label: 'Machinery Loan', value: 'Machinery Loan' },
		{ label: 'OD Limit', value: 'OD Limit' },
		{ label: 'CC Limit', value: 'CC Limit' },
		{ label: 'Dropline OD', value: 'Dropline OD' },
		{ label: 'Other Type Loan', value: 'Other Type Loan' }
	];

	let loanTypeOptions = $derived(
		loanProduct == 'Business Loan'
			? businessLoanType
			: loanProduct == 'Professional Loan'
				? professionalLoanType
				: personalLoanType
	);

	// ═══════════════════════════════════════════════════════════════
	// LIABILITY OPTIONS
	// ═══════════════════════════════════════════════════════════════

	const roleOptions = [
		{ label: 'Primary Borrower', value: 'Primary Borrower' },
		{ label: 'Co-Borrower', value: 'Co-Borrower' },
		{ label: 'Guarantor', value: 'Guarantor' },
		{ label: 'Name Lender (on paper only)', value: 'Name Lender' }
	];

	const capacityOptions = $derived(
		getFilteredCapacityOptions(
			(currentAnswers?.selectedIncomeProfiles ?? []) as IncomeProfileType[]
		).map((o) => ({ label: o.label, value: o.value, description: o.labelDescription }))
	);

	const NON_PRIMARY_ROLES = ['Guarantor', 'Name Lender'];

	const emiPaidByOptions = [
		{ label: 'I pay from my own income', value: 'self' },
		{ label: 'Spouse / Partner pays', value: 'spouse' },
		{ label: 'Parent (Father/Mother) pays', value: 'parent' },
		{ label: 'Child (Son/Daughter) pays', value: 'child' },
		{ label: 'Sibling (Brother/Sister) pays', value: 'sibling' },
		{ label: 'Other Family Member pays', value: 'other_family' },
		{ label: 'Employer / Business pays', value: 'employer_business' }
	];

	const emiPaymentModeOptions = [
		{ label: 'They transfer money to my account', value: 'transfer_to_mine' },
		{ label: 'They pay directly to the bank/lender', value: 'direct_to_bank' },
		{ label: 'Auto-debit from their account', value: 'auto_debit_theirs' },
		{ label: 'Mixed / Irregular arrangement', value: 'mixed' }
	];

	// Dynamic co-borrower options from other applicants in this application
	let coApplicantOptions = $derived(
		(allApplicants || [])
			.map((a: any, idx: number) => ({
				label: a.fullNameOfApplicant || a.companyName || `Applicant ${idx + 1}`,
				value: String(idx)
			}))
			.filter((_: any, idx: number) => idx !== currentApplicantIndex)
	);

	// ═══════════════════════════════════════════════════════════════
	// DOCUMENT CHIP OPTIONS
	// ═══════════════════════════════════════════════════════════════

	const documentChipOptions = [
		{ label: 'Sanction Letter', value: 'sanctionLetter' },
		{ label: 'Disbursement Letter', value: 'disbursementLetter' },
		{ label: 'Repayment Schedule', value: 'repaymentSchedule' },
		{ label: 'Foreclosure Letter', value: 'foreclosureLetter' },
		{ label: 'Insurance Policy', value: 'insurancePolicy' }
	];

	// ═══════════════════════════════════════════════════════════════
	// APPLICANT STATE (existing + new fields)
	// ═══════════════════════════════════════════════════════════════

	let applicant = $state({
		// Section 1 — Existing loan details
		currentLoanType: '',
		currentBankName: '',
		currentSelectedToClose: '',
		currentEmi: '',
		currentTotalLimit: '',
		currentTenure: '',
		currentInterestRate: '',
		currentSanctionAmount: '',
		currentSanctionTenure: '',
		currentUtilizedAmount: '',
		// Section 2 — Liability (NEW)
		currentRole: '',
		currentCapacity: '',
		currentCapacityEntityName: '',
		currentBorrowerCount: '',
		currentEmiMethod: '',
		currentCoApplicantInApp: '',
		currentLinkedApplicant: '',
		currentMonthlyShare: '',
		currentHasProofOverride: false,
		// EMI Delay History (Home Loan Redesign)
		currentEmiDelayHistory: '',
		// EMI Payment Source (who actually provides the money)
		currentEmiPaidBy: '',
		currentEmiPaymentMode: '',
		currentEmiPaidByName: '',
		// Section 3 — Documents (NEW)
		currentDocuments: [] as string[],
		currentForeclosureAmount: '',
		currentForeclosureCharges: '',
		currentInsuranceInEmi: ''
	});

	// Documents section collapsed state
	let documentsExpanded = $state(false);

	// ═══════════════════════════════════════════════════════════════
	// DERIVED STATE
	// ═══════════════════════════════════════════════════════════════

	let isNonPrimaryRole = $derived(NON_PRIMARY_ROLES.includes(applicant.currentRole));

	const borrowerCountOptions = $derived(
		isNonPrimaryRole
			? [
					{ label: '2', value: '2' },
					{ label: '3', value: '3' },
					{ label: '4+', value: '4+' }
				]
			: [
					{ label: 'Just me', value: '1' },
					{ label: '2', value: '2' },
					{ label: '3', value: '3' },
					{ label: '4+', value: '4+' }
				]
	);

	const emiMethodOptions = $derived(
		isNonPrimaryRole
			? [
					{ label: 'Full EMI from co-borrower/spouse account', value: 'Full from co-borrower' },
					{ label: 'Proportional split from individual accounts', value: 'Proportional split' },
					{ label: 'From joint account', value: 'From joint account' },
					{ label: 'From business account', value: 'From business account' }
				]
			: [
					{ label: 'Full EMI from my account', value: 'Full from my account' },
					{ label: 'Full EMI from co-borrower/spouse account', value: 'Full from co-borrower' },
					{ label: 'Proportional split from individual accounts', value: 'Proportional split' },
					{ label: 'From joint account', value: 'From joint account' },
					{ label: 'From business account', value: 'From business account' }
				]
	);

	let showLiabilitySection = $derived(!!applicant.currentLoanType);
	let showCoBorrowerField = $derived(
		applicant.currentBorrowerCount !== '' && applicant.currentBorrowerCount !== '1'
	);
	let showProofOverrideToggle = $derived(
		applicant.currentBorrowerCount !== '' && applicant.currentBorrowerCount !== '1'
	);
	let showMonthlyShare = $derived(showProofOverrideToggle && applicant.currentHasProofOverride);

	// Equal split computation for info banner
	let equalShareInfo = $derived(() => {
		const count = parseBorrowerCount(applicant.currentBorrowerCount);
		if (count <= 1) return null;
		const isCreditLine = ['CC Limit', 'OD Limit', 'Dropline OD'].includes(applicant.currentLoanType);
		const rawStr = isCreditLine ? applicant.currentTotalLimit : applicant.currentEmi;
		const raw = parseFloat((rawStr || '0').replace(/,/g, ''));
		if (raw <= 0) return null;
		const share = Math.round(raw / count);
		return { share, total: raw, count, label: isCreditLine ? 'limit' : 'EMI' };
	});
	let showForeclosureFields = $derived(applicant.currentDocuments.includes('foreclosureLetter'));
	let showInsuranceInEmi = $derived(applicant.currentDocuments.includes('insurancePolicy'));

	// Auto-clear stale values when role changes
	$effect(() => {
		const role = applicant.currentRole;
		if (!role) return;
		const nonPrimary = NON_PRIMARY_ROLES.includes(role);
		if (nonPrimary) {
			// Guarantor/Name Lender can't be the sole borrower
			if (applicant.currentBorrowerCount === '1') applicant.currentBorrowerCount = '';
			// Guarantor/Name Lender shouldn't pay full EMI from their account
			if (applicant.currentEmiMethod === 'Full from my account') applicant.currentEmiMethod = '';
		} else {
			// Primary/Co-Borrower can't select "Not my actual liability"
			if (applicant.currentSelectedToClose === 'Not my actual liability') applicant.currentSelectedToClose = '';
		}
	});

	let termLoans = $derived(
		(currentAnswers?.obligations ?? []).filter((e: any) => e.obligationType === 'term_loan')
	);
	let creditLines = $derived(
		(currentAnswers?.obligations ?? []).filter((e: any) => e.obligationType === 'credit_line')
	);

	let validationErrors: Record<string, string> = $state({
		emi: '',
		totalLimit: '',
		tenure: ''
	});

	let isFormValid = $derived(
		!!applicant.currentLoanType &&
			!!applicant.currentBankName &&
			!!applicant.currentSelectedToClose &&
			!!applicant.currentRole &&
			!!applicant.currentEmiMethod &&
			(!emiPaidByRequired || !!applicant.currentEmiPaidBy) &&
			(['Dropline OD', 'CC Limit', 'OD Limit'].includes(applicant.currentLoanType)
				? !validationErrors.totalLimit &&
					!validationErrors.interestRate &&
					!validationErrors.tenure &&
					!!applicant.currentInterestRate &&
					!!applicant.currentTotalLimit
				: !validationErrors.emi &&
					!validationErrors.interestRate &&
					!validationErrors.tenure &&
					!!applicant.currentInterestRate &&
					!!applicant.currentEmi)
	);

	// ═══════════════════════════════════════════════════════════════
	// AUTO-BEHAVIORS
	// ═══════════════════════════════════════════════════════════════

	// When role = Guarantor or Name Lender → auto-select closure plan
	$effect(() => {
		if (applicant.currentRole === 'Guarantor' || applicant.currentRole === 'Name Lender') {
			applicant.currentSelectedToClose = 'Not my actual liability';
		}
	});

	// When "Just me" → clear co-borrower fields
	$effect(() => {
		if (applicant.currentBorrowerCount === '1' || applicant.currentBorrowerCount === '') {
			applicant.currentCoApplicantInApp = '';
			applicant.currentLinkedApplicant = '';
			applicant.currentMonthlyShare = '';
		}
	});

	// When co-applicant = No → clear linked applicant
	$effect(() => {
		if (applicant.currentCoApplicantInApp !== 'Yes') {
			applicant.currentLinkedApplicant = '';
		}
	});

	// When emiPaidBy = 'self' or empty → clear sub-fields
	$effect(() => {
		if (applicant.currentEmiPaidBy === 'self' || applicant.currentEmiPaidBy === '') {
			applicant.currentEmiPaymentMode = '';
			applicant.currentEmiPaidByName = '';
		}
	});

	// When proof override toggled on + monthlyShare empty → pre-fill with equal split
	$effect(() => {
		if (applicant.currentHasProofOverride && !applicant.currentMonthlyShare) {
			const info = equalShareInfo();
			if (info) {
				applicant.currentMonthlyShare = String(info.share);
			}
		}
	});

	// When proof override toggled off → clear monthly share
	$effect(() => {
		if (!applicant.currentHasProofOverride) {
			applicant.currentMonthlyShare = '';
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// DOCUMENT CHIP TOGGLE
	// ═══════════════════════════════════════════════════════════════

	function toggleDocument(value: string) {
		if (applicant.currentDocuments.includes(value)) {
			applicant.currentDocuments = applicant.currentDocuments.filter((v) => v !== value);
		} else {
			applicant.currentDocuments = [...applicant.currentDocuments, value];
		}
		// Clear conditional fields when their parent chip is removed
		if (!applicant.currentDocuments.includes('foreclosureLetter')) {
			applicant.currentForeclosureAmount = '';
			applicant.currentForeclosureCharges = '';
		}
		if (!applicant.currentDocuments.includes('insurancePolicy')) {
			applicant.currentInsuranceInEmi = '';
		}
	}

	// ═══════════════════════════════════════════════════════════════
	// VALIDATION (existing — unchanged)
	// ═══════════════════════════════════════════════════════════════

	function validateField(field: string, value: string) {
		const v = (value ?? '').toString().trim();
		const loanType = applicant.currentLoanType;

		const sanctionedLimit = +applicant.currentSanctionAmount || 0;
		const totalLimit = +applicant.currentTotalLimit || 0;
		const utilized = +applicant.currentUtilizedAmount || 0;
		const interestRate = +applicant.currentInterestRate || 0;
		const tenure = +applicant.currentTenure || 0;
		const sanctionedTenure = +applicant.currentSanctionTenure || 0;
		const emi = +applicant.currentEmi || 0;

		validationErrors.sanctionedLimit = '';
		validationErrors.totalLimit = '';
		validationErrors.utilizedAmount = '';
		validationErrors.interestRate = '';
		validationErrors.tenure = '';
		validationErrors.sanctionedTenure = '';
		validationErrors.emi = '';

		if (interestRate) {
			if (interestRate < 3)
				validationErrors.interestRate = 'Interest rate must be at least 3% p.a.';
			if (interestRate > 99)
				validationErrors.interestRate = 'Interest rate must not exceed 99% p.a.';
		}
		if (tenure) {
			if (tenure < 6) validationErrors.tenure = 'Tenure must not be less than 6 months';
			if (tenure > 480) validationErrors.tenure = 'Tenure must not be greater than 480 months';
		}

		if (!['Dropline OD', 'CC Limit', 'OD Limit'].includes(loanType)) {
			if (emi) {
				if (emi < 1000) validationErrors.emi = 'EMI must be greater than ₹1,000 per month';
				if (emi > 100000000) validationErrors.emi = 'EMI must not exceed ₹1,00,00,000 per month';
			}
		}

		if (['CC Limit', 'OD Limit'].includes(loanType)) {
			if (totalLimit) {
				if (totalLimit < 100000)
					validationErrors.totalLimit = 'Total limit must not be less than ₹1,00,000';
				if (totalLimit > 100000000)
					validationErrors.totalLimit = 'Total limit must not be greater than ₹1,00,00,000';
			}
		}

		if (loanType === 'Dropline OD') {
			if (totalLimit) {
				if (totalLimit < 100000)
					validationErrors.totalLimit = 'Remaining limit must not be less than ₹1,00,000';
				if (totalLimit > 100000000)
					validationErrors.totalLimit = 'Remaining limit must not be greater than ₹1,00,00,000';
			}
			if (sanctionedLimit) {
				if (sanctionedLimit < 100000)
					validationErrors.sanctionedLimit = 'Sanctioned limit must not be less than ₹1,00,000';
				if (sanctionedLimit > 100000000)
					validationErrors.sanctionedLimit =
						'Sanctioned limit must not be greater than ₹1,00,00,000';
			}
			if (totalLimit > sanctionedLimit)
				validationErrors.totalLimit = 'Remaining limit cannot exceed sanctioned limit';
			if (utilized > totalLimit)
				validationErrors.utilizedAmount = 'Utilized amount cannot exceed remaining limit';
			if (sanctionedLimit < utilized + totalLimit)
				validationErrors.sanctionedLimit =
					'Sanctioned limit cannot be less than utilized + remaining limit';
			if (sanctionedTenure) {
				if (sanctionedTenure < 6)
					validationErrors.sanctionedTenure = 'Sanctioned tenure must not be less than 6 months';
				if (sanctionedTenure > 480)
					validationErrors.sanctionedTenure =
						'Sanctioned tenure must not be greater than 480 months';
			}
			if (tenure > sanctionedTenure)
				validationErrors.tenure = 'Remaining tenure must not exceed sanctioned tenure';
		}
	}

	$effect(() => {
		if (applicant?.currentLoanType) {
			validateField('sanctionedLimit', applicant.currentSanctionAmount);
			validateField('totalLimit', applicant.currentTotalLimit);
			validateField('utilizedAmount', applicant.currentUtilizedAmount);
			validateField('interestRate', applicant.currentInterestRate);
			validateField('tenure', applicant.currentTenure);
			validateField('sanctionedTenure', applicant.currentSanctionTenure);
			validateField('emi', applicant.currentEmi);
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// ADD / EDIT / DELETE (enhanced with new fields)
	// ═══════════════════════════════════════════════════════════════

	function handleAddLoanClick() {
		let loanType: string;
		let bankName: string;
		let selectedToClose: string;
		let emi: string;
		let totalLimit: string;
		let tenure: string;
		let interestRate: string;
		let sanctionAmount: string | undefined;
		let sanctionTenure: string | undefined;
		let utilizedAmount: string | undefined;

		if (['CC Limit', 'OD Limit'].includes(applicant.currentLoanType)) {
			loanType = applicant.currentLoanType || '';
			bankName = applicant.currentBankName || '';
			selectedToClose = applicant.currentSelectedToClose || '';
			totalLimit = applicant.currentTotalLimit || '';
			tenure = applicant.currentTenure || '';
			interestRate = applicant.currentInterestRate || '';
			emi = '';
			if (!loanType || !bankName || !selectedToClose || !totalLimit || !tenure || !interestRate) {
				openModal('Please fill all required fields before proceeding.');
				return;
			}
		} else if (applicant.currentLoanType === 'Dropline OD') {
			loanType = applicant.currentLoanType || '';
			bankName = applicant.currentBankName || '';
			selectedToClose = applicant.currentSelectedToClose || '';
			totalLimit = applicant.currentTotalLimit || '';
			tenure = applicant.currentTenure || '';
			interestRate = applicant.currentInterestRate || '';
			sanctionAmount = applicant.currentSanctionAmount || '';
			sanctionTenure = applicant.currentSanctionTenure || '';
			utilizedAmount = applicant.currentUtilizedAmount || '';
			emi = '';
			if (
				!loanType ||
				!bankName ||
				!selectedToClose ||
				!totalLimit ||
				!tenure ||
				!interestRate ||
				!sanctionTenure ||
				!sanctionAmount ||
				!utilizedAmount
			) {
				openModal('Please fill all required fields before proceeding.');
				return;
			}
		} else {
			loanType = applicant.currentLoanType || '';
			bankName = applicant.currentBankName || '';
			selectedToClose = applicant.currentSelectedToClose || '';
			emi = applicant.currentEmi || '';
			tenure = applicant.currentTenure || '';
			interestRate = applicant.currentInterestRate || '';
			totalLimit = '';
			if (!loanType || !bankName || !selectedToClose || !emi || !tenure || !interestRate) {
				openModal('Please fill all required fields before proceeding.');
				return;
			}
		}

		// Validate required liability fields
		if (!applicant.currentRole || !applicant.currentEmiMethod) {
			openModal('Please fill Role and EMI Deduction Method before proceeding.');
			return;
		}

		const CREDIT_LINE_TYPES = ['CC Limit', 'OD Limit', 'Dropline OD'];
		const oblType = CREDIT_LINE_TYPES.includes(loanType) ? 'credit_line' : 'term_loan';
		const newEntry = {
			// Identity
			id: crypto.randomUUID(),
			obligationType: oblType,
			// Section 1 — Loan details
			loanType,
			bankName,
			selectedToClose,
			emi: emi || '',
			totalLimit: totalLimit || '',
			tenure,
			interestRate,
			sanctionAmount,
			sanctionTenure,
			utilizedAmount,
			// Section 2 — Liability
			role: applicant.currentRole,
			capacity: applicant.currentCapacity,
			capacityEntityName: applicant.currentCapacityEntityName || '',
			borrowerCount: applicant.currentBorrowerCount,
			emiMethod: applicant.currentEmiMethod,
			coApplicantInApp: applicant.currentCoApplicantInApp,
			linkedApplicant: applicant.currentLinkedApplicant,
			monthlyShare: applicant.currentMonthlyShare,
			hasProofOverride: applicant.currentHasProofOverride,
			applicantEmiShare: computeApplicantEmiShare({
				role: applicant.currentRole,
				emiMethod: applicant.currentEmiMethod,
				emiPaidBy: applicant.currentEmiPaidBy,
				borrowerCount: applicant.currentBorrowerCount,
				hasProofOverride: applicant.currentHasProofOverride,
				monthlyShare: applicant.currentMonthlyShare,
				emi: emi || '',
				totalLimit: totalLimit || '',
				obligationType: oblType
			}),
			// EMI Delay History
			emiDelayHistory: applicant.currentEmiDelayHistory,
			// EMI Payment Source
			emiPaidBy: applicant.currentEmiPaidBy,
			emiPaymentMode: applicant.currentEmiPaymentMode,
			emiPaidByName: applicant.currentEmiPaidByName,
			// Section 3 — Documents
			documents: [...applicant.currentDocuments],
			foreclosureAmount: applicant.currentForeclosureAmount,
			foreclosureCharges: applicant.currentForeclosureCharges,
			insuranceInEmi: applicant.currentInsuranceInEmi
		};

		// Push to unified obligations array
		if (!currentAnswers.obligations) currentAnswers.obligations = [];
		currentAnswers.obligations = [...currentAnswers.obligations, newEntry];

		// Clear ALL form fields
		resetForm();

		onupdateApplicant?.(currentAnswers);
	}

	function resetForm() {
		applicant.currentLoanType = '';
		applicant.currentBankName = '';
		applicant.currentSelectedToClose = '';
		applicant.currentEmi = '';
		applicant.currentTotalLimit = '';
		applicant.currentTenure = '';
		applicant.currentInterestRate = '';
		applicant.currentSanctionAmount = '';
		applicant.currentSanctionTenure = '';
		applicant.currentUtilizedAmount = '';
		// Section 2
		applicant.currentRole = '';
		applicant.currentCapacity = '';
		applicant.currentCapacityEntityName = '';
		applicant.currentBorrowerCount = '';
		applicant.currentEmiMethod = '';
		applicant.currentCoApplicantInApp = '';
		applicant.currentLinkedApplicant = '';
		applicant.currentMonthlyShare = '';
		applicant.currentHasProofOverride = false;
		// EMI Delay History
		applicant.currentEmiDelayHistory = '';
		// EMI Payment Source
		applicant.currentEmiPaidBy = '';
		applicant.currentEmiPaymentMode = '';
		applicant.currentEmiPaidByName = '';
		// Section 3
		applicant.currentDocuments = [];
		applicant.currentForeclosureAmount = '';
		applicant.currentForeclosureCharges = '';
		applicant.currentInsuranceInEmi = '';
		documentsExpanded = false;
	}

	function deleteLoanEntry(entryIdx: number, isLimit: boolean) {
		const obligations = currentAnswers.obligations || [];
		// Filter by type, then remove by index within that sublist
		const typeFilter = isLimit ? 'credit_line' : 'term_loan';
		const filtered = obligations.filter((e: any) => e.obligationType === typeFilter);
		const entryToRemove = filtered[entryIdx];
		if (entryToRemove) {
			currentAnswers.obligations = obligations.filter((e: any) => e !== entryToRemove);
		}
		onupdateApplicant?.(currentAnswers);
	}

	function EditLoan(entryIdx: number, natureOfLoan: any, isLimit: boolean) {
		const entry = natureOfLoan[entryIdx];
		// Section 1
		applicant.currentEmi = entry?.emi || '';
		applicant.currentLoanType = entry?.loanType || entry?.loanProduct || '';
		applicant.currentBankName = entry?.bankName || '';
		applicant.currentSelectedToClose = entry?.selectedToClose || '';
		applicant.currentTotalLimit = entry?.totalLimit || '';
		applicant.currentTenure = entry?.tenure || '';
		applicant.currentInterestRate = entry?.interestRate || '';
		applicant.currentSanctionAmount = entry?.sanctionAmount || '';
		applicant.currentSanctionTenure = entry?.sanctionTenure || '';
		applicant.currentUtilizedAmount = entry?.utilizedAmount || '';
		// Section 2 — Liability
		applicant.currentRole = entry?.role || '';
		applicant.currentCapacity = entry?.capacity || '';
		applicant.currentCapacityEntityName = entry?.capacityEntityName || '';
		applicant.currentBorrowerCount = entry?.borrowerCount || '';
		applicant.currentEmiMethod = entry?.emiMethod || '';
		applicant.currentCoApplicantInApp = entry?.coApplicantInApp || '';
		applicant.currentLinkedApplicant = entry?.linkedApplicant || '';
		applicant.currentMonthlyShare = entry?.monthlyShare || '';
		applicant.currentHasProofOverride = !!entry?.hasProofOverride;
		// EMI Delay History
		applicant.currentEmiDelayHistory = entry?.emiDelayHistory || '';
		// EMI Payment Source
		applicant.currentEmiPaidBy = entry?.emiPaidBy || '';
		applicant.currentEmiPaymentMode = entry?.emiPaymentMode || '';
		applicant.currentEmiPaidByName = entry?.emiPaidByName || '';
		// Section 3 — Documents
		applicant.currentDocuments = Array.isArray(entry?.documents) ? [...entry.documents] : [];
		applicant.currentForeclosureAmount = entry?.foreclosureAmount || '';
		applicant.currentForeclosureCharges = entry?.foreclosureCharges || '';
		applicant.currentInsuranceInEmi = entry?.insuranceInEmi || '';

		if (applicant.currentDocuments.length > 0) documentsExpanded = true;

		deleteLoanEntry(entryIdx, isLimit);
		onupdateApplicant?.(currentAnswers);
	}

	function selectToClose(loanType: string) {
		let opts = closureOptions;
		if (loanType == 'Start Fresh with New Loan' || loanType == 'New Loan') {
			opts = opts.filter((o) => o.value !== 'Will be closed by Top-up amount');
		}
		// "Not my actual liability" only for Guarantor / Name Lender
		if (!isNonPrimaryRole) {
			opts = opts.filter((o) => o.value !== 'Not my actual liability');
		}
		return opts;
	}

	function onTextFieldInput(val: any, question: any) {
		if (question.uiType === 'number') {
			const numVal = val === '' ? null : Number(val.replace(/,/g, ''));
			// no-op for now — number word display is commented out
		}
	}

	// ═══════════════════════════════════════════════════════════════
	// CROSS-APPLICANT HINT BANNERS
	// ═══════════════════════════════════════════════════════════════

	const PAID_BY_TO_RELATIONSHIP_TYPES: Record<string, string[]> = {
		spouse: ['Husband of', 'Wife of', 'Husband', 'Wife'],
		parent: ['Father of', 'Mother of', 'Father', 'Mother'],
		child: ['Son of', 'Daughter of', 'Son', 'Daughter'],
		sibling: ['Brother of', 'Sister of', 'Brother', 'Sister']
	};

	let crossApplicantHints = $derived(() => {
		const hints: { name: string; loanType: string; emi: string; paidByLabel: string }[] = [];
		const rels = $userRelationships;
		if (!rels || rels.length === 0 || !allApplicants || allApplicants.length < 2) return hints;

		const currentApp = allApplicants[currentApplicantIndex];
		if (!currentApp) return hints;
		const currentId = currentApp.id ?? String(currentApplicantIndex);

		for (let otherIdx = 0; otherIdx < allApplicants.length; otherIdx++) {
			if (otherIdx === currentApplicantIndex) continue;
			const other = allApplicants[otherIdx];
			const otherId = other.id ?? String(otherIdx);
			const otherName = other.fullNameOfApplicant || other.companyName || `Applicant ${otherIdx + 1}`;
			const otherObligations = other.obligations ?? [];

			for (const obl of otherObligations) {
				if (!obl.emiPaidBy || obl.emiPaidBy === 'self') continue;
				const relTypes = PAID_BY_TO_RELATIONSHIP_TYPES[obl.emiPaidBy];
				if (!relTypes) continue;

				// Check if a relationship exists between current and other that matches
				const hasMatch = rels.some((r: any) => {
					const isFromCurrent = (r.fromId === currentId && r.toId === otherId);
					const isToCurrent = (r.fromId === otherId && r.toId === currentId);
					if (!isFromCurrent && !isToCurrent) return false;
					return relTypes.some((rt) =>
						r.relationType?.toLowerCase().includes(rt.toLowerCase().replace(' of', ''))
					);
				});

				if (hasMatch) {
					const paidByLabel = emiPaidByOptions.find((o) => o.value === obl.emiPaidBy)?.label?.replace(' pays', '') ?? obl.emiPaidBy;
					hints.push({
						name: otherName,
						loanType: obl.loanType || 'Loan',
						emi: obl.emi || obl.totalLimit || '0',
						paidByLabel
					});
				}
			}
		}
		return hints;
	});
</script>

<!-- ObligationsRunning question (skipped for DC/BT — they imply obligations) -->
{#if !isObligationImplied}
	<div class="mb-4">
		<RadioField
			id="q_ObligationsRunning"
			label="Does this applicant have any running loans as borrower or co-applicant?"
			options={[
				{ label: 'Yes', value: 'Yes' },
				{ label: 'No', value: 'No' }
			]}
			value={currentAnswers.ObligationsRunning ?? ''}
			required={true}
			onChange={(val) => {
				currentAnswers.ObligationsRunning = val as string;
				onObligationsRunningChange?.(val as string);
				onupdateApplicant?.(currentAnswers);
			}}
		/>
	</div>
{/if}

{#if currentAnswers.ObligationsRunning === 'No'}
	<div
		class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700/40 dark:bg-green-900/20"
	>
		<p class="text-sm text-green-800 dark:text-green-300">
			No existing obligations recorded for this applicant.
		</p>
	</div>
{/if}

{#if showObligationForm}
	<!-- EMI Payment Source Warning Banner -->
	{#if emiPaidByRequired}
		<div class="mt-2 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
			<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
			<p class="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
				{#if (currentAnswers?.selectedIncomeProfiles ?? []).length === 1 && (currentAnswers?.selectedIncomeProfiles ?? [])[0] === 'no_current_income'}
					This applicant has <strong>no declared income</strong>. For each loan below,
					please specify who provides the EMI payment.
				{:else}
					Total running EMIs appear to <strong>exceed declared income</strong>.
					Please specify who provides the EMI payment for each loan.
				{/if}
			</p>
		</div>
	{/if}

	<!-- Cross-applicant hint banners -->
	{#each crossApplicantHints() as hint}
		<div class="mt-2 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/40 dark:bg-blue-900/20">
			<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
			<p class="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
				<strong>{hint.name}</strong> declared a {hint.loanType} ({formatCurrency(parseFloat(hint.emi.replace(/,/g, '') || '0'))} EMI) where {hint.paidByLabel} is the payer.
				Make sure to include your share here if applicable.
			</p>
		</div>
	{/each}

	<div
		class="mt-4 space-y-4 rounded border border-[var(--form-border)] bg-[var(--form-bg-alt)] p-4"
	>
		<h5 class="sectionHeadingText">Add Existing Loan Details</h5>

		{#if loanVariant?.includes('Balance Transfer') || loanVariant === 'Top-up Only'}
			<div
				class="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/40 dark:bg-blue-900/20"
			>
				<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
				<p class="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
					Do <strong>NOT</strong> enter the loan being transferred here. BT loan details are captured
					separately on the next page.
				</p>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- SECTION 1 — LOAN DETAILS (existing fields, unchanged)     -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[2rem]">
			<SelectField
				id="loanType"
				label="Loan Type"
				options={loanTypeOptions}
				value={applicant.currentLoanType}
				onChange={(val) => (applicant.currentLoanType = String(val))}
				icon="list"
			/>

			<SelectField
				id="bankName"
				label="Bank Name"
				options={bankData.filter((bankType) => bankType.Classification !== 'NBFC')}
				value={applicant.currentBankName}
				onChange={(val) => (applicant.currentBankName = String(val))}
				icon="landmark"
			/>

			{#if (applicant.currentLoanType && !['OD Limit', 'CC Limit', 'Dropline OD'].includes(applicant.currentLoanType)) || applicant.currentLoanType == ''}
				<div class="flex flex-col">
					<TextField
						id="emi"
						label="EMI Amount"
						value={applicant.currentEmi}
						placeholder="Enter EMI amount"
						type="text"
						uiType="number"
						icon="indian-rupee"
						onInput={(val) => {
							applicant.currentEmi = val;
							validateField('emi', val);
							onTextFieldInput(val, { id: 'emi', uiType: 'number' });
						}}
					/>
					{#if validationErrors.emi}
						<div class="smallText pl-[3rem] text-error">{validationErrors.emi}</div>
					{/if}
				</div>
			{/if}

			{#if applicant.currentLoanType == 'Dropline OD'}
				<div class="flex flex-col">
					<TextField
						id="sanctionedAmt"
						label="Sanctioned Limit"
						value={applicant.currentSanctionAmount}
						placeholder="Enter Sanctioned Limit"
						type="text"
						uiType="number"
						icon="indian-rupee"
						onInput={(val) => {
							applicant.currentSanctionAmount = val;
							validateField('sanctionedLimit', val);
							onTextFieldInput(val, { id: 'sanctionedAmt', uiType: 'number' });
						}}
					/>
					{#if validationErrors.sanctionedLimit}
						<div class="smallText pl-[3rem] text-error">{validationErrors.sanctionedLimit}</div>
					{/if}
				</div>
			{/if}

			{#if applicant.currentLoanType == 'Dropline OD'}
				<div class="flex flex-col">
					<TextField
						id="sanctionedTenure"
						label="Sanctioned Tenure"
						value={applicant.currentSanctionTenure}
						placeholder="Enter Sanctioned Tenure"
						type="text"
						uiType="number"
						icon="calendar"
						onInput={(val) => {
							applicant.currentSanctionTenure = val;
							validateField('sanctionedTenure', val);
							onTextFieldInput(val, { id: 'sanctionedTenure', uiType: 'number' });
						}}
					/>
					{#if validationErrors.sanctionedTenure}
						<div class="smallText pl-[3rem] text-error">{validationErrors.sanctionedTenure}</div>
					{/if}
				</div>
			{/if}

			{#if applicant.currentLoanType && ['OD Limit', 'CC Limit', 'Dropline OD'].includes(applicant.currentLoanType)}
				<div class="flex flex-col">
					<TextField
						id="totalLimit"
						label={['OD Limit', 'CC Limit'].includes(applicant.currentLoanType)
							? 'Total Limit'
							: 'Remaining Limit'}
						value={applicant.currentTotalLimit}
						placeholder={['OD Limit', 'CC Limit'].includes(applicant.currentLoanType)
							? 'Enter Total Limit'
							: 'Enter Remaining Limit'}
						type="text"
						uiType="number"
						icon="layers"
						onInput={(val) => {
							applicant.currentTotalLimit = val;
							validateField('totalLimit', val);
							onTextFieldInput(val, { id: 'totalLimit', uiType: 'number' });
						}}
					/>
					{#if validationErrors.totalLimit}
						<div class="smallText pl-[3rem] text-error">{validationErrors.totalLimit}</div>
					{/if}
				</div>
			{/if}

			<div class="flex flex-col">
				<TextField
					id="tenure"
					label="Remaining Tenure (months)"
					value={applicant.currentTenure}
					placeholder="Enter tenure in months"
					type="text"
					uiType="number"
					icon="calendar"
					onInput={(val) => {
						applicant.currentTenure = val;
						validateField('tenure', val);
						onTextFieldInput(val, { id: 'tenure', uiType: 'number' });
					}}
				/>
				{#if validationErrors.tenure}
					<div class="smallText pl-[3rem] text-error">{validationErrors.tenure}</div>
				{/if}
			</div>

			{#if applicant.currentLoanType == 'Dropline OD'}
				<div class="flex flex-col">
					<TextField
						id="utilizedAmt"
						label="Utilized Amount"
						value={applicant.currentUtilizedAmount}
						placeholder="Enter Utilized Limit"
						type="text"
						uiType="number"
						icon="indian-rupee"
						onInput={(val) => {
							applicant.currentUtilizedAmount = val;
							validateField('utilizedAmount', val);
							onTextFieldInput(val, { id: 'utilizedAmt', uiType: 'number' });
						}}
					/>
					{#if validationErrors.utilizedAmount}
						<div class="smallText pl-[3rem] text-error">{validationErrors.utilizedAmount}</div>
					{/if}
				</div>
			{/if}

			<div class="flex flex-col">
				<InterestRateTextField
					id="interestRate"
					label="Interest Rate (%)"
					value={applicant.currentInterestRate}
					placeholder="Enter interest rate"
					uiType="number"
					onInput={(val) => {
						applicant.currentInterestRate = String(val);
						validateField('interestRate', String(val));
						onTextFieldInput(val, { id: 'interestRate', uiType: 'number' });
					}}
					icon="percent"
				/>
				{#if validationErrors.interestRate}
					<div class="smallText pl-[3rem] text-error">{validationErrors.interestRate}</div>
				{/if}
			</div>

			{#if applicant.currentLoanType && !['CC Limit', 'OD Limit', 'Dropline OD'].includes(applicant.currentLoanType)}
				<div class="col-span-full">
					<RadioField
						id="emiDelayHistory"
						label="How many EMI delays in the last 12 months?"
						options={[
							{ label: 'No delays', value: 'NONE' },
							{ label: '1 delay', value: '1' },
							{ label: '2+ delays', value: '2+' }
						]}
						value={applicant.currentEmiDelayHistory}
						onChange={(val) => (applicant.currentEmiDelayHistory = String(val))}
					/>
				</div>
			{/if}
		</div>

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- SECTION 2 — YOUR LIABILITY (NEW — compact 2-col grid)     -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		{#if showLiabilitySection}
			<div
				class="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-700/40 dark:bg-blue-900/10"
			>
				<div class="mb-3 flex items-center gap-2">
					<div class="h-1 w-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400"></div>
					<span
						class="text-xs font-semibold tracking-wider text-[var(--form-text-secondary)] uppercase"
					>
						Your Liability on this Loan
					</span>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[2rem]">
					<!-- Row 1: Role + Capacity -->
					<SelectField
						id="loanRole"
						label="Your role on this loan"
						options={roleOptions}
						value={applicant.currentRole}
						onChange={(val) => (applicant.currentRole = String(val))}
						required={true}
						icon="user"
					/>

					<SelectField
						id="loanCapacity"
						label="Loan taken as"
						options={capacityOptions}
						value={applicant.currentCapacity}
						onChange={(val) => {
							applicant.currentCapacity = String(val);
							// Clear entity name when switching to individual
							if (!needsCapacityEntity(String(val))) {
								applicant.currentCapacityEntityName = '';
							}
						}}
						icon="briefcase-business"
					/>

					{#if needsCapacityEntity(applicant.currentCapacity)}
						<TextField
							id="capacityEntityName"
							label={getCapacityEntityLabel(applicant.currentCapacity)}
							value={applicant.currentCapacityEntityName}
							onInput={(val: string) => (applicant.currentCapacityEntityName = String(val))}
							icon="building-2"
							placeholder="Enter company / firm name"
						/>
					{/if}

					<!-- Row 2: Borrower Count + EMI Method -->
					<SelectField
						id="borrowerCount"
						label="Total borrowers on this loan"
						options={borrowerCountOptions}
						value={applicant.currentBorrowerCount}
						onChange={(val) => (applicant.currentBorrowerCount = String(val))}
						icon="users"
					/>

					<SelectField
						id="emiMethod"
						label="EMI deduction method"
						options={emiMethodOptions}
						value={applicant.currentEmiMethod}
						onChange={(val) => (applicant.currentEmiMethod = String(val))}
						required={true}
						icon="indian-rupee"
					/>

					<!-- EMI Payment Source (who actually provides the money) -->
					{#if emiPaidByRequired || applicant.currentEmiMethod === 'Full from co-borrower' || applicant.currentEmiMethod === 'From business account'}
						<SelectField
							id="emiPaidBy"
							label="Who actually provides money for this EMI?"
							options={emiPaidByOptions}
							value={applicant.currentEmiPaidBy}
							onChange={(val) => (applicant.currentEmiPaidBy = String(val))}
							required={emiPaidByRequired}
							icon="heart-handshake"
						/>
					{/if}

					{#if applicant.currentEmiPaidBy && applicant.currentEmiPaidBy !== 'self'}
						<SelectField
							id="emiPaymentMode"
							label="How is the payment arranged?"
							options={emiPaymentModeOptions}
							value={applicant.currentEmiPaymentMode}
							onChange={(val) => (applicant.currentEmiPaymentMode = String(val))}
							icon="arrow-left-right"
						/>
						<div class="col-span-full">
							<TextField
								id="emiPaidByName"
								label="Name of the person paying (optional)"
								value={applicant.currentEmiPaidByName}
								placeholder="e.g. Rajesh Kumar (Father)"
								type="text"
								icon="user"
								onInput={(val) => { applicant.currentEmiPaidByName = val; }}
							/>
						</div>
					{/if}

					<!-- Row 3 (conditional): Co-borrower link + Monthly share -->
					{#if showCoBorrowerField}
						<div class="flex flex-col gap-3">
							<RadioField
								id="coApplicantInApp"
								label="Is any co-borrower also an applicant in THIS application?"
								options={[
									{ label: 'Yes', value: 'Yes' },
									{ label: 'No', value: 'No' }
								]}
								value={applicant.currentCoApplicantInApp}
								onChange={(val) => (applicant.currentCoApplicantInApp = String(val))}
							/>
							{#if applicant.currentCoApplicantInApp === 'Yes' && coApplicantOptions.length > 0}
								<SelectField
									id="linkedApplicant"
									label="Which applicant?"
									options={coApplicantOptions}
									value={applicant.currentLinkedApplicant}
									onChange={(val) => (applicant.currentLinkedApplicant = String(val))}
									icon="user-round-check"
								/>
							{/if}
						</div>
					{/if}

					<!-- Equal split info banner -->
					{#if showProofOverrideToggle}
						{@const info = equalShareInfo()}
						{#if info}
							<div class="col-span-full flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/40 dark:bg-blue-900/20">
								<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
								<p class="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
									Equal share: <strong>{formatCurrency(info.share)}</strong>
									(total {formatCurrency(info.total)} ÷ {info.count} borrowers)
								</p>
							</div>
						{/if}

						<div class="col-span-full">
							<RadioField
								id="hasProofOverride"
								label="Have proof of a different {equalShareInfo()?.label ?? 'EMI'} split? (bank statements)"
								options={[
									{ label: 'No (equal split)', value: 'no' },
									{ label: 'Yes, I can prove a different split', value: 'yes' }
								]}
								value={applicant.currentHasProofOverride ? 'yes' : 'no'}
								onChange={(val) => (applicant.currentHasProofOverride = val === 'yes')}
							/>
						</div>
					{/if}

					{#if showMonthlyShare}
						{@const info = equalShareInfo()}
						<div class="flex flex-col">
							<TextField
								id="monthlyShare"
								label="Your proven monthly share"
								value={applicant.currentMonthlyShare}
								placeholder="Enter your proven portion in ₹"
								type="text"
								uiType="number"
								icon="indian-rupee"
								onInput={(val) => {
									const num = parseFloat((val || '0').replace(/,/g, ''));
									const maxAmount = info?.total ?? 0;
									if (maxAmount > 0 && num > maxAmount) {
										applicant.currentMonthlyShare = String(maxAmount);
									} else if (num < 0) {
										applicant.currentMonthlyShare = '0';
									} else {
										applicant.currentMonthlyShare = val;
									}
								}}
							/>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Must be supported by bank statement proof showing your actual payment share.
								{#if info}
									Max: {formatCurrency(info.total)} (full {info.label}).
								{/if}
							</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- CLOSURE PLAN (enhanced with 4th option)                    -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		{#if showLiabilitySection}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-[2rem]">
				<SelectField
					id="selectedToClose"
					label="How to handle this loan?"
					options={selectToClose(loanVariant)}
					value={applicant.currentSelectedToClose}
					onChange={(val) => (applicant.currentSelectedToClose = String(val))}
					icon="hand-coins"
					required={true}
				/>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- SECTION 3 — DOCUMENTS & FORECLOSURE (collapsible)         -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		{#if showLiabilitySection}
			<div class="overflow-hidden rounded-lg border border-[var(--form-border)]">
				<!-- Collapsible Header -->
				<button
					type="button"
					class="flex w-full cursor-pointer items-center justify-between bg-[var(--form-bg-alt)] px-4 py-3 transition-colors hover:bg-[var(--form-bg-alt)]"
					onclick={() => (documentsExpanded = !documentsExpanded)}
				>
					<div class="flex items-center gap-2">
						<span
							class="text-xs font-semibold tracking-wider text-[var(--form-text-secondary)] uppercase"
						>
							Loan Documents & Foreclosure
						</span>
						{#if applicant.currentDocuments.length > 0}
							<span
								class="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
							>
								{applicant.currentDocuments.length}
							</span>
						{/if}
					</div>
					{#if documentsExpanded}
						<ChevronUp class="h-4 w-4 text-[var(--form-text-muted)]" />
					{:else}
						<ChevronDown class="h-4 w-4 text-[var(--form-text-muted)]" />
					{/if}
				</button>

				<!-- Collapsible Content -->
				{#if documentsExpanded}
					<div class="space-y-4 p-4">
						<!-- Document Chips -->
						<div>
							<span class="labelText mb-2 block text-[var(--form-text-secondary)]">
								Which documents are available?
							</span>
							<div class="flex flex-wrap gap-2">
								{#each documentChipOptions as chip (chip.value)}
									{@const isSelected = applicant.currentDocuments.includes(chip.value)}
									<button
										type="button"
										class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all duration-200
										{isSelected
											? 'border-blue-400 bg-blue-50 text-blue-700'
											: 'border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text-secondary)] hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}"
										onclick={() => toggleDocument(chip.value)}
									>
										{#if isSelected}
											<Check class="h-3 w-3" />
										{/if}
										{chip.label}
									</button>
								{/each}
							</div>
						</div>

						<!-- Foreclosure Fields (conditional on chip) -->
						{#if showForeclosureFields}
							<div
								class="grid grid-cols-1 gap-4 border-t border-[var(--form-border)] pt-2 md:grid-cols-2 md:gap-[2rem]"
							>
								<div class="flex flex-col">
									<TextField
										id="foreclosureAmount"
										label="Foreclosure Amount (if known)"
										value={applicant.currentForeclosureAmount}
										placeholder="Enter foreclosure amount"
										type="text"
										uiType="number"
										icon="indian-rupee"
										onInput={(val) => {
											applicant.currentForeclosureAmount = val;
										}}
									/>
								</div>
								<div class="flex flex-col">
									<InterestRateTextField
										id="foreclosureCharges"
										label="Foreclosure Charges (%)"
										value={applicant.currentForeclosureCharges}
										placeholder="e.g. 2-4%"
										uiType="number"
										onInput={(val) => {
											applicant.currentForeclosureCharges = String(val);
										}}
										icon="percent"
									/>
								</div>
							</div>
						{/if}

						<!-- Insurance in EMI (conditional on chip) -->
						{#if showInsuranceInEmi}
							<div class="border-t border-[var(--form-border)] pt-2">
								<RadioField
									id="insuranceInEmi"
									label="Is insurance premium included in EMI?"
									options={[
										{ label: 'Yes', value: 'Yes' },
										{ label: 'No', value: 'No' }
									]}
									value={applicant.currentInsuranceInEmi}
									onChange={(val) => (applicant.currentInsuranceInEmi = String(val))}
								/>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- ADD LOAN BUTTON                                            -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		<button
			class="buttonText cursor-pointer rounded bg-primary px-4 py-2 text-black hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-[var(--form-bg-alt)] disabled:hover:bg-[var(--form-bg-alt)]"
			disabled={!isFormValid}
			onclick={handleAddLoanClick}
		>
			+ Add Loan
		</button>

		{#if !showMessageOnBt && loanVariant == 'Debt Consolidation with Extra Funds'}
			<p class="smallText text-error">
				If you choose Debt Consolidation at the start, you must select the option <span
					class="text-black underline decoration-black underline-offset-4"
				>
					'Will be closed by this loan'</span
				>
				from the
				<span class="text-black underline decoration-black underline-offset-4"
					>'How to handle this loan'</span
				> dropdown before proceeding to the next step.
			</p>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- OBLIGATIONS TABLES (from unified obligations[] array)       -->
	<!-- ═══════════════════════════════════════════════════════════ -->

	<ObligationTable
		type="term_loan"
		entries={termLoans}
		formLoanType={currentAnswers?.loanType}
		ondelete={(i) => deleteLoanEntry(i, false)}
		onedit={(i) => EditLoan(i, termLoans, false)}
	/>

	<ObligationTable
		type="credit_line"
		entries={creditLines}
		formLoanType={currentAnswers?.loanType}
		ondelete={(i) => deleteLoanEntry(i, true)}
		onedit={(i) => EditLoan(i, creditLines, true)}
	/>
{/if}
