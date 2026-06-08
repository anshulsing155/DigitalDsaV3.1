/**
 * Disclaimer System Tests
 *
 * Validates: disclaimer registry, helper functions, Zod schemas,
 * acceptance validation, and i18n key references.
 *
 * @see AD-11 in DEVELOPMENT-PLAN.md
 */

import { describe, it, expect } from 'vitest';
import {
	DISCLAIMER_REGISTRY,
	getDisclaimer,
	getDisclaimersByPlacement,
	getServerEnforcedDisclaimers,
	needsReAcceptance,
	type DisclaimerConfig,
	type DisclaimerPlacement
} from '$lib/types/disclaimer';
import {
	disclaimerPlacementSchema,
	disclaimerConfigSchema,
	disclaimerAcceptanceSchema,
	disclaimerAcceptanceRecordSchema
} from '$lib/schemas/disclaimer.schema';
import { t } from '$lib/i18n';

// ═══════════════════════════════════════════════════════════════
// DISCLAIMER_REGISTRY — completeness
// ═══════════════════════════════════════════════════════════════

describe('DISCLAIMER_REGISTRY — completeness', () => {
	it('has exactly 7 disclaimers as defined in AD-11', () => {
		expect(DISCLAIMER_REGISTRY).toHaveLength(7);
	});

	it('all 7 required IDs are present', () => {
		const ids = DISCLAIMER_REGISTRY.map((d) => d.id);
		expect(ids).toContain('rm_onboarding_v1');
		expect(ids).toContain('per_rating_v1');
		expect(ids).toContain('broadcast_footer_v1');
		expect(ids).toContain('rm_content_tag_v1');
		expect(ids).toContain('eligibility_result_v1');
		expect(ids).toContain('pdf_review_footer_v1');
		expect(ids).toContain('pdf_submission_footer_v1');
	});

	it('all disclaimers have unique IDs', () => {
		const ids = DISCLAIMER_REGISTRY.map((d) => d.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('all disclaimers are version 1', () => {
		for (const d of DISCLAIMER_REGISTRY) {
			expect(d.version).toBe(1);
		}
	});

	it('all disclaimers have valid effective_from dates', () => {
		for (const d of DISCLAIMER_REGISTRY) {
			expect(d.effective_from).toBeInstanceOf(Date);
			expect(d.effective_from.getTime()).not.toBeNaN();
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// DISCLAIMER_REGISTRY — config correctness
// ═══════════════════════════════════════════════════════════════

describe('DISCLAIMER_REGISTRY — config correctness', () => {
	it('rm_onboarding_v1 requires acceptance and has checkbox key', () => {
		const d = getDisclaimer('rm_onboarding_v1');
		expect(d).toBeDefined();
		expect(d!.requires_acceptance).toBe(true);
		expect(d!.checkbox_key).toBe('disclaimer.rm_onboarding_checkbox');
		expect(d!.placement).toBe('onboarding');
	});

	it('per_rating_v1 does not require acceptance', () => {
		const d = getDisclaimer('per_rating_v1');
		expect(d).toBeDefined();
		expect(d!.requires_acceptance).toBe(false);
		expect(d!.placement).toBe('inline');
	});

	it('broadcast_footer_v1 is server-enforced', () => {
		const d = getDisclaimer('broadcast_footer_v1');
		expect(d).toBeDefined();
		expect(d!.server_enforced).toBe(true);
		expect(d!.placement).toBe('footer');
	});

	it('both PDF disclaimers are server-enforced', () => {
		const review = getDisclaimer('pdf_review_footer_v1');
		const submission = getDisclaimer('pdf_submission_footer_v1');
		expect(review!.server_enforced).toBe(true);
		expect(submission!.server_enforced).toBe(true);
		expect(review!.placement).toBe('pdf');
		expect(submission!.placement).toBe('pdf');
	});

	it('only rm_onboarding_v1 requires acceptance', () => {
		const requiring = DISCLAIMER_REGISTRY.filter((d) => d.requires_acceptance);
		expect(requiring).toHaveLength(1);
		expect(requiring[0].id).toBe('rm_onboarding_v1');
	});
});

// ═══════════════════════════════════════════════════════════════
// getDisclaimer()
// ═══════════════════════════════════════════════════════════════

describe('getDisclaimer()', () => {
	it('returns the correct disclaimer for a valid ID', () => {
		const d = getDisclaimer('rm_onboarding_v1');
		expect(d).toBeDefined();
		expect(d!.id).toBe('rm_onboarding_v1');
	});

	it('returns undefined for a non-existent ID', () => {
		expect(getDisclaimer('does_not_exist')).toBeUndefined();
	});

	it('returns undefined for empty string', () => {
		expect(getDisclaimer('')).toBeUndefined();
	});
});

// ═══════════════════════════════════════════════════════════════
// getDisclaimersByPlacement()
// ═══════════════════════════════════════════════════════════════

describe('getDisclaimersByPlacement()', () => {
	it('returns 2 disclaimers for "pdf" placement', () => {
		const pdfs = getDisclaimersByPlacement('pdf');
		expect(pdfs).toHaveLength(2);
	});

	it('returns 1 disclaimer for "onboarding" placement', () => {
		const onboarding = getDisclaimersByPlacement('onboarding');
		expect(onboarding).toHaveLength(1);
		expect(onboarding[0].id).toBe('rm_onboarding_v1');
	});

	it('returns 1 disclaimer for "footer" placement', () => {
		const footer = getDisclaimersByPlacement('footer');
		expect(footer).toHaveLength(1);
	});

	it('returns 1 disclaimer for "inline" placement', () => {
		const inline = getDisclaimersByPlacement('inline');
		expect(inline).toHaveLength(1);
	});

	it('returns 1 disclaimer for "tag" placement', () => {
		const tag = getDisclaimersByPlacement('tag');
		expect(tag).toHaveLength(1);
	});

	it('returns 1 disclaimer for "persistent" placement', () => {
		const persistent = getDisclaimersByPlacement('persistent');
		expect(persistent).toHaveLength(1);
	});

	it('returns empty array for "tos" placement (not yet added)', () => {
		const tos = getDisclaimersByPlacement('tos');
		// No ToS disclaimer in registry yet
		expect(tos).toHaveLength(0);
	});
});

// ═══════════════════════════════════════════════════════════════
// getServerEnforcedDisclaimers()
// ═══════════════════════════════════════════════════════════════

describe('getServerEnforcedDisclaimers()', () => {
	it('returns 3 server-enforced disclaimers', () => {
		const enforced = getServerEnforcedDisclaimers();
		expect(enforced).toHaveLength(3);
	});

	it('includes broadcast_footer_v1', () => {
		const enforced = getServerEnforcedDisclaimers();
		expect(enforced.map((d) => d.id)).toContain('broadcast_footer_v1');
	});

	it('includes both PDF disclaimers', () => {
		const ids = getServerEnforcedDisclaimers().map((d) => d.id);
		expect(ids).toContain('pdf_review_footer_v1');
		expect(ids).toContain('pdf_submission_footer_v1');
	});
});

// ═══════════════════════════════════════════════════════════════
// needsReAcceptance()
// ═══════════════════════════════════════════════════════════════

describe('needsReAcceptance()', () => {
	it('returns true when user has never accepted', () => {
		expect(needsReAcceptance('rm_onboarding_v1', undefined)).toBe(true);
	});

	it('returns false when user has accepted current version', () => {
		expect(needsReAcceptance('rm_onboarding_v1', 1)).toBe(false);
	});

	it('returns true when disclaimer version is higher than accepted', () => {
		// If we hypothetically bump to v2, old acceptance should be invalid
		// We can't test this directly without changing registry,
		// but we can verify the logic with a mock check
		expect(needsReAcceptance('rm_onboarding_v1', 0)).toBe(true);
	});

	it('returns false for non-acceptance-required disclaimers', () => {
		expect(needsReAcceptance('per_rating_v1', undefined)).toBe(false);
		expect(needsReAcceptance('broadcast_footer_v1', undefined)).toBe(false);
	});

	it('returns false for non-existent disclaimer', () => {
		expect(needsReAcceptance('does_not_exist', undefined)).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// i18n key references — all keys exist in translations
// ═══════════════════════════════════════════════════════════════

describe('Disclaimer i18n key references', () => {
	it('all title_key references resolve to non-empty English text', () => {
		for (const d of DISCLAIMER_REGISTRY) {
			const text = t(d.title_key);
			expect(text).not.toBe(d.title_key); // Not falling back to key
			expect(text.length).toBeGreaterThan(0);
		}
	});

	it('all body_key references resolve to non-empty English text', () => {
		for (const d of DISCLAIMER_REGISTRY) {
			const text = t(d.body_key);
			expect(text).not.toBe(d.body_key);
			expect(text.length).toBeGreaterThan(0);
		}
	});

	it('checkbox_key resolves when present', () => {
		for (const d of DISCLAIMER_REGISTRY) {
			if (d.checkbox_key) {
				const text = t(d.checkbox_key);
				expect(text).not.toBe(d.checkbox_key);
				expect(text.length).toBeGreaterThan(0);
			}
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Zod Schemas — disclaimerPlacementSchema
// ═══════════════════════════════════════════════════════════════

describe('disclaimerPlacementSchema', () => {
	const validPlacements: DisclaimerPlacement[] = [
		'onboarding',
		'inline',
		'footer',
		'tag',
		'persistent',
		'pdf',
		'tos'
	];

	it.each(validPlacements)('accepts valid placement: %s', (placement) => {
		const result = disclaimerPlacementSchema.safeParse(placement);
		expect(result.success).toBe(true);
	});

	it('rejects invalid placement', () => {
		const result = disclaimerPlacementSchema.safeParse('invalid');
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Zod Schemas — disclaimerAcceptanceSchema
// ═══════════════════════════════════════════════════════════════

describe('disclaimerAcceptanceSchema', () => {
	it('accepts valid acceptance input', () => {
		const result = disclaimerAcceptanceSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: 1
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty disclaimer_id', () => {
		const result = disclaimerAcceptanceSchema.safeParse({
			disclaimer_id: '',
			disclaimer_version: 1
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid disclaimer_id format', () => {
		const result = disclaimerAcceptanceSchema.safeParse({
			disclaimer_id: 'InvalidFormat',
			disclaimer_version: 1
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative version', () => {
		const result = disclaimerAcceptanceSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: -1
		});
		expect(result.success).toBe(false);
	});

	it('rejects zero version', () => {
		const result = disclaimerAcceptanceSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: 0
		});
		expect(result.success).toBe(false);
	});

	it('rejects decimal version', () => {
		const result = disclaimerAcceptanceSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: 1.5
		});
		expect(result.success).toBe(false);
	});

	it('accepts ID format with underscore and version number', () => {
		const validIds = [
			'rm_onboarding_v1',
			'per_rating_v1',
			'broadcast_footer_v1',
			'some_new_disclaimer_v99'
		];
		for (const id of validIds) {
			const result = disclaimerAcceptanceSchema.safeParse({
				disclaimer_id: id,
				disclaimer_version: 1
			});
			expect(result.success).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Zod Schemas — disclaimerAcceptanceRecordSchema
// ═══════════════════════════════════════════════════════════════

describe('disclaimerAcceptanceRecordSchema', () => {
	it('accepts a complete record', () => {
		const result = disclaimerAcceptanceRecordSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: 1,
			user_id: '507f1f77bcf86cd799439011',
			accepted_at: '2026-02-12T10:00:00Z',
			ip_address: '192.168.1.1',
			user_agent: 'Mozilla/5.0'
		});
		expect(result.success).toBe(true);
	});

	it('accepts record without optional fields', () => {
		const result = disclaimerAcceptanceRecordSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: 1,
			user_id: '507f1f77bcf86cd799439011',
			accepted_at: new Date()
		});
		expect(result.success).toBe(true);
	});

	it('rejects record without user_id', () => {
		const result = disclaimerAcceptanceRecordSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: 1,
			accepted_at: new Date()
		});
		expect(result.success).toBe(false);
	});

	it('rejects record without accepted_at', () => {
		const result = disclaimerAcceptanceRecordSchema.safeParse({
			disclaimer_id: 'rm_onboarding_v1',
			disclaimer_version: 1,
			user_id: '507f1f77bcf86cd799439011'
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Zod Schemas — disclaimerConfigSchema
// ═══════════════════════════════════════════════════════════════

describe('disclaimerConfigSchema', () => {
	it('validates a complete config object', () => {
		const config = {
			id: 'test_disclaimer_v1',
			version: 1,
			placement: 'onboarding',
			requires_acceptance: true,
			server_enforced: false,
			title_key: 'disclaimer.test_title',
			body_key: 'disclaimer.test_body',
			checkbox_key: 'disclaimer.test_checkbox',
			effective_from: new Date('2026-02-12')
		};
		const result = disclaimerConfigSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	it('accepts config without optional fields', () => {
		const config = {
			id: 'test_disclaimer_v1',
			version: 1,
			placement: 'inline',
			requires_acceptance: false,
			server_enforced: false,
			title_key: 'disclaimer.test_title',
			body_key: 'disclaimer.test_body',
			effective_from: '2026-02-12'
		};
		const result = disclaimerConfigSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	it('rejects config with empty id', () => {
		const config = {
			id: '',
			version: 1,
			placement: 'inline',
			requires_acceptance: false,
			server_enforced: false,
			title_key: 'key',
			body_key: 'key',
			effective_from: new Date()
		};
		const result = disclaimerConfigSchema.safeParse(config);
		expect(result.success).toBe(false);
	});
});
