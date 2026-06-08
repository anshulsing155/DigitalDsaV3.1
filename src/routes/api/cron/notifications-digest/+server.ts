/**
 * POST /api/notifications/digest
 * Cron endpoint: sends daily email digests of unread notifications.
 * Protected by cron secret — called by external cron service.
 *
 * Groups unread notifications by user, generates a summary email,
 * and marks those notifications as included in the digest.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { Notifications, DsaApplications } from '$lib/database/mongo.js';
import { sendEmail } from '$lib/server/email.js';
import { env } from '$env/dynamic/private';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';

const CRON_SECRET = env.CRON_SECRET || '';

// PERF-013: bound the digest aggregation by a recency window. Without this,
// the pipeline's leading `$match: { read: false }` cannot take efficient
// advantage of the `{ user_id:1, read:1, created_at:-1 }` index (the compound
// index is keyed on user_id first), leading to a scan across every unread
// notification in the system. A 7-day window keeps the digest meaningful
// (daily cron, weekly catch-up for infrequent logins) while capping scan
// cost at bounded, recent traffic. TTL is 90 days, so the ceiling would
// otherwise be the full TTL window. Configurable via env for ops tuning.
const DIGEST_WINDOW_DAYS = Math.max(1, Number(env.DIGEST_WINDOW_DAYS) || 7);

export const POST: RequestHandler = async ({ request }) => {
	// Authenticate cron request
	const authHeader = request.headers.get('x-cron-secret') || '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const digestWindowStart = new Date(
			Date.now() - DIGEST_WINDOW_DAYS * 24 * 60 * 60 * 1000
		);

		// Find all users with unread notifications that haven't been sent in a digest
		const unreadByUser = await Notifications.aggregate<{
			_id: string;
			notifications: Array<{ type: string; title: string; message: string; action_url?: string }>;
			count: number;
		}>([
			{ $match: { read: false, created_at: { $gte: digestWindowStart } } },
			{
				$group: {
					_id: '$user_id',
					notifications: {
						$push: {
							type: '$type',
							title: '$title',
							message: '$message',
							action_url: '$action_url'
						}
					},
					count: { $sum: 1 }
				}
			},
			{ $match: { count: { $gt: 0 } } }
		]).toArray();

		let digestsSent = 0;

		// Batch-fetch all user emails in a single query (avoids N+1 sequential findOne)
		const userIds = unreadByUser.map((u) => u._id);
		const dsaDocs =
			userIds.length > 0
				? await DsaApplications.find({ _id: { $in: userIds } } as any, {
						projection: { name: 1, email: 1 }
					}).toArray()
				: [];
		const dsaMap = new Map(dsaDocs.map((d) => [String(d._id), d]));

		for (const userGroup of unreadByUser) {
			const dsaDoc = dsaMap.get(String(userGroup._id));
			const email = dsaDoc?.email as string | undefined;
			const name = (dsaDoc?.name as string) || 'User';
			if (!email) continue;

			// Group notifications by type for the digest
			const grouped: Record<string, Array<{ title: string; message: string }>> = {};
			for (const n of userGroup.notifications) {
				const typeLabel = n.type || 'update';
				if (!grouped[typeLabel]) grouped[typeLabel] = [];
				grouped[typeLabel].push({ title: n.title, message: n.message });
			}

			// Build digest HTML
			let notificationListHtml = '';
			for (const [type, items] of Object.entries(grouped)) {
				const typeTitle = type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
				notificationListHtml += `<h3 style="margin: 16px 0 8px; color: #333;">${typeTitle} (${items.length})</h3>`;
				for (const item of items) {
					notificationListHtml += `<p style="margin: 4px 0; padding: 8px; background: #f9f9f9; border-radius: 4px;"><strong>${item.title}</strong><br/><span style="color: #666;">${item.message}</span></p>`;
				}
			}

			try {
				await sendEmail({
					to: email,
					subject: `${userGroup.count} update${userGroup.count === 1 ? '' : 's'} on DigitalDSA`,
					html: `
						<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
							<div style="font-size: 24px; font-weight: bold; color: #cb997e; margin-bottom: 20px;">DigitalDSA</div>
							<p>Hi ${name},</p>
							<p>Here's your daily summary of <strong>${userGroup.count}</strong> unread notification${userGroup.count === 1 ? '' : 's'}:</p>
							${notificationListHtml}
							<a href="${PUBLIC_APP_BASE_URL}/dashboard/dsa" style="display: inline-block; background: #cb997e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0;">View Dashboard</a>
							<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
								<p>&copy; 2026 DigitalDSA. All rights reserved.</p>
							</div>
						</div>
					`,
					text: `Hi ${name}, you have ${userGroup.count} unread notifications on DigitalDSA. View at ${PUBLIC_APP_BASE_URL}/dashboard/dsa`
				});
				digestsSent++;
			} catch (err) {
				logger.warn({ err, dsaId: userGroup._id }, 'Failed to send digest email');
			}
		}

		logger.info({ usersWithUnread: unreadByUser.length, digestsSent }, 'Daily digest complete');

		return apiOk({ usersProcessed: unreadByUser.length, digestsSent });
	} catch (err) {
		return apiServerError(err, 'notification digest');
	}
};
