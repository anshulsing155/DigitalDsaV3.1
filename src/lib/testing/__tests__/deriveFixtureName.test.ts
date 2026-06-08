import { describe, it, expect } from 'vitest';
import { deriveFixtureName } from '$lib/testing/deriveFixtureName.js';

// ─── Test data builders ───────────────────────────────────────────────────────
// These produce minimal valid answer objects. Tests override only the fields
// they care about so the intent stays obvious.

function baseLoanAnswers(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		loanName: 'Home Loan',
		loanType: 'New Loan',
		propertyCityName: 'Mumbai',
		__applicantCount: 1,
		applicationStructure: 'Individual / Sole-Proprietor',
		...overrides
	};
}

function primaryApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		employmentType: 'Salaried(Private)',
		creditScore: 750,
		...overrides
	};
}

function coApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		employmentType: 'Salaried(Private)',
		creditScore: 730,
		relationshipWithPrimary: 'Spouse',
		...overrides
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('deriveFixtureName', () => {
	// ── Format ──────────────────────────────────────────────────────────────────

	describe('format', () => {
		it('produces at least 5 segments for a fully filled scenario', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant()]);
			const parts = name.split(' · ');
			expect(parts.length).toBeGreaterThanOrEqual(5);
		});
	});

	// ── Loan type ───────────────────────────────────────────────────────────────

	describe('loan type', () => {
		const cases: Array<[string, string]> = [
			['Home Loan', 'Home Loan'],
			['Loan Against Property', 'LAP'],
			['Plot Loan', 'Plot Loan'],
			['Personal Loan', 'Personal Loan'],
			['Business Loan', 'Business Loan'],
			['Business Loan - Unsecured', 'Business Loan'],
			['Professional Loan', 'Professional Loan']
		];

		for (const [input, expected] of cases) {
			it(`"${input}" → "${expected}"`, () => {
				const name = deriveFixtureName(baseLoanAnswers({ loanName: input }), [primaryApplicant()]);
				expect(name.startsWith(expected + ' ·')).toBe(true);
			});
		}
	});

	// ── Form path ───────────────────────────────────────────────────────────────

	describe('form path', () => {
		const cases: Array<[string, string]> = [
			['New Loan', 'New Loan'],
			['Balance Transfer Only', 'Balance Transfer'],
			['Balance Transfer With Top-up', 'BT + Top-up'],
			['Top-up Only', 'Top-up'],
			['Debt Consolidation', 'Debt Consolidation'],
			['Debt Consolidation with Extra Funds', 'Debt Consolidation + Extra'],
			['Plot Loan Only', 'Plot Only'],
			['Plot & Construction Loan', 'Plot + Construction'],
			['Plot & Equity Loan', 'Plot + Equity'],
			['Construction Loan Only', 'Construction Only'],
			['Plot Balance Transfer', 'Plot BT']
		];

		for (const [input, expected] of cases) {
			it(`loanType "${input}" → "${expected}"`, () => {
				const name = deriveFixtureName(baseLoanAnswers({ loanType: input }), [primaryApplicant()]);
				expect(name).toContain(expected);
			});
		}
	});

	// ── Employment ──────────────────────────────────────────────────────────────

	describe('employment', () => {
		it('Salaried(Private) → "Salaried Private"', () => {
			const name = deriveFixtureName(
				baseLoanAnswers(),
				[primaryApplicant({ employmentType: 'Salaried(Private)' })]
			);
			expect(name).toContain('Salaried Private');
		});

		it('Salaried(Government) → "Salaried Govt"', () => {
			const name = deriveFixtureName(
				baseLoanAnswers(),
				[primaryApplicant({ employmentType: 'Salaried(Government)' })]
			);
			expect(name).toContain('Salaried Govt');
		});

		it('Self-employed(Other) → "Self-Employed Business"', () => {
			const name = deriveFixtureName(
				baseLoanAnswers(),
				[primaryApplicant({ employmentType: 'Self-employed(Other)' })]
			);
			expect(name).toContain('Self-Employed Business');
		});

		it('Pensioner → "Pensioner"', () => {
			const name = deriveFixtureName(
				baseLoanAnswers(),
				[primaryApplicant({ employmentType: 'Pensioner' })]
			);
			expect(name).toContain('Pensioner');
		});

		it('Self-employed(Professional) + CA → "CA"', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [
				primaryApplicant({
					employmentType: 'Self-employed(Professional)',
					professionType: 'Chartered Accountant(CA)'
				})
			]);
			expect(name).toContain('CA');
		});

		it('Self-employed(Professional) + Doctor → "Doctor"', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [
				primaryApplicant({
					employmentType: 'Self-employed(Professional)',
					professionType: 'MBBS Doctor'
				})
			]);
			expect(name).toContain('Doctor');
		});

		it('Self-employed(Professional) + Lawyer → "Lawyer"', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [
				primaryApplicant({
					employmentType: 'Self-employed(Professional)',
					professionType: 'Lawyer'
				})
			]);
			expect(name).toContain('Lawyer');
		});

		it('Self-employed(Professional) + Architect → "Architect"', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [
				primaryApplicant({
					employmentType: 'Self-employed(Professional)',
					professionType: 'Architect'
				})
			]);
			expect(name).toContain('Architect');
		});

		it('Self-employed(Professional) without professionType → "Self-Employed Professional"', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [
				primaryApplicant({ employmentType: 'Self-employed(Professional)' })
			]);
			expect(name).toContain('Self-Employed Professional');
		});
	});

	// ── City ────────────────────────────────────────────────────────────────────

	describe('city', () => {
		it('uses propertyCityName for secured loans', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ propertyCityName: 'Bangalore', loanName: 'Home Loan' }),
				[primaryApplicant()]
			);
			expect(name).toContain('Bangalore');
		});

		it('uses residenceCityName when propertyCityName is absent (personal loan)', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Personal Loan',
					loanType: 'New Loan',
					residenceCityName: 'Jaipur',
					__applicantCount: 1,
					applicationStructure: 'Individual / Sole-Proprietor'
				},
				[primaryApplicant()]
			);
			expect(name).toContain('Jaipur');
		});

		it('uses businessCityName for professional loan when propertyCityName absent', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Professional Loan',
					loanType: 'New Loan',
					businessCityName: 'Ahmedabad',
					__applicantCount: 1,
					applicationStructure: 'Individual / Sole-Proprietor'
				},
				[
					primaryApplicant({
						employmentType: 'Self-employed(Professional)',
						professionType: 'Chartered Accountant(CA)'
					})
				]
			);
			expect(name).toContain('Ahmedabad');
		});

		it('propertyCityName wins over businessCityName when both are present', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ propertyCityName: 'Mumbai', businessCityName: 'Delhi' }),
				[primaryApplicant()]
			);
			expect(name).toContain('Mumbai');
			expect(name).not.toContain('Delhi');
		});
	});

	// ── CIBIL ───────────────────────────────────────────────────────────────────

	describe('CIBIL', () => {
		it('formats as "CIBIL {score}"', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ creditScore: 750 })]);
			expect(name).toContain('CIBIL 750');
		});

		it('uses primary applicant score, not co-applicant score', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ __applicantCount: 2, applicationStructure: 'Couple' }),
				[primaryApplicant({ creditScore: 780 }), coApplicant({ creditScore: 650 })]
			);
			expect(name).toContain('CIBIL 780');
			expect(name).not.toContain('CIBIL 650');
		});

		it('omits CIBIL segment when creditScore is missing', () => {
			const applicant = primaryApplicant();
			delete applicant['creditScore'];
			const name = deriveFixtureName(baseLoanAnswers(), [applicant]);
			expect(name).not.toContain('CIBIL');
		});

		it('omits CIBIL segment when creditScore is 0', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ creditScore: 0 })]);
			expect(name).not.toContain('CIBIL');
		});

		it('omits CIBIL segment when creditScore is empty string', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ creditScore: '' })]);
			expect(name).not.toContain('CIBIL');
		});
	});

	// ── Applicant structure ─────────────────────────────────────────────────────

	describe('applicant structure', () => {
		it('Solo for single applicant', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ __applicantCount: 1 }),
				[primaryApplicant()]
			);
			expect(name).toContain('Solo');
		});

		it('Couple when applicationStructure is "Couple"', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ __applicantCount: 2, applicationStructure: 'Couple' }),
				[primaryApplicant(), coApplicant({ relationshipWithPrimary: 'Spouse' })]
			);
			expect(name).toContain('Couple');
		});

		it('Couple when co-applicant relationshipWithPrimary is "Spouse"', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ __applicantCount: 2, applicationStructure: 'Family' }),
				[primaryApplicant(), coApplicant({ relationshipWithPrimary: 'Spouse' })]
			);
			expect(name).toContain('Couple');
		});

		it('Company when applicationStructure contains "Company"', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({
					__applicantCount: 1,
					applicationStructure: 'Company (Non-individual entity)'
				}),
				[primaryApplicant()]
			);
			expect(name).toContain('Company');
		});

		it('3 Applicants when __applicantCount is 3', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ __applicantCount: 3, applicationStructure: 'Family' }),
				[primaryApplicant(), coApplicant(), coApplicant({ relationshipWithPrimary: 'Son' })]
			);
			expect(name).toContain('3 Applicants');
		});

		const familyRelationships: Array<[string, string]> = [
			['Father', 'Primary + Father'],
			['Mother', 'Primary + Mother'],
			['Son', 'Primary + Son'],
			['Daughter', 'Primary + Daughter'],
			['Brother', 'Primary + Brother'],
			['Sister', 'Primary + Sister'],
			['Other, in blood relation', 'Primary + Relative'],
			['Other, not in blood relation', 'Primary + Co-Applicant']
		];

		for (const [relationship, expected] of familyRelationships) {
			it(`"${relationship}" co-applicant → "${expected}"`, () => {
				const name = deriveFixtureName(
					baseLoanAnswers({ __applicantCount: 2, applicationStructure: 'Family' }),
					[primaryApplicant(), coApplicant({ relationshipWithPrimary: relationship })]
				);
				expect(name).toContain(expected);
			});
		}
	});

	// ── Edge tags ───────────────────────────────────────────────────────────────

	describe('edge tags', () => {
		it('adds NRI tag when primary applicant isNRI is boolean true', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ isNRI: true })]);
			expect(name).toContain('NRI');
		});

		it('adds NRI tag when isNRI is the string "Yes"', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ isNRI: 'Yes' })]);
			expect(name).toContain('NRI');
		});

		it('adds NRI tag when a co-applicant is NRI even if primary is not', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ __applicantCount: 2, applicationStructure: 'Couple' }),
				[primaryApplicant(), coApplicant({ isNRI: true })]
			);
			expect(name).toContain('NRI');
		});

		it('does not add NRI tag when isNRI is false', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ isNRI: false })]);
			expect(name).not.toContain('NRI');
		});

		it('adds Low CIBIL tag when creditScore < 650', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ creditScore: 620 })]);
			expect(name).toContain('Low CIBIL');
		});

		it('does not add Low CIBIL tag when creditScore is exactly 650', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ creditScore: 650 })]);
			expect(name).not.toContain('Low CIBIL');
		});

		it('does not add Low CIBIL tag when creditScore is above 650', () => {
			const name = deriveFixtureName(baseLoanAnswers(), [primaryApplicant({ creditScore: 700 })]);
			expect(name).not.toContain('Low CIBIL');
		});

		it('NRI and Low CIBIL both appear when both conditions apply', () => {
			const name = deriveFixtureName(
				baseLoanAnswers(),
				[primaryApplicant({ isNRI: true, creditScore: 600 })]
			);
			expect(name).toContain('NRI');
			expect(name).toContain('Low CIBIL');
		});

		it('NRI appears before Low CIBIL in the name', () => {
			const name = deriveFixtureName(
				baseLoanAnswers(),
				[primaryApplicant({ isNRI: true, creditScore: 600 })]
			);
			const nriIndex = name.indexOf('NRI');
			const lowCibilIndex = name.indexOf('Low CIBIL');
			expect(nriIndex).toBeLessThan(lowCibilIndex);
		});
	});

	// ── Determinism ─────────────────────────────────────────────────────────────

	describe('determinism', () => {
		it('same inputs always produce the same name', () => {
			const answers = baseLoanAnswers({
				loanName: 'Loan Against Property',
				loanType: 'New Loan',
				propertyCityName: 'Delhi'
			});
			const applicant = primaryApplicant({
				employmentType: 'Self-employed(Other)',
				creditScore: 720
			});

			const first = deriveFixtureName(answers, [applicant]);
			const second = deriveFixtureName(answers, [applicant]);
			expect(first).toBe(second);
		});

		it('different CIBIL scores produce different names', () => {
			const answers = baseLoanAnswers();
			const name750 = deriveFixtureName(answers, [primaryApplicant({ creditScore: 750 })]);
			const name680 = deriveFixtureName(answers, [primaryApplicant({ creditScore: 680 })]);
			expect(name750).not.toBe(name680);
		});

		it('different cities produce different names', () => {
			const nameMumbai = deriveFixtureName(
				baseLoanAnswers({ propertyCityName: 'Mumbai' }),
				[primaryApplicant()]
			);
			const nameDelhi = deriveFixtureName(
				baseLoanAnswers({ propertyCityName: 'Delhi' }),
				[primaryApplicant()]
			);
			expect(nameMumbai).not.toBe(nameDelhi);
		});
	});

	// ── Full scenario examples ───────────────────────────────────────────────────
	// These verify the complete output string end-to-end.

	describe('full scenario examples', () => {
		it('Home Loan · New Loan · Salaried Private · Mumbai · CIBIL 750 · Couple', () => {
			const name = deriveFixtureName(
				baseLoanAnswers({ __applicantCount: 2, applicationStructure: 'Couple' }),
				[primaryApplicant({ creditScore: 750 }), coApplicant()]
			);
			expect(name).toBe(
				'Home Loan · New Loan · Salaried Private · Mumbai · CIBIL 750 · Couple'
			);
		});

		it('LAP · Balance Transfer · Self-Employed Business · Delhi · CIBIL 720 · Primary + Son', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Loan Against Property',
					loanType: 'Balance Transfer Only',
					propertyCityName: 'Delhi',
					__applicantCount: 2,
					applicationStructure: 'Family'
				},
				[
					primaryApplicant({ employmentType: 'Self-employed(Other)', creditScore: 720 }),
					coApplicant({ relationshipWithPrimary: 'Son' })
				]
			);
			expect(name).toBe(
				'LAP · Balance Transfer · Self-Employed Business · Delhi · CIBIL 720 · Primary + Son'
			);
		});

		it('Professional Loan · New Loan · CA · Ahmedabad · CIBIL 800 · Solo · NRI', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Professional Loan',
					loanType: 'New Loan',
					businessCityName: 'Ahmedabad',
					__applicantCount: 1,
					applicationStructure: 'Individual / Sole-Proprietor'
				},
				[
					primaryApplicant({
						employmentType: 'Self-employed(Professional)',
						professionType: 'Chartered Accountant(CA)',
						creditScore: 800,
						isNRI: true
					})
				]
			);
			expect(name).toBe(
				'Professional Loan · New Loan · CA · Ahmedabad · CIBIL 800 · Solo · NRI'
			);
		});

		it('Home Loan · BT + Top-up · Salaried Govt · Pune · CIBIL 620 · Couple · Low CIBIL', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Home Loan',
					loanType: 'Balance Transfer With Top-up',
					propertyCityName: 'Pune',
					__applicantCount: 2,
					applicationStructure: 'Couple'
				},
				[
					primaryApplicant({ employmentType: 'Salaried(Government)', creditScore: 620 }),
					coApplicant({ relationshipWithPrimary: 'Spouse' })
				]
			);
			expect(name).toBe(
				'Home Loan · BT + Top-up · Salaried Govt · Pune · CIBIL 620 · Couple · Low CIBIL'
			);
		});

		it('Plot Loan · Plot + Construction · Salaried Private · Bangalore · CIBIL 760 · Primary + Father', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Plot Loan',
					loanType: 'Plot & Construction Loan',
					propertyCityName: 'Bangalore',
					__applicantCount: 2,
					applicationStructure: 'Family'
				},
				[
					primaryApplicant({ employmentType: 'Salaried(Private)', creditScore: 760 }),
					coApplicant({ employmentType: 'Pensioner', creditScore: 700, relationshipWithPrimary: 'Father' })
				]
			);
			expect(name).toBe(
				'Plot Loan · Plot + Construction · Salaried Private · Bangalore · CIBIL 760 · Primary + Father'
			);
		});

		it('Personal Loan · New Loan · Pensioner · Jaipur · CIBIL 800 · Solo', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Personal Loan',
					loanType: 'New Loan',
					residenceCityName: 'Jaipur',
					__applicantCount: 1,
					applicationStructure: 'Individual / Sole-Proprietor'
				},
				[primaryApplicant({ employmentType: 'Pensioner', creditScore: 800 })]
			);
			expect(name).toBe('Personal Loan · New Loan · Pensioner · Jaipur · CIBIL 800 · Solo');
		});

		it('Business Loan · Debt Consolidation + Extra · Self-Employed Business · Chennai · CIBIL 700 · Company', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Business Loan',
					loanType: 'Debt Consolidation with Extra Funds',
					businessCityName: 'Chennai',
					__applicantCount: 1,
					applicationStructure: 'Company (Non-individual entity)'
				},
				[primaryApplicant({ employmentType: 'Self-employed(Other)', creditScore: 700 })]
			);
			expect(name).toBe(
				'Business Loan · Debt Consolidation + Extra · Self-Employed Business · Chennai · CIBIL 700 · Company'
			);
		});

		it('Home Loan · New Loan · Salaried Private · Mumbai · CIBIL 580 · 3 Applicants · Low CIBIL', () => {
			const name = deriveFixtureName(
				{
					loanName: 'Home Loan',
					loanType: 'New Loan',
					propertyCityName: 'Mumbai',
					__applicantCount: 3,
					applicationStructure: 'Family'
				},
				[
					primaryApplicant({ creditScore: 580 }),
					coApplicant({ relationshipWithPrimary: 'Son' }),
					coApplicant({ relationshipWithPrimary: 'Daughter' })
				]
			);
			expect(name).toBe(
				'Home Loan · New Loan · Salaried Private · Mumbai · CIBIL 580 · 3 Applicants · Low CIBIL'
			);
		});
	});
});
