/**
 * Tests for directorAutoIncome.ts — Auto-income entry management
 */

import { describe, it, expect } from 'vitest';
import {
	getProfileForCompanyType,
	createDirectorIncomeEntry,
	createDirectorIncomeEntries,
	orphanIncomeForCompany,
	syncAutoIncomeEntries,
	buildAutoSpecifics,
	AUTO_DERIVED_INFRA_KEYS
} from '$lib/utils/directorAutoIncome';
import type { IncomeSourceEntry } from '$lib/types/incomeProfile';

// ── Helpers ──────────────────────────────────────────────────────

function makeCompanyApplicant(
	id: string,
	companyName: string,
	companyType: string
): Record<string, unknown> {
	return { id, applicantType: 'Company', companyName, companyType };
}

function makeAutoEntry(
	id: string,
	profileType: string,
	companyId: string,
	entityName = 'Test Company'
): IncomeSourceEntry {
	return {
		id,
		profileType: profileType as any,
		entityName,
		specifics: { registeredInIndia: true },
		income: {},
		evidence: { itrFiled: false, hasDocumentaryEvidence: false },
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		filledBy: 'dsa',
		autoCreated: true,
		sourceCompanyId: companyId
	};
}

function makeManualEntry(
	id: string,
	profileType: string,
	entityName = 'Manual Source'
): IncomeSourceEntry {
	return {
		id,
		profileType: profileType as any,
		entityName,
		specifics: {},
		income: {},
		evidence: { itrFiled: false, hasDocumentaryEvidence: false },
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		filledBy: 'dsa'
	};
}

// ══════════════════════════════════════════════════════════════════
// getProfileForCompanyType
// ══════════════════════════════════════════════════════════════════

describe('getProfileForCompanyType', () => {
	it('maps Private Limited to director_company', () => {
		expect(getProfileForCompanyType('Private Limited')).toBe('director_company');
	});

	it('maps OPC to director_company', () => {
		expect(getProfileForCompanyType('One Person Company (OPC)')).toBe('director_company');
	});

	it('maps Public Limited to director_company', () => {
		expect(getProfileForCompanyType('Public Limited')).toBe('director_company');
	});

	it('maps Section 8 to director_company', () => {
		expect(getProfileForCompanyType('Section 8')).toBe('director_company');
	});

	it('maps Partnership Firm to business_partnership', () => {
		expect(getProfileForCompanyType('Partnership Firm')).toBe('business_partnership');
	});

	it('maps LLP to business_partnership', () => {
		expect(getProfileForCompanyType('LLP')).toBe('business_partnership');
	});

	it('returns null for unknown company types', () => {
		expect(getProfileForCompanyType('Unknown Type')).toBeNull();
	});
});

// ══════════════════════════════════════════════════════════════════
// createDirectorIncomeEntry
// ══════════════════════════════════════════════════════════════════

describe('createDirectorIncomeEntry', () => {
	it('creates director_company entry for Pvt Ltd with default specifics', () => {
		const entry = createDirectorIncomeEntry('c1', 'Acme Pvt Ltd', 'Private Limited', 60);
		expect(entry).not.toBeNull();
		expect(entry!.profileType).toBe('director_company');
		expect(entry!.entityName).toBe('Acme Pvt Ltd');
		expect(entry!.autoCreated).toBe(true);
		expect(entry!.sourceCompanyId).toBe('c1');
		expect(entry!.specifics).toEqual({
			registeredInIndia: true,
			companyType: 'pvt_ltd',
			shareholding: 60,
			hasEquity: true,
			companySharesFinancials: true
		});
	});

	it('creates business_partnership entry for LLP with default specifics', () => {
		const entry = createDirectorIncomeEntry('c2', 'XYZ LLP', 'LLP', 40);
		expect(entry).not.toBeNull();
		expect(entry!.profileType).toBe('business_partnership');
		expect(entry!.specifics).toEqual({
			registeredInIndia: true,
			firmType: 'llp',
			capitalContribution: 40
		});
	});

	it('returns null for unknown company types', () => {
		const entry = createDirectorIncomeEntry('c3', 'Weird Co', 'Unknown Type', 0);
		expect(entry).toBeNull();
	});

	it('creates entry for OPC with 100% ownership', () => {
		const entry = createDirectorIncomeEntry('c4', 'Solo OPC', 'One Person Company (OPC)', 100);
		expect(entry).not.toBeNull();
		expect(entry!.profileType).toBe('director_company');
		expect(entry!.specifics.shareholding).toBe(100);
		expect(entry!.specifics.hasEquity).toBe(true);
	});

	it('hasEquity is left UNSET when ownership is 0/missing (so the form asks the user)', () => {
		// Burned us in S103: on restore-after-delete, ownershipPercent is often 0
		// because the recovered company didn't match by UUID/name. Auto-deriving
		// hasEquity = false then locked the question (it's in AUTO_LOCKED_KEYS),
		// hiding designation / shareholding / activeInOperations forever. The
		// safer default is to leave hasEquity unset so the user picks Yes/No
		// themselves — zero-stake nominee directors are rare enough to ask.
		const entry = createDirectorIncomeEntry('c1', 'Acme', 'Private Limited', 0);
		expect(entry!.specifics.hasEquity).toBeUndefined();
	});

	it('derives companyProfitable=true from a 3-year ITR with all positive net profit', () => {
		const entry = createDirectorIncomeEntry('c1', 'Acme', 'Private Limited', 50, 'India', {
			companyIncome: {
				itr: {
					years: [
						{ year: 'FY2024-25', itrFiled: true, netProfit: 750000 },
						{ year: 'FY2023-24', itrFiled: true, netProfit: 750000 },
						{ year: 'FY2022-23', itrFiled: true, netProfit: 800000 }
					]
				}
			}
		});
		expect(entry!.specifics.companyProfitable).toBe(true);
	});

	it('derives companyProfitable=false when any filed ITR year has zero/negative profit', () => {
		const entry = createDirectorIncomeEntry('c1', 'Acme', 'Private Limited', 50, 'India', {
			companyIncome: {
				itr: {
					years: [
						{ year: 'FY2024-25', itrFiled: true, netProfit: 750000 },
						{ year: 'FY2023-24', itrFiled: true, netProfit: -100000 }
					]
				}
			}
		});
		expect(entry!.specifics.companyProfitable).toBe(false);
	});

	it('omits companyProfitable when fewer than 2 filed ITR years are available', () => {
		const entry = createDirectorIncomeEntry('c1', 'Acme', 'Private Limited', 50, 'India', {
			companyIncome: {
				itr: {
					years: [{ year: 'FY2024-25', itrFiled: true, netProfit: 750000 }]
				}
			}
		});
		expect(entry!.specifics.companyProfitable).toBeUndefined();
	});

	it('passes through cin when supplied', () => {
		const entry = createDirectorIncomeEntry('c1', 'Acme', 'Private Limited', 50, 'India', {
			cin: 'U72200KA2020PTC123456'
		});
		expect(entry!.specifics.cin).toBe('U72200KA2020PTC123456');
	});

	it('partnership entry derives partnerType + firmGstRegistered + firmProfitable', () => {
		const entry = createDirectorIncomeEntry('c2', 'Acme LLP', 'LLP', 50, 'India', {
			directorRole: 'designated_partner',
			gstStatus: 'registered_regular',
			companyIncome: {
				itr: {
					years: [
						{ itrFiled: true, netProfit: 500000 },
						{ itrFiled: true, netProfit: 600000 }
					]
				}
			}
		});
		expect(entry!.specifics.partnerType).toBe('designated');
		expect(entry!.specifics.firmGstRegistered).toBe(true);
		expect(entry!.specifics.firmProfitable).toBe(true);
	});

	it('partnership entry omits firmGstRegistered when company gstStatus is unknown', () => {
		const entry = createDirectorIncomeEntry('c2', 'Acme LLP', 'LLP', 50, 'India', {
			directorRole: 'partner'
		});
		expect(entry!.specifics.partnerType).toBe('active');
		expect(entry!.specifics.firmGstRegistered).toBeUndefined();
	});

	it('leaves income fields empty', () => {
		const entry = createDirectorIncomeEntry('c1', 'Test', 'Private Limited', 50);
		expect(entry!.income).toEqual({});
	});

	it('sets filledBy to dsa', () => {
		const entry = createDirectorIncomeEntry('c1', 'Test', 'Private Limited', 50);
		expect(entry!.filledBy).toBe('dsa');
	});
});

// ══════════════════════════════════════════════════════════════════
// createDirectorIncomeEntries
// ══════════════════════════════════════════════════════════════════

describe('createDirectorIncomeEntries', () => {
	const applicants = [
		makeCompanyApplicant('c1', 'Acme Pvt Ltd', 'Private Limited'),
		makeCompanyApplicant('c2', 'XYZ LLP', 'LLP'),
		makeCompanyApplicant('c3', 'Unknown Co', 'Unknown Type')
	];

	it('creates entries for each linked company', () => {
		const result = createDirectorIncomeEntries(['c1', 'c2'], applicants, []);
		expect(result).toHaveLength(2);
		expect(result[0].profileType).toBe('director_company');
		expect(result[1].profileType).toBe('business_partnership');
	});

	it('skips companies that already have entries', () => {
		const existing = [makeAutoEntry('e1', 'director_company', 'c1')];
		const result = createDirectorIncomeEntries(['c1', 'c2'], applicants, existing);
		expect(result).toHaveLength(1);
		expect(result[0].sourceCompanyId).toBe('c2');
	});

	it('skips unsupported company types (no auto-income)', () => {
		const result = createDirectorIncomeEntries(['c3'], applicants, []);
		expect(result).toHaveLength(0);
	});

	it('returns empty array when all companies already have entries', () => {
		const existing = [
			makeAutoEntry('e1', 'director_company', 'c1'),
			makeAutoEntry('e2', 'business_partnership', 'c2')
		];
		const result = createDirectorIncomeEntries(['c1', 'c2'], applicants, existing);
		expect(result).toHaveLength(0);
	});

	it('creates 3 entries for 3-company director', () => {
		const apps = [
			makeCompanyApplicant('c1', 'A Pvt Ltd', 'Private Limited'),
			makeCompanyApplicant('c2', 'B LLP', 'LLP'),
			makeCompanyApplicant('c4', 'C OPC', 'One Person Company (OPC)')
		];
		const result = createDirectorIncomeEntries(['c1', 'c2', 'c4'], apps, []);
		expect(result).toHaveLength(3);
		expect(result.map((e) => e.sourceCompanyId)).toEqual(['c1', 'c2', 'c4']);
	});

	// ── Business Loan parity: OPC + Director auto-income (HL/BL gap) ────
	// Pre-fix (2026-05-23): BL's `AddApplicantBusiness.handleDirectorSave` only
	// committed directors to applicants; it never called `syncAutoIncomeEntries`.
	// HL goes through `applicantFormManager` which does both, so HL directors
	// got a pre-created locked income row with sourceCompanyId set; BL didn't
	// — the Director modal's Income Details tab showed "No income sources
	// added yet" and the Director-in-Company income form had no company link.
	// These tests assert the pure-utility shape used by both flows.
	it('BL parity: OPC company yields a director_company entry with sourceCompanyId set', () => {
		// Identical setup to the reported BL scenario: 1 OPC company applicant
		// "eyantrik", individual "prashant" is the sole director with 100% stake.
		const opcId = 'opc-eyantrik';
		const apps = [
			{
				id: opcId,
				applicantType: 'Company',
				companyName: 'eyantrik',
				companyType: 'One Person Company (OPC)',
				registrationCountry: 'India',
				directors: [{ fullName: 'prashant', ownershipPercent: 100, designation: 'managing_director' }]
			}
		];
		const result = createDirectorIncomeEntries([opcId], apps, [], 'prashant');
		expect(result, 'auto-creation must run for OPC same as HL').toHaveLength(1);
		const entry = result[0];
		expect(entry.profileType).toBe('director_company');
		expect(entry.entityName).toBe('eyantrik');
		expect(entry.autoCreated, 'must be flagged as auto-created so UI locks the row').toBe(true);
		// Pitfall #44: sourceCompanyId MUST be set so the company combobox
		// auto-links and the entity field doesn't allow conflicting free text.
		expect(entry.sourceCompanyId, 'sourceCompanyId must link to the Company applicant').toBe(opcId);
		// Specifics must be pre-filled with the locked company fields so the
		// Director's income form shows designation/shareholding/active/itr
		// (the four HL renders), not just the gate question.
		expect(entry.specifics.registeredInIndia).toBe(true);
		expect(entry.specifics.companyType).toBe('opc');
		expect(entry.specifics.shareholding).toBe(100);
		expect(entry.specifics.hasEquity).toBe(true);
		expect(entry.specifics.designation, 'MD designation maps from managing_director role').toBe(
			'md'
		);
		expect(entry.specifics.companySharesFinancials).toBe(true);
	});

	it('BL parity: Pvt Ltd company yields the same locked specifics as HL', () => {
		// Same as above but Pvt Ltd — equivalent to a Business Loan with multiple
		// directors. Asserts that the underlying utility is loan-type-agnostic
		// (the bug was purely in the WIRING — directorAutoIncome itself is fine).
		const compId = 'pvt-ltd-1';
		const apps = [
			{
				id: compId,
				applicantType: 'Company',
				companyName: 'Acme Pvt Ltd',
				companyType: 'Private Limited',
				registrationCountry: 'India',
				directors: [{ fullName: 'Director One', ownershipPercent: 60, designation: 'managing_director' }]
			}
		];
		const result = createDirectorIncomeEntries([compId], apps, [], 'Director One');
		expect(result).toHaveLength(1);
		const entry = result[0];
		expect(entry.sourceCompanyId).toBe(compId);
		expect(entry.specifics.companyType).toBe('pvt_ltd');
		expect(entry.specifics.shareholding).toBe(60);
		expect(entry.specifics.hasEquity).toBe(true);
		expect(entry.specifics.designation).toBe('md');
	});
});

// ══════════════════════════════════════════════════════════════════
// orphanIncomeForCompany
// ══════════════════════════════════════════════════════════════════

describe('orphanIncomeForCompany', () => {
	it('orphans auto-created entries for the specified company', () => {
		const entries = [makeAutoEntry('e1', 'director_company', 'c1', 'Acme')];
		const result = orphanIncomeForCompany(entries, 'c1', 'Acme Pvt Ltd');
		expect(result).toHaveLength(1);
		expect(result[0].autoCreated).toBe(false);
		expect(result[0].orphaned).toBe(true);
		expect(result[0].orphanedCompanyName).toBe('Acme Pvt Ltd');
	});

	it('does not touch manual entries', () => {
		const entries = [makeManualEntry('e1', 'salaried_regular', 'My Job')];
		const result = orphanIncomeForCompany(entries, 'c1', 'Acme');
		expect(result[0]).toEqual(entries[0]);
	});

	it('does not touch auto-entries from other companies', () => {
		const entries = [makeAutoEntry('e1', 'director_company', 'c2', 'Other')];
		const result = orphanIncomeForCompany(entries, 'c1', 'Acme');
		expect(result[0].autoCreated).toBe(true);
		expect(result[0].orphaned).toBeUndefined();
	});

	it('handles mixed entries correctly', () => {
		const entries = [
			makeAutoEntry('e1', 'director_company', 'c1', 'Acme'),
			makeAutoEntry('e2', 'business_partnership', 'c2', 'XYZ'),
			makeManualEntry('e3', 'salaried_regular', 'Job')
		];
		const result = orphanIncomeForCompany(entries, 'c1', 'Acme Pvt Ltd');
		expect(result[0].orphaned).toBe(true);
		expect(result[1].autoCreated).toBe(true);
		expect(result[1].orphaned).toBeUndefined();
		expect(result[2].autoCreated).toBeUndefined();
	});
});

// ══════════════════════════════════════════════════════════════════
// syncAutoIncomeEntries
// ══════════════════════════════════════════════════════════════════

describe('syncAutoIncomeEntries', () => {
	const applicants = [
		makeCompanyApplicant('c1', 'Acme Pvt Ltd', 'Private Limited'),
		makeCompanyApplicant('c2', 'XYZ LLP', 'LLP'),
		makeCompanyApplicant('c3', 'Solo OPC', 'One Person Company (OPC)')
	];

	it('adds new entries for unrepresented companies', () => {
		const result = syncAutoIncomeEntries(['c1', 'c2'], applicants, []);
		expect(result).toHaveLength(2);
	});

	it('orphans entries for removed companies', () => {
		const existing = [
			makeAutoEntry('e1', 'director_company', 'c1', 'Acme'),
			makeAutoEntry('e2', 'business_partnership', 'c2', 'XYZ')
		];
		// c2 removed
		const result = syncAutoIncomeEntries(['c1'], applicants, existing);
		expect(result.find((e) => e.sourceCompanyId === 'c1')!.autoCreated).toBe(true);
		expect(result.find((e) => e.sourceCompanyId === 'c2')!.orphaned).toBe(true);
	});

	it('orphans entries whose parent Company applicant no longer exists (cross-loan leak)', () => {
		// Reproduces CLAUDE.md Pitfall #22: a director restored across loans keeps
		// linkedCompanyIds = [opcId] from the prior loan even though the OPC
		// Company applicant is no longer in formState.applicants. Without this
		// second-gate orphan check, the stale auto-entry forces the user's
		// selectedIncomeProfiles to include 'director_company' and blocks Next.
		const orphanedApplicants: Array<Record<string, unknown>> = [
			// The Individual's linkedCompanyIds still includes 'gone-opc-id',
			// but the OPC Company applicant has been removed from this list.
			// (Pre-S103 syncAutoIncomeEntries would leave this entry active
			// because linkedSet.has('gone-opc-id') === true.)
		];
		const existing = [makeAutoEntry('e1', 'director_company', 'gone-opc-id', 'GhostCorp')];
		const result = syncAutoIncomeEntries(['gone-opc-id'], orphanedApplicants, existing);
		expect(
			result[0].orphaned,
			'auto-entry must orphan when its sourceCompanyId is not in applicants[] — even if it is still in linkedCompanyIds'
		).toBe(true);
		expect(result[0].autoCreated).toBe(false);
	});

	it('orphans + replaces when company type changes to a different income profile', () => {
		// Setup: Company c1 was Pvt Ltd, director got auto director_company entry.
		// DSA changes c1.companyType to "Partnership Firm". The old entry's
		// profileType (director_company) no longer matches the new expected
		// profile (business_partnership) — orphan the old, create new.
		const cAfterChange = [
			makeCompanyApplicant('c1', 'Acme', 'Partnership Firm'),
			...applicants.filter((a) => a.id !== 'c1')
		];
		const oldEntry = {
			...makeAutoEntry('e1', 'director_company', 'c1', 'Acme'),
			specifics: {
				registeredInIndia: true,
				companyType: 'pvt_ltd', // ← stale value; user said don't mutate
				shareholding: 50,
				hasEquity: true,
				companySharesFinancials: true
			}
		};
		const result = syncAutoIncomeEntries(['c1'], cAfterChange, [oldEntry]);

		// Old entry orphaned, specifics preserved untouched
		const orphaned = result.find((e) => e.id === 'e1');
		expect(orphaned).toBeDefined();
		expect(orphaned!.autoCreated).toBe(false);
		expect(orphaned!.orphaned).toBe(true);
		expect(orphaned!.orphanedReason).toBe('company_type_changed');
		expect(orphaned!.profileType).toBe('director_company'); // unchanged
		expect(orphaned!.specifics.companyType).toBe('pvt_ltd'); // unchanged — stays as DSA last saw it
		expect(orphaned!.specifics.shareholding).toBe(50);

		// New entry auto-created for the new profile, locked
		const fresh = result.find((e) => e.profileType === 'business_partnership');
		expect(fresh).toBeDefined();
		expect(fresh!.autoCreated).toBe(true);
		expect(fresh!.sourceCompanyId).toBe('c1');
		expect(fresh!.specifics.firmType).toBe('partnership');
	});

	it('does NOT orphan when company type changes to one that maps to the SAME profile', () => {
		// Pvt Ltd → OPC: both map to director_company. The entry stays active;
		// only `companyType` value within specifics may need migration via Step 1c.
		const cWithOpc = [
			makeCompanyApplicant('c1', 'Solo Inc', 'One Person Company (OPC)'),
			...applicants.filter((a) => a.id !== 'c1')
		];
		const oldEntry = {
			...makeAutoEntry('e1', 'director_company', 'c1', 'Solo Inc'),
			specifics: {
				registeredInIndia: true,
				companyType: 'pvt_ltd',
				shareholding: 100,
				hasEquity: true,
				companySharesFinancials: true
			}
		};
		const result = syncAutoIncomeEntries(['c1'], cWithOpc, [oldEntry]);
		const entry = result.find((e) => e.id === 'e1');
		expect(entry!.autoCreated).toBe(true); // still active
		expect(entry!.orphaned).toBeUndefined();
	});

	it('does NOT orphan when current company has no companyType set', () => {
		// Half-filled new Company applicant — the type isn't decided yet.
		// Leave existing auto entries alone rather than orphaning prematurely.
		const cIncomplete = [
			{ id: 'c1', applicantType: 'Company', companyName: 'Acme' }, // no companyType
			...applicants.filter((a) => a.id !== 'c1')
		];
		const oldEntry = makeAutoEntry('e1', 'director_company', 'c1', 'Acme');
		const result = syncAutoIncomeEntries(['c1'], cIncomplete, [oldEntry]);
		const entry = result.find((e) => e.id === 'e1');
		expect(entry!.autoCreated).toBe(true);
		expect(entry!.orphaned).toBeUndefined();
	});

	it('preserves manual entries', () => {
		const existing = [
			makeAutoEntry('e1', 'director_company', 'c1'),
			makeManualEntry('e2', 'salaried_regular', 'My Salary')
		];
		const result = syncAutoIncomeEntries(['c1'], applicants, existing);
		const manual = result.find((e) => e.id === 'e2');
		expect(manual).toBeDefined();
		expect(manual!.profileType).toBe('salaried_regular');
	});

	it('returns same reference when no changes needed', () => {
		// Fixture must already contain every auto-fillable field, otherwise
		// backfill (Step 1d/1e in syncAutoIncomeEntries) would add them and
		// produce a new reference. Mirror what createDirectorIncomeEntry would
		// have written for a Pvt Ltd director with no extra company context.
		// entityName must also match applicants[0].companyName ('Acme Pvt Ltd')
		// — Step 1a-name renames mismatched names to track the parent Company.
		const existing = [
			{
				...makeAutoEntry('e1', 'director_company', 'c1', 'Acme Pvt Ltd'),
				specifics: {
					registeredInIndia: true,
					companyType: 'pvt_ltd',
					shareholding: 50,
					hasEquity: true,
					companySharesFinancials: true
				}
			}
		];
		const result = syncAutoIncomeEntries(['c1'], applicants, existing);
		expect(result).toBe(existing); // Same reference = no changes
	});

	it('backfills registeredInIndia for entries created before the pre-fill fix', () => {
		const oldEntry: IncomeSourceEntry = {
			...makeAutoEntry('e1', 'director_company', 'c1'),
			specifics: { companyType: 'pvt_ltd', shareholding: 25 }
			// Note: no registeredInIndia — simulates entries created before the fix
		};
		const result = syncAutoIncomeEntries(['c1'], applicants, [oldEntry]);
		const updated = result.find((e) => e.id === 'e1');
		expect(updated!.specifics.registeredInIndia).toBe(true);
	});

	it('applies shareholding + value migration + registeredInIndia in a single pass', () => {
		const oldEntry: IncomeSourceEntry = {
			...makeAutoEntry('e1', 'director_company', 'c1'),
			specifics: { companyType: 'Private Limited', shareholding: 10 }
			// Needs: value migration (Private Limited → pvt_ltd) + registeredInIndia backfill
			// Director in applicants has ownershipPercent 25, so shareholding also updates
		};
		const applicantsWithOwnership = [
			{
				id: 'c1',
				applicantType: 'Company',
				companyName: 'Acme',
				companyType: 'Private Limited',
				registrationCountry: 'India',
				directors: [{ fullName: 'Raj Kumar', ownershipPercent: 25 }]
			},
			{ id: 'c2', applicantType: 'Company', companyName: 'Beta', companyType: 'LLP' },
			{ id: 'c3', applicantType: 'Company', companyName: 'Gamma', companyType: 'Partnership Firm' }
		];
		const result = syncAutoIncomeEntries(['c1'], applicantsWithOwnership, [oldEntry], 'Raj Kumar');
		const updated = result.find((e) => e.id === 'e1');
		// All three fixes applied in one pass
		expect(updated!.specifics.shareholding).toBe(25); // Step 1b: updated
		expect(updated!.specifics.companyType).toBe('pvt_ltd'); // Step 1c: migrated
		expect(updated!.specifics.registeredInIndia).toBe(true); // Step 1d: backfilled
	});

	it('handles full reconciliation (add + orphan)', () => {
		const existing = [
			makeAutoEntry('e1', 'director_company', 'c1', 'Acme'),
			makeManualEntry('e2', 'pension', 'Pension')
		];
		// c1 removed, c2 + c3 added
		const result = syncAutoIncomeEntries(['c2', 'c3'], applicants, existing);

		const orphaned = result.find((e) => e.id === 'e1');
		expect(orphaned!.orphaned).toBe(true);

		const pension = result.find((e) => e.id === 'e2');
		expect(pension!.profileType).toBe('pension');

		const newEntries = result.filter((e) => e.autoCreated);
		expect(newEntries).toHaveLength(2);
		expect(newEntries.map((e) => e.sourceCompanyId).sort()).toEqual(['c2', 'c3']);
	});

	it('does not orphan already-orphaned entries', () => {
		const orphanedEntry: IncomeSourceEntry = {
			...makeAutoEntry('e1', 'director_company', 'c1'),
			autoCreated: false,
			orphaned: true,
			orphanedCompanyName: 'Old Company'
		};
		const result = syncAutoIncomeEntries(['c2'], applicants, [orphanedEntry]);
		// The orphaned entry should be preserved as-is (not double-orphaned)
		const found = result.find((e) => e.id === 'e1');
		expect(found!.orphaned).toBe(true);
		expect(found!.orphanedCompanyName).toBe('Old Company');
	});

	// ── entityName sync on Company rename ──────────────────────────
	// CLAUDE.md Pitfall #29 — entityName is cached at create-time and the form
	// field is locked on auto entries (IncomeSourceForm.svelte:1005), so without
	// in-sync propagation a Company rename leaves stale display names on every
	// dependent director entry with no manual fix path.
	describe('entityName sync on Company rename', () => {
		it('refreshes entityName on active auto-entries when the parent Company is renamed', () => {
			const stale = makeAutoEntry('e1', 'director_company', 'c1', 'Original');
			// Caller's applicants list reflects the new name "Original updated"
			const renamed = [
				{ ...makeCompanyApplicant('c1', 'Original updated', 'Private Limited') }
			];
			const result = syncAutoIncomeEntries(['c1'], renamed, [stale], 'Director Name');
			const entry = result.find((e) => e.id === 'e1');
			expect(entry!.entityName).toBe('Original updated');
			expect(entry!.autoCreated).toBe(true);
		});

		it('does not change entityName when the parent Company name has not changed', () => {
			const entry = makeAutoEntry('e1', 'director_company', 'c1', 'Acme Pvt Ltd');
			const result = syncAutoIncomeEntries(['c1'], applicants, [entry], 'Director');
			// applicants[0].companyName === 'Acme Pvt Ltd' → entityName must stay
			// exact. (Other Step 1e backfills like hasEquity may still fire — those
			// are tested separately; this assertion focuses on the name contract.)
			const found = result.find((e) => e.id === 'e1');
			expect(found!.entityName).toBe('Acme Pvt Ltd');
		});

		it('does NOT rename orphaned entries — they snapshot the company at orphan-time', () => {
			const orphaned: IncomeSourceEntry = {
				...makeAutoEntry('e1', 'director_company', 'c1', 'Original'),
				autoCreated: false,
				orphaned: true,
				orphanedCompanyName: 'Original'
			};
			const renamed = [
				{ ...makeCompanyApplicant('c1', 'Original updated', 'Private Limited') }
			];
			const result = syncAutoIncomeEntries(['c1'], renamed, [orphaned], 'Director Name');
			// Orphaned entries are frozen — they no longer track the live company name.
			const entry = result.find((e) => e.id === 'e1');
			expect(entry!.entityName).toBe('Original');
			expect(entry!.orphanedCompanyName).toBe('Original');
		});

		it('falls back to fullName when the Company applicant has no companyName', () => {
			// Some legacy / unnamed-company applicants store the name on `fullName`
			// instead of `companyName`. Sync should honor the fallback in either order.
			const stale = makeAutoEntry('e1', 'director_company', 'c1', 'Old Name');
			const renamedByFullName: Array<Record<string, unknown>> = [
				{ id: 'c1', applicantType: 'Company', fullName: 'New Name', companyType: 'Private Limited' }
			];
			const result = syncAutoIncomeEntries(['c1'], renamedByFullName, [stale], 'Director');
			const entry = result.find((e) => e.id === 'e1');
			expect(entry!.entityName).toBe('New Name');
		});
	});
});

// ══════════════════════════════════════════════════════════════════
// NRI Bug Fix — profileCards showWhen
// ══════════════════════════════════════════════════════════════════

describe('NRI salaried professional bug fix', () => {
	// Import the actual profile cards to verify showWhen conditions
	it('professional_practice requires non-NRI AND non-low education', async () => {
		const { INCOME_PROFILE_CARDS } = await import('$lib/config/incomeProfiles/profileCards');
		const practiceCard = INCOME_PROFILE_CARDS.find((c) => c.type === 'professional_practice');
		expect(practiceCard).toBeDefined();
		expect(practiceCard!.showWhen).toBeDefined();

		// Should check both NRI and education
		const showWhen = practiceCard!.showWhen as Record<string, unknown>;
		expect(showWhen).toHaveProperty('and');
		const conditions = (showWhen as any).and as any[];
		expect(conditions).toHaveLength(2);
		expect(conditions[0]).toEqual({ '==': ['isNRI', 'No'] });
		expect(conditions[1]).toHaveProperty('not');
	});

	it('salaried_regular has no showWhen restriction', async () => {
		const { INCOME_PROFILE_CARDS } = await import('$lib/config/incomeProfiles/profileCards');
		const salariedCard = INCOME_PROFILE_CARDS.find((c) => c.type === 'salaried_regular');
		expect(salariedCard).toBeDefined();
		expect(salariedCard!.showWhen).toBeUndefined();
	});

});

// ══════════════════════════════════════════════════════════════════
// Specifics value mapping — income form dropdown compatibility
// ══════════════════════════════════════════════════════════════════

describe('specifics value mapping for income form dropdowns', () => {
	it('Pvt Ltd specifics use short code pvt_ltd, not full name', () => {
		const entry = createDirectorIncomeEntry('c1', 'Test Co', 'Private Limited', 50);
		expect(entry!.specifics.companyType).toBe('pvt_ltd');
	});

	it('OPC specifics use short code opc', () => {
		const entry = createDirectorIncomeEntry('c1', 'Solo Co', 'One Person Company (OPC)', 100);
		expect(entry!.specifics.companyType).toBe('opc');
	});

	it('Partnership specifics use short code partnership for firmType', () => {
		const entry = createDirectorIncomeEntry('c1', 'XYZ Partners', 'Partnership Firm', 40);
		expect(entry!.specifics.firmType).toBe('partnership');
	});

	it('LLP specifics use short code llp for firmType', () => {
		const entry = createDirectorIncomeEntry('c1', 'ABC LLP', 'LLP', 33);
		expect(entry!.specifics.firmType).toBe('llp');
	});

	it('Public Limited specifics use short code public_ltd', () => {
		const entry = createDirectorIncomeEntry('c1', 'Big Corp', 'Public Limited', 5);
		expect(entry!.specifics.companyType).toBe('public_ltd');
	});

	it('Section 8 specifics use short code section_8', () => {
		const entry = createDirectorIncomeEntry('c1', 'NGO Ltd', 'Section 8', 25);
		expect(entry!.specifics.companyType).toBe('section_8');
	});

	it('unknown company type passes through as-is', () => {
		const entry = createDirectorIncomeEntry('c1', 'Mystery Co', 'Unknown Type' as any, 10);
		// Unknown type doesn't map to a profile, so returns null
		expect(entry).toBeNull();
	});

	it('shareholding/capitalContribution values are preserved', () => {
		const dirEntry = createDirectorIncomeEntry('c1', 'Dir Co', 'Private Limited', 75);
		expect(dirEntry!.specifics.shareholding).toBe(75);

		const partnerEntry = createDirectorIncomeEntry('c2', 'Partner Co', 'Partnership Firm', 45);
		expect(partnerEntry!.specifics.capitalContribution).toBe(45);
	});
});

// ── AUTO_DERIVED_INFRA_KEYS Parity Tests ─────────────────────────────
//
// `applicantFormManager.applyDirectorRestore` uses AUTO_DERIVED_INFRA_KEYS to
// decide which keys to FILTER OUT from recovered specifics merges. The intent:
//
//   - Truly immutable "infra" keys (companyType, registeredInIndia, cin, ...)
//     ⇒ ALWAYS derived from current company state, never restored
//   - User-overridable keys (hasEquity, designation, companyProfitable, ...)
//     ⇒ Restored from recovery if user changed them
//
// These tests pin the inventory so a developer who adds a new key to
// `buildAutoSpecifics` is FORCED to make an explicit decision: which category
// is this key? Update KNOWN_BUILD_AUTO_SPECIFICS_KEYS and, if it's infra, also
// add to AUTO_DERIVED_INFRA_KEYS.
//
// When this test fails, do NOT just bump the snapshot — first decide whether
// the new key belongs in AUTO_DERIVED_INFRA_KEYS.

/**
 * Frozen inventory of every key `buildAutoSpecifics` is permitted to produce.
 * Update DELIBERATELY when adding a new auto-derivation in directorAutoIncome.ts.
 *
 * Split by category to make the infra-vs-overridable decision explicit at
 * snapshot-update time.
 */
const KNOWN_BUILD_AUTO_SPECIFICS_KEYS = {
	/** Immutable infra — MUST also appear in AUTO_DERIVED_INFRA_KEYS */
	infra: ['registeredInIndia', 'companyType', 'firmType', 'shareholding',
		'capitalContribution', 'companySharesFinancials', 'cin'] as const,
	/** User-overridable — derived initially but user can change, survives recovery */
	overridable: ['hasEquity', 'designation', 'companyProfitable', 'partnerType',
		'firmGstRegistered', 'firmProfitable'] as const
} as const;

/**
 * Run buildAutoSpecifics under every input shape combination that toggles a
 * conditional key, then collect the union of all keys produced. This gives
 * the live "what does buildAutoSpecifics actually emit" set, which we
 * compare against the frozen inventory.
 */
function collectAllProducedKeys(): Set<string> {
	const produced = new Set<string>();
	const profiles = ['director_company', 'business_partnership'] as const;
	// Vary inputs so every conditional branch fires at least once:
	// - directorRole 'managing_director' enables designation (via mapDirectorDesignationToIncomeForm)
	// - directorRole 'partner' / 'designated_partner' enables partnerType
	// - companyIncome with 2+ filed ITR years enables companyProfitable / firmProfitable
	// - cin 'L...' enables the cin assignment
	// - gstStatus 'registered_*' / 'unregistered' enables firmGstRegistered
	const profitableItr = {
		itr: {
			years: [
				{ itrFiled: true, netProfit: 1_00_000 },
				{ itrFiled: true, netProfit: 2_00_000 }
			]
		}
	};
	const contexts = [
		undefined, // no context — minimum keys
		{ directorRole: 'managing_director' },
		{ directorRole: 'partner' },
		{ directorRole: 'designated_partner' },
		{ companyIncome: profitableItr },
		{ cin: 'L65990MH1995PLC084719' },
		{ gstStatus: 'registered_regular' },
		{ gstStatus: 'unregistered' }
	];
	for (const profileType of profiles) {
		for (const companyContext of contexts) {
			const specifics = buildAutoSpecifics({
				profileType,
				isRegisteredInIndia: true,
				specificsTypeValue: profileType === 'director_company' ? 'pvt_ltd' : 'partnership',
				ownershipPercent: 50,
				companyContext: companyContext as never
			});
			for (const key of Object.keys(specifics)) produced.add(key);
		}
	}
	return produced;
}

describe('AUTO_DERIVED_INFRA_KEYS parity with buildAutoSpecifics', () => {
	const inventoryAll = new Set<string>([
		...KNOWN_BUILD_AUTO_SPECIFICS_KEYS.infra,
		...KNOWN_BUILD_AUTO_SPECIFICS_KEYS.overridable
	]);

	it('buildAutoSpecifics produces only keys in the frozen inventory', () => {
		const produced = collectAllProducedKeys();
		const unexpected = [...produced].filter((k) => !inventoryAll.has(k));
		expect(
			unexpected,
			`buildAutoSpecifics produced unknown keys: ${unexpected.join(', ')}. ` +
				`Add each to KNOWN_BUILD_AUTO_SPECIFICS_KEYS as either 'infra' (also add to ` +
				`AUTO_DERIVED_INFRA_KEYS in directorAutoIncome.ts) or 'overridable'.`
		).toEqual([]);
	});

	it('every inventory key is actually produced by buildAutoSpecifics', () => {
		const produced = collectAllProducedKeys();
		const orphaned = [...inventoryAll].filter((k) => !produced.has(k));
		expect(
			orphaned,
			`Inventory keys not produced by buildAutoSpecifics: ${orphaned.join(', ')}. ` +
				`The key may have been removed from directorAutoIncome.ts — also remove from ` +
				`KNOWN_BUILD_AUTO_SPECIFICS_KEYS (and AUTO_DERIVED_INFRA_KEYS if applicable).`
		).toEqual([]);
	});

	it('AUTO_DERIVED_INFRA_KEYS equals the inventory.infra category', () => {
		const actual = new Set(AUTO_DERIVED_INFRA_KEYS);
		const expected = new Set<string>(KNOWN_BUILD_AUTO_SPECIFICS_KEYS.infra);
		expect(
			[...actual].sort(),
			'AUTO_DERIVED_INFRA_KEYS in directorAutoIncome.ts has drifted from the test inventory.'
		).toEqual([...expected].sort());
	});

	it('AUTO_DERIVED_INFRA_KEYS ⊆ all-produced-keys (no orphan infra entries)', () => {
		const produced = collectAllProducedKeys();
		const orphanInfra = [...AUTO_DERIVED_INFRA_KEYS].filter((k) => !produced.has(k));
		expect(
			orphanInfra,
			`AUTO_DERIVED_INFRA_KEYS lists keys never written by buildAutoSpecifics: ` +
				`${orphanInfra.join(', ')}`
		).toEqual([]);
	});
});
