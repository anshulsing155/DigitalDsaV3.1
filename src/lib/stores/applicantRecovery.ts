// import { persisted } from 'svelte-persisted-store';

// export type RecoverableApplicant = {
// 	id: string;
// 	data: any;
// 	deleted: boolean;
// 	updatedAt: number;
// 	nameKey: string | null;
// 	signature: string | undefined;
// };

// export const applicantRecoveryStore = persisted<
// 	Record<string, RecoverableApplicant>
// >('applicant-recovery', {});

/* COMM */

// import { persisted } from 'svelte-persisted-store';

// export type RecoverableApplicant = {
// 	uuid: string; // Original UUID from deleted applicant
// 	applicantType: 'Individual' | 'Company';
// 	data: any; // Full snapshot
// 	deletedAt: number;

// 	// Searchable metadata
// 	fullName?: string; // For Individual
// 	companyName?: string; // For Company

// 	// For display
// 	displayName: string;
// };

// export const applicantRecoveryStore = persisted<RecoverableApplicant[]>(
// 	'applicant-recovery',
// 	[]
// );

/* end here */

// import { persisted } from 'svelte-persisted-store';

// export type RecoverableApplicant = {
// 	id: string; // unique recovery entry id (uuid)
// 	applicantType: 'Individual' | 'Company';
// 	data: any; // full snapshot
// 	contextId: string; // application / loan id
// 	createdAt: number;

// 	// identity fields (for matching)
// 	fullName?: string;
// 	age?: string;
// 	gender?: string;
// 	maritalStatus?: string;

// 	companyName?: string;
// 	companyType?: string;
// };

// export const applicantRecoveryStore = persisted<RecoverableApplicant[]>(
// 	'applicant-recovery',
// 	[]
// );

import { sessionPersisted } from './_bridge.svelte';

export type RecoverableApplicant = {
	uuid: string; // Unique ID for this recovery entry
	applicantType: 'Individual' | 'Company';
	data: Record<string, unknown>; // Full applicant snapshot
	deletedAt: number;
	displayName: string; // For UI display

	// Match signature for overwrite logic
	matchSignature: string; // Computed hash for matching

	// Individual fields (for display/debugging)
	fullName?: string;
	gender?: string;
	maritalStatus?: string;
	age?: string;
	employmentType?: string;

	// Company fields (for display/debugging)
	companyName?: string;
	companyType?: string;
	businessType?: string;
};

export const applicantRecoveryStore = sessionPersisted<RecoverableApplicant[]>(
	'applicant-recovery',
	[]
);

// Store for denied recovery prefixes - prevents showing suggestions for denied name prefixes
// Stores detection keys like "individual::ram" or "company::abc"
export const deniedRecoveryPrefixesStore = sessionPersisted<Set<string>>(
	'denied-applicant-recovery-prefixes',
	new Set(),
	{
		serializer: {
			parse: (str: string) => new Set(JSON.parse(str)),
			stringify: (set: Set<string>) => JSON.stringify([...set])
		}
	}
);

// Build a 2-char initial key from a full detection key.
// "individual::amit" → "individual::am"
// "company::infra pvt" → "company::in"
// This is what gets stored in the denied set so that denying "AM"
// suppresses AMIT, AMRIT, AMRINDER — but not RAMAN.
export function buildInitialKey(detectionKey: string): string {
	const sep = detectionKey.indexOf('::');
	if (sep === -1) return detectionKey;
	const prefix = detectionKey.slice(0, sep); // 'individual' or 'company'
	const name = detectionKey.slice(sep + 2); // the typed name
	const initial = name.slice(0, 2); // first 2 chars
	return `${prefix}::${initial}`;
}

// Helper to add a denied prefix — stores the 2-char initial key
// so all names starting with those initials are suppressed.
export function denyRecoveryPrefix(detectionKey: string) {
	const initialKey = buildInitialKey(detectionKey);
	deniedRecoveryPrefixesStore.update((set) => {
		set.add(initialKey);
		return new Set(set);
	});
}

// Helper to check if a detection key's initials are denied.
export function isPrefixDenied(detectionKey: string): boolean {
	const initialKey = buildInitialKey(detectionKey);
	let denied = false;
	deniedRecoveryPrefixesStore.subscribe((set) => {
		denied = set.has(initialKey);
	})();
	return denied;
}

// ========================================
// SIGNATURE BUILDERS (for overwrite logic)
// ========================================

// Helper: Build match signature for Individual
// Requires basic info page fields: name + gender + maritalStatus + age.
// employmentType is optional (set on a later page).
export function buildIndividualSignature(
	name: string | undefined,
	gender: string | undefined,
	maritalStatus: string | undefined,
	age: string | number | undefined,
	employmentType: string | undefined
): string | null {
	const n = (name || '').trim().toLowerCase();
	const g = (gender || '').trim().toLowerCase();
	const m = (maritalStatus || '').trim().toLowerCase();
	const a = age?.toString().trim() || '';
	const e = (employmentType || '').trim().toLowerCase();

	// Core 4 fields (basic info page) are required; employmentType is optional
	if (!n || !g || !m || !a) return null;

	return e ? `individual::${n}::${g}::${m}::${a}::${e}` : `individual::${n}::${g}::${m}::${a}`;
}

// Helper: Build match signature for Company
// Requires basic info page fields: companyName + companyType + businessType.
export function buildCompanySignature(
	companyName: string | undefined,
	companyType: string | undefined,
	businessType: string | undefined
): string | null {
	const cn = (companyName || '').trim().toLowerCase();
	const ct = (companyType || '').trim().toLowerCase();
	const bt = (businessType || '').trim().toLowerCase();

	if (!cn || !ct || !bt) return null;

	return `company::${cn}::${ct}::${bt}`;
}

// Helper: Build signature from applicant data (for overwrite)
// Helper: Build signature from applicant data (for overwrite)
export function buildMatchSignature(
	applicant: Record<string, unknown> | null | undefined
): string | null {
	if (!applicant?.applicantType) return null;

	if (applicant.applicantType === 'Individual') {
		return buildIndividualSignature(
			applicant.fullName as string | undefined,
			applicant.gender as string | undefined,
			applicant.maritalStatus as string | undefined,
			applicant.age as string | number | undefined,
			applicant.employmentType as string | undefined // ← NEW
		);
	}

	if (applicant.applicantType === 'Company') {
		return buildCompanySignature(
			applicant.companyName as string | undefined,
			applicant.companyType as string | undefined,
			applicant.businessType as string | undefined
		);
	}

	return null;
}

// ========================================
// DETECTION HELPERS (for modal trigger)
// ========================================

// Helper: Build name-only key for detection
export function buildDetectionKey(
	applicant: Record<string, unknown> | null | undefined
): string | null {
	if (!applicant?.applicantType) return null;

	if (applicant.applicantType === 'Individual') {
		const name = ((applicant.fullName as string) || '').trim().toLowerCase();
		if (!name) return null;
		return `individual::${name}`;
	}

	if (applicant.applicantType === 'Company') {
		const company = ((applicant.companyName as string) || '').trim().toLowerCase();
		if (!company) return null;
		return `company::${company}`;
	}

	return null;
}

// Helper: Check if entry matches current applicant by name/company (partial match)
// Typing "ram" will match "Ram", "Raman", "Ram Kumar", etc.
export function matchesByName(
	entry: RecoverableApplicant,
	currentApplicant: Record<string, unknown> | null | undefined
): boolean {
	if (!entry || !currentApplicant) return false;

	// Type must match
	if (entry.applicantType !== currentApplicant.applicantType) return false;

	if (currentApplicant.applicantType === 'Individual') {
		// Resolve name: top-level → legacy key → nested data → displayName
		const data = (entry.data || {}) as Record<string, unknown>;
		const entryName = (entry.fullName || (data.fullName as string) || entry.displayName || '')
			.trim()
			.toLowerCase();
		const currentName = ((currentApplicant.fullName as string) || '').trim().toLowerCase();
		// Prefix match — "gau" matches "gaurav" but NOT "prashant"
		return currentName !== '' && entryName.startsWith(currentName);
	}

	if (currentApplicant.applicantType === 'Company') {
		const data = (entry.data || {}) as Record<string, unknown>;
		const entryCompany = (
			entry.companyName ||
			(data.companyName as string) ||
			entry.displayName ||
			''
		)
			.trim()
			.toLowerCase();
		const currentCompany = ((currentApplicant.companyName as string) || '').trim().toLowerCase();
		// Prefix match
		return currentCompany !== '' && entryCompany.startsWith(currentCompany);
	}

	return false;
}
