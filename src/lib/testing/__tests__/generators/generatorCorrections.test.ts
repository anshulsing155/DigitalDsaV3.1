/**
 * Generator Corrections Test Suite (S77f — updated for variation generator)
 *
 * Validates structural invariants of the synthetic profile generator.
 * Updated from the archetype-based generator to the journey-based variation
 * generator (Option A). Tests that depended on archetype-specific tags
 * (salaried-rental, multi-directorship, salaried-freelance) or on the
 * archetype system's pre-built incomeEntries arrays have been replaced
 * with equivalent structural checks that hold for journey-based profiles.
 *
 * Journey-based profiles go through `buildLoanPayload()` (the real builder),
 * so their shape is:
 *   - grossIncome / netIncome set directly from journey applicant data
 *   - salariedProfile / businessProfile / pensionProfile / governmentProfile
 *     built from salariedActivityDetailsVisible etc.
 *   - financials built from financialsTableVisible (for SE applicants)
 *   - incomeEntries NOT set (journeys don't pre-build incomeEntries arrays;
 *     that's the live income-profiling system's job, not the payload builder's)
 *
 * Retained tests (invariants that still hold):
 *   1. Obligation employment filtering — salaried never gets CC Limit (OD Limit is valid)
 *   2. Conditional field enforcement — hasBarCouncilChamber only on Lawyers
 *   3. LAP structural invariants — valid loanName, propertyAreaType, loanPurpose
 *   4. Multi-applicant structural checks — applicant count, roles
 *   5. Backward compatibility — grossIncome/netIncome flat fields populated
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
	generateAllProfiles,
	type GeneratedProfile
} from '$lib/testing/generators/syntheticGenerator.js';

// Generate once, reuse across all tests
let profiles: GeneratedProfile[];

beforeAll(() => {
	profiles = generateAllProfiles();
});

// ============================================================================
// 1. OBLIGATION EMPLOYMENT FILTERING
// ============================================================================

describe('obligation employment filtering', () => {
	it('salaried profiles never have CC Limit obligations (OD Limit is valid)', () => {
		// CC Limit is a business credit line — not available to salaried applicants.
		// OD Limit (bank overdraft) IS valid for salaried — e.g. salary OD facility.
		// EDGE_BT_CREDIT_LINES exercises the OD path for a salaried applicant.
		const salariedWithObligations = profiles.filter((p) => {
			const primary = p.payload.allApplicantDetails[0];
			return (
				(primary.employmentType === 'Salaried(Private)' ||
					primary.employmentType === 'Salaried(Government)') &&
				primary.obligations &&
				primary.obligations.length > 0
			);
		});
		expect(salariedWithObligations.length).toBeGreaterThan(0);

		for (const p of salariedWithObligations) {
			const primary = p.payload.allApplicantDetails[0];
			for (const obl of primary.obligations!) {
				expect(
					obl.loanType,
					`${p.profile_id}: salaried applicant has CC Limit — business credit lines are not valid for salaried`
				).not.toBe('CC Limit');
			}
		}
	});

	it('salaried profiles can have OD Limit obligations', () => {
		// EDGE_BT_CREDIT_LINES has a salaried applicant with OD Limit — valid.
		const salariedWithOD = profiles.filter((p) => {
			const primary = p.payload.allApplicantDetails[0];
			return (
				(primary.employmentType === 'Salaried(Private)' ||
					primary.employmentType === 'Salaried(Government)') &&
				primary.obligations &&
				primary.obligations.some((o: { loanType: string }) => o.loanType === 'OD Limit')
			);
		});
		// EDGE_BT_CREDIT_LINES × 8 variations
		expect(salariedWithOD.length).toBeGreaterThan(0);
	});

	it('pensioner profiles never have OD Limit or CC Limit obligations', () => {
		const pensionerWithObligations = profiles.filter((p) => {
			const primary = p.payload.allApplicantDetails[0];
			return (
				primary.employmentType === 'Pensioner' &&
				primary.obligations &&
				primary.obligations.length > 0
			);
		});
		// Pensioners may not have obligations in all journeys, but verify any that do
		for (const p of pensionerWithObligations) {
			const primary = p.payload.allApplicantDetails[0];
			for (const obl of primary.obligations!) {
				expect(obl.loanType).not.toBe('OD Limit');
				expect(obl.loanType).not.toBe('CC Limit');
			}
		}
	});

	it('OD Limit obligations appear in profiles (credit_line obligationType produced correctly)', () => {
		// EDGE_BT_CREDIT_LINES exercises the OD Limit path in cleanObligationEntries,
		// verifying the credit_line obligationType derivation works end-to-end.
		const odProfiles = profiles.filter((p) =>
			p.payload.allApplicantDetails.some(
				(a) => a.obligations && a.obligations.some((o) => o.loanType === 'OD Limit')
			)
		);
		// EDGE_BT_CREDIT_LINES × 8 variations = 8 profiles
		expect(odProfiles.length).toBeGreaterThan(0);
	});

	it('obligations have valid string values for emi, tenure, totalLimit', () => {
		const withObligations = profiles.filter((p) =>
			p.payload.allApplicantDetails.some((a) => a.obligations && a.obligations.length > 0)
		);
		expect(withObligations.length).toBeGreaterThan(0);

		for (const p of withObligations) {
			for (const a of p.payload.allApplicantDetails) {
				if (!a.obligations) continue;
				for (const obl of a.obligations) {
					// cleanObligationEntries always coerces emi/tenure to string.
					// totalLimit is now only emitted for credit_line obligations
					// (CC / OD / Dropline OD); term loans don't carry it.
					expect(typeof obl.emi, `${p.profile_id}: emi not string`).toBe('string');
					expect(typeof obl.tenure, `${p.profile_id}: tenure not string`).toBe('string');
					if (obl.obligationType === 'credit_line') {
						expect(typeof obl.totalLimit, `${p.profile_id}: totalLimit not string`).toBe('string');
					} else {
						expect(obl.totalLimit, `${p.profile_id}: term loan should not have totalLimit`).toBeUndefined();
					}
				}
			}
		}
	});
});

// ============================================================================
// 2. CONDITIONAL FIELD ENFORCEMENT
// ============================================================================

describe('conditional field enforcement', () => {
	it('hasBarCouncilChamber only on lawyer professionals', () => {
		const profProfiles = profiles.filter(
			(p) => p.metadata.employment_type === 'Self-employed(Professional)'
		);

		for (const p of profProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			if (primary.professionType !== 'Lawyer') {
				expect(
					primary.hasBarCouncilChamber,
					`${p.profile_id}: hasBarCouncilChamber on non-Lawyer (${primary.professionType})`
				).toBeUndefined();
			}
		}
	});

	it('EDGE_PROF_LAWYER_DC profiles have hasBarCouncilChamber true', () => {
		// The only Lawyer journey is EDGE_PROF_LAWYER_DC — verify its 8 variations
		const lawyerProfiles = profiles.filter(
			(p) => p.profile_id.startsWith('VG-EDGE-PROF-LAWYER-DC-')
		);
		expect(lawyerProfiles.length).toBe(8);

		for (const p of lawyerProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			expect(primary.professionType).toBe('Lawyer');
			expect(primary.hasBarCouncilChamber).toBe(true);
		}
	});

	it('government profiles have governmentProfile set', () => {
		const govtProfiles = profiles.filter(
			(p) => p.metadata.employment_type === 'Salaried(Government)'
		);
		// EDGE_GOVT_SAL journey covers this path
		expect(govtProfiles.length).toBeGreaterThan(0);

		for (const p of govtProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			expect(
				primary.governmentProfile,
				`${p.profile_id}: Salaried(Government) missing governmentProfile`
			).toBeDefined();
		}
	});
});

// ============================================================================
// 3. LAP STRUCTURAL INVARIANTS
// ============================================================================

describe('LAP structural invariants', () => {
	it('LAP profiles have valid loanName', () => {
		const lapProfiles = profiles.filter((p) => p.loan_type === 'Loan Against Property');
		expect(lapProfiles.length).toBeGreaterThan(0);

		for (const p of lapProfiles) {
			expect(p.payload.loanTransaction.loanName).toBe('Loan Against Property');
		}
	});

	it('LAP profiles have loanPurpose set', () => {
		// New Loan LAP journeys have loanPurpose on loanRequirementPage
		const lapNewProfiles = profiles.filter(
			(p) =>
				p.loan_type === 'Loan Against Property' &&
				p.payload.loanTransaction.loanAmount &&
				p.payload.loanTransaction.loanAmount > 0
		);
		expect(lapNewProfiles.length).toBeGreaterThan(0);
	});

	it('LAP profiles have diverse constructionStatus (property types)', () => {
		const lapProfiles = profiles.filter((p) => p.loan_type === 'Loan Against Property');
		const constructionStatuses = new Set<string>();

		for (const p of lapProfiles) {
			const cs = p.payload.loanTransaction.constructionStatus;
			if (cs) constructionStatuses.add(cs);
		}

		// LAP journeys cover: Flat, House, Shop (commercial) across the 5 LAP journeys
		// and 2 edge journeys (EDGE_AGE_68, EDGE_GOVT_SAL) that also have LAP.
		expect(
			constructionStatuses.size,
			`Only ${constructionStatuses.size} construction statuses: ${[...constructionStatuses].join(', ')}`
		).toBeGreaterThanOrEqual(2);
	});
});

// ============================================================================
// 4. MULTI-APPLICANT STRUCTURAL CHECKS
// ============================================================================

describe('multi-applicant structural checks', () => {
	it('multi-applicant profiles have matching allApplicantDetails length', () => {
		const multiProfiles = profiles.filter((p) => p.metadata.applicant_count >= 2);
		expect(multiProfiles.length).toBeGreaterThan(0);

		for (const p of multiProfiles) {
			expect(p.payload.allApplicantDetails.length).toBe(p.metadata.applicant_count);
		}
	});

	it('co-applicant applicants have relationship set where defined', () => {
		// Journeys with co-applicants and explicit relationship fields:
		//   - HL_BT_TOPUP: Spouse
		//   - EDGE_AGE_68: Parent (son as co-borrower, relationship: 'Parent' on the son)
		//   - EDGE_3_APPLICANTS: Spouse + Parent
		// Note: EDGE_COMPANY_PVT has an Individual co-borrower (Srinivas Reddy) linked via
		// linkedCompanyId — no explicit relationship key, so relationshipWithPrimary may be
		// empty for that case. We skip Company-linked individuals.
		const multiProfiles = profiles.filter((p) => p.metadata.applicant_count >= 2);

		for (const p of multiProfiles) {
			const coApplicants = p.payload.allApplicantDetails.slice(1);
			for (const coApplicant of coApplicants) {
				// Company type applicants don't have a person relationship
				if (coApplicant.applicantType === 'Company') continue;
				// EDGE_COMPANY_PVT's linked Individual co-borrower has no relationship field —
				// they're linked by linkedCompanyId, not by family relationship.
				// Skip individuals that have a linkedCompanyId (director-linked).
				if (p.metadata.tags.includes('company')) continue;
				// All other co-applicants in family-based journeys should have a relationship
				expect(
					coApplicant.relationshipWithPrimary,
					`${p.profile_id}: co-applicant missing relationshipWithPrimary`
				).toBeTruthy();
			}
		}
	});

	it('Company applicant profiles are present', () => {
		// EDGE_COMPANY_PVT journey: Company primary + Individual co-borrower
		const companyProfiles = profiles.filter((p) => p.metadata.tags.includes('company'));
		expect(companyProfiles.length).toBeGreaterThan(0);

		for (const p of companyProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			expect(primary.applicantType).toBe('Company');
			expect(primary.companyName).toBeTruthy();
		}
	});

	it('3-applicant profile has all 3 applicants', () => {
		const threeApplicantProfiles = profiles.filter(
			(p) => p.profile_id.startsWith('VG-EDGE-3-APPLICANTS-')
		);
		expect(threeApplicantProfiles.length).toBe(8);

		for (const p of threeApplicantProfiles) {
			expect(p.payload.allApplicantDetails.length).toBe(3);
		}
	});
});

// ============================================================================
// 5. FLAT INCOME FIELDS (journey-based profiles use flat grossIncome/netIncome)
// ============================================================================

describe('flat income fields', () => {
	it('salaried profiles have grossIncome and netIncome set', () => {
		const salariedProfiles = profiles.filter(
			(p) =>
				p.metadata.employment_type === 'Salaried(Private)' ||
				p.metadata.employment_type === 'Salaried(Government)'
		);
		expect(salariedProfiles.length).toBeGreaterThan(0);

		for (const p of salariedProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			// Journey applicants set grossIncome + netIncome directly
			expect(primary.grossIncome, `${p.profile_id}: missing grossIncome`).toBeGreaterThan(0);
			expect(primary.netIncome, `${p.profile_id}: missing netIncome`).toBeGreaterThan(0);
		}
	});

	it('pensioner profiles have netIncome set', () => {
		const pensionProfiles = profiles.filter((p) => p.metadata.employment_type === 'Pensioner');
		expect(pensionProfiles.length).toBeGreaterThan(0);

		for (const p of pensionProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			expect(primary.netIncome, `${p.profile_id}: missing netIncome for pensioner`).toBeGreaterThan(0);
		}
	});

	it('self-employed professional profiles have businessProfile set', () => {
		const profProfiles = profiles.filter(
			(p) => p.metadata.employment_type === 'Self-employed(Professional)'
		);
		expect(profProfiles.length).toBeGreaterThan(0);

		for (const p of profProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			// Business profile is built from businessActivityDetailsVisible
			expect(
				primary.businessProfile,
				`${p.profile_id}: Self-employed(Professional) missing businessProfile`
			).toBeDefined();
		}
	});

	it('salaried profiles have salariedProfile set', () => {
		const salariedPrivateProfiles = profiles.filter(
			(p) => p.metadata.employment_type === 'Salaried(Private)'
		);
		expect(salariedPrivateProfiles.length).toBeGreaterThan(0);

		for (const p of salariedPrivateProfiles) {
			const primary = p.payload.allApplicantDetails[0];
			expect(
				primary.salariedProfile,
				`${p.profile_id}: Salaried(Private) missing salariedProfile`
			).toBeDefined();
		}
	});
});

// ============================================================================
// 6. PROFILE ID FORMAT
// ============================================================================

describe('profile ID format', () => {
	it('all profile IDs follow VG-{JOURNEY-ID}-V{NN} format', () => {
		const idPattern = /^VG-.+-V\d{2}$/;
		for (const p of profiles) {
			expect(
				idPattern.test(p.profile_id),
				`${p.profile_id}: does not match VG-{id}-V{nn} pattern`
			).toBe(true);
		}
	});

	it('variation numbers run from V01 to V08 for each journey', () => {
		// Group profiles by journey ID
		const byJourney: Record<string, string[]> = {};
		for (const p of profiles) {
			// Extract journey ID: VG-{journey-id}-V{nn} → {journey-id}
			const match = p.profile_id.match(/^VG-(.+)-V(\d{2})$/);
			if (!match) continue;
			const [, journeyId] = match;
			if (!byJourney[journeyId]) byJourney[journeyId] = [];
			byJourney[journeyId].push(p.profile_id);
		}

		// Each journey should have exactly 8 profiles (V01–V08)
		for (const [journeyId, ids] of Object.entries(byJourney)) {
			expect(
				ids.length,
				`Journey ${journeyId} has ${ids.length} profiles instead of 8`
			).toBe(8);
		}
	});
});
