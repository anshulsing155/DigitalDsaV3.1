/**
 * Obligation Dedup Detection
 * ═══════════════════════════════════════════════════════════════════
 * Detects potential duplicate obligations across Individual applicants.
 * When the same person appears multiple times (e.g., as both a standalone
 * individual and as a company director), their obligations may be entered
 * twice. This utility flags those potential duplicates.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface ObligationDupWarning {
	personName: string;
	lender: string;
	applicantIndexes: number[];
}

/**
 * Detect potential duplicate obligations across applicants.
 * Groups Individual applicants by normalized name, then checks for
 * overlapping lender names in their obligation entries.
 */
export function detectObligationDuplicates(
	applicants: Array<Record<string, any>>
): ObligationDupWarning[] {
	const warnings: ObligationDupWarning[] = [];

	// Build name → indexes map (only Individual applicants with obligations)
	const nameMap = new Map<string, number[]>();

	for (let i = 0; i < applicants.length; i++) {
		const a = applicants[i];
		if (a.applicantType !== 'Individual') continue;

		const name = normalizeName(a.fullName as string);
		if (!name) continue;

		const hasObligations = getObligationLenders(a).length > 0;
		if (!hasObligations) continue;

		const existing = nameMap.get(name) ?? [];
		existing.push(i);
		nameMap.set(name, existing);
	}

	// Check for overlapping lenders between same-name applicants
	for (const [name, indexes] of nameMap) {
		if (indexes.length < 2) continue;

		// Collect all lender names per index
		const lenderSets = indexes.map((i) => getObligationLenders(applicants[i]));

		// Find lenders that appear in multiple entries
		const lenderCount = new Map<string, number[]>();
		for (let j = 0; j < lenderSets.length; j++) {
			for (const lender of lenderSets[j]) {
				const existing = lenderCount.get(lender) ?? [];
				existing.push(indexes[j]);
				lenderCount.set(lender, existing);
			}
		}

		for (const [lender, dupIndexes] of lenderCount) {
			if (dupIndexes.length >= 2) {
				warnings.push({
					personName: applicants[dupIndexes[0]].fullName as string,
					lender,
					applicantIndexes: dupIndexes
				});
			}
		}
	}

	return warnings;
}

/** Normalize name for comparison: lowercase, collapse whitespace, trim */
function normalizeName(name: string | undefined | null): string {
	if (!name) return '';
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Extract lender names from an applicant's obligation data */
function getObligationLenders(applicant: Record<string, any>): string[] {
	const lenders = new Set<string>();

	// Table-based loan entries (structured obligation format)
	const loanEntries = (applicant.tableLoanEntries ?? []) as Array<Record<string, any>>;
	for (const entry of loanEntries) {
		const lender = normalizeName(entry.lenderName ?? entry.bankName);
		if (lender) lenders.add(lender);
	}

	// Table-based limit entries (credit cards / overdrafts)
	const limitEntries = (applicant.tableLimitEntries ?? []) as Array<Record<string, any>>;
	for (const entry of limitEntries) {
		const lender = normalizeName(entry.lenderName ?? entry.bankName);
		if (lender) lenders.add(lender);
	}

	// Legacy obligations array
	const obligations = (applicant.obligations ?? []) as Array<Record<string, any>>;
	for (const entry of obligations) {
		const lender = normalizeName(entry.lenderName ?? entry.bankName ?? entry.bank);
		if (lender) lenders.add(lender);
	}

	return [...lenders];
}
