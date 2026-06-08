/**
 * Notification Service — in-app notification CRUD
 *
 * Handles creating, fetching, and marking notifications as read.
 * Triggered by case stage changes, lead events, billing events, etc.
 * Notifications auto-expire after 90 days via MongoDB TTL index.
 */

import { Notifications } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import logger from '$lib/server/logger.js';
import type { NotificationDoc, CreateNotificationInput } from '$lib/types/notification';
import { sendPushToUser } from '$lib/server/pushService.js';

/**
 * Create a new notification for a user.
 * Returns the inserted document's _id as a string.
 */
export async function createNotification(input: CreateNotificationInput): Promise<string> {
	const doc: Omit<NotificationDoc, '_id'> = {
		...input,
		read: false,
		created_at: new Date()
	};

	const result = await Notifications.insertOne(doc as NotificationDoc);
	logger.info({ userId: input.user_id, type: input.type }, 'Notification created');

	// Fire-and-forget: send push notification to subscribed browsers
	sendPushToUser(input.user_id, {
		title: input.title,
		body: input.message,
		tag: `${input.type}-${result.insertedId}`,
		data: {
			action_url: input.action_url,
			notification_id: result.insertedId.toString()
		}
	}).catch((err) => logger.warn({ err }, 'Push notification delivery failed'));

	return result.insertedId.toString();
}

/**
 * Fetch paginated notifications for a user, newest first.
 * Returns both the page of items and the total count for pagination UI.
 */
export async function getNotifications(
	userId: string,
	opts: { limit?: number; offset?: number } = {}
): Promise<{ items: NotificationDoc[]; total: number }> {
	const limit = Math.min(opts.limit ?? 20, 50);
	const offset = opts.offset ?? 0;

	// Parallel fetch: page of notifications + total count
	const [items, total] = await Promise.all([
		Notifications.find({ user_id: userId })
			.sort({ created_at: -1 })
			.skip(offset)
			.limit(limit)
			.toArray(),
		Notifications.countDocuments({ user_id: userId })
	]);

	return { items, total };
}

/**
 * Count unread notifications for a user.
 * Used by the bell icon badge to show unread count.
 */
export async function getUnreadCount(userId: string): Promise<number> {
	return Notifications.countDocuments({ user_id: userId, read: false });
}

/**
 * Mark a single notification as read.
 * Checks ownership (user_id must match) to prevent cross-user access.
 * Returns true if the notification was found and updated.
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
	const result = await Notifications.updateOne(
		{ _id: new ObjectId(notificationId), user_id: userId },
		{ $set: { read: true } }
	);
	return result.modifiedCount > 0;
}

/**
 * Mark all unread notifications as read for a user.
 * Returns the number of notifications that were updated.
 */
export async function markAllRead(userId: string): Promise<number> {
	const result = await Notifications.updateMany(
		{ user_id: userId, read: false },
		{ $set: { read: true } }
	);
	return result.modifiedCount;
}
