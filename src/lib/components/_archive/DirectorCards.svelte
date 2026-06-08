<script lang="ts">
	/**
	 * DirectorCards — Step 0.5: Director/Partner Detail Capture
	 * ═══════════════════════════════════════════════════════════════════
	 * ACCORDION pattern: one card expanded at a time, others show as
	 * compact summaries (confirmed) or locked placeholders (waiting).
	 *
	 * Per-card "Confirm" validates + collapses + auto-advances.
	 * Page-level Next auto-confirms the active card, then checks all.
	 *
	 * Co-applicant is AUTO-DERIVED: onProperty=true OR onEMI=true.
	 *
	 * NAME MATCHING (user-confirmed, NOT auto):
	 *  - On name blur, checks existing Individual applicants (from Step 0)
	 *    and directors from other companies.
	 *  - If match found: shows a PROMPT asking "Is this the same person?"
	 *  - User clicks Yes → restore fields and lock
	 *  - User clicks No  → keep user's values, no lock
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import {
		Users,
		Building2,
		Check,
		AlertCircle,
		Percent,
		Lock,
		RotateCcw
	} from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import type { DirectorInfo } from '$lib/types/form';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		isNextEnabled?: boolean;
		/** When true, auto-sets location='same_city' and hides the field (unsecured loans have no property) */
		isUnsecured?: boolean;
	}

	let { isNextEnabled = $bindable(false), isUnsecured = false }: Props = $props();

	// ── Constants ───────────────────────────────────────────────────
	const MEMBER_LABEL_MAP: Record<string, string> = {
		'Partnership Firm': 'Partner',
		LLP: 'Partner',
		'Private Limited': 'Director',
		'One Person Company (OPC)': 'Director',
		'Trust / Society': 'Trustee'
	};

	const ROLE_MAP: Record<string, DirectorInfo['role']> = {
		'Partnership Firm': 'partner',
		LLP: 'partner',
		'Private Limited': 'director',
		'One Person Company (OPC)': 'director',
		'Trust / Society': 'trustee'
	};

	const GENDER_LABEL: Record<string, string> = { male: 'Male', female: 'Female' };
	const MARITAL_LABEL: Record<string, string> = {
		single: 'Single',
		married: 'Married',
		divorced: 'Divorced',
		separated: 'Separated',
		widowed: 'Widowed'
	};
	const LOCATION_LABEL: Record<string, string> = {
		same_city: 'Same City',
		same_state: 'Same State',
		different_state: 'Diff. State'
	};

	// ── Derived: Company applicants ────────────────────────────────
	const companyApplicants = $derived(
		formState.applicants.filter((a) => a.applicantType === 'Company')
	);

	// ── Per-card form interface ─────────────────────────────────────
	interface MatchInfo {
		source: string;
		data: Partial<DirectorForm>;
		lockedFields: string[];
		matchedId?: string;
	}

	interface DirectorForm {
		id: string;
		fullName: string;
		gender: string;
		age: string;
		maritalStatus: string;
		ownershipPercent: string;
		location: string;
		isNRI: string;
		onProperty: string;
		onEMI: string;
		// Restoration tracking
		restoredFrom: string;
		lockedFields: string[];
		// Pending match (user hasn't confirmed yet)
		pendingMatch: MatchInfo | null;
	}

	// ── State ───────────────────────────────────────────────────────
	let directorForms: Record<string, DirectorForm[]> = $state({});
	let errors: Record<string, Record<number, Record<string, string>>> = $state({});
	let globalErrors: Record<string, string> = $state({});

	// Accordion state: which card is expanded per company (-1 = none)
	let activeCardKey: Record<string, number> = $state({});
	// Which cards are confirmed per company
	let confirmedCards: Record<string, Record<number, boolean>> = $state({});
	// Force-through count for all-details-match duplicates
	let duplicateForceCount: Record<string, Record<number, number>> = $state({});
	// Soft name warnings (non-blocking)
	let nameWarnings: Record<string, Record<number, string>> = $state({});

	// ── Helpers ─────────────────────────────────────────────────────
	function isCoApplicantDerived(_d: DirectorForm): boolean {
		// All directors/partners are co-applicants — banks need at minimum
		// their CIBIL score. Those on EMI/Property get full assessment;
		// those not on either get CIBIL-only (+ obligations if CIBIL < 725).
		return true;
	}

	function isLocked(d: DirectorForm, field: string): boolean {
		return d.lockedFields.includes(field);
	}

	function normalizeName(name: string): string {
		return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
	}

	function isCardComplete(d: DirectorForm): boolean {
		return !!(
			d.fullName?.trim().length >= 2 &&
			d.gender &&
			d.age &&
			!isNaN(Number(d.age)) &&
			Number(d.age) >= 18 &&
			Number(d.age) <= 80 &&
			d.maritalStatus &&
			d.ownershipPercent &&
			!isNaN(Number(d.ownershipPercent)) &&
			Number(d.ownershipPercent) >= 1 &&
			Number(d.ownershipPercent) <= 100 &&
			(isUnsecured || d.location) &&
			d.isNRI &&
			(isUnsecured || d.onProperty) &&
			(isUnsecured || d.onEMI)
		);
	}

	type CardState = 'active' | 'confirmed' | 'waiting';
	function getCardState(companyId: string, idx: number): CardState {
		if ((activeCardKey[companyId] ?? -1) === idx) return 'active';
		if (confirmedCards[companyId]?.[idx]) return 'confirmed';
		return 'waiting';
	}

	function clearFieldError(companyId: string, idx: number, field: string) {
		if (errors[companyId]?.[idx]?.[field]) {
			delete errors[companyId][idx][field];
		}
		// Any field change invalidates duplicate force-through
		if (duplicateForceCount[companyId]?.[idx]) {
			duplicateForceCount[companyId][idx] = 0;
		}
		if (errors[companyId]?.[idx]?.['_allDetailsMatch']) {
			delete errors[companyId][idx]['_allDetailsMatch'];
		}
	}

	// ── Name matching: find existing applicant or cross-company director ──
	function findNameMatch(
		name: string,
		excludeCompanyId: string,
		excludeIdx: number
	): MatchInfo | null {
		const normalized = normalizeName(name);
		if (!normalized || normalized.length < 2) return null;

		// 1. Check existing Individual applicants (from AddApplicant Step 0)
		for (let i = 0; i < formState.applicants.length; i++) {
			const a = formState.applicants[i];
			if (a.applicantType !== 'Individual') continue;
			if (a.linkedCompanyId) continue; // Skip director-linked entries
			const aName = normalizeName((a.fullNameOfApplicant as string) ?? '');
			if (aName === normalized) {
				const locked: string[] = [];
				const data: Partial<DirectorForm> = {};

				if (a.gender) {
					data.gender = a.gender as string;
					locked.push('gender');
				}
				if (a.age) {
					data.age = String(a.age);
					locked.push('age');
				}
				if (a.maritalStatus) {
					data.maritalStatus = a.maritalStatus as string;
					locked.push('maritalStatus');
				}
				if (a.isApplicantNRI !== undefined && a.isApplicantNRI !== null) {
					const nriVal = a.isApplicantNRI as unknown;
					data.isNRI = nriVal === true || nriVal === 'Yes' ? 'Yes' : 'No';
					locked.push('isNRI');
				}
				if (a.onProperty !== undefined) {
					data.onProperty = String(a.onProperty);
					locked.push('onProperty');
				}
				if (a.onEMI !== undefined) {
					data.onEMI = String(a.onEMI);
					locked.push('onEMI');
				}

				return {
					source: `Applicant ${i + 1} (${a.fullNameOfApplicant})`,
					data,
					lockedFields: locked,
					matchedId: a.id as string
				};
			}
		}

		// 2. Check directors from other companies
		for (const [cId, forms] of Object.entries(directorForms)) {
			if (cId === excludeCompanyId) continue;
			for (let i = 0; i < forms.length; i++) {
				const d = forms[i];
				if (normalizeName(d.fullName) === normalized) {
					const locked: string[] = [];
					const data: Partial<DirectorForm> = {};

					if (d.gender) {
						data.gender = d.gender;
						locked.push('gender');
					}
					if (d.age) {
						data.age = d.age;
						locked.push('age');
					}
					if (d.maritalStatus) {
						data.maritalStatus = d.maritalStatus;
						locked.push('maritalStatus');
					}
					if (d.isNRI) {
						data.isNRI = d.isNRI;
						locked.push('isNRI');
					}

					const companyName = companyApplicants.find((c) => c.id === cId)?.companyName ?? 'Company';
					return {
						source: `${companyName} ${MEMBER_LABEL_MAP[companyApplicants.find((c) => c.id === cId)?.companyType as string] ?? 'Director'} ${i + 1}`,
						data,
						lockedFields: locked
					};
				}
			}
		}

		return null;
	}

	// ── Check for duplicate name within the SAME company ────────────
	// Returns { idx, type } where type is 'exact' or 'prefix' (first 3 chars match)
	function findSameCompanyDuplicate(
		companyId: string,
		idx: number,
		name: string
	): { dupIdx: number; type: 'exact' | 'prefix' } | null {
		const normalized = normalizeName(name);
		if (!normalized || normalized.length < 3) return null;
		const prefix = normalized.substring(0, 3);
		const forms = directorForms[companyId] ?? [];

		for (let i = 0; i < forms.length; i++) {
			if (i === idx) continue;
			const otherNorm = normalizeName(forms[i].fullName);
			if (otherNorm.length < 3) continue;
			if (otherNorm === normalized) return { dupIdx: i, type: 'exact' };
			if (otherNorm.substring(0, 3) === prefix) return { dupIdx: i, type: 'prefix' };
		}
		return null;
	}

	// ── Check if another card has IDENTICAL details (name + gender + age + marital + stake%) ──
	function findAllDetailsMatch(companyId: string, idx: number): { dupIdx: number } | null {
		const d = directorForms[companyId]?.[idx];
		if (!d || !d.fullName.trim()) return null;
		const normalized = normalizeName(d.fullName);
		if (!normalized) return null;
		const forms = directorForms[companyId] ?? [];
		for (let i = 0; i < forms.length; i++) {
			if (i === idx) continue;
			const other = forms[i];
			if (!other.fullName.trim()) continue;
			if (
				normalizeName(other.fullName) === normalized &&
				other.gender === d.gender &&
				other.age === d.age &&
				other.maritalStatus === d.maritalStatus &&
				other.ownershipPercent === d.ownershipPercent
			) {
				return { dupIdx: i };
			}
		}
		return null;
	}

	// ── Handle name blur: check for match, show PROMPT instead of auto-fill ──
	function handleNameBlur(companyId: string, idx: number) {
		const director = directorForms[companyId]?.[idx];
		if (!director) return;
		if (!director.fullName.trim() || director.fullName.trim().length < 3) {
			director.pendingMatch = null;
			if (nameWarnings[companyId]) delete nameWarnings[companyId][idx];
			return;
		}

		// Check for same/similar name within same company — SOFT WARNING only
		const dup = findSameCompanyDuplicate(companyId, idx, director.fullName);
		if (dup) {
			const memberLabel =
				MEMBER_LABEL_MAP[
					companyApplicants.find((c) => c.id === companyId)?.companyType as string
				] ?? 'Director';
			const otherName = directorForms[companyId]?.[dup.dupIdx]?.fullName ?? '';
			if (!nameWarnings[companyId]) nameWarnings[companyId] = {};
			if (dup.type === 'exact') {
				nameWarnings[companyId][idx] =
					`Same name as ${memberLabel} ${dup.dupIdx + 1}. If these are different people, you may continue.`;
			} else {
				nameWarnings[companyId][idx] =
					`Similar name to ${memberLabel} ${dup.dupIdx + 1} (${otherName}). Please ensure these are different people.`;
			}
			director.pendingMatch = null;
			return;
		}

		// Clear same-company name warning
		if (nameWarnings[companyId]?.[idx]) delete nameWarnings[companyId][idx];

		// Don't re-check if already restored from this match
		if (director.restoredFrom) return;

		const match = findNameMatch(director.fullName, companyId, idx);
		if (match) {
			// Show prompt — user must confirm
			director.pendingMatch = match;
		} else {
			director.pendingMatch = null;
		}
	}

	// ── User confirms match: restore fields and lock ──────────────
	function acceptMatch(companyId: string, idx: number) {
		const director = directorForms[companyId]?.[idx];
		if (!director?.pendingMatch) return;

		const match = director.pendingMatch;
		Object.assign(director, match.data);
		// Unsecured loans: force defaults for property-related fields (no property exists)
		if (isUnsecured) {
			director.location = 'same_city';
			director.onProperty = 'false';
		}
		director.restoredFrom = match.source;
		director.lockedFields = match.lockedFields;
		if (match.matchedId) {
			director.id = match.matchedId;
		}
		director.pendingMatch = null;

		// Clear errors for auto-filled fields
		for (const field of match.lockedFields) {
			clearFieldError(companyId, idx, field);
		}
	}

	// ── User rejects match: different person ──────────────────────
	function rejectMatch(companyId: string, idx: number) {
		const director = directorForms[companyId]?.[idx];
		if (!director) return;
		director.pendingMatch = null;
		director.restoredFrom = '';
		director.lockedFields = [];
	}

	// ── Build DirectorInfo from form data ───────────────────────────
	function buildDirectorInfo(
		d: DirectorForm,
		companyId: string,
		role: DirectorInfo['role']
	): DirectorInfo {
		return {
			id: d.id,
			fullName: d.fullName.trim(),
			gender: (d.gender || 'male') as 'male' | 'female',
			age: Number(d.age) || 0,
			maritalStatus: (d.maritalStatus || 'single') as DirectorInfo['maritalStatus'],
			ownershipPercent: Number(d.ownershipPercent) || 0,
			location: (d.location || 'same_city') as DirectorInfo['location'],
			isCoApplicant: isCoApplicantDerived(d),
			isNRI: (d.isNRI || 'No') as 'Yes' | 'No',
			onProperty: d.onProperty === 'true',
			onEMI: d.onEMI === 'true',
			linkedCompanyId: companyId,
			role
		};
	}

	// ── Sync ONE company's directors to formState ───────────────────
	// Updates company.directors[], removes stale linked Individuals,
	// creates/merges ALL directors as Individual entries.
	function syncDirectorsToFormState(companyId: string) {
		const forms = directorForms[companyId] ?? [];
		const company = formState.applicants.find((a) => a.id === companyId);
		if (!company) return;

		const role = ROLE_MAP[company.companyType as string] ?? 'director';
		const directors: DirectorInfo[] = forms.map((d) => buildDirectorInfo(d, companyId, role));

		// 1. Update company's directors
		let result = formState.applicants.map((a) => (a.id === companyId ? { ...a, directors } : a));

		// 2. Remove previously linked Individual entries for this company
		result = result.filter(
			(a) => !(a.linkedCompanyId === companyId && a.applicantType === 'Individual')
		);

		// 3. Add ALL directors as Individual entries (not just co-applicants)
		// Banks need to assess all directors/partners — income, relationships, credit
		for (const d of directors) {
			if (!d.fullName) continue;

			const directorData: Record<string, unknown> = {
				applicantType: 'Individual',
				fullNameOfApplicant: d.fullName,
				gender: d.gender,
				age: String(d.age),
				maritalStatus: d.maritalStatus,
				isApplicantNRI: d.isNRI,
				onProperty: d.onProperty,
				onEMI: d.onEMI,
				isGuarantor: d.isCoApplicant ? 'Yes' : 'No',
				linkedCompanyId: companyId,
				ownershipPercent: d.ownershipPercent,
				directorRole: d.role
			};

			const directorName = normalizeName(d.fullName);
			const existingIdx = result.findIndex((a) => {
				if (a.applicantType !== 'Individual') return false;
				if (a.id === d.id) return true;
				const applicantName = normalizeName((a.fullNameOfApplicant as string) ?? '');
				return applicantName !== '' && applicantName === directorName;
			});

			if (existingIdx >= 0) {
				const existing = result[existingIdx];
				result[existingIdx] = { ...existing, ...directorData, id: existing.id };
				d.id = existing.id as string;
			} else {
				result.push({ id: d.id, ...directorData });
			}
		}

		formState.replaceApplicants(result);
	}

	// ── Batch sync ALL companies (for Next/Previous) ────────────────
	function commitDirectorsToState() {
		let result = [...formState.applicants];

		for (const company of companyApplicants) {
			const companyId = company.id ?? '';
			const forms = directorForms[companyId] ?? [];
			const role = ROLE_MAP[company.companyType as string] ?? 'director';

			const directors: DirectorInfo[] = forms.map((d) => buildDirectorInfo(d, companyId, role));

			// Update company's directors
			const companyIndex = result.findIndex((a) => a.id === companyId);
			if (companyIndex >= 0) {
				result[companyIndex] = { ...result[companyIndex], directors };
			}

			// Remove stale linked entries
			result = result.filter(
				(a) => !(a.linkedCompanyId === companyId && a.applicantType === 'Individual')
			);

			// Add ALL directors as Individual entries
			for (const d of directors) {
				if (!d.fullName) continue;

				const directorData: Record<string, unknown> = {
					applicantType: 'Individual',
					fullNameOfApplicant: d.fullName,
					gender: d.gender,
					age: String(d.age),
					maritalStatus: d.maritalStatus,
					isApplicantNRI: d.isNRI,
					onProperty: d.onProperty,
					onEMI: d.onEMI,
					isGuarantor: d.isCoApplicant ? 'Yes' : 'No',
					linkedCompanyId: companyId,
					ownershipPercent: d.ownershipPercent,
					directorRole: d.role
				};

				const directorName = normalizeName(d.fullName);
				const existingIdx = result.findIndex((a) => {
					if (a.applicantType !== 'Individual') return false;
					if (a.id === d.id) return true;
					const applicantName = normalizeName((a.fullNameOfApplicant as string) ?? '');
					return applicantName !== '' && applicantName === directorName;
				});

				if (existingIdx >= 0) {
					const existing = result[existingIdx];
					result[existingIdx] = { ...existing, ...directorData, id: existing.id };
					d.id = existing.id as string;
				} else {
					result.push({ id: d.id, ...directorData });
				}
			}
		}

		formState.replaceApplicants(result);
	}

	// ── Clear director form ─────────────────────────────────────────
	function clearDirector(companyId: string, idx: number) {
		const director = directorForms[companyId]?.[idx];
		if (!director) return;

		director.id = uuidv4();
		director.fullName = '';
		director.gender = '';
		director.age = '';
		director.maritalStatus = '';
		director.ownershipPercent = '';
		director.location = isUnsecured ? 'same_city' : '';
		director.isNRI = '';
		director.onProperty = isUnsecured ? 'false' : '';
		director.onEMI = isUnsecured ? 'false' : '';
		director.restoredFrom = '';
		director.lockedFields = [];
		director.pendingMatch = null;

		// Clear name warning and force count
		if (nameWarnings[companyId]?.[idx]) delete nameWarnings[companyId][idx];
		if (duplicateForceCount[companyId]?.[idx]) duplicateForceCount[companyId][idx] = 0;

		// Clear errors
		if (errors[companyId]?.[idx]) {
			delete errors[companyId][idx];
		}

		// Remove from confirmed, set as active
		if (confirmedCards[companyId]) confirmedCards[companyId][idx] = false;
		activeCardKey[companyId] = idx;

		// Sync cleared state to formState
		syncDirectorsToFormState(companyId);
	}

	// ── Initialize forms when company applicants change ─────────────
	$effect(() => {
		for (const company of companyApplicants) {
			const companyId = company.id ?? '';
			if (!companyId) continue;

			const directorCount = Number(company.numberOfDirectorsOrPartners) || 1;
			const existing = directorForms[companyId];

			if (!existing || existing.length !== directorCount) {
				const savedDirectors = (company.directors ?? []) as DirectorInfo[];

				const forms: DirectorForm[] = [];
				for (let i = 0; i < directorCount; i++) {
					const saved = savedDirectors[i];
					if (saved && saved.fullName) {
						forms.push({
							id: saved.id,
							fullName: saved.fullName,
							gender: saved.gender,
							age: String(saved.age),
							maritalStatus: saved.maritalStatus ?? '',
							ownershipPercent: String(saved.ownershipPercent),
							location: isUnsecured ? 'same_city' : saved.location,
							isNRI: saved.isNRI ?? '',
							onProperty: isUnsecured
								? 'false'
								: saved.onProperty !== undefined
									? String(saved.onProperty)
									: '',
							onEMI: isUnsecured ? 'false' : (saved.onEMI !== undefined ? String(saved.onEMI) : ''),
							restoredFrom: '',
							lockedFields: [],
							pendingMatch: null
						});
					} else {
						forms.push({
							id: uuidv4(),
							fullName: '',
							gender: '',
							age: '',
							maritalStatus: '',
							ownershipPercent: '',
							location: isUnsecured ? 'same_city' : '',
							isNRI: '',
							onProperty: isUnsecured ? 'false' : '',
							onEMI: isUnsecured ? 'false' : '',
							restoredFrom: '',
							lockedFields: [],
							pendingMatch: null
						});
					}
				}
				directorForms[companyId] = forms;

				// Determine confirmed/active state
				const confirmed: Record<number, boolean> = {};
				let firstNonConfirmed = -1;
				for (let i = 0; i < forms.length; i++) {
					if (isCardComplete(forms[i])) {
						confirmed[i] = true;
					} else if (firstNonConfirmed === -1) {
						firstNonConfirmed = i;
					}
				}
				confirmedCards[companyId] = confirmed;
				activeCardKey[companyId] = firstNonConfirmed;
			}
		}
	});

	// ── Derived: total ownership per company ─────────────────────────
	function getTotalOwnership(companyId: string): number {
		const forms = directorForms[companyId] ?? [];
		return forms.reduce((sum, d) => sum + (Number(d.ownershipPercent) || 0), 0);
	}

	// ── Per-card validation ─────────────────────────────────────────
	function validateSingleCard(companyId: string, idx: number): Record<string, string> {
		const d = directorForms[companyId]?.[idx];
		if (!d) return { fullName: 'Card not found' };

		const fieldErrors: Record<string, string> = {};
		const forms = directorForms[companyId] ?? [];
		const memberLabel =
			MEMBER_LABEL_MAP[companyApplicants.find((c) => c.id === companyId)?.companyType as string] ??
			'Director';

		if (!d.fullName || d.fullName.trim().length < 2)
			fieldErrors['fullName'] = 'Name is required (min 2 characters)';
		if (!d.gender) fieldErrors['gender'] = 'Gender is required';
		if (!d.maritalStatus) fieldErrors['maritalStatus'] = 'Marital status is required';
		const age = Number(d.age);
		if (!d.age || isNaN(age) || age < 18 || age > 80) fieldErrors['age'] = 'Age must be 18-80';
		const stake = Number(d.ownershipPercent);
		if (!d.ownershipPercent || isNaN(stake) || stake < 1 || stake > 100)
			fieldErrors['ownershipPercent'] = 'Stake must be 1-100%';
		if (!isUnsecured && !d.location) fieldErrors['location'] = 'Location is required';
		if (!d.isNRI) fieldErrors['isNRI'] = 'NRI status is required';
		if (!isUnsecured && !d.onProperty) fieldErrors['onProperty'] = 'Required';
		if (!isUnsecured && !d.onEMI) fieldErrors['onEMI'] = 'Required';

		// ── All-details duplicate: same name + gender + age + marital + stake% ──
		if (
			!fieldErrors['fullName'] &&
			d.fullName.trim().length >= 2 &&
			d.gender &&
			d.age &&
			d.maritalStatus &&
			d.ownershipPercent
		) {
			const allMatch = findAllDetailsMatch(companyId, idx);
			if (allMatch) {
				fieldErrors['_allDetailsMatch'] =
					`${memberLabel} ${idx + 1} has identical details to ${memberLabel} ${allMatch.dupIdx + 1} (${forms[allMatch.dupIdx]?.fullName}). Name, gender, age, marital status, and ownership % are all the same.`;
			}
		}

		return fieldErrors;
	}

	// ── Confirm a single card ───────────────────────────────────────
	function confirmCard(companyId: string, idx: number): boolean {
		const cardErrors = validateSingleCard(companyId, idx);

		// Separate all-details-match from field-level errors
		const allDetailsError = cardErrors['_allDetailsMatch'];
		const otherErrors = { ...cardErrors };
		delete otherErrors['_allDetailsMatch'];

		// If there are field-level errors, show everything and stop
		if (Object.keys(otherErrors).length > 0) {
			if (!errors[companyId]) errors[companyId] = {};
			errors[companyId][idx] = cardErrors;
			return false;
		}

		// Handle all-details-match: 2-stage confirmation
		if (allDetailsError) {
			if (!duplicateForceCount[companyId]) duplicateForceCount[companyId] = {};
			const count = duplicateForceCount[companyId][idx] ?? 0;

			if (count === 0) {
				// First attempt — show warning, ask user to confirm again
				duplicateForceCount[companyId][idx] = 1;
				if (!errors[companyId]) errors[companyId] = {};
				errors[companyId][idx] = { _allDetailsMatch: allDetailsError };
				return false;
			} else {
				// Second attempt — append identifier suffix to distinguish
				const director = directorForms[companyId]?.[idx];
				if (director) {
					const label = (
						MEMBER_LABEL_MAP[
							companyApplicants.find((c) => c.id === companyId)?.companyType as string
						] ?? 'Director'
					).toLowerCase();
					director.fullName = `${director.fullName.trim()}_${label}${String(idx + 1).padStart(2, '0')}`;
				}
				duplicateForceCount[companyId][idx] = 0;
			}
		}

		// Clear errors
		if (errors[companyId]?.[idx]) {
			delete errors[companyId][idx];
		}

		// Mark confirmed
		if (!confirmedCards[companyId]) confirmedCards[companyId] = {};
		confirmedCards[companyId][idx] = true;

		// Sync to formState immediately
		syncDirectorsToFormState(companyId);

		// Auto-advance to next non-confirmed card
		const forms = directorForms[companyId] ?? [];
		let nextIdx = -1;
		for (let i = 0; i < forms.length; i++) {
			if (i !== idx && !confirmedCards[companyId]?.[i]) {
				nextIdx = i;
				break;
			}
		}
		activeCardKey[companyId] = nextIdx;

		return true;
	}

	// ── Edit a confirmed card ──────────────────────────────────────
	function editCard(companyId: string, idx: number) {
		// If another card is active and has complete data, auto-confirm it
		const currentActive = activeCardKey[companyId] ?? -1;
		if (currentActive >= 0 && currentActive !== idx) {
			const d = directorForms[companyId]?.[currentActive];
			if (d && isCardComplete(d)) {
				if (!confirmedCards[companyId]) confirmedCards[companyId] = {};
				confirmedCards[companyId][currentActive] = true;
				syncDirectorsToFormState(companyId);
			}
		}

		// Open this card for editing
		activeCardKey[companyId] = idx;
		if (confirmedCards[companyId]) confirmedCards[companyId][idx] = false;
	}

	// ── Field error getter ─────────────────────────────────────────
	function getError(companyId: string, idx: number, field: string): string {
		return errors[companyId]?.[idx]?.[field] ?? '';
	}

	// ── Page-level: validate all + save (called by Next button) ──────
	export function validateStep(): boolean {
		let allValid = true;
		const newGlobalErrors: Record<string, string> = {};

		for (const company of companyApplicants) {
			const companyId = company.id ?? '';
			const forms = directorForms[companyId] ?? [];

			// Try to confirm the active card if one exists
			const activeIdx = activeCardKey[companyId] ?? -1;
			if (activeIdx >= 0) {
				if (!confirmCard(companyId, activeIdx)) {
					allValid = false;
					continue; // Focus on this company's error
				}
			}

			// Check all cards are confirmed
			for (let i = 0; i < forms.length; i++) {
				if (!confirmedCards[companyId]?.[i]) {
					activeCardKey[companyId] = i;
					allValid = false;
					break;
				}
			}

			if (!allValid) continue;

			// Ownership > 100 check
			const totalStake = getTotalOwnership(companyId);
			if (totalStake > 100) {
				newGlobalErrors[companyId] =
					`Total ownership exceeds 100% (currently ${totalStake}%). Please correct.`;
				allValid = false;
			}
		}

		globalErrors = newGlobalErrors;

		if (allValid) {
			commitDirectorsToState();
			isNextEnabled = true;
		} else {
			isNextEnabled = false;
		}

		return allValid;
	}

	/** Save without validation — used when navigating Previous */
	export function saveSilent(): void {
		const hasSomeData = Object.values(directorForms).some((forms) =>
			forms.some((d) => d.fullName.trim().length > 0)
		);
		if (hasSomeData) {
			commitDirectorsToState();
		}
	}
</script>

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- DIRECTOR CARDS — Step 0.5 (Accordion)                              -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<div class="flex flex-col gap-8 pb-4">
	<!-- Section Header -->
	<div class="flex items-start gap-3">
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-100 to-neutral-100 dark:from-stone-800 dark:to-neutral-800"
		>
			<Users class="h-5 w-5 text-stone-600 dark:text-stone-400" />
		</div>
		<div class="flex-1">
			<h3 class="sectionHeadingText font-semibold text-gray-800 dark:text-gray-100">
				Director & Partner Details
			</h3>
			<p class="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
				Fill in details for each member one at a time. Confirm each entry before moving to the next.
				{isUnsecured ? 'Provide basic profile details for each member.' : 'Those on property or EMI will automatically become co-applicants.'}
			</p>
		</div>
	</div>

	<!-- Per-company director blocks -->
	{#each companyApplicants as company (company.id)}
		{@const companyId = company.id ?? ''}
		{@const companyType = company.companyType as string}
		{@const memberLabel = MEMBER_LABEL_MAP[companyType] ?? 'Director'}
		{@const forms = directorForms[companyId] ?? []}
		{@const totalOwnership = getTotalOwnership(companyId)}
		{@const allConfirmed =
			forms.length > 0 && forms.every((_, i) => confirmedCards[companyId]?.[i])}

		<div
			class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 dark:border-gray-700 dark:bg-gray-800/50"
		>
			<!-- Company heading -->
			<div class="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-900/40"
				>
					<Building2 class="h-4 w-4 text-stone-600 dark:text-stone-400" />
				</div>
				<div class="flex-1">
					<h4 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
						{memberLabel}s of {company.companyName ?? 'Company'}
					</h4>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{forms.length}
						{memberLabel.toLowerCase()}{forms.length > 1 ? 's' : ''} to fill
					</p>
				</div>
				{#if allConfirmed}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
					>
						<Check class="h-3 w-3" />
						All confirmed
					</span>
				{/if}
			</div>

			<!-- Director cards -->
			<div class="flex flex-col gap-3">
				{#each forms as director, idx}
					{@const cardState = getCardState(companyId, idx)}
					{@const isCo = isCoApplicantDerived(director)}
					{@const hasErrors =
						errors[companyId]?.[idx] && Object.keys(errors[companyId][idx]).length > 0}

					{#if cardState === 'confirmed'}
						<!-- ═══ CONFIRMED: Compact summary ═══ -->
						<div
							class="director-card confirmed rounded-xl border p-3
								{isCo
								? 'border-green-200 bg-green-50/30 dark:border-green-800/40 dark:bg-green-900/10'
								: 'border-gray-200 bg-gray-50/50 dark:border-gray-600 dark:bg-gray-700/30'}"
						>
							<!-- Header row -->
							<div class="flex items-center justify-between gap-2">
								<div class="flex min-w-0 items-center gap-2">
									<div
										class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
										{isCo
											? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
											: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}
										text-xs font-bold"
									>
										{idx + 1}
									</div>
									<span class="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
										{director.fullName}
									</span>
									<span class="shrink-0 text-xs text-gray-500 dark:text-gray-400"
										>{director.ownershipPercent}%</span
									>
								</div>

								<div class="flex shrink-0 items-center gap-1.5">
									{#if isCo}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
										>
											<Check class="h-2.5 w-2.5" />
											{director.onEMI === 'true' ? 'Co-applicant' : 'Collateral'}
										</span>
									{:else if !isUnsecured && director.onProperty === 'false' && director.onEMI === 'false'}
										<span
											class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
										>
											Not on loan
										</span>
									{/if}
									<button
										type="button"
										onclick={() => editCard(companyId, idx)}
										class="rounded px-1.5 py-0.5 text-[11px] font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
									>
										Edit
									</button>
									<button
										type="button"
										onclick={() => clearDirector(companyId, idx)}
										class="rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
									>
										Clear
									</button>
								</div>
							</div>

							<!-- Detail chips -->
							<div class="mt-2 flex flex-wrap gap-1.5 pl-8">
								<span class="summary-chip">{GENDER_LABEL[director.gender] ?? director.gender}</span>
								<span class="summary-chip">Age {director.age}</span>
								<span class="summary-chip"
									>{MARITAL_LABEL[director.maritalStatus] ?? director.maritalStatus}</span
								>
								{#if !isUnsecured}
									<span class="summary-chip"
										>{LOCATION_LABEL[director.location] ?? director.location}</span
									>
								{/if}
								<span class="summary-chip">{director.isNRI === 'Yes' ? 'NRI' : 'Not NRI'}</span>
								{#if director.onProperty === 'true'}
									<span class="summary-chip-active">Property</span>
								{/if}
								{#if !isUnsecured && director.onEMI === 'true'}
									<span class="summary-chip-active">EMI</span>
								{/if}
							</div>

							<!-- Restored indicator on summary -->
							{#if director.restoredFrom}
								<div class="mt-1.5 flex items-center gap-1 pl-8">
									<Lock class="h-2.5 w-2.5 text-blue-400" />
									<span class="text-[10px] text-blue-500 dark:text-blue-400"
										>Linked to {director.restoredFrom}</span
									>
								</div>
							{/if}
						</div>
					{:else if cardState === 'active'}
						<!-- ═══ ACTIVE: Full form ═══ -->
						<div
							class="director-card active rounded-xl border border-stone-300 p-4 dark:border-stone-600"
							class:border-red-300={hasErrors}
							class:dark:border-red-700={hasErrors}
						>
							<!-- Card header -->
							<div class="mb-3 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div
										class="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-700 dark:bg-stone-700 dark:text-stone-200"
									>
										{idx + 1}
									</div>
									<span class="text-sm font-medium text-gray-700 dark:text-gray-200">
										{memberLabel}
										{idx + 1}
									</span>
								</div>

								<div class="flex items-center gap-2">
									{#if isCo}
										<span
											class="inline-flex items-center gap-1 rounded-full {director.onEMI === 'true'
												? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
												: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'} px-2.5 py-1 text-xs font-semibold"
										>
											<Check class="h-3 w-3" />
											{director.onEMI === 'true' ? 'Co-applicant on loan' : 'Collateral only'}
										</span>
									{:else if !isUnsecured && director.onProperty === 'false' && director.onEMI === 'false'}
										<span
											class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
										>
											Not on loan
										</span>
									{/if}

									<!-- Clear button -->
									{#if director.fullName || director.gender || director.age}
										<button
											type="button"
											onclick={() => clearDirector(companyId, idx)}
											class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-500
												transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600
												dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:border-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
											title="Clear all fields for this {memberLabel.toLowerCase()}"
										>
											<RotateCcw class="h-3 w-3" />
											Clear
										</button>
									{/if}
								</div>
							</div>

							<!-- Pending match prompt -->
							{#if director.pendingMatch}
								<div
									class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20"
								>
									<p class="text-xs font-medium text-amber-800 dark:text-amber-300">
										Match found: "{director.fullName}" exists as {director.pendingMatch.source}
									</p>
									<p class="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
										Is this the same person? Restoring will fill in their known details.
									</p>
									<div class="mt-2 flex gap-2">
										<button
											type="button"
											onclick={() => acceptMatch(companyId, idx)}
											class="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700"
										>
											Yes, restore details
										</button>
										<button
											type="button"
											onclick={() => rejectMatch(companyId, idx)}
											class="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-600 dark:bg-transparent dark:text-amber-400 dark:hover:bg-amber-900/30"
										>
											No, different person
										</button>
									</div>
								</div>
							{/if}

							<!-- Restored badge -->
							{#if director.restoredFrom}
								<div
									class="mb-3 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-800 dark:bg-blue-900/20"
								>
									<Lock class="h-3 w-3 text-blue-500" />
									<span class="text-xs font-medium text-blue-700 dark:text-blue-400">
										Details restored from {director.restoredFrom}
									</span>
								</div>
							{/if}

							<!-- Row 1: Name, Gender, Age -->
							<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
								<!-- Full Name -->
								<div class="col-span-2 md:col-span-1">
									<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
										Full Name *
									</label>
									<input
										type="text"
										bind:value={director.fullName}
										placeholder="Enter full name"
										maxlength={50}
										class="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{getError(companyId, idx, 'fullName') ? 'border-red-400 dark:border-red-600' : ''}"
										oninput={(e) => {
											const input = e.target as HTMLInputElement;
											input.value = input.value.replace(/[^a-zA-Z\s]/g, '');
											director.fullName = input.value;
											clearFieldError(companyId, idx, 'fullName');
											// Clear name warning
											if (nameWarnings[companyId]?.[idx]) delete nameWarnings[companyId][idx];
											// Clear pending match if name changes
											if (director.pendingMatch) director.pendingMatch = null;
											if (director.restoredFrom) {
												director.restoredFrom = '';
												director.lockedFields = [];
											}
										}}
										onblur={() => handleNameBlur(companyId, idx)}
									/>
									{#if getError(companyId, idx, 'fullName')}
										<p class="mt-0.5 text-xs text-red-500">
											{getError(companyId, idx, 'fullName')}
										</p>
									{:else if nameWarnings[companyId]?.[idx]}
										<p class="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
											{nameWarnings[companyId][idx]}
										</p>
									{/if}
								</div>

								<!-- Gender -->
								<div class="col-span-1">
									<label
										class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400"
									>
										Gender *
										{#if isLocked(director, 'gender')}<Lock
												class="h-2.5 w-2.5 text-blue-400"
											/>{/if}
									</label>
									<select
										bind:value={director.gender}
										disabled={isLocked(director, 'gender')}
										onchange={() => clearFieldError(companyId, idx, 'gender')}
										class="form-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{isLocked(director, 'gender')
											? 'cursor-not-allowed !bg-gray-100 !text-gray-500 dark:!bg-gray-800 dark:!text-gray-500'
											: ''}
											{getError(companyId, idx, 'gender') ? 'border-red-400 dark:border-red-600' : ''}"
									>
										<option value="">Select</option>
										<option value="male">Male</option>
										<option value="female">Female</option>
									</select>
									{#if getError(companyId, idx, 'gender')}
										<p class="mt-0.5 text-xs text-red-500">{getError(companyId, idx, 'gender')}</p>
									{/if}
								</div>

								<!-- Age -->
								<div class="col-span-1">
									<label
										class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400"
									>
										Age *
										{#if isLocked(director, 'age')}<Lock class="h-2.5 w-2.5 text-blue-400" />{/if}
									</label>
									<input
										type="text"
										bind:value={director.age}
										placeholder="Age"
										maxlength={2}
										readonly={isLocked(director, 'age')}
										class="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{isLocked(director, 'age')
											? 'cursor-not-allowed !bg-gray-100 !text-gray-500 dark:!bg-gray-800 dark:!text-gray-500'
											: ''}
											{getError(companyId, idx, 'age') ? 'border-red-400 dark:border-red-600' : ''}"
										oninput={(e) => {
											const input = e.target as HTMLInputElement;
											input.value = input.value.replace(/[^0-9]/g, '');
											director.age = input.value;
											clearFieldError(companyId, idx, 'age');
										}}
									/>
									{#if getError(companyId, idx, 'age')}
										<p class="mt-0.5 text-xs text-red-500">{getError(companyId, idx, 'age')}</p>
									{/if}
								</div>
							</div>

							<!-- Row 2: Ownership, Location, Marital Status -->
							<div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
								<!-- Ownership % -->
								<div class="col-span-1">
									<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
										Ownership % *
									</label>
									<input
										type="text"
										bind:value={director.ownershipPercent}
										placeholder="%"
										maxlength={3}
										class="form-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{getError(companyId, idx, 'ownershipPercent') ? 'border-red-400 dark:border-red-600' : ''}"
										oninput={(e) => {
											const input = e.target as HTMLInputElement;
											input.value = input.value.replace(/[^0-9]/g, '');
											director.ownershipPercent = input.value;
											clearFieldError(companyId, idx, 'ownershipPercent');
										}}
									/>
									{#if getError(companyId, idx, 'ownershipPercent')}
										<p class="mt-0.5 text-xs text-red-500">
											{getError(companyId, idx, 'ownershipPercent')}
										</p>
									{/if}
								</div>

								<!-- Location (hidden for unsecured loans — auto-set to same_city) -->
								{#if !isUnsecured}
									<div class="col-span-1">
										<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
											Location *
										</label>
										<select
											bind:value={director.location}
											onchange={() => clearFieldError(companyId, idx, 'location')}
											class="form-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{getError(companyId, idx, 'location') ? 'border-red-400 dark:border-red-600' : ''}"
										>
											<option value="">Select</option>
											<option value="same_city">Same city</option>
											<option value="same_state">Same state</option>
											<option value="different_state">Different state</option>
										</select>
										{#if getError(companyId, idx, 'location')}
											<p class="mt-0.5 text-xs text-red-500">
												{getError(companyId, idx, 'location')}
											</p>
										{/if}
									</div>
								{/if}

								<!-- Marital Status -->
								<div class="col-span-1">
									<label
										class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400"
									>
										Marital Status *
										{#if isLocked(director, 'maritalStatus')}<Lock
												class="h-2.5 w-2.5 text-blue-400"
											/>{/if}
									</label>
									<select
										bind:value={director.maritalStatus}
										disabled={isLocked(director, 'maritalStatus')}
										onchange={() => clearFieldError(companyId, idx, 'maritalStatus')}
										class="form-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{isLocked(director, 'maritalStatus')
											? 'cursor-not-allowed !bg-gray-100 !text-gray-500 dark:!bg-gray-800 dark:!text-gray-500'
											: ''}
											{getError(companyId, idx, 'maritalStatus') ? 'border-red-400 dark:border-red-600' : ''}"
									>
										<option value="">Select</option>
										<option value="single">Single</option>
										<option value="married">Married</option>
										<option value="divorced">Divorced</option>
										<option value="separated">Separated</option>
										<option value="widowed">Widowed</option>
									</select>
									{#if getError(companyId, idx, 'maritalStatus')}
										<p class="mt-0.5 text-xs text-red-500">
											{getError(companyId, idx, 'maritalStatus')}
										</p>
									{/if}
								</div>

								<!-- NRI (shown in Row 2 for unsecured — cleaner layout with 3 fields) -->
								{#if isUnsecured}
								<div class="col-span-1">
									<label
										class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400"
									>
										Is NRI? *
										{#if isLocked(director, 'isNRI')}<Lock class="h-2.5 w-2.5 text-blue-400" />{/if}
									</label>
									<select
										bind:value={director.isNRI}
										disabled={isLocked(director, 'isNRI')}
										onchange={() => clearFieldError(companyId, idx, 'isNRI')}
										class="form-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{isLocked(director, 'isNRI')
											? 'cursor-not-allowed !bg-gray-100 !text-gray-500 dark:!bg-gray-800 dark:!text-gray-500'
											: ''}
											{getError(companyId, idx, 'isNRI') ? 'border-red-400 dark:border-red-600' : ''}"
									>
										<option value="">Select</option>
										<option value="No">No</option>
										<option value="Yes">Yes</option>
									</select>
									{#if getError(companyId, idx, 'isNRI')}
										<p class="mt-0.5 text-xs text-red-500">{getError(companyId, idx, 'isNRI')}</p>
									{/if}
								</div>
								{/if}
							</div>

							<!-- Row 3: isNRI, On Property, On EMI (hidden entirely for unsecured — fields moved to Row 2) -->
							{#if !isUnsecured}
							<div class="mt-3 grid grid-cols-3 gap-3">
								<!-- Is NRI? -->
								<div class="col-span-1">
									<label
										class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400"
									>
										Is NRI? *
										{#if isLocked(director, 'isNRI')}<Lock class="h-2.5 w-2.5 text-blue-400" />{/if}
									</label>
									<select
										bind:value={director.isNRI}
										disabled={isLocked(director, 'isNRI')}
										onchange={() => clearFieldError(companyId, idx, 'isNRI')}
										class="form-select w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800
											focus:border-stone-500 focus:ring-1 focus:ring-stone-500
											dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
											{isLocked(director, 'isNRI')
											? 'cursor-not-allowed !bg-gray-100 !text-gray-500 dark:!bg-gray-800 dark:!text-gray-500'
											: ''}
											{getError(companyId, idx, 'isNRI') ? 'border-red-400 dark:border-red-600' : ''}"
									>
										<option value="">Select</option>
										<option value="No">No</option>
										<option value="Yes">Yes</option>
									</select>
									{#if getError(companyId, idx, 'isNRI')}
										<p class="mt-0.5 text-xs text-red-500">{getError(companyId, idx, 'isNRI')}</p>
									{/if}
								</div>

								<!-- On Property? -->
								<div class="col-span-1">
									<label
										class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400"
									>
										On Property? *
										{#if isLocked(director, 'onProperty')}<Lock
												class="h-2.5 w-2.5 text-blue-400"
											/>{/if}
									</label>
									<select
										bind:value={director.onProperty}
										disabled={isLocked(director, 'onProperty')}
										onchange={() => clearFieldError(companyId, idx, 'onProperty')}
										class="form-select w-full rounded-lg border px-3 py-2 text-sm
											focus:ring-1 focus:ring-stone-500
											dark:bg-gray-700 dark:text-gray-100
											{isLocked(director, 'onProperty')
											? 'cursor-not-allowed border-gray-300 !bg-gray-100 !text-gray-500 dark:border-gray-600 dark:!bg-gray-800 dark:!text-gray-500'
											: director.onProperty === 'true'
												? 'border-green-400 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300'
												: getError(companyId, idx, 'onProperty')
													? 'border-red-400 text-gray-800 dark:border-red-600'
													: 'border-gray-300 text-gray-800 dark:border-gray-600'}"
									>
										<option value="">Select</option>
										<option value="true">Yes</option>
										<option value="false">No</option>
									</select>
									{#if getError(companyId, idx, 'onProperty')}
										<p class="mt-0.5 text-xs text-red-500">
											{getError(companyId, idx, 'onProperty')}
										</p>
									{/if}
								</div>

								<!-- Will Pay EMI? -->
								<div class="col-span-1">
									<label
										class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400"
									>
										Will Pay EMI? *
										{#if isLocked(director, 'onEMI')}<Lock class="h-2.5 w-2.5 text-blue-400" />{/if}
									</label>
									<select
										bind:value={director.onEMI}
										disabled={isLocked(director, 'onEMI')}
										onchange={() => clearFieldError(companyId, idx, 'onEMI')}
										class="form-select w-full rounded-lg border px-3 py-2 text-sm
											focus:ring-1 focus:ring-stone-500
											dark:bg-gray-700 dark:text-gray-100
											{isLocked(director, 'onEMI')
											? 'cursor-not-allowed border-gray-300 !bg-gray-100 !text-gray-500 dark:border-gray-600 dark:!bg-gray-800 dark:!text-gray-500'
											: director.onEMI === 'true'
												? 'border-green-400 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300'
												: getError(companyId, idx, 'onEMI')
													? 'border-red-400 text-gray-800 dark:border-red-600'
													: 'border-gray-300 text-gray-800 dark:border-gray-600'}"
									>
										<option value="">Select</option>
										<option value="true">Yes</option>
										<option value="false">No</option>
									</select>
									{#if getError(companyId, idx, 'onEMI')}
										<p class="mt-0.5 text-xs text-red-500">{getError(companyId, idx, 'onEMI')}</p>
									{/if}
								</div>
							</div>
							{/if}

							<!-- All-details-match: force-confirm prompt -->
							{#if getError(companyId, idx, '_allDetailsMatch')}
								<div
									class="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20"
								>
									<div class="flex items-center gap-2">
										<AlertCircle class="h-4 w-4 shrink-0 text-amber-500" />
										<span class="text-xs font-medium text-amber-700 dark:text-amber-400"
											>{getError(companyId, idx, '_allDetailsMatch')}</span
										>
									</div>
									<p class="mt-1.5 pl-6 text-[11px] text-amber-600 dark:text-amber-500">
										If these are truly different people, click <strong>Confirm</strong> again — a suffix
										will be added to the name for identification.
									</p>
								</div>
							{/if}

							<!-- Confirm button -->
							<div class="mt-4 flex justify-end">
								<button
									type="button"
									onclick={() => confirmCard(companyId, idx)}
									class="inline-flex items-center gap-1.5 rounded-lg bg-stone-700 px-4 py-2 text-xs font-semibold text-white
										transition-colors hover:bg-stone-800
										dark:bg-stone-600 dark:hover:bg-stone-500"
								>
									<Check class="h-3.5 w-3.5" />
									Confirm {memberLabel}
									{idx + 1}
								</button>
							</div>
						</div>
					{:else}
						<!-- ═══ WAITING: Placeholder ═══ -->
						<div
							class="director-card waiting rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700"
						>
							<div class="flex items-center gap-2 opacity-40">
								<div
									class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400 dark:bg-gray-800 dark:text-gray-600"
								>
									{idx + 1}
								</div>
								<span class="text-sm text-gray-400 dark:text-gray-600">
									{memberLabel}
									{idx + 1}
								</span>
								<span class="text-xs text-gray-400 italic dark:text-gray-600">
									— complete previous first
								</span>
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<!-- Ownership summary -->
			<div
				class="mt-4 flex items-center justify-between rounded-lg border px-4 py-2.5
				{totalOwnership > 100
					? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
					: 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900/20'}"
			>
				<div class="flex items-center gap-2">
					<Percent
						class="h-4 w-4 {totalOwnership > 100
							? 'text-red-500'
							: 'text-stone-600 dark:text-stone-400'}"
					/>
					<span
						class="text-sm font-medium {totalOwnership > 100
							? 'text-red-700 dark:text-red-400'
							: 'text-stone-700 dark:text-stone-300'}"
					>
						{totalOwnership}% of ownership accounted for
					</span>
				</div>
				{#if totalOwnership === 100}
					<Check class="h-4 w-4 text-green-600" />
				{/if}
			</div>

			<!-- Global error for this company -->
			{#if globalErrors[companyId]}
				<div
					class="mt-3 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 dark:border-red-700 dark:bg-red-900/20"
				>
					<AlertCircle class="h-4 w-4 shrink-0 text-red-500" />
					<span class="text-sm text-red-700 dark:text-red-400">{globalErrors[companyId]}</span>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.director-card.active {
		background: linear-gradient(135deg, #fafaf9 0%, white 100%);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	:global(.dark) .director-card.active {
		background: linear-gradient(135deg, rgba(41, 37, 36, 0.5) 0%, rgba(31, 41, 55, 0.5) 100%);
	}

	.director-card.active:focus-within {
		border-color: var(--ddsa-primary-400, #b97550);
		box-shadow: 0 0 0 3px rgba(185, 117, 80, 0.1);
	}

	.director-card.confirmed {
		transition: border-color 0.2s;
	}

	.director-card.waiting {
		transition: opacity 0.2s;
	}

	.summary-chip {
		display: inline-flex;
		align-items: center;
		border-radius: 9999px;
		padding: 1px 8px;
		font-size: 10px;
		font-weight: 500;
		background-color: #f5f5f4;
		color: #57534e;
	}

	:global(.dark) .summary-chip {
		background-color: rgba(68, 64, 60, 0.4);
		color: #a8a29e;
	}

	.summary-chip-active {
		display: inline-flex;
		align-items: center;
		border-radius: 9999px;
		padding: 1px 8px;
		font-size: 10px;
		font-weight: 600;
		background-color: #dcfce7;
		color: #15803d;
	}

	:global(.dark) .summary-chip-active {
		background-color: rgba(22, 101, 52, 0.2);
		color: #4ade80;
	}
</style>
