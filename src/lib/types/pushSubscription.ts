/**
 * Push Subscription Types — Web Push notification subscriptions
 */
import type { ObjectId } from 'mongodb';

/** Browser push subscription stored in MongoDB */
export interface PushSubscriptionDoc {
	_id?: ObjectId;
	user_id: string;
	user_role: 'dsa' | 'rm' | 'admin';
	subscription: {
		endpoint: string;
		expirationTime?: number | null;
		keys: {
			p256dh: string;
			auth: string;
		};
	};
	browser: string;
	is_active: boolean;
	created_at: Date;
	last_ping: Date;
}
