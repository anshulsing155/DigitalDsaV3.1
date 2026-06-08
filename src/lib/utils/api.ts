/**
 * Cross-platform API utility for handling requests in web, Android, and iOS environments
 */

import { Capacitor } from '@capacitor/core';

import clientLogger from '$lib/utils/clientLogger';
// @capacitor/network calls window.addEventListener at CJS module-load time, which
// crashes SSR. Import it lazily inside the function that actually uses it.

// Determine the current platform
export const isPlatformNative = (): boolean => Capacitor.isNativePlatform();
export const getPlatformName = (): string => Capacitor.getPlatform();

/**
 * Fetch API wrapper with platform-specific configurations
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns Promise with the fetch response
 */
export async function fetchWithPlatformSupport(
	url: string,
	options: RequestInit = {}
): Promise<Response> {
	try {
		// Check network connectivity first (lazy import — avoids SSR crash)
		const { Network } = await import('@capacitor/network');
		const networkStatus = await Network.getStatus();
		if (!networkStatus.connected) {
			throw new Error('No internet connection available');
		}

		// Add platform-specific headers
		// Use Record<string, string> instead of HeadersInit to allow dynamic property access
		const platformHeaders: Record<string, string> = {
			Accept: 'application/json'
		};

		// Merge existing headers if they exist
		if (options.headers) {
			if (options.headers instanceof Headers) {
				options.headers.forEach((value, key) => {
					platformHeaders[key] = value;
				});
			} else if (Array.isArray(options.headers)) {
				options.headers.forEach(([key, value]) => {
					platformHeaders[key] = value;
				});
			} else {
				Object.assign(platformHeaders, options.headers);
			}
		}

		// Add Capacitor/native app identifier for CORS if on native platform
		if (isPlatformNative()) {
			platformHeaders['Origin'] = 'capacitor://localhost';
			platformHeaders['X-Requested-With'] = 'com.digitaldsa.app';
			platformHeaders['X-Capacitor-Platform'] = getPlatformName();
		}

		const response = await fetch(url, {
			...options,
			headers: platformHeaders,
			mode: 'cors'
		});

		return response;
	} catch (error) {
		clientLogger.error({ err: error }, 'API request failed:');
		throw error;
	}
}

/**
 * Perform a JSON POST request with platform compatibility
 * @param url The URL to fetch
 * @param data The data to send in the request body
 * @returns Promise with the parsed JSON response
 */
export async function postJsonData<T = any, R = any>(url: string, data: T): Promise<R> {
	const response = await fetchWithPlatformSupport(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`API Error (${response.status}): ${errorText}`);
	}

	return response.json();
}
