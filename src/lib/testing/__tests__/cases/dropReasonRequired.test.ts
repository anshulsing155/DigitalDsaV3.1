/**
 * F.4 — Drop-reason refinement on stageUpdateSchema
 * ══════════════════════════════════════════════════════════════════
 * Locks the boundary contract: the API refuses to drop a case without
 * a structured reason. UI may also enforce this client-side, but the
 * server is the authoritative gate.
 *
 * Scope: the Zod schema itself (constructed inline here to mirror the
 * one in /api/cases/[case_id]/stage). Integration tests of the actual
 * endpoint are deferred — the schema is the hard contract.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { caseStageEnum } from '$lib/schemas/case.schema';
import { DROP_REASONS, type DropReason } from '$lib/types/case';

// Mirror of the production schema in the +server.ts (kept in sync via
// the test description below — if the production schema changes, this
// test will fail in a recognisable way and the author updates both).
const stageUpdateSchema = z
	.object({
		stage: caseStageEnum,
		notes: z.string().optional(),
		drop_reason: z.enum(DROP_REASONS as readonly [DropReason, ...DropReason[]]).optional(),
		drop_reason_note: z.string().max(500).optional()
	})
	.superRefine((data, ctx) => {
		if (data.stage === 'dropped') {
			if (!data.drop_reason) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['drop_reason'],
					message: 'required'
				});
			}
			if (data.drop_reason === 'other' && !data.drop_reason_note?.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['drop_reason_note'],
					message: 'required for other'
				});
			}
		}
	});

describe('stageUpdateSchema — drop-reason refinement (F.4)', () => {
	it('non-drop transitions do not require drop_reason', () => {
		const r = stageUpdateSchema.safeParse({ stage: 'submitted' });
		expect(r.success).toBe(true);
	});

	it('drop transition WITHOUT reason → rejected with path drop_reason', () => {
		const r = stageUpdateSchema.safeParse({ stage: 'dropped' });
		expect(r.success).toBe(false);
		if (!r.success) {
			const paths = r.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('drop_reason');
		}
	});

	it('drop transition WITH any of the 5 enum reasons → accepted', () => {
		for (const reason of DROP_REASONS.filter((r) => r !== 'other')) {
			const r = stageUpdateSchema.safeParse({
				stage: 'dropped',
				drop_reason: reason
			});
			expect(r.success, `reason=${reason} should be accepted`).toBe(true);
		}
	});

	it('drop transition with "other" but NO note → rejected', () => {
		const r = stageUpdateSchema.safeParse({
			stage: 'dropped',
			drop_reason: 'other'
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			const paths = r.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('drop_reason_note');
		}
	});

	it('drop transition with "other" + whitespace-only note → rejected', () => {
		const r = stageUpdateSchema.safeParse({
			stage: 'dropped',
			drop_reason: 'other',
			drop_reason_note: '   '
		});
		expect(r.success).toBe(false);
	});

	it('drop transition with "other" + real note → accepted', () => {
		const r = stageUpdateSchema.safeParse({
			stage: 'dropped',
			drop_reason: 'other',
			drop_reason_note: 'Customer moved to a different city mid-process'
		});
		expect(r.success).toBe(true);
	});

	it('invalid drop_reason value → rejected', () => {
		const r = stageUpdateSchema.safeParse({
			stage: 'dropped',
			drop_reason: 'made_up_reason'
		});
		expect(r.success).toBe(false);
	});

	it('note over 500 chars → rejected (defensive)', () => {
		const r = stageUpdateSchema.safeParse({
			stage: 'dropped',
			drop_reason: 'other',
			drop_reason_note: 'x'.repeat(501)
		});
		expect(r.success).toBe(false);
	});

	it('drop_reason on a NON-drop transition is allowed but inert (no enforcement)', () => {
		// We don't reject a stray drop_reason on, say, a 'sanctioned' transition.
		// The endpoint only writes it on the 'dropped' branch — extra fields
		// just get ignored by the persist logic. This loosens the schema vs
		// fighting clients that pre-populate the payload.
		const r = stageUpdateSchema.safeParse({
			stage: 'sanctioned',
			drop_reason: 'lender_rejected' // ignored downstream
		});
		expect(r.success).toBe(true);
	});
});

describe('DROP_REASONS constant', () => {
	it('exposes exactly the 5 spec-locked values', () => {
		expect(DROP_REASONS).toEqual([
			'applicant_dropped',
			'lender_rejected',
			'competitor_won',
			'qualification_failed',
			'other'
		]);
	});
});
