/**
 * directorFormUtils.ts — Pure utility functions for director/partner form management
 * ═══════════════════════════════════════════════════════════════════
 * Extracted from DirectorCards.svelte to enable reuse across
 * AddApplicantBusiness, AddApplicantProfessional, and DirectorFormModal.
 * ═══════════════════════════════════════════════════════════════════
 */

import { v4 as uuidv4 } from 'uuid';
import type { DirectorInfo, DirectorDesignation } from '$lib/types/form';
import { STAKE_FULL_FINANCIALS_THRESHOLD } from '$lib/utils/applicantRoleUtils';

// ── Interfaces ───────────────────────────────────────────────────

export interface MatchInfo {
	source: string;
	data: Partial<DirectorForm>;
	lockedFields: string[];
	matchedId?: string;
	matchType?: 'crossCompany' | 'live' | 'recovery';
}

/** Loan role for directors in unsecured loans (PvtLtd/OPC only) */
export type DirectorLoanRole = '' | 'co_borrower' | 'guarantor' | 'information_only';

/** Cross-company match confirmation state */
export interface CrossCompanyMatchState {
	/** true = confirmed same person, false = confirmed different person */
	confirmed: boolean;
	/** The company ID where the match was found */
	matchedCompanyId: string;
	/** The director ID in the matched company */
	matchedDirectorId: string;
}

export interface DirectorForm {
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
	/** Designation within the company (e.g., Managing Director for OPC) */
	designation: DirectorDesignation;
	/** Role in this loan — only used for PvtLtd/OPC directors in unsecured loans */
	loanRole: DirectorLoanRole;
	restoredFrom: string;
	lockedFields: string[];
	pendingMatch: MatchInfo | null;
	/** Cross-company match confirmation (same-person or different-person) */
	crossCompanyMatch?: CrossCompanyMatchState;
}

// ── Stake Validation Rules ───────────────────────────────────────

/**
 * Entity-specific stake validation:
 *   exact_100  — Partnership/LLP: partners must own exactly 100% combined
 *   max_100    — PvtLtd/OPC: directors can own up to 100% (minority stakes allowed)
 */
export type StakeValidationRule = 'exact_100' | 'max_100';

export const STAKE_VALIDATION_RULES: Record<string, StakeValidationRule> = {
	'Partnership Firm': 'exact_100',
	LLP: 'exact_100',
	'Private Limited': 'max_100',
	'One Person Company (OPC)': 'max_100'
};

/** Get stake validation rule for a company type. Defaults to max_100 for unknown types. */
export function getStakeValidationRule(companyType: string): StakeValidationRule {
	return STAKE_VALIDATION_RULES[companyType] ?? 'max_100';
}

// ── Minimum Director/Partner Counts ─────────────────────────────

/** Minimum number of directors/partners required by Indian company law */
export const MIN_DIRECTORS: Record<string, number> = {
	'Partnership Firm': 2,
	LLP: 2,
	'Private Limited': 2,
	'One Person Company (OPC)': 1
};

/** Get minimum director count for a company type. Defaults to 2 for unknown types. */
export function getMinDirectors(companyType: string): number {
	return MIN_DIRECTORS[companyType] ?? 2;
}

// ── Constants ────────────────────────────────────────────────────

export const MEMBER_LABEL_MAP: Record<string, string> = {
	'Partnership Firm': 'Partner',
	LLP: 'Partner',
	'Private Limited': 'Director',
	'One Person Company (OPC)': 'Director'
};

export const ROLE_MAP: Record<string, DirectorInfo['role']> = {
	'Partnership Firm': 'partner',
	LLP: 'partner',
	'Private Limited': 'director',
	'One Person Company (OPC)': 'director'
};

/** Default designation for OPC directors — sole director is always Managing Director */
export const OPC_DESIGNATION: DirectorDesignation = 'managing_director';

/**
 * Allowed designations per company type.
 * Single-option entries (OPC, Partnership, LLP) are auto-set and rendered read-only.
 * Private Limited has two options (Managing Director or Director) and stays as a dropdown.
 */
export const DESIGNATION_BY_COMPANY: Record<string, DirectorDesignation[]> = {
	'One Person Company (OPC)': ['managing_director'],
	'Private Limited': ['managing_director', 'director'],
	'Partnership Firm': ['partner'],
	LLP: ['designated_partner']
};

export const DESIGNATION_LABEL: Record<string, string> = {
	managing_director: 'Managing Director',
	director: 'Director',
	partner: 'Partner',
	designated_partner: 'Designated Partner'
};

/**
 * Returns the auto-assignable designation for a company type when only one is valid,
 * or '' when the user must choose (Private Limited) or company type is unknown.
 */
export function getAutoDesignation(companyType: string): DirectorDesignation {
	const allowed = DESIGNATION_BY_COMPANY[companyType] ?? [];
	return allowed.length === 1 ? allowed[0] : '';
}

/**
 * Returns a sensible default designation for company types with multiple allowed
 * designations (currently only Private Limited: MD vs Director). Used to pre-fill
 * the dropdown so the field reads as clearly interactive — most Pvt Ltd
 * stakeholders are 'Director'; only one is typically the Managing Director.
 *
 * Returns '' for company types with a single allowed designation (those are
 * handled by getAutoDesignation as locked auto-set values).
 */
export function getDefaultDesignation(companyType: string): DirectorDesignation {
	const allowed = DESIGNATION_BY_COMPANY[companyType] ?? [];
	if (allowed.length <= 1) return '';
	return allowed.includes('director' as DirectorDesignation)
		? ('director' as DirectorDesignation)
		: allowed[0];
}

export const GENDER_LABEL: Record<string, string> = { male: 'Male', female: 'Female' };
export const MARITAL_LABEL: Record<string, string> = {
	single: 'Single',
	married: 'Married',
	divorced: 'Divorced',
	separated: 'Separated',
	widowed: 'Widowed'
};

// ── Helpers ──────────────────────────────────────────────────────

export function normalizeName(name: string): string {
	return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Borrowing-firm declaration check — Partnership/LLP loan rule.
 *
 * For a Business Loan where the entity type is Partnership Firm or LLP,
 * at least one Individual applicant linked to the Company applicant MUST
 * declare partner income from the borrowing firm itself. Other directors
 * can list other firms or foreign companies — that's fine. The rule is
 * just "at least one must own the firm being borrowed for."
 *
 * Returns `valid: true` (silently) when:
 *   - companyName is empty (nothing to check yet)
 *   - no linked Individuals yet (Add Partners step not done)
 * — these are not error states, just "validation not applicable yet."
 *
 * Spec: docs/specs/DIRECTOR-FIRM-NAME-SPEC.md §6
 */
export interface BorrowingFirmCheckResult {
	valid: boolean;
	/** Display names of partners who have NOT declared the borrowing firm. Empty when valid. */
	missingDirectorNames: string[];
}

interface BorrowingFirmIncomeEntry {
	profileType?: string;
	entityName?: string;
}

interface BorrowingFirmApplicant {
	id?: string;
	applicantType?: string;
	fullName?: string;
	linkedCompanyIds?: string[];
	incomeEntries?: BorrowingFirmIncomeEntry[];
}

export function checkBorrowingFirmDeclaration(
	companyName: string,
	companyId: string,
	applicants: readonly BorrowingFirmApplicant[]
): BorrowingFirmCheckResult {
	const normalizedFirm = normalizeName(companyName);
	if (!normalizedFirm) return { valid: true, missingDirectorNames: [] };

	const linkedIndividuals = applicants.filter(
		(a) =>
			a.applicantType === 'Individual' &&
			Array.isArray(a.linkedCompanyIds) &&
			a.linkedCompanyIds.includes(companyId)
	);

	if (linkedIndividuals.length === 0) {
		// No partners added yet — validation not applicable. Don't surface
		// an error before the DSA has had a chance to add anyone.
		return { valid: true, missingDirectorNames: [] };
	}

	const declared = (a: BorrowingFirmApplicant) =>
		(a.incomeEntries ?? []).some(
			(e) =>
				e.profileType === 'business_partnership' &&
				normalizeName(e.entityName ?? '') === normalizedFirm
		);

	if (linkedIndividuals.some(declared)) {
		return { valid: true, missingDirectorNames: [] };
	}

	const missingDirectorNames = linkedIndividuals.map(
		(a) => (a.fullName ?? '').trim() || 'Unnamed partner'
	);
	return { valid: false, missingDirectorNames };
}

export function createEmptyDirectorForm(
	isUnsecured: boolean,
	options?: { isOPC?: boolean; companyType?: string }
): DirectorForm {
	const isOPC = options?.isOPC ?? false;
	const companyType = options?.companyType ?? '';

	// Auto-set designation when the company type allows only one designation
	// (OPC → Managing Director, Partnership → Partner, LLP → Designated Partner).
	// Private Limited has two options — pre-fill 'director' as a sensible default
	// (most Pvt Ltd stakeholders are Directors; the MD is the exception). The
	// user can switch to Managing Director via the dropdown.
	const autoDesignation = companyType ? getAutoDesignation(companyType) : '';
	const designationIsAutoSet = !!autoDesignation;
	const defaultMultiDesignation = companyType ? getDefaultDesignation(companyType) : '';

	const initialDesignation = isOPC
		? OPC_DESIGNATION
		: autoDesignation || defaultMultiDesignation;

	return {
		id: uuidv4(),
		fullName: '',
		gender: '',
		age: '',
		maritalStatus: '',
		ownershipPercent: isOPC ? '100' : '',
		location: isUnsecured ? 'same_city' : '',
		isNRI: '',
		onProperty: isUnsecured ? 'false' : '',
		onEMI: isUnsecured ? 'false' : '',
		designation: initialDesignation,
		loanRole: isOPC && isUnsecured ? 'co_borrower' : '',
		restoredFrom: '',
		lockedFields: isOPC
			? ['ownershipPercent', 'designation', ...(isUnsecured ? ['loanRole'] : [])]
			: designationIsAutoSet
				? ['designation']
				: [],
		pendingMatch: null
	};
}

/** Check if a director form has any user-entered data */
export function hasAnyData(d: DirectorForm): boolean {
	return !!(d.fullName?.trim() || d.gender || d.age || d.maritalStatus || d.ownershipPercent);
}

/**
 * Resize director forms when count changes.
 * - If growing: append empty forms
 * - If shrinking: remove unfilled first, return filled ones that need user choice
 * Returns { forms, needsUserChoice } where needsUserChoice contains
 * the filled directors that exceed the new count (user must pick which to remove).
 */
export function resizeDirectorForms(
	currentForms: DirectorForm[],
	newCount: number,
	isUnsecured: boolean
): { forms: DirectorForm[]; needsUserChoice: DirectorForm[] } {
	if (newCount >= currentForms.length) {
		// Growing or same — append empty forms
		const forms = [...currentForms];
		while (forms.length < newCount) {
			forms.push(createEmptyDirectorForm(isUnsecured));
		}
		return { forms, needsUserChoice: [] };
	}

	// Shrinking — separate filled vs unfilled
	const filled: DirectorForm[] = [];
	const unfilled: DirectorForm[] = [];
	for (const d of currentForms) {
		if (hasAnyData(d)) {
			filled.push(d);
		} else {
			unfilled.push(d);
		}
	}

	if (filled.length <= newCount) {
		// Enough room for all filled — just drop unfilled to fit
		const forms = [...filled];
		// Add unfilled to reach newCount if needed
		let unfilledIdx = 0;
		while (forms.length < newCount && unfilledIdx < unfilled.length) {
			forms.push(unfilled[unfilledIdx++]);
		}
		while (forms.length < newCount) {
			forms.push(createEmptyDirectorForm(isUnsecured));
		}
		return { forms, needsUserChoice: [] };
	}

	// More filled directors than new count — user must choose which to remove
	return { forms: currentForms, needsUserChoice: filled };
}

/** Company types where loanRole is required for directors in unsecured loans */
const LOAN_ROLE_COMPANY_TYPES = ['Private Limited', 'One Person Company (OPC)'];

export function isCardComplete(
	d: DirectorForm,
	isUnsecured: boolean,
	companyType?: string,
	isProfessionalLoan = false
): boolean {
	const ownershipValid = !!(
		d.ownershipPercent &&
		!isNaN(Number(d.ownershipPercent)) &&
		Number(d.ownershipPercent) >= 1 &&
		Number(d.ownershipPercent) <= 100
	);

	// LoanRole required for PvtLtd/OPC directors in unsecured loans (unless stake > threshold).
	// Threshold (STAKE_FULL_FINANCIALS_THRESHOLD = 20%) is the SAME constant the
	// rule engine uses to derive 'borrower' classification — keeping UI and backend
	// aligned avoids the silent-disagreement bug P16 surfaced (frontend was 25,
	// backend was 20; a 22% director hit `needsLoanRole=true` in the UI but the
	// rule engine overrode whatever role they picked anyway).
	// Professional Loan: directors are always non-financial — loanRole not applicable
	const needsLoanRole =
		isUnsecured &&
		!isProfessionalLoan &&
		companyType &&
		LOAN_ROLE_COMPANY_TYPES.includes(companyType);
	const stakeOverThreshold = Number(d.ownershipPercent) > STAKE_FULL_FINANCIALS_THRESHOLD;
	const loanRoleValid = !needsLoanRole || stakeOverThreshold || !!d.loanRole;

	// Designation required when company type offers multiple options (Pvt Ltd: MD vs Director).
	// Single-option types auto-set the value (locked field) so this passes implicitly.
	const allowedDesignations = companyType ? (DESIGNATION_BY_COMPANY[companyType] ?? []) : [];
	const designationValid = allowedDesignations.length <= 1 || !!d.designation;

	return !!(
		d.fullName?.trim().length >= 2 &&
		d.gender &&
		d.age &&
		!isNaN(Number(d.age)) &&
		Number(d.age) >= 18 &&
		Number(d.age) <= 80 &&
		d.maritalStatus &&
		ownershipValid &&
		loanRoleValid &&
		designationValid &&
		d.isNRI &&
		(isUnsecured || d.onProperty) &&
		(isUnsecured || d.onEMI)
	);
}

// ── Per-field validation ─────────────────────────────────────────

export function validateDirectorField(
	field: string,
	value: unknown,
	isUnsecured: boolean,
	companyType?: string
): string | null {
	switch (field) {
		case 'fullName':
			if (!value || String(value).trim().length < 2) return 'Name is required (min 2 characters)';
			return null;
		case 'gender':
			if (!value) return 'Gender is required';
			return null;
		case 'age': {
			const age = Number(value);
			if (!value || isNaN(age) || age < 18 || age > 80) return 'Age must be 18-80';
			return null;
		}
		case 'maritalStatus':
			if (!value) return 'Marital status is required';
			return null;
		case 'ownershipPercent': {
			const stake = Number(value);
			if (!value || isNaN(stake) || stake < 1 || stake > 100) return 'Stake must be 1-100%';
			return null;
		}
		case 'isNRI':
			if (!value) return 'NRI status is required';
			return null;
		case 'loanRole':
			// Only validated when explicitly included in field list (by validateDirectorForm)
			if (!value) return 'Loan role is required';
			return null;
		case 'designation': {
			// Only validated when explicitly included in field list (by validateDirectorForm).
			// Field-list inclusion already checks that the company type has multiple
			// allowed designations (Pvt Ltd) — single-option entity types auto-set
			// the value via the locked badge and don't run this validator.
			if (!value) return 'Designation is required';
			const allowed = companyType ? (DESIGNATION_BY_COMPANY[companyType] ?? []) : [];
			if (allowed.length > 0 && !allowed.includes(value as DirectorDesignation)) {
				return 'Designation is not valid for this company type';
			}
			return null;
		}
		case 'location':
			if (!isUnsecured && !value) return 'Location is required';
			return null;
		case 'onProperty':
			if (!isUnsecured && !value) return 'Required';
			return null;
		case 'onEMI':
			if (!isUnsecured && !value) return 'Required';
			return null;
		default:
			return null;
	}
}

/** Validate all fields on a director form, return errors map */
export function validateDirectorForm(
	d: DirectorForm,
	isUnsecured: boolean,
	companyType?: string,
	isProfessionalLoan = false
): Record<string, string> {
	const fieldErrors: Record<string, string> = {};
	const fields = ['fullName', 'gender', 'age', 'maritalStatus', 'isNRI', 'ownershipPercent'];
	// LoanRole required for PvtLtd/OPC directors in unsecured loans (unless stake > threshold overrides)
	// Threshold = STAKE_FULL_FINANCIALS_THRESHOLD (20%), the same constant the
	// rule engine uses — see isCardComplete above for the full rationale.
	// Professional Loan: directors are always non-financial — skip loanRole
	const needsLoanRole =
		isUnsecured &&
		!isProfessionalLoan &&
		companyType &&
		LOAN_ROLE_COMPANY_TYPES.includes(companyType);
	const stakeOverThreshold = Number(d.ownershipPercent) > STAKE_FULL_FINANCIALS_THRESHOLD;
	if (needsLoanRole && !stakeOverThreshold) fields.push('loanRole');
	// Designation is required when the company type offers multiple options
	// (currently only Pvt Ltd: MD vs Director). Single-option types auto-set
	// the value as a locked field, which is skipped via lockedFields below.
	const allowedDesignations = companyType ? (DESIGNATION_BY_COMPANY[companyType] ?? []) : [];
	if (allowedDesignations.length > 1) fields.push('designation');
	// Location removed from director form — collected later in form wizard for all applicants
	if (!isUnsecured) fields.push('onProperty', 'onEMI');

	for (const field of fields) {
		if (d.lockedFields?.includes(field)) continue;
		const error = validateDirectorField(
			field,
			d[field as keyof DirectorForm],
			isUnsecured,
			companyType
		);
		if (error) fieldErrors[field] = error;
	}
	return fieldErrors;
}

// ── OPC Duplicate Detection ────────────────────────────────────

/**
 * Check if an OPC company name duplicates another OPC in the same application.
 * OPC can only have one director by law — two people claiming the same OPC is invalid.
 *
 * @param companyName - The company name being entered
 * @param companyType - The company type (only checks when OPC)
 * @param currentCompanyId - The current company's ID (to exclude self)
 * @param allApplicants - All applicants in the case
 * @returns Warning message string, or empty string if no duplicate
 */
export function checkOpcDuplicate(
	companyName: string,
	companyType: string,
	currentCompanyId: string,
	allApplicants: Array<Record<string, unknown>>
): string {
	if (companyType !== 'One Person Company (OPC)') return '';

	const normalizedName = (companyName ?? '').trim().toLowerCase();
	if (!normalizedName || normalizedName.length < 2) return '';

	const duplicate = allApplicants.find(
		(a) =>
			a.applicantType === 'Company' &&
			a.companyType === 'One Person Company (OPC)' &&
			a.id !== currentCompanyId &&
			((a.companyName as string) ?? '').trim().toLowerCase() === normalizedName
	);

	if (duplicate) {
		return 'An OPC with this name already exists in this application. OPC can only have one director.';
	}
	return '';
}

// ── Name matching ────────────────────────────────────────────────

/** Find ALL name matches against existing Individual applicants.
 *  When companyId is provided, skips entries linked to THAT company but still matches
 *  standalone Individuals and entries linked to OTHER companies. */
export function findAllNameMatchesInApplicants(
	name: string,
	applicants: Array<Record<string, unknown>>,
	companyId?: string
): MatchInfo[] {
	const normalized = normalizeName(name);
	if (!normalized || normalized.length < 2) return [];

	const results: MatchInfo[] = [];
	for (let i = 0; i < applicants.length; i++) {
		const a = applicants[i];
		if (a.applicantType !== 'Individual') continue;
		if (companyId && isLinkedToCompany(a, companyId)) continue;
		if (!companyId && a.linkedCompanyId) continue;
		const aName = normalizeName((a.fullName as string) ?? '');
		if (!aName || aName !== normalized) continue;

		const data: Partial<DirectorForm> = {};
		if (a.gender) data.gender = a.gender as string;
		if (a.age) data.age = String(a.age);
		if (a.maritalStatus) data.maritalStatus = a.maritalStatus as string;
		if (a.isNRI !== undefined && a.isNRI !== null) {
			data.isNRI = a.isNRI === true || a.isNRI === 'Yes' ? 'Yes' : 'No';
		}

		results.push({
			source: `Applicant ${i + 1} (${a.fullName})`,
			data,
			lockedFields: [],
			matchedId: a.id as string,
			matchType: 'live'
		});
	}
	return results;
}

/** Find first name match (legacy — used by commitDirectorsToApplicants) */
export function findNameMatchInApplicants(
	name: string,
	applicants: Array<Record<string, unknown>>,
	companyId?: string
): MatchInfo | null {
	const matches = findAllNameMatchesInApplicants(name, applicants, companyId);
	return matches.length > 0 ? matches[0] : null;
}

/** Check for duplicate name within same company's director forms (exact match only) */
export function findSameCompanyDuplicate(
	forms: DirectorForm[],
	idx: number,
	name: string
): { dupIdx: number } | null {
	const normalized = normalizeName(name);
	if (!normalized || normalized.length < 2) return null;

	for (let i = 0; i < forms.length; i++) {
		if (i === idx) continue;
		const otherNorm = normalizeName(forms[i].fullName);
		if (otherNorm === normalized) return { dupIdx: i };
	}
	return null;
}

/**
 * Find an existing standalone Individual applicant matching a director by name + age + gender.
 * Skips applicants already linked to a company.
 * Returns match info with the applicant index and ID, or null if no match.
 */
export function findApplicantMatchByDetails(
	form: DirectorForm,
	applicants: Array<Record<string, unknown>>
): { matchedId: string; matchedName: string; applicantIndex: number } | null {
	const directorName = normalizeName(form.fullName);
	if (!directorName || directorName.length < 2 || !form.age || !form.gender) return null;

	for (let i = 0; i < applicants.length; i++) {
		const a = applicants[i];
		if (a.applicantType !== 'Individual') continue;
		if (a.linkedCompanyId) continue; // Already linked to a company

		const applicantName = normalizeName((a.fullName as string) ?? '');
		if (applicantName !== directorName) continue;

		// Check age match
		const applicantAge = String(a.age ?? '');
		if (applicantAge !== form.age) continue;

		// Check gender match
		const applicantGender = String(a.gender ?? '');
		if (applicantGender !== form.gender) continue;

		return {
			matchedId: a.id as string,
			matchedName: (a.fullName as string) ?? '',
			applicantIndex: i
		};
	}
	return null;
}

// ── Multi-company link helpers ────────────────────────────────────

/** Check if an applicant is linked to a given company (checks both singular and plural fields) */
export function isLinkedToCompany(applicant: Record<string, unknown>, companyId: string): boolean {
	if (applicant.linkedCompanyId === companyId) return true;
	const ids = applicant.linkedCompanyIds as string[] | undefined;
	return Array.isArray(ids) && ids.includes(companyId);
}

/** Check if an applicant is linked to ANY company */
export function isLinkedToAnyCompany(applicant: Record<string, unknown>): boolean {
	if (applicant.linkedCompanyId) return true;
	const ids = applicant.linkedCompanyIds as string[] | undefined;
	return Array.isArray(ids) && ids.length > 0;
}

/** Find a director across other companies' forms that matches by name */
export function findCrossCompanyDirectorMatch(
	name: string,
	allCompanyDirectorForms: Map<string, DirectorForm[]>,
	currentCompanyId: string
): { companyId: string; form: DirectorForm; formIndex: number } | null {
	const normalized = normalizeName(name);
	if (!normalized || normalized.length < 2) return null;

	// Collect candidates from all other companies
	type Candidate = { companyId: string; form: DirectorForm; formIndex: number; formName: string };
	const candidates: Candidate[] = [];
	for (const [companyId, forms] of allCompanyDirectorForms) {
		if (companyId === currentCompanyId) continue;
		for (let i = 0; i < forms.length; i++) {
			const formName = normalizeName(forms[i].fullName);
			if (formName) candidates.push({ companyId, form: forms[i], formIndex: i, formName });
		}
	}

	// Exact match only — prefix matching reserved for recovery bin searches
	const match = candidates.find((c) => c.formName === normalized);
	if (!match) return null;
	return { companyId: match.companyId, form: match.form, formIndex: match.formIndex };
}

/** Check if another card has identical details */
export function findAllDetailsMatch(forms: DirectorForm[], idx: number): { dupIdx: number } | null {
	const d = forms[idx];
	if (!d || !d.fullName.trim()) return null;
	const normalized = normalizeName(d.fullName);
	if (!normalized) return null;

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

// ── Build DirectorInfo from form ─────────────────────────────────

export function buildDirectorInfo(
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
		isCoApplicant: true, // All directors are co-applicants
		isNRI: (d.isNRI || 'No') as 'Yes' | 'No',
		// Unanswered (empty string) → undefined, NOT false — prevents silent misclassification
		// deriveDirectorClassification() defaults undefined to co_applicant_financial (most permissive)
		onProperty: d.onProperty === 'true' ? true : d.onProperty === 'false' ? false : undefined,
		onEMI: d.onEMI === 'true' ? true : d.onEMI === 'false' ? false : undefined,
		linkedCompanyId: companyId,
		role,
		...(d.designation ? { designation: d.designation } : {}),
		...(d.loanRole ? { loanRole: d.loanRole } : {})
	};
}

// ── Commit directors to applicants array (pure function) ─────────

export function commitDirectorsToApplicants(
	companyId: string,
	directorForms: DirectorForm[],
	currentApplicants: Array<Record<string, unknown>>,
	role: DirectorInfo['role']
): Array<Record<string, unknown>> {
	const directors: DirectorInfo[] = directorForms.map((d) => buildDirectorInfo(d, companyId, role));

	// 1. Update company's directors array
	let result = currentApplicants.map((a) => (a.id === companyId ? { ...a, directors } : a));

	// 2. Merge directors into existing linked Individuals (preserving income/credit/obligations)
	// Previously this deleted all linked Individuals and re-created them, losing financial data.
	// Now we update in-place and only remove Individuals no longer in the director list.
	const processedIds = new Set<string>();
	const matchedIndexes = new Set<number>();
	for (const d of directors) {
		if (!d.fullName) continue;

		const directorName = normalizeName(d.fullName);
		// Find the original DirectorForm for crossCompanyMatch info
		const originalForm = directorForms.find((df) => df.id === d.id);
		const matchedApplicantId = originalForm?.pendingMatch?.matchedId;
		const isConfirmedMatch = originalForm?.crossCompanyMatch?.confirmed === true;
		const isConfirmedDifferent = originalForm?.crossCompanyMatch?.confirmed === false;

		// Find existing Individual by id match, confirmed match, or by name if linked to ANY company.
		const existingIdx = result.findIndex((a, idx) => {
			if (matchedIndexes.has(idx)) return false;
			if (a.applicantType !== 'Individual') return false;
			if (a.id === d.id) return true;
			// User explicitly said "different person" — never merge by name
			if (isConfirmedDifferent) return false;
			// Match by confirmed "same person" — user explicitly said this standalone Individual IS the director
			if (isConfirmedMatch && matchedApplicantId && a.id === matchedApplicantId) return true;
			// Also match standalone Individuals by name if this director has a confirmed match
			if (isConfirmedMatch) {
				const applicantName = normalizeName((a.fullName as string) ?? '');
				return applicantName !== '' && applicantName === directorName;
			}
			// Within the same company, directors must match by ID only (line above handles that).
			// Name-only fallback is for cross-company scenarios only.
			if (isLinkedToCompany(a, companyId)) return false;
			// Only match by name if the Individual is already linked to some company
			if (!isLinkedToAnyCompany(a)) return false;
			const applicantName = normalizeName((a.fullName as string) ?? '');
			return applicantName !== '' && applicantName === directorName;
		});

		if (existingIdx >= 0) {
			const existing = result[existingIdx];
			processedIds.add(existing.id as string);
			matchedIndexes.add(existingIdx);
			const existingLinkedId = existing.linkedCompanyId as string | undefined;
			const existingLinkedIds = (existing.linkedCompanyIds as string[] | undefined) ?? [];

			// Keep existing primary link ONLY if that company still exists in the applicant list
			const existingCompanyStillExists = existingLinkedId
				? result.some((a) => a.id === existingLinkedId && a.applicantType === 'Company')
				: false;

			// Build linkedCompanyIds array merging existing links + current company (filter stale)
			const allLinkedIds = new Set<string>(
				existingLinkedIds.filter((id) =>
					result.some((a) => a.id === id && a.applicantType === 'Company')
				)
			);
			if (existingLinkedId && existingCompanyStillExists) allLinkedIds.add(existingLinkedId);
			allLinkedIds.add(companyId);
			const linkedCompanyIds = [...allLinkedIds];

			// Primary linkedCompanyId: keep existing if it still exists, otherwise use current
			const primaryLinkedCompanyId = existingCompanyStillExists ? existingLinkedId : companyId;

			// Merge: only override director-managed fields, preserve financial data
			// (income entries, obligations, credit scores, selected profiles, etc.)
			// Use explicit boolean check for onProperty/onEMI — JS falsy OR (false || true)
			// would silently keep stale true values when director form says false.
			const directorData: Record<string, unknown> = {
				applicantType: 'Individual',
				applicantSubType: 'individual',
				fullName: d.fullName,
				gender: d.gender,
				age: String(d.age),
				maritalStatus: d.maritalStatus,
				isNRI: d.isNRI,
				onProperty:
					d.onProperty !== undefined && d.onProperty !== null ? d.onProperty : existing.onProperty,
				onEMI: d.onEMI !== undefined && d.onEMI !== null ? d.onEMI : existing.onEMI,
				isGuarantor: d.isCoApplicant ? 'Yes' : 'No',
				linkedCompanyId: primaryLinkedCompanyId,
				linkedCompanyIds,
				ownershipPercent: d.ownershipPercent,
				directorRole: d.role,
				...(d.designation ? { designation: d.designation } : {}),
				...(d.loanRole ? { loanRole: d.loanRole } : {})
			};

			result[existingIdx] = { ...existing, ...directorData, id: existing.id };
		} else {
			const directorData: Record<string, unknown> = {
				applicantType: 'Individual',
				applicantSubType: 'individual',
				fullName: d.fullName,
				gender: d.gender,
				age: String(d.age),
				maritalStatus: d.maritalStatus,
				isNRI: d.isNRI,
				onProperty: d.onProperty,
				onEMI: d.onEMI,
				isGuarantor: d.isCoApplicant ? 'Yes' : 'No',
				linkedCompanyId: companyId,
				linkedCompanyIds: [companyId],
				ownershipPercent: d.ownershipPercent,
				directorRole: d.role,
				...(d.designation ? { designation: d.designation } : {}),
				...(d.loanRole ? { loanRole: d.loanRole } : {})
			};
			// Guard: never push if id already exists in result (prevents duplicate key crash)
			if (!result.some((a) => a.id === d.id)) {
				result.push({ id: d.id, ...directorData });
			}
			processedIds.add(d.id);
		}
	}

	// 3. Remove linked Individuals that are no longer in the director list
	// (director was removed by user). Multi-company directors are kept if
	// they're still linked to another company.
	result = result.filter((a) => {
		if (a.applicantType !== 'Individual') return true;
		if (!isLinkedToCompany(a, companyId)) return true;
		// This Individual is linked to this company — keep only if processed
		if (processedIds.has(a.id as string)) return true;
		// Multi-company director: unlink from this company but keep if linked elsewhere
		const linkedIds = (a.linkedCompanyIds as string[] | undefined) ?? [];
		const remainingIds = linkedIds.filter((id) => id !== companyId);
		if (remainingIds.length > 0) {
			// Still linked to other companies — update links, don't remove
			a.linkedCompanyIds = remainingIds;
			a.linkedCompanyId = remainingIds[0];
			return true;
		}
		return false; // No remaining links — remove
	});

	// Final dedup by id — prevent duplicate entries from any code path
	const seenIds = new Set<string>();
	return result.filter((a) => {
		const id = a.id as string;
		if (!id || seenIds.has(id)) return false;
		seenIds.add(id);
		return true;
	});
}

// ── Initialize director forms from company data ──────────────────

export function initDirectorForms(
	company: Record<string, unknown>,
	isUnsecured: boolean
): DirectorForm[] {
	const directorCount =
		Number(company.numberOfDirectorsOrPartners) ||
		getMinDirectors((company.companyType as string) ?? '');
	const savedDirectors = (company.directors ?? []) as DirectorInfo[];
	const companyType = (company.companyType as string) ?? '';
	const isOPC = companyType === 'One Person Company (OPC)';
	const createOpts = { isOPC, companyType };

	// Auto-assigned designation when the company type allows only one (OPC/Partnership/LLP).
	// Private Limited returns '' here so the saved (user-chosen) designation is preserved.
	const autoDesignation = getAutoDesignation(companyType);
	const designationIsAutoSet = !!autoDesignation;
	// Default for multi-option company types (currently only Pvt Ltd: 'director'). Used
	// only when the saved record has no designation — keeps legacy/old data showing the
	// table status as "OK" rather than reverting to "Pending" until the user re-opens
	// the modal. The modal's $effect applies the same fallback for new forms.
	const defaultMultiDesignation = getDefaultDesignation(companyType);

	const forms: DirectorForm[] = [];
	for (let i = 0; i < directorCount; i++) {
		const saved = savedDirectors[i];
		if (saved && saved.fullName) {
			const savedDesignation = (saved.designation as DirectorDesignation) ?? '';
			// Resolve the effective designation:
			//  1. OPC → always Managing Director (locked)
			//  2. Single-option entities (Partnership/LLP) → auto-set value
			//  3. Multi-option (Pvt Ltd) → keep saved value if valid, else default
			let resolvedDesignation: DirectorDesignation;
			if (isOPC) {
				resolvedDesignation = OPC_DESIGNATION;
			} else if (designationIsAutoSet) {
				resolvedDesignation = autoDesignation;
			} else if (savedDesignation) {
				resolvedDesignation = savedDesignation;
			} else {
				resolvedDesignation = defaultMultiDesignation;
			}
			forms.push({
				id: saved.id,
				fullName: saved.fullName,
				gender: saved.gender,
				age: String(saved.age),
				maritalStatus: saved.maritalStatus ?? '',
				ownershipPercent: isOPC ? '100' : String(saved.ownershipPercent),
				location: isUnsecured ? 'same_city' : saved.location,
				isNRI: saved.isNRI ?? '',
				onProperty: isUnsecured
					? 'false'
					: saved.onProperty !== undefined
						? String(saved.onProperty)
						: '',
				onEMI: isUnsecured ? 'false' : saved.onEMI !== undefined ? String(saved.onEMI) : '',
				designation: resolvedDesignation,
				loanRole:
					isOPC && isUnsecured
						? 'co_borrower'
						: ((saved.loanRole as DirectorForm['loanRole']) ?? ''),
				restoredFrom: '',
				lockedFields: isOPC
					? ['ownershipPercent', 'designation', ...(isUnsecured ? ['loanRole'] : [])]
					: designationIsAutoSet
						? ['designation']
						: [],
				pendingMatch: null
			});
		} else {
			forms.push(createEmptyDirectorForm(isUnsecured, createOpts));
		}
	}
	return forms;
}

/** Get total ownership % across all director forms */
export function getTotalOwnership(forms: DirectorForm[]): number {
	return forms.reduce((sum, d) => sum + (Number(d.ownershipPercent) || 0), 0);
}

/**
 * Recompute director ownershipPercent + lockedFields after an entity-type
 * change OR a director-count change. Pitfall #56.
 *
 * Why: previously the entity-switch + remove-picker paths persisted the new
 * directorForms array but left ownershipPercent untouched. So switching
 * Pvt Ltd (2 directors @ 50/50) → OPC (1 director remaining) left that
 * director stuck at 50% — should snap to 100% (OPC = single director by
 * definition). Symmetrically, switching back from OPC to a multi-director
 * entity left the former OPC director locked at 100%, breaking the
 * stake-total guard when a new director was added (50 + 100 = 150% error).
 *
 * Rules:
 *   • New entity is OPC → kept[0].ownershipPercent='100', lock it.
 *   • Previous was OPC, new is multi-director → unlock ownershipPercent and
 *     clear the stale '100' so the user must re-distribute.
 *   • Otherwise (Pvt Ltd ↔ Partnership ↔ LLP) → leave values alone.
 *
 * Pure function — caller is responsible for assigning the returned array
 * back to its local state AND persisting via commitDirectorsToApplicants.
 */
export function recomputeStakeAfterEntityChange(
	forms: DirectorForm[],
	newCompanyType: string,
	previousCompanyType: string
): DirectorForm[] {
	const OPC = 'One Person Company (OPC)';
	const newIsOPC = newCompanyType === OPC;
	const previousWasOPC = previousCompanyType === OPC;

	if (!newIsOPC && !previousWasOPC) {
		// Both sides are multi-director — no stake invariant to enforce.
		return forms;
	}

	return forms.map((d, i) => {
		if (newIsOPC) {
			// OPC has exactly one director who owns 100%. resizeDirectorForms
			// already capped the array length to 1 before we get here; any
			// extra forms beyond i===0 are noise that shouldn't normally exist,
			// but be defensive — only force 100 on the first slot.
			if (i !== 0) return d;
			const nextLocks = Array.from(new Set([...d.lockedFields, 'ownershipPercent']));
			return { ...d, ownershipPercent: '100', lockedFields: nextLocks };
		}
		// previousWasOPC && !newIsOPC — unlock and clear the OPC-forced 100%
		// so the user can enter real stakes for the new multi-director regime.
		// If the field wasn't '100' (defensive), leave it untouched.
		const filteredLocks = d.lockedFields.filter((f) => f !== 'ownershipPercent');
		const shouldClear = d.ownershipPercent === '100';
		return {
			...d,
			ownershipPercent: shouldClear ? '' : d.ownershipPercent,
			lockedFields: filteredLocks
		};
	});
}

/** Validate all directors for a company. Returns error messages array. */
export function validateAllDirectors(
	forms: DirectorForm[],
	isUnsecured: boolean,
	memberLabel: string,
	companyType?: string,
	isProfessionalLoan = false
): string[] {
	const errors: string[] = [];
	const stakeRule: StakeValidationRule = companyType
		? getStakeValidationRule(companyType)
		: 'max_100';

	for (let i = 0; i < forms.length; i++) {
		const fieldErrors = validateDirectorForm(
			forms[i],
			isUnsecured,
			companyType,
			isProfessionalLoan
		);
		if (Object.keys(fieldErrors).length > 0) {
			errors.push(`${memberLabel} ${i + 1} is incomplete. Please fill all required fields.`);
		}
	}

	// Max 1 Managing Director per company
	const mdCount = forms.filter((f) => f.designation === 'managing_director').length;
	if (mdCount > 1) {
		errors.push(`Only 1 Managing Director is allowed per company (currently ${mdCount}).`);
	}

	// Can't have all directors set to inactive (onEMI=false AND onProperty=false for all)
	if (forms.length > 1 && !isUnsecured) {
		const allInactive = forms.every((f) => f.onEMI === 'false' && f.onProperty === 'false');
		if (allInactive) {
			errors.push(
				`At least one ${memberLabel.toLowerCase()} must be active (on EMI or on property).`
			);
		}
	}

	// Entity-specific stake total validation
	const totalStake = getTotalOwnership(forms);
	if (stakeRule === 'exact_100' && totalStake !== 100) {
		errors.push(
			`Total ownership must equal exactly 100% (currently ${totalStake}%). All ${memberLabel.toLowerCase()}s must account for 100% of the firm.`
		);
	} else if (stakeRule === 'max_100' && totalStake > 100) {
		errors.push(`Total ownership exceeds 100% (currently ${totalStake}%). Please correct.`);
	}

	return errors;
}
