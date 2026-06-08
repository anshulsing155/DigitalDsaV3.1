<script lang="ts">
	/**
	 * IncomeSourceForm — Tab 2 of Income & Credit Assessment
	 * ═══════════════════════════════════════════════════════════════════
	 * Dropdown + Dynamic Form + "Add to Profile" button.
	 *
	 * Flow:
	 *   1. User selects income type from dropdown (filtered to selected profiles)
	 *   2. Entity name field appears
	 *   3. Specifics section renders (per-profile-type yes/no questions)
	 *   4. Income section renders (amounts, frequency, financials table)
	 *   5. Evidence section renders (ITR, documentary proof)
	 *   6. "Add to Profile" validates and appends entry
	 *   7. Form clears, entry appears in IncomeSourceEntries table
	 *
	 * Editing: When editing an existing entry, the form is pre-filled
	 * and the "Add" button becomes "Update Entry".
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { untrack } from 'svelte';
	import SelectField from './SelectField.svelte';
	import RadioField from './RadioField.svelte';
	import TextField from './TextField.svelte';
	import FirmNameCombobox from './FirmNameCombobox.svelte';
	import type { FirmNameOption } from '$lib/utils/firmNameOptions';
	import {
		assembleCompanyNameOptions,
		type CompanyLinkOption
	} from '$lib/utils/companyNameOptions';
	import {
		buildAutoSpecifics,
		COMPANY_TYPE_TO_SPECIFICS_VALUE
	} from '$lib/utils/directorAutoIncome';
	import CalendarField from './CalendarField.svelte';
	import DatePickerYearAndMonth from './DatePickerYearAndMonth.svelte';
	import CustomIncomeTable from './CustomIncomeTable.svelte';
	import InputField from './InputField.svelte';
	import {
		getIcon,
		Plus,
		RotateCcw,
		AlertCircle,
		Info,
		Check,
		Paperclip
	} from '$lib/utils/iconRegistry';
	import { openModal } from '$lib/stores/modal';
	import { openConfirmModal } from '$lib/stores/confirmModal';
	import { deviceState } from '$lib/stores/device.svelte';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { generateId } from '$lib/utils';
	import {
		getSpecificsForProfile,
		getIncomeFieldsForProfile,
		getDropdownLabel,
		getEntityNameLabel,
		getEntityNamePlaceholder
	} from '$lib/config/incomeProfiles';
	import { getDocumentsForProfile } from '$lib/config/incomeProfiles/documentConfig';
	import { formatIncomeCurrency } from '$lib/config/incomeProfiles/incomeCalculations';
	import { formState } from '$lib/state/form.svelte';
	import {
		incomeDraftKey,
		loadIncomeSourceDraft,
		saveIncomeSourceDraft,
		clearIncomeSourceDraft
	} from '$lib/utils/incomeSourceDraft';
	import type {
		IncomeProfileType,
		IncomeSourceEntry,
		IncomeEntryAmounts,
		IncomeEvidence
	} from '$lib/types/incomeProfile';
	import type {
		SpecificsQuestion,
		IncomeField
	} from '$lib/config/incomeProfiles/profileFormConfig';

	/** Cast options with boolean values to string|number for component compatibility */
	function castOptions(
		options: { label: string; value: string | number | boolean }[]
	): { label: string; value: string | number }[] {
		return options.map((opt) => ({
			label: opt.label,
			value: typeof opt.value === 'boolean' ? (opt.value ? 'true' : 'false') : opt.value
		}));
	}

	/** Cast back from string radio value to original boolean if needed */
	function castRadioValue(
		val: string | number,
		options: { label: string; value: string | number | boolean }[]
	): unknown {
		// Check if original options had boolean values
		const hasBooleans = options.some((o) => typeof o.value === 'boolean');
		if (hasBooleans) {
			if (String(val) === 'true') return true;
			if (String(val) === 'false') return false;
		}
		return val;
	}

	/** Get display value for radio/select given the stored value (may be boolean) */
	function getDisplayValue(storedValue: unknown): string | number {
		if (typeof storedValue === 'boolean') return storedValue ? 'true' : 'false';
		return (storedValue as string | number) ?? '';
	}

	// ── Props ──────────────────────────────────────────────────────
	/** Maps applicant-page professionalCategory → income-page professionType */
	const PROF_CATEGORY_TO_TYPE: Record<string, string> = {
		doctor: 'MBBS Doctor',
		ca: 'Chartered Accountant(CA)',
		lawyer: 'Lawyer',
		architect: 'Architect'
	};

	interface Props {
		/** Selected profile types from Tab 1 */
		selectedProfiles: IncomeProfileType[];
		/** Existing entries (to check for duplicates, get count) */
		existingEntries: IncomeSourceEntry[];
		/** Callback when a new entry is added */
		onAddEntry: (entry: IncomeSourceEntry) => void;
		/** Callback when an existing entry is updated */
		onUpdateEntry?: (entry: IncomeSourceEntry) => void;
		/** Entry being edited (null = add mode) */
		editingEntry?: IncomeSourceEntry | null;
		/** Callback when editing is cancelled */
		onCancelEdit?: () => void;
		/** Who is filling: DSA or applicant (for shared form) */
		filledBy?: 'dsa' | 'applicant';
		/** Applicant index (needed for DatePickerYearAndMonth context) */
		applicantIndex?: number;
		/** Professional category from applicant page — auto-fills professionType */
		professionalCategory?: string;
		/** true when this entry is linked to another applicant's same-company entry */
		isLinkedEntry?: boolean;
		/** Name of the applicant whose entry this was linked from */
		linkedSourceName?: string;
		/** Cross-applicant validation warnings for linked entries */
		linkedEntryWarnings?: {
			stakeWarning: string;
			opcWarning: string;
			hasAnyWarning: boolean;
		} | null;
		/** Other co-applicants' total shareholding at same company (for real-time preview) */
		linkedOtherShareholding?: number;
		/**
		 * Suggestion list for the partner-firm name field when profileType is
		 * `business_partnership`. When omitted the field falls back to plain
		 * TextField (parity for loan flows that have no parent-firm context —
		 * e.g. Personal Loan). See docs/specs/DIRECTOR-FIRM-NAME-SPEC.md §3.
		 */
		firmNameOptions?: FirmNameOption[];
	}

	let {
		selectedProfiles,
		existingEntries,
		onAddEntry,
		onUpdateEntry,
		editingEntry = null,
		onCancelEdit,
		filledBy = 'dsa',
		applicantIndex = 0,
		professionalCategory,
		isLinkedEntry = false,
		linkedSourceName = '',
		linkedEntryWarnings = null,
		linkedOtherShareholding = 0,
		firmNameOptions
	}: Props = $props();

	// ── State ──────────────────────────────────────────────────────
	let currentProfileType = $state<IncomeProfileType | ''>('');
	let entityName = $state('');
	let equityBackup = $state<Record<string, unknown>>({});
	let specificsAnswers = $state<Record<string, unknown>>({});
	let incomeAnswers = $state<Record<string, unknown>>({});
	let evidenceAnswers = $state<Record<string, unknown>>({
		itrFiled: false,
		hasDocumentaryEvidence: false,
		receivingBankName: '',
		vintageYears: undefined
	});
	let formErrors = $state<Record<string, string>>({});
	let financialTableValid = $state(true);
	/** True after user clicks Save/Update — shows all validation errors including financial table */
	let attemptedSave = $state(false);
	let isEditing = $state(false);
	let editingId = $state<string | null>(null);

	// ── Director-in-Company: link to a real Company applicant ─────
	// When a director picks their company from the case's Company applicants, the
	// entry is LINKED (sourceCompanyId) and the company specifics auto-fill + lock
	// — instead of free-typing a name that can conflict with the actual applicant.
	// "Other" lets a director declare income from a company NOT on this loan.
	let companyLinkedSelection = $state(false);
	let selectedCompanyId = $state<string | undefined>(undefined);
	let useOtherCompany = $state(false);

	// ── Derived: dropdown options from selected profiles ──────────
	let profileDropdownOptions = $derived(
		selectedProfiles
			.filter((p) => p !== 'no_current_income')
			.map((p) => ({
				label: getDropdownLabel(p),
				value: p
			}))
	);

	// ── Derived: director-eligible Company applicants on the case ──
	// Drives the company combobox for the director_company profile.
	// In ADD mode, hides companies the applicant already has a director_company
	// entry for — picking an already-represented company would create a duplicate
	// row (the DSA should edit the existing row via the pencil icon instead).
	// While EDITING, the currently-linked company stays visible so the combobox
	// still reflects the entry being edited.
	let companyNameOptions = $derived.by(() => {
		const all = assembleCompanyNameOptions(formState.applicants);
		const usedCompanyIds = new Set<string>();
		for (const e of existingEntries) {
			if (e.profileType === 'director_company' && e.sourceCompanyId) {
				usedCompanyIds.add(e.sourceCompanyId);
			}
		}
		if (editingEntry?.sourceCompanyId) {
			usedCompanyIds.delete(editingEntry.sourceCompanyId);
		}
		return all.filter((o) => !usedCompanyIds.has(o.companyId));
	});

	// ── Derived: specifics questions for current profile ──────────
	let currentSpecifics = $derived<SpecificsQuestion[]>(
		currentProfileType ? getSpecificsForProfile(currentProfileType as IncomeProfileType) : []
	);

	// ── Derived: income fields for current profile ────────────────
	let currentIncomeFields = $derived<IncomeField[]>(
		currentProfileType ? getIncomeFieldsForProfile(currentProfileType as IncomeProfileType) : []
	);

	// ── Derived: entity name label and placeholder ────────────────
	let entityLabel = $derived(
		currentProfileType ? getEntityNameLabel(currentProfileType as IncomeProfileType) : 'Name'
	);

	let entityPlaceholder = $derived(
		currentProfileType
			? getEntityNamePlaceholder(currentProfileType as IncomeProfileType)
			: 'Enter name'
	);

	let evidenceYesLabel = $derived.by(() => {
		if (!currentProfileType) return 'Yes';
		const docs = getDocumentsForProfile(currentProfileType as IncomeProfileType);
		if (docs.length === 0) return 'Yes';
		const topLabels = docs.slice(0, 3).map((d) => d.label.replace(/\s*\(.*\)$/, ''));
		return `Yes (${topLabels.join(', ')}, etc.)`;
	});

	// ── Derived: professionType is locked when driven by applicant-level professionalCategory ──
	let professionLockedByApplicant = $derived(
		!!professionalCategory && !!PROF_CATEGORY_TO_TYPE[professionalCategory]
	);

	// ── Company-level specifics that come FROM the linked Company applicant ──
	// When the entry is sourced from a case Company (auto-created OR linked via the
	// combobox), these are derived from the company — so they're HIDDEN on the
	// director's card, not asked again (the value is still auto-filled into
	// specificsAnswers + kept fresh by syncAutoIncomeEntries; only the input is hidden).
	// Person-level fields (designation, shareholding %, active-in-ops, ITR-reflects)
	// stay visible. Hiding (vs locking) is cleaner AND avoids stale copies across fill
	// ordering — the company stays the single source of truth.
	const COMPANY_LEVEL_HIDDEN_KEYS = new Set([
		'registeredInIndia',
		'foreignCountry',
		'companyType',
		'firmType',
		'companySharesFinancials',
		'companyProfitable',
		'cin',
		'firmGstRegistered',
		'firmProfitable'
	]);

	// ── Derived: visible specifics (filtered by showWhen + company-derived hide) ──
	let visibleSpecifics = $derived(
		currentSpecifics.filter((q) => {
			if (isCompanySourced && COMPANY_LEVEL_HIDDEN_KEYS.has(q.key)) return false;
			return shouldShow(q.showWhen as any, specificsAnswers);
		})
	);

	// ── Auto-sync professionType from applicant's professionalCategory ──
	// The profession is set on the applicant page; income form inherits it.
	$effect(() => {
		if (currentProfileType === 'professional_practice' && professionalCategory) {
			const mapped = PROF_CATEGORY_TO_TYPE[professionalCategory];
			if (mapped && specificsAnswers.professionType !== mapped) {
				specificsAnswers.professionType = mapped;
			}
		}
	});

	// ── Auto-default positionType for Gov/Defence (always permanent) ──
	$effect(() => {
		const et = specificsAnswers.employerType as string;
		if (['government', 'state_government', 'defence'].includes(et)) {
			if (specificsAnswers.positionType !== 'permanent') {
				specificsAnswers.positionType = 'permanent';
			}
		}
	});

	// ── Auto-clear totalExperience if it contradicts yearsWithEmployer ──
	// Total work experience must be >= time with current employer
	$effect(() => {
		const employer = specificsAnswers.yearsWithEmployer as string;
		const total = specificsAnswers.totalExperience as string;
		if (!employer || !total) return;
		// Employer tenure exceeds total experience = contradiction
		const employerRank: Record<string, number> = {
			lt_6m: 0,
			'6m_1y': 1,
			'1_2y': 2,
			'2_5y': 3,
			gt_5y: 4
		};
		const totalRank: Record<string, number> = { lt_1y: 1, '1_3y': 2, '3_5y': 3, gt_5y: 4 };
		const eRank = employerRank[employer] ?? 0;
		const tRank = totalRank[total] ?? 0;
		// If employer tenure rank exceeds total experience rank, clear total
		if (eRank > tRank) {
			specificsAnswers.totalExperience = '';
		}
	});

	// ── OPC auto-fill: sole director = 100% ownership, MD, active, shares financials ──
	let isOPC = $derived(specificsAnswers.companyType === 'opc');

	const OPC_LOCKED_KEYS = new Set([
		'designation',
		'shareholding',
		'activeInOperations',
		'companySharesFinancials',
		'hasEquity'
	]);

	$effect(() => {
		if (isOPC) {
			if (specificsAnswers.hasEquity !== true) specificsAnswers.hasEquity = true;
			if (specificsAnswers.designation !== 'md') specificsAnswers.designation = 'md';
			if (specificsAnswers.shareholding !== 100) specificsAnswers.shareholding = 100;
			if (specificsAnswers.activeInOperations !== true) specificsAnswers.activeInOperations = true;
			if (specificsAnswers.companySharesFinancials !== true)
				specificsAnswers.companySharesFinancials = true;
		}
	});

	// ── R4: Listed/Large Public auto-fill — no equity, salaried treatment ──
	let isListedLargePublic = $derived(specificsAnswers.companyType === 'listed_large_public');

	const LISTED_LOCKED_KEYS = new Set(['hasEquity']);

	$effect(() => {
		if (isListedLargePublic) {
			// Listed company directors are treated as salaried employees
			if (specificsAnswers.hasEquity !== false) specificsAnswers.hasEquity = false;
		}
	});

	// ── R4: Foreign company — flag for salaried treatment ──────────
	let isForeignCompany = $derived(
		specificsAnswers.registeredInIndia === false &&
			(currentProfileType === 'director_company' || currentProfileType === 'business_partnership')
	);

	// ── Cross-applicant shareholding preview (real-time while typing) ──
	let previewStakeTotal = $derived(
		(Number(specificsAnswers.shareholding) || 0) + (linkedOtherShareholding ?? 0)
	);
	let previewStakeExceeds = $derived(previewStakeTotal > 100 && isLinkedEntry);

	// ── Company income evidence warning ──────────────────────────
	// When an Individual adds director/partner/proprietor income, they MUST
	// provide company-level evidence (company ITR + audited financials).
	const COMPANY_INCOME_TYPES = new Set<string>([
		'director_company',
		'business_partnership',
		'business_proprietorship'
	]);
	let needsCompanyEvidence = $derived(COMPANY_INCOME_TYPES.has(currentProfileType));

	// ── Auto-clear evidence fields when ITR answer changes to No ──
	// When "Your ITR reflects income from this company" toggles from Yes to No,
	// clear downstream evidence fields that depend on it
	$effect(() => {
		const itrReflects = specificsAnswers.itrReflectsIncome;
		if (itrReflects === false) {
			// Clear evidence fields that depend on ITR being filed
			if (evidenceAnswers.itrFiled !== false) evidenceAnswers.itrFiled = false;
			if (evidenceAnswers.vintageYears !== undefined) evidenceAnswers.vintageYears = undefined;
		}
	});

	// ── Auto-created entry locking: fields pre-filled from Company data ──
	// When an income entry was auto-created from a director/partner link,
	// lock the Company-sourced fields. Manual entries are always editable.
	let isAutoEntry = $derived(!!(editingEntry?.autoCreated && !editingEntry?.orphaned));

	// Company-sourced = either an existing auto entry OR a fresh entry the user
	// just linked to a case Company via the combobox. Both lock + show the
	// auto-filled company fields via isAutoLocked / isAutoFillPending below.
	let isCompanySourced = $derived(isAutoEntry || companyLinkedSelection);

	// Applicant-level `directorRole` (set on Applicant Details). Drives the
	// designation-dropdown filter below: `md` is a top-level applicant role,
	// not an income-form subtype — when the applicant isn't an MD at the
	// applicant level we must not offer 'Managing Director (MD)' here as a
	// selectable subtype, otherwise the DSA can accidentally land on the
	// "two MDs in one company" state that the applicant-level uniqueness
	// check already rejects.
	let parentDirectorRole = $derived(
		(formState.applicants[applicantIndex] as { directorRole?: string } | undefined)?.directorRole
	);

	// Keys auto-locked when an income entry was created from a parent Company
	// applicant link (autoCreated: true). The DSA already supplied the parent
	// Company's profile and financials — re-asking these on each director's
	// income card would be pure duplication. Manual / orphaned entries stay
	// editable. See `directorAutoIncome.buildAutoSpecifics` for the writer side.
	const AUTO_LOCKED_KEYS = new Set([
		// Always-present basics (every auto entry):
		'registeredInIndia', // from company.registrationCountry
		'companyType', // director_company → company.companyType
		'firmType', // business_partnership → company.companyType
		'shareholding', // director_company → director.ownershipPercent
		'capitalContribution', // business_partnership → director.ownershipPercent
		// director_company extras:
		'hasEquity', // shareholding > 0
		'designation', // director_company → director.designation (Whole-time / MD / etc.)
		'companySharesFinancials', // true when Company is a primary applicant
		'companyProfitable', // derived from company.companyIncome ITR years
		'cin', // from company.cin (when present)
		// business_partnership extras:
		'partnerType', // mapped from director.designation (partner / designated_partner)
		'firmGstRegistered', // from company.gstStatus (registered* → true, unregistered → false)
		'firmProfitable' // derived from company.companyIncome ITR years
	]);

	// Lock only when the source value is actually present. If the parent Company
	// hasn't supplied the underlying data yet (e.g. ITR years for *Profitable, CIN,
	// GST status), syncAutoIncomeEntries' Step 1e leaves the key absent — locking
	// it anyway would render the field disabled AND empty, with no path for the
	// DSA to fill it. Pending state is handled separately by isAutoFillPending.
	function isAutoLocked(key: string): boolean {
		return (
			isCompanySourced &&
			AUTO_LOCKED_KEYS.has(key) &&
			specificsAnswers[key] !== undefined &&
			specificsAnswers[key] !== ''
		);
	}

	// True when the field would have been auto-locked but the parent Company's
	// source data isn't available yet. The field renders editable so the DSA
	// can fill it manually OR complete the Company profile to trigger backfill
	// via syncAutoIncomeEntries Step 1e. UI surfaces "(auto-fills from Company
	// profile)" so the dependency is visible.
	function isAutoFillPending(key: string): boolean {
		return (
			isCompanySourced &&
			AUTO_LOCKED_KEYS.has(key) &&
			(specificsAnswers[key] === undefined || specificsAnswers[key] === '')
		);
	}

	/** Keys locked when entry is linked to another applicant's same-company entry.
	 * These describe the COMPANY (not the person) and must be consistent across co-applicants. */
	const COMPANY_LINKED_LOCKED_KEYS = new Set([
		'registeredInIndia',
		'foreignCountry',
		'companyType',
		'companyProfitable',
		'companySharesFinancials',
		'cin',
		'firmType',
		'firmGstRegistered',
		'firmProfitable',
		'llpin'
	]);

	// ── Derived: visible income fields (filtered by showWhen) ────
	let visibleIncomeFields = $derived(
		currentIncomeFields.filter((f) =>
			shouldShow(f.showWhen as any, { ...specificsAnswers, ...incomeAnswers })
		)
	);

	// ── Derived: business vintage for CustomIncomeTable ─────────
	// Different income profiles store vintage under different keys.
	// getMaxITRYears() accepts all formats (see companyIncome.ts).
	let tableBusinessVintage = $derived(
		(specificsAnswers.businessExperience as string) ??
			(specificsAnswers.practiceVintage as string) ??
			(specificsAnswers.freelanceVintage as string) ??
			''
	);

	// GST props for CustomIncomeTable
	let tableGstRegistered = $derived(specificsAnswers.gstRegistered === true);
	let tableGstRegDate = $derived((specificsAnswers.gstRegistrationDate as string) ?? '');

	// ── Mutable bridge object for CustomIncomeTable ──────────────
	// The table component uses bind:answers so it needs a mutable object.
	// We sync specificsAnswers into it reactively via $effect.
	let tableAnswers = $state<Record<string, unknown>>({});

	$effect(() => {
		// Read only the input dependencies (specificsAnswers, incomeAnswers)
		const itrFiled = specificsAnswers.itrFiled === true;
		const gstRegistered = specificsAnswers.gstRegistered === true;
		const gstDate = specificsAnswers.gstRegistrationDate || '';
		const financials = incomeAnswers.financialsTable;

		// Read tableAnswers WITHOUT creating a dependency (prevents infinite loop)
		const prev = untrack(() => ({ ...tableAnswers }));

		tableAnswers = {
			...prev,
			businessActivityDetails: {
				itr_filed_regularly: itrFiled,
				gst_registered: gstRegistered
			},
			GSTRegistrationYear: gstDate,
			financialTable: financials || prev.financialTable || undefined
		};
	});

	// ── Derived: entry count per profile type ─────────────────────
	let entryCountByProfile = $derived(
		existingEntries.reduce(
			(acc, entry) => {
				acc[entry.profileType] = (acc[entry.profileType] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		)
	);

	// ── Effect: Load editing entry into form ──────────────────────
	$effect(() => {
		if (editingEntry) {
			isEditing = true;
			editingId = editingEntry.id;
			currentProfileType = editingEntry.profileType;
			entityName = editingEntry.entityName;
			specificsAnswers = { ...editingEntry.specifics };
			incomeAnswers = { ...(editingEntry.income as Record<string, unknown>) };
			evidenceAnswers = {
				itrFiled: editingEntry.evidence.itrFiled,
				hasDocumentaryEvidence: editingEntry.evidence.hasDocumentaryEvidence,
				receivingBankName: editingEntry.evidence.receivingBankName || '',
				vintageYears: editingEntry.evidence.vintageYears
			};

			// Reflect an existing company link so the combobox + locks render correctly
			companyLinkedSelection = !!(editingEntry.autoCreated && editingEntry.sourceCompanyId);
			selectedCompanyId = editingEntry.sourceCompanyId;
			useOtherCompany = false;

			// Sync tableAnswers immediately so CustomIncomeTable doesn't
			// initialize with empty data (prevents $effect timing race where
			// the table's onChange overwrites saved financials with an empty template)
			const savedFinancials = (editingEntry.income as Record<string, unknown>)?.financialsTable;
			if (savedFinancials) {
				untrack(() => {
					tableAnswers = {
						...tableAnswers,
						businessActivityDetails: {
							itr_filed_regularly: editingEntry.specifics?.itrFiled === true,
							gst_registered: editingEntry.specifics?.gstRegistered === true
						},
						GSTRegistrationYear: (editingEntry.specifics?.gstRegistrationDate as string) || '',
						financialTable: savedFinancials
					};
				});
			}

			formErrors = {};
		}
	});

	// ── In-progress draft persistence (survives step navigation) ──
	// IncomeSourceForm unmounts when the user navigates to another wizard step.
	// Without this, a half-filled (not-yet-"Add to Profile") entry is lost. We
	// buffer the add-mode draft per applicant in a module-scoped store and
	// rehydrate it on return. Edit mode (editingEntry) is excluded — those round
	// through the committed-entry path already.
	let draftKey = $derived(
		incomeDraftKey(filledBy, formState.applicants[applicantIndex]?.id ?? applicantIndex)
	);
	// The key the local form was last hydrated for. When draftKey changes (e.g.
	// the form is reused for a different applicant) we re-hydrate and, crucially,
	// the save effect below pauses so it can't write applicant A's draft under
	// applicant B's key.
	let hydratedForKey = $state<string | null>(null);

	$effect(() => {
		const key = draftKey;
		if (editingEntry) return; // edit mode: never touch drafts
		if (hydratedForKey === key) return; // already hydrated for this applicant
		untrack(() => {
			const draft = loadIncomeSourceDraft(key);
			if (draft) {
				currentProfileType = draft.currentProfileType;
				entityName = draft.entityName;
				specificsAnswers = { ...draft.specificsAnswers };
				incomeAnswers = { ...draft.incomeAnswers };
				evidenceAnswers = { ...draft.evidenceAnswers };
				companyLinkedSelection = draft.companyLinkedSelection;
				selectedCompanyId = draft.selectedCompanyId;
				useOtherCompany = draft.useOtherCompany;
				// Restore the CustomIncomeTable bind bridge directly. Without this,
				// the table-sync $effect at the top of the component overwrites
				// tableAnswers from incomeAnswers.financialsTable on the first
				// tick after mount, racing with CustomIncomeTable's own initial
				// $derived read of `answers[questionId]` — so the table renders
				// empty even though incomeAnswers still holds the FY values.
				// Mirrors the editing-entry sync at the `if (editingEntry)` branch
				// above (financialsTable → tableAnswers.financialTable).
				if (draft.tableAnswers) {
					tableAnswers = { ...draft.tableAnswers };
				}
			} else if (hydratedForKey !== null) {
				// Switched to a different applicant that has no draft — clear the
				// carried-over form so applicant A's typing doesn't bleed into B.
				currentProfileType = '';
				entityName = '';
				specificsAnswers = {};
				incomeAnswers = {};
				evidenceAnswers = {
					itrFiled: false,
					hasDocumentaryEvidence: false,
					receivingBankName: '',
					vintageYears: undefined
				};
				companyLinkedSelection = false;
				selectedCompanyId = undefined;
				useOtherCompany = false;
				tableAnswers = {};
			}
			hydratedForKey = key;
		});
	});

	$effect(() => {
		// Track every draft field so this re-runs on any edit.
		const snapshot = $state.snapshot({
			currentProfileType,
			entityName,
			specificsAnswers,
			incomeAnswers,
			evidenceAnswers,
			companyLinkedSelection,
			selectedCompanyId,
			useOtherCompany,
			// CustomIncomeTable's bind bridge. Persisted so a Previous→back round
			// trip can hand the table back its exact prior bind object without
			// the table-sync $effect race rebuilding it from possibly-empty
			// incomeAnswers.financialsTable (Pitfall #25 specialization).
			tableAnswers
		});
		const key = draftKey;
		// Only persist once hydrated for THIS key and only in add mode — otherwise
		// we could write stale/cross-applicant or edit-mode data.
		if (editingEntry || hydratedForKey !== key) return;
		saveIncomeSourceDraft(key, snapshot as Parameters<typeof saveIncomeSourceDraft>[1]);
	});

	// ── Reset form when profile type changes ──────────────────────
	function handleProfileTypeChange(value: string | number) {
		if (!isEditing) {
			specificsAnswers = {};
			incomeAnswers = {};
			evidenceAnswers = {
				itrFiled: false,
				hasDocumentaryEvidence: false,
				receivingBankName: '',
				vintageYears: undefined
			};
			formErrors = {};
			entityName = '';
			// Reset director-company link state on profile switch
			companyLinkedSelection = false;
			selectedCompanyId = undefined;
			useOtherCompany = false;
		}
	}

	// ── Director-in-Company: handle company selection from the combobox ──
	// Selecting a real case Company links the entry and auto-fills + locks the
	// company specifics (type, registration, equity, designation, shareholding,
	// shares-financials, profitability). "Other" switches to free text for a
	// company that is NOT an applicant on this loan.
	const OTHER_COMPANY_SENTINEL = '__other_company__';

	function handleCompanySelect(value: string | number) {
		const val = String(value);
		if (val === OTHER_COMPANY_SENTINEL) {
			useOtherCompany = true;
			companyLinkedSelection = false;
			selectedCompanyId = undefined;
			entityName = '';
			// Clear company-derived specifics so the external company is asked fresh
			specificsAnswers = {};
			return;
		}
		const option = companyNameOptions.find((o) => o.companyId === val);
		if (option) applyCompanyLink(option);
	}

	function applyCompanyLink(option: CompanyLinkOption) {
		// Pull this director's ownership % and role from the Company applicant's
		// directors[] (matched by name) so buildAutoSpecifics derives the right
		// shareholding / designation / partnerType.
		const company = formState.applicants.find(
			(a) => (a as { id?: string }).id === option.companyId
		) as Record<string, unknown> | undefined;

		const individualName = (
			(formState.applicants[applicantIndex] as { fullName?: string } | undefined)?.fullName ?? ''
		)
			.trim()
			.toLowerCase();

		let ownershipPercent = 0;
		let directorRole: string | undefined;
		const directors = ((company?.directors as Array<Record<string, unknown>>) ?? []) as Array<{
			fullName?: string;
			ownershipPercent?: number;
			designation?: string;
			role?: string;
		}>;
		const match = directors.find((d) => (d.fullName ?? '').trim().toLowerCase() === individualName);
		if (match && typeof match.ownershipPercent === 'number')
			ownershipPercent = match.ownershipPercent;
		directorRole = match?.designation || match?.role;

		const specifics = buildAutoSpecifics({
			profileType: 'director_company',
			isRegisteredInIndia: option.registrationCountry !== 'Foreign',
			specificsTypeValue: COMPANY_TYPE_TO_SPECIFICS_VALUE[option.companyType] ?? option.companyType,
			ownershipPercent,
			companyContext: {
				companyIncome: company?.companyIncome as Record<string, unknown> | undefined,
				gstStatus: company?.gstStatus as string | undefined,
				cin: company?.cin as string | undefined,
				directorRole
			}
		});

		entityName = option.value;
		specificsAnswers = { ...specificsAnswers, ...specifics };
		selectedCompanyId = option.companyId;
		companyLinkedSelection = true;
		useOtherCompany = false;
		// Drop a stale entityName error if present
		if (formErrors.entityName) {
			const { entityName: _drop, ...rest } = formErrors;
			formErrors = rest;
		}
	}

	// Return from the "Other" free-text path back to the company dropdown.
	function backToCompanyList() {
		useOtherCompany = false;
		companyLinkedSelection = false;
		selectedCompanyId = undefined;
		entityName = '';
		specificsAnswers = {};
	}

	// ── Cross-field: employer duration vs total experience ───────
	// Minimum years implied by each employer-duration option
	const EMPLOYER_MIN_YEARS: Record<string, number> = {
		lt_6m: 0,
		'6m_1y': 0.5,
		'1_2y': 1,
		'2_5y': 2,
		gt_5y: 5
	};

	// Maximum years implied by each total-experience option
	const TOTAL_MAX_YEARS: Record<string, number> = {
		lt_1y: 1,
		'1_3y': 3,
		'3_5y': 5,
		gt_5y: Infinity
	};

	function checkExperienceConsistency(answers: Record<string, unknown>): string | null {
		const emp = answers.yearsWithEmployer as string;
		const total = answers.totalExperience as string;
		if (!emp || !total) return null;
		const empMin = EMPLOYER_MIN_YEARS[emp] ?? 0;
		const totalMax = TOTAL_MAX_YEARS[total] ?? Infinity;
		if (totalMax < empMin) {
			return 'Total experience cannot be less than time at current employer';
		}
		return null;
	}

	// ── Update specifics answer ──────────────────────────────────
	function updateSpecific(key: string, value: unknown) {
		// FEMA gate — block "No, foreign firm" before persisting anything.
		// Income from foreign-registered firms isn't supported for Indian
		// loan eligibility; same Pitfall #39 pattern as the parent-applicant
		// FEMA modal (AddApplicantBusiness / AddApplicantProfessional).
		// Reset on both confirm and dismiss so any way the user closes the
		// modal reverts the offending selection. The reset is also called
		// immediately so the false value never persists even briefly in
		// downstream reactive readers.
		if (key === 'registeredInIndia' && value === false) {
			const resetToIndia = () => {
				specificsAnswers = { ...specificsAnswers, registeredInIndia: true };
			};
			resetToIndia();
			openConfirmModal(
				'Foreign Firm Not Supported',
				"Income from foreign-registered firms isn't accepted for loan eligibility — most Indian lenders won't consider it. Please report only income from Indian-registered firms.",
				resetToIndia,
				{ confirmLabel: 'I understand', cancelLabel: null, onCancel: resetToIndia }
			);
			return;
		}

		specificsAnswers = { ...specificsAnswers, [key]: value };
		// Clear error for this field
		if (formErrors[key]) {
			const { [key]: _, ...rest } = formErrors;
			formErrors = rest;
		}

		// ── R4: Clear downstream specifics when gate questions change ──
		// When registeredInIndia toggles, all India-specific answers become stale
		if (key === 'registeredInIndia') {
			const clearKeys = [
				'companyType',
				'hasEquity',
				'designation',
				'shareholding',
				'activeInOperations',
				'companyProfitable',
				'companySharesFinancials',
				'itrReflectsIncome',
				'cin',
				'foreignCountry',
				// Partner keys
				'firmType',
				'partnerType',
				'capitalContribution',
				'firmGstRegistered',
				'firmProfitable',
				'profitShareExceedsThreshold',
				'llpin'
			];
			const cleared: Record<string, unknown> = {};
			for (const k of clearKeys) {
				if (specificsAnswers[k] !== undefined) cleared[k] = undefined;
			}
			if (Object.keys(cleared).length > 0) {
				specificsAnswers = { ...specificsAnswers, ...cleared };
			}
			// Also clear income answers to prevent stale salary/profit values
			incomeAnswers = {};
		}

		// When companyType changes, clear equity-dependent specifics
		if (key === 'companyType') {
			const equityDependentKeys = [
				'hasEquity',
				'designation',
				'shareholding',
				'activeInOperations',
				'companyProfitable',
				'companySharesFinancials',
				'itrReflectsIncome'
			];
			const cleared: Record<string, unknown> = {};
			for (const k of equityDependentKeys) {
				if (specificsAnswers[k] !== undefined) cleared[k] = undefined;
			}
			if (Object.keys(cleared).length > 0) {
				specificsAnswers = { ...specificsAnswers, ...cleared };
			}
			incomeAnswers = {};
		}

		// When hasEquity changes, clear fields that depend on it
		if (key === 'hasEquity' && value === false) {
			const equityFields = [
				'designation',
				'shareholding',
				'activeInOperations',
				'companyProfitable',
				'companySharesFinancials',
				'itrReflectsIncome'
			];
			const cleared: Record<string, unknown> = {};

			for (const k of equityFields) {
				if (specificsAnswers[k] !== undefined) {
					// Back up value so it can be restored if user flips hasEquity back to Yes
					equityBackup = {
						...equityBackup,
						[k]: specificsAnswers[k]
					};
					cleared[k] = undefined;
				}
			}
			if (Object.keys(cleared).length > 0) {
				specificsAnswers = { ...specificsAnswers, ...cleared };
			}
			incomeAnswers = {};
		}

		if (key === 'hasEquity' && value === true) {
			if (Object.keys(equityBackup).length > 0) {
				specificsAnswers = { ...specificsAnswers, ...equityBackup };

				// clear backup after restore
				equityBackup = {};
			}
		}

		// Auto-derive PF deduction for govt/PSU/defence + permanent
		const SECURE_EMPLOYERS = ['government', 'state_government', 'defence'];
		if (key === 'employerType' || key === 'positionType') {
			const empType = specificsAnswers.employerType as string;
			const posType = specificsAnswers.positionType as string;
			if (SECURE_EMPLOYERS.includes(empType) && posType === 'permanent') {
				specificsAnswers = { ...specificsAnswers, pfDeducted: true };
			}
		}

		// Cross-field: employer duration vs total experience (real-time on both)
		if (key === 'yearsWithEmployer' || key === 'totalExperience') {
			const err = checkExperienceConsistency(specificsAnswers);
			if (err) {
				formErrors = {
					...formErrors,
					yearsWithEmployer: err,
					totalExperience: err
				};
			} else {
				const updated = { ...formErrors };
				delete updated.yearsWithEmployer;
				delete updated.totalExperience;
				formErrors = updated;
			}
		}
	}

	// ── Update income answer ─────────────────────────────────────
	function updateIncome(key: string, value: unknown) {
		incomeAnswers = { ...incomeAnswers, [key]: value };
		if (formErrors[key]) {
			const { [key]: _, ...rest } = formErrors;
			formErrors = rest;
		}
	}

	// ── Validate & Add Entry ─────────────────────────────────────
	function handleAddOrUpdate() {
		attemptedSave = true;
		const errors: Record<string, string> = {};

		// Validate profile type selection
		if (!currentProfileType) {
			openModal('Please select an income source type from the dropdown.');
			return;
		}

		// Validate entity name
		if (currentProfileType !== 'no_current_income' && !entityName.trim()) {
			errors.entityName = `${entityLabel} is required`;
		}

		// Validate required specifics
		for (const q of visibleSpecifics) {
			if (q.required) {
				const val = specificsAnswers[q.key];
				if (val === undefined || val === null || val === '') {
					errors[q.key] = `${q.question} is required`;
				}
			}
			// Check invalidateOn
			if (q.invalidateOn !== undefined && specificsAnswers[q.key] === q.invalidateOn) {
				errors[q.key] = q.errorMessage || 'This answer prevents loan processing for this source.';
			}
		}

		// Cross-field: employer duration vs total experience (flag both)
		const expError = checkExperienceConsistency(specificsAnswers);
		if (expError) {
			errors.yearsWithEmployer = expError;
			errors.totalExperience = expError;
		}

		// Cross-field: director/partner with zero income (both salary=No and profit=No)
		// Only applies on the standard path (Indian company + equity-holding director, or Indian partner)
		// Foreign/listed/professional directors use salaried fields instead
		if (
			currentProfileType === 'director_company' ||
			currentProfileType === 'business_partnership'
		) {
			const isIndianStandardPath =
				specificsAnswers.registeredInIndia === true &&
				(currentProfileType !== 'director_company' ||
					(specificsAnswers.companyType !== 'listed_large_public' &&
						specificsAnswers.hasEquity === true));

			if (isIndianStandardPath) {
				const drawsSalary = incomeAnswers.drawsSalary;
				const receivesProfit = incomeAnswers.receivesProfit;
				if (drawsSalary === false && receivesProfit === false) {
					errors.drawsSalary =
						'At least one income source (salary or profit) is needed. Both cannot be No.';
					errors.receivesProfit =
						'At least one income source (salary or profit) is needed. Both cannot be No.';
				}
			}
		}

		// Validate required income fields
		for (const f of visibleIncomeFields) {
			if (f.required) {
				const val = incomeAnswers[f.key];
				if (val === undefined || val === null || val === '' || val === 0) {
					errors[f.key] = `${f.label} is required`;
				}
			}

			// Run field-level validation
			if (f.validation && incomeAnswers[f.key]) {
				const validationError = runFieldValidation(f, incomeAnswers);
				if (validationError) {
					errors[f.key] = validationError;
				}
			}
		}

		// Check financial table validity (ITR year fields: net profit, depreciation, gross receipts)
		const financialField = visibleIncomeFields.find((f) => f.type === 'table');
		if (financialField && !financialTableValid) {
			errors[financialField.key] = 'Please complete the financial details';
		}

		if (Object.keys(errors).length > 0) {
			formErrors = errors;
			// Scroll to first error
			const firstErrorKey = Object.keys(errors)[0];
			const el = document.getElementById(`field_${firstErrorKey}`);
			el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}

		// Build the entry
		const now = new Date().toISOString();
		const entry: IncomeSourceEntry = {
			id: isEditing && editingId ? editingId : generateId(),
			profileType: currentProfileType as IncomeProfileType,
			entityName: entityName.trim(),
			specifics: { ...specificsAnswers },
			income: { ...incomeAnswers } as IncomeEntryAmounts,
			evidence: {
				itrFiled: evidenceAnswers.itrFiled as boolean,
				hasDocumentaryEvidence: evidenceAnswers.hasDocumentaryEvidence as boolean,
				receivingBankName: (evidenceAnswers.receivingBankName as string) || undefined,
				vintageYears: (evidenceAnswers.vintageYears as number) || undefined
			},
			createdAt: isEditing ? editingEntry?.createdAt || now : now,
			updatedAt: now,
			filledBy,
			// Preserve auto-income metadata through edit round-trips; for a fresh
			// entry the user just linked to a case Company, persist it as a linked
			// auto-entry so the company fields stay locked on reopen and
			// syncAutoIncomeEntries treats the company as represented (no duplicate).
			...(editingEntry?.autoCreated != null
				? {
						autoCreated: editingEntry.autoCreated,
						sourceCompanyId: editingEntry.sourceCompanyId,
						orphaned: editingEntry.orphaned,
						orphanedCompanyName: editingEntry.orphanedCompanyName
					}
				: companyLinkedSelection && selectedCompanyId
					? { autoCreated: true, sourceCompanyId: selectedCompanyId }
					: {})
		};

		if (isEditing) {
			onUpdateEntry?.(entry);
		} else {
			onAddEntry(entry);
		}

		// Reset form
		resetForm();
	}

	// ── Reset form to clean state ────────────────────────────────
	function resetForm() {
		// Notify parent FIRST so it clears editingEntry prop —
		// this prevents the editing $effect from re-populating the form
		// after we clear it below
		onCancelEdit?.();

		// Entry committed (or edit cancelled) — drop the in-progress draft buffer so
		// it isn't rehydrated on the next visit.
		clearIncomeSourceDraft(draftKey);

		// Then clear all local state
		isEditing = false;
		editingId = null;
		currentProfileType = '';
		entityName = '';
		specificsAnswers = {};
		incomeAnswers = {};
		evidenceAnswers = {
			itrFiled: false,
			hasDocumentaryEvidence: false,
			receivingBankName: '',
			vintageYears: undefined
		};
		formErrors = {};
		financialTableValid = true;
		attemptedSave = false;
		companyLinkedSelection = false;
		selectedCompanyId = undefined;
		useOtherCompany = false;
	}

	// ── Run field validation from config ─────────────────────────
	function runFieldValidation(field: IncomeField, answers: Record<string, unknown>): string | null {
		const validation = field.validation as any;
		if (!validation?.condition) return null;

		for (const rule of validation.condition) {
			const caseCondition = rule.case;
			if (!caseCondition) continue;

			// Evaluate condition
			const result = evaluateValidationCondition(caseCondition, answers);
			if (result) {
				// Find the error key (first key that ends with 'Error')
				const errorKey = Object.keys(rule).find((k) => k.endsWith('Error'));
				if (errorKey) return rule[errorKey];
			}
		}
		return null;
	}

	// ── Evaluate validation condition (simplified JSON Logic) ────
	function evaluateValidationCondition(
		cond: Record<string, unknown>,
		answers: Record<string, unknown>
	): boolean {
		const operators = ['<', '>', '<=', '>=', '==', '!='] as const;

		for (const op of operators) {
			if (cond[op]) {
				const [left, right] = cond[op] as [unknown, unknown];

				// Resolve var references
				const leftVal = resolveVarRef(left, answers);
				const rightVal = resolveVarRef(right, answers);

				switch (op) {
					case '<':
						return Number(leftVal) < Number(rightVal);
					case '>':
						return Number(leftVal) > Number(rightVal);
					case '<=':
						return Number(leftVal) <= Number(rightVal);
					case '>=':
						return Number(leftVal) >= Number(rightVal);
					case '==':
						return leftVal === rightVal;
					case '!=':
						return leftVal !== rightVal;
				}
			}
		}
		return false;
	}

	function resolveVarRef(value: unknown, answers: Record<string, unknown>): unknown {
		if (typeof value === 'object' && value !== null && 'var' in value) {
			return answers[(value as { var: string }).var];
		}
		return value;
	}

	// ── Validate a single income field (used on blur & enter) ────
	function validateIncomeField(field: IncomeField) {
		let err: string | null = null;
		const val = incomeAnswers[field.key];
		if (field.required && (val === undefined || val === null || val === '' || val === 0)) {
			err = `${field.label} is required`;
		}
		if (!err && field.validation && val) {
			err = runFieldValidation(field, incomeAnswers);
		}
		if (err) {
			formErrors = { ...formErrors, [field.key]: err };
		} else if (formErrors[field.key]) {
			const { [field.key]: _, ...rest } = formErrors;
			formErrors = rest;
		}
	}

	// ── Auto-detect evidence from specifics ──────────────────────
	// Only auto-SET to true when specifics imply evidence exists.
	// Never force back to false — user's manual "Yes" selection is preserved.
	$effect(() => {
		// Auto-set ITR evidence from specifics (only upgrade to true)
		const itrFromSpecifics =
			!!specificsAnswers.itrFiled ||
			!!specificsAnswers.itrReflectsIncome ||
			!!specificsAnswers.itrReflectsRental ||
			!!specificsAnswers.itrReflects;
		if (itrFromSpecifics) {
			evidenceAnswers.itrFiled = true;
		}

		// Auto-set documentary evidence (only upgrade to true)
		const hasDoc =
			!!specificsAnswers.receivesForm16 ||
			!!specificsAnswers.hasContractCopy ||
			!!specificsAnswers.pensionSlipAvailable ||
			!!specificsAnswers.rentAgreementRegistered ||
			!!specificsAnswers.landRecordsAvailable ||
			!!specificsAnswers.dematStatement ||
			!!specificsAnswers.hasProfessionalLicense ||
			!!specificsAnswers.salaryInBank;
		if (hasDoc) {
			evidenceAnswers.hasDocumentaryEvidence = true;
		}
	});
</script>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- INCOME SOURCE ENTRY FORM                                          -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<div class="flex flex-col gap-5">
	<!-- Edit Mode Banner -->
	{#if isEditing}
		<div
			class="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-700/40 dark:bg-blue-900/20"
		>
			<Info class="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
			<span class="alertText flex-1 text-blue-800 dark:text-blue-200">
				Editing entry: <strong>{entityName || 'Untitled'}</strong>
			</span>
			<button
				type="button"
				class="buttonText !m-0 cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-800"
				onclick={resetForm}
			>
				Cancel Edit
			</button>
		</div>
	{/if}

	<!-- ── Row 1: Profile Type Dropdown + Entity Name ──────────── -->
	<div class="grid {deviceState.isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4">
		<!-- Profile Type Dropdown -->
		<SelectField
			id="incomeProfileType"
			label="Income Source Type"
			options={profileDropdownOptions}
			bind:value={currentProfileType}
			required={true}
			icon="Briefcase"
			subLabel="income source"
			onChange={handleProfileTypeChange}
			error={formErrors.profileType || null}
		/>

		<!-- Entity Name -->
		{#if currentProfileType && currentProfileType !== 'no_current_income'}
			<div id="field_entityName">
				{#if currentProfileType === 'business_partnership' && firmNameOptions && firmNameOptions.length > 0 && !isAutoEntry && !isLinkedEntry}
					<FirmNameCombobox
						id="entityName"
						label={entityLabel}
						value={entityName}
						options={firmNameOptions}
						placeholder={entityPlaceholder}
						required={true}
						error={formErrors.entityName || null}
						onChange={(val) => {
							entityName = val;
							if (formErrors.entityName) {
								const { entityName: _, ...rest } = formErrors;
								formErrors = rest;
							}
						}}
					/>
				{:else if currentProfileType === 'director_company' && companyNameOptions.length > 0 && !isAutoEntry && !isLinkedEntry && !useOtherCompany}
					<!-- Director-in-Company: pick the actual Company applicant so the
					     entry links + auto-fills + locks (no conflicting free-typed name). -->
					<SelectField
						id="entityName"
						label={entityLabel}
						options={[
							...companyNameOptions.map((c) => ({ label: c.label, value: c.companyId })),
							{ label: 'Other (company not on this loan)', value: OTHER_COMPANY_SENTINEL }
						]}
						value={selectedCompanyId ?? ''}
						required={true}
						icon="Building2"
						subLabel="select the company"
						onChange={handleCompanySelect}
						error={formErrors.entityName || null}
					/>
				{:else}
					<TextField
						id="entityName"
						label={isAutoEntry ? entityLabel + ' (auto)' : entityLabel}
						bind:value={entityName}
						placeholder={entityPlaceholder}
						required={true}
						icon="Building2"
						maxLength={100}
						disabled={isAutoEntry || isLinkedEntry}
						error={formErrors.entityName || null}
						onInput={(val) => {
							entityName = val;
							if (formErrors.entityName) {
								const { entityName: _, ...rest } = formErrors;
								formErrors = rest;
							}
						}}
					/>
				{/if}

				<!-- Director "Other" path: offer a way back to the case company list -->
				{#if currentProfileType === 'director_company' && useOtherCompany && companyNameOptions.length > 0}
					<button
						type="button"
						class="tinyText mt-1 cursor-pointer text-[var(--ddsa-warning)]"
						onclick={backToCompanyList}
					>
						← Select a company from this case instead
					</button>
				{/if}
			</div>

			<!-- Same-company link banner -->
			{#if isLinkedEntry && linkedSourceName}
				<div class="warning-message mt-1 mb-1 !border-l-1">
					<span class="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
						><Paperclip class="h-4 w-4" /></span
					>
					<p class="tinyText">
						Company details synced from <strong>{linkedSourceName}</strong>'s entry. Company-level
						fields (type, profitability, financials) are locked. Personal fields (designation,
						salary, shareholding) remain editable.
					</p>
				</div>
			{/if}

			<!-- Cross-applicant stake/OPC warnings -->
			{#if linkedEntryWarnings?.hasAnyWarning || previewStakeExceeds}
				<div class="warning-message mt-1 mb-1 !border-l-1">
					<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
					<div class="tinyText">
						{#if linkedEntryWarnings?.opcWarning}
							<p class="font-titleMedium">{linkedEntryWarnings.opcWarning}</p>
						{/if}
						{#if linkedEntryWarnings?.stakeWarning}
							<p>{linkedEntryWarnings.stakeWarning}</p>
						{:else if previewStakeExceeds}
							<p>
								Total shareholding with other co-applicants: {previewStakeTotal}% (exceeds 100%).
							</p>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<!-- Entry count badge -->
		{#if currentProfileType && entryCountByProfile[currentProfileType]}
			<div class="flex items-center gap-2">
				<span
					class="tinyText rounded-full border border-[var(--form-border)] bg-[var(--form-bg-card)] px-2 py-1 text-[var(--form-text-label)]"
				>
					{entryCountByProfile[currentProfileType]} existing {entryCountByProfile[
						currentProfileType
					] === 1
						? 'entry'
						: 'entries'} for this type
				</span>
			</div>
		{/if}

		<!-- ── Specifics Section ──────────────────────────────────── -->
		{#if currentProfileType && visibleSpecifics.length > 0}
			<div
				class="flex flex-col gap-4 border-[var(--form-border)] pt-2 sm:rounded-xl sm:border sm:bg-[var(--form-bg-card)] sm:p-4 sm:shadow-sm"
			>
				<!-- Section Header -->
				<div class="flex items-center gap-2 pb-1">
					<div class="h-1 w-4 rounded-full bg-linear-to-r from-stone-500 to-neutral-400"></div>
					<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
						Employment Specifics
					</span>
				</div>

				<!-- Company-derived note: company-level fields are taken from the linked
			     Company applicant and not asked here. -->
				{#if isCompanySourced && entityName}
					<p class="tinyText -mt-1 text-(--form-text-muted)">
						Company details (type, registration, GST, financials) are taken from
						<strong>{entityName}</strong> and don't need to be re-entered here.
					</p>
				{/if}

				<!-- Questions Grid -->
				<div
					class="grid {deviceState.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-10"
				>
					{#each visibleSpecifics as question (question.id)}
						<div
							id="field_{question.key}"
							class={question.type === 'multiple-select'
								? deviceState.isMobile
									? 'col-span-1'
									: 'col-span-2'
								: ''}
						>
							{#if question.type === 'radio'}
								{@const isRadioLocked =
									(isOPC && OPC_LOCKED_KEYS.has(question.key)) ||
									(isListedLargePublic && LISTED_LOCKED_KEYS.has(question.key)) ||
									isAutoLocked(question.key) ||
									(isLinkedEntry && COMPANY_LINKED_LOCKED_KEYS.has(question.key))}
								{@const radioPending = isAutoFillPending(question.key)}
								{#if isRadioLocked}
									<!-- Read-only badge for locked radio fields (OPC auto-set values) -->
									<div class="mb-1">
										<span class="text-labelQuestion text-[var(--form-text-label)]">
											{question.question}

											<span class="tinyText text-[var(--form-text-muted)]">(auto)</span>
										</span>
										<div
											class="tinyText font-titleMedium inline-flex items-center gap-1.5 rounded-lg border border-(--form-border) bg-(--form-bg-alt) px-3 py-1.5 text-[var(--form-text-label)]"
										>
											{getDisplayValue(specificsAnswers[question.key]) === 'true'
												? 'Yes'
												: getDisplayValue(specificsAnswers[question.key]) === 'false'
													? 'No'
													: getDisplayValue(specificsAnswers[question.key])}
										</div>
									</div>
								{:else}
									<RadioField
										id={question.id}
										label={radioPending
											? question.question + ' (auto-fills from Company profile)'
											: question.question}
										options={castOptions(question.options || [])}
										value={getDisplayValue(specificsAnswers[question.key])}
										required={question.required}
										description={question.description}
										descriptionHeader={question.descriptionHeader}
										error={formErrors[question.key] || null}
										onChange={(val) =>
											updateSpecific(question.key, castRadioValue(val, question.options || []))}
									/>
								{/if}
							{:else if question.type === 'select'}
								{@const isProfLocked =
									question.key === 'professionType' && professionLockedByApplicant}
								{@const isFieldLocked =
									isProfLocked ||
									(isOPC && OPC_LOCKED_KEYS.has(question.key)) ||
									(isListedLargePublic && LISTED_LOCKED_KEYS.has(question.key)) ||
									isAutoLocked(question.key) ||
									(isLinkedEntry && COMPANY_LINKED_LOCKED_KEYS.has(question.key))}
								{@const selectPending = !isFieldLocked && isAutoFillPending(question.key)}
								{@const filteredOpts = (question.options || [])
									.filter((o: any) => !o.showWhen || shouldShow(o.showWhen, specificsAnswers))
									// Income-form `designation` is a SUBTYPE picker for the applicant's
									// applicant-level role. When that role isn't 'managing_director',
									// remove the 'md' option — MD is a distinct top-level role
									// (set on Applicant Details, capped to one per company) and must
									// not be reachable as a subtype here.
									.filter(
										(o: any) =>
											question.key !== 'designation' ||
											o.value !== 'md' ||
											parentDirectorRole === 'managing_director'
									)}

								<SelectField
									id={question.id}
									label={isProfLocked
										? question.question + ' (from Applicant Profile)'
										: isFieldLocked
											? question.question + ' (auto)'
											: selectPending
												? question.question + ' (auto-fills from Company profile)'
												: question.question}
									options={castOptions(filteredOpts)}
									value={getDisplayValue(specificsAnswers[question.key])}
									required={question.required}
									icon={question.icon}
									subLabel={question.subLabel || 'option'}
									description={question.description}
									disabled={isFieldLocked}
									error={formErrors[question.key] || null}
									onChange={(val) =>
										updateSpecific(question.key, castRadioValue(val, question.options || []))}
								/>
							{:else if question.type === 'text'}
								<TextField
									id={question.id}
									label={question.question}
									value={(specificsAnswers[question.key] as string) || ''}
									required={question.required}
									icon={question.icon}
									placeholder={question.placeholder}
									description={question.description}
									error={formErrors[question.key] || null}
									onInput={(val) => updateSpecific(question.key, val)}
								/>
							{:else if question.type === 'number'}
								{@const isNumLocked =
									(isOPC && OPC_LOCKED_KEYS.has(question.key)) ||
									(isListedLargePublic && LISTED_LOCKED_KEYS.has(question.key)) ||
									isAutoLocked(question.key) ||
									(isLinkedEntry && COMPANY_LINKED_LOCKED_KEYS.has(question.key))}
								{@const numPending = !isNumLocked && isAutoFillPending(question.key)}
								{@const numVal = specificsAnswers[question.key]}

								<TextField
									id={question.id}
									label={isNumLocked
										? question.question + ' (auto)'
										: numPending
											? question.question + ' (auto-fills from Company profile)'
											: question.question}
									value={numVal != null && numVal !== '' ? String(numVal) : ''}
									required={question.required}
									icon={question.icon}
									placeholder={question.placeholder}
									description={question.description}
									uiType="number"
									type="text"
									maxLength={question.maxLength || 15}
									enableNumberToWords={question.showNumberInWords}
									disabled={isNumLocked}
									error={formErrors[question.key] || null}
									onInput={(val) => {
										// Clamp to question.min/max if declared. Belt-and-suspenders
										// for fields like capital contribution (%) where the config
										// declares max: 100 — without this, a paste of "12345" would
										// bypass the input maxLength and persist as 12345 in state.
										let parsed = val === '' ? '' : Number(String(val).replace(/,/g, ''));
										if (typeof parsed === 'number' && Number.isFinite(parsed)) {
											if (typeof question.max === 'number' && parsed > question.max) {
												parsed = question.max;
											}
											if (typeof question.min === 'number' && parsed < question.min) {
												parsed = question.min;
											}
										}
										updateSpecific(question.key, parsed);
									}}
								/>
							{:else if question.type === 'percentage'}
								<TextField
									id={question.id}
									label={question.question}
									value={(specificsAnswers[question.key] as string) || ''}
									required={question.required}
									icon={question.icon}
									placeholder={question.placeholder || 'Enter percentage'}
									uiType="number"
									type="text"
									maxLength={5}
									error={formErrors[question.key] || null}
									onInput={(val) => {
										const numVal = val === '' ? '' : Number(String(val).replace(/,/g, ''));
										updateSpecific(question.key, numVal);
									}}
								/>
							{:else if question.type === 'month-year'}
								<div class="flex w-full flex-col gap-1.5">
									<label for={question.id} class="text-labelText text-(--form-text-secondary)">
										{question.question}
										{#if question.required}
											<span class="label-required">*</span>
										{/if}
									</label>
									<DatePickerYearAndMonth
										id={question.id}
										questionId={question.key}
										{applicantIndex}
										value={(specificsAnswers[question.key] as string) || ''}
										minYear={question.min ?? 2017}
										introduceMonthIndia={7}
										onchange={(e) => updateSpecific(question.key, e.detail)}
									/>
									{#if formErrors[question.key]}
										<div class="error-message">
											<AlertCircle class="h-4 w-4 shrink-0" />
											<span>{formErrors[question.key]}</span>
										</div>
									{/if}
								</div>
							{:else if question.type === 'calendar'}
								<CalendarField
									id={question.id}
									label={question.question}
									value={(specificsAnswers[question.key] as string) || ''}
									required={question.required}
									error={formErrors[question.key] || null}
									onInput={(val) => updateSpecific(question.key, val)}
								/>
							{/if}

							<!-- Invalidation Warning -->
							{#if question.invalidateOn !== undefined && specificsAnswers[question.key] === question.invalidateOn}
								<div class="error-message mt-2 !border-l-1">
									<div class="flex items-start gap-2">
										<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
										<span class="alertText">
											{question.errorMessage || 'This answer may affect loan eligibility.'}
										</span>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ── Income Section ────────────────────────────────────── -->
	{#if currentProfileType && visibleIncomeFields.length > 0}
		<div
			class="flex flex-col gap-4 border-[var(--form-border)] pt-2 sm:rounded-xl sm:border sm:bg-[var(--form-bg-card)] sm:p-4 sm:shadow-sm"
		>
			<!-- Section Header -->
			<div class="flex items-center gap-2 pb-1">
				<div class="h-1 w-4 rounded-full bg-linear-to-r from-green-500 to-emerald-400"></div>
				<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
					Income from this Source
				</span>
			</div>

			<div
				class="grid {deviceState.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-10"
			>
				{#each visibleIncomeFields as field (field.id)}
					<div
						id="field_{field.key}"
						class={field.type === 'table'
							? deviceState.isMobile
								? 'col-span-1'
								: 'col-span-2'
							: ''}
					>
						{#if field.type === 'number'}
							<TextField
								id={field.id}
								label={field.label}
								value={(incomeAnswers[field.key] as string) || ''}
								required={field.required}
								icon={field.icon}
								placeholder={field.placeholder}
								description={field.description}
								uiType="number"
								type="text"
								enableNumberToWords={field.showNumberInWords}
								error={formErrors[field.key] || null}
								onInput={(val) => {
									const numVal = val === '' ? '' : Number(String(val).replace(/,/g, ''));
									updateIncome(field.key, numVal);
								}}
								onBlur={() => validateIncomeField(field)}
								onEnter={() => validateIncomeField(field)}
							/>
						{:else if field.type === 'radio'}
							<RadioField
								id={field.id}
								label={field.label}
								options={castOptions(field.options || [])}
								value={getDisplayValue(incomeAnswers[field.key])}
								required={field.required}
								description={field.description}
								error={formErrors[field.key] || null}
								onChange={(val) =>
									updateIncome(field.key, castRadioValue(val, field.options || []))}
							/>
						{:else if field.type === 'select'}
							<SelectField
								id={field.id}
								label={field.label}
								options={castOptions(field.options || [])}
								value={getDisplayValue(incomeAnswers[field.key])}
								required={field.required}
								icon={field.icon}
								subLabel={field.subLabel || 'option'}
								description={field.description}
								error={formErrors[field.key] || null}
								onChange={(val) =>
									updateIncome(field.key, castRadioValue(val, field.options || []))}
							/>
						{:else if field.type === 'table'}
							<!-- Financials Table -->
							<div class="col-span-full">
								<span
									class="text-labelText font-titleMedium !m-0 block text-(--form-text-secondary)"
								>
									<!-- {@html} required: schema-authored label may contain <sup>/<strong>/<br>. Plain {field.label} would render the tags as literal text. -->
									{@html sanitizeHtml(field.label)}
								</span>
								{#if field.description}
									<p class="smallText mt-1 mb-3 text-[var(--form-text-label)]">
										<!-- {@html} required: same as label above. -->
										{@html sanitizeHtml(field.description)}
									</p>
								{/if}
								<CustomIncomeTable
									bind:answers={tableAnswers}
									questionId="financialTable"
									showErrors={attemptedSave}
									businessVintage={tableBusinessVintage}
									gstRegistrationDate={tableGstRegDate}
									gstRegistered={tableGstRegistered}
									onChange={(data) => {
										updateIncome(field.key, data);
									}}
									onValidate={({ questionId: _qid, valid }) => {
										financialTableValid = valid;
										if (!valid && !formErrors[field.key]) {
											formErrors = {
												...formErrors,
												[field.key]: 'Please complete the financial details'
											};
										} else if (valid && formErrors[field.key]) {
											const { [field.key]: _, ...rest } = formErrors;
											formErrors = rest;
										}
									}}
								/>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Monthly income equivalent removed — rule engine computes this per lender -->
		</div>
	{/if}

	<!-- ── Evidence Section ──────────────────────────────────── -->
	{#if currentProfileType && currentProfileType !== 'no_current_income'}
		<div
			class="flex flex-col gap-4 border-[var(--form-border)] pt-2 sm:rounded-xl sm:border sm:bg-[var(--form-bg-card)] sm:p-4 sm:shadow-sm"
		>
			<div class="flex items-center gap-2 pb-1">
				<div class="h-1 w-4 rounded-full bg-linear-to-r from-blue-400 to-indigo-400"></div>
				<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
					Evidence / Verifiability
				</span>
			</div>

			{#if needsCompanyEvidence}
				<div class="warning-message !border-l-1">
					<div class="flex items-start gap-2">
						<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
						<div class="smallText">
							<strong class="font-titleMedium">Company documents required:</strong> Since this
							income comes from a company/firm, lenders will require the
							<strong class="font-titleMedium">company ITR</strong>
							and
							<strong class="font-titleMedium">audited financials</strong>
							(Balance Sheet & P/L) in addition to personal documents. Ensure these are available before
							submission.
						</div>
					</div>
				</div>
			{/if}

			<div class="grid {deviceState.isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-10">
				<SelectField
					id="ev_itrFiled"
					label="Income reflected in ITR?"
					options={[
						{ label: 'Yes', value: 'true' },
						{ label: 'No', value: 'false' }
					]}
					value={evidenceAnswers.itrFiled === true
						? 'true'
						: evidenceAnswers.itrFiled === false
							? 'false'
							: ''}
					required={false}
					icon="file-check"
					subLabel="option"
					onChange={(val) => {
						evidenceAnswers = { ...evidenceAnswers, itrFiled: val === 'true' };
					}}
				/>

				<SelectField
					id="ev_hasDocEvidence"
					label="Documentary evidence available?"
					options={[
						{ label: evidenceYesLabel, value: 'true' },
						{ label: 'No', value: 'false' }
					]}
					value={evidenceAnswers.hasDocumentaryEvidence === true
						? 'true'
						: evidenceAnswers.hasDocumentaryEvidence === false
							? 'false'
							: ''}
					required={false}
					icon="file-text"
					subLabel="option"
					onChange={(val) => {
						evidenceAnswers = { ...evidenceAnswers, hasDocumentaryEvidence: val === 'true' };
					}}
				/>
			</div>

			<!-- Auto-detected evidence badge -->
			{#if evidenceAnswers.itrFiled && evidenceAnswers.hasDocumentaryEvidence}
				<div class="mt-1 flex items-start gap-2">
					<Check class="h-4 w-4 text-green-600 dark:text-green-400" />
					<span class="smallText font-titleMedium text-green-700 dark:text-green-400"
						>This income source is fully verifiable</span
					>
				</div>
			{:else if evidenceAnswers.itrFiled || evidenceAnswers.hasDocumentaryEvidence}
				<div class="mt-1 flex items-start gap-2">
					<Info class="h-4 w-4 text-stone-600 dark:text-stone-400" />
					<span class="smallText font-titleMedium text-stone-700 dark:text-stone-400"
						>Partially verifiable — lender may cap consideration</span
					>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── Action Buttons ────────────────────────────────────── -->
	{#if currentProfileType}
		<div class="flex items-center gap-3 pt-2">
			<!-- Add / Update Button -->
			<button
				type="button"
				class="updateBtn bg-ddsa-gradient-primary buttonText flex cursor-pointer items-center gap-2
					rounded-xl px-5 py-2.5
					text-[var(--bg-header-text)] shadow-sm
					transition-all duration-200"
				onclick={handleAddOrUpdate}
			>
				{#if isEditing}
					<Check class="h-4 w-4" />
					<span>Update Entry</span>
				{:else}
					<Plus class="h-4 w-4" />
					<span>Add to Profile</span>
				{/if}
			</button>

			<!-- Reset Button -->
			<button
				type="button"
				class="buttonText cursor-pointer rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-5 py-2.5 text-[var(--form-text-secondary)] transition-colors hover:border-[var(--form-border-hover)] flex gap-2"
				onclick={resetForm}
			>
				<RotateCcw class="h-4 w-4" />
				<span>Clear</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.updateBtn {
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}
	.updateBtn:hover:not(:disabled) {
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		transform: translateY(-1px);
	}
</style>
