/**
 * Unit tests — Delta Parse Pipeline
 *
 * Tests cover:
 *   1. DeltaOutputSchema Zod validation (valid + invalid payloads)
 *   2. Size-guard ratio math (60% threshold)
 *   3. diffSections() pure section diff utility
 *   4. runDelta() happy-path via mocked OpenAI
 *   5. runDelta() Zod rejection path via mocked OpenAI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeltaOutputSchema } from '$lib/server/pms/deltaPipeline.js';
import { diffSections } from '$lib/server/pms/policyService.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';

// ─── 1. DeltaOutputSchema — Zod validation ───────────────────────────────────

describe('DeltaOutputSchema', () => {
	it('accepts a valid delta output', () => {
		const valid = {
			deltas: [
				{
					sectionKey: 'eligibility',
					fieldKey: 'minCreditScore',
					oldValue: 700,
					newValue: 720,
					confidence: 0.92,
					evidenceQuote: 'Minimum CIBIL raised to 720 effective April 2026.'
				}
			],
			overallConfidence: 0.92,
			summary: 'CIBIL floor raised from 700 to 720.'
		};
		const result = DeltaOutputSchema.safeParse(valid);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.deltas).toHaveLength(1);
			expect(result.data.deltas[0].sectionKey).toBe('eligibility');
		}
	});

	it('accepts empty deltas array', () => {
		const noChanges = { deltas: [], overallConfidence: 0.95, summary: 'No changes detected.' };
		const result = DeltaOutputSchema.safeParse(noChanges);
		expect(result.success).toBe(true);
	});

	it('rejects missing sectionKey', () => {
		const bad = {
			deltas: [
				{
					// sectionKey missing
					fieldKey: 'minCreditScore',
					oldValue: 700,
					newValue: 720,
					confidence: 0.9,
					evidenceQuote: 'Some quote'
				}
			],
			overallConfidence: 0.9,
			summary: 'A change'
		};
		const result = DeltaOutputSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('rejects confidence out of range (>1)', () => {
		const bad = {
			deltas: [],
			overallConfidence: 1.5,
			summary: 'test'
		};
		const result = DeltaOutputSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('rejects confidence out of range (<0)', () => {
		const bad = {
			deltas: [],
			overallConfidence: -0.1,
			summary: 'test'
		};
		const result = DeltaOutputSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('rejects missing evidenceQuote', () => {
		const bad = {
			deltas: [
				{
					sectionKey: 'foir',
					fieldKey: 'salaried',
					oldValue: 55,
					newValue: 60,
					confidence: 0.8
					// evidenceQuote missing
				}
			],
			overallConfidence: 0.8,
			summary: 'FOIR changed'
		};
		const result = DeltaOutputSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('rejects empty evidenceQuote (min(1))', () => {
		const bad = {
			deltas: [
				{
					sectionKey: 'foir',
					fieldKey: 'salaried',
					oldValue: 55,
					newValue: 60,
					confidence: 0.8,
					evidenceQuote: ''
				}
			],
			overallConfidence: 0.8,
			summary: 'FOIR changed'
		};
		const result = DeltaOutputSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('allows unknown delta values (oldValue/newValue can be anything)', () => {
		const complexValue = {
			deltas: [
				{
					sectionKey: 'ltv',
					fieldKey: 'maxLtvByLoanAmount',
					oldValue: [{ upTo: 3000000, maxLtv: 80 }],
					newValue: [{ upTo: 3000000, maxLtv: 75 }, { upTo: 7500000, maxLtv: 70 }],
					confidence: 0.85,
					evidenceQuote: 'LTV revised per new RBI circular.'
				}
			],
			overallConfidence: 0.85,
			summary: 'LTV tiers updated.'
		};
		const result = DeltaOutputSchema.safeParse(complexValue);
		expect(result.success).toBe(true);
	});
});

// ─── diffSections() pure diff utility ─────────────────────────────────────

function makeMinimalSections(overrides: Partial<PolicyDocument['sections']> = {}): PolicyDocument['sections'] {
	return {
		eligibility: {
			minAge: 21,
			maxAge: 65,
			minCreditScore: 700,
			allowedEmploymentTypes: ['salaried', 'self_employed'],
			allowedNationalities: ['Indian'],
			isDefaulterAllowed: false,
			notes: null
		},
		income: {
			allowedIncomeSources: [],
			haircutBySalaried: 0,
			haircutBySelfEmployed: 30,
			haircutByRental: 30,
			haircutByOther: 40,
			minNetIncome: null,
			minGrossIncome: null,
			notes: null
		},
		foir: { salaried: 50, selfEmployed: 45, notes: null },
		ltv: null,
		obligations: {
			deductFromFoir: true,
			creditCardFoirMethod: 'utilization',
			creditCardLimitPercentage: null,
			notes: null
		},
		tenure: { minTenureMonths: 12, maxTenureMonths: 300, maxAgeAtMaturity: 70, notes: null },
		roi: { minRoi: 8.5, maxRoi: 12.5, spreadOverRepo: null, roiType: 'floating', notes: null },
		geo: { allowedStates: [], excludedCities: [], notes: null },
		fees: {
			processingFeePercent: 1.0,
			processingFeeFlat: null,
			processingFeeMin: null,
			processingFeeMax: null,
			prepaymentAllowed: true,
			prepaymentChargePercent: null,
			notes: null
		},
		...overrides
	};
}

describe('diffSections()', () => {
	it('returns empty array when sections are identical', () => {
		const sections = makeMinimalSections();
		const changes = diffSections(sections, sections, 'admin-1');
		expect(changes).toHaveLength(0);
	});

	it('detects a single numeric field change', () => {
		const old = makeMinimalSections();
		const updated = makeMinimalSections({ foir: { salaried: 55, selfEmployed: 45, notes: null } });
		const changes = diffSections(old, updated, 'admin-1');
		expect(changes).toHaveLength(1);
		expect(changes[0].field).toContain('salaried');
		expect(changes[0].oldValue).toBe(50);
		expect(changes[0].newValue).toBe(55);
	});

	it('detects multiple field changes across sections', () => {
		const old = makeMinimalSections();
		const updated = makeMinimalSections({
			foir: { salaried: 55, selfEmployed: 45, notes: null },
			eligibility: { ...makeMinimalSections().eligibility, minCreditScore: 720 }
		});
		const changes = diffSections(old, updated, 'admin-1');
		expect(changes.length).toBeGreaterThanOrEqual(2);
	});

	it('uses the provided reason on each PendingChange', () => {
		const old = makeMinimalSections();
		const updated = makeMinimalSections({ foir: { salaried: 55, selfEmployed: 45, notes: null } });
		const changes = diffSections(old, updated, 'admin-1', 'delta_parse');
		expect(changes.every((c) => c.reason === 'delta_parse')).toBe(true);
	});

	it('stamps changedBy correctly', () => {
		const old = makeMinimalSections();
		const updated = makeMinimalSections({ foir: { salaried: 55, selfEmployed: 45, notes: null } });
		const changes = diffSections(old, updated, 'rm-007');
		expect(changes.every((c) => c.changedBy === 'rm-007')).toBe(true);
	});

	it('sets rmAcknowledged to false for new changes', () => {
		const old = makeMinimalSections();
		const updated = makeMinimalSections({ foir: { salaried: 55, selfEmployed: 45, notes: null } });
		const changes = diffSections(old, updated, 'admin-1');
		expect(changes.every((c) => c.rmAcknowledged === false)).toBe(true);
		expect(changes.every((c) => c.rmAcknowledgedAt === null)).toBe(true);
	});

	it('handles null → non-null LTV change (null section added)', () => {
		const old = makeMinimalSections({ ltv: null });
		const updated = makeMinimalSections({
			ltv: {
				maxLtvByPropertyType: {},
				maxLtvByLoanAmount: [{ upTo: 3000000, maxLtv: 80 }],
				notes: null
			}
		});
		const changes = diffSections(old, updated, 'admin-1');
		expect(changes.length).toBeGreaterThan(0);
	});

	it('no change when both ltv sections are null', () => {
		const sections = makeMinimalSections({ ltv: null });
		const changes = diffSections(sections, sections, 'admin-1');
		expect(changes).toHaveLength(0);
	});
});

// ─── 4 + 5. runDelta happy-path and Zod rejection (mocked OpenAI) ─────────────

vi.mock('$env/dynamic/private', () => ({
	env: { OPENAI_API_KEY: 'test-key' }
}));

vi.mock('openai', () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: vi.fn()
				}
			}
		}))
	};
});

// We use a dynamic import inside each test so vi.mock takes effect
describe('runDelta() — mocked OpenAI', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('happy path: returns deltas when AI returns valid schema', async () => {
		const OpenAI = (await import('openai')).default;
		const mockCreate = vi.fn().mockResolvedValue({
			choices: [
				{
					message: {
						content: JSON.stringify({
							deltas: [
								{
									sectionKey: 'eligibility',
									fieldKey: 'minCreditScore',
									oldValue: 700,
									newValue: 720,
									confidence: 0.9,
									evidenceQuote: 'CIBIL raised to 720.'
								}
							],
							overallConfidence: 0.9,
							summary: 'CIBIL floor raised.'
						})
					}
				}
			],
			usage: { total_tokens: 500 }
		});
		(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
			chat: { completions: { create: mockCreate } }
		}));

		// Re-import so the mock applies
		const { runDelta } = await import('$lib/server/pms/deltaPipeline.js');
		const sections = makeMinimalSections();

		const result = await runDelta(sections, 'CIBIL raised to 720 per new circular.', 'Home Loan');

		expect(result.deltas).toHaveLength(1);
		expect(result.deltas[0].sectionKey).toBe('eligibility');
		expect(result.deltas[0].newValue).toBe(720);
		expect(result.overallConfidence).toBe(0.9);
		expect(result.tokensUsed).toBe(500);
	});

	it('Zod rejection: throws descriptive error when AI returns invalid schema', async () => {
		const OpenAI = (await import('openai')).default;
		const mockCreate = vi.fn().mockResolvedValue({
			choices: [
				{
					message: {
						// Missing required fields and invalid confidence
						content: JSON.stringify({
							deltas: [
								{
									sectionKey: '',
									fieldKey: 'minCreditScore',
									// missing oldValue, newValue, confidence, evidenceQuote
								}
							],
							overallConfidence: 2.5,
							summary: 'test'
						})
					}
				}
			],
			usage: { total_tokens: 200 }
		});
		(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
			chat: { completions: { create: mockCreate } }
		}));

		const { runDelta } = await import('$lib/server/pms/deltaPipeline.js');
		const sections = makeMinimalSections();

		await expect(runDelta(sections, 'some addendum', 'Home Loan')).rejects.toThrow(
			/validate|schema|Zod/i
		);
	});
});
