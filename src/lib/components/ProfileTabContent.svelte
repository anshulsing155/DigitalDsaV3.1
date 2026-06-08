<script lang="ts">
	/**
	 * ProfileTabContent — Single-applicant profile questions
	 * ═══════════════════════════════════════════════════════════════════
	 * Renders profile questions for ONE applicant inside the income modal.
	 * Used as the first tab in the income/credit stepper.
	 *
	 *   Individual: Education, Religion, SC/ST Category (Hindu), Owned Properties,
	 *               Disability, Residence Pattern + State/City/Pincode cascade
	 *   Company:    Owned Properties, Office Proximity + State/City/Pincode cascade
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { formState } from '$lib/state/form.svelte';
	import RadioField from './RadioField.svelte';
	import SelectField from './SelectField.svelte';
	import TextField from './TextField.svelte';
	import { Check, CircleAlert } from '$lib/utils/iconRegistry';
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
		applicantIndex: number;
	}

	let { applicantIndex }: Props = $props();

	// ── Derived: current applicant ─────────────────────────────────
	let applicant = $derived(formState.applicants[applicantIndex] ?? {});
	let isIndividual = $derived(applicant.applicantType === 'Individual');
	let isCompany = $derived(applicant.applicantType === 'Company');
	let applicantId = $derived((applicant.id as string) ?? String(applicantIndex));

	// ── Loan type context ──────────────────────────────────────────
	const SECURED_LOANS = ['Home Loan', 'Loan Against Property', 'Plot Loan'];
	let currentLoanName = $derived((formState.loanData as Record<string, any>)?.loanName ?? '');
	let isSecuredLoan = $derived(SECURED_LOANS.includes(currentLoanName));
	let isProfessionalLoan = $derived(currentLoanName === 'Professional Loan');
	let isPersonalLoan = $derived(currentLoanName === 'Personal Loan');

	// Case-level location anchor — drives the per-applicant "Residence relative
	// to X location?" label, the state-dropdown exclusion for "Different state",
	// and the SAME_CITY auto-fill source. Mirrors the abstraction in
	// ApplicantProfilePage so secured / business / professional / personal flows
	// all read from one place.
	//   personal  → loan processing (residenceStateName/City = processing branch)
	//   business  → business        (businessStateName/businessCityName)
	//   professional → practice     (businessStateName/businessCityName)
	//   secured   → property        (propertyStateName/propertyCityName)
	let caseAnchor = $derived.by(() => {
		if (isPersonalLoan) {
			return {
				noun: 'loan processing',
				stateField: 'residenceStateName',
				cityField: 'residenceCityName'
			};
		}
		if (isProfessionalLoan) {
			return {
				noun: 'practice',
				stateField: 'businessStateName',
				cityField: 'businessCityName'
			};
		}
		// Business loan (unsecured but with business location) uses the same
		// business anchor; secured loans use property.
		if (currentLoanName === 'Business Loan') {
			return {
				noun: 'business',
				stateField: 'businessStateName',
				cityField: 'businessCityName'
			};
		}
		return {
			noun: 'property',
			stateField: 'propertyStateName',
			cityField: 'propertyCityName'
		};
	});
	// Education is locked for the primary professional applicant (Individual/Joint path).
	// Directors/partners of a firm (non-financial co-applicants) can have any education.
	let isNonFinancialCoApplicant = $derived(
		(applicant as any).applicantClassification === 'co_applicant_non_financial'
	);
	let isEducationLocked = $derived(isProfessionalLoan && !isNonFinancialCoApplicant);
	let isNRI = $derived((applicant as any).isNRI === 'Yes');

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

	$effect(() => {
		loadStates();
	});

	// ── Per-applicant pincode data ──────────────────────────────────
	let pincodeData = $state<{
		cityMap: Record<string, Array<{ pincode: string; area: string }>>;
		loading: boolean;
	}>({ cityMap: {}, loading: false });

	let pincodeQuery = $state('');
	let showPincodeSuggestions = $state(false);
	let pincodeError = $state('');

	async function loadPincodes(state: string) {
		if (!state) return;
		pincodeData = { cityMap: {}, loading: true };
		try {
			const res = await fetch(`/api/pincodes?state=${encodeURIComponent(state)}&source=all`);
			const data = await res.json();
			pincodeData = { cityMap: data.data?.pincodes ?? {}, loading: false };
		} catch {
			pincodeData = { cityMap: {}, loading: false };
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

	const disabilityOptions = [
		{ label: 'No', value: 'No' },
		{ label: 'Yes', value: 'Yes' }
	];

	const propertyCountOptions = [
		{ label: 'None', value: '0', icon: 'CircleSlash' },
		{ label: '1', value: '1', icon: 'Home' },
		{ label: '2', value: '2', icon: 'Home' },
		{ label: '3+', value: '3+', icon: 'Home' }
	];

	const residenceOptions = [
		{ label: 'Same city', value: 'SAME_CITY', icon: 'MapPin' },
		{ label: 'Different city, same state', value: 'DIFFERENT_CITY', icon: 'Map' },
		{ label: 'Different state', value: 'DIFFERENT_STATE', icon: 'Globe' }
	];

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
	let religionConflicts = $derived.by(() => {
		const applicants = formState.applicants ?? [];
		const rels = [...$userRelationships, ...$userReciprocalRelationships];
		if (applicants.length < 2 || rels.length === 0) return new Map<string, ReligionConflict[]>();
		return checkReligionConsistency(applicants as any, rels);
	});

	let myReligionConflicts = $derived(
		religionConflicts.get(applicantId)?.filter((c) => c.field === 'religion') ?? []
	);

	let myCasteConflicts = $derived(
		religionConflicts.get(applicantId)?.filter((c) => c.field === 'casteCategory') ?? []
	);

	// ── Helpers ─────────────────────────────────────────────────────
	function updateApplicant(key: string, value: any) {
		const updated = [...formState.applicants];
		updated[applicantIndex] = { ...updated[applicantIndex], [key]: value };
		formState.replaceApplicants(updated);
	}

	// Resolve the canonical active-loan name. Lookup order:
	//   1. `formState.loanData.loanName`     — written by every form page's
	//      `replaceLoanData({ ..., loanName: selectedLoan })` call, so this
	//      reliably tracks the active loan even when the user switched
	//      products earlier in the session.
	//   2. `formState.applicationData.loanName` — kept for legacy compat
	//      (older flows wrote here but not into loanData).
	//   3. First non-'loanName' key in loanData — last-resort scan when
	//      neither of the above is set (e.g. a freshly-restored draft).
	//
	// Without (1), the previous logic could pick STALE loanData entries from
	// a prior loan switch — the property location for the wrong loan would
	// be returned, SAME_CITY auto-fill would silently fail with no anchor,
	// and the Residence Location section rendered just the label with the
	// pincode field hidden (gated on cityValue). Reported on Plot Loan ›
	// Director Detail flow.
	//
	// `||` (not `??`) so empty-string values also fall through to the next
	// candidate.
	function getActiveLoanAnswers(): Record<string, any> {
		const loanData = formState.loanData as Record<string, any>;
		const loanName =
			(loanData.loanName as string) ||
			((formState.applicationData as any)?.loanName as string) ||
			Object.keys(loanData).find((k) => k !== 'loanName') ||
			'';
		return (loanData[loanName] ?? {}) as Record<string, any>;
	}

	function getPropertyLocation(): { state: string; city: string } {
		const answers = getActiveLoanAnswers();
		return {
			state: (answers.propertyStateName as string) || '',
			city: (answers.propertyCityName as string) || ''
		};
	}

	function getbusinessLocation(): { state: string; city: string } {
		const answers = getActiveLoanAnswers();
		return {
			state: (answers.businessStateName as string) || '',
			city: (answers.businessCityName as string) || ''
		};
	}

	/**
	 * Single entry point for "where is the case anchored?" — driven by
	 * `caseAnchor.stateField` / `caseAnchor.cityField` so secured (property),
	 * business / professional (business), and personal (processing branch)
	 * all resolve through one path. Used by the SAME_CITY auto-fill in
	 * `handleResidenceChange` and the safety-net $effect below.
	 */
	function getCaseAnchorLocation(): { state: string; city: string } {
		const answers = getActiveLoanAnswers();
		return {
			state: (answers[caseAnchor.stateField] as string) || '',
			city: (answers[caseAnchor.cityField] as string) || ''
		};
	}

	// ── Derived location values ─────────────────────────────────────
	let prefix = $derived(isCompany ? 'companyOffice' : 'applicantResidence');
	let residenceKey = $derived(isCompany ? 'companyOfficeProximity' : 'applicantResidencePattern');
	let residenceValue = $derived((applicant as any)[residenceKey] ?? '');
	let stateValue = $derived((applicant as any)[`${prefix}State`] ?? '');
	let cityValue = $derived((applicant as any)[`${prefix}City`] ?? '');
	let pincodeValue = $derived((applicant as any)[`${prefix}Pincode`] ?? '');

	let cityOptions = $derived.by(() => {
		if (!pincodeData) return [];
		return Object.keys(pincodeData.cityMap)
			.sort()
			.map((city) => ({ label: city, value: city }));
	});

	let filteredPincodes = $derived.by(() => {
		if (pincodeQuery.length < 3) return [];
		const cityPincodes = pincodeData.cityMap[cityValue] ?? [];
		return cityPincodes.filter((p) => p.pincode.startsWith(pincodeQuery)).slice(0, 8);
	});

	// ── Residence change handler ────────────────────────────────────
	function handleResidenceChange(value: string | number) {
		const updated = [...formState.applicants];
		updated[applicantIndex] = {
			...updated[applicantIndex],
			[residenceKey]: value,
			[`${prefix}State`]: '',
			[`${prefix}City`]: '',
			[`${prefix}Pincode`]: ''
		};
		formState.replaceApplicants(updated);

		pincodeQuery = '';
		showPincodeSuggestions = false;
		pincodeError = '';

		// Single anchor source — `caseAnchor` already maps to the right fields per
		// loan type (property / business / processing). Personal Loan uses the
		// "processing branch" answer captured on Getting Started → Processing
		// Location; secured uses the property location; business / professional
		// use businessStateName/City.
		const { state: propertyState, city: propertyCity } = getCaseAnchorLocation();

		if (value === 'SAME_CITY') {
			if (propertyState && propertyCity) {
				updated[applicantIndex] = {
					...updated[applicantIndex],
					[residenceKey]: value,
					[`${prefix}State`]: propertyState,
					[`${prefix}City`]: propertyCity
				};
				formState.replaceApplicants(updated);
				loadPincodes(propertyState);
			}
		} else if (value === 'DIFFERENT_CITY') {
			if (propertyState) {
				updated[applicantIndex] = {
					...updated[applicantIndex],
					[residenceKey]: value,
					[`${prefix}State`]: propertyState
				};
				formState.replaceApplicants(updated);
				loadPincodes(propertyState);
			}
		}
	}

	// Auto-fill SAFETY NET: if the user picked SAME_CITY but state/city ended up empty
	// (e.g., the loan-data anchor wasn't readable at click time — happened for directors
	// when the loan-name lookup fell back to the wrong key), reactively refill them
	// once anchorState/anchorCity become available. Without this the pincode field is
	// gated on cityValue and stays hidden, leaving the user with an empty Residence
	// Location section.
	$effect(() => {
		if (residenceValue !== 'SAME_CITY') return;
		const { state: anchorState, city: anchorCity } = getCaseAnchorLocation();
		if (!anchorState && !anchorCity) return;
		const a = formState.applicants[applicantIndex] as any;
		if (!a) return;
		const needsState = anchorState && a[`${prefix}State`] !== anchorState;
		const needsCity = anchorCity && a[`${prefix}City`] !== anchorCity;
		if (!needsState && !needsCity) return;
		const updated = [...formState.applicants];
		updated[applicantIndex] = {
			...updated[applicantIndex],
			...(needsState && { [`${prefix}State`]: anchorState }),
			...(needsCity && { [`${prefix}City`]: anchorCity })
		};
		formState.replaceApplicants(updated);
		if (needsState && anchorState) loadPincodes(anchorState);
	});

	function handleStateChange(value: string | number) {
		const updated = [...formState.applicants];
		updated[applicantIndex] = {
			...updated[applicantIndex],
			[`${prefix}State`]: value,
			[`${prefix}City`]: '',
			[`${prefix}Pincode`]: ''
		};
		formState.replaceApplicants(updated);

		pincodeQuery = '';
		showPincodeSuggestions = false;
		pincodeError = '';

		if (value) loadPincodes(String(value));
	}

	function handleCityChange(value: string | number) {
		const updated = [...formState.applicants];
		updated[applicantIndex] = {
			...updated[applicantIndex],
			[`${prefix}City`]: value,
			[`${prefix}Pincode`]: ''
		};
		formState.replaceApplicants(updated);

		pincodeQuery = '';
		showPincodeSuggestions = false;
		pincodeError = '';
	}

	function handlePincodeInput(val: string) {
		val = val.replace(/[^0-9]/g, '');
		if (val.length > 6) val = val.slice(0, 6);

		updateApplicant(`${prefix}Pincode`, val);
		pincodeQuery = val;
		showPincodeSuggestions = val.length >= 3 && val.length < 6;

		if (val.length >= 3 && cityValue) {
			const cityPincodes = pincodeData.cityMap[cityValue] ?? [];
			const prefix3 = val.slice(0, 3);
			const hasMatch = cityPincodes.some((p) => p.pincode.startsWith(prefix3));
			pincodeError = hasMatch ? '' : `No pincodes starting with ${prefix3} found in ${cityValue}`;
		} else {
			pincodeError = '';
		}
	}

	function selectPincodeSuggestion(pincode: string) {
		updateApplicant(`${prefix}Pincode`, pincode);
		pincodeQuery = pincode;
		showPincodeSuggestions = false;
		pincodeError = '';
	}

	// ── Religion change clears SC/ST when not Hindu ─────────────────
	function handleReligionChange(value: string | number) {
		updateApplicant('religion', value);
		if (value !== 'hindu') {
			updateApplicant('casteCategory', '');
		}
	}
</script>

<div class="space-y-10">
	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Applicant Profile</h3>
		<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
			{isCompany
				? 'Company details that affect lender matching and verification.'
				: 'Personal details that affect lender matching, verification, and rate concessions.'}
		</p>
	</div>

	{#if isIndividual}
		<!-- Q1: Education -->
		{#if isEducationLocked && (applicant as any).education}
			<!-- Locked: show read-only badge with the pre-set value -->
			<div class="flex flex-col gap-1.5">
				<p class="font-titleMedium text-sm text-(--form-text)">
					Highest Education <span class="text-(--ddsa-error)">*</span>
				</p>
				<div
					class="flex items-center gap-2 rounded-lg border border-(--form-border) bg-(--form-bg-alt) px-4 py-3"
				>
					<Check class="h-4 w-4 shrink-0 text-emerald-500" />
					<span class="text-sm font-medium text-(--form-text)">
						{educationOptions.find((o) => o.value === (applicant as any).education)?.label ??
							(applicant as any).education}
					</span>
				</div>
				<p class="text-xs text-(--form-text-muted)">Set from loan type — cannot be changed</p>
			</div>
		{:else}
			<RadioField
				id="education_{applicantId}"
				label="Highest Education"
				optionContainerClass="grid grid-cols-2 gap-3"
				radioClass="mt-10"
				options={educationOptions}
				value={(applicant as any).education ?? ''}
				required={true}
				onChange={(value) => updateApplicant('education', value)}
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
			onChange={handleReligionChange}
		/>

		<!-- Religion consistency error -->
		{#if myReligionConflicts.length > 0}
			<div
				class="-mt-2 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20"
			>
				{#each myReligionConflicts as conflict}
					<p class="flex items-start gap-2 font-paragraph text-sm text-red-700 dark:text-red-400">
						<CircleAlert size={14} class="mt-0.5 shrink-0" />
						<span>{conflict.message}</span>
					</p>
				{/each}
			</div>
		{/if}

		<!-- Q3: SC/ST Category (conditional — Hindu only) -->
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
				onChange={(val) => updateApplicant('casteCategory', val)}
			/>

			<!-- Caste category consistency error -->
			{#if myCasteConflicts.length > 0}
				<div
					class="-mt-2 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800 dark:bg-red-900/20"
				>
					{#each myCasteConflicts as conflict}
						<p class="flex items-start gap-2 font-paragraph text-sm text-red-700 dark:text-red-400">
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
			onChange={(value) => updateApplicant('ownedResidentialProperties', value)}
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
			onChange={(val) => updateApplicant('hasDisability', val)}
		/>

		<!-- Q6: Residence relative to case anchor — label uses `caseAnchor.noun`
		     so Personal reads "loan processing location", Business reads
		     "business location", Professional reads "practice location",
		     Secured reads "property location". Hidden for NRI (lender uses
		     the GPA's location instead) and hidden in Personal Loan until the
		     processing-location anchor itself is filled (DC flow asks the
		     anchor *after* applicants — we revert to the default-SAME_CITY
		     behaviour set by the route-level effect during that window). -->
		{#if !isNRI && (!isPersonalLoan || getCaseAnchorLocation().city)}
			<RadioField
				id="residence_{applicantId}"
				label="Residence relative to {caseAnchor.noun} location?"
				optionContainerClass="grid grid-cols-1 md:grid-cols-3 gap-3"
				radioClass="mt-10"
				options={residenceOptions}
				value={residenceValue}
				required={true}
				onChange={(value) => handleResidenceChange(value)}
			/>
		{/if}

		<!-- Q7: NRI Country (conditional) -->
		{#if isNRI}
			<div class="mt-6">
				<SelectField
					id="nriCountry_{applicantId}"
					label="Country of residence"
					selectClass=""
					options={nriCountryOptions}
					value={(applicant as any).nriCountry ?? ''}
					required={true}
					onChange={(value) => updateApplicant('nriCountry', value)}
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
			onChange={(value) => updateApplicant('companyOwnedProperties', value)}
		/>

		<!-- Company Q2: Office proximity — secured loans only. Same dynamic
		     anchor noun as the Individual variant for consistency. -->
		{#if isSecuredLoan}
			<RadioField
				id="company_office_{applicantId}"
				label="Company's registered office relative to {caseAnchor.noun} location?"
				optionContainerClass="grid grid-cols-1 md:grid-cols-3 gap-3"
				radioClass="mt-10"
				options={residenceOptions}
				value={residenceValue}
				required={true}
				onChange={(value) => handleResidenceChange(value)}
			/>
		{/if}
	{/if}

	<!-- Conditional State / City / Pincode
	     Hidden for NRI individuals — for NRI we capture "Country of residence"
	     (Q7) instead; pincode/state/city are India-specific and don't apply.
	     Companies aren't NRI, so `!isNRI` is always true for them — the gate
	     only narrows the Individual branch. -->
	{#if residenceValue && !isNRI}
		<div
			class="mt-6 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
		>
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">
				{isCompany ? 'Office' : 'Residence'} Location
				{#if residenceValue === 'SAME_CITY' && cityValue}
					<span class="ml-1 text-gray-400 normal-case">— {cityValue}, {stateValue}</span>
				{/if}
			</p>

			<!-- State dropdown (only for DIFFERENT_STATE) -->
			{#if residenceValue === 'DIFFERENT_STATE'}
				<SelectField
					id="state_{applicantId}"
					label="State"
					selectClass=""
					options={allStates.map((s) => ({ label: s, value: s }))}
					value={stateValue}
					required={true}
					icon="map"
					onChange={(value) => handleStateChange(value)}
				/>
			{/if}

			<!-- City dropdown (not for SAME_CITY — auto-set) -->
			{#if residenceValue !== 'SAME_CITY' && (stateValue || residenceValue === 'DIFFERENT_CITY')}
				<SelectField
					id="city_{applicantId}"
					label="City"
					selectClass=""
					icon="map-pin-plus-inside"
					options={cityOptions}
					value={cityValue}
					required={true}
					disabled={cityOptions.length === 0}
					onChange={(value) => handleCityChange(value)}
				/>
			{/if}

			<!-- Pincode with typeahead -->
			{#if cityValue}
				<div class="relative">
					<TextField
						id="pincode_{applicantId}"
						label="Pincode (optional)"
						placeholder="Enter 6-digit pincode"
						icon="map-pin"
						fieldType="pincode"
						value={pincodeValue}
						onInput={(val) => handlePincodeInput(val)}
					/>

					{#if pincodeError}
						<p class="mt-1 text-xs font-medium text-red-500">{pincodeError}</p>
					{/if}

					{#if showPincodeSuggestions && filteredPincodes.length > 0}
						<div
							class="absolute z-100 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
						>
							{#each filteredPincodes as entry (entry.pincode + entry.area)}
								<button
									type="button"
									class="w-full border-b border-gray-100 px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
									onclick={() => selectPincodeSuggestion(entry.pincode)}
								>
									<span class="font-semibold text-gray-800">{entry.pincode}</span>
									<span class="ml-2 text-gray-500">— {entry.area}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
