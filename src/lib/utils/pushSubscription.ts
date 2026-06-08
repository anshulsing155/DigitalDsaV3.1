/**
 * Push Subscription — client-side utilities for Web Push
 *
 * Handles service worker registration, push subscription management,
 * and permission requests. All functions are browser-only (use in onMount).
 */

import { browser } from '$app/environment';

import clientLogger from '$lib/utils/clientLogger';
import { secureFetch } from '$lib/utils/csrf';

/** Check if the browser supports push notifications */
export function isPushSupported(): boolean {
	if (!browser) return false;
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Get the current notification permission status */
export function getPushPermission(): NotificationPermission | 'unsupported' {
	if (!isPushSupported()) return 'unsupported';
	return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Returns true if permission is granted, false otherwise.
 */
export async function requestPushPermission(): Promise<boolean> {
	if (!isPushSupported()) return false;

	// Already granted
	if (Notification.permission === 'granted') return true;

	// Already denied — can't re-ask (browser limitation)
	if (Notification.permission === 'denied') return false;

	// Ask user
	const result = await Notification.requestPermission();
	return result === 'granted';
}

/**
 * Subscribe the current browser to push notifications.
 * Registers the service worker, creates a PushSubscription,
 * and sends it to the server.
 *
 * @returns true if subscription was successful
 */
export async function subscribeToPush(): Promise<boolean> {
	if (!isPushSupported()) return false;

	try {
		// Get the VAPID public key from environment (injected via Vite)
		const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
		if (!vapidPublicKey) {
			clientLogger.warn('VAPID public key not configured — push subscription skipped');
			return false;
		}

		// Register or get existing service worker
		const registration = await navigator.serviceWorker.ready;

		// Convert VAPID key from base64url to ArrayBuffer (required by PushManager)
		const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer;

		// Subscribe to push — browser shows permission dialog if needed
		const pushSubscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey
		});

		// Send subscription to our server
		const subscriptionJson = pushSubscription.toJSON();
		const response = await secureFetch('/api/notifications/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				subscription: {
					endpoint: subscriptionJson.endpoint,
					expirationTime: subscriptionJson.expirationTime,
					keys: subscriptionJson.keys
				}
			})
		});

		return response.ok;
	} catch (error) {
		clientLogger.warn({ err: error }, 'Push subscription failed:');
		return false;
	}
}

/**
 * Unsubscribe the current browser from push notifications.
 * Removes the browser subscription and notifies the server.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
	if (!isPushSupported()) return false;

	try {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		if (!subscription) return true; // Already unsubscribed

		// Unsubscribe browser-side
		await subscription.unsubscribe();

		// Notify server
		await secureFetch('/api/notifications/unsubscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ endpoint: subscription.endpoint })
		});

		return true;
	} catch (error) {
		clientLogger.warn({ err: error }, 'Push unsubscribe failed:');
		return false;
	}
}

/**
 * Check if the current browser is subscribed to push notifications.
 */
export async function isSubscribedToPush(): Promise<boolean> {
	if (!isPushSupported()) return false;

	try {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		return subscription !== null;
	} catch {
		return false;
	}
}

// ── Helper: Convert base64url VAPID key to Uint8Array ──────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}
