/**
 * POST / GET  /api/onboarding/dsa-onboarding-v2
 * ═══════════════════════════════════════════════════════════════════
 * DSA Onboarding v2 — save / load extended profile data.
 *
 * POST: Save or update v2 onboarding data (any section independently).
 *       When all 5 sections are complete, sets onboarding_v2_completed = true
 *       and seeds sample data for the dashboard demo.
 *
 * GET:  Load current v2 data plus server-side pain point options and
 *       available modules for the UI.
 * ═══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit'; // left: GET success has extra top-level keys (painPointOptions, availableModules)
import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { DsaApplications, RMContacts } from '$lib/database/mongo.js';
import { dsaOnboardingV2Schema } from '$lib/schemas/onboarding/dsaOnboardingV2.schema.js';
import { PAIN_POINTS_OPTIONS } from '$lib/data/painPoints.js';
import { AVAILABLE_MODULES } from '$lib/data/modules.js';
import { seedSampleData } from '$lib/server/sampleDataSeeder.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import {
	parseJsonBody,
	apiOk,
	apiError,
	apiValidationError,
	apiServerError
} from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

// ── POST — Save / update v2 onboarding data ─────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate with the partial v2 schema (all sections optional)
		const parsed = dsaOnboardingV2Schema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const v2Data = parsed.data;

		// Find the DSA document — SEC-2 dual-query handles encrypted +
		// plaintext rows. Decrypt so downstream code (sample-data seeder)
		// can read `dsa.name` as plaintext.
		const mobileNumber = locals.user!.mobileNumber;
		const dsaRaw = await findUserByMobile(DsaApplications, mobileNumber);
		const dsa = await decryptUserPii(dsaRaw);

		if (!dsa) {
			return apiError('DSA profile not found', 404);
		}

		// ── Build the $set update (merge, don't replace) ─────────
		const $set: Record<string, any> = { updatedAt: new Date() };

		if (v2Data.business_profile !== undefined) {
			$set.business_profile = v2Data.business_profile;
		}
		if (v2Data.pain_points_ranking !== undefined) {
			$set.pain_points_ranking = v2Data.pain_points_ranking;
		}
		if (v2Data.goals !== undefined) {
			$set.goals = v2Data.goals;
		}
		if (v2Data.workflow !== undefined) {
			$set.workflow = v2Data.workflow;
		}
		if (v2Data.active_modules !== undefined) {
			$set.active_modules = v2Data.active_modules;
		}
		if (v2Data.subscription !== undefined) {
			$set.subscription = v2Data.subscription;
		}
		if (v2Data.feature_flags !== undefined) {
			$set.feature_flags = v2Data.feature_flags;
		}

		// ── Check if all 5 sections are now complete ─────────────
		// Merge incoming data with existing document to determine completeness
		const mergedProfile = v2Data.business_profile ?? (dsa as any).business_profile;
		const mergedPainPoints = v2Data.pain_points_ranking ?? (dsa as any).pain_points_ranking;
		const mergedGoals = v2Data.goals ?? (dsa as any).goals;
		const mergedWorkflow = v2Data.workflow ?? (dsa as any).workflow;
		const mergedModules = v2Data.active_modules ?? (dsa as any).active_modules;

		const allSectionsComplete = !!(
			mergedProfile &&
			mergedPainPoints &&
			mergedGoals &&
			mergedWorkflow &&
			mergedModules &&
			mergedModules.length > 0
		);

		if (allSectionsComplete) {
			$set.onboarding_v2_completed = true;
		}

		// Respect explicit override if provided
		if (v2Data.onboarding_v2_completed !== undefined) {
			$set.onboarding_v2_completed = v2Data.onboarding_v2_completed;
		}

		// ── Update the DSA document ──────────────────────────────
		await DsaApplications.updateOne({ _id: dsa._id }, { $set });

		// ── Upsert RM contacts from empanelled lenders ───────────
		if (v2Data.business_profile?.empanelled_lenders) {
			const rmUpserts = v2Data.business_profile.empanelled_lenders
				.filter((lender) => lender.rm_name && lender.rm_name.trim().length > 0)
				.map((lender) => {
					const now = new Date();
					return RMContacts.updateOne(
						{
							rm_name: lender.rm_name!,
							lender_name: lender.lender_name
						},
						{
							$setOnInsert: {
								rm_name: lender.rm_name!,
								lender_name: lender.lender_name,
								phone: lender.rm_phone || undefined,
								email: lender.rm_email || undefined,
								is_active: true,
								notes_by_dsa: {},
								confirmation_count: 0,
								contributed_at: now,
								last_confirmed_at: now,
								created_at: now
							},
							$addToSet: { contributed_by: dsa._id },
							$inc: { confirmation_count: 1 },
							$set: {
								updated_at: now,
								last_confirmed_at: now,
								// Update phone/email if provided (latest data wins)
								...(lender.rm_phone ? { phone: lender.rm_phone } : {}),
								...(lender.rm_email ? { email: lender.rm_email } : {})
							}
						},
						{ upsert: true }
					);
				});

			await Promise.all(rmUpserts);
		}

		// ── Seed sample data on first completion ─────────────────
		const wasAlreadyCompleted = (dsa as any).onboarding_v2_completed === true;
		if (allSectionsComplete && !wasAlreadyCompleted) {
			try {
				await seedSampleData(dsa._id!, dsa.name || 'DSA');
			} catch (seedErr) {
				// Non-fatal: log but don't fail the onboarding save
				logger.error({ err: seedErr }, 'Sample data seeding error');
			}
		}

		// ── Return updated profile ───────────────────────────────
		const updated = await DsaApplications.findOne({ _id: dsa._id });

		return apiOk({
			business_profile: (updated as any)?.business_profile ?? null,
			pain_points_ranking: (updated as any)?.pain_points_ranking ?? null,
			goals: (updated as any)?.goals ?? null,
			workflow: (updated as any)?.workflow ?? null,
			active_modules: (updated as any)?.active_modules ?? null,
			onboarding_v2_completed: (updated as any)?.onboarding_v2_completed ?? false,
			subscription: (updated as any)?.subscription ?? null,
			feature_flags: (updated as any)?.feature_flags ?? null
		});
	} catch (err) {
		return apiServerError(err, 'DSA Onboarding v2 POST error');
	}
};

// ── GET — Load current v2 data + server-side options ─────────────

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const mobileNumber = locals.user!.mobileNumber;
		const dsa = await findUserByMobile(DsaApplications, mobileNumber);

		if (!dsa) {
			return apiError('DSA profile not found', 404);
		}

		return json({
			// left: extra top-level keys (painPointOptions, availableModules) — not apiOk shape
			success: true,
			data: {
				business_profile: (dsa as any).business_profile ?? null,
				pain_points_ranking: (dsa as any).pain_points_ranking ?? null,
				goals: (dsa as any).goals ?? null,
				workflow: (dsa as any).workflow ?? null,
				active_modules: (dsa as any).active_modules ?? null,
				onboarding_v2_completed: (dsa as any).onboarding_v2_completed ?? false,
				subscription: (dsa as any).subscription ?? null,
				feature_flags: (dsa as any).feature_flags ?? null
			},
			painPointOptions: PAIN_POINTS_OPTIONS,
			availableModules: AVAILABLE_MODULES
		});
	} catch (err) {
		logger.error({ err }, 'DSA Onboarding v2 GET error');
		return json({ success: false, error: 'Failed to load onboarding data' }, { status: 500 });
	}
};
