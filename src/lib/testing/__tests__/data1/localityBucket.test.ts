/**
 * DATA-1 — localityBucket unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §2.1 / §12 test plan.
 *
 * The contract is privacy-load-bearing: every test below corresponds to a
 * specifying-token type that MUST be stripped from raw addresses before
 * storage. A regression here would write customer-identifying data to a
 * collection that is supposed to be non-PII by construction.
 */

import { describe, it, expect } from 'vitest';
import { localityBucket } from '$lib/server/data1/localityBucket';

describe('localityBucket', () => {
	describe('flat / unit / apartment number stripping', () => {
		it('strips "Flat <N>" prefix', () => {
			expect(localityBucket('Flat 4B, Hiranandani Gardens, Powai, Mumbai 400076')).toBe(
				'Hiranandani Gardens Powai'
			);
		});

		it('strips "Unit <N>" prefix', () => {
			expect(localityBucket('Unit 201, Lodha Palava, Dombivali East')).toBe(
				'Lodha Palava Dombivali East'
			);
		});

		it('strips "Apt. <N>" prefix (with period and without)', () => {
			expect(localityBucket('Apt. 7, Vasant Vihar, New Delhi')).toBe('Vasant Vihar New Delhi');
			expect(localityBucket('Apt 12, Vasant Vihar, New Delhi')).toBe('Vasant Vihar New Delhi');
		});
	});

	describe('numeric prefix stripping (lane addresses)', () => {
		it('strips leading numeric token "14A,"', () => {
			expect(localityBucket('14A, Linking Road, Bandra West')).toBe('Linking Road Bandra West');
		});

		it('strips short numeric token without letter suffix', () => {
			expect(localityBucket('22, MG Road, Bengaluru')).toBe('MG Road Bengaluru');
		});
	});

	describe('survey / village / taluka (rural addresses)', () => {
		it('strips "Survey No. <N>" and keeps village + taluka', () => {
			expect(localityBucket('Survey No. 45, Mhalunge, Mulshi Taluka')).toBe('Mhalunge Mulshi Taluka');
		});

		it('preserves single-word village name when only one meaningful segment', () => {
			expect(localityBucket('Survey No 12, Wadgaon')).toBe('Wadgaon');
		});
	});

	describe('pincode + city normalization', () => {
		it('strips a trailing 6-digit pincode appended to a city name', () => {
			// "Mumbai 400076" → "Mumbai" — the trailing pincode is a sibling
			// data point already stored separately on the vault entry.
			const result = localityBucket('Flat 4B, Hiranandani Gardens, Powai, Mumbai 400076');
			expect(result).not.toMatch(/400076/);
		});
	});

	describe('determinism + idempotency', () => {
		it('returns the same output on repeated calls', () => {
			const input = 'Flat 4B, Hiranandani Gardens, Powai, Mumbai 400076';
			const first = localityBucket(input);
			const second = localityBucket(input);
			expect(first).toBe(second);
		});

		it('is idempotent under re-bucketing', () => {
			const once = localityBucket('Flat 4B, Hiranandani Gardens, Powai, Mumbai 400076');
			const twice = localityBucket(once);
			expect(twice).toBe(once);
		});
	});

	describe('edge cases', () => {
		it('returns empty string on null / undefined / empty input', () => {
			expect(localityBucket(null)).toBe('');
			expect(localityBucket(undefined)).toBe('');
			expect(localityBucket('')).toBe('');
		});

		it('returns single segment when address is just one area name', () => {
			expect(localityBucket('Koregaon Park')).toBe('Koregaon Park');
		});

		it('caps output at two area segments — never three', () => {
			// "Hiranandani, Powai, Mumbai" — Mumbai is the third token, should drop.
			// We don't want "Hiranandani Powai Mumbai" creeping toward identifying detail.
			const result = localityBucket('Hiranandani, Powai, Mumbai');
			// Should have at most two segment-joins worth of words. "Mumbai" must NOT appear.
			expect(result).not.toMatch(/Mumbai/);
			expect(result).toBe('Hiranandani Powai');
		});

		it('returns empty string when stripping leaves nothing meaningful', () => {
			// Input is pure numeric noise — nothing should bucket to a non-empty string.
			expect(localityBucket('14, 22A, 400076')).toBe('');
		});

		it('title-cases the output regardless of input casing', () => {
			expect(localityBucket('hiranandani gardens, powai')).toBe('Hiranandani Gardens Powai');
			expect(localityBucket('HIRANANDANI GARDENS, POWAI')).toBe('Hiranandani Gardens Powai');
		});

		it('collapses runs of whitespace inside a segment', () => {
			expect(localityBucket('  Lodha   Palava ,  Dombivali  East  ')).toBe(
				'Lodha Palava Dombivali East'
			);
		});
	});
});
