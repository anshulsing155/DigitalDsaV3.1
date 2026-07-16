import { json } from '@sveltejs/kit';

export function apiOk(data: any = {}, meta: any = {}) {
	return json({
		success: true,
		data,
		...meta
	});
}

export function apiError(message: string, status = 400, code?: string, details?: any) {
	return json(
		{
			success: false,
			error: message,
			code,
			details
		},
		{ status }
	);
}

export function apiOkMessage(message: string) {
	return json({
		success: true,
		message
	});
}

export function apiServerError(errOrMessage?: any, message = 'Internal server error') {
	const msg = typeof errOrMessage === 'string' ? errOrMessage : message;
	return apiError(msg, 500, 'SERVER_ERROR');
}


export function apiValidationError(message: string, details?: any) {
	return apiError(message, 400, 'VALIDATION_ERROR', details);
}

export async function parseJsonBody(request: Request): Promise<any> {
	try {
		return await request.json();
	} catch {
		throw new Error('Invalid JSON payload');
	}
}
