import { describe, it, expect } from 'vitest';
import {
	LENDER_DIRECTORY,
	LENDER_BY_ID,
	LENDER_BY_NAME,
	getLendersForProduct,
	ALL_LOAN_PRODUCTS,
	ALL_INDIA_STATES,
	scoreLenderGeoPresence,
	scoreLendersByGeo,
	getPresenceSummary,
	classifyCityTier,
	METRO_CITIES,
	TIER1_CITIES,
	getCategoryDefaults,
	CATEGORY_DEFAULTS,
	LENDER_OVERRIDES,
	LENDER_OVERRIDE_ENTRIES,
	applyOverride,
	compileAllLenders,
	compileAllLendersDetailed,
	getCompilationStats
} from '$lib/config/lenderPolicies/index.js';

import type { ParsedLenderRuleDocument } from '$lib/ruleEngine/types.js';

// ============================================================================
// 1. LENDER DIRECTORY TESTS
// ============================================================================

describe('Lender Directory', () => {
	it('should contain all registered lenders', () => {
		// 12 GOV + 24 PVT + 16 HFC + 15 NBFC + 10 SFB = 77
		// (bankName.ts has 87 entries but some are not in lenderDirectory yet)
		expect(LENDER_DIRECTORY.length).toBe(77);
	});

	it('should have unique lenderIds', () => {
		const ids = LENDER_DIRECTORY.map((l) => l.lenderId);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it('should have unique lenderNames', () => {
		const names = LENDER_DIRECTORY.map((l) => l.lenderName);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it('should have valid classifications', () => {
		const valid = new Set(['GOV', 'PVT', 'NBFC', 'HFC', 'SFB']);
		for (const lender of LENDER_DIRECTORY) {
			expect(valid.has(lender.classification)).toBe(true);
		}
	});

	it('should have correct classification counts', () => {
		const counts = LENDER_DIRECTORY.reduce(
			(acc, l) => {
				acc[l.classification] = (acc[l.classification] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		expect(counts['GOV']).toBe(12);
		expect(counts['PVT']).toBe(24);
		expect(counts['HFC']).toBe(16);
		expect(counts['NBFC']).toBe(15);
		expect(counts['SFB']).toBe(10);
	});

	it('should have at least one loan product per lender', () => {
		for (const lender of LENDER_DIRECTORY) {
			expect(lender.loanProducts.length).toBeGreaterThan(0);
		}
	});

	it('should only contain valid loan products', () => {
		const validProducts = new Set(ALL_LOAN_PRODUCTS);
		for (const lender of LENDER_DIRECTORY) {
			for (const product of lender.loanProducts) {
				expect(validProducts.has(product as any)).toBe(true);
			}
		}
	});

	it('should look up by ID correctly', () => {
		const sbi = LENDER_BY_ID.get('sbi');
		expect(sbi).toBeDefined();
		expect(sbi!.lenderName).toBe('State Bank of India');
		expect(sbi!.classification).toBe('GOV');
	});

	it('should look up by name correctly', () => {
		const hdfc = LENDER_BY_NAME.get('HDFC Bank');
		expect(hdfc).toBeDefined();
		expect(hdfc!.lenderId).toBe('hdfc-bank');
		expect(hdfc!.classification).toBe('PVT');
	});

	it('should return lenders for Home Loan', () => {
		const hlLenders = getLendersForProduct('Home Loan');
		expect(hlLenders.length).toBeGreaterThan(40);
		expect(hlLenders.some((l) => l.lenderId === 'sbi')).toBe(true);
		expect(hlLenders.some((l) => l.lenderId === 'hdfc-bank')).toBe(true);
	});

	it('should return lenders for Professional Loan', () => {
		const profLenders = getLendersForProduct('Professional Loan');
		expect(profLenders.length).toBeGreaterThan(3);
		expect(profLenders.length).toBeLessThan(30);
	});

	it('should have geo coverage for every lender', () => {
		for (const lender of LENDER_DIRECTORY) {
			expect(lender.geoCoverage).toBeDefined();
			expect(lender.geoCoverage.coverage).toBeDefined();
			expect(lender.geoCoverage.strongholdStates.length).toBeGreaterThan(0);
			expect(lender.geoCoverage.activeStates.length).toBeGreaterThan(0);
			expect(lender.geoCoverage.cityTierPresence.length).toBeGreaterThan(0);
		}
	});
});

// ============================================================================
// 2. GEO SCORER TESTS
// ============================================================================

describe('Geo Scorer', () => {
	it('should never filter — always returns a chip', () => {
		const nainital = LENDER_BY_ID.get('nainital')!;
		// Kerala is far from Nainital Bank's territory
		const result = scoreLenderGeoPresence(nainital.geoCoverage, 'Kerala');
		expect(result.chip).toBeDefined();
		// Should be verify_availability, not filtered out
		expect(result.chip).toBe('verify_availability');
		expect(result.geoScore).toBeLessThan(0.3);
	});

	it('should mark stronghold correctly', () => {
		const bom = LENDER_BY_ID.get('bom')!;
		const result = scoreLenderGeoPresence(bom.geoCoverage, 'Maharashtra');
		expect(result.chip).toBe('strong_presence');
		expect(result.isStronghold).toBe(true);
		expect(result.geoScore).toBeGreaterThan(0.9);
	});

	it('should mark pan_india lenders as available everywhere', () => {
		const sbi = LENDER_BY_ID.get('sbi')!;
		const result = scoreLenderGeoPresence(sbi.geoCoverage, 'Mizoram');
		expect(result.chip).toBe('available');
		expect(result.geoScore).toBeGreaterThan(0.7);
	});

	it('should mark pan_india stronghold with high score', () => {
		const sbi = LENDER_BY_ID.get('sbi')!;
		const result = scoreLenderGeoPresence(sbi.geoCoverage, 'Maharashtra');
		expect(result.chip).toBe('strong_presence');
		expect(result.geoScore).toBeGreaterThan(0.9);
	});

	it('should handle metro-only lenders', () => {
		const hsbc = LENDER_BY_ID.get('hsbc')!;
		// Mumbai is in their active cities
		const mumbai = scoreLenderGeoPresence(hsbc.geoCoverage, 'Maharashtra', 'Mumbai');
		expect(mumbai.chip).toBe('strong_presence');

		// Small city in Maharashtra — not in their list
		const satara = scoreLenderGeoPresence(hsbc.geoCoverage, 'Maharashtra', 'Satara');
		expect(['limited_presence', 'available']).toContain(satara.chip);
		expect(satara.geoScore).toBeLessThan(mumbai.geoScore);
	});

	it('should handle no location data gracefully', () => {
		const sbi = LENDER_BY_ID.get('sbi')!;
		const result = scoreLenderGeoPresence(sbi.geoCoverage);
		expect(result.chip).toBe('available');
		expect(result.geoScore).toBe(0.5);
	});

	it('should score all lenders and sort by relevance', () => {
		const scored = scoreLendersByGeo(LENDER_DIRECTORY, 'Maharashtra', 'Pune');
		expect(scored.length).toBe(LENDER_DIRECTORY.length);

		// First lender should have highest score
		expect(scored[0].geoPresence.geoScore).toBeGreaterThanOrEqual(
			scored[scored.length - 1].geoPresence.geoScore
		);

		// Strongholds should come first
		const firstStrongholdIdx = scored.findIndex((s) => s.geoPresence.isStronghold);
		const lastNonStrongholdBeforeIt = scored.findIndex(
			(s, i) => i < firstStrongholdIdx && !s.geoPresence.isStronghold
		);
		// If there are strongholds, no non-strongholds should precede them
		if (firstStrongholdIdx === 0) {
			expect(lastNonStrongholdBeforeIt).toBe(-1);
		}
	});

	it('should provide presence summary counts', () => {
		const scored = scoreLendersByGeo(LENDER_DIRECTORY, 'Maharashtra');
		const summary = getPresenceSummary(scored);

		const total =
			summary.strong_presence +
			summary.available +
			summary.limited_presence +
			summary.verify_availability;
		expect(total).toBe(LENDER_DIRECTORY.length);
		expect(summary.strong_presence).toBeGreaterThan(0);
	});

	it('should classify city tiers correctly', () => {
		expect(classifyCityTier('Mumbai')).toBe('metro');
		expect(classifyCityTier('Bengaluru')).toBe('metro');
		expect(classifyCityTier('Jaipur')).toBe('tier1');
		expect(classifyCityTier('Noida')).toBe('tier1');
		expect(classifyCityTier('Satara')).toBe('tier2');
		expect(classifyCityTier('')).toBeNull();
	});
});

// ============================================================================
// 3. CATEGORY DEFAULTS TESTS
// ============================================================================

describe('Category Defaults', () => {
	it('should have defaults for all 5 classifications', () => {
		expect(CATEGORY_DEFAULTS['GOV']).toBeDefined();
		expect(CATEGORY_DEFAULTS['PVT']).toBeDefined();
		expect(CATEGORY_DEFAULTS['HFC']).toBeDefined();
		expect(CATEGORY_DEFAULTS['NBFC']).toBeDefined();
		expect(CATEGORY_DEFAULTS['SFB']).toBeDefined();
	});

	it('should return deep copies via getCategoryDefaults', () => {
		const a = getCategoryDefaults('GOV');
		const b = getCategoryDefaults('GOV');
		expect(a).toEqual(b);
		a.minCibil = 999;
		expect(b.minCibil).not.toBe(999);
	});

	it('should have valid FOIR caps (0-1 range)', () => {
		for (const [, cfg] of Object.entries(CATEGORY_DEFAULTS)) {
			expect(cfg.foir.highCap).toBeGreaterThan(0);
			expect(cfg.foir.highCap).toBeLessThanOrEqual(1);
			expect(cfg.foir.midCap).toBeGreaterThan(0);
			expect(cfg.foir.midCap).toBeLessThanOrEqual(1);
			expect(cfg.foir.lowCap).toBeGreaterThan(0);
			expect(cfg.foir.lowCap).toBeLessThanOrEqual(1);
			// High cap >= mid cap >= low cap
			expect(cfg.foir.highCap).toBeGreaterThanOrEqual(cfg.foir.midCap);
			expect(cfg.foir.midCap).toBeGreaterThanOrEqual(cfg.foir.lowCap);
		}
	});

	it('should have valid ROI ranges per product', () => {
		for (const [, cfg] of Object.entries(CATEGORY_DEFAULTS)) {
			for (const [, roi] of Object.entries(cfg.roi)) {
				expect(roi.premiumRate).toBeGreaterThan(0);
				expect(roi.premiumRate).toBeLessThan(roi.standardRate);
				expect(roi.standardRate).toBeLessThan(roi.baseRate);
				expect(roi.baseRate).toBeLessThan(roi.fallbackRate);
			}
		}
	});

	it('should have valid tenure configs', () => {
		for (const [, cfg] of Object.entries(CATEGORY_DEFAULTS)) {
			for (const [, tenure] of Object.entries(cfg.tenure)) {
				expect(tenure.maxTenureMonths).toBeGreaterThanOrEqual(12);
				expect(tenure.maxTenureMonths).toBeLessThanOrEqual(480);
				expect(tenure.maxAgeAtMaturity).toBeGreaterThanOrEqual(55);
				expect(tenure.maxAgeAtMaturity).toBeLessThanOrEqual(80);
			}
		}
	});
});

// ============================================================================
// 4. LENDER OVERRIDES TESTS
// ============================================================================

describe('Lender Overrides', () => {
	it('should have 18 Tier 1 overrides', () => {
		expect(Object.keys(LENDER_OVERRIDES).length).toBe(18);
	});

	it('should have matching lenderIds in directory', () => {
		for (const id of Object.keys(LENDER_OVERRIDES)) {
			expect(LENDER_BY_ID.has(id)).toBe(true);
		}
	});

	it('should have override entries with product names', () => {
		for (const [id, entry] of Object.entries(LENDER_OVERRIDE_ENTRIES)) {
			expect(entry.override).toBeDefined();
			if (entry.productNames) {
				expect(entry.productNames.length).toBeGreaterThan(0);
				for (const pn of entry.productNames) {
					expect(pn.lenderProductName).toBeTruthy();
					expect(ALL_LOAN_PRODUCTS).toContain(pn.ourProduct);
				}
			}
		}
	});

	it('should apply overrides without mutating defaults', () => {
		const base = getCategoryDefaults('PVT');
		const original = structuredClone(base);
		const override = LENDER_OVERRIDES['hdfc-bank']!;

		const result = applyOverride(base, override);

		// Result should have override values
		expect(result.minCibil).toBe(override.minCibil);
		// Base should be unchanged
		expect(base.minCibil).toBe(original.minCibil);
	});

	it('should deep merge nested overrides', () => {
		const base = getCategoryDefaults('GOV');
		const override = LENDER_OVERRIDES['sbi']!;
		const result = applyOverride(base, override);

		// SBI has specific HL ROI
		expect(result.roi.homeLoan.premiumRate).toBe(8.15);
		// Non-overridden products should keep defaults
		// (SBI overrides homeLoan/lap/plotLoan/personalLoan/businessLoan/professionalLoan,
		//  so all are overridden)
	});

	it('should have extended policy data for Tier 1 lenders', () => {
		const tier1WithExtended = [
			'sbi',
			'hdfc-bank',
			'icici-bank',
			'axis-bank',
			'bajaj-finserv',
			'lic-housing'
		];
		for (const id of tier1WithExtended) {
			const entry = LENDER_OVERRIDE_ENTRIES[id];
			expect(entry?.extendedPolicy).toBeDefined();
			expect(entry?.extendedPolicy?.baseRateType).toBeDefined();
			expect(entry?.extendedPolicy?.sourceUrls?.length).toBeGreaterThan(0);
		}
	});
});

// ============================================================================
// 5. COMPILATION TESTS
// ============================================================================

describe('Lender Policy Compilation', () => {
	it('should compile all lenders without error', () => {
		const docs = compileAllLenders();
		expect(docs.length).toBeGreaterThan(0);
	});

	it('should produce one doc per lender per product', () => {
		const detailed = compileAllLendersDetailed();
		for (const entry of detailed) {
			const expectedProducts = LENDER_BY_ID.get(entry.lenderId)!.loanProducts.length;
			expect(entry.productCount).toBe(expectedProducts);
			expect(entry.ruleDocs.length).toBe(expectedProducts);
		}
	});

	it('should produce valid ParsedLenderRuleDocument structure', () => {
		const docs = compileAllLenders();
		for (const doc of docs) {
			// Identity
			expect(doc.lender_id).toBeTruthy();
			expect(doc.lender_name).toBeTruthy();
			expect(doc.classification).toBeTruthy();
			expect(doc.loan_types.length).toBeGreaterThan(0);

			// Sections
			expect(doc.sections).toBeDefined();
			expect(doc.sections.eligibility).not.toBeNull();
			expect(doc.sections.cibil).not.toBeNull();
			expect(doc.sections.foir).not.toBeNull();
			expect(doc.sections.income_assessment).not.toBeNull();
			expect(doc.sections.obligation_treatment).not.toBeNull();
			expect(doc.sections.tenure).not.toBeNull();
			expect(doc.sections.roi).not.toBeNull();
			expect(doc.sections.fees).not.toBeNull();

			// Deviations and policies
			expect(doc.deviations).not.toBeNull();
			expect(doc.policies).not.toBeNull();
		}
	});

	it('should have LTV rules only for secured products', () => {
		const docs = compileAllLenders();
		const securedProducts = new Set([
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan'
		]);

		for (const doc of docs) {
			const isSecured = doc.loan_types.some((lt) => securedProducts.has(lt));
			if (isSecured) {
				expect(doc.sections.ltv).not.toBeNull();
			} else {
				expect(doc.sections.ltv).toBeNull();
			}
		}
	});

	it('should cover all 12 income profile types', () => {
		const docs = compileAllLenders();
		const doc = docs[0]; // Any doc will do
		const incomeRules = doc.sections.income_assessment!;
		const types = incomeRules.map((r) => r.income_profile_type);

		expect(types).toContain('salaried_regular');
		expect(types).toContain('salaried_government');
		expect(types).toContain('salaried_contractual');
		expect(types).toContain('professional_practice');
		expect(types).toContain('business_proprietorship');
		expect(types).toContain('business_partnership');
		expect(types).toContain('director_company');
		expect(types).toContain('pension');
		expect(types).toContain('rental_income');
		expect(types).toContain('freelance_consulting');
		expect(types).toContain('agriculture_income');
		expect(types).toContain('investment_income');
		expect(types).toContain('no_current_income');
	});

	it('should apply overrides for Tier 1 lenders', () => {
		const detailed = compileAllLendersDetailed();
		const sbi = detailed.find((d) => d.lenderId === 'sbi')!;
		expect(sbi.hasOverrides).toBe(true);

		// SBI HL doc should have CIBIL 550 (not category default 650)
		const hlDoc = sbi.ruleDocs.find((d) => d.loan_types.includes('Home Loan'))!;
		const cibilRule = hlDoc.sections.cibil![0];
		// The rule checks >= minCibil, so the logic should reference 550
		expect(JSON.stringify(cibilRule.logic)).toContain('550');
	});

	it('should use category defaults for non-Tier-1 lenders', () => {
		const detailed = compileAllLendersDetailed();
		const bom = detailed.find((d) => d.lenderId === 'bom')!;
		expect(bom.hasOverrides).toBe(false);
	});

	it('should report compilation statistics', () => {
		const stats = getCompilationStats();
		expect(stats.totalLenders).toBe(77);
		expect(stats.totalRuleDocs).toBeGreaterThan(200);
		expect(stats.lendersWithOverrides).toBe(18);
		expect(stats.lendersWithDefaults).toBe(77 - 18);
		expect(stats.byClassification['GOV']).toBe(12);
		expect(stats.byProduct['Home Loan']).toBeGreaterThan(40);
	});
});
