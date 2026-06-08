# Push Notifications — Implementation Plan (Session 10)

> **Priority**: HIGH (Growth feature, post-launch)
> **Scope**: Web Push API + Email digests
> **Effort**: 3-4 hours
> **Status**: Planning complete, ready for implementation

---

## Overview

Users need real-time alerts for critical case updates + daily email digests of activity.

### Two Channels

1. **In-App Web Push** (real-time)
   - Service Worker + Push API
   - Browser notifications for case status changes
   - No delay required
   - Works offline (cached)

2. **Email Digest** (daily summary)
   - Background job (cron)
   - Aggregates: new leads, case status updates, RM feedback
   - User preference: 9 AM IST daily

---

## Architecture

```
Notification Flow:

Case Updates (API)
  ↓
NotificationService.notify()
  ├─ [Async] Store in DB (PushSubscription)
  ├─ [Async] Send Web Push (if subscribed + online)
  └─ [Async] Queue for digest (if digest enabled)
  ↓
Daily Digest Job (0 9 * * * IST)
  ├─ Aggregate user's queued notifications
  ├─ Group by type (leads, cases, feedback)
  ├─ Generate email HTML
  └─ Send via email.ts (AWS SES)
```

---

## Database Schema

### Collections

#### `push_subscriptions` (new)

Track subscribed browsers.

```javascript
{
  _id: ObjectId,
  user_id: "69932b7080fbf75296f09faa",
  user_role: "dsa", // dsa | rm | admin
  subscription: {
    endpoint: "https://fcm.googleapis.com/...",
    expirationTime: 1709127600000,
    keys: {
      p256dh: "...",
      auth: "..."
    }
  },
  created_at: ISODate("2026-02-27T..."),
  browser: "Chrome 123", // UA string
  device: "Desktop",
  is_active: true,
  last_ping: ISODate("2026-02-27T...")
}
```

**Indexes**:

- Unique: `user_id`, `subscription.endpoint`
- Compound: `user_id`, `is_active`
- TTL: Auto-delete expired subscriptions (7 days before expiration)

#### `notification_queue` (new)

Queue for digest aggregation.

```javascript
{
  _id: ObjectId,
  user_id: "69932b7080fbf75296f09faa",
  type: "case_status", // case_status | lead | feedback | system
  case_id: "case_abc123",
  action: "status_changed", // status_changed | added | commented
  data: {
    case_label: "Home Loan - Rahul Singh",
    old_status: "submitted",
    new_status: "under_review",
    lender_name: "HDFC Bank"
  },
  created_at: ISODate("2026-02-27T..."),
  sent_in_digest: false,
  digest_date: ISODate("2026-02-28T...")
}
```

**Indexes**:

- Compound: `user_id`, `sent_in_digest`, `created_at`
- TTL: Auto-delete after 30 days

#### `digest_preferences` (new)

User preferences for digests.

```javascript
{
  _id: ObjectId,
  user_id: "69932b7080fbf75296f09faa",
  digest_enabled: true,
  digest_time: "09:00", // 9 AM IST
  notify_types: ["case_status", "lead", "feedback"], // subscribed types
  timezone: "Asia/Kolkata",
  created_at: ISODate("2026-02-27T..."),
  updated_at: ISODate("2026-02-27T...")
}
```

---

## API Routes (New)

### 1. Subscribe to Push Notifications

**POST** `/api/notifications/subscribe`

```typescript
// Request
{
  subscription: PushSubscription  // Browser API
}

// Response
{
  success: true,
  subscriptionId: "sub_abc123"
}
```

### 2. Unsubscribe from Push

**POST** `/api/notifications/unsubscribe`

```typescript
// Request
{
	subscriptionId: 'sub_abc123';
}

// Response
{
	success: true;
}
```

### 3. Update Digest Preferences

**PATCH** `/api/notifications/digest-preferences`

```typescript
// Request
{
  digest_enabled: true,
  digest_time: "09:00",
  notify_types: ["case_status", "lead"]
}

// Response
{
  success: true,
  preferences: { ... }
}
```

### 4. Get Notification History (UI)

**GET** `/api/notifications/history?limit=20&offset=0`

```typescript
// Response
{
  notifications: [
    {
      id: "notif_abc",
      type: "case_status",
      title: "Case Status Updated",
      message: "Home Loan - Rahul Singh moved to 'Under Review'",
      timestamp: "2026-02-27T10:30:00Z",
      read: false
    }
  ],
  total: 42
}
```

---

## Service Implementation

### `src/lib/server/notifications.ts` (New)

```typescript
import { db } from '$lib/database/mongo';
import { sendEmail } from '$lib/server/email';
import { logger } from '$lib/server/logger';

export interface PushNotification {
	type: 'case_status' | 'lead' | 'feedback' | 'system';
	userId: string;
	userRole: string;
	caseId?: string;
	title: string;
	message: string;
	action?: string;
	data?: Record<string, any>;
}

/**
 * Main notification dispatcher
 * - Sends push to online browsers
 * - Queues for digest
 * - Logs to notification history
 */
export async function notifyUser(notification: PushNotification): Promise<void> {
	try {
		// 1. Get user's push subscriptions
		const subscriptions = await db
			.collection('push_subscriptions')
			.find({ user_id: notification.userId, is_active: true })
			.toArray();

		// 2. Send web push (non-blocking)
		for (const sub of subscriptions) {
			sendWebPush(sub.subscription, {
				title: notification.title,
				body: notification.message,
				icon: '/logo.png',
				badge: '/badge.png'
			}).catch((err) => {
				logger.warn('Web push failed', { error: err.message, userId: notification.userId });
			});
		}

		// 3. Queue for digest
		await db.collection('notification_queue').insertOne({
			user_id: notification.userId,
			type: notification.type,
			case_id: notification.caseId,
			action: notification.action,
			data: notification.data,
			created_at: new Date(),
			sent_in_digest: false,
			digest_date: getNextDigestDate(notification.userId)
		});

		// 4. Log to history (optional)
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
 * Send web push via Web Push Protocol (RFC 8030)
 * TODO: Implement using web-push library
 */
async function sendWebPush(subscription: any, payload: any): Promise<void> {
	// TODO: Implement with @web-push/web-push
	// webpush.sendNotification(subscription, JSON.stringify(payload))
	logger.debug('[DEV] Web push prepared', { title: payload.title });
}

/**
 * Daily digest job (run via cron at 9 AM IST)
 * TODO: Wire to cron scheduler (node-cron or external service)
 */
export async function sendDailyDigests(): Promise<void> {
	const today = new Date().toDateString();
	const users = await db.collection('digest_preferences').find({ digest_enabled: true }).toArray();

	for (const userPrefs of users) {
		const notifications = await db
			.collection('notification_queue')
			.find({
				user_id: userPrefs.user_id,
				sent_in_digest: false,
				created_at: { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) }
			})
			.toArray();

		if (notifications.length === 0) continue; // Skip if no notifications

		// Group by type
		const grouped = groupBy(notifications, 'type');

		// Generate email
		const html = generateDigestHTML(userPrefs, grouped);

		// Send via email service
		const user = await db.collection('dsa').findOne({ _id: userPrefs.user_id });
		await sendEmail({
			to: user.email,
			subject: `DigitalDSA Daily Digest — ${new Date().toLocaleDateString('en-IN')}`,
			html
		});

		// Mark as sent
		await db
			.collection('notification_queue')
			.updateMany(
				{ user_id: userPrefs.user_id, _id: { $in: notifications.map((n) => n._id) } },
				{ $set: { sent_in_digest: true } }
			);

		logger.info('Daily digest sent', {
			userId: userPrefs.user_id,
			count: notifications.length
		});
	}
}
```

---

## Service Worker (Frontend)

### `src/service-worker.ts` (New/Updated)

```typescript
declare const self: ServiceWorkerGlobalScope;

// Handle push notifications from server
self.addEventListener('push', (event: PushEvent) => {
	if (!event.data) return;

	const data = event.data.json();

	const options: NotificationOptions = {
		body: data.body,
		icon: data.icon,
		badge: data.badge,
		tag: data.tag || 'notification',
		requireInteraction: data.requireInteraction || false,
		actions: [
			{ action: 'open', title: 'Open Case' },
			{ action: 'dismiss', title: 'Dismiss' }
		]
	};

	event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();

	if (event.action === 'open') {
		event.waitUntil(
			clients.matchAll({ type: 'window' }).then((clientList) => {
				// Navigate to case if window open, else open new
				return clientList[0]?.navigate('/dashboard/dsa/cases') || clients.openWindow('/');
			})
		);
	}
});
```

---

## Client-Side Integration

### Subscribe User to Notifications

```typescript
// In layout or onMount()
async function subscribeToNotifications() {
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY
	});

	await fetch('/api/notifications/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ subscription })
	});
}
```

---

## Configuration

### Environment Variables

```bash
# VAPID keys for web push (generate via: npx web-push generate-vapid-keys)
VITE_VAPID_PUBLIC_KEY=BFd...
VAPID_PRIVATE_KEY=xF...
VAPID_SUBJECT=mailto:noreply@digitaldsa.com

# Digest scheduling (optional, if using external cron service)
CRON_DIGEST_URL=https://api.cron-job.org/...
CRON_DIGEST_SECRET=...
```

---

## Implementation Timeline

### Phase 1 (Today — 30 mins)

- ✅ Database schema design (collections + indexes)
- ✅ API routes skeleton
- ✅ Service implementation skeleton
- ✅ Service Worker skeleton

### Phase 2 (Next — 1.5-2 hours)

- Install dependencies: `web-push`, `node-cron`
- Implement web push SDK
- Wire API routes to handlers
- Add push subscription to layout

### Phase 3 (Next — 1 hour)

- Implement digest generation + sending
- Set up cron job for daily digest (9 AM IST)
- Add digest preferences UI (dashboard settings)

### Phase 4 (Next — 30 mins)

- Testing: manual push, digest generation
- Error handling + retry logic
- Monitoring + alerts

---

## Critical Notes

### Don't:

- ❌ Send too many notifications (limit to 1/minute per user)
- ❌ Store entire case objects in notifications (use IDs + lookup)
- ❌ Forget about notification lifespan (old subs expire)

### Do:

- ✅ Use structured logger for all notifications
- ✅ Validate email addresses before sending digests
- ✅ Group related notifications (don't send 10 separate emails)
- ✅ Respect user preferences (digest_enabled, notify_types)
- ✅ Test in dev mode (no VAPID keys needed)

---

## References

- Web Push Protocol: https://datatracker.ietf.org/doc/html/rfc8030
- VAPID Keys: https://web.dev/push-notifications-web-push-protocol/
- Service Worker Guide: https://developers.google.com/web/tools/workbox
- npm `web-push`: https://github.com/web-push-libs/web-push

---

## Next Action

1. Create database schema + indexes
2. Create API routes (4 endpoints)
3. Implement notification service
4. Wire to case status changes
5. Test end-to-end

**Estimated Total**: 3-4 hours (all phases)
