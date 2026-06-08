/**
 * DATA-4 — ETL job orchestration unit tests.
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §6 / §9.
 *
 * The job is dependency-injected, so these tests use plain function mocks —
 * no Mongo, no CSFLE. They cover the orchestration contract: gating, the
 * incremental cursor, per-case skip/error resilience, and the audit row.
 */

import { describe, it, expect, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { runAnalyticsEtl, type AnalyticsEtlDeps, type EtlSnapshot } from '$lib/server/analytics/etlJob';
import type { Case } from '$lib/types/case';
import type { EnrichedPayload } from '$lib/ruleEngine/payloadEnricher';

const NOW = new Date('2026-05-20T02:00:00Z');

function makeCase(caseId: string): Case {
	return {
		case_id: caseId,
		dsa_id: new ObjectId(),
		label: 'ref',
		loan: { type: 'Home Loan', amount_required: 5_000_000 },
		stage: 'submitted',
		stage_history: [],
		lender_applications: [],
		created_at: new Date('2026-01-01'),
		updated_at: new Date('2026-03-01'),
		is_archived: false,
		is_sample: false
	} as unknown as Case;
}

function makePayload(): Record<string, unknown> {
	return {
		loanTransaction: { loanAmount: 5_000_000, tenureYears: 20 },
		allApplicantDetails: [{ age: 34, gender: 'Male', employmentType: 'Salaried(Private)' }],
		_computed: { _total_gross_monthly: 80_000, _total_obligations_monthly: 10_000 }
	};
}

/** Build deps with sensible happy-path defaults; override per test. */
function makeDeps(overrides: Partial<AnalyticsEtlDeps> = {}): AnalyticsEtlDeps {
	const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	return {
		enabled: true,
		now: NOW,
		logger,
		findLastSuccessfulCursor: vi.fn(async () => null),
		findEligibleCases: vi.fn(async () => [makeCase('HL-2026-0001')]),
		findLatestSnapshot: vi.fn(async (): Promise<EtlSnapshot | null> => ({ payload: makePayload(), version: 2 })),
		resolvePayload: vi.fn(async (snap: EtlSnapshot) => (snap.payload as Record<string, unknown>) ?? null),
		enrich: vi.fn((payload) => payload as unknown as EnrichedPayload),
		upsertRow: vi.fn(async () => {}),
		recordRun: vi.fn(async () => {}),
		...overrides
	};
}

describe('runAnalyticsEtl', () => {
	it('is a pure no-op when disabled', async () => {
		const deps = makeDeps({ enabled: false });
		const result = await runAnalyticsEtl(deps);

		expect(result.enabled).toBe(false);
		expect(result.run_id).toBeNull();
		expect(deps.findEligibleCases).not.toHaveBeenCalled();
		expect(deps.recordRun).not.toHaveBeenCalled();
	});

	it('processes an eligible case end-to-end and records the run', async () => {
		const deps = makeDeps();
		const result = await runAnalyticsEtl(deps);

		expect(result.cases_processed).toBe(1);
		expect(result.cases_skipped).toBe(0);
		expect(result.cases_errored).toBe(0);
		expect(result.run_id).toMatch(/^etl-/);

		// The upserted row carries the case id + the run stamp.
		expect(deps.upsertRow).toHaveBeenCalledTimes(1);
		const row = (deps.upsertRow as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(row.case_id).toBe('HL-2026-0001');
		expect(row.etl_run_id).toBe(result.run_id);
		expect(row.etl_written_at).toBe(NOW);

		// The audit row reflects the counts.
		const runDoc = (deps.recordRun as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(runDoc.cases_processed).toBe(1);
		expect(runDoc.started_at).toBe(NOW);
		expect(runDoc.finished_at).toBe(NOW);
	});

	it('passes null cursor on first run and the prior cursor on later runs', async () => {
		const firstRun = makeDeps();
		await runAnalyticsEtl(firstRun);
		expect(firstRun.findEligibleCases).toHaveBeenCalledWith(null);

		const cursorDate = new Date('2026-05-19T02:00:00Z');
		const laterRun = makeDeps({ findLastSuccessfulCursor: vi.fn(async () => cursorDate) });
		await runAnalyticsEtl(laterRun);
		expect(laterRun.findEligibleCases).toHaveBeenCalledWith(cursorDate);
	});

	it('skips a case with no snapshot', async () => {
		const deps = makeDeps({ findLatestSnapshot: vi.fn(async () => null) });
		const result = await runAnalyticsEtl(deps);
		expect(result.cases_skipped).toBe(1);
		expect(result.cases_processed).toBe(0);
		expect(deps.upsertRow).not.toHaveBeenCalled();
	});

	it('skips a case with an empty / undecryptable payload', async () => {
		const deps = makeDeps({ resolvePayload: vi.fn(async () => null) });
		const result = await runAnalyticsEtl(deps);
		expect(result.cases_skipped).toBe(1);
		expect(result.cases_processed).toBe(0);
	});

	it('counts a transform error without sinking the rest of the run', async () => {
		const deps = makeDeps({
			findEligibleCases: vi.fn(async () => [makeCase('GOOD-1'), makeCase('BAD-1'), makeCase('GOOD-2')]),
			enrich: vi.fn((payload) => {
				// Make the middle case blow up during transform.
				if ((payload as { __explode?: boolean }).__explode) throw new Error('boom');
				return payload as unknown as EnrichedPayload;
			}),
			findLatestSnapshot: vi.fn(async (caseId: string): Promise<EtlSnapshot> => {
				const payload = makePayload();
				if (caseId === 'BAD-1') (payload as Record<string, unknown>).__explode = true;
				return { payload, version: 1 };
			})
		});

		const result = await runAnalyticsEtl(deps);
		expect(result.cases_processed).toBe(2);
		expect(result.cases_errored).toBe(1);
		// The run still completes + records its audit row.
		expect(deps.recordRun).toHaveBeenCalledTimes(1);
	});
});
