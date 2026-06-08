/**
 * directorAutoIncome.ts — Auto-income entry management for director-linked applicants
 * ═══════════════════════════════════════════════════════════════════
 * Creates, syncs, and orphans income entries based on company → director relationships.
 * Pure utility functions — no Svelte state or side effects.
 * ═══════════════════════════════════════════════════════════════════
 */

import { v4 as uuidv4 } from 'uuid';
import type { IncomeSourceEntry, IncomeProfileType } from '$lib/types/incomeProfile';

// ── Company Type → Income Profile Mapping ────────────────────────

const COMPANY_TYPE_TO_PROFILE: Record<string, IncomeProfileType> = {
	'Private Limited': 'director_company',
	'One Person Company (OPC)': 'director_company',
	'Public Limited': 'director_company',
	'Section 8': 'director_company',
	'Partnership Firm': 'business_partnership',
	LLP: 'business_partnership'
};

/**
 * Map Company applicant companyType values → income form specifics values.
 * Company applicants store full names ("Private Limited", "Partnership Firm"),
 * but income form dropdowns use short internal codes ("pvt_ltd", "partnership").
 * Without this mapping, auto-filled locked dropdowns appear blank.
 */
export const COMPANY_TYPE_TO_SPECIFICS_VALUE: Record<string, string> = {
	'Private Limited': 'pvt_ltd',
	'One Person Company (OPC)': 'opc',
	'Public Limited': 'public_ltd',
	'Section 8': 'section_8',
	'Partnership Firm': 'partnership',
	LLP: 'llp'
};

/**
 * Get the income profile type for a company type.
 * Returns null for unknown/unsupported types.
 */
export function getProfileForCompanyType(companyType: string): IncomeProfileType | null {
	return COMPANY_TYPE_TO_PROFILE[companyType] ?? null;
}

/**
 * Auto-derived infrastructure keys — derived from current company state, NEVER
 * restored from prior-session recovery snapshots.
 *
 * When `applyDirectorRestore` merges recovered income entries onto auto-created
 * entries, these keys are intentionally filtered OUT — the live company data
 * (companyType, registeredInIndia, etc.) is the canonical source. Stale recovery
 * data must not overwrite current company state.
 *
 * Other keys produced by `buildAutoSpecifics` (`hasEquity`, `designation`,
 * `companyProfitable`, `partnerType`, etc.) are intentionally OMITTED from this
 * set — the user can override the auto-derived value, and the override should
 * survive session recovery.
 *
 * Parity test: `directorAutoIncome.test.ts` verifies this set against the
 * actual keys produced by `buildAutoSpecifics`. If a new key is added there,
 * the test forces an explicit decision: "infra" (add here) vs "user-overridable"
 * (leave out).
 */
export const AUTO_DERIVED_INFRA_KEYS: ReadonlySet<string> = new Set([
	'registeredInIndia',
	'companyType',
	'firmType',
	'shareholding',
	'capitalContribution',
	'companySharesFinancials',
	'cin'
]);

// ── Derivation helpers ───────────────────────────────────────────
//
// When the parent Company is a primary applicant in the case, the DSA has
// already supplied its profile and financials. The director-side income form
// asks several questions that are answered by that company-level data —
// re-asking is duplication. These helpers extract derivable answers; the
// caller decides which ones to apply.

/**
 * `companyProfitable: true` when EVERY filed ITR year shows positive net profit
 * AND there are at least 2 filed years (lender requirement).
 * Returns `undefined` when ITR data is too thin to make a call — leave the
 * field unset so the form will still ask.
 */
export function deriveCompanyProfitable(
	companyIncome: Record<string, unknown> | undefined
): boolean | undefined {
	if (!companyIncome) return undefined;
	const itr = companyIncome.itr as { years?: Array<Record<string, unknown>> } | undefined;
	const years = itr?.years ?? [];
	const filed = years.filter((y) => y.itrFiled === true);
	if (filed.length < 2) return undefined;
	return filed.every((y) => Number(y.netProfit ?? 0) > 0);
}

/**
 * GST registration status from the Company applicant. Maps the rich enum
 * (`registered_regular`, `registered_composition`, `unregistered`, etc.) to
 * the simple boolean the income form expects. Returns `undefined` if absent.
 */
export function deriveFirmGstRegistered(
	gstStatus: string | undefined
): boolean | undefined {
	if (!gstStatus) return undefined;
	if (gstStatus === 'unregistered') return false;
	if (gstStatus.startsWith('registered')) return true;
	return undefined;
}

/**
 * Map a director's role from the Company applicant's `directors[]` array
 * (`partner` / `designated_partner`) to the income form's `partnerType` enum
 * (`active` / `sleeping` / `designated`). Active vs sleeping isn't carried on
 * the company side — default `partner` → `active` (most common in practice;
 * DSA can override since this isn't locked when uncertain). Returns `undefined`
 * if the role doesn't map cleanly.
 */
export function derivePartnerType(directorRole: string | undefined): string | undefined {
	if (directorRole === 'designated_partner') return 'designated';
	if (directorRole === 'partner') return 'active';
	return undefined;
}

/**
 * Map a DirectorDesignation value (captured in DirectorFormModal) to the
 * `designation` option used by the director-company income form.
 *
 * Conservative — only returns a value when the mapping is unambiguous so the
 * income form never gets locked on a guess. For 'director' (generic Pvt Ltd
 * directors) the form stays editable so the DSA can pick the subtype.
 */
export function mapDirectorDesignationToIncomeForm(
	directorDesignation: string | undefined
): string | undefined {
	if (directorDesignation === 'managing_director') return 'md';
	return undefined;
}

// ── Single Entry Creation ────────────────────────────────────────

/** Optional rich company-level context used to derive additional specifics
 *  beyond the four basics (registeredInIndia, companyType/firmType,
 *  shareholding/capitalContribution). When omitted the entry still works —
 *  the form just falls back to asking those questions. */
export interface CompanyContext {
	companyIncome?: Record<string, unknown>;
	gstStatus?: string;
	cin?: string;
	directorRole?: string;
}

/**
 * Create an auto-generated income entry for a director/partner.
 * Pre-fills specifics from the parent Company applicant. Income amounts are
 * always left empty — only the DSA can supply those.
 *
 * The basic four (`registeredInIndia`, `companyType`/`firmType`,
 * `shareholding`/`capitalContribution`, plus `hasEquity` for director_company)
 * are always populated. The optional `companyContext` populates additional
 * fields (`companyProfitable`, `companySharesFinancials`, `firmGstRegistered`,
 * etc.) when the Company applicant has the underlying data.
 *
 * @returns IncomeSourceEntry or null if company type has no applicable profile
 */
export function createDirectorIncomeEntry(
	companyId: string,
	companyName: string,
	companyType: string,
	ownershipPercent: number,
	registrationCountry?: string,
	companyContext?: CompanyContext
): IncomeSourceEntry | null {
	const profileType = getProfileForCompanyType(companyType);
	if (!profileType) return null;

	const now = new Date().toISOString();

	// Convert company type to the value format the income form dropdowns expect
	const specificsTypeValue = COMPANY_TYPE_TO_SPECIFICS_VALUE[companyType] ?? companyType;

	// Pre-fill registeredInIndia from the company's registration country.
	// This avoids the user seeing a blank "Company type (auto)" dropdown —
	// the dropdown is gated behind registeredInIndia via showWhen.
	const isRegisteredInIndia = registrationCountry !== 'Foreign';

	const specifics = buildAutoSpecifics({
		profileType,
		isRegisteredInIndia,
		specificsTypeValue,
		ownershipPercent,
		companyContext
	});

	return {
		id: uuidv4(),
		profileType,
		entityName: companyName,
		specifics,
		income: {},
		evidence: { itrFiled: false, hasDocumentaryEvidence: false },
		createdAt: now,
		updatedAt: now,
		filledBy: 'dsa',
		autoCreated: true,
		sourceCompanyId: companyId
	};
}

/**
 * Pure builder that assembles the specifics object for an auto-created entry.
 * Exported for re-use by `syncAutoIncomeEntries` when it backfills missing
 * derivable fields on existing entries.
 *
 * Conservative by design: a derivation that returns `undefined` is OMITTED
 * from specifics rather than written as `undefined`. The form then asks the
 * question normally — better to ask than to lock a guessed wrong answer.
 */
export function buildAutoSpecifics(input: {
	profileType: IncomeProfileType;
	isRegisteredInIndia: boolean;
	specificsTypeValue: string;
	ownershipPercent: number;
	companyContext?: CompanyContext;
}): Record<string, unknown> {
	const { profileType, isRegisteredInIndia, specificsTypeValue, ownershipPercent, companyContext } =
		input;

	if (profileType === 'director_company') {
		const specifics: Record<string, unknown> = {
			registeredInIndia: isRegisteredInIndia,
			companyType: specificsTypeValue,
			shareholding: ownershipPercent,
			// When the Company is a primary applicant in this case, we have its
			// full financials by definition — that's why it was added.
			companySharesFinancials: true
		};
		// Only auto-derive hasEquity when ownership is positively known.
		// A zero/missing ownershipPercent (common on restore-after-delete when the
		// recovered company doesn't match the target by UUID or name+entityType)
		// would otherwise lock hasEquity to false and disable the question, hiding
		// the dependent designation / shareholding / activeInOperations questions.
		// Better to let the user answer than to lock on a guessed false.
		if (ownershipPercent > 0) {
			specifics.hasEquity = true;
		}
		// Auto-fill designation from the director's role captured in DirectorFormModal.
		// Conservative mapping — only fill when the role is unambiguous so we never
		// lock the form on a wrong guess. DirectorFormModal captures 'managing_director'
		// or 'director' for Pvt Ltd; for the generic 'director' case the income form
		// stays editable so the DSA can pick the subtype (Whole-time / Additional / etc.).
		const mappedDesignation = mapDirectorDesignationToIncomeForm(companyContext?.directorRole);
		if (mappedDesignation) specifics.designation = mappedDesignation;
		const profitable = deriveCompanyProfitable(companyContext?.companyIncome);
		if (profitable !== undefined) specifics.companyProfitable = profitable;
		if (companyContext?.cin) specifics.cin = companyContext.cin;
		return specifics;
	}

	// business_partnership
	const specifics: Record<string, unknown> = {
		registeredInIndia: isRegisteredInIndia,
		firmType: specificsTypeValue,
		capitalContribution: ownershipPercent
	};
	const partnerType = derivePartnerType(companyContext?.directorRole);
	if (partnerType) specifics.partnerType = partnerType;
	const gstReg = deriveFirmGstRegistered(companyContext?.gstStatus);
	if (gstReg !== undefined) specifics.firmGstRegistered = gstReg;
	const profitable = deriveCompanyProfitable(companyContext?.companyIncome);
	if (profitable !== undefined) specifics.firmProfitable = profitable;
	return specifics;
}

// ── Batch Creation ───────────────────────────────────────────────

/**
 * Create income entries for all linked companies that don't already have one.
 * Looks up company name/type from the applicants array.
 *
 * @returns Array of NEW entries only (caller appends to existing)
 */
export function createDirectorIncomeEntries(
	linkedCompanyIds: string[],
	applicants: Array<Record<string, unknown>>,
	existingEntries: IncomeSourceEntry[],
	individualName?: string
): IncomeSourceEntry[] {
	const existingCompanyIds = new Set(
		existingEntries.filter((e) => e.autoCreated && e.sourceCompanyId).map((e) => e.sourceCompanyId!)
	);

	const newEntries: IncomeSourceEntry[] = [];

	for (const companyId of linkedCompanyIds) {
		if (existingCompanyIds.has(companyId)) continue;

		// Find company applicant to get name/type
		const company = applicants.find((a) => a.id === companyId && a.applicantType === 'Company');
		if (!company) continue;

		const companyName = (company.companyName as string) || (company.fullName as string) || '';
		const companyType = (company.companyType as string) || '';
		const registrationCountry = (company.registrationCountry as string) || '';

		// Look up the director's actual ownership % from the company's directors array
		// AND their role/designation (so partnership entries get partnerType auto-derived).
		let ownershipPercent = 0;
		let directorRole: string | undefined;
		const directors = (company.directors ?? []) as Array<{
			fullName?: string;
			ownershipPercent?: number;
			designation?: string;
			role?: string;
		}>;
		if (individualName && directors.length > 0) {
			const normName = individualName.trim().toLowerCase();
			const match = directors.find((d) => d.fullName?.trim().toLowerCase() === normName);
			if (match && typeof match.ownershipPercent === 'number') {
				ownershipPercent = match.ownershipPercent;
			}
			directorRole = match?.designation || match?.role;
		}

		const entry = createDirectorIncomeEntry(
			companyId,
			companyName,
			companyType,
			ownershipPercent,
			registrationCountry,
			{
				companyIncome: company.companyIncome as Record<string, unknown> | undefined,
				gstStatus: company.gstStatus as string | undefined,
				cin: company.cin as string | undefined,
				directorRole
			}
		);
		if (entry) newEntries.push(entry);
	}

	return newEntries;
}

// ── Orphan Logic (Company Deleted) ───────────────────────────────

/**
 * Orphan auto-created income entries when their source company is deleted.
 * Orphaned entries become fully editable and deletable by the DSA.
 * Does NOT remove entries — only flags them.
 *
 * @returns Full array with orphaned entries (nothing removed)
 */
export function orphanIncomeForCompany(
	incomeEntries: IncomeSourceEntry[],
	companyId: string,
	companyName: string
): IncomeSourceEntry[] {
	return incomeEntries.map((entry) => {
		if (entry.autoCreated && entry.sourceCompanyId === companyId) {
			return {
				...entry,
				autoCreated: false,
				orphaned: true,
				orphanedCompanyName: companyName,
				updatedAt: new Date().toISOString()
			};
		}
		return entry;
	});
}

// ── Full Sync ────────────────────────────────────────────────────

/**
 * Reconcile auto-income entries with current linked company IDs.
 * - Adds new auto-entries for companies not yet represented
 * - Orphans auto-entries for companies no longer linked
 * - Preserves all manual entries and already-orphaned entries untouched
 *
 * @returns Reconciled full array, or same reference if no changes needed
 */
export function syncAutoIncomeEntries(
	linkedCompanyIds: string[],
	applicants: Array<Record<string, unknown>>,
	existingEntries: IncomeSourceEntry[],
	individualName?: string
): IncomeSourceEntry[] {
	const linkedSet = new Set(linkedCompanyIds);
	let changed = false;

	// Step 1: Reconcile existing entries — orphan, update shareholding, migrate values, backfill fields.
	// All migration steps accumulate into a single updated entry per iteration (no early returns)
	// so an entry needing multiple fixes gets them all in one pass.
	const reconciled = existingEntries.map((entry) => {
		// Step 1a: Orphan auto-entries when the parent Company is no longer reachable —
		// EITHER its id was removed from this Individual's linkedCompanyIds, OR the
		// Company applicant itself no longer exists in formState.applicants (e.g.
		// after a cross-loan restore where the prior loan's company didn't carry over).
		// The second clause closes the cross-loan gap reported 2026-05-15: a director
		// restored into a new loan kept their auto-created director_company entry,
		// which forced selectedIncomeProfiles to include 'director_company' and
		// blocked the Next button when the user picked Salaried instead.
		const companyExists = entry.sourceCompanyId
			? applicants.some(
					(a) => a.id === entry.sourceCompanyId && a.applicantType === 'Company'
				)
			: false;
		if (
			entry.autoCreated &&
			entry.sourceCompanyId &&
			(!linkedSet.has(entry.sourceCompanyId) || !companyExists)
		) {
			const company = applicants.find((a) => a.id === entry.sourceCompanyId);
			const companyName =
				(company?.companyName as string) ||
				(company?.fullName as string) ||
				entry.entityName ||
				'Unknown Company';

			changed = true;
			return {
				...entry,
				autoCreated: false,
				orphaned: true,
				orphanedCompanyName: companyName,
				updatedAt: new Date().toISOString()
			};
		}

		// Step 1a-mismatch: Orphan auto-entries whose profileType no longer matches
		// the parent company's current type. Triggered when DSA changes companyType
		// on a Company applicant (e.g. Pvt Ltd → Partnership Firm) — the old
		// `director_company` entry is now stale; the loop's Step 2 will create a
		// fresh `business_partnership` entry. The orphaned entry's specifics stay
		// frozen as-is so the DSA can review or delete from the income page.
		// Per user direction (2026-05-04): "only lock what the latest selected and
		// free the previous one but don't delete the information ... user can
		// delete by himself ... but don't change the company type in his filled
		// detail for that income."
		if (entry.autoCreated && entry.sourceCompanyId && linkedSet.has(entry.sourceCompanyId)) {
			const company = applicants.find((a) => a.id === entry.sourceCompanyId);
			const currentCompanyType = (company?.companyType as string | undefined) ?? '';
			const expectedProfile = currentCompanyType
				? getProfileForCompanyType(currentCompanyType)
				: null;
			if (expectedProfile && expectedProfile !== entry.profileType) {
				const companyName =
					(company?.companyName as string) ||
					(company?.fullName as string) ||
					entry.entityName ||
					'Unknown Company';
				changed = true;
				return {
					...entry,
					autoCreated: false,
					orphaned: true,
					orphanedCompanyName: companyName,
					orphanedReason: 'company_type_changed' as const,
					updatedAt: new Date().toISOString()
				};
			}
		}

		// For active auto-entries: accumulate all fixes into updatedSpecifics
		if (!entry.autoCreated || !entry.sourceCompanyId) return entry;

		let updatedSpecifics = entry.specifics ? { ...entry.specifics } : {};
		let updatedEntityName = entry.entityName;
		let entryChanged = false;

		// Step 1a-name: Sync entityName from the parent Company applicant's current
		// name. The income table renders entry.entityName (IncomeSourceEntries.svelte)
		// and the IncomeSourceForm entityName input is locked on auto entries
		// (disabled={isAutoEntry}). Without this propagation, renaming the Company
		// leaves a stale name on every dependent director entry with no manual fix
		// path. The lookup uses sourceCompanyId, not the (now-stale) name, so this
		// is safe — id-linkage is the source of truth, entityName is display data.
		{
			const parent = applicants.find((a) => a.id === entry.sourceCompanyId);
			const currentCompanyName = parent
				? (((parent.companyName as string) || (parent.fullName as string)) ?? '').trim()
				: '';
			if (currentCompanyName && currentCompanyName !== entry.entityName) {
				updatedEntityName = currentCompanyName;
				entryChanged = true;
			}
		}

		// Step 1b: Sync shareholding from director data
		if (individualName) {
			const company = applicants.find((a) => a.id === entry.sourceCompanyId);
			if (company) {
				const directors = (company.directors ?? []) as Array<{
					fullName?: string;
					ownershipPercent?: number;
				}>;
				const normName = individualName.trim().toLowerCase();
				const match = directors.find((d) => d.fullName?.trim().toLowerCase() === normName);
				if (match && typeof match.ownershipPercent === 'number') {
					const currentShare =
						updatedSpecifics.shareholding ?? updatedSpecifics.capitalContribution;
					if (currentShare !== match.ownershipPercent) {
						const key =
							updatedSpecifics.shareholding !== undefined ? 'shareholding' : 'capitalContribution';
						updatedSpecifics[key] = match.ownershipPercent;
						entryChanged = true;
					}
				}
			}
		}

		// Step 1c: Migrate old-format specifics values to dropdown-compatible codes.
		// Entries created before the value mapping fix may have full names like
		// "Private Limited" instead of "pvt_ltd". Fix them in-place during sync.
		const typeKey =
			updatedSpecifics.companyType !== undefined
				? 'companyType'
				: updatedSpecifics.firmType !== undefined
					? 'firmType'
					: null;
		if (typeKey) {
			const oldValue = updatedSpecifics[typeKey] as string;
			const newValue = COMPANY_TYPE_TO_SPECIFICS_VALUE[oldValue];
			if (newValue && newValue !== oldValue) {
				updatedSpecifics[typeKey] = newValue;
				entryChanged = true;
			}
		}

		// Step 1d: Backfill registeredInIndia for entries created before the pre-fill fix.
		// Without this field, the Company type dropdown (gated via showWhen) stays blank.
		if (updatedSpecifics.registeredInIndia === undefined) {
			const company = applicants.find((a) => a.id === entry.sourceCompanyId);
			const country = (company?.registrationCountry as string) || '';
			updatedSpecifics.registeredInIndia = country !== 'Foreign';
			entryChanged = true;
		}

		// Step 1e: Backfill the extended derivable fields (hasEquity, companyProfitable,
		// companySharesFinancials, partnerType, firmGstRegistered, firmProfitable) for
		// entries created before this pre-fill landed. We only WRITE keys that are
		// currently absent — never overwrite a DSA-edited value, even on an auto entry.
		const company = applicants.find((a) => a.id === entry.sourceCompanyId);
		if (company) {
			const directors = (company.directors ?? []) as Array<{
				fullName?: string;
				ownershipPercent?: number;
				designation?: string;
				role?: string;
			}>;
			const normName = (individualName ?? '').trim().toLowerCase();
			const directorMatch = normName
				? directors.find((d) => d.fullName?.trim().toLowerCase() === normName)
				: undefined;
			const directorRole = directorMatch?.designation || directorMatch?.role;
			const ownership =
				typeof directorMatch?.ownershipPercent === 'number'
					? directorMatch.ownershipPercent
					: Number(updatedSpecifics.shareholding ?? updatedSpecifics.capitalContribution ?? 0) ||
						0;

			if (entry.profileType === 'director_company') {
				if (updatedSpecifics.hasEquity === undefined) {
					updatedSpecifics.hasEquity = ownership > 0;
					entryChanged = true;
				}
				if (updatedSpecifics.companySharesFinancials === undefined) {
					updatedSpecifics.companySharesFinancials = true;
					entryChanged = true;
				}
				// Sync `designation` against the parent applicant's directorRole.
				// Three reactive cases — must overwrite, not just fill, because
				// applicant-level corrections need to flow through to the income
				// entry (which is locked once non-empty via AUTO_LOCKED_KEYS):
				//   1. directorRole became 'managing_director' → set 'md'
				//      (overwrites any stale subtype if a DSA was promoted).
				//   2. directorRole is known AND current value is the stale 'md'
				//      from a prior MD assignment → CLEAR so the DSA can pick
				//      the correct subtype (Whole-time / Additional / Nominee /
				//      Independent). This is the "user fixed the
				//      only-one-MD-allowed error on Applicant Details" path.
				//   3. designation is undefined → fill if mapping resolves
				//      (preserves the original initial-sync behaviour).
				const mappedDesignation = mapDirectorDesignationToIncomeForm(directorRole);
				if (mappedDesignation === 'md') {
					if (updatedSpecifics.designation !== 'md') {
						updatedSpecifics.designation = 'md';
						entryChanged = true;
					}
				} else if (directorRole && updatedSpecifics.designation === 'md') {
					// directorRole is set to something OTHER than managing_director
					// but the entry still holds the stale 'md'. Clear it.
					updatedSpecifics.designation = undefined;
					entryChanged = true;
				} else if (updatedSpecifics.designation === undefined && mappedDesignation) {
					updatedSpecifics.designation = mappedDesignation;
					entryChanged = true;
				}
				if (updatedSpecifics.companyProfitable === undefined) {
					const profitable = deriveCompanyProfitable(
						company.companyIncome as Record<string, unknown> | undefined
					);
					if (profitable !== undefined) {
						updatedSpecifics.companyProfitable = profitable;
						entryChanged = true;
					}
				}
				if (updatedSpecifics.cin === undefined && company.cin) {
					updatedSpecifics.cin = company.cin;
					entryChanged = true;
				}
			} else if (entry.profileType === 'business_partnership') {
				if (updatedSpecifics.partnerType === undefined) {
					const partnerType = derivePartnerType(directorRole);
					if (partnerType) {
						updatedSpecifics.partnerType = partnerType;
						entryChanged = true;
					}
				}
				if (updatedSpecifics.firmGstRegistered === undefined) {
					const gstReg = deriveFirmGstRegistered(company.gstStatus as string | undefined);
					if (gstReg !== undefined) {
						updatedSpecifics.firmGstRegistered = gstReg;
						entryChanged = true;
					}
				}
				if (updatedSpecifics.firmProfitable === undefined) {
					const profitable = deriveCompanyProfitable(
						company.companyIncome as Record<string, unknown> | undefined
					);
					if (profitable !== undefined) {
						updatedSpecifics.firmProfitable = profitable;
						entryChanged = true;
					}
				}
			}
		}

		if (!entryChanged) return entry;

		changed = true;
		return {
			...entry,
			entityName: updatedEntityName,
			specifics: updatedSpecifics,
			updatedAt: new Date().toISOString()
		};
	});

	// Step 2: Add new auto-entries for companies not yet represented
	const newEntries = createDirectorIncomeEntries(
		linkedCompanyIds,
		applicants,
		reconciled,
		individualName
	);
	if (newEntries.length > 0) changed = true;

	if (!changed) return existingEntries;
	return [...reconciled, ...newEntries];
}
