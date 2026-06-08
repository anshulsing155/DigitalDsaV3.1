/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Service Worker — handles push notifications and notification click routing.
 * SvelteKit automatically registers this file as the service worker.
 */

// ── Push Event — show browser notification ─────────────────────

self.addEventListener('push', (event) => {
	const pushEvent = event as unknown as {
		data?: { json(): unknown; text(): string };
		waitUntil(p: Promise<unknown>): void;
	};
	if (!pushEvent.data) return;

	try {
		const payload = pushEvent.data.json() as {
			title: string;
			body: string;
			icon?: string;
			tag?: string;
			data?: { action_url?: string; notification_id?: string };
		};

		const options: NotificationOptions = {
			body: payload.body,
			icon: payload.icon || '/favicon.png',
			badge: '/favicon.png',
			tag: payload.tag || 'digitaldsa-notification',
			data: payload.data || {}
		};

		pushEvent.waitUntil(
			(
				self as unknown as {
					registration: { showNotification(t: string, o: NotificationOptions): Promise<void> };
				}
			).registration.showNotification(payload.title, options)
		);
	} catch {
		pushEvent.waitUntil(
			(
				self as unknown as {
					registration: { showNotification(t: string, o: NotificationOptions): Promise<void> };
				}
			).registration.showNotification('DigitalDSA', {
				body: pushEvent.data?.text() || 'New notification',
				icon: '/favicon.png'
			})
		);
	}
});

// ── Notification Click — navigate to action URL ────────────────

self.addEventListener('notificationclick', (event) => {
	const notifEvent = event as unknown as {
		notification: { close(): void; data?: { action_url?: string } };
		waitUntil(p: Promise<unknown>): void;
	};

	notifEvent.notification.close();

	const actionUrl = notifEvent.notification.data?.action_url;
	const targetUrl = actionUrl || '/dashboard/dsa';

	const clients = (
		self as unknown as {
			clients: {
				matchAll(
					o: unknown
				): Promise<Array<{ url: string; focus(): void; navigate(u: string): void }>>;
				openWindow(u: string): Promise<unknown>;
			};
		}
	).clients;

	notifEvent.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
			for (const client of windowClients) {
				if (client.url.includes('digitaldsa.com') || client.url.includes('localhost')) {
					client.focus();
					client.navigate(targetUrl);
					return;
				}
			}
			return clients.openWindow(targetUrl);
		})
	);
});

// ── Install + Activate ─────────────────────────────────────────

self.addEventListener('install', () => {
	(self as unknown as { skipWaiting(): void }).skipWaiting();
});

self.addEventListener('activate', (event) => {
	const extEvent = event as unknown as { waitUntil(p: Promise<unknown>): void };
	const clients = (self as unknown as { clients: { claim(): Promise<void> } }).clients;
	extEvent.waitUntil(clients.claim());
});
