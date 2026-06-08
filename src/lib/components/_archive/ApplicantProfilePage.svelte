<script lang="ts">
	/**
	 * ApplicantProfilePage — Final page in the applicant flow
	 * ═══════════════════════════════════════════════════════════════════
	 * Collects per-applicant profile details:
	 *   Individual: Education, Religion, Owned Properties, Residence + location
	 *   Company:    Owned Properties, Office Proximity + location
	 *
	 * Renders ALL applicants in a scrollable list with radio-button questions.
	 * Conditional state → city → pincode cascade when residence ≠ SAME_CITY.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { formState } from '$lib/state/form.svelte';
	import RadioField from './RadioField.svelte';
	import SelectField from './SelectField.svelte';
	import TextField from './TextField.svelte';
	import { User, Building2, CircleAlert } from '$lib/utils/iconRegistry';
	import {
		userRelationships,
		userReciprocalRelationships
	} from './relationship-capture/relationshipStore';
	import {
		checkReligionConsistency,
		type ReligionConflict
	} from './relationship-capture/religionConsistencyCheck';

	// ── Props ───────────────────────────────────────────────────────
	interface Props {
		isComplete?: boolean;
		loanCategory?: 'personal' | 'business' | 'professional' | null;
	}
	let { isComplete = $bindable(false), loanCategory = null }: Props = $props();

	const isProfessionalLoan = $derived(loanCategory === 'professional');

	// Session 32: Get loan-level professionalCategory (set on loanRequirementPage).
	// For primary applicant (index 0), this overrides the applicant-level value.
	const loanLevelProfCategory = $derived(() => {
		const loanData = formState.loanData as Record<string, any>;
		// Use applicationData.loanName to find the correct loan data bucket
		const loanName = (formState.applicationData as any)?.loanName ?? '';
		const answers = loanData?.[loanName] ?? {};
		return (answers.professionalCategory as string) || '';
	});

	// ── State list (fetched once) ───────────────────────────────────
	let allStates = $state<string[]>([]);
	let statesLoaded = $state(false);

	async function loadStates() {
		if (statesLoaded) return;
		try {
			const res = await fetch('/api/location/states');
			const data = await res.json();
			allStates = data.data?.states ?? [];
			statesLoaded = true;
		} catch {
			// Silently fail — states dropdown stays empty
		}
	}

	// Load states on mount
	$effect(() => {
		loadStates();
	});

	// Re-load pincode data for applicants that already have a state (e.g. after navigation)
	$effect(() => {
		for (const applicant of formState.applicants) {
			const id = applicant.id ?? '0';
			if (pincodeDataMap[id]) continue; // already loaded
			const isComp = applicant.applicantType === 'Company';

			const pfx = isComp ? 'companyOffice' : 'applicantResidence';
			const existingState = (applicant as any)[`${pfx}State`];
			if (existingState) {
				loadPincodesForApplicant(id, existingState);
			}
		}
	});

	// ── Per-applicant pincode data ──────────────────────────────────
	// Map: applicantId → { cityMap: Record<city, pincodes[]>, loading: boolean }
	let pincodeDataMap = $state<
		Record<
			string,
			{
				cityMap: Record<string, Array<{ pincode: string; area: string }>>;
				loading: boolean;
			}
		>
	>({});

	// Track pincode query, suggestion visibility, and validation errors per applicant
	let pincodeQueries = $state<Record<string, string>>({});
	let showSuggestions = $state<Record<string, boolean>>({});
	let pincodeErrors = $state<Record<string, string>>({});

	async function loadPincodesForApplicant(applicantId: string, state: string) {
		if (!state) return;

		pincodeDataMap = {
			...pincodeDataMap,
			[applicantId]: { cityMap: {}, loading: true }
		};

		try {
			const res = await fetch(`/api/pincodes?state=${encodeURIComponent(state)}&source=all`);
			const data = await res.json();
			pincodeDataMap = {
				...pincodeDataMap,
				[applicantId]: { cityMap: data.data?.pincodes ?? {}, loading: false }
			};
		} catch {
			pincodeDataMap = {
				...pincodeDataMap,
				[applicantId]: { cityMap: {}, loading: false }
			};
		}
	}

	// ── Question Options ────────────────────────────────────────────
	const educationOptions = [
		{ label: 'Below 10th', value: 'below_10th', icon: 'School' },
		{ label: '10th Pass', value: '10th_pass', icon: 'BookOpen' },
		{ label: '12th Pass / Diploma', value: '12th_pass', icon: 'BookOpen' },
		{ label: 'Graduate', value: 'graduate_plus', icon: 'GraduationCap' },
		{ label: 'Post Graduate', value: 'post_graduate', icon: 'BookOpenCheck' },
		{ label: 'Professional (CA, Doctor, Lawyer)', value: 'professional', icon: 'Briefcase' }
	];

	const religionOptions = [
		{ label: 'Hindu', value: 'hindu' },
		{ label: 'Muslim', value: 'muslim' },
		{ label: 'Christian', value: 'christian' },
		{ label: 'Sikh', value: 'sikh' },
		{ label: 'Buddhist / Jain', value: 'buddhist_jain' },
		{ label: 'Others', value: 'others' }
	];

	const casteCategoryOptions = [
		{ label: 'General', value: 'General' },
		{ label: 'OBC (Other Backward Class)', value: 'OBC' },
		{ label: 'SC (Scheduled Caste)', value: 'SC' },
		{ label: 'ST (Scheduled Tribe)', value: 'ST' }
	];

	const propertyCountOptions = [
		{ label: 'None', value: '0', icon: 'CircleSlash' },
		{ label: '1', value: '1', icon: 'Home' },
		{ label: '2', value: '2', icon: 'Home' },
		{ label: '3+', value: '3+', icon: 'Home' }
	];

	const disabilityOptions = [
		{ label: 'No', value: 'No' },
		{ label: 'Yes', value: 'Yes' }
	];

	const residenceOptions = [
		{ label: 'Same city', value: 'SAME_CITY', icon: 'MapPin' },
		{ label: 'Different city, same state', value: 'DIFFERENT_CITY', icon: 'Map' },
		{ label: 'Different state', value: 'DIFFERENT_STATE', icon: 'Globe' }
	];

	// ── Professional Detail Options (shown only for professional loans) ──
	const professionalQualificationOptions: Record<
		string,
		Array<{ label: string; value: string }>
	> = {
		doctor: [
			{ label: 'MBBS / BDS', value: 'mbbs_bds' },
			{ label: 'BAMS / BHMS / BUMS', value: 'bams_bhms' },
			{ label: 'BVSc / MVSc (Veterinary)', value: 'bvsc_mvsc' },
			{ label: 'MD / MS / MDS', value: 'md_ms' },
			{ label: 'DM / MCh', value: 'dm_mch' }
		],
		ca: [
			{ label: 'ACA — Associate CA', value: 'aca' },
			{ label: 'FCA — Fellow CA', value: 'fca' }
		],
		lawyer: [
			{ label: 'LLB', value: 'llb' },
			{ label: 'LLM', value: 'llm' }
		],
		architect: [
			{ label: 'B.Arch', value: 'b_arch' },
			{ label: 'M.Arch', value: 'm_arch' }
		]
	};

	const registrationCouncilOptions: Record<string, Array<{ label: string; value: string }>> = {
		doctor: [
			{ label: 'State Medical Council (SMC)', value: 'smc' },
			{ label: 'National Medical Commission (NMC)', value: 'nmc' },
			{ label: 'Veterinary Council of India (VCI)', value: 'vci' }
		],
		ca: [
			{ label: 'ICAI — Institute of Chartered Accountants', value: 'icai' },
			{ label: 'ICAI — with Certificate of Practice', value: 'icai_cop' }
		],
		lawyer: [
			{ label: 'State Bar Council', value: 'state_bar_council' },
			{ label: 'Bar Council of India (BCI)', value: 'bci' }
		],
		architect: [
			{ label: 'Council of Architecture (CoA)', value: 'coa' },
			{ label: 'Indian Institute of Architects (IIA)', value: 'iia' }
		]
	};

	// Practice vintage options filtered by applicant age — prevents illogical selections
	// (e.g., 18yr old selecting "Over 20 years" of practice)
	const PRACTICE_VINTAGE_ALL = [
		{ label: 'Less than 1 year', value: 'less_than_1', minAge: 0 },
		{ label: '1–2 years', value: '1_to_2', minAge: 21 },
		{ label: '2–5 years', value: '2_to_5', minAge: 23 },
		{ label: '5–10 years', value: '5_to_10', minAge: 27 },
		{ label: '10–20 years', value: '10_to_20', minAge: 32 },
		{ label: 'Over 20 years', value: 'over_20', minAge: 42 }
	];

	const practiceTypeOptions = [
		{ label: 'Own clinic / office / firm', value: 'own_practice' },
		{ label: 'Employed at hospital / firm', value: 'employed' },
		{ label: 'Both — own practice + employed', value: 'both' },
		{ label: 'Consulting (visiting)', value: 'consulting' }
	];

	const registrationStatusOptions = [
		{ label: 'Active and valid', value: 'active' },
		{ label: 'Expired / Lapsed', value: 'expired' }
	];

	// ── NRI Country Options (top destinations for Indian NRIs) ──
	const nriCountryOptions = [
		{ label: 'United States', value: 'US' },
		{ label: 'United Kingdom', value: 'UK' },
		{ label: 'United Arab Emirates', value: 'UAE' },
		{ label: 'Canada', value: 'CA' },
		{ label: 'Australia', value: 'AU' },
		{ label: 'Singapore', value: 'SG' },
		{ label: 'Saudi Arabia', value: 'SA' },
		{ label: 'Kuwait', value: 'KW' },
		{ label: 'Qatar', value: 'QA' },
		{ label: 'Oman', value: 'OM' },
		{ label: 'Bahrain', value: 'BH' },
		{ label: 'Germany', value: 'DE' },
		{ label: 'New Zealand', value: 'NZ' },
		{ label: 'Hong Kong', value: 'HK' },
		{ label: 'Malaysia', value: 'MY' },
		{ label: 'South Africa', value: 'ZA' },
		{ label: 'Japan', value: 'JP' },
		{ label: 'Netherlands', value: 'NL' },
		{ label: 'Ireland', value: 'IE' },
		{ label: 'Other', value: 'OTHER' }
	];

	// ── Religion/Caste cross-applicant consistency ─────────────────
	// Reactively checks all blood-related applicants for religion/caste mismatches.
	// Fires whenever applicant data or relationships change.
	let religionConflicts = $derived.by(() => {
		const applicants = formState.applicants ?? [];
		const rels = [...$userRelationships, ...$userReciprocalRelationships];
		if (applicants.length < 2 || rels.length === 0) return new Map<string, ReligionConflict[]>();
		return checkReligionConsistency(applicants as any, rels);
	});

	function getReligionConflicts(applicantId: string): ReligionConflict[] {
		return religionConflicts.get(applicantId)?.filter((c) => c.field === 'religion') ?? [];
	}

	function getCasteConflicts(applicantId: string): ReligionConflict[] {
		return religionConflicts.get(applicantId)?.filter((c) => c.field === 'casteCategory') ?? [];
	}

	// ── Helpers ─────────────────────────────────────────────────────
	function updateApplicant(index: number, key: string, value: any) {
		const updated = [...formState.applicants];
		updated[index] = { ...updated[index], [key]: value };
		formState.replaceApplicants(updated);
	}

	/** Clear dependent professional fields when category changes */
	function handleProfessionalCategoryChange(index: number, newCategory: string) {
		const current = formState.applicants[index] as any;
		const oldCategory = current?.professionalCategory;
		if (oldCategory && oldCategory !== newCategory) {
			// Category changed — clear dependent fields
			const updated = [...formState.applicants];
			updated[index] = {
				...updated[index],
				professionalCategory: newCategory,
				professionalQualification: '',
				registrationCouncilType: '',
				practiceVintage: '',
				practiceType: '',
				registrationStatus: ''
			};
			formState.replaceApplicants(updated);
		} else {
			updateApplicant(index, 'professionalCategory', newCategory);
		}
	}

	/** Get property state and city from the loan data */
	function getPropertyLocation(): { state: string; city: string } {
		const loanData = formState.loanData as Record<string, any>;
		const loanName = loanData?.loanName ?? '';
		const answers = (loanData[loanName] ?? {}) as Record<string, any>;
		return {
			state: (answers.propertyStateName as string) || '',
			city: (answers.propertyCityName as string) || ''
		};
	}

	function handleResidenceChange(index: number, value: string | number, isCompany: boolean) {
		const prefix = isCompany ? 'companyOffice' : 'applicantResidence';
		const keyPattern = isCompany ? 'companyOfficeProximity' : 'applicantResidencePattern';

		const updated = [...formState.applicants];
		updated[index] = {
			...updated[index],
			[keyPattern]: value,
			[`${prefix}State`]: '',
			[`${prefix}City`]: '',
			[`${prefix}Pincode`]: ''
		};
		formState.replaceApplicants(updated);

		// Clear pincode data and errors for this applicant
		const id = formState.applicants[index]?.id ?? String(index);
		pincodeQueries = { ...pincodeQueries, [id]: '' };
		showSuggestions = { ...showSuggestions, [id]: false };
		pincodeErrors = { ...pincodeErrors, [id]: '' };

		const { state: propertyState, city: propertyCity } = getPropertyLocation();

		if (value === 'SAME_CITY') {
			// Auto-set state and city from property location
			if (propertyState && propertyCity) {
				updated[index] = {
					...updated[index],
					[keyPattern]: value,
					[`${prefix}State`]: propertyState,
					[`${prefix}City`]: propertyCity
				};
				formState.replaceApplicants(updated);
				loadPincodesForApplicant(id, propertyState);
			}
		} else if (value === 'DIFFERENT_CITY') {
			// Auto-set state to property state
			if (propertyState) {
				updated[index] = {
					...updated[index],
					[keyPattern]: value,
					[`${prefix}State`]: propertyState
				};
				formState.replaceApplicants(updated);
				loadPincodesForApplicant(id, propertyState);
			}
		}
	}

	function handleStateChange(index: number, value: string | number, isCompany: boolean) {
		const prefix = isCompany ? 'companyOffice' : 'applicantResidence';

		const updated = [...formState.applicants];
		updated[index] = {
			...updated[index],
			[`${prefix}State`]: value,
			[`${prefix}City`]: '',
			[`${prefix}Pincode`]: ''
		};
		formState.replaceApplicants(updated);

		const id = formState.applicants[index]?.id ?? String(index);
		pincodeQueries = { ...pincodeQueries, [id]: '' };
		showSuggestions = { ...showSuggestions, [id]: false };
		pincodeErrors = { ...pincodeErrors, [id]: '' };

		if (value) {
			loadPincodesForApplicant(id, String(value));
		}
	}

	function handleCityChange(index: number, value: string | number, isCompany: boolean) {
		const prefix = isCompany ? 'companyOffice' : 'applicantResidence';

		const updated = [...formState.applicants];
		updated[index] = {
			...updated[index],
			[`${prefix}City`]: value,
			[`${prefix}Pincode`]: ''
		};
		formState.replaceApplicants(updated);

		const id = formState.applicants[index]?.id ?? String(index);
		pincodeQueries = { ...pincodeQueries, [id]: '' };
		showSuggestions = { ...showSuggestions, [id]: false };
		pincodeErrors = { ...pincodeErrors, [id]: '' };
	}

	function handlePincodeInput(index: number, val: string, isCompany: boolean) {
		const prefix = isCompany ? 'companyOffice' : 'applicantResidence';
		const id = formState.applicants[index]?.id ?? String(index);
		const city = (formState.applicants[index] as any)?.[`${prefix}City`] ?? '';

		// Digits only, max 6
		val = val.replace(/[^0-9]/g, '');
		if (val.length > 6) val = val.slice(0, 6);

		updateApplicant(index, `${prefix}Pincode`, val);
		pincodeQueries = { ...pincodeQueries, [id]: val };
		showSuggestions = { ...showSuggestions, [id]: val.length >= 3 && val.length < 6 };

		// Immediate 3-digit mismatch error
		if (val.length >= 3 && city) {
			const data = pincodeDataMap[id];
			if (data && !data.loading) {
				const cityPincodes = data.cityMap[city] ?? [];
				const prefix3 = val.slice(0, 3);
				const hasMatch = cityPincodes.some((p) => p.pincode.startsWith(prefix3));
				pincodeErrors = {
					...pincodeErrors,
					[id]: hasMatch ? '' : `No pincodes starting with ${prefix3} found in ${city}`
				};
			}
		} else {
			pincodeErrors = { ...pincodeErrors, [id]: '' };
		}
	}

	function selectPincodeSuggestion(index: number, pincode: string, isCompany: boolean) {
		const prefix = isCompany ? 'companyOffice' : 'applicantResidence';
		const id = formState.applicants[index]?.id ?? String(index);

		updateApplicant(index, `${prefix}Pincode`, pincode);
		pincodeQueries = { ...pincodeQueries, [id]: pincode };
		showSuggestions = { ...showSuggestions, [id]: false };
		pincodeErrors = { ...pincodeErrors, [id]: '' };
	}

	function getFilteredPincodes(
		applicantId: string,
		city: string
	): Array<{ pincode: string; area: string }> {
		const query = pincodeQueries[applicantId] ?? '';
		if (query.length < 3) return [];

		const data = pincodeDataMap[applicantId];
		if (!data) return [];

		const cityPincodes = data.cityMap[city] ?? [];
		return cityPincodes.filter((p) => p.pincode.startsWith(query)).slice(0, 8);
	}

	function getCityOptions(applicantId: string): Array<{ label: string; value: string }> {
		const data = pincodeDataMap[applicantId];
		if (!data) return [];

		return Object.keys(data.cityMap)
			.sort()
			.map((city) => ({
				label: city.trim(),
				value: city.trim()
			}))
			.filter((cities) => cities.label !== formState.applicationData.propertyCityName);
	}

	// ── Session 32: Sync primary applicant's professionalCategory from loan-level ──
	// The category is set on loanRequirementPage. Primary applicant inherits it (locked).
	$effect(() => {
		if (!isProfessionalLoan) return;
		const loanCat = loanLevelProfCategory();
		if (!loanCat) return;
		const primary = formState.applicants[0] as any;
		if (primary && primary.professionalCategory !== loanCat) {
			updateApplicant(0, 'professionalCategory', loanCat);
		}
	});

	// ── Auto-set education for ALL Individual applicants in professional loan ──
	// All co-applicants in a professional loan must also be professionals.
	// The Profile tab shows a read-only badge instead of disabled radio buttons.
	$effect(() => {
		if (!isProfessionalLoan) return;
		for (let i = 0; i < formState.applicants.length; i++) {
			const a = formState.applicants[i] as any;
			if (a && a.applicantType === 'Individual' && a.education !== 'professional') {
				updateApplicant(i, 'education', 'professional');
			}
		}
	});

	// 	if (changed) {
	// 		formState.replaceApplicants(updated);
	// 	}
	// });

	// ── Completion check ────────────────────────────────────────────
	let completionCheck = $derived.by(() => {
		const applicants = formState.applicants ?? [];
		if (applicants.length === 0) return false;

		return applicants.every((a: any) => {
			if (a.applicantType === 'Individual') {
				if (!a.education || !a.religion || !a.ownedResidentialProperties || !a.hasDisability) {
					return false;
				}
				// Residence pattern not asked for NRI (lender uses GPA location)
				if (a.isNRI !== 'Yes' && !a.applicantResidencePattern) {
					return false;
				}
				// Professional loan: require all 5 professional detail fields
				if (isProfessionalLoan) {
					if (
						!a.professionalQualification ||
						!a.registrationCouncilType ||
						!a.practiceVintage ||
						!a.practiceType ||
						!a.registrationStatus
					) {
						return false;
					}
				}
				// Hindu must select caste category
				if (a.religion === 'hindu' && !a.casteCategory) {
					return false;
				}
				// Religion/caste consistency with blood relatives
				const conflicts = religionConflicts.get(a.id);
				if (conflicts && conflicts.length > 0) {
					return false;
				}
				// Residence city/state checks — only for non-NRI (NRI skips residence pattern)
				if (a.isNRI !== 'Yes') {
					if (a.applicantResidencePattern === 'DIFFERENT_STATE' && !a.applicantResidenceState) {
						return false;
					}
					if (a.applicantResidencePattern !== 'SAME_CITY' && !a.applicantResidenceCity) {
						return false;
					}
				}
				// NRI must select country
				if (a.isNRI === 'Yes' && !a.nriCountry) {
					return false;
				}
				return true;
			} else if (a.applicantType === 'Company') {
				if (!a.companyOwnedProperties || !a.companyOfficeProximity) {
					return false;
				}
				if (a.companyOfficeProximity === 'DIFFERENT_STATE' && !a.companyOfficeState) {
					return false;
				}
				if (a.companyOfficeProximity !== 'SAME_CITY' && !a.companyOfficeCity) {
					return false;
				}
				return true;
			}
			return true;
		});
	});

	// Sync isComplete to parent
	$effect(() => {
		isComplete = completionCheck;
	});

	// Auto-clear practice vintage if it becomes illogical for the applicant's age
	$effect(() => {
		for (let i = 0; i < formState.applicants.length; i++) {
			const a = formState.applicants[i] as any;
			if (a.applicantType !== 'Individual' || !a.practiceVintage) continue;
			const age = Number(a.age) || 0;
			const selected = PRACTICE_VINTAGE_ALL.find((o) => o.value === a.practiceVintage);
			if (selected && age > 0 && age < selected.minAge) {
				updateApplicant(i, 'practiceVintage', '');
			}
		}
	});

	// $effect(() => {
	// 	console.log('formState.applicants single: ', formState.applicants);
	// });
</script>

<div class="mx-auto py-6">
	<!-- <h2 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Applicant Profile</h2>
	<p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
		Fill in additional details for each applicant. These affect lender matching and verification requirements.
	</p> -->

	{#each formState.applicants as applicant, index (applicant.id ?? index)}
		{@const isIndividual = applicant.applicantType === 'Individual'}
		{@const isCompany = applicant.applicantType === 'Company'}
		{@const applicantId = applicant.id ?? String(index)}
		{@const prefix = isCompany ? 'companyOffice' : 'applicantResidence'}
		{@const residenceKey = isCompany ? 'companyOfficeProximity' : 'applicantResidencePattern'}
		{@const residenceValue = (applicant as any)[residenceKey] ?? ''}
		{@const stateValue = (applicant as any)[`${prefix}State`] ?? ''}
		{@const cityValue = (applicant as any)[`${prefix}City`] ?? ''}
		{@const pincodeValue = (applicant as any)[`${prefix}Pincode`] ?? ''}
		{@const cityOptions = getCityOptions(applicantId)}
		{@const filteredPincodes = getFilteredPincodes(applicantId, cityValue)}
		{@const showSuggestionsForApplicant = showSuggestions[applicantId] ?? false}
		{@const applicantsCount = formState.applicants.length}

		<div
			class="mb-6 {applicantsCount > 1
				? 'max-w-2xl rounded-xl border border-gray-200 bg-white p-5 px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'
				: 'w-full '}"
		>
			<!-- Applicant Header -->
			<div class="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full {isCompany
						? 'bg-blue-50 text-blue-600'
						: 'bg-amber-50 text-amber-600'}"
				>
					{#if isCompany}
						<Building2 size={20} />
					{:else}
						<User size={20} />
					{/if}
				</div>
				<div>
					<h3 class="text-base font-semibold text-gray-900 dark:text-white">
						{(applicant as any).fullName ||
							(applicant as any).companyName ||
							`Applicant ${index + 1}`}
					</h3>
					<p class="text-xs text-gray-400">
						{isCompany ? 'Company' : 'Individual'}
						{#if isIndividual && (applicant as any).age}
							· Age {(applicant as any).age}
						{/if}
						{#if isProfessionalLoan && index === 0}
							<span
								class="ml-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
							>
								Primary — Professional
							</span>
						{:else if isProfessionalLoan && index > 0}
							<span
								class="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
							>
								Co-applicant
							</span>
						{/if}
					</p>
				</div>
			</div>

			{#if isIndividual}
				<!-- Professional Detail Fields (professional loans only) -->
				{#if isProfessionalLoan}
					{@const isPrimaryApplicant = index === 0}
					{@const profCategory = isPrimaryApplicant
						? loanLevelProfCategory()
						: ((applicant as any).professionalCategory ?? '')}
					{@const qualOpts = professionalQualificationOptions[profCategory] ?? []}
					{@const regOpts = registrationCouncilOptions[profCategory] ?? []}

					{#if isPrimaryApplicant && profCategory}
						<div
							class="mt-4 mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20"
						>
							<span class="text-sm font-medium text-emerald-700 dark:text-emerald-400"
								>Professional Category:</span
							>
							<span class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
								{profCategory === 'doctor'
									? 'Doctor / Medical'
									: profCategory === 'ca'
										? 'Chartered Accountant (CA)'
										: profCategory === 'lawyer'
											? 'Lawyer / Advocate'
											: profCategory === 'architect'
												? 'Architect'
												: profCategory}
							</span>
							<span class="ml-auto text-[10px] text-emerald-500">Set on Loan Requirements</span>
						</div>
					{/if}

					{#if profCategory && qualOpts.length > 0}
						<RadioField
							id="profQual_{applicantId}"
							label="Highest professional qualification"
							optionContainerClass="grid grid-cols-2 gap-3"
							radioClass="mt-6"
							options={qualOpts}
							value={(applicant as any).professionalQualification ?? ''}
							required={true}
							onChange={(value) => updateApplicant(index, 'professionalQualification', value)}
						/>
					{/if}

					{#if (applicant as any).professionalQualification && regOpts.length > 0}
						<RadioField
							id="regCouncil_{applicantId}"
							label="Where is the professional registered?"
							optionContainerClass="grid grid-cols-1 md:grid-cols-2 gap-3"
							radioClass="mt-8"
							options={regOpts}
							value={(applicant as any).registrationCouncilType ?? ''}
							required={true}
							onChange={(value) => updateApplicant(index, 'registrationCouncilType', value)}
						/>
					{/if}

					{#if (applicant as any).registrationCouncilType}
						<RadioField
							id="vintage_{applicantId}"
							label="How long has the applicant been practicing professionally?"
							optionContainerClass="grid grid-cols-2 gap-3"
							radioClass="mt-8"
							options={PRACTICE_VINTAGE_ALL.filter((o) => {
								const age = Number((applicant as any).age) || 0;
								return age >= o.minAge;
							})}
							value={(applicant as any).practiceVintage ?? ''}
							required={true}
							onChange={(value) => updateApplicant(index, 'practiceVintage', value)}
						/>
					{/if}

					{#if (applicant as any).practiceVintage}
						<RadioField
							id="practiceType_{applicantId}"
							label="What is the current practice setup?"
							optionContainerClass="grid grid-cols-2 gap-3"
							radioClass="mt-8"
							options={practiceTypeOptions}
							value={(applicant as any).practiceType ?? ''}
							required={true}
							onChange={(value) => updateApplicant(index, 'practiceType', value)}
						/>
					{/if}

					{#if (applicant as any).practiceType}
						<RadioField
							id="regStatus_{applicantId}"
							label="Is the professional registration currently active and valid?"
							optionContainerClass="grid grid-cols-2 gap-3"
							radioClass="mt-8"
							options={registrationStatusOptions}
							value={(applicant as any).registrationStatus ?? ''}
							required={true}
							onChange={(value) => updateApplicant(index, 'registrationStatus', value)}
						/>
					{/if}

					{#if (applicant as any).practiceVintage === 'less_than_1'}
						<div
							class="mt-2 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-900/20"
						>
							<p class="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
								<CircleAlert size={14} class="mt-0.5 shrink-0" />
								<span
									>Most banks require a minimum practice vintage of 2 years. Options may be limited.</span
								>
							</p>
						</div>
					{/if}

					{#if (applicant as any).registrationStatus === 'expired'}
						<div
							class="mt-2 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20"
						>
							<p class="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
								<CircleAlert size={14} class="mt-0.5 shrink-0" />
								<span
									>Expired registration cannot be used for loan application. Please renew first.</span
								>
							</p>
						</div>
					{/if}
				{/if}

				<!-- Q1: Education (hidden for professional loans — auto-set) -->
				{#if !isProfessionalLoan}
					<RadioField
						id="education_{applicantId}"
						label="Highest Education"
						optionContainerClass="grid grid-cols-2 gap-3"
						radioClass="mt-10"
						options={educationOptions}
						value={(applicant as any).education ?? ''}
						required={true}
						onChange={(value) => updateApplicant(index, 'education', value)}
					/>
				{/if}

				<!-- Q2: Religion -->
				<RadioField
					id="religion_{applicantId}"
					label="Religion"
					optionContainerClass="grid grid-cols-3 gap-3"
					radioClass="mt-10"
					options={religionOptions}
					value={(applicant as any).religion ?? ''}
					required={true}
					onChange={(value) => {
						updateApplicant(index, 'religion', value);
						if (value !== 'hindu') {
							updateApplicant(index, 'casteCategory', '');
						}
					}}
				/>

				<!-- Religion consistency error -->
				{@const relConflicts = getReligionConflicts(applicantId)}
				{#if relConflicts.length > 0}
					<div
						class="-mt-2 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20"
					>
						{#each relConflicts as conflict}
							<p
								class="flex items-start gap-2 font-paragraph text-sm text-red-700 dark:text-red-400"
							>
								<CircleAlert size={14} class="mt-0.5 shrink-0" />
								<span>{conflict.message}</span>
							</p>
						{/each}
					</div>
				{/if}

				<!-- Q3: SC/ST Category (conditional - Hindu only) -->
				{#if (applicant as any).religion === 'hindu'}
					<RadioField
						id="category_{applicantId}"
						label="Which category do you belong to?"
						description="Some banks (SBI, PNB, BOB) offer reduced interest rates for SC/ST applicants. This helps us find the best rate for you."
						optionContainerClass="grid grid-cols-2 gap-3"
						radioClass="mt-10"
						options={casteCategoryOptions}
						value={(applicant as any).casteCategory ?? ''}
						required={true}
						onChange={(val) => updateApplicant(index, 'casteCategory', val)}
					/>

					<!-- Caste category consistency error -->
					{@const casteConflictList = getCasteConflicts(applicantId)}
					{#if casteConflictList.length > 0}
						<div
							class="-mt-2 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20"
						>
							{#each casteConflictList as conflict}
								<p
									class="flex items-start gap-2 font-paragraph text-sm text-red-700 dark:text-red-400"
								>
									<CircleAlert size={14} class="mt-0.5 shrink-0" />
									<span>{conflict.message}</span>
								</p>
							{/each}
						</div>
					{/if}
				{/if}

				<!-- Q4: Owned Properties -->
				<RadioField
					id="properties_{applicantId}"
					label="Residential properties in your name?"
					optionContainerClass="grid grid-cols-4 gap-3"
					radioClass="mt-10"
					options={propertyCountOptions}
					value={(applicant as any).ownedResidentialProperties ?? ''}
					required={true}
					onChange={(value) => updateApplicant(index, 'ownedResidentialProperties', value)}
				/>

				<!-- Q5: Disability -->
				<RadioField
					id="disability_{applicantId}"
					label="Does the applicant have a disability?"
					description="Some banks and government housing schemes (like PMAY) offer interest rate concessions for persons with disabilities."
					optionContainerClass="grid grid-cols-2 gap-3"
					radioClass="mt-10"
					options={disabilityOptions}
					value={(applicant as any).hasDisability ?? ''}
					required={true}
					onChange={(val) => updateApplicant(index, 'hasDisability', val)}
				/>

				<!-- Q6: Residence relative to property — hidden for NRI (lender uses GPA location) -->
				{#if (applicant as any).isNRI !== 'Yes'}
					<RadioField
						id="residence_{applicantId}"
						label="Residence relative to property location?"
						optionContainerClass="grid grid-cols-1 md:grid-cols-3 gap-3"
						radioClass="mt-10"
						options={residenceOptions}
						value={residenceValue}
						required={true}
						onChange={(value) => handleResidenceChange(index, value, false)}
					/>
				{/if}

				<!-- NRI Country (conditional — only when isNRI === 'Yes') -->
				{#if (applicant as any).isNRI === 'Yes'}
					<div class="mt-6">
						<SelectField
							id="nriCountry_{applicantId}"
							label="Country of residence"
							selectClass=""
							options={nriCountryOptions}
							value={(applicant as any).nriCountry ?? ''}
							required={true}
							onChange={(value) => updateApplicant(index, 'nriCountry', value)}
						/>
					</div>
				{/if}
			{:else if isCompany}
				<!-- Company Q1: Owned Properties -->
				<RadioField
					id="company_properties_{applicantId}"
					label="Properties in the company's name?"
					optionContainerClass="grid grid-cols-4 gap-3"
					radioClass="mt-2"
					options={propertyCountOptions}
					value={(applicant as any).companyOwnedProperties ?? ''}
					required={true}
					onChange={(value) => updateApplicant(index, 'companyOwnedProperties', value)}
				/>

				<!-- Company Q2: Office proximity -->
				<RadioField
					id="company_office_{applicantId}"
					label="Company's registered office relative to property location?"
					optionContainerClass="grid grid-cols-1 md:grid-cols-3 gap-3"
					radioClass="mt-10"
					options={residenceOptions}
					value={residenceValue}
					required={true}
					onChange={(value) => handleResidenceChange(index, value, true)}
				/>
			{/if}

			<!-- Conditional State / City / Pincode -->
			{#if residenceValue}
				{@const pincodeError = pincodeErrors[applicantId] ?? ''}
				<div
					class="mt-6 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
				>
					<p class="text-xs font-medium tracking-wide text-(--form-text-muted) uppercase">
						{isCompany ? 'Office' : 'Residence'} Location
						{#if residenceValue === 'SAME_CITY' && cityValue}
							<span class="ml-1 text-(--form-text-muted) normal-case"
								>— {cityValue}, {stateValue}</span
							>
						{/if}
					</p>

					<!-- State dropdown (only for DIFFERENT_STATE) -->
					{#if residenceValue === 'DIFFERENT_STATE'}
						<SelectField
							id="state_{applicantId}"
							label="State"
							selectClass=""
							options={allStates
								.map((s) => ({ label: s, value: s }))
								.filter((state) => state.label !== formState.applicationData.propertyStateName)}
							value={stateValue}
							required={true}
							onChange={(value) => handleStateChange(index, value, isCompany)}
						/>
					{/if}

					<!-- City dropdown (not for SAME_CITY — auto-set) -->
					{#if residenceValue !== 'SAME_CITY' && (stateValue || residenceValue === 'DIFFERENT_CITY')}
						<SelectField
							id="city_{applicantId}"
							label="City"
							selectClass=""
							options={cityOptions}
							value={cityValue}
							required={true}
							disabled={cityOptions.length === 0}
							onChange={(value) => handleCityChange(index, value, isCompany)}
						/>
					{/if}

					<!-- Pincode with typeahead (shown for ALL cases when city is known) -->
					{#if cityValue}
						<div class="relative">
							<TextField
								id="pincode_{applicantId}"
								label="Pincode (optional)"
								placeholder="Enter 6-digit pincode"
								icon="map-pin"
								fieldType="pincode"
								value={pincodeValue}
								onInput={(val) => handlePincodeInput(index, val, isCompany)}
							/>

							<!-- Immediate mismatch error -->
							{#if pincodeError}
								<p class="mt-1 text-xs font-medium text-red-500">{pincodeError}</p>
							{/if}

							<!-- Typeahead suggestions -->
							{#if showSuggestionsForApplicant && filteredPincodes.length > 0}
								<div
									class="absolute z-100 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-(--form-border) bg-(--form-bg-card) shadow-lg"
								>
									{#each filteredPincodes as entry (entry.pincode + entry.area)}
										<button
											type="button"
											class="w-full border-b border-(--form-border) px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-(--dash-hover) active:bg-(--dash-bg-elevated)"
											onclick={() => selectPincodeSuggestion(index, entry.pincode, isCompany)}
										>
											<span class="font-semibold text-(--form-text)">{entry.pincode}</span>
											<span class="ml-2 text-(--form-text-muted)">— {entry.area}</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>
