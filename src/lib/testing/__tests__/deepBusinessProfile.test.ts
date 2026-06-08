/**
 * Deep Business Profiling — Unit Tests
 * ══════════════════════════════════════
 * Tests for getDeepProfileSections config function.
 * Verifies correct section selection by loan category, business type,
 * and professional category.
 */

import { describe, it, expect } from 'vitest';
import { getDeepProfileSections } from '$lib/config/deepBusinessProfile';

describe('getDeepProfileSections', () => {
	// ── Personal Loan ──────────────────────────────────────────────
	describe('Personal Loan', () => {
		it('returns empty array for personal loan', () => {
			const result = getDeepProfileSections('personal');
			expect(result).toEqual([]);
		});

		it('returns empty array for personal loan even with business type', () => {
			const result = getDeepProfileSections('personal', 'manufacturing');
			expect(result).toEqual([]);
		});
	});

	// ── Business Loan ──────────────────────────────────────────────
	describe('Business Loan', () => {
		it('returns common section for business loan without type', () => {
			const result = getDeepProfileSections('business');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('business_operations');
		});

		it('returns common + manufacturing for Manufacturing', () => {
			const result = getDeepProfileSections('business', 'manufacturing');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('business_operations');
			expect(result[1].id).toBe('manufacturing_profile');
		});

		it('returns common + trading for Trading', () => {
			const result = getDeepProfileSections('business', 'trading');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('business_operations');
			expect(result[1].id).toBe('trading_profile');
		});

		it('returns common + services for B2B Services', () => {
			const result = getDeepProfileSections('business', 'b2b_services');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('business_operations');
			expect(result[1].id).toBe('services_profile');
		});

		it('returns common + commission for Commission Agent', () => {
			const result = getDeepProfileSections('business', 'commission-business');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('business_operations');
			expect(result[1].id).toBe('commission_profile');
		});

		it('returns only common for unknown business type', () => {
			const result = getDeepProfileSections('business', 'unknown_type');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('business_operations');
		});

		it('common section has 10 questions', () => {
			const result = getDeepProfileSections('business');
			expect(result[0].questions).toHaveLength(10);
		});

		it('manufacturing section has 6 questions', () => {
			const result = getDeepProfileSections('business', 'manufacturing');
			expect(result[1].questions).toHaveLength(6);
		});

		it('trading section has 6 questions', () => {
			const result = getDeepProfileSections('business', 'trading');
			expect(result[1].questions).toHaveLength(6);
		});

		it('services section has 5 questions', () => {
			const result = getDeepProfileSections('business', 'b2b_services');
			expect(result[1].questions).toHaveLength(5);
		});

		it('commission section has 5 questions', () => {
			const result = getDeepProfileSections('business', 'commission-business');
			expect(result[1].questions).toHaveLength(5);
		});
	});

	// ── Professional Loan ──────────────────────────────────────────
	describe('Professional Loan', () => {
		it('returns common section for professional loan without category', () => {
			const result = getDeepProfileSections('professional');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('practice_operations');
		});

		it('returns common + medical for Doctor', () => {
			const result = getDeepProfileSections('professional', undefined, 'Doctor');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('practice_operations');
			expect(result[1].id).toBe('medical_practice');
		});

		it('returns common + medical for Medical Practitioner', () => {
			const result = getDeepProfileSections('professional', undefined, 'Medical Practitioner');
			expect(result).toHaveLength(2);
			expect(result[1].id).toBe('medical_practice');
		});

		it('returns common + CA/CS for Chartered Accountant', () => {
			const result = getDeepProfileSections('professional', undefined, 'Chartered Accountant');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('practice_operations');
			expect(result[1].id).toBe('ca_cs_practice');
		});

		it('returns common + CA/CS for Company Secretary (CS)', () => {
			const result = getDeepProfileSections('professional', undefined, 'CS - Company Secretary');
			expect(result).toHaveLength(2);
			expect(result[1].id).toBe('ca_cs_practice');
		});

		it('returns common + CA/CS for CMA', () => {
			const result = getDeepProfileSections('professional', undefined, 'CMA - Cost Accountant');
			expect(result).toHaveLength(2);
			expect(result[1].id).toBe('ca_cs_practice');
		});

		it('returns common + legal for Lawyer', () => {
			const result = getDeepProfileSections('professional', undefined, 'Lawyer');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('practice_operations');
			expect(result[1].id).toBe('legal_practice');
		});

		it('returns common + legal for Advocate', () => {
			const result = getDeepProfileSections('professional', undefined, 'Advocate');
			expect(result).toHaveLength(2);
			expect(result[1].id).toBe('legal_practice');
		});

		it('returns common + architect for Architect', () => {
			const result = getDeepProfileSections('professional', undefined, 'Architect');
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('practice_operations');
			expect(result[1].id).toBe('architect_practice');
		});

		it('returns common + architect for Civil Engineer', () => {
			const result = getDeepProfileSections('professional', undefined, 'Civil Engineer');
			expect(result).toHaveLength(2);
			expect(result[1].id).toBe('architect_practice');
		});

		it('returns only common for unknown professional category', () => {
			const result = getDeepProfileSections('professional', undefined, 'Unknown Profession');
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('practice_operations');
		});

		it('common section has 8 questions', () => {
			const result = getDeepProfileSections('professional');
			expect(result[0].questions).toHaveLength(8);
		});

		it('medical section has 6 questions', () => {
			const result = getDeepProfileSections('professional', undefined, 'Doctor');
			expect(result[1].questions).toHaveLength(6);
		});

		it('CA/CS section has 5 questions', () => {
			const result = getDeepProfileSections('professional', undefined, 'Chartered Accountant');
			expect(result[1].questions).toHaveLength(5);
		});

		it('legal section has 5 questions', () => {
			const result = getDeepProfileSections('professional', undefined, 'Lawyer');
			expect(result[1].questions).toHaveLength(5);
		});

		it('architect section has 5 questions', () => {
			const result = getDeepProfileSections('professional', undefined, 'Architect');
			expect(result[1].questions).toHaveLength(5);
		});
	});

	// ── Unknown loan category ──────────────────────────────────────
	describe('Unknown loan category', () => {
		it('returns empty for unknown loan category', () => {
			const result = getDeepProfileSections('unknown' as any);
			expect(result).toEqual([]);
		});
	});

	// ── Question structure validation ──────────────────────────────
	describe('Question structure', () => {
		it('all questions have id, label, type, and required', () => {
			const allCategories = [
				getDeepProfileSections('business', 'manufacturing'),
				getDeepProfileSections('business', 'trading'),
				getDeepProfileSections('business', 'b2b_services'),
				getDeepProfileSections('business', 'commission-business'),
				getDeepProfileSections('professional', undefined, 'Doctor'),
				getDeepProfileSections('professional', undefined, 'Chartered Accountant'),
				getDeepProfileSections('professional', undefined, 'Lawyer'),
				getDeepProfileSections('professional', undefined, 'Architect')
			];

			for (const sections of allCategories) {
				for (const section of sections) {
					for (const q of section.questions) {
						expect(q.id).toBeTruthy();
						expect(q.label).toBeTruthy();
						expect(['radio', 'select', 'number', 'text', 'multi-select']).toContain(q.type);
						expect(typeof q.required).toBe('boolean');
					}
				}
			}
		});

		it('all radio/select/multi-select questions have options', () => {
			const sections = [
				...getDeepProfileSections('business', 'manufacturing'),
				...getDeepProfileSections('professional', undefined, 'Doctor')
			];

			for (const section of sections) {
				for (const q of section.questions) {
					if (q.type === 'radio' || q.type === 'select' || q.type === 'multi-select') {
						expect(q.options).toBeDefined();
						expect(q.options!.length).toBeGreaterThan(0);
						for (const opt of q.options!) {
							expect(opt.label).toBeTruthy();
							expect(opt.value).toBeTruthy();
						}
					}
				}
			}
		});

		it('all question IDs are unique within a section set', () => {
			const allSets = [
				getDeepProfileSections('business', 'manufacturing'),
				getDeepProfileSections('business', 'trading'),
				getDeepProfileSections('professional', undefined, 'Doctor'),
				getDeepProfileSections('professional', undefined, 'Lawyer')
			];

			for (const sections of allSets) {
				const ids = sections.flatMap((s) => s.questions.map((q) => q.id));
				const uniqueIds = new Set(ids);
				expect(ids.length).toBe(uniqueIds.size);
			}
		});
	});
});
