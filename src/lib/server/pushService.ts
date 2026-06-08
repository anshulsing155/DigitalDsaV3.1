/**
 * Push Service — Web Push notification delivery via web-push library
 *
 * Manages push subscriptions (save, remove, send) and integrates with
 * the in-app notification system. When a notification is created,
 * this service sends a push to all active browser subscriptions.
 *
 * VAPID keys must be configured in environment variables:
 * - VITE_VAPID_PUBLIC_KEY (also available client-side)
 * - VAPID_PRIVATE_KEY (server-only)
 */

// @ts-expect-error — web-push has no type declarations
import webpush from 'web-push';
import { PushSubscriptions } from '$lib/database/mongo.js';
import logger from '$lib/server/logger.js';
import type { PushSubscriptionDoc } from '$lib/types/pushSubscription';
import { env } from '$env/dynamic/private';

// ── VAPID Configuration ────────────────────────────────────────

const VAPID_PUBLIC_KEY = env.VITE_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = env.VAPID_SUBJECT || 'mailto:noreply@digitaldsa.com';

let vapidConfigured = false;

/** Initialize VAPID keys for web-push. Called lazily on first send. */
function ensureVapidConfigured(): boolean {
	if (vapidConfigured) return true;
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		logger.warn('VAPID keys not configured — push notifications disabled');
		return false;
	}
	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
	vapidConfigured = true;
	return true;
}

// ── Subscription Management ────────────────────────────────────

/**
 * Save a browser push subscription for a user.
 * Upserts by (user_id + endpoint) so re-subscribing the same browser updates rather than duplicates.
 */
export async function savePushSubscription(
	userId: string,
	userRole: 'dsa' | 'rm' | 'admin',
	subscription: PushSubscriptionDoc['subscription'],
	browser: string
): Promise<string> {
	const now = new Date();

	const result = await PushSubscriptions.updateOne(
		{ user_id: userId, 'subscription.endpoint': subscription.endpoint },
		{
			$set: {
				user_role: userRole,
				subscription,
				browser,
				is_active: true,
				last_ping: now
			},
			$setOnInsert: {
				user_id: userId,
				created_at: now
			}
		},
		{ upsert: true }
	);

	const subscriptionId = result.upsertedId?.toString() || 'updated';
	logger.info({ userId, browser }, 'Push subscription saved');
	return subscriptionId;
}

/**
 * Deactivate a push subscription (soft delete).
 * Called when user unsubscribes or when a push returns 410 Gone.
 */
export async function removePushSubscription(userId: string, endpoint: string): Promise<boolean> {
	const result = await PushSubscriptions.updateOne(
		{ user_id: userId, 'subscription.endpoint': endpoint },
		{ $set: { is_active: false } }
	);
	return result.modifiedCount > 0;
}

// ── Push Delivery ──────────────────────────────────────────────

/** Payload shape for push notifications */
export interface PushPayload {
	title: string;
	body: string;
	icon?: string;
	tag?: string;
	data?: {
		action_url?: string;
		notification_id?: string;
	};
}

/**
 * Send a push notification to all active subscriptions for a user.
 * Handles 410 Gone responses by deactivating stale subscriptions.
 * Fire-and-forget — errors are logged but don't throw.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
	if (!ensureVapidConfigured()) return 0;

	// Fetch all active subscriptions for this user
	const subscriptions = await PushSubscriptions.find({
		user_id: userId,
		is_active: true
	}).toArray();

	if (subscriptions.length === 0) return 0;

	const payloadString = JSON.stringify(payload);
	let successCount = 0;

	// Send to each subscription in parallel
	await Promise.allSettled(
		subscriptions.map(async (sub) => {
			try {
				await webpush.sendNotification(sub.subscription, payloadString);
				successCount++;
			} catch (error: unknown) {
				const statusCode = (error as { statusCode?: number }).statusCode;

				// 410 Gone = subscription expired, deactivate it
				if (statusCode === 410 || statusCode === 404) {
					await PushSubscriptions.updateOne({ _id: sub._id }, { $set: { is_active: false } });
					logger.info(
						{ userId, endpoint: sub.subscription.endpoint.slice(0, 60) },
						'Deactivated expired push subscription'
					);
				} else {
					logger.warn(
						{ userId, statusCode, error: String(error) },
						'Push notification delivery failed'
					);
				}
			}
		})
	);

	if (successCount > 0) {
		logger.info(
			{ userId, sent: successCount, total: subscriptions.length },
			'Push notifications sent'
		);
	}

	return successCount;
}
