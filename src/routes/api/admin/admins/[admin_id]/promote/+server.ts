/**
 * POST /api/admin/admins/[admin_id]/promote
 * ══════════════════════════════════════════════════════════════════
 * Promote/demote super admin status with OTP re-verification.
 *
 * Two-step flow:
 *   1. POST { action: 'send-otp' }       → Sends OTP to acting super admin's phone
 *   2. POST { action: 'promote'|'demote', otp: string, reqId: string } → Verifies OTP and applies
 *
 * Security:
 *   - Only super admins can promote/demote
 *   - OTP is sent to the ACTING admin's phone (not the target)
 *   - Cannot demote yourself
 *   - Cannot demote the last super admin
 *   - All actions are audit-logged
 */

import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRoleApi, requireSuperAdmin } from '$lib/server/guards.js';
import { AdminUsers } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { writeAuditLog } from '$lib/server/auditLog.js';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '$env/static/private';
import {
	apiOk,
	apiOkMessage,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { externalFetch } from '$lib/server/externalFetch.js';

// Two-step OTP flow. step-1 ('send-otp') needs no other fields; step-2
// ('promote'/'demote') requires both otp and reqId from the step-1 response.
const postRequestSchema = z.object({
	action: z.enum(['send-otp', 'promote', 'demote']),
	otp: z.string().min(4).max(10).optional(),
	reqId: z.string().min(1).max(200).optional()
});

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const superDenied = requireSuperAdmin(locals);
	if (superDenied) return superDenied;

	const adminId = params.admin_id;
	if (!adminId || !ObjectId.isValid(adminId)) {
		return apiError('Invalid admin ID', 400);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;
	const validation = postRequestSchema.safeParse(parsed.data);
	if (!validation.success) {
		return apiValidationError('Invalid body', validation.error.flatten());
	}
	const { action, otp, reqId } = validation.data;

	try {

		// ── Step 1: Send OTP to acting super admin ──
		if (action === 'send-otp') {
			const actingMobile = locals.user!.mobileNumber;

			const msg91Resp = await externalFetch(
				'https://api.msg91.com/api/v5/widget/sendOtp',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						identifier: `91${actingMobile}`,
						tokenAuth: MSG91_TOKEN_AUTH,
						widgetId: MSG91_WIDGET_ID
					})
				},
				{ service: 'msg91', timeoutMs: 10_000 }
			);

			const msg91Data = await msg91Resp.json();

			if (msg91Data.type === 'success') {
				return apiOk({
					reqId: msg91Data.reqId,
					message: `OTP sent to ${actingMobile.slice(-4).padStart(actingMobile.length, '*')}`
				});
			}

			return apiError('Failed to send OTP', 500);
		}

		// ── Step 2: Verify OTP and promote/demote ──
		if (!otp || !reqId) {
			return apiError('OTP and reqId are required');
		}

		// Verify OTP via MSG91
		const verifyResp = await externalFetch(
			'https://api.msg91.com/api/v5/widget/verifyOtp',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					otp,
					reqId,
					widgetId: MSG91_WIDGET_ID,
					tokenAuth: MSG91_TOKEN_AUTH
				})
			},
			{ service: 'msg91', timeoutMs: 10_000 }
		);

		const verifyData = await verifyResp.json();
		if (verifyData.type !== 'success') {
			return apiError('Invalid OTP');
		}

		// Load target admin
		const targetAdmin = await AdminUsers.findOne({ _id: new ObjectId(adminId) });
		if (!targetAdmin) {
			return apiError('Admin not found', 404);
		}

		// ── Promote ──
		if (action === 'promote') {
			if (targetAdmin.is_super_admin) {
				return apiError('Already a super admin');
			}

			await AdminUsers.updateOne(
				{ _id: new ObjectId(adminId) },
				{ $set: { is_super_admin: true, updated_at: new Date() } }
			);

			// C.5 — proper user/role_changed audit (was logged as a fake
			// 'lender'/'lender_updated' row pre-C.5 because the user
			// target_type + role_changed action didn't exist yet).
			await writeAuditLog({
				target_type: 'user',
				target_id: adminId,
				action: 'role_changed',
				actor_id: locals.user!.id,
				actor_name: locals.user!.name,
				actor_role: 'admin',
				details: {
					event: 'admin_promoted_to_super',
					admin_name: targetAdmin.name,
					otp_verified: true
				}
			});

			return apiOkMessage(`${targetAdmin.name} promoted to super admin`);
		}

		// ── Demote ──
		if (action === 'demote') {
			// Cannot demote yourself
			if (targetAdmin._id.toString() === locals.user!.id) {
				return apiError('Cannot demote yourself');
			}

			if (!targetAdmin.is_super_admin) {
				return apiError('Not a super admin');
			}

			// Check last super admin protection
			const superAdminCount = await AdminUsers.countDocuments({
				is_super_admin: true,
				is_active: true
			});

			if (superAdminCount <= 1) {
				return apiError('Cannot demote the last super admin');
			}

			await AdminUsers.updateOne(
				{ _id: new ObjectId(adminId) },
				{ $set: { is_super_admin: false, updated_at: new Date() } }
			);

			// C.5 — proper user/role_changed audit (was 'lender_updated' hack).
			await writeAuditLog({
				target_type: 'user',
				target_id: adminId,
				action: 'role_changed',
				actor_id: locals.user!.id,
				actor_name: locals.user!.name,
				actor_role: 'admin',
				details: {
					event: 'admin_demoted_from_super',
					admin_name: targetAdmin.name,
					otp_verified: true
				}
			});

			return apiOkMessage(`${targetAdmin.name} demoted from super admin`);
		}

		return apiError('Invalid action');
	} catch (err) {
		return apiServerError(err, 'Failed to process request');
	}
};
