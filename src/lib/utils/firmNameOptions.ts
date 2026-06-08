/**
 * Assemble the firm-name suggestion list for the Director partner-in-firm
 * combobox (FirmNameCombobox).
 *
 * Order:
 *   1. Parent borrowing firm — any Company applicant with companyType
 *      'Partnership Firm' or 'LLP'. Labelled "<name> (this firm)".
 *   2. Sibling-applicant partnership income declarations — other applicants'
 *      incomeEntries where profileType === 'business_partnership'.
 *   3. Current applicant's own prior entries (for editing a second entry
 *      from a different firm). Labelled "<name> (already added)".
 *
 * Deduplication: case-insensitive, whitespace-normalized.
 *
 * Spec: docs/specs/DIRECTOR-FIRM-NAME-SPEC.md §3
 */

export interface FirmNameOption {
	label: string;
	value: string;
}

interface IncomeEntryLike {
	profileType?: string;
	entityName?: string;
}

interface ApplicantLike {
	id?: string;
	applicantType?: string;
	companyType?: string;
	companyName?: string;
	incomeEntries?: IncomeEntryLike[];
}

export function assembleFirmNameOptions(
	applicants: readonly ApplicantLike[],
	currentApplicantId: string | undefined
): FirmNameOption[] {
	const seen = new Set<string>();
	const options: FirmNameOption[] = [];

	function addIfNew(rawName: string, suffix: string) {
		const normalized = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
		if (!normalized || seen.has(normalized)) return;
		seen.add(normalized);
		options.push({ label: rawName.trim() + suffix, value: rawName.trim() });
	}

	// 1. Parent borrowing firm — Partnership / LLP Company applicants.
	for (const a of applicants) {
		if (
			a.applicantType === 'Company' &&
			(a.companyType === 'Partnership Firm' || a.companyType === 'LLP')
		) {
			const name = (a.companyName ?? '').toString();
			if (name) addIfNew(name, ' (this firm)');
		}
	}

	// 2. Sibling-applicant partnership income declarations.
	for (const a of applicants) {
		if (a.id === currentApplicantId) continue;
		const entries = a.incomeEntries ?? [];
		for (const e of entries) {
			if (e.profileType === 'business_partnership' && e.entityName) {
				addIfNew(e.entityName, '');
			}
		}
	}

	// 3. Current applicant's own prior entries.
	const self = applicants.find((a) => a.id === currentApplicantId);
	const selfEntries = self?.incomeEntries ?? [];
	for (const e of selfEntries) {
		if (e.profileType === 'business_partnership' && e.entityName) {
			addIfNew(e.entityName, ' (already added)');
		}
	}

	return options;
}
