import { MONGODB_URI } from '$env/static/private';
import logger from './logger.js';

/**
 * Validates that all required server environment variables are present.
 */
export function validateRequiredEnv(): void {
	if (!MONGODB_URI) {
		logger.error('CRITICAL: MONGODB_URI environment variable is missing.');
	}
}
