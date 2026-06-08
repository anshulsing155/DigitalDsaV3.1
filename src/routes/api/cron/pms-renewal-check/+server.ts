/**
 * POST /api/pms/cron/renewal-check
 * Daily cron: checks RmLenderAssignments for upcoming or overdue monthly renewals.
 *
 * Actions taken:
 *   - Assignments where nextVerificationDueBy < now → status: 'suspended'
 *   - Assignments where nextVerificationDueBy < now + 7d → sends renewal reminder
 *     (email + in-app notification, max 1 per day per assignment)
 *
 * Protected by x-cron-secret header (same pattern as /api/notifications/digest).
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { RmLenderAssignments, Notifications, rmApplications } from '$lib/database/mongo.js';
import { sendEmail } from '$lib/server/email.js';
import { env } from '$env/dynamic/private';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';

const CRON_SECRET = env.CRON_SECRET || '';
const RENEWAL_WARNING_DAYS = 7;

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') || '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	const now = new Date();
	const warningThreshold = new Date(now.getTime() + RENEWAL_WARNING_DAYS * 24 * 60 * 60 * 1000);

	let suspended = 0;
	let notified = 0;

	try {
		// Step 1 — Suspend overdue assignments
		const overdueResult = await RmLenderAssignments.updateMany(
			{ status: 'active', nextVerificationDueBy: { $lt: now } },
			{
				$set: {
					status: 'suspended',
					suspendedAt: now,
					suspendedReason: 'Monthly verification not completed within 30-day window'
				}
			}
		);
		suspended = overdueResult.modifiedCount;

		if (suspended > 0) {
			logger.info({ suspended }, 'PMS cron: suspended overdue assignments');
		}

		// Step 2 — Find assignments due within the warning window
		const dueSoon = await RmLenderAssignments.find({
			status: 'active',
			nextVerificationDueBy: { $gte: now, $lte: warningThreshold }
		}).toArray();

		if (dueSoon.length === 0) {
			return apiOk({ suspended, notified: 0 });
		}

		// Batch-fetch RM email addresses
		const rmUserIds = [...new Set(dueSoon.map((a) => a.rmUserId))];
		const rmDocs = await rmApplications
			.find({ _id: { $in: rmUserIds } } as any, { projection: { email: 1, name: 1 } })
			.toArray();
		const rmMap = new Map(rmDocs.map((r) => [String(r._id), r]));

		for (const assignment of dueSoon) {
			const daysLeft = Math.ceil(
				(assignment.nextVerificationDueBy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);

			const rm = rmMap.get(assignment.rmUserId);
			const rmEmail = rm?.email as string | undefined;
			const rmName = (rm?.name as string) || 'RM';

			// Check if we already notified today (avoid duplicate in-app notifications)
			const todayStart = new Date(now);
			todayStart.setHours(0, 0, 0, 0);

			const alreadyNotifiedToday = await Notifications.findOne({
				user_id: assignment.rmUserId,
				type: 'pms_renewal_due',
				'metadata.lenderId': assignment.lenderId,
				created_at: { $gte: todayStart }
			} as any);

			if (alreadyNotifiedToday) continue;

			// In-app notification
			await Notifications.insertOne({
				user_id: assignment.rmUserId,
				user_role: 'rm',
				type: 'pms_renewal_due',
				title: `${assignment.lenderName} verification due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
				message: `Your monthly verification for ${assignment.lenderName} is due by ${assignment.nextVerificationDueBy.toLocaleDateString('en-IN')}. Please verify to maintain access.`,
				action_url: '/dashboard/rm/policies',
				read: false,
				created_at: now,
				metadata: { lenderId: assignment.lenderId }
			});

			// Email reminder (non-fatal if email fails)
			if (rmEmail) {
				try {
					await sendEmail({
						to: rmEmail,
						subject: `DigitalDSA — ${assignment.lenderName} verification due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
						html: `
							<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
								<div style="font-size: 22px; font-weight: bold; color: #cb997e; margin-bottom: 16px;">DigitalDSA</div>
								<p>Hi ${rmName},</p>
								<p>Your monthly verification for <strong>${assignment.lenderName}</strong> is due in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.</p>
								<p>Please log in and complete verification to maintain your policy management access.</p>
								<a href="${PUBLIC_APP_BASE_URL}/dashboard/rm/policies" style="display: inline-block; background: #cb997e; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; margin: 16px 0;">Verify Now →</a>
								<p style="color: #666; font-size: 13px; margin-top: 20px;">Your access will be suspended if verification is not completed by ${assignment.nextVerificationDueBy.toLocaleDateString('en-IN')}.</p>
							</div>
						`,
						text: `Hi ${rmName}, your ${assignment.lenderName} policy management access expires in ${daysLeft} days. Log in to verify: ${PUBLIC_APP_BASE_URL}/dashboard/rm/policies`
					});
				} catch (err) {
					logger.warn({ err, lenderId: assignment.lenderId }, 'Failed to send PMS renewal reminder email');
				}
			}

			notified++;
		}
	} catch (err) {
		return apiServerError(err, 'pms cron renewal-check');
	}

	logger.info({ suspended, notified }, 'PMS cron renewal-check complete');

	return apiOk({ suspended, notified });
};
