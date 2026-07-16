import logger from './logger.js';

export interface ErrorAlertPayload {
	source: string;
	message: string;
	stack?: string;
	path?: string;
	method?: string;
	userAgent?: string;
	timestamp: string;
	status?: number;
	extra?: Record<string, any>;
}

/**
 * Sends/Logs an SSR server-side error alert.
 */
export function sendErrorAlert(payload: ErrorAlertPayload): void {
	logger.error('[ErrorAlert]', payload.message, {
		path: payload.path,
		method: payload.method,
		status: payload.status,
		stack: payload.stack
	});
}
