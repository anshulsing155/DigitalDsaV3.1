import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { Cases, DsaApplications, FormSnapshots, LenderResultsSnapshots } from '$lib/database/mongo';
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import type { CaseStage } from '$lib/types/case';
import { getAvailableTransitions } from '$lib/server/stagePipeline';
import { loanTypeToFormRoute, resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { getDemoCases, getDemoDsaProfile } from '$lib/server/demoData.js';
import { isFeatureEnabled } from '$lib/server/featureGate.js';
import logger from '$lib/server/logger';

// ============================================================================
// STAGE LABELS (shared)
// ============================================================================

const STAGE_LABELS: Record<CaseStage, string> = {
	quota_blocked: 'Awaiting Processing',
	intake: 'Intake',
	profiling: 'Profiling',
	file_building: 'File Building',
	submitted: 'Submitted',
	processing: 'Processing',
	query: 'Query',
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	rejected: 'Rejected',
	dropped: 'Dropped',
	closed: 'Closed'
};

function toISO(d: Date | string): string {
	return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// ============================================================================
// LAYOUT LOAD — loads case once for all child pages
// ============================================================================

export const load: LayoutServerLoad = async ({ parent, params, locals }) => {
	const parentData = await parent();
	const user = parentData.user;

	if (!user?.id) {
		throw error(401, 'Authentication required');
	}

	// ── Demo mode: return in-memory case data, skip MongoDB ─────
	if (user.id === DEMO_USER_ID) {
		const caseId = params.case_id;
		const demoCases = getDemoCases();
		const demoCase = demoCases.find((c) => c.case_id === caseId);

		if (!demoCase) {
			throw error(404, 'Case not found');
		}

		const demoProfile = getDemoDsaProfile();
		const availableTransitions = getAvailableTransitions(demoCase.stage).map((s) => ({
			value: s,
			label: STAGE_LABELS[s] || s
		}));

		const demoFormRoute = loanTypeToFormRoute(demoCase.loan.type);

		// Serialize dates to ISO strings (same shape as real data)
		const serializedCase = {
			applicant_name: demoCase.optional_contact?.full_name || '',
			...demoCase,
			_id: 'demo-case-' + caseId,
			dsa_id: demoCase.dsa_id.toString(),
			stage_label: STAGE_LABELS[demoCase.stage] || demoCase.stage,
			editFormURL: demoFormRoute ? `${demoFormRoute}?edit=${caseId}` : null,
			created_at: toISO(demoCase.created_at),
			updated_at: toISO(demoCase.updated_at),
			stage_history: demoCase.stage_history.map((sh) => ({
				...sh,
				timestamp: toISO(sh.timestamp)
			})),
			lender_applications: demoCase.lender_applications.map((la) => ({
				...la,
				rm_contact_id: la.rm_contact_id?.toString(),
				created_at: toISO(la.created_at),
				updated_at: toISO(la.updated_at),
				status_history: la.status_history.map((sh) => ({
					...sh,
					timestamp: toISO(sh.timestamp)
				})),
				queries: la.queries.map((q) => ({
					...q,
					raised_at: toISO(q.raised_at),
					deadline: q.deadline ? toISO(q.deadline) : undefined,
					response: q.response
						? {
								...q.response,
								responded_at: toISO(q.response.responded_at)
							}
						: undefined
				})),
				document_checklist: la.document_checklist.map((doc) => ({
					...doc,
					status_updated_at: doc.status_updated_at ? toISO(doc.status_updated_at) : undefined,
					upload: doc.upload
						? {
								...doc.upload,
								uploaded_at: toISO(doc.upload.uploaded_at)
							}
						: undefined,
					validity: doc.validity
						? {
								...doc.validity,
								valid_from: doc.validity.valid_from ? toISO(doc.validity.valid_from) : undefined,
								valid_until: doc.validity.valid_until ? toISO(doc.validity.valid_until) : undefined
							}
						: undefined
				})),
				eligibility_snapshot: la.eligibility_snapshot
					? {
							...la.eligibility_snapshot,
							computed_at: toISO(la.eligibility_snapshot.computed_at)
						}
					: undefined,
				sanction: la.sanction
					? {
							...la.sanction,
							sanction_date: la.sanction.sanction_date
								? toISO(la.sanction.sanction_date)
								: undefined
						}
					: undefined,
				file_snapshots: la.file_snapshots.map((fs) => ({
					...fs,
					generated_at: toISO(fs.generated_at)
				}))
			})),
			form_submission_id: demoCase.form_submission_id?.toString()
		};

		return {
			caseData: serializedCase,
			availableTransitions,
			stageLabels: STAGE_LABELS,
			dsaProfile: {
				name: demoProfile.name,
				firmName: demoProfile.firmName
			},
			shareLinksEnabled: false // Demo users don't get share links
		};
	}

	// ── Resolve DSA _id (team-aware) ────────────────────────────
	const dsaResult = await resolveEffectiveDsaId(locals);
	if (!dsaResult.ok) {
		throw error(404, 'DSA profile not found');
	}
	const dsaId = dsaResult.dsaId;

	// ── Load DSA doc + Case + auxiliary data in parallel ────────
	// LATENCY OPT (2026-06-03): expanded the original 2-query Promise.all
	// (dsaDoc + caseDoc, 2026-06-02 commit) to also include the three
	// auxiliary fetches that were running serially AFTER the join:
	//   - FormSnapshots latest-version (for applicant name)
	//   - isFeatureEnabled (share-links gate)
	//   - LenderResultsSnapshots latest (for Add Lender modal offer chips)
	//
	// User-visible impact: results page (and other case-detail children) was
	// 504-ing on Vercel Hobby's 10s ceiling because this layout was
	// burning ~5 sequential round-trips. Parallelizing collapses the
	// network wait to the slowest single query.
	//
	// Independence check:
	//   - FormSnapshots query needs caseDoc.case_id ONLY if caseDoc exists.
	//     Use params.case_id directly (it equals caseDoc.case_id by
	//     definition since we look up the case BY case_id below — a stale
	//     param would just yield an empty snapshot query).
	//   - isFeatureEnabled needs dsaId (resolved before this Promise.all).
	//   - LenderResultsSnapshots needs caseDoc.case_id — same trick as
	//     FormSnapshots: use params.case_id.
	//   - All four extra queries are READ-ONLY and have no inter-dependency.
	const caseId = params.case_id;
	const formSnapshotsLatestQuery = FormSnapshots.find({ case_id: caseId })
		.sort({ version: -1 })
		.limit(1)
		.toArray();
	const latestLenderResultsQuery = LenderResultsSnapshots.findOne(
		{ case_id: caseId },
		{ sort: { version: -1 }, projection: { 'payload.results': 1 } }
	);
	const shareLinksGatePromise = isFeatureEnabled('share_links_enabled', dsaId.toString());

	const [dsaDoc, caseDoc, snapForName, latestResults, shareLinksGate] = await Promise.all([
		DsaApplications.findOne({ _id: dsaId }),
		Cases.findOne({ case_id: caseId, dsa_id: dsaId }),
		formSnapshotsLatestQuery,
		latestLenderResultsQuery,
		shareLinksGatePromise
	]);

	if (!caseDoc) {
		throw error(404, 'Case not found');
	}

	// ── Compute available stage transitions ─────────────────────
	const availableTransitions = getAvailableTransitions(caseDoc.stage).map((s) => ({
		value: s,
		label: STAGE_LABELS[s] || s
	}));

	const formRoute = loanTypeToFormRoute(caseDoc.loan.type);

	// ── B.3: primary applicant FULL name for the DSA's header. The
	// FormSnapshots query already ran in parallel above; here we just
	// decrypt the result (CSFLE-aware). Stored label stays name-free;
	// the name shows only in this DSA view.
	let applicantName = '';
	try {
		if (snapForName[0]) {
			const payload = (await resolveSnapshotPayload(snapForName[0])) as Record<string, unknown> | null;
			const applicants = Array.isArray(payload?.applicants)
				? (payload!.applicants as Record<string, unknown>[])
				: [];
			const fullName = applicants[0]?.fullName;
			if (typeof fullName === 'string') applicantName = fullName;
		}
	} catch {
		// Decrypt/parse failure — header falls back to the label.
	}

	// ── Serialize dates for client ──────────────────────────────
	const serializedCase = {
		applicant_name: applicantName,
		...caseDoc,
		_id: caseDoc._id?.toString(),
		dsa_id: caseDoc.dsa_id.toString(),
		stage_label: STAGE_LABELS[caseDoc.stage] || caseDoc.stage,
		editFormURL: formRoute ? `${formRoute}?edit=${caseDoc.case_id}` : null,
		created_at: caseDoc.created_at.toISOString
			? caseDoc.created_at.toISOString()
			: new Date(caseDoc.created_at).toISOString(),
		updated_at: caseDoc.updated_at.toISOString
			? caseDoc.updated_at.toISOString()
			: new Date(caseDoc.updated_at).toISOString(),
		stage_history: caseDoc.stage_history.map((sh) => ({
			...sh,
			timestamp: sh.timestamp.toISOString
				? sh.timestamp.toISOString()
				: new Date(sh.timestamp).toISOString()
		})),
		lender_applications: caseDoc.lender_applications.map((la) => ({
			...la,
			rm_contact_id: la.rm_contact_id?.toString(),
			created_at: la.created_at.toISOString
				? la.created_at.toISOString()
				: new Date(la.created_at).toISOString(),
			updated_at: la.updated_at.toISOString
				? la.updated_at.toISOString()
				: new Date(la.updated_at).toISOString(),
			status_history: la.status_history.map((sh) => ({
				...sh,
				timestamp: sh.timestamp.toISOString
					? sh.timestamp.toISOString()
					: new Date(sh.timestamp).toISOString()
			})),
			queries: la.queries.map((q) => ({
				...q,
				raised_at: q.raised_at.toISOString
					? q.raised_at.toISOString()
					: new Date(q.raised_at).toISOString(),
				deadline: q.deadline
					? q.deadline.toISOString
						? q.deadline.toISOString()
						: new Date(q.deadline).toISOString()
					: undefined,
				response: q.response
					? {
							...q.response,
							responded_at: q.response.responded_at.toISOString
								? q.response.responded_at.toISOString()
								: new Date(q.response.responded_at).toISOString()
						}
					: undefined
			})),
			document_checklist: la.document_checklist.map((doc) => ({
				...doc,
				status_updated_at: doc.status_updated_at
					? doc.status_updated_at.toISOString
						? doc.status_updated_at.toISOString()
						: new Date(doc.status_updated_at).toISOString()
					: undefined,
				upload: doc.upload
					? {
							...doc.upload,
							uploaded_at: doc.upload.uploaded_at.toISOString
								? doc.upload.uploaded_at.toISOString()
								: new Date(doc.upload.uploaded_at).toISOString()
						}
					: undefined,
				validity: doc.validity
					? {
							...doc.validity,
							valid_from: doc.validity.valid_from
								? doc.validity.valid_from.toISOString
									? doc.validity.valid_from.toISOString()
									: new Date(doc.validity.valid_from).toISOString()
								: undefined,
							valid_until: doc.validity.valid_until
								? doc.validity.valid_until.toISOString
									? doc.validity.valid_until.toISOString()
									: new Date(doc.validity.valid_until).toISOString()
								: undefined
						}
					: undefined
			})),
			eligibility_snapshot: la.eligibility_snapshot
				? {
						...la.eligibility_snapshot,
						computed_at: la.eligibility_snapshot.computed_at.toISOString
							? la.eligibility_snapshot.computed_at.toISOString()
							: new Date(la.eligibility_snapshot.computed_at).toISOString()
					}
				: undefined,
			sanction: la.sanction
				? {
						...la.sanction,
						sanction_date: la.sanction.sanction_date
							? la.sanction.sanction_date.toISOString
								? la.sanction.sanction_date.toISOString()
								: new Date(la.sanction.sanction_date).toISOString()
							: undefined
					}
				: undefined,
			file_snapshots: la.file_snapshots.map((fs) => ({
				...fs,
				generated_at: fs.generated_at.toISOString
					? fs.generated_at.toISOString()
					: new Date(fs.generated_at).toISOString()
			}))
		})),
		form_submission_id: caseDoc.form_submission_id?.toString()
	};

	// shareLinksGate + latestResults are already fetched by the parallel
	// Promise.all above (2026-06-03 latency op). Below we just project
	// the lenderOffers shape from the cached snapshot — pure CPU, no
	// further DB I/O.

	// Item F (2026-06-01) — Add Lender modal offer chips. Defensive: silently
	// null when the case hasn't been evaluated yet (Intake / quota blocked)
	// OR when payload.results is malformed. The modal falls back to a plain
	// lender list when null. Review finding M-N3, 2026-05-30.
	let lenderOffers: Array<{
		lender_id: string;
		lender_name: string;
		traffic_light: 'green' | 'amber' | 'red' | 'grey';
		offered_amount: number;
		roi: number;
		tenure_months: number;
	}> | null = null;
	try {
		const rawResults = latestResults?.payload?.results;
		if (Array.isArray(rawResults) && rawResults.length > 0) {
			lenderOffers = rawResults.map((r) => ({
				lender_id: String(r.lender_id ?? ''),
				lender_name: String(r.lender_name ?? ''),
				traffic_light: (r.traffic_light ?? 'grey') as 'green' | 'amber' | 'red' | 'grey',
				offered_amount: Number(r.offered_amount ?? 0),
				roi: Number(r.roi ?? 0),
				tenure_months: Number(r.tenure_months ?? 0)
			}));
		}
	} catch (err) {
		logger.warn(
			{ err, case_id: caseDoc.case_id },
			'[case-layout] failed to project lenderOffers from LenderResultsSnapshots — Add Lender modal will show no-offers state'
		);
	}

	return {
		caseData: serializedCase,
		availableTransitions,
		stageLabels: STAGE_LABELS,
		dsaProfile: {
			name: dsaDoc?.name || '',
			firmName: dsaDoc?.businessType === 'Individual' ? undefined : dsaDoc?.lenderName
		},
		shareLinksEnabled: shareLinksGate.enabled,
		lenderOffers
	};
};
