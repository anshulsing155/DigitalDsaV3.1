/**
 * GET   /api/cases/[case_id]/file-config — Get file configuration
 * PATCH /api/cases/[case_id]/file-config — Update file configuration
 * ══════════════════════════════════════════════════════════════════
 * File configuration controls the *presentation* of a loan file:
 * which sections to show, consolidated vs detailed views, DSA notes.
 *
 * DSAs can NEVER edit numbers/amounts through this endpoint.
 * Only presentation fields are accepted.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import {
	piiModeEnum,
	incomeModeEnum,
	obligationsModeEnum,
	applicantsModeEnum
} from '$lib/schemas/case.schema.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { getDefaultFileConfig } from '$lib/server/fileConfigurator.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// ── Validation schema for file config updates ────────────────────
// Only presentation fields — no numbers, amounts, or financial data.

const fileConfigUpdateSchema = z.object({
	lender_app_id: z.string().min(1, 'lender_app_id is required'),
	sections_visibility: z.record(z.string(), z.boolean()).optional(),
	display_mode: z
		.object({
			income: incomeModeEnum.optional(),
			obligations: obligationsModeEnum.optional(),
			applicants: applicantsModeEnum.optional()
		})
		.optional(),
	dsa_notes: z.record(z.string(), z.string()).optional(),
	section_order: z.array(z.string()).optional(),
	pii_mode: piiModeEnum.optional()
});

// ── GET — Get file configuration ─────────────────────────────────

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'file_builder_view');
	if (permDenied) return permDenied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		const caseDoc = ownership.caseDoc;
		const lenderAppId = url.searchParams.get('lender_app_id');

		// If a specific lender app is requested, find its config
		if (lenderAppId) {
			const lenderApp = caseDoc.lender_applications.find(
				(la) => la.lender_application_id === lenderAppId
			);

			if (!lenderApp) {
				return apiError('Lender application not found', 404);
			}

			// Return existing config or defaults
			const config =
				lenderApp.file_config || getDefaultFileConfig(params.case_id, caseDoc.loan?.type);

			return apiOk({
				config,
				lender_app_id: lenderAppId,
				has_custom_config: !!lenderApp.file_config
			});
		}

		// No specific lender app — check if any lender app has a config
		const appWithConfig = caseDoc.lender_applications.find((la) => la.file_config);

		if (appWithConfig) {
			return apiOk({
				config: appWithConfig.file_config,
				lender_app_id: appWithConfig.lender_application_id,
				has_custom_config: true
			});
		}

		// No config found anywhere — return defaults
		return apiOk({
			config: getDefaultFileConfig(params.case_id, caseDoc.loan?.type),
			lender_app_id: null,
			has_custom_config: false
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch file configuration');
	}
};

// ── PATCH — Update file configuration ────────────────────────────

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'file_builder_configure');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate input — only presentation fields allowed
		const parsed = fileConfigUpdateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		const caseDoc = ownership.caseDoc;
		const { lender_app_id, ...configUpdates } = parsed.data;

		// Find the lender application
		const lenderAppIndex = caseDoc.lender_applications.findIndex(
			(la) => la.lender_application_id === lender_app_id
		);

		if (lenderAppIndex === -1) {
			return apiError('Lender application not found', 404);
		}

		const now = new Date();
		const prefix = `lender_applications.${lenderAppIndex}.file_config`;

		// ── Build $set using MongoDB dot notation ─────────────
		const $set: Record<string, any> = {
			[`${prefix}.updated_at`]: now,
			updated_at: now
		};

		// sections_visibility — merge with existing
		if (configUpdates.sections_visibility) {
			for (const [section, visible] of Object.entries(configUpdates.sections_visibility)) {
				$set[`${prefix}.sections_visibility.${section}`] = visible;
			}
		}

		// display_mode — merge individual sub-fields
		if (configUpdates.display_mode) {
			if (configUpdates.display_mode.income) {
				$set[`${prefix}.display_mode.income`] = configUpdates.display_mode.income;
			}
			if (configUpdates.display_mode.obligations) {
				$set[`${prefix}.display_mode.obligations`] = configUpdates.display_mode.obligations;
			}
			if (configUpdates.display_mode.applicants) {
				$set[`${prefix}.display_mode.applicants`] = configUpdates.display_mode.applicants;
			}
		}

		// dsa_notes — merge with existing
		if (configUpdates.dsa_notes) {
			for (const [section, note] of Object.entries(configUpdates.dsa_notes)) {
				$set[`${prefix}.dsa_notes.${section}`] = note;
			}
		}

		// section_order — replace entire array
		if (configUpdates.section_order) {
			$set[`${prefix}.section_order`] = configUpdates.section_order;
		}

		// pii_mode
		if (configUpdates.pii_mode) {
			$set[`${prefix}.pii_mode`] = configUpdates.pii_mode;
		}

		// If the lender app doesn't have a file_config yet, seed defaults first
		const lenderApp = caseDoc.lender_applications[lenderAppIndex];
		if (!lenderApp.file_config) {
			const defaults = getDefaultFileConfig(params.case_id, caseDoc.loan?.type);
			$set[`${prefix}.source_payload_hash`] = defaults.source_payload_hash;
			$set[`${prefix}.source_snapshot_version`] = defaults.source_snapshot_version;

			// Only set defaults for fields not being updated
			if (!configUpdates.sections_visibility) {
				$set[`${prefix}.sections_visibility`] = defaults.sections_visibility;
			}
			if (!configUpdates.display_mode) {
				$set[`${prefix}.display_mode`] = defaults.display_mode;
			}
			if (!configUpdates.dsa_notes) {
				$set[`${prefix}.dsa_notes`] = defaults.dsa_notes;
			}
			if (!configUpdates.section_order) {
				$set[`${prefix}.section_order`] = defaults.section_order;
			}
			if (!configUpdates.pii_mode) {
				$set[`${prefix}.pii_mode`] = defaults.pii_mode;
			}
		}

		// ── Execute update ───────────────────────────────────────
		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, { $set });

		// ── Create timeline event ────────────────────────────────
		const changedFields = Object.keys(configUpdates).filter(
			(k) => configUpdates[k as keyof typeof configUpdates] !== undefined
		);

		await createTimelineEvent(
			params.case_id,
			'case_updated',
			`File config updated for lender app ${lender_app_id}: ${changedFields.join(', ')}`,
			{
				action: 'file_config_updated',
				lender_application_id: lender_app_id,
				changed_fields: changedFields
			}
		);

		// ── Fetch and return updated config ──────────────────────
		const updatedCase = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });
		const updatedApp = updatedCase?.lender_applications.find(
			(la) => la.lender_application_id === lender_app_id
		);

		return apiOk({
			config: updatedApp?.file_config,
			lender_app_id: lender_app_id
		});
	} catch (err) {
		return apiServerError(err, 'Failed to update file configuration');
	}
};
