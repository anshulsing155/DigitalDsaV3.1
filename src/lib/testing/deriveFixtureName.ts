/**
 * deriveFixtureName
 *
 * Generates a standardized, human-readable name for a QA test fixture
 * from actual form answers. Names are fully deterministic — same inputs,
 * same output, always. No developer choice or free-text naming involved.
 *
 * Format:
 *   {Loan Type} · {Form Path} · {Employment} · {City} · CIBIL {score} · {Applicant Structure} [· Edge Tags]
 *
 * Examples:
 *   "Home Loan · New Loan · Salaried Private · Mumbai · CIBIL 750 · Couple"
 *   "LAP · Balance Transfer · Self-Employed Business · Delhi · CIBIL 720 · Primary + Son"
 *   "Professional Loan · New Loan · CA · Ahmedabad · CIBIL 800 · Solo · NRI"
 *   "Home Loan · BT + Top-up · Salaried Govt · Pune · CIBIL 620 · Couple · Low CIBIL"
 */

export function deriveFixtureName(
	loanAnswers: Record<string, unknown>,
	applicants: Array<Record<string, unknown>>
): string {
	const primary = applicants[0] ?? {};

	const segments = [
		deriveLoanType(loanAnswers),
		deriveFormPath(loanAnswers),
		deriveEmployment(primary),
		deriveCity(loanAnswers),
		deriveCibil(primary),
		deriveApplicantStructure(loanAnswers, applicants)
	].filter((s): s is string => s.length > 0);

	const edgeTags = deriveEdgeTags(primary, applicants);
	segments.push(...edgeTags);

	return segments.join(' · ');
}

// ─── Segment derivers ─────────────────────────────────────────────────────────

function deriveLoanType(loanAnswers: Record<string, unknown>): string {
	const raw = String(loanAnswers['loanName'] ?? '');

	const LOAN_TYPE_LABELS: Record<string, string> = {
		'Home Loan': 'Home Loan',
		'Loan Against Property': 'LAP',
		'Plot Loan': 'Plot Loan',
		'Personal Loan': 'Personal Loan',
		'Business Loan': 'Business Loan',
		'Business Loan - Unsecured': 'Business Loan',
		'Professional Loan': 'Professional Loan'
	};

	return LOAN_TYPE_LABELS[raw] ?? raw ?? 'Unknown Loan';
}

function deriveFormPath(loanAnswers: Record<string, unknown>): string {
	const raw = String(loanAnswers['loanType'] ?? '');

	const FORM_PATH_LABELS: Record<string, string> = {
		'New Loan': 'New Loan',
		'Balance Transfer Only': 'Balance Transfer',
		'Balance Transfer With Top-up': 'BT + Top-up',
		'Top-up Only': 'Top-up',
		'Debt Consolidation': 'Debt Consolidation',
		'Debt Consolidation with Extra Funds': 'Debt Consolidation + Extra',
		'Plot Loan Only': 'Plot Only',
		'Plot & Construction Loan': 'Plot + Construction',
		'Plot & Equity Loan': 'Plot + Equity',
		'Construction Loan Only': 'Construction Only',
		'Plot Balance Transfer': 'Plot BT'
	};

	return FORM_PATH_LABELS[raw] ?? raw ?? '';
}

function deriveEmployment(primary: Record<string, unknown>): string {
	const employmentType = String(primary['employmentType'] ?? '');

	// Self-employed professional: show the specific profession instead of the category
	if (employmentType === 'Self-employed(Professional)') {
		const profession = deriveProfession(primary);
		return profession || 'Self-Employed Professional';
	}

	const EMPLOYMENT_LABELS: Record<string, string> = {
		'Salaried(Private)': 'Salaried Private',
		'Salaried(Government)': 'Salaried Govt',
		'Self-employed(Other)': 'Self-Employed Business',
		Pensioner: 'Pensioner'
	};

	return EMPLOYMENT_LABELS[employmentType] ?? employmentType ?? '';
}

function deriveProfession(primary: Record<string, unknown>): string {
	const raw = String(primary['professionType'] ?? '');

	const PROFESSION_LABELS: Record<string, string> = {
		'Chartered Accountant(CA)': 'CA',
		'MBBS Doctor': 'Doctor',
		Lawyer: 'Lawyer',
		Architect: 'Architect'
	};

	return PROFESSION_LABELS[raw] ?? '';
}

function deriveCity(loanAnswers: Record<string, unknown>): string {
	// Priority: property city (secured) → business city (business/professional) → residence city (unsecured personal)
	// propertyCityName wins when present because it's the most specific to the deal
	const city =
		loanAnswers['propertyCityName'] ??
		loanAnswers['businessCityName'] ??
		loanAnswers['residenceCityName'];

	return String(city ?? '');
}

function deriveCibil(primary: Record<string, unknown>): string {
	const score = primary['creditScore'];
	if (score == null || score === '') return '';

	const numeric = Number(score);
	if (isNaN(numeric) || numeric === 0) return '';

	return `CIBIL ${numeric}`;
}

function deriveApplicantStructure(
	loanAnswers: Record<string, unknown>,
	applicants: Array<Record<string, unknown>>
): string {
	const count = Number(loanAnswers['__applicantCount'] ?? applicants.length ?? 1);

	// applicationStructure may be stored under either key depending on form page
	const structure = String(
		loanAnswers['applicationStructure'] ?? loanAnswers['tellUsWhoIsApplying'] ?? ''
	);

	if (structure.includes('Company')) return 'Company';
	if (count === 1) return 'Solo';
	if (count >= 3) return `${count} Applicants`;

	// 2 applicants — resolve from applicationStructure or co-applicant relationship
	if (structure === 'Couple') return 'Couple';

	const coApplicant = applicants[1];
	if (!coApplicant) return '2 Applicants';

	const relationship = String(coApplicant['relationshipWithPrimary'] ?? '');

	const RELATIONSHIP_LABELS: Record<string, string> = {
		Spouse: 'Couple',
		Father: 'Primary + Father',
		Mother: 'Primary + Mother',
		Son: 'Primary + Son',
		Daughter: 'Primary + Daughter',
		Brother: 'Primary + Brother',
		Sister: 'Primary + Sister',
		'Other, in blood relation': 'Primary + Relative',
		'Other, not in blood relation': 'Primary + Co-Applicant'
	};

	return RELATIONSHIP_LABELS[relationship] ?? '2 Applicants';
}

function deriveEdgeTags(
	primary: Record<string, unknown>,
	applicants: Array<Record<string, unknown>>
): string[] {
	const tags: string[] = [];

	// NRI: any applicant carries NRI status
	const hasNri = applicants.some((a) => a['isNRI'] === true || a['isNRI'] === 'Yes');
	if (hasNri) tags.push('NRI');

	// Low CIBIL: primary applicant score below the common minimum lender floor (650)
	const score = Number(primary['creditScore'] ?? 0);
	if (score > 0 && score < 650) tags.push('Low CIBIL');

	return tags;
}
