import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import logger from '$lib/server/logger.js';

export const GET: RequestHandler = async ({ request }) => {
	try {
		const isLocalhost = request.headers.get('host')?.includes('localhost') ?? false;

		const country = isLocalhost ? 'IN' : request.headers.get('x-vercel-ip-country') || 'Unknown';
		const countryRegion = isLocalhost
			? 'Development'
			: request.headers.get('x-vercel-ip-country-region') || 'Unknown';
		const city = isLocalhost ? 'Local' : request.headers.get('x-vercel-ip-city') || 'Unknown';
		const latitude = isLocalhost ? null : request.headers.get('x-vercel-ip-latitude');
		const longitude = isLocalhost ? null : request.headers.get('x-vercel-ip-longitude');

		const location = {
			country,
			region: countryRegion,
			city,
			coordinates:
				latitude && longitude
					? {
							latitude: parseFloat(latitude),
							longitude: parseFloat(longitude)
						}
					: null
		};

		return json(
			{
				location,
				timestamp: new Date().toISOString()
			},
			{
				headers: {
					'Cache-Control': 'private, max-age=0, no-cache'
				}
			}
		);
	} catch (error) {
		logger.error({ err: error }, 'Error in location check');
		return json(
			{
				error: 'Failed to retrieve location data',
				timestamp: new Date().toISOString()
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
