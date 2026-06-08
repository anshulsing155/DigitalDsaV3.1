/**
 * GET  /api/cases/[case_id]/results-data
 * ═══════════════════════════════════════════════════════════════════════════
 * Returns the data the results page (`/dashboard/dsa/cases/[id]/results`)
 * needs to render lender offers. Replaces the page's previous
 * `+page.server.ts` load function (2026-06-03 split) so the page itself
 * becomes CSR-only and the slow data work no longer blocks the
 * SvelteKit `__data.json` SSR fetch (which was 504-ing on Vercel Hobby's
 * 10s function ceiling per the user-reported 2026-06-03 screenshot).
 *
 * Architecture rationale:
 *   - Page route renders the shell immediately (no SSR data wait)
 *   - This API endpoint runs in its own 10s budget
 *   - Page calls this via fetch in +page.ts (with ssr=false)
 *   - If THIS endpoint 504s, the page is already rendered and the UX
 *     can show a loading-failed banner with a Retry button instead of
 *     a Vercel 504 splash page
 *
 * Security:
 *   - DSA + Admin auth (requireRoleApi)
 *   - verifyCaseOwnership (BOLA defense — same as phase 2 of the
 *     evaluate split)
 *   - Optional `?version=N` query param for historical results
 *
 * Query params:
 *   - version: integer >= 1 (optional; defaults to latest)
 *
 * Response: apiOk({ ...same shape the page previously got from
 *                   +page.server.ts load... })
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import type { Config } from '@sveltejs/adapter-vercel';
import { dev } from '$app/environment';

export const config: Config = {
	maxDuration: 60
};

import { requireRoleApi } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { Cases, LenderResultsSnapshots, FormSnapshots } from '$lib/database/mongo.js';
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import type { LenderResultsData } from '$lib/types/lenderResults.js';
import type { LenderChangeDelta, LenderSelection } from '$lib/types/lenderResultsSnapshot.js';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const tStart = Date.now();
	let lastMark = tStart;
	const mark = (label: string) => {
		const now = Date.now();
		const phase_ms = now - lastMark;
		const elapsed_ms = now - tStart;
		lastMark = now;
		logger.info(
			{
				event: 'api.results_data.phase',
				route: 'results_data_api',
				case_id: params.case_id,
				label,
				phase_ms,
				elapsed_ms
			},
			`[api:results-data] ${label} +${phase_ms}ms (total ${elapsed_ms}ms)`
		);
	};

	const caseId = params.case_id;
	if (!caseId) {
		return apiError('case_id is required', 400);
	}

	// 1. Auth
	const denied = requireRoleApi(locals, ['dsa', 'admin']);
	if (denied) return denied;

	// 2. Resolve DSA + verify case ownership
	const dsaResult = await resolveEffectiveDsaId(locals);
	if (!dsaResult.ok) {
		return apiError(dsaResult.error, 404);
	}
	const dsaId = dsaResult.dsaId;
	mark('dsaResolve');

	const ownership = await verifyCaseOwnership(caseId, dsaId);
	if (!ownership.ok) {
		const status = ownership.error === 'Case not found' ? 404 : 403;
		return apiError(ownership.error, status);
	}
	const caseDoc = ownership.caseDoc;
	mark('ownership');

	// 3. Parse optional version query param
	const requestedVersionParam = url.searchParams.get('version');
	const requestedVersion = requestedVersionParam ? parseInt(requestedVersionParam, 10) : null;

	try {
		// 4. Parallel data fetch — same pattern as the prior +page.server.ts:
		//    - snapshot (requested version or latest)
		//    - totalVersions (count)
		//    - versionDocs (history strip — last 20)
		//    - optimistic FormSnapshot (using case's cached form_snapshot_version)
		const snapshotQuery =
			requestedVersion && requestedVersion > 0
				? LenderResultsSnapshots.findOne({ case_id: caseId, version: requestedVersion })
				: LenderResultsSnapshots.findOne({ case_id: caseId }, { sort: { version: -1 } });

		const cachedFormVersion = ((caseDoc as any).form_snapshot_version ?? 0) as number;

		const [snapshot, totalVersions, versionDocs, optimisticFormSnapshot] = await Promise.all([
			snapshotQuery,
			LenderResultsSnapshots.countDocuments({ case_id: caseId }),
			LenderResultsSnapshots.find(
				{ case_id: caseId },
				{
					projection: {
						version: 1,
						trigger: 1,
						created_at: 1,
						change_summary: 1
					}
				}
			)
				.sort({ version: -1 })
				.limit(20)
				.toArray(),
			cachedFormVersion > 0
				? FormSnapshots.findOne({ case_id: caseId, version: cachedFormVersion })
				: Promise.resolve(null)
		]);
		mark('parallelFetch4');

		// 5. No results yet (or requested version doesn't exist)
		if (!snapshot) {
			return apiOk({
				lenderResults: null,
				caseId,
				hasResults: false,
				currentVersion: 0,
				totalVersions: 0,
				changeDeltas: [] as LenderChangeDelta[],
				versionHistory: [] as Array<{
					version: number;
					trigger: string;
					created_at: string;
					change_summary?: string;
				}>,
				selections: [] as LenderSelection[],
				previouslyRejectedLenders: [] as string[],
				assessmentStatus: '',
				rejectionReasons: [] as string[],
				sourceFormSnapshotVersion: 0,
				formSnapshotVersion: cachedFormVersion
			});
		}

		// 6. Resolve form-assessment fields for the results page.
		//
		// F2 fast path (2026-06-05): phase 2 caches the FormSnapshot's
		// assessmentStatus / assessmentLenders / rejectionReasons onto the
		// LenderResultsSnapshot at write time (immutable + keyed by
		// source_form_snapshot_version, so the cache can never go stale
		// relative to its source). When the field is present, we skip the
		// FormSnapshot load + CSFLE decrypt entirely.
		//
		// Slow path (pre-F2 snapshots / future cache-miss): decrypt the
		// FormSnapshot just like before. No migration required — old
		// snapshots stay readable forever via this fallback.
		const formSnapshotVersion = snapshot.source_form_snapshot_version ?? cachedFormVersion;
		let previouslyRejectedLenders: string[] = [];
		let assessmentStatus = '';
		let rejectionReasons: string[] = [];

		const cached = (snapshot as any).form_assessment_cache as
			| {
					assessmentStatus?: string;
					previouslyRejectedLenders?: string[];
					rejectionReasons?: string[];
			  }
			| undefined;

		if (cached) {
			// F2 fast path — read straight from the projection.
			assessmentStatus = cached.assessmentStatus ?? '';
			previouslyRejectedLenders = Array.isArray(cached.previouslyRejectedLenders)
				? cached.previouslyRejectedLenders.filter(
						(l: unknown): l is string => typeof l === 'string'
					)
				: [];
			rejectionReasons = Array.isArray(cached.rejectionReasons)
				? cached.rejectionReasons.filter((r: unknown): r is string => typeof r === 'string')
				: [];
			logger.info(
				{
					event: 'api.results_data.phase',
					route: 'results_data_api',
					case_id: caseId,
					label: 'formAssessmentCacheHit',
					phase_ms: 0,
					elapsed_ms: Date.now() - tStart
				},
				`[api:results-data] form_assessment_cache hit (skipped FormSnapshot decrypt)`
			);
		} else if (formSnapshotVersion > 0) {
			// Pre-F2 slow path — decrypt the FormSnapshot to read the same fields.
			let formSnapshot: Awaited<ReturnType<typeof FormSnapshots.findOne>> =
				optimisticFormSnapshot && optimisticFormSnapshot.version === formSnapshotVersion
					? optimisticFormSnapshot
					: null;
			if (!formSnapshot) {
				formSnapshot = await FormSnapshots.findOne({
					case_id: caseId,
					version: formSnapshotVersion
				});
			}
			mark('formSnapshotFetch');

			const tBeforeResolve = Date.now();
			const resolved = formSnapshot ? await resolveSnapshotPayload(formSnapshot) : null;
			logger.info(
				{
					event: 'api.results_data.phase',
					route: 'results_data_api',
					case_id: caseId,
					label: 'formSnapshotResolve',
					phase_ms: Date.now() - tBeforeResolve,
					elapsed_ms: Date.now() - tStart
				},
				`[api:results-data] formSnapshotResolve +${Date.now() - tBeforeResolve}ms`
			);

			if (resolved) {
				assessmentStatus = (resolved.assessmentStatus as string | undefined) ?? '';
				const lenders = resolved.assessmentLenders;
				if (Array.isArray(lenders)) {
					previouslyRejectedLenders = lenders.filter(
						(l: unknown): l is string => typeof l === 'string'
					);
				}
				const reasons = resolved.rejectionReasons;
				if (Array.isArray(reasons)) {
					rejectionReasons = reasons.filter((r: unknown): r is string => typeof r === 'string');
				}
			}
		}

		// 7. Serialize snapshot data
		const lenderResults: LenderResultsData = snapshot.payload;
		const changeDeltas: LenderChangeDelta[] = snapshot.change_deltas ?? [];
		const selections: LenderSelection[] = (caseDoc as any).lender_selections ?? [];

		const versionHistory = versionDocs.map((v) => ({
			version: v.version,
			trigger: v.trigger,
			created_at:
				v.created_at instanceof Date
					? v.created_at.toISOString()
					: new Date(v.created_at).toISOString(),
			change_summary: v.change_summary
		}));
		mark('serialize');

		return apiOk({
			lenderResults,
			caseId,
			hasResults: true,
			currentVersion: snapshot.version,
			totalVersions,
			changeDeltas,
			versionHistory,
			selections,
			sourceFormSnapshotVersion: snapshot.source_form_snapshot_version ?? 0,
			formSnapshotVersion: cachedFormVersion,
			previouslyRejectedLenders,
			assessmentStatus,
			rejectionReasons
		});
	} catch (err) {
		return apiServerError(err, 'Failed to load results');
	}
};
