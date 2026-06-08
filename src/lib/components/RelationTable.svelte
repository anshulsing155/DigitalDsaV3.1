<script lang="ts">
	import { formState } from '$lib/state/form.svelte';
	import { ChevronDown, Handshake, Star, UserStar, Waypoints } from '$lib/utils/iconRegistry';

	interface Props {
		nextButtonValidate?: boolean;
	}

	let { nextButtonValidate = $bindable(false) }: Props = $props();

	let copyData: any[] = $state(structuredClone(formState.applicants));

	const Immediate_Family = {
		PARENT: { Male: 'FATHER', Female: 'MOTHER' },
		CHILD: { Male: 'SON', Female: 'DAUGHTER' },
		SPOUSE: { Male: 'HUSBAND', Female: 'WIFE' },
		SIBLING: { Male: 'BROTHER', Female: 'SISTER' }
	};

	const Through_Marriage = {
		SIBLING_IN_LAW: { Male: 'BROTHER_IN_LAW', Female: 'SISTER_IN_LAW' },
		CHILD_IN_LAW: { Male: 'SON_IN_LAW', Female: 'DAUGHTER_IN_LAW' }
	};

	const Extended_blood = {
		UNCLE_AUNT: { Male: 'UNCLE', Female: 'AUNT' },
		COUSIN: { Male: 'COUSIN', Female: 'COUSIN' },
		NEPHEW_NIECE: { Male: 'NEPHEW', Female: 'NIECE' },
		GRANDPARENT: { Male: 'GRANDFATHER', Female: 'GRANDMOTHER' }
	};

	const Not_Related = {
		FRIEND: { Male: 'FRIEND', Female: 'FRIEND' },
		BUSINESS_PARTNER: { Male: 'BUSINESS_PARTNER', Female: 'BUSINESS_PARTNER' },
		OTHER: { Male: 'OTHER', Female: 'OTHER' }
	};

	const relationshipCategories = {
		Immediate_Family,
		Through_Marriage,
		Extended_blood,
		Not_Related
	};

	const relationCombinations = [
		// ───────── IMMEDIATE FAMILY ─────────

		{ relation: 'FATHER', canBe: ['SON', 'DAUGHTER'] },
		{ relation: 'MOTHER', canBe: ['SON', 'DAUGHTER'] },

		{ relation: 'SON', canBe: ['FATHER', 'MOTHER'] },
		{ relation: 'DAUGHTER', canBe: ['FATHER', 'MOTHER'] },

		{ relation: 'BROTHER', canBe: ['BROTHER', 'SISTER'] },
		{ relation: 'SISTER', canBe: ['BROTHER', 'SISTER'] },

		{ relation: 'HUSBAND', canBe: ['WIFE'] },
		{ relation: 'WIFE', canBe: ['HUSBAND'] },

		// ───────── EXTENDED BLOOD ─────────

		{ relation: 'UNCLE', canBe: ['NEPHEW', 'NIECE'] },
		{ relation: 'AUNT', canBe: ['NEPHEW', 'NIECE'] },

		{ relation: 'NEPHEW', canBe: ['UNCLE', 'AUNT'] },
		{ relation: 'NIECE', canBe: ['UNCLE', 'AUNT'] },

		{ relation: 'COUSIN', canBe: ['COUSIN'] },

		{ relation: 'GRANDFATHER', canBe: ['GRANDFATHER', 'GRANDMOTHER'] },
		{ relation: 'GRANDMOTHER', canBe: ['GRANDFATHER', 'GRANDMOTHER'] },

		// ───────── THROUGH MARRIAGE ─────────

		{ relation: 'BROTHER_IN_LAW', canBe: ['SISTER_IN_LAW'] },
		{ relation: 'SISTER_IN_LAW', canBe: ['BROTHER_IN_LAW'] },

		{ relation: 'SON_IN_LAW', canBe: ['FATHER', 'MOTHER'] },
		{ relation: 'DAUGHTER_IN_LAW', canBe: ['FATHER', 'MOTHER'] },

		// ───────── NOT RELATED ─────────

		{ relation: 'FRIEND', canBe: ['FRIEND'] },
		{ relation: 'BUSINESS_PARTNER', canBe: ['BUSINESS_PARTNER'] },
		{ relation: 'OTHER', canBe: ['OTHER'] }
	];

	const ageGapRules = {
		FATHER: 18,
		MOTHER: 18,

		SON: -18,
		DAUGHTER: -18,

		GRANDFATHER: 50,
		GRANDMOTHER: 50,

		GRANDSON: -50,
		GRANDDAUGHTER: -50
	};

	let pageData: Record<string, any> = $state({
		relationType: '',
		relation: '',
		relatedApplicant: {}
	});

	const ANCHOR_GROUPS = {
		STRONG: ['FATHER', 'MOTHER', 'HUSBAND', 'WIFE'],

		MODERATE: ['SON', 'DAUGHTER', 'BROTHER', 'SISTER'],

		WEAK: ['BROTHER_IN_LAW', 'SISTER_IN_LAW', 'SON_IN_LAW', 'DAUGHTER_IN_LAW'],

		NONE: ['FRIEND', 'BUSINESS_PARTNER', 'OTHER']
	};

	const ANCHOR_CONFLICT = {
		MODERATE: ['DAUGHTER', 'SISTER', 'BROTHER'],

		WEAK: ['SISTER_IN_LAW', 'DAUGHTER_IN_LAW'],

		NONE: ['FRIEND', 'OTHER']
	};

	const ANCHOR_MESSAGE = {
		MODERATE:
			'As per bank norms, this relationship is currently treated as a moderate anchor. In some cases, banks may request additional income support or documentation. Adding a stronger co-applicant may improve eligibility, subject to bank policy checks.',

		WEAK: 'As per bank norms, this relationship is currently treated as a weak anchor. However, if the applicant’s husband is added as a co-applicant and co-owner of the property, some banks may reconsider the case and allow loan processing, subject to eligibility and policy checks.',

		NONE: 'As per bank norms, this relationship is not considered an eligible anchor. Most banks may not process the loan unless a strong eligible co-applicant is added as a co-applicant and co-owner of the property, subject to policy norms.'
	};

	interface ApplicantData {
		relation?: string;
		fullName?: string;
		relationType?: string;
		relatedApplicant?: Record<string, unknown>;
		applicantType?: string;
		age?: string | number;
		gender?: string;
		[key: string]: unknown;
	}

	interface AnchorGroupResult {
		relation: string;
		anchorType: string;
		applicantNames: string[];
		message: string;
	}

	function groupAnchorConflicts(
		userData: ApplicantData[] = [],
		anchorConflict: Record<string, string[]> = {},
		anchorMessage: Record<string, string> = {}
	) {
		const resultMap: Record<string, AnchorGroupResult> = {};

		for (const applicant of userData) {
			const relation = applicant.relation || '';
			const fullName = applicant.fullName || '';

			// 1️⃣ Resolve anchor type
			let anchorType = 'NONE';
			for (const [type, relations] of Object.entries(anchorConflict)) {
				if (relations.includes(relation)) {
					anchorType = type;
					break;
				}
			}

			// 2️⃣ Group by relation
			if (!resultMap[relation]) {
				resultMap[relation] = {
					relation: relation,
					anchorType,
					applicantNames: [],
					message: anchorMessage[anchorType] || ''
				};
			}

			// 3️⃣ Push applicant name
			resultMap[relation].applicantNames.push(fullName);
		}

		// 4️⃣ Convert object → array
		return Object.values(resultMap);
	}

	type RelationCategoryKey = keyof typeof relationshipCategories;
	type GenderKey = 'Male' | 'Female';

	function getRelationList(
		gender: GenderKey | string | undefined,
		listedArray: RelationCategoryKey | string | undefined
	) {
		// Get the correct category object
		if (!listedArray || !(listedArray in relationshipCategories)) {
			return [];
		}
		const category = relationshipCategories[listedArray as RelationCategoryKey];

		if (!category || !gender) {
			return [];
		}

		// Extract values for the specified gender
		let relationShip = Object.values(category).map((v) => v[gender as GenderKey]);

		return relationShip;
	}

	function filterApplicantObject(obj: Record<string, unknown>) {
		const allowedKeys = ['fullName', 'age', 'gender'];

		return Object.fromEntries(Object.entries(obj).filter(([key]) => allowedKeys.includes(key)));
	}

	function getCanBe(relation: string) {
		const item = relationCombinations.find(
			(r) => r.relation.toLowerCase() === relation.toLowerCase()
		);
		return item ? item.canBe : [];
	}

	interface ApplicantWithRelation {
		relation?: string;
		fullName?: string;
		age?: number | string;
		gender?: string;
		relatedApplicant?: {
			fullName?: string;
			age?: number | string;
			gender?: string;
		};
		[key: string]: unknown;
	}

	function updateApplicantField(i: number, field: string, value: unknown) {
		const updated = [...formState.applicants] as any[];
		updated[i] = { ...updated[i], [field]: value };
		formState.replaceApplicants(updated);
	}

	function checkValidRelation(
		app_1: ApplicantWithRelation,
		app_2: ApplicantWithRelation,
		i: number
	) {
		let relation = app_1.relation;
		let possibleRelations = getCanBe(relation || '');
		let secondAppRelation = app_2.relation || '';

		if (
			app_1?.fullName === app_2.relatedApplicant?.fullName &&
			possibleRelations.length > 0 &&
			secondAppRelation
		) {
			if (!possibleRelations.includes(secondAppRelation)) {
				updateApplicantField(
					i,
					'relationShipError',
					`Invalid selection: ${app_2.relatedApplicant?.fullName} cannot be selected for ${relation}.`
				);
			} else {
				updateApplicantField(i, 'relationShipError', '');
			}
		} else {
			updateApplicantField(i, 'relationShipError', '');
		}
	}

	type AgeGapRelation = keyof typeof ageGapRules;

	function checkAgeValidation(
		app_1: ApplicantWithRelation,
		app_2: ApplicantWithRelation,
		i: number
	) {
		let relation = app_1.relation as AgeGapRelation | undefined;
		let ageGap = relation && relation in ageGapRules ? ageGapRules[relation] : 0;
		let ageOfFirstApp = typeof app_1.age === 'number' ? app_1.age : Number(app_1.age) || 0;
		let ageOfSecindApp = typeof app_2.age === 'number' ? app_2.age : Number(app_2.age) || 0;

		if (ageGap < 0) {
			if (ageOfFirstApp + Math.abs(ageGap) > ageOfSecindApp) {
				updateApplicantField(
					i,
					'relationShipError',
					`${app_1.fullName} is ${app_2.fullName}'s ${relation}, so the age gap must be at least ${Math.abs(ageGap)} years.`
				);
			} else {
				updateApplicantField(i, 'relationShipError', '');
			}
		} else if (ageGap > 0) {
			if (ageOfFirstApp - ageGap < ageOfSecindApp) {
				updateApplicantField(
					i,
					'relationShipError',
					`${app_1.fullName} is ${app_2.fullName}'s ${relation}, so the age gap must be at least ${Math.abs(ageGap)} years.`
				);
			} else {
				updateApplicantField(i, 'relationShipError', '');
			}
		} else {
			updateApplicantField(i, 'relationShipError', '');
		}
	}

	function selectData(i: number, type: string) {
		if (type == 'relationType') {
			updateApplicantField(i, 'relation', '');
		}
		let dataCheck = (formState.applicants as any[])[i];
		if (dataCheck?.relation && dataCheck?.relation && dataCheck?.indexOfRelationShip >= 0) {
			if (dataCheck?.indexOfRelationShip >= 0) {
				let relatedApplicant = filterApplicantObject(
					(formState.applicants as any[])[dataCheck.indexOfRelationShip]
				);
				updateApplicantField(i, 'relatedApplicant', relatedApplicant);
			}

			let data = (formState.applicants as any[])[i];

			let relatedData = data.relatedApplicant;
			let secondApp = (formState.applicants as any[]).filter(
				(val: any) =>
					val.fullName == relatedData.fullName &&
					val.age == relatedData.age &&
					val.gender == relatedData.gender
			);

			checkValidRelation(data, secondApp[0], i);
			if ((formState.applicants as any[])[i].relationShipError == '') {
				checkAgeValidation(data, secondApp[0], i);
			}
		}
	}

	////// Anchor ///////

	function validateApplicants(applicantData: ApplicantData[], pageData: Record<string, unknown>) {
		const keysToCheck = Object.keys(pageData);

		return applicantData.every((applicant: ApplicantData) =>
			keysToCheck.every((key: string) => {
				const val = applicant[key];

				// key must exist
				if (!(key in applicant)) return false;

				// handle object (like relatedApplicant)
				if (typeof val === 'object' && val !== null) {
					return Object.keys(val).length > 0;
				}

				// handle primitive values
				return (
					val !== '' &&
					val !== undefined &&
					val !== null &&
					!(typeof val === 'number' && isNaN(val))
				);
			})
		);
	}

	interface ItemWithError {
		relationShipError?: string | null;
		[key: string]: unknown;
	}

	function hasAnyError(arr: ItemWithError[]) {
		return arr.some((item: ItemWithError) => {
			if (item == null) return false; // handles null / undefined item

			const error = item.relationShipError;

			// check undefined or null
			if (error === undefined || error === null) return false;

			// remove spaces and check
			return error.trim() !== '';
		});
	}
	let msg: any[] = $state([]);

	$effect(() => {
		let applicantData = (formState.applicants as any[]).filter(
			(val: ApplicantData) => val.applicantType === 'Individual'
		);
		const isValid = validateApplicants(applicantData, pageData);

		let errorCheck = hasAnyError(formState.applicants as any[]);
		if (!errorCheck && isValid) {
			nextButtonValidate = true;
			msg = groupAnchorConflicts(applicantData, ANCHOR_CONFLICT, ANCHOR_MESSAGE);
		} else {
			nextButtonValidate = false;
			msg = [];
		}
	});
</script>

<div
	class="mt-4 mb-8 w-full overflow-x-auto rounded-lg border border-primary whitespace-nowrap shadow-lg"
>
	<table class="w-full min-w-max table-auto text-left">
		<thead
			class="border-b border-[var(--form-border)] bg-[var(--form-bg-alt)] text-sm font-semibold text-[var(--form-text)] uppercase"
		>
			<tr>
				<th class="shrink-0 px-3 py-2">Name</th>
				<th class="shrink-0 px-3 py-2">Type</th>
				<th class="shrink-0 px-3 py-2">Relation</th>
				<th class="shrink-0 px-3 py-2">Related To</th>
			</tr>
		</thead>

		<tbody class="w-full text-[var(--form-text-secondary)]">
			{#each formState.applicants as any[] as applicant, i}
				{#if applicant.applicantType === 'Individual'}
					<tr
						class={`border-b border-[var(--form-border)] transition
							${
								applicant.gender === 'Male'
									? 'border-blue-400 bg-blue-50'
									: applicant.gender === 'Female'
										? 'border-pink-400 bg-pink-50'
										: ''
							}`}
					>
						<!-- Name Column -->
						<td class="shrink-0 px-1 py-2 md:px-3">
							<h2
								class={`text-sm font-semibold text-[var(--form-text)] underline decoration-2 underline-offset-4 ${
									applicant.gender === 'Male'
										? 'decoration-blue-400'
										: applicant.gender === 'Female'
											? 'decoration-pink-400'
											: ''
								} max-w-[12ch] truncate`}
							>
								{applicant.gender === 'Male' ? 'Mr.' : applicant.gender === 'Female' ? 'Ms.' : ''}
								{applicant.fullName}
							</h2>
						</td>

						<!-- Relation Type -->
						<td class="shrink-0 px-1 py-2 md:px-3">
							<div class="relative">
								<div
									class="absolute left-0 flex h-full w-8 items-center justify-center rounded-l-md bg-black md:w-12"
								>
									<Handshake class="h-3 w-3 shrink-0 text-white md:h-5 md:w-5" />
								</div>
								<select
									bind:value={applicant.relationType}
									onchange={() => {
										selectData(i, 'relationType');
									}}
									class="z-20 w-full appearance-none rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] p-1 pr-5 pl-10 text-sm text-[var(--form-text)] transition-all duration-150 outline-none focus:ring-2 focus:ring-primary md:p-3 md:pr-10 md:pl-14"
								>
									<option value="" disabled selected hidden>Select Type</option>
									<option value="Immediate_Family">Immediate Family</option>
									<option value="Through_Marriage">Through Marriage</option>
									<option value="Extended_blood">Extended blood</option>
									<option value="Not_Related">Not Related</option>
								</select>

								<span
									class="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[var(--form-text-muted)] md:right-3"
								>
									<ChevronDown class="h-4 w-4 md:h-6 md:w-6" />
								</span>
							</div>
						</td>

						<!-- Relation Name -->
						<td class="shrink-0 px-1 py-2 md:px-3">
							<div class="relative">
								<div
									class="absolute left-0 flex h-full w-8 items-center justify-center rounded-l-md bg-black md:w-12"
								>
									<Waypoints class="h-3 w-3 shrink-0 text-white md:h-5 md:w-5" />
								</div>
								<select
									bind:value={applicant.relation}
									onchange={() => {
										selectData(i, 'relation');
									}}
									class="z-20 w-full appearance-none rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] p-1 pr-5 pl-10 text-sm text-[var(--form-text)] transition-all duration-150 outline-none focus:ring-2 focus:ring-primary md:p-3 md:pr-10 md:pl-14"
								>
									<option value="" disabled selected hidden>Select Relation</option>

									{#each getRelationList(applicant.gender, applicant.relationType) as r}
										<option value={r}>{r}</option>
									{/each}
								</select>

								<span
									class="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[var(--form-text-muted)] md:right-3"
								>
									<ChevronDown class="h-4 w-4 md:h-6 md:w-6" />
								</span>
							</div>
						</td>

						<!-- Related Applicant -->
						<td class="shrink-0 px-1 py-2 md:px-3">
							<div class="relative">
								<div
									class="absolute left-0 flex h-full w-8 items-center justify-center rounded-l-md bg-black md:w-12"
								>
									<UserStar class="h-3 w-3 shrink-0 text-white md:h-5 md:w-5" />
								</div>
								<select
									bind:value={applicant.indexOfRelationShip}
									onchange={() => {
										selectData(i, 'indexOfRelationShip');
									}}
									class="z-20 w-full appearance-none rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] p-1 pr-5 pl-10 text-sm text-[var(--form-text)] transition-all duration-150 outline-none focus:ring-2 focus:ring-primary md:p-3 md:pr-10 md:pl-14"
								>
									<option value={-1} disabled selected hidden>Select Relation</option>

									{#each copyData as other, index}
										{#if other.applicantType === 'Individual'}
											{#if other.fullName !== applicant.fullName || other.age !== applicant.age}
												<option value={index} class="">
													{other.gender === 'Male' ? 'Mr.' : other.gender === 'Female' ? 'Ms.' : ''}
													{other.fullName}
												</option>
											{/if}
										{/if}
									{/each}
								</select>

								<span
									class="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[var(--form-text-muted)] md:right-3"
								>
									<ChevronDown class="h-4 w-4 md:h-6 md:w-6" />
								</span>
							</div>
						</td>
					</tr>
					<!-- Error Message -->
					{#if (formState.applicants as any[])[i]?.relationShipError}
						<tr>
							<td colspan="4" class="px-4 py-2 text-xs text-red-600">
								{(formState.applicants as any[])[i].relationShipError}
							</td>
						</tr>
					{/if}
				{/if}
			{/each}
		</tbody>
	</table>
</div>

{#if msg?.length > 0}
	{#each msg as item}
		<div
			class="mb-8 rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4 shadow-sm"
		>
			<!-- Header -->
			<div class="mb-2 flex items-center justify-between">
				<div class="text-labelText text-[var(--form-text)]">
					Relation: <span class="uppercase">{item.relation.replaceAll('_', ' ')}</span>
				</div>

				<!-- Anchor Badge -->
				<span
					class={`inputText rounded-full px-3 py-1
			${
				item.anchorType === 'MODERATE'
					? 'bg-yellow-100 text-yellow-800'
					: item.anchorType === 'WEAK'
						? 'bg-neutral-100 text-neutral-800'
						: 'bg-red-100 text-red-800'
			}`}
				>
					{item.anchorType} ANCHOR
				</span>
			</div>

			<!-- Applicant Names -->
			<div class="text-labelText mb-2 text-[var(--form-text-secondary)]">
				<span class="">Applicants:</span>
				{item.applicantNames.join(', ')}
			</div>

			<!-- Message -->
			<div class="inputText text-[var(--form-text-secondary)]">
				{item.message}
			</div>
		</div>
	{/each}
{/if}

<style>
	::-webkit-scrollbar {
		height: 6px;
		width: 6px;
	}
	::-webkit-scrollbar-track {
		background: transparent;
	}
	::-webkit-scrollbar-thumb {
		background: linear-gradient(90deg, #ddbea9, #e3cab9);
		border-radius: 4px;
	}
	* {
		scrollbar-width: thin;
		scrollbar-color: #ddbea9 transparent;
	}
</style>
