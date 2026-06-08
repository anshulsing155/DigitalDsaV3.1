import { describe, it, expect } from 'vitest';
import {
	INCOME_PROFILE_CARDS,
	getProfileCard,
	getEarningProfileTypes,
	getProfileCardsForLoan,
	allowsCashIncome,
	deriveLegacyEmploymentType,
	validateProfileSelection
} from '$lib/config/incomeProfiles/profileCards';
import {
	getDropdownLabel,
	getEntityNameLabel,
	getEntityNamePlaceholder,
	getSpecificsForProfile,
	getIncomeFieldsForProfile
} from '$lib/config/incomeProfiles/profileFormConfig';
import {
	formatIncomeCurrency,
	formatIndianNumber,
	getFrequencyLabel,
	getEvidenceSummary
} from '$lib/config/incomeProfiles/incomeCalculations';
import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';

// ═══════════════════════════════════════════════════════════════════
// Helpers — reusable fixtures
// ═══════════════════════════════════════════════════════════════════

const ALL_12_TYPES: IncomeProfileType[] = [
	'salaried_regular',
	'salaried_contractual',
	'business_proprietorship',
	'business_partnership',
	'director_company',
	'professional_practice',
	'pension',
	'rental_income',
	'freelance_consulting',
	'agriculture_income',
	'investment_income',
	'no_current_income'
];

function makeEntry(
	overrides: Partial<IncomeSourceEntry> & Pick<IncomeSourceEntry, 'profileType' | 'income'>
): IncomeSourceEntry {
	return {
		id: 'test-entry-' + Math.random().toString(36).slice(2, 8),
		entityName: 'Test Entity',
		specifics: {},
		evidence: { itrFiled: false, hasDocumentaryEvidence: false },
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z',
		filledBy: 'dsa',
		...overrides
	};
}

// ═══════════════════════════════════════════════════════════════════
// 1. PROFILE CARDS (profileCards.ts)
// ═══════════════════════════════════════════════════════════════════

describe('profileCards', () => {
	// ── INCOME_PROFILE_CARDS array ────────────────────────────────────

	describe('INCOME_PROFILE_CARDS', () => {
		it('should contain exactly 12 entries', () => {
			expect(INCOME_PROFILE_CARDS).toHaveLength(12);
		});

		it('should contain all 12 expected profile types', () => {
			const types = INCOME_PROFILE_CARDS.map((c) => c.type);
			for (const t of ALL_12_TYPES) {
				expect(types).toContain(t);
			}
		});

		it('should have unique types (no duplicates)', () => {
			const types = INCOME_PROFILE_CARDS.map((c) => c.type);
			expect(new Set(types).size).toBe(12);
		});

		it('should assign correct categories to employment/business profiles', () => {
			const empBiz: IncomeProfileType[] = [
				'salaried_regular',
				'salaried_contractual',
				'business_proprietorship',
				'business_partnership',
				'director_company',
				'professional_practice',
				'pension'
			];
			for (const t of empBiz) {
				const card = INCOME_PROFILE_CARDS.find((c) => c.type === t);
				expect(card?.category).toBe('employment_business');
			}
		});

		it('should assign correct categories to other_income profiles', () => {
			const other: IncomeProfileType[] = [
				'rental_income',
				'freelance_consulting',
				'agriculture_income',
				'investment_income',
				'no_current_income'
			];
			for (const t of other) {
				const card = INCOME_PROFILE_CARDS.find((c) => c.type === t);
				expect(card?.category).toBe('other_income');
			}
		});

		it('should only mark no_current_income as exclusive', () => {
			for (const card of INCOME_PROFILE_CARDS) {
				if (card.type === 'no_current_income') {
					expect(card.exclusive).toBe(true);
				} else {
					expect(card.exclusive).toBe(false);
				}
			}
		});

		it('should only allow cash income for business_proprietorship and professional_practice', () => {
			for (const card of INCOME_PROFILE_CARDS) {
				if (card.type === 'business_proprietorship' || card.type === 'professional_practice') {
					expect(card.allowsCashIncome).toBe(true);
				} else {
					expect(card.allowsCashIncome).toBe(false);
				}
			}
		});

		it('should have non-empty label and description for every card', () => {
			for (const card of INCOME_PROFILE_CARDS) {
				expect(card.label.length).toBeGreaterThan(0);
				expect(card.description.length).toBeGreaterThan(0);
			}
		});

		it('should have non-empty icon for every card', () => {
			for (const card of INCOME_PROFILE_CARDS) {
				expect(card.icon.length).toBeGreaterThan(0);
			}
		});
	});

	// ── getProfileCard ────────────────────────────────────────────────

	describe('getProfileCard', () => {
		it('should return the correct card for each of the 12 types', () => {
			for (const t of ALL_12_TYPES) {
				const card = getProfileCard(t);
				expect(card).toBeDefined();
				expect(card!.type).toBe(t);
			}
		});

		it('should return undefined for an unknown type', () => {
			const card = getProfileCard('unknown_type' as IncomeProfileType);
			expect(card).toBeUndefined();
		});

		it('should return the salaried_regular card with label "Salaried - Regular"', () => {
			expect(getProfileCard('salaried_regular')?.label).toBe('Salaried - Regular');
		});

		it('should return no_current_income card with exclusive=true', () => {
			expect(getProfileCard('no_current_income')?.exclusive).toBe(true);
		});
	});

	// ── getEarningProfileTypes ────────────────────────────────────────

	describe('getEarningProfileTypes', () => {
		it('should return 11 types (all except no_current_income)', () => {
			const earning = getEarningProfileTypes();
			expect(earning).toHaveLength(11);
		});

		it('should not include no_current_income', () => {
			const earning = getEarningProfileTypes();
			expect(earning).not.toContain('no_current_income');
		});

		it('should include all earning types', () => {
			const earning = getEarningProfileTypes();
			const expected = ALL_12_TYPES.filter((t) => t !== 'no_current_income');
			for (const t of expected) {
				expect(earning).toContain(t);
			}
		});
	});

	// ── getProfileCardsForLoan ────────────────────────────────────────

	describe('getProfileCardsForLoan', () => {
		it('should return all 12 cards regardless of loan type', () => {
			expect(getProfileCardsForLoan('Personal Loan')).toHaveLength(12);
			expect(getProfileCardsForLoan('Business Loan')).toHaveLength(12);
			expect(getProfileCardsForLoan('Professional Loan')).toHaveLength(12);
			expect(getProfileCardsForLoan(undefined)).toHaveLength(12);
			expect(getProfileCardsForLoan('Home Loan')).toHaveLength(12);
		});

		it('should tag recommended cards with recommended=true for Personal Loan', () => {
			const cards = getProfileCardsForLoan('Personal Loan');
			const recommended = cards.filter((c) => c.recommended);
			const recommendedTypes = recommended.map((c) => c.type);
			expect(recommendedTypes).toContain('salaried_regular');
			expect(recommendedTypes).toContain('salaried_contractual');
			expect(recommendedTypes).toContain('professional_practice');
			expect(recommended).toHaveLength(3);
		});

		it('should tag recommended cards for Business Loan', () => {
			const cards = getProfileCardsForLoan('Business Loan');
			const recommended = cards.filter((c) => c.recommended);
			const recommendedTypes = recommended.map((c) => c.type);
			expect(recommendedTypes).toContain('business_proprietorship');
			expect(recommendedTypes).toContain('business_partnership');
			expect(recommendedTypes).toContain('director_company');
			expect(recommendedTypes).toContain('professional_practice');
			expect(recommended).toHaveLength(4);
		});

		it('should tag recommended cards for Professional Loan', () => {
			const cards = getProfileCardsForLoan('Professional Loan');
			const recommended = cards.filter((c) => c.recommended);
			const recommendedTypes = recommended.map((c) => c.type);
			expect(recommendedTypes).toContain('professional_practice');
			expect(recommendedTypes).toContain('salaried_regular');
			expect(recommendedTypes).toContain('salaried_contractual');
			expect(recommended).toHaveLength(3);
		});

		it('should sort recommended cards first for Personal Loan', () => {
			const cards = getProfileCardsForLoan('Personal Loan');
			const firstThree = cards.slice(0, 3).map((c) => c.type);
			expect(firstThree).toContain('salaried_regular');
			expect(firstThree).toContain('salaried_contractual');
			expect(firstThree).toContain('professional_practice');
		});

		it('should mark all cards as not recommended when no loan type', () => {
			const cards = getProfileCardsForLoan(undefined);
			for (const card of cards) {
				expect(card.recommended).toBe(false);
			}
		});

		it('should mark all cards as not recommended for unknown loan type', () => {
			const cards = getProfileCardsForLoan('Unknown Loan');
			for (const card of cards) {
				expect(card.recommended).toBe(false);
			}
		});
	});

	// ── allowsCashIncome ──────────────────────────────────────────────

	describe('allowsCashIncome', () => {
		it('should return true for business_proprietorship', () => {
			expect(allowsCashIncome('business_proprietorship')).toBe(true);
		});

		it('should return true for professional_practice', () => {
			expect(allowsCashIncome('professional_practice')).toBe(true);
		});

		it('should return false for all non-cash types', () => {
			const nonCash: IncomeProfileType[] = [
				'salaried_regular',
				'salaried_contractual',
				'business_partnership',
				'director_company',
				'pension',
				'rental_income',
				'freelance_consulting',
				'agriculture_income',
				'investment_income',
				'no_current_income'
			];
			for (const t of nonCash) {
				expect(allowsCashIncome(t)).toBe(false);
			}
		});

		it('should return false for unknown type', () => {
			expect(allowsCashIncome('nonexistent' as IncomeProfileType)).toBe(false);
		});
	});

	// ── deriveLegacyEmploymentType ────────────────────────────────────

	describe('deriveLegacyEmploymentType', () => {
		it('should return "Salaried(Private)" for salaried_regular with private employer', () => {
			expect(
				deriveLegacyEmploymentType(['salaried_regular'], { employerType: 'private_reputed' })
			).toBe('Salaried(Private)');
		});

		it('should return "Salaried(Government)" for salaried_regular with government employer', () => {
			expect(deriveLegacyEmploymentType(['salaried_regular'], { employerType: 'government' })).toBe(
				'Salaried(Government)'
			);
		});

		it('should return "Salaried(Government)" for salaried_regular with psu employer', () => {
			expect(deriveLegacyEmploymentType(['salaried_regular'], { employerType: 'psu' })).toBe(
				'Salaried(Government)'
			);
		});

		it('should return "Salaried(Private)" for salaried_regular without specifics', () => {
			expect(deriveLegacyEmploymentType(['salaried_regular'])).toBe('Salaried(Private)');
		});

		it('should return "Salaried(Private)" for salaried_contractual', () => {
			expect(deriveLegacyEmploymentType(['salaried_contractual'])).toBe('Salaried(Private)');
		});

		it('should return "Self-employed(Professional)" for professional_practice', () => {
			expect(deriveLegacyEmploymentType(['professional_practice'])).toBe(
				'Self-employed(Professional)'
			);
		});

		it('should return "Self-employed(Other)" for business_proprietorship', () => {
			expect(deriveLegacyEmploymentType(['business_proprietorship'])).toBe('Self-employed(Other)');
		});

		it('should return "Self-employed(Other)" for business_partnership', () => {
			expect(deriveLegacyEmploymentType(['business_partnership'])).toBe('Self-employed(Other)');
		});

		it('should return "Self-employed(Other)" for director_company', () => {
			expect(deriveLegacyEmploymentType(['director_company'])).toBe('Self-employed(Other)');
		});

		it('should return "Pensioner" for pension', () => {
			expect(deriveLegacyEmploymentType(['pension'])).toBe('Pensioner');
		});

		it('should return "HomeMaker" for no_current_income', () => {
			expect(deriveLegacyEmploymentType(['no_current_income'])).toBe('HomeMaker');
		});

		it('should return "Others" for empty selection', () => {
			expect(deriveLegacyEmploymentType([])).toBe('Others');
		});

		it('should return "Others" for only other_income types (rental, agriculture, etc.)', () => {
			expect(deriveLegacyEmploymentType(['rental_income'])).toBe('Others');
			expect(deriveLegacyEmploymentType(['freelance_consulting'])).toBe('Others');
			expect(deriveLegacyEmploymentType(['agriculture_income'])).toBe('Others');
			expect(deriveLegacyEmploymentType(['investment_income'])).toBe('Others');
		});

		it('should prioritise salaried_regular over all others', () => {
			expect(
				deriveLegacyEmploymentType(
					['business_proprietorship', 'salaried_regular', 'professional_practice'],
					{ employerType: 'private_reputed' }
				)
			).toBe('Salaried(Private)');
		});

		it('should prioritise salaried_contractual after salaried_regular', () => {
			expect(deriveLegacyEmploymentType(['professional_practice', 'salaried_contractual'])).toBe(
				'Salaried(Private)'
			);
		});

		it('should prioritise professional_practice over business types', () => {
			expect(deriveLegacyEmploymentType(['business_proprietorship', 'professional_practice'])).toBe(
				'Self-employed(Professional)'
			);
		});
	});

	// ── validateProfileSelection ──────────────────────────────────────

	describe('validateProfileSelection', () => {
		it('should return invalid for empty selection', () => {
			const result = validateProfileSelection([]);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Please select at least one income source');
		});

		it('should return valid for single earning profile', () => {
			const result = validateProfileSelection(['salaried_regular']);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should return valid for multiple earning profiles', () => {
			const result = validateProfileSelection([
				'salaried_regular',
				'rental_income',
				'investment_income'
			]);
			expect(result.valid).toBe(true);
		});

		it('should return valid for no_current_income alone', () => {
			const result = validateProfileSelection(['no_current_income']);
			expect(result.valid).toBe(true);
		});

		it('should return invalid for no_current_income combined with earning profiles', () => {
			const result = validateProfileSelection(['no_current_income', 'salaried_regular']);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('"No Current Income" cannot be combined with other income sources');
		});

		it('should return invalid for no_current_income combined with any earning type', () => {
			for (const t of ALL_12_TYPES.filter((x) => x !== 'no_current_income')) {
				const result = validateProfileSelection(['no_current_income', t]);
				expect(result.valid).toBe(false);
			}
		});

		it('should return valid for all earning profiles selected at once', () => {
			const allEarning = ALL_12_TYPES.filter((t) => t !== 'no_current_income');
			const result = validateProfileSelection(allEarning);
			expect(result.valid).toBe(true);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// 2. PROFILE FORM CONFIG (profileFormConfig.ts)
// ═══════════════════════════════════════════════════════════════════

describe('profileFormConfig', () => {
	// ── getDropdownLabel ──────────────────────────────────────────────

	describe('getDropdownLabel', () => {
		const expectedLabels: Record<IncomeProfileType, string> = {
			salaried_regular: 'Salaried Employment',
			salaried_contractual: 'Contractual / Third-party Employment',
			business_proprietorship: 'Business (Proprietorship)',
			business_partnership: 'Partner in Firm',
			director_company: 'Director in Company',
			professional_practice: 'Professional Practice',
			pension: 'Pension Income',
			rental_income: 'Rental Income',
			freelance_consulting: 'Freelance / Consulting',
			agriculture_income: 'Agriculture Income',
			investment_income: 'Investment Income',
			no_current_income: 'No Current Income'
		};

		for (const [type, label] of Object.entries(expectedLabels)) {
			it(`should return "${label}" for ${type}`, () => {
				expect(getDropdownLabel(type as IncomeProfileType)).toBe(label);
			});
		}
	});

	// ── getEntityNameLabel ────────────────────────────────────────────

	describe('getEntityNameLabel', () => {
		const expectedLabels: Record<IncomeProfileType, string> = {
			salaried_regular: 'Employer Name',
			salaried_contractual: 'Employer / Staffing Agency Name',
			business_proprietorship: 'Business / Firm Name',
			business_partnership: 'Partnership / LLP Firm Name',
			director_company: 'Company Name',
			professional_practice: 'Practice / Clinic Name',
			pension: 'Pension Source (Department / Organization)',
			rental_income: 'Property Description',
			freelance_consulting: 'Primary Client / Nature of Work',
			agriculture_income: 'Farm / Land Description',
			investment_income: 'Investment Type',
			no_current_income: ''
		};

		for (const [type, label] of Object.entries(expectedLabels)) {
			it(`should return "${label}" for ${type}`, () => {
				expect(getEntityNameLabel(type as IncomeProfileType)).toBe(label);
			});
		}
	});

	// ── getEntityNamePlaceholder ──────────────────────────────────────

	describe('getEntityNamePlaceholder', () => {
		const expectedPlaceholders: Record<IncomeProfileType, string> = {
			salaried_regular: 'Enter employer name',
			salaried_contractual: 'Enter employer or staffing agency name',
			business_proprietorship: 'Enter business or trade name',
			business_partnership: 'Enter partnership or LLP firm name',
			director_company: 'Enter company name',
			professional_practice: 'Enter practice or clinic name',
			pension: 'Enter department or organization name',
			rental_income: 'E.g., 2BHK Flat - Andheri West',
			freelance_consulting: 'E.g., IT Consulting, Content Writing',
			agriculture_income: 'E.g., 5 acres - Sugarcane - Pune',
			investment_income: 'E.g., Mutual Funds, FDs, Stocks',
			no_current_income: ''
		};

		for (const [type, placeholder] of Object.entries(expectedPlaceholders)) {
			it(`should return correct placeholder for ${type}`, () => {
				expect(getEntityNamePlaceholder(type as IncomeProfileType)).toBe(placeholder);
			});
		}
	});

	// ── getSpecificsForProfile ────────────────────────────────────────

	describe('getSpecificsForProfile', () => {
		it('should return non-empty questions array for every earning type', () => {
			for (const t of ALL_12_TYPES) {
				const specifics = getSpecificsForProfile(t);
				if (t === 'no_current_income') {
					// no_current_income has specifics too
					expect(specifics.length).toBeGreaterThan(0);
				} else {
					expect(specifics.length).toBeGreaterThan(0);
				}
			}
		});

		it('should return questions with required id, key, type, question fields', () => {
			for (const t of ALL_12_TYPES) {
				const specifics = getSpecificsForProfile(t);
				for (const q of specifics) {
					expect(q.id).toBeDefined();
					expect(q.id.length).toBeGreaterThan(0);
					expect(q.key).toBeDefined();
					expect(q.key.length).toBeGreaterThan(0);
					expect(q.type).toBeDefined();
					expect([
						'radio',
						'select',
						'text',
						'number',
						'multiple-select',
						'calendar',
						'percentage',
						'month-year'
					]).toContain(q.type);
					expect(q.question).toBeDefined();
					expect(q.question.length).toBeGreaterThan(0);
				}
			}
		});

		it('should return questions with unique ids within each profile', () => {
			for (const t of ALL_12_TYPES) {
				const specifics = getSpecificsForProfile(t);
				const ids = specifics.map((q) => q.id);
				expect(new Set(ids).size).toBe(ids.length);
			}
		});

		it('should return questions with unique keys within each profile', () => {
			for (const t of ALL_12_TYPES) {
				const specifics = getSpecificsForProfile(t);
				const keys = specifics.map((q) => q.key);
				expect(new Set(keys).size).toBe(keys.length);
			}
		});

		it('should return salaried_regular specifics with employerType question', () => {
			const specifics = getSpecificsForProfile('salaried_regular');
			const employerType = specifics.find((q) => q.key === 'employerType');
			expect(employerType).toBeDefined();
			expect(employerType!.type).toBe('select');
			expect(employerType!.required).toBe(true);
		});

		it('should return salaried_regular specifics with salaryInBank question that has invalidateOn', () => {
			const specifics = getSpecificsForProfile('salaried_regular');
			const salaryInBank = specifics.find((q) => q.key === 'salaryInBank');
			expect(salaryInBank).toBeDefined();
			expect(salaryInBank!.invalidateOn).toBe(false);
		});

		it('should return salaried_contractual specifics with payrollType question', () => {
			const specifics = getSpecificsForProfile('salaried_contractual');
			const payrollType = specifics.find((q) => q.key === 'payrollType');
			expect(payrollType).toBeDefined();
			expect(payrollType!.type).toBe('select');
		});

		it('should return business_proprietorship specifics with gstRegistered question', () => {
			const specifics = getSpecificsForProfile('business_proprietorship');
			const gst = specifics.find((q) => q.key === 'gstRegistered');
			expect(gst).toBeDefined();
			expect(gst!.type).toBe('select');
		});

		it('should return business_partnership specifics with firmType question', () => {
			const specifics = getSpecificsForProfile('business_partnership');
			const firmType = specifics.find((q) => q.key === 'firmType');
			expect(firmType).toBeDefined();
			expect(firmType!.options).toBeDefined();
			expect(firmType!.options!.length).toBe(2); // Partnership / LLP
		});

		it('should return director_company specifics with companyType and shareholding', () => {
			const specifics = getSpecificsForProfile('director_company');
			expect(specifics.find((q) => q.key === 'companyType')).toBeDefined();
			expect(specifics.find((q) => q.key === 'shareholding')).toBeDefined();
		});

		it('should return professional_practice specifics with professionType options', () => {
			const specifics = getSpecificsForProfile('professional_practice');
			const prof = specifics.find((q) => q.key === 'professionType');
			expect(prof).toBeDefined();
			expect(prof!.options!.length).toBe(4); // MBBS, CA, Lawyer, Architect (CS/CMA removed)
		});

		it('should return pension specifics with pensionType question', () => {
			const specifics = getSpecificsForProfile('pension');
			const pType = specifics.find((q) => q.key === 'pensionType');
			expect(pType).toBeDefined();
			expect(pType!.options!.length).toBe(8);
		});

		it('should return rental_income specifics with propertyType question', () => {
			const specifics = getSpecificsForProfile('rental_income');
			expect(specifics.find((q) => q.key === 'propertyType')).toBeDefined();
		});

		it('should return freelance_consulting specifics with activeClients question', () => {
			const specifics = getSpecificsForProfile('freelance_consulting');
			expect(specifics.find((q) => q.key === 'activeClients')).toBeDefined();
		});

		it('should return agriculture_income specifics with landArea and cropType', () => {
			const specifics = getSpecificsForProfile('agriculture_income');
			expect(specifics.find((q) => q.key === 'landArea')).toBeDefined();
			expect(specifics.find((q) => q.key === 'cropType')).toBeDefined();
		});

		it('should return investment_income specifics with investmentType question', () => {
			const specifics = getSpecificsForProfile('investment_income');
			expect(specifics.find((q) => q.key === 'investmentType')).toBeDefined();
		});

		it('should return no_current_income specifics with wasEarningBefore question', () => {
			const specifics = getSpecificsForProfile('no_current_income');
			expect(specifics.find((q) => q.key === 'wasEarningBefore')).toBeDefined();
		});

		it('should return empty array for unknown type', () => {
			const specifics = getSpecificsForProfile('unknown' as IncomeProfileType);
			expect(specifics).toHaveLength(0);
		});
	});

	// ── getIncomeFieldsForProfile ─────────────────────────────────────

	describe('getIncomeFieldsForProfile', () => {
		it('should return salaried fields for salaried_regular', () => {
			const fields = getIncomeFieldsForProfile('salaried_regular');
			expect(fields.length).toBeGreaterThan(0);
			const keys = fields.map((f) => f.key);
			expect(keys).toContain('grossMonthlySalary');
			expect(keys).toContain('netMonthlySalary');
		});

		it('should return same salaried fields for salaried_contractual', () => {
			const regular = getIncomeFieldsForProfile('salaried_regular');
			const contractual = getIncomeFieldsForProfile('salaried_contractual');
			expect(contractual).toEqual(regular);
		});

		it('should return director fields with drawsSalary and receivesProfit', () => {
			const fields = getIncomeFieldsForProfile('director_company');
			const keys = fields.map((f) => f.key);
			expect(keys).toContain('drawsSalary');
			expect(keys).toContain('monthlySalaryAmount');
			expect(keys).toContain('receivesProfit');
			expect(keys).toContain('profitFrequency');
			expect(keys).toContain('averageProfitPerWithdrawal');
		});

		it('should return partner fields with drawsSalary and receivesProfit', () => {
			const fields = getIncomeFieldsForProfile('business_partnership');
			const keys = fields.map((f) => f.key);
			expect(keys).toContain('drawsSalary');
			expect(keys).toContain('monthlySalaryAmount');
			expect(keys).toContain('receivesProfit');
			expect(keys).toContain('profitFrequency');
			expect(keys).toContain('averageProfitPerWithdrawal');
		});

		it('should return business fields with financialsTable, averageBankBalance, cashAmount', () => {
			const fields = getIncomeFieldsForProfile('business_proprietorship');
			const keys = fields.map((f) => f.key);
			expect(keys).toContain('financialsTable');
			expect(keys).toContain('averageBankBalance');
			expect(keys).toContain('cashAmount');
		});

		it('should return professional fields with financialsTable, averageBankBalance, cashAmount', () => {
			const fields = getIncomeFieldsForProfile('professional_practice');
			const keys = fields.map((f) => f.key);
			expect(keys).toContain('financialsTable');
			expect(keys).toContain('averageBankBalance');
			expect(keys).toContain('cashAmount');
		});

		it('should return pension field monthlyPensionAmount', () => {
			const fields = getIncomeFieldsForProfile('pension');
			expect(fields).toHaveLength(1);
			expect(fields[0].key).toBe('monthlyPensionAmount');
		});

		it('should return rental field monthlyRentAmount', () => {
			const fields = getIncomeFieldsForProfile('rental_income');
			expect(fields).toHaveLength(1);
			expect(fields[0].key).toBe('monthlyRentAmount');
		});

		it('should return freelance field averageMonthlyFreelanceIncome', () => {
			const fields = getIncomeFieldsForProfile('freelance_consulting');
			expect(fields).toHaveLength(1);
			expect(fields[0].key).toBe('averageMonthlyFreelanceIncome');
		});

		it('should return agriculture field averageAnnualAgricultureIncome', () => {
			const fields = getIncomeFieldsForProfile('agriculture_income');
			expect(fields).toHaveLength(1);
			expect(fields[0].key).toBe('averageAnnualAgricultureIncome');
		});

		it('should return investment field averageAnnualInvestmentIncome', () => {
			const fields = getIncomeFieldsForProfile('investment_income');
			expect(fields).toHaveLength(1);
			expect(fields[0].key).toBe('averageAnnualInvestmentIncome');
		});

		it('should return empty array for no_current_income', () => {
			const fields = getIncomeFieldsForProfile('no_current_income');
			expect(fields).toHaveLength(0);
		});

		it('should return empty array for unknown type', () => {
			const fields = getIncomeFieldsForProfile('unknown' as IncomeProfileType);
			expect(fields).toHaveLength(0);
		});

		it('should have all income fields with required id, key, type, label properties', () => {
			for (const t of ALL_12_TYPES) {
				const fields = getIncomeFieldsForProfile(t);
				for (const f of fields) {
					expect(f.id).toBeDefined();
					expect(f.id.length).toBeGreaterThan(0);
					expect(f.key).toBeDefined();
					expect(f.key.length).toBeGreaterThan(0);
					expect(f.type).toBeDefined();
					expect(['number', 'select', 'radio', 'table']).toContain(f.type);
					expect(f.label).toBeDefined();
					expect(f.label.length).toBeGreaterThan(0);
				}
			}
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// 3. INCOME CALCULATIONS (incomeCalculations.ts)
// ═══════════════════════════════════════════════════════════════════

describe('incomeCalculations', () => {
	// ── formatIncomeCurrency ──────────────────────────────────────────

	describe('formatIncomeCurrency', () => {
		it('should format 150000 as "₹1,50,000"', () => {
			expect(formatIncomeCurrency(150000)).toBe('₹1,50,000');
		});

		it('should format 1000 as "₹1,000"', () => {
			expect(formatIncomeCurrency(1000)).toBe('₹1,000');
		});

		it('should format 100 as "₹100"', () => {
			expect(formatIncomeCurrency(100)).toBe('₹100');
		});

		it('should format 0 as "₹0"', () => {
			expect(formatIncomeCurrency(0)).toBe('₹0');
		});

		it('should format 10000000 as "₹1,00,00,000"', () => {
			expect(formatIncomeCurrency(10000000)).toBe('₹1,00,00,000');
		});

		it('should format 99999 as "₹99,999"', () => {
			expect(formatIncomeCurrency(99999)).toBe('₹99,999');
		});

		it('should format 1234567 as "₹12,34,567"', () => {
			expect(formatIncomeCurrency(1234567)).toBe('₹12,34,567');
		});

		it('should handle negative numbers', () => {
			expect(formatIncomeCurrency(-150000)).toBe('-₹1,50,000');
		});

		it('should handle NaN as "₹0"', () => {
			expect(formatIncomeCurrency(NaN)).toBe('₹0');
		});

		it('should format 50 as "₹50"', () => {
			expect(formatIncomeCurrency(50)).toBe('₹50');
		});

		it('should format 999 as "₹999"', () => {
			expect(formatIncomeCurrency(999)).toBe('₹999');
		});

		it('should round decimal amounts', () => {
			expect(formatIncomeCurrency(150000.7)).toBe('₹1,50,001');
		});
	});

	// ── formatIndianNumber ────────────────────────────────────────────

	describe('formatIndianNumber', () => {
		it('should format 150000 as "1,50,000"', () => {
			expect(formatIndianNumber(150000)).toBe('1,50,000');
		});

		it('should format 1000 as "1,000"', () => {
			expect(formatIndianNumber(1000)).toBe('1,000');
		});

		it('should format 100 as "100"', () => {
			expect(formatIndianNumber(100)).toBe('100');
		});

		it('should format 0 as "0"', () => {
			expect(formatIndianNumber(0)).toBe('0');
		});

		it('should format 10000000 as "1,00,00,000"', () => {
			expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
		});

		it('should handle NaN as "0"', () => {
			expect(formatIndianNumber(NaN)).toBe('0');
		});

		it('should format 999 as "999"', () => {
			expect(formatIndianNumber(999)).toBe('999');
		});

		it('should format 1234567 as "12,34,567"', () => {
			expect(formatIndianNumber(1234567)).toBe('12,34,567');
		});
	});

	// ── getFrequencyLabel ─────────────────────────────────────────────

	describe('getFrequencyLabel', () => {
		it('should return "Monthly" for monthly', () => {
			expect(getFrequencyLabel('monthly')).toBe('Monthly');
		});

		it('should return "Quarterly" for quarterly', () => {
			expect(getFrequencyLabel('quarterly')).toBe('Quarterly');
		});

		it('should return "Half-Yearly" for half_yearly', () => {
			expect(getFrequencyLabel('half_yearly')).toBe('Half-Yearly');
		});

		it('should return "Annually" for annual', () => {
			expect(getFrequencyLabel('annual')).toBe('Annually');
		});

		it('should return "As & When" for as_and_when', () => {
			expect(getFrequencyLabel('as_and_when')).toBe('As & When');
		});
	});

	// ── getEvidenceSummary ────────────────────────────────────────────

	describe('getEvidenceSummary', () => {
		it('should return "Fully Verifiable" when both ITR and documentary evidence', () => {
			const entry = makeEntry({
				profileType: 'salaried_regular',
				income: { netMonthlySalary: 80000 },
				evidence: { itrFiled: true, hasDocumentaryEvidence: true }
			});
			const result = getEvidenceSummary(entry);
			expect(result.label).toBe('Fully Verifiable');
			expect(result.color).toBe('text-green-600');
			expect(result.icon).toBe('CheckCircle2');
		});

		it('should return "Partially Verifiable" when only ITR filed', () => {
			const entry = makeEntry({
				profileType: 'salaried_regular',
				income: { netMonthlySalary: 80000 },
				evidence: { itrFiled: true, hasDocumentaryEvidence: false }
			});
			const result = getEvidenceSummary(entry);
			expect(result.label).toBe('Partially Verifiable');
			expect(result.color).toBe('text-stone-600');
			expect(result.icon).toBe('AlertCircle');
		});

		it('should return "Partially Verifiable" when only documentary evidence', () => {
			const entry = makeEntry({
				profileType: 'salaried_regular',
				income: { netMonthlySalary: 80000 },
				evidence: { itrFiled: false, hasDocumentaryEvidence: true }
			});
			const result = getEvidenceSummary(entry);
			expect(result.label).toBe('Partially Verifiable');
			expect(result.color).toBe('text-stone-600');
			expect(result.icon).toBe('AlertCircle');
		});

		it('should return "Declared Only" when no evidence at all', () => {
			const entry = makeEntry({
				profileType: 'rental_income',
				income: { monthlyRentAmount: 25000 },
				evidence: { itrFiled: false, hasDocumentaryEvidence: false }
			});
			const result = getEvidenceSummary(entry);
			expect(result.label).toBe('Declared Only');
			expect(result.color).toBe('text-red-500');
			expect(result.icon).toBe('AlertTriangle');
		});

		it('should handle pension entry evidence states', () => {
			const fullyVerifiable = makeEntry({
				profileType: 'pension',
				income: { monthlyPensionAmount: 40000 },
				evidence: { itrFiled: true, hasDocumentaryEvidence: true }
			});
			expect(getEvidenceSummary(fullyVerifiable).label).toBe('Fully Verifiable');
		});

		it('should handle business_proprietorship declared only', () => {
			const declared = makeEntry({
				profileType: 'business_proprietorship',
				income: { averageBankBalance: 100000 },
				evidence: { itrFiled: false, hasDocumentaryEvidence: false }
			});
			expect(getEvidenceSummary(declared).label).toBe('Declared Only');
		});

		it('should handle no_current_income', () => {
			const noIncome = makeEntry({
				profileType: 'no_current_income',
				income: {},
				evidence: { itrFiled: false, hasDocumentaryEvidence: false }
			});
			expect(getEvidenceSummary(noIncome).label).toBe('Declared Only');
		});
	});
});
