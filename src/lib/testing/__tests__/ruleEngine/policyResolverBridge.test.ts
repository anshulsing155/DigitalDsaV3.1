import { describe, test, expect } from 'vitest';
import { mergePolicies } from '$lib/ruleEngine/policyResolverBridge';
import type { ParsedPolicy } from '$lib/ruleEngine/types';

describe('policyResolverBridge', () => {
	describe('mergePolicies', () => {
		test('DB policies override static on same key', () => {
			const db: ParsedPolicy[] = [
				{
					policy_key: 'roi_type',
					label: 'ROI Type',
					value: 'floating',
					category: 'interest_rate',
					display_on_offer_card: true
				}
			];
			const stc: ParsedPolicy[] = [
				{
					policy_key: 'roi_type',
					label: 'ROI Type',
					value: 'fixed',
					category: 'interest_rate',
					display_on_offer_card: true
				}
			];
			const result = mergePolicies(db, stc);
			expect(result).toHaveLength(1);
			expect(result[0].value).toBe('floating');
		});

		test('preserves static-only keys', () => {
			const db: ParsedPolicy[] = [];
			const stc: ParsedPolicy[] = [
				{
					policy_key: 'processing_fee',
					label: 'Fee',
					value: 0.5,
					category: 'fees',
					display_on_offer_card: true
				}
			];
			const result = mergePolicies(db, stc);
			expect(result).toHaveLength(1);
			expect(result[0].policy_key).toBe('processing_fee');
		});

		test('merges disjoint keys', () => {
			const db: ParsedPolicy[] = [
				{
					policy_key: 'max_tenure',
					label: 'Max Tenure',
					value: 360,
					category: 'eligibility',
					display_on_offer_card: true
				}
			];
			const stc: ParsedPolicy[] = [
				{
					policy_key: 'min_loan',
					label: 'Min Loan',
					value: 500000,
					category: 'limits',
					display_on_offer_card: true
				}
			];
			const result = mergePolicies(db, stc);
			expect(result).toHaveLength(2);
		});

		test('empty inputs return empty', () => {
			expect(mergePolicies([], [])).toEqual([]);
		});
	});
});
