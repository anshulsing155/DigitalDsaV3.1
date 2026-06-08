import { json } from '@sveltejs/kit';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import logger from '$lib/server/logger.js';
import { externalFetch } from '$lib/server/externalFetch.js';
import { dev } from '$app/environment';

// Define interface for MSG91 response
interface MSG91Response {
	status: string;
	message?: string;
	data?: Record<string, unknown>;
}

// Cache widget data to reduce API calls
let cachedWidgetData: Record<string, unknown> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = Date.now();

		// Check if we have valid cached data
		if (cachedWidgetData && now - cacheTimestamp < CACHE_DURATION) {
			return json({
				success: true,
				widgetData: cachedWidgetData,
				fromCache: true
			});
		}

		// Validate environment variables
		if (!MSG91_WIDGET_ID || !MSG91_TOKEN_AUTH) {
			throw new Error('Missing required environment variables for MSG91 integration');
		}

		// Add request ID for tracking
		const requestId = `req_${Math.random().toString(36).substring(2, 12)}_${now}`;

		// Make API request to MSG91
		const response = await externalFetch(
			`https://api.msg91.com/api/v5/widget/getWidgetProcess?widgetId=${MSG91_WIDGET_ID}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					tokenauth: MSG91_TOKEN_AUTH,
					Accept: 'application/json',
					'X-Request-ID': requestId
				}
			},
			{ service: 'msg91', timeoutMs: 10_000 }
		);

		// Parse response
		const widgetData: MSG91Response = await response.json();

		// Handle error responses
		if (!response.ok) {
			throw new Error(
				`Widget initialization failed: ${response.status} - ${JSON.stringify(widgetData)}`
			);
		}

		// Handle successful responses
		if (widgetData.status === 'success' && widgetData.data) {
			// Update cache
			cachedWidgetData = widgetData.data;
			cacheTimestamp = now;

			return json(
				{
					success: true,
					widgetData: widgetData.data
				},
				{
					headers: {
						'Cache-Control': 'private, max-age=300'
					}
				}
			);
		} else {
			throw new Error(widgetData.message || 'Failed to initialize widget');
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error({ detail: errorMessage }, 'Widget Init Error');

		// In development, return mock widget data if MSG91 is unreachable
		if (dev && errorMessage.includes('fetch failed')) {
			logger.warn('MSG91 unreachable - returning mock widget data for development');
			return json({
				success: true,
				widgetData: { mock: true, devMode: true },
				fromCache: false
			});
		}

		return json(
			{
				success: false,
				error: errorMessage
			},
			{
				status: 500,
				headers: {
					'Cache-Control': 'no-store'
				}
			}
		);
	}
};
