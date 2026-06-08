/**
 * Case-label generator (Audit B.1).
 * ════════════════════════════════════════════════════════════════════
 * The stored `Case.label` is a NAME-FREE descriptor:
 *     "{Loan Type} — {Project?} — {City} — {Profile} case"
 *     e.g. "Home Loan — Ghaziabad — SENP case"
 *          "Home Loan — Prestige Lakeside — Ghaziabad — Salaried case"
 *
 * PRIVACY (owner decision 2026-05-21): the customer name is NEVER stored in the
 * label, because the label is shown on every partner surface — RM portal, share
 * links, share emails. Keeping the name out of the stored value means no partner
 * surface can leak it. The DSA's OWN authenticated views append the full
 * customer name separately (decrypted at load) via {@link dsaCaseTitle}.
 *
 * Pure + reused by the creation path and the backfill script.
 */

const MAX_SEGMENT = 30;

/** Applicant profile buckets for the label. */
export type ApplicantProfile = 'Salaried' | 'SEP' | 'SENP' | 'Company' | 'Pensioner';

/**
 * Classify the primary applicant into a coarse profile bucket from their
 * applicant type + employment/income type. Keyword-based so it tolerates the
 * many stored variants ("Salaried(Government)", "Self-Employed Professional",
 * "business_proprietorship", …). Returns null when nothing usable is present —
 * the label then omits the profile segment.
 */
export function classifyApplicantProfile(args: {
	applicantType?: string | null;
	employmentType?: string | null;
	incomeType?: string | null;
}): ApplicantProfile | null {
	if ((args.applicantType ?? '').toLowerCase() === 'company') return 'Company';

	const hay = `${args.employmentType ?? ''} ${args.incomeType ?? ''}`.toLowerCase();
	if (!hay.trim()) return null;

	if (hay.includes('pension')) return 'Pensioner';
	if (hay.includes('salaried') || hay.includes('salary')) return 'Salaried';
	if (hay.includes('professional')) return 'SEP'; // Self-Employed Professional
	if (
		hay.includes('business') ||
		hay.includes('self-employed') ||
		hay.includes('self employed') ||
		hay.includes('proprietor') ||
		hay.includes('partner') ||
		hay.includes('director') ||
		hay.includes('freelance')
	) {
		return 'SENP'; // Self-Employed Non-Professional
	}
	return null;
}

function clamp(value: string): string {
	const v = value.trim().replace(/\s+/g, ' ');
	return v.length > MAX_SEGMENT ? v.slice(0, MAX_SEGMENT).trimEnd() + '…' : v;
}

/**
 * Form-state `loanData` is keyed by loan NAME — the answers (propertyCityName,
 * projectName*, etc.) live under `loanData[loanData.loanName]`, not at the top
 * level. This resolves the active loan's answers object, falling back to the
 * flat object if it isn't nested (defensive).
 */
export function resolveActiveAnswers(
	loanData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
	if (!loanData || typeof loanData !== 'object') return {};
	const ld = loanData as Record<string, unknown>;
	const activeKey = typeof ld.loanName === 'string' ? ld.loanName : null;
	const nested = activeKey && ld[activeKey] && typeof ld[activeKey] === 'object' ? ld[activeKey] : null;
	return (nested ?? ld) as Record<string, unknown>;
}

export interface CaseLabelInput {
	/** Human loan-type label (from loanTypeLabels.loanTypeLabel). */
	loanTypeLabel: string;
	/** Project / builder name when captured (under-construction); optional. */
	project?: string | null;
	/** Case-route city (property / residence / business per loan family). */
	city?: string | null;
	/** Primary applicant profile bucket (from classifyApplicantProfile). */
	profile?: ApplicantProfile | string | null;
}

/**
 * Build the stored (name-free) case label.
 *   - full   → "Home Loan — Prestige Lakeside — Ghaziabad — SENP case"
 *   - no project → "Home Loan — Ghaziabad — SENP case"
 *   - no profile → "Home Loan — Ghaziabad"
 *   - nothing but type → "Home Loan"
 */
export function buildCaseLabel(input: CaseLabelInput): string {
	const segments: string[] = [input.loanTypeLabel?.trim() || 'Loan'];

	const project = (input.project ?? '').trim();
	if (project) segments.push(clamp(project));

	const city = (input.city ?? '').trim();
	if (city) segments.push(clamp(city));

	let label = segments.join(' — ');

	const profile = (input.profile ?? '').toString().trim();
	if (profile) label += ` — ${profile} case`;
	return label;
}

/**
 * DSA-only title: the stored (name-free) label plus the full customer name.
 * Used ONLY in the DSA's own authenticated views — never on partner surfaces.
 */
export function dsaCaseTitle(label: string, fullName?: string | null): string {
	const name = (fullName ?? '').trim();
	return name ? `${label} — ${name}` : label;
}
