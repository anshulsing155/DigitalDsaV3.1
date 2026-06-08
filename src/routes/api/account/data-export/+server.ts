/**
 * POST /api/account/data-export
 * ══════════════════════════════════════════════════════════════════════
 * DPDP §11 self-service data export.
 *
 *   • requireAuthApi (DSA or RM)
 *   • 30-day rate-limit (one request per user per 30 days; DB-backed)
 *   • Preflight size check (counts user's cases via indexed query)
 *   • Branches:
 *       - Small (≤ INLINE_THRESHOLD cases): assemble the ZIP in-function
 *         and stream it back as a Content-Type: application/zip response.
 *         No persistent storage.
 *       - Large (> INLINE_THRESHOLD cases): fire a ticket email to ops
 *         (tech@digitaldsa.com) and respond with JSON status indicating
 *         a 24-hour SLA.
 *   • Both branches insert a DataExportRequests audit row.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.1
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { apiError, apiOk, apiServerError } from '$lib/server/apiResponse';
import { requireAuthApi } from '$lib/server/guards';
import logger from '$lib/server/logger';
import { DsaApplications, DataExportRequests, rmApplications } from '$lib/database/mongo';
import { findUserByMobile } from '$lib/server/csfle';
import {
	preflightSize,
	buildUserExportZip,
	sendOversizedTicketEmail
} from '$lib/server/account/dataExport';

const RATE_LIMIT_WINDOW_DAYS = 30;
const RATE_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	const authError = requireAuthApi(locals);
	if (authError) return authError;
	// requireAuthApi guarantees locals.user is set; narrow for TS.
	const sessionUser = locals.user!;

	// Map role. DSA + RM use this endpoint; admin doesn't (admin doesn't
	// own the same kind of personal data + a separate admin-self-export
	// is out of scope here).
	const role: 'dsa' | 'rm' | null =
		sessionUser.activeRole === 'dsa'
			? 'dsa'
			: sessionUser.activeRole === 'rm'
				? 'rm'
				: null;
	if (!role) {
		return apiError(
			'Data export is available to DSA and RM accounts only. Admin self-export is not supported here.',
			403
		);
	}

	try {
		// Resolve the user's _id via CSFLE-aware mobile lookup. Pattern
		// matches caseHelpers.resolveDsaId — works whether CSFLE is on or off.
		const userCollection = role === 'dsa' ? DsaApplications : rmApplications;
		const userDoc = await findUserByMobile(userCollection, sessionUser.mobileNumber);
		if (!userDoc?._id) {
			return apiError('User profile not found', 404);
		}
		const userId: ObjectId = userDoc._id;

		// Rate-limit check: most-recent request for this user within the
		// 30-day window. Sorted by requested_at desc, indexed lookup.
		const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
		const recent = await DataExportRequests.findOne(
			{ user_id: userId, requested_at: { $gte: cutoff } },
			{ sort: { requested_at: -1 }, projection: { requested_at: 1 } }
		);
		if (recent) {
			const nextEligibleAt = new Date(
				recent.requested_at.getTime() + RATE_LIMIT_WINDOW_MS
			);
			return apiError(
				`You can request a data export once every ${RATE_LIMIT_WINDOW_DAYS} days. Next eligible: ${nextEligibleAt.toISOString().slice(0, 10)}.`,
				429
			);
		}

		const ipAddress = (() => {
			try {
				return getClientAddress();
			} catch {
				return undefined;
			}
		})();
		const userAgent = request.headers.get('user-agent') ?? undefined;

		// Preflight: cheap count to decide inline vs ticket.
		const preflight = await preflightSize(userId, role);

		if (preflight.routing === 'ticket') {
			// Oversized — fire the ticket email + persist audit row + reply
			// with the friendly "we'll email you" JSON. No ZIP work happens
			// in this request.
			try {
				await sendOversizedTicketEmail({
					userId,
					role,
					caseCount: preflight.caseCount,
					userEmail: userDoc.email,
					userName: userDoc.name
				});
			} catch (mailErr) {
				// Email dispatch failed — log loudly but DON'T fail the
				// request. The audit row still records the attempt, and the
				// user gets the same UX. Ops can spot the gap in DataExportRequests
				// vs the missing email.
				logger.error(
					{ err: mailErr, user_id: String(userId), role },
					'[data-export] Oversized ticket email threw — audit row will record the request'
				);
			}

			await DataExportRequests.insertOne({
				user_id: userId,
				role,
				requested_at: new Date(),
				status: 'queued',
				case_count: preflight.caseCount,
				...(userAgent && { user_agent: userAgent }),
				...(ipAddress && { ip_address: ipAddress })
			});

			return apiOk({
				status: 'queued',
				message: `Your account has ${preflight.caseCount} cases — too many for an instant download. Our team will email your export to ${userDoc.email ?? 'your registered email'} within 24 hours.`,
				eta_hours: 24,
				next_eligible_at: new Date(
					Date.now() + RATE_LIMIT_WINDOW_MS
				).toISOString()
			});
		}

		// Inline path — assemble + stream the ZIP back.
		const { zip, sizeBytes, manifest } = await buildUserExportZip(userId, role);

		// Persist audit row BEFORE streaming so a slow-connection drop
		// doesn't lose the audit. Rate-limit lookup uses this row.
		await DataExportRequests.insertOne({
			user_id: userId,
			role,
			requested_at: new Date(),
			status: 'streamed',
			case_count: preflight.caseCount,
			bytes_streamed: sizeBytes,
			...(userAgent && { user_agent: userAgent }),
			...(ipAddress && { ip_address: ipAddress })
		});

		logger.info(
			{
				user_id: String(userId),
				role,
				case_count: preflight.caseCount,
				size_bytes: sizeBytes,
				manifest_counts: manifest.counts
			},
			'[data-export] Streamed inline export'
		);

		const filename = `digitaldsa-export-${role}-${new Date()
			.toISOString()
			.slice(0, 10)}.zip`;

		// Cast: Uint8Array is a valid BodyInit at runtime (ArrayBufferView)
		// but the project's TS lib version doesn't include it in the union.
		// Wrap in a Blob to satisfy the type checker without copying bytes.
		return new Response(new Blob([new Uint8Array(zip)]), {
			status: 200,
			headers: {
				'Content-Type': 'application/zip',
				'Content-Length': String(sizeBytes),
				'Content-Disposition': `attachment; filename="${filename}"`,
				// Privacy: don't let intermediaries cache the ZIP.
				'Cache-Control': 'private, no-store, max-age=0'
			}
		});
	} catch (err) {
		return apiServerError(err, 'Data export failed');
	}
};
