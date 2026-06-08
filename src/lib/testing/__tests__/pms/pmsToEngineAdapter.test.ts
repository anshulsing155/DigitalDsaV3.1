/**
 * Unit tests for pmsToEngineAdapter.ts
 *
 * The adapter is a pure function — no I/O, no DB access.
 * All tests construct a minimal PolicyDocument fixture and assert
 * specific properties of the resulting ParsedLenderRuleDocument.
 */

import { describe, it, expect } from 'vitest';
import { pmsToEnginePolicy } from '$lib/server/pms/pmsToEngineAdapter.js';
import type { PolicyDocument, ConditionalOverride } from '$lib/config/pms/policyTypes.js';
import { ObjectId } from 'mongodb';

// ─── Fixture factory ──────────────────────────────────────────────────────────

function makePolicyDoc(
	overrides: Partial<PolicyDocument> = {}
): PolicyDocument {
	const base: PolicyDocument = {
		_id: new ObjectId(),
		lenderId: 'test-bank',
		loanProduct: 'Home Loan',
		version: 1,
		hash: 'abc123',
		status: 'published',
		validFrom: new Date('2026-01-01'),
		validTo: null,
		lockVersion: 3,
		reconciliationAssignedTo: 'rm-001',

		sections: {
			eligibility: {
				minAge: 21,
				maxAge: 65,
				minCreditScore: 700,
				allowedEmploymentTypes: [],
				allowedNationalities: ['Indian'],
				isDefaulterAllowed: false,
				notes: null
			},
			income: {
				allowedIncomeSources: [],
				haircutBySalaried: 0,
				haircutBySelfEmployed: 30,
				haircutByRental: 30,
				haircutByOther: 20,
				minNetIncome: null,
				minGrossIncome: null,
				notes: null
			},
			foir: {
				salaried: 60,
				selfEmployed: 50,
				notes: null
			},
			ltv: {
				maxLtvByPropertyType: {},
				maxLtvByLoanAmount: [
					{ upTo: 3000000, maxLtv: 90 },
					{ upTo: 7500000, maxLtv: 80 },
					{ upTo: Number.MAX_SAFE_INTEGER, maxLtv: 75 }
				],
				notes: null
			},
			obligations: {
				deductFromFoir: true,
				creditCardFoirMethod: 'limit_percentage',
				creditCardLimitPercentage: 5,
				notes: null
			},
			tenure: {
				minTenureMonths: 12,
				maxTenureMonths: 360,
				maxAgeAtMaturity: 70,
				notes: null
			},
			roi: {
				minRoi: 8.5,
				maxRoi: 11.0,
				spreadOverRepo: null,
				roiType: 'floating',
				notes: null
			},
			geo: {
				allowedStates: [],
				excludedCities: [],
				notes: null
			},
			fees: {
				processingFeePercent: 0.5,
				processingFeeFlat: null,
				processingFeeMin: null,
				processingFeeMax: null,
				prepaymentAllowed: true,
				prepaymentChargePercent: null,
				notes: null
			}
		},

		conditionalOverrides: [],
		bankCardNotes: [],
		pendingChanges: [],

		sourceDocument: {
			text: 'test',
			fileName: 'test.pdf',
			uploadedAt: new Date(),
			uploadedBy: 'rm-001'
		},
		pipelineState: null,
		reconciliation: {
			status: 'complete',
			assignedTo: 'rm-001',
			clauses: [],
			completedAt: new Date(),
			completedBy: 'rm-001'
		},
		aiPipelineRun: null,
		legacyComparison: null,
		registryHealthCheck: null,

		createdBy: 'rm-001',
		createdAt: new Date(),
		updatedBy: 'rm-001',
		updatedAt: new Date(),
		submittedBy: 'rm-001',
		submittedAt: new Date(),
		approvedBy: 'admin-001',
		approvedAt: new Date(),
		scheduledPublishAt: null,
		publishedBy: 'admin-001',
		publishedAt: new Date(),
		adminRejectionNote: null,
		adminRejectedAt: null,
		adminClauseComments: [],
		qaRun: null
	};

	return { ...base, ...overrides } as PolicyDocument;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pmsToEngineAdapter — identity fields', () => {
	it('preserves lenderId as lender_id', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc({ lenderId: 'hdfc-bank' }));
		expect(doc.lender_id).toBe('hdfc-bank');
	});

	it('sets loan_types to [loanProduct]', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc({ loanProduct: 'Home Loan' }));
		expect(doc.loan_types).toEqual(['Home Loan']);
	});

	it('uses existingLenderMeta.lender_name when provided', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc(), {
			lender_name: 'HDFC Bank',
			classification: 'PVT'
		});
		expect(doc.lender_name).toBe('HDFC Bank');
	});

	it('formats lenderId as lender_name when no meta provided', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc({ lenderId: 'hdfc-bank' }));
		expect(doc.lender_name).toBe('HDFC Bank');
	});

	it('uses existingLenderMeta.classification when provided', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc(), {
			lender_name: 'SBI',
			classification: 'GOV'
		});
		expect(doc.classification).toBe('GOV');
	});
});

describe('pmsToEngineAdapter — eligibility section', () => {
	it('generates an age hard_gate rule', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		const ageRule = doc.sections.eligibility?.find((r) => r.rule_id.includes('elig-age'));
		expect(ageRule).toBeDefined();
		expect(ageRule?.tier).toBe('hard_gate');
		expect(ageRule?.fail_category).toBe('age_limit');
	});

	it('age rule logic uses minAge and maxAge from PMS', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.eligibility.minAge = 23;
		pmsDoc.sections.eligibility.maxAge = 60;
		const doc = pmsToEnginePolicy(pmsDoc);
		const ageRule = doc.sections.eligibility?.find((r) => r.rule_id.includes('elig-age'));
		// JSON-Logic: and[>=(age, 23), <=(age, 60)]
		const logic = ageRule?.logic as { and: unknown[] };
		expect(logic.and).toHaveLength(2);
	});

	it('generates a defaulter gate when isDefaulterAllowed is false', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		const defaulterRule = doc.sections.eligibility?.find((r) =>
			r.rule_id.includes('defaulter')
		);
		expect(defaulterRule).toBeDefined();
		expect(defaulterRule?.tier).toBe('hard_gate');
	});

	it('omits defaulter gate when isDefaulterAllowed is true', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.eligibility.isDefaulterAllowed = true;
		const doc = pmsToEnginePolicy(pmsDoc);
		const defaulterRule = doc.sections.eligibility?.find((r) =>
			r.rule_id.includes('defaulter')
		);
		expect(defaulterRule).toBeUndefined();
	});
});

describe('pmsToEngineAdapter — CIBIL section', () => {
	it('generates a CIBIL hard_gate rule with minCreditScore', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.eligibility.minCreditScore = 750;
		const doc = pmsToEnginePolicy(pmsDoc);
		const cibilRule = doc.sections.cibil?.[0];
		expect(cibilRule).toBeDefined();
		expect(cibilRule?.tier).toBe('hard_gate');
		expect(cibilRule?.fail_category).toBe('cibil_threshold');
	});

	it('sets cibil_floor to minCreditScore', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.eligibility.minCreditScore = 740;
		const doc = pmsToEnginePolicy(pmsDoc);
		expect(doc.cibil_floor).toBe(740);
	});

	it('changing minCreditScore changes cibil_floor — no hardcoding', () => {
		const pmsDoc1 = makePolicyDoc();
		pmsDoc1.sections.eligibility.minCreditScore = 700;
		const pmsDoc2 = makePolicyDoc();
		pmsDoc2.sections.eligibility.minCreditScore = 750;

		const doc1 = pmsToEnginePolicy(pmsDoc1);
		const doc2 = pmsToEnginePolicy(pmsDoc2);

		expect(doc1.cibil_floor).toBe(700);
		expect(doc2.cibil_floor).toBe(750);
		expect(doc1.cibil_floor).not.toBe(doc2.cibil_floor);
	});
});

describe('pmsToEngineAdapter — FOIR section', () => {
	it('generates two FOIR parameter rules (salaried + SE)', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		expect(doc.sections.foir).toHaveLength(2);
	});

	it('converts percentage to decimal (60 → 0.60)', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.foir.salaried = 60;
		pmsDoc.sections.foir.selfEmployed = 50;
		const doc = pmsToEnginePolicy(pmsDoc);

		const salRule = doc.sections.foir?.find((r) => r.rule_id.includes('foir-sal'));
		const seRule = doc.sections.foir?.find((r) => r.rule_id.includes('foir-se'));

		expect(salRule?.parameter_value).toBeCloseTo(0.6);
		expect(seRule?.parameter_value).toBeCloseTo(0.5);
	});

	it('all FOIR rules have tier: parameter', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		for (const rule of doc.sections.foir ?? []) {
			expect(rule.tier).toBe('parameter');
		}
	});
});

describe('pmsToEngineAdapter — income_assessment section', () => {
	it('generates income rules for all known profile types', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		const types = doc.sections.income_assessment?.map((r) => r.income_profile_type) ?? [];
		expect(types).toContain('salaried_regular');
		expect(types).toContain('business_proprietorship');
		expect(types).toContain('professional_practice');
		expect(types).toContain('rental_income');
		expect(types).toContain('pension');
		expect(types).toContain('no_current_income');
		expect(types).toContain('*'); // wildcard catch-all
	});

	it('applies correct haircut per category', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.income.haircutBySalaried = 5;
		pmsDoc.sections.income.haircutBySelfEmployed = 25;
		pmsDoc.sections.income.haircutByRental = 35;
		const doc = pmsToEnginePolicy(pmsDoc);

		const salRule = doc.sections.income_assessment?.find(
			(r) => r.income_profile_type === 'salaried_regular'
		);
		const seRule = doc.sections.income_assessment?.find(
			(r) => r.income_profile_type === 'business_proprietorship'
		);
		const rentalRule = doc.sections.income_assessment?.find(
			(r) => r.income_profile_type === 'rental_income'
		);

		expect(salRule?.haircut_percent).toBe(5);
		expect(seRule?.haircut_percent).toBe(25);
		expect(rentalRule?.haircut_percent).toBe(35);
	});

	it('no_current_income is always accepted=false', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.income.allowedIncomeSources = ['no_current_income'];
		const doc = pmsToEnginePolicy(pmsDoc);
		const noIncomeRule = doc.sections.income_assessment?.find(
			(r) => r.income_profile_type === 'no_current_income'
		);
		expect(noIncomeRule?.accepted).toBe(false);
	});

	it('allowedIncomeSources empty → all profile types accepted', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.income.allowedIncomeSources = [];
		const doc = pmsToEnginePolicy(pmsDoc);
		const rules = doc.sections.income_assessment ?? [];
		const earningRules = rules.filter((r) => r.income_profile_type !== 'no_current_income');
		for (const rule of earningRules) {
			expect(rule.accepted).toBe(true);
		}
	});

	it('allowedIncomeSources non-empty → excluded types have accepted=false', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.income.allowedIncomeSources = ['salaried_regular'];
		const doc = pmsToEnginePolicy(pmsDoc);

		const salRule = doc.sections.income_assessment?.find(
			(r) => r.income_profile_type === 'salaried_regular'
		);
		const seRule = doc.sections.income_assessment?.find(
			(r) => r.income_profile_type === 'business_proprietorship'
		);

		expect(salRule?.accepted).toBe(true);
		expect(seRule?.accepted).toBe(false);
	});
});

describe('pmsToEngineAdapter — LTV section', () => {
	it('generates LTV parameter rules for each loan-amount tier', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		// Base fixture has 3 tiers
		const ltvRules = (doc.sections.ltv ?? []).filter((r) => r.rule_id.includes('ltv-tier'));
		expect(ltvRules.length).toBe(3);
	});

	it('each LTV tier rule has tier: parameter and parameter_key: max_ltv', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		for (const rule of doc.sections.ltv ?? []) {
			if (rule.rule_id.includes('ltv-tier')) {
				expect(rule.tier).toBe('parameter');
				expect(rule.parameter_key).toBe('max_ltv');
			}
		}
	});

	it('ltv section is null when PMS ltv is null (unsecured product)', () => {
		const pmsDoc = makePolicyDoc({ loanProduct: 'Personal Loan' });
		pmsDoc.sections.ltv = null;
		const doc = pmsToEnginePolicy(pmsDoc);
		expect(doc.sections.ltv).toBeNull();
	});
});

describe('pmsToEngineAdapter — tenure section', () => {
	it('generates max_tenure_months and max_age_at_maturity parameter rules', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.tenure.maxTenureMonths = 240;
		pmsDoc.sections.tenure.maxAgeAtMaturity = 75;
		const doc = pmsToEnginePolicy(pmsDoc);

		const tenureRule = doc.sections.tenure?.find((r) =>
			r.parameter_key === 'max_tenure_months'
		);
		const maturityRule = doc.sections.tenure?.find((r) =>
			r.parameter_key === 'max_age_at_maturity'
		);

		expect(tenureRule?.parameter_value).toBe(240);
		expect(maturityRule?.parameter_value).toBe(75);
	});
});

describe('pmsToEngineAdapter — ROI section', () => {
	it('uses midpoint of minRoi and maxRoi as the offer rate', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.roi.minRoi = 8.0;
		pmsDoc.sections.roi.maxRoi = 10.0;
		const doc = pmsToEnginePolicy(pmsDoc);
		const roiRule = doc.sections.roi?.[0];
		// Midpoint of 8 and 10 is 9
		expect(roiRule?.parameter_value).toBeCloseTo(9.0);
		expect(roiRule?.parameter_key).toBe('roi');
	});
});

describe('pmsToEngineAdapter — fees section', () => {
	it('generates processing_fee_percent rule when processingFeePercent is set', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.fees.processingFeePercent = 1.5;
		const doc = pmsToEnginePolicy(pmsDoc);
		const feeRule = doc.sections.fees?.find((r) => r.parameter_key === 'processing_fee_percent');
		expect(feeRule).toBeDefined();
		expect(feeRule?.parameter_value).toBeCloseTo(1.5);
	});

	it('omits processing fee rule when processingFeePercent is null', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.fees.processingFeePercent = null;
		const doc = pmsToEnginePolicy(pmsDoc);
		const feeRule = doc.sections.fees?.find((r) => r.parameter_key === 'processing_fee_percent');
		expect(feeRule).toBeUndefined();
	});
});

describe('pmsToEngineAdapter — geo section', () => {
	it('property section is null when geo config is empty', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.geo.allowedStates = [];
		pmsDoc.sections.geo.excludedCities = [];
		const doc = pmsToEnginePolicy(pmsDoc);
		expect(doc.sections.property).toBeNull();
	});

	it('generates a geo state hard_gate when allowedStates is non-empty', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.geo.allowedStates = ['Maharashtra', 'Gujarat'];
		const doc = pmsToEnginePolicy(pmsDoc);
		const stateRule = doc.sections.property?.find((r) => r.rule_id.includes('geo-states'));
		expect(stateRule).toBeDefined();
		expect(stateRule?.tier).toBe('hard_gate');
		expect(stateRule?.fail_category).toBe('geo_restriction');
	});

	it('generates a city exclusion hard_gate when excludedCities is non-empty', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.geo.excludedCities = ['Naxalite City', 'Flood Zone'];
		const doc = pmsToEnginePolicy(pmsDoc);
		const cityRule = doc.sections.property?.find((r) => r.rule_id.includes('geo-cities'));
		expect(cityRule).toBeDefined();
		expect(cityRule?.tier).toBe('hard_gate');
	});
});

describe('pmsToEngineAdapter — obligation_treatment section', () => {
	it('generates term_loan and credit_line obligation rules', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		const types = doc.sections.obligation_treatment?.map((r) => r.obligation_type) ?? [];
		expect(types).toContain('term_loan');
		expect(types).toContain('credit_line');
	});

	it('maps limit_percentage creditCardFoirMethod correctly', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.obligations.creditCardFoirMethod = 'limit_percentage';
		pmsDoc.sections.obligations.creditCardLimitPercentage = 5;
		const doc = pmsToEnginePolicy(pmsDoc);
		const creditLineRule = doc.sections.obligation_treatment?.find(
			(r) => r.obligation_type === 'credit_line'
		);
		expect(creditLineRule?.treatment.credit_line_method).toBe('percentage_of_limit');
		expect(creditLineRule?.treatment.credit_line_factor).toBeCloseTo(0.05);
	});

	it('maps full_limit creditCardFoirMethod to 100% factor', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.obligations.creditCardFoirMethod = 'full_limit';
		const doc = pmsToEnginePolicy(pmsDoc);
		const creditLineRule = doc.sections.obligation_treatment?.find(
			(r) => r.obligation_type === 'credit_line'
		);
		expect(creditLineRule?.treatment.credit_line_factor).toBeCloseTo(1.0);
	});
});

describe('pmsToEngineAdapter — ConditionalOverrides injection', () => {
	function makeOverride(partial: Partial<ConditionalOverride> = {}): ConditionalOverride {
		return {
			id: 'override-001',
			label: 'Test Override',
			sourceClauseId: 'clause-001',
			authoringMode: 'template',
			templateId: null,
			templateParams: null,
			condition: { '==': [1, 1] },
			effect: { fieldPath: 'roi', operation: 'set', value: 9.5 },
			scope: 'loan',
			source: 'rm_confirmed',
			confidence: 0.9,
			aiConfidence: null,
			conflictCheck: null,
			adminCoApproved: false,
			adminCoApprovedBy: null,
			adminCoApprovedAt: null,
			notes: '',
			addedBy: 'rm-001',
			addedAt: new Date(),
			...partial
		};
	}

	it('injects a template override into the roi section', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.conditionalOverrides = [makeOverride({ authoringMode: 'template' })];
		const doc = pmsToEnginePolicy(pmsDoc);
		const overrideRule = doc.sections.roi?.find((r) => r.rule_id.includes('override'));
		expect(overrideRule).toBeDefined();
		expect(overrideRule?.parameter_key).toBe('roi');
		expect(overrideRule?.parameter_value).toBe(9.5);
	});

	it('skips custom_json override that is not adminCoApproved', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.conditionalOverrides = [
			makeOverride({ authoringMode: 'custom_json', adminCoApproved: false })
		];
		const doc = pmsToEnginePolicy(pmsDoc);
		const overrideRule = doc.sections.roi?.find((r) => r.rule_id.includes('override'));
		expect(overrideRule).toBeUndefined();
	});

	it('includes custom_json override when adminCoApproved is true', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.conditionalOverrides = [
			makeOverride({ authoringMode: 'custom_json', adminCoApproved: true })
		];
		const doc = pmsToEnginePolicy(pmsDoc);
		const overrideRule = doc.sections.roi?.find((r) => r.rule_id.includes('override'));
		expect(overrideRule).toBeDefined();
	});

	it('skips overrides with non-set operations (add, multiply, etc.)', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.conditionalOverrides = [
			makeOverride({ effect: { fieldPath: 'roi', operation: 'multiply', value: 1.1 } })
		];
		const doc = pmsToEnginePolicy(pmsDoc);
		const overrideRule = doc.sections.roi?.find((r) => r.rule_id.includes('override'));
		expect(overrideRule).toBeUndefined();
	});

	it('injects FOIR override into the foir section', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.conditionalOverrides = [
			makeOverride({ effect: { fieldPath: 'max_foir', operation: 'set', value: 0.65 } })
		];
		const doc = pmsToEnginePolicy(pmsDoc);
		const overrideRule = doc.sections.foir?.find((r) => r.rule_id.includes('override'));
		expect(overrideRule).toBeDefined();
		expect(overrideRule?.parameter_key).toBe('max_foir');
	});
});

describe('pmsToEngineAdapter — input validation', () => {
	// Each test mutates a section value to a malformed shape and asserts that
	// the adapter throws. The thrown error must include the failing path so
	// operators can identify which lender/field is broken.

	it('throws when foir.salaried is a string instead of a number', () => {
		const pmsDoc = makePolicyDoc();
		// MongoDB drift: a write path stored "50" instead of 50.
		(pmsDoc.sections.foir as unknown as Record<string, unknown>).salaried = '50';
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/foir\.salaried/);
	});

	it('throws when foir.selfEmployed is NaN', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.foir.selfEmployed = NaN;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/foir\.selfEmployed/);
	});

	it('throws when foir.salaried is above 100%', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.foir.salaried = 150;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/foir\.salaried/);
	});

	it('throws when foir is negative', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.foir.salaried = -10;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/foir\.salaried/);
	});

	it('throws when roi.maxRoi exceeds 50%', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.roi.maxRoi = 999;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/roi\.maxRoi/);
	});

	it('throws when roi.minRoi is negative', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.roi.minRoi = -1;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/roi\.minRoi/);
	});

	it('throws when minCreditScore is below the CIBIL floor of 300', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.eligibility.minCreditScore = 100;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/minCreditScore/);
	});

	it('throws when minCreditScore exceeds the CIBIL ceiling of 900', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.eligibility.minCreditScore = 1000;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/minCreditScore/);
	});

	it('throws when minAge is below 18 (legal contract age)', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.eligibility.minAge = 15;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/minAge/);
	});

	it('throws when maxTenureMonths exceeds 360 (30-year ceiling)', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.tenure.maxTenureMonths = 600;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/maxTenureMonths/);
	});

	it('throws when maxTenureMonths is zero or negative', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.tenure.maxTenureMonths = 0;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/maxTenureMonths/);
	});

	it('throws when haircut percent exceeds 100', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.income.haircutBySelfEmployed = 150;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/haircutBySelfEmployed/);
	});

	it('throws when LTV maxLtv exceeds 100%', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.ltv = {
			maxLtvByPropertyType: {},
			maxLtvByLoanAmount: [{ upTo: 5000000, maxLtv: 120 }],
			notes: null
		};
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/maxLtv/);
	});

	it('throws when LTV maxLtvByPropertyType has an out-of-range value', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.ltv = {
			maxLtvByPropertyType: { 'Approved Apartment': 110 },
			maxLtvByLoanAmount: [],
			notes: null
		};
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/maxLtvByPropertyType/);
	});

	it('throws when LTV upTo is non-positive', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.ltv = {
			maxLtvByPropertyType: {},
			maxLtvByLoanAmount: [{ upTo: 0, maxLtv: 80 }],
			notes: null
		};
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/upTo/);
	});

	it('accepts ltv: null for unsecured products without throwing', () => {
		const pmsDoc = makePolicyDoc({ loanProduct: 'Personal Loan' });
		pmsDoc.sections.ltv = null;
		expect(() => pmsToEnginePolicy(pmsDoc)).not.toThrow();
	});

	it('throws when creditCardFoirMethod is an unknown enum value', () => {
		const pmsDoc = makePolicyDoc();
		(pmsDoc.sections.obligations as unknown as Record<string, unknown>).creditCardFoirMethod =
			'made_up';
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/creditCardFoirMethod/);
	});

	it('throws when processingFeePercent exceeds 100', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.fees.processingFeePercent = 250;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/processingFeePercent/);
	});

	it('throws when processingFeeFlat is negative', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.fees.processingFeeFlat = -100;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/processingFeeFlat/);
	});

	it('error message includes the lenderId and loanProduct for operator triage', () => {
		const pmsDoc = makePolicyDoc({
			lenderId: 'broken-bank',
			loanProduct: 'Home Loan'
		});
		pmsDoc.sections.foir.salaried = NaN;
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/broken-bank.*Home Loan/);
	});

	it('reports multiple validation issues in a single error message', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.foir.salaried = NaN;
		pmsDoc.sections.roi.maxRoi = 999;
		try {
			pmsToEnginePolicy(pmsDoc);
			expect.fail('Expected adapter to throw');
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toMatch(/foir\.salaried/);
			expect(msg).toMatch(/roi\.maxRoi/);
		}
	});

	it('does not throw on valid input — baseline fixture passes', () => {
		expect(() => pmsToEnginePolicy(makePolicyDoc())).not.toThrow();
	});

	it('catches the canonical NaN-cascade trap (string foir → /100 = NaN)', () => {
		// Without validation, foir.salaried="50" / 100 = NaN, which silently
		// makes the lender resolve to traffic_light: 'green'. Validation catches
		// this BEFORE arithmetic runs, throwing a loud configuration error.
		const pmsDoc = makePolicyDoc();
		(pmsDoc.sections.foir as unknown as Record<string, unknown>).salaried = '50';
		// The error message must clearly identify foir.salaried, not just
		// some generic "expected number" — operators need actionable info.
		expect(() => pmsToEnginePolicy(pmsDoc)).toThrow(/foir\.salaried/);
		// The error must NOT be silently swallowed and must NOT produce a result.
		let result: unknown;
		try {
			result = pmsToEnginePolicy(pmsDoc);
		} catch {
			// Expected
		}
		expect(result).toBeUndefined();
	});
});

describe('pmsToEngineAdapter — display policies', () => {
	it('generates ROI range policy for offer card', () => {
		const pmsDoc = makePolicyDoc();
		pmsDoc.sections.roi.minRoi = 8.5;
		pmsDoc.sections.roi.maxRoi = 11.0;
		const doc = pmsToEnginePolicy(pmsDoc);
		const roiPolicy = doc.policies?.find((p) => p.policy_key === 'roi_range');
		expect(roiPolicy).toBeDefined();
		expect(roiPolicy?.value).toContain('8.5');
		expect(roiPolicy?.value).toContain('11');
	});

	it('generates processing_fee policy when fee is configured', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		const feePolicy = doc.policies?.find((p) => p.policy_key === 'processing_fee');
		expect(feePolicy).toBeDefined();
	});

	it('generates max_tenure policy', () => {
		const doc = pmsToEnginePolicy(makePolicyDoc());
		const tenurePolicy = doc.policies?.find((p) => p.policy_key === 'max_tenure');
		expect(tenurePolicy).toBeDefined();
		expect(tenurePolicy?.value).toContain('30'); // 360 months = 30 years
	});
});
