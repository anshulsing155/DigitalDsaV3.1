/**
 * Push Notifications Service
 *
 * Architecture:
 * - Web Push: In-app notifications for online users (real-time)
 * - Email Digest: Daily summary for all users (9 AM IST)
 * - Notification Queue: Aggregates notifications for digest
 *
 * Status: Skeleton ready | Implementation deferred (Phase 2-4)
 *
 * Database Collections:
 * - push_subscriptions: Browser push subscriptions (PushManager)
 * - notification_queue: Notifications queued for digest
 * - digest_preferences: User digest settings
 */

import { UserApplication as db } from '$lib/database/mongo';
import { sendEmail } from '$lib/server/email';
import logger from '$lib/server/logger';

export type NotificationType = 'case_status' | 'lead' | 'feedback' | 'system';

export interface PushNotification {
	type: NotificationType;
	userId: string;
	userRole: 'dsa' | 'rm' | 'admin';
	caseId?: string;
	title: string;
	message: string;
	action?: string;
	data?: Record<string, any>;
	timestamp?: Date;
}

export interface PushSubscription {
	endpoint: string;
	expirationTime?: number | null;
	keys: {
		p256dh: string;
		auth: string;
	};
}

/**
 * Main notification dispatcher
 *
 * Sends notification to user via:
 * 1. Web Push (if subscribed + online)
 * 2. Digest Queue (for daily email)
 * 3. History Log (audit trail)
 *
 * TODO (Phase 2): Implement web-push library
 * - import webpush from 'web-push'
 * - webpush.setVapidDetails(subject, publicKey, privateKey)
 * - webpush.sendNotification(subscription, JSON.stringify(payload))
 */
export async function notifyUser(notification: PushNotification): Promise<void> {
	try {
		const timestamp = notification.timestamp || new Date();

		// 1. Get user's push subscriptions (active browsers)
		const subscriptions = await db
			.collection<any>('push_subscriptions')
			.find({
				user_id: notification.userId,
				is_active: true,
				expirationTime: { $gt: Date.now() }
			})
			.toArray();

		// 2. Send web push (non-blocking, best-effort)
		if (subscriptions.length > 0) {
			// TODO (Phase 2): Send actual web pushes
			// subscriptions.forEach(sub => {
			//   webpush.sendNotification(sub.subscription, JSON.stringify({
			//     title: notification.title,
			//     body: notification.message,
			//     icon: '/logo.png',
			//     tag: notification.type,
			//     data: { caseId: notification.caseId }
			//   })).catch(err => {
			//     if (err.statusCode === 410) {
			//       // Subscription expired, mark inactive
			//       markSubscriptionInactive(sub._id);
			//     }
			//     logger.warn('Web push failed', { error: err.message });
			//   });
			// });

			logger.debug('[DEV] Web push prepared', {
				subscriptionCount: subscriptions.length,
				title: notification.title
			});
		}

		// 3. Queue for digest
		await db.collection('notification_queue').insertOne({
			user_id: notification.userId,
			type: notification.type,
			case_id: notification.caseId,
			action: notification.action,
			data: notification.data,
			created_at: timestamp,
			sent_in_digest: false
		});

		logger.info('Notification queued', {
			userId: notification.userId,
			type: notification.type,
			subscriptionCount: subscriptions.length
		});
	} catch (error) {
		logger.error('Notification dispatch failed', {
			userId: notification.userId,
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

/**
 * Subscribe browser to push notifications
 *
 * @param userId User ID
 * @param userRole User role (dsa | rm | admin)
 * @param subscription Browser PushSubscription object
 */
export async function subscribeToPush(
	userId: string,
	userRole: string,
	subscription: PushSubscription
): Promise<string> {
	try {
		const result = await db.collection('push_subscriptions').updateOne(
			{
				user_id: userId,
				'subscription.endpoint': subscription.endpoint
			},
			{
				$set: {
					user_id: userId,
					user_role: userRole,
					subscription,
					is_active: true,
					last_ping: new Date(),
					browser: '' // TODO: Extract from User-Agent
				},
				$setOnInsert: {
					created_at: new Date()
				}
			},
			{ upsert: true }
		);

		const id = result.upsertedId?.toString() || 'sub_unknown';

		logger.info('Push subscription created', {
			userId,
			subscriptionId: id
		});

		return id;
	} catch (error) {
		logger.error('Push subscription failed', {
			userId,
			error: error instanceof Error ? error.message : String(error)
		});
		throw error;
	}
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
	try {
		const result = await db.collection('push_subscriptions').updateOne(
			{
				user_id: userId,
				'subscription.endpoint': endpoint
			},
			{
				$set: { is_active: false }
			}
		);

		if (result.matchedCount === 0) {
			logger.warn('Subscription not found', { userId, endpoint });
		}

		logger.info('Push subscription removed', { userId });
	} catch (error) {
		logger.error('Unsubscribe failed', {
			userId,
			error: error instanceof Error ? error.message : String(error)
		});
		throw error;
	}
}

/**
 * Update digest preferences
 */
export async function updateDigestPreferences(
	userId: string,
	preferences: {
		digest_enabled?: boolean;
		digest_time?: string;
		notify_types?: NotificationType[];
		timezone?: string;
	}
): Promise<void> {
	try {
		await db.collection('digest_preferences').updateOne(
			{ user_id: userId },
			{
				$set: {
					...preferences,
					updated_at: new Date()
				},
				$setOnInsert: {
					user_id: userId,
					created_at: new Date()
				}
			},
			{ upsert: true }
		);

		logger.info('Digest preferences updated', {
			userId,
			preferences
		});
	} catch (error) {
		logger.error('Update preferences failed', {
			userId,
			error: error instanceof Error ? error.message : String(error)
		});
		throw error;
	}
}

/**
 * Get digest preferences
 */
export async function getDigestPreferences(userId: string) {
	return db.collection('digest_preferences').findOne({ user_id: userId });
}

/**
 * Send daily digest to user
 *
 * Aggregates queued notifications and sends as email.
 * Called by cron job at 9 AM IST daily.
 *
 * TODO (Phase 3): Implement digest generation + sending
 */
export async function sendDigestForUser(userId: string): Promise<void> {
	try {
		const preferences = await getDigestPreferences(userId);

		if (!preferences?.digest_enabled) {
			return; // User disabled digests
		}

		// Get queued notifications (last 24h)
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const notifications = await db
			.collection<any>('notification_queue')
			.find({
				user_id: userId,
				sent_in_digest: false,
				created_at: { $gte: oneDayAgo }
			})
			.toArray();

		if (notifications.length === 0) {
			logger.debug('No notifications for digest', { userId });
			return;
		}

		// TODO (Phase 3): Group notifications by type
		// const grouped = groupBy(notifications, 'type');

		// TODO (Phase 3): Generate email HTML from grouped data

		// TODO (Phase 3): Send email via sendEmail()

		// Mark as sent
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const notifIds = notifications.map((n: any) => n._id);
		await db
			.collection('notification_queue')
			.updateMany({ _id: { $in: notifIds } }, { $set: { sent_in_digest: true } });

		logger.info('Daily digest sent', {
			userId,
			count: notifications.length
		});
	} catch (error) {
		logger.error('Digest send failed', {
			userId,
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

/**
 * Cron job: Send daily digests to all users
 *
 * Schedule: Every day at 9 AM IST (0 9 * * * Asia/Kolkata)
 * TODO (Phase 3): Wire to cron scheduler
 */
export async function sendAllDailyDigests(): Promise<void> {
	try {
		logger.info('Starting daily digest job');

		const users = await db
			.collection<any>('digest_preferences')
			.find({ digest_enabled: true })
			.toArray();

		let sent = 0;
		for (const userPrefs of users) {
			try {
				await sendDigestForUser(userPrefs.user_id);
				sent++;
			} catch (err) {
				logger.error('Failed to send digest', {
					userId: userPrefs.user_id,
					error: err instanceof Error ? err.message : String(err)
				});
			}
		}

		logger.info('Daily digest job completed', {
			totalUsers: users.length,
			digestsSent: sent
		});
	} catch (error) {
		logger.error('Daily digest job failed', {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

/**
 * Configuration status
 */
export const notificationConfig = {
	vapidPublicKey: process.env.VITE_VAPID_PUBLIC_KEY,
	digestEnabled: true,
	defaultDigestTime: '09:00', // 9 AM IST
	timezone: 'Asia/Kolkata'
};
