// ──────────────────────────────────────────────────────────────────────────
// OBS-2: OpenTelemetry must be initialized BEFORE any module that we want to
// instrument is used.
// ──────────────────────────────────────────────────────────────────────────
import { startTelemetry } from '$lib/server/telemetry.js';

console.error('[BOOT-1] hooks.server.ts module init starting');

process.on('uncaughtException', (err) => {
	console.error('[BOOT-uncaughtException]', err?.stack || err?.message || String(err));
});

process.on('unhandledRejection', (reason) => {
	const detail = reason instanceof Error ? reason.stack || reason.message : String(reason);
	console.error('[BOOT-unhandledRejection]', detail);
});

void startTelemetry();

console.error('[BOOT-2] hooks.server.ts module init complete');

import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';
import {
	redirect,
	isRedirect,
	isHttpError,
	type Handle,
	type HandleServerError,
	type RequestEvent
} from '@sveltejs/kit';
import { dev } from '$app/environment';
import { CSRF_SECRET } from '$env/static/private';
import { createCsrfToken, verifyCsrfToken } from '$lib/server/csrfTokens.js';
import { sendErrorAlert } from '$lib/server/errorAlert.js';
import { validateRequiredEnv } from '$lib/server/envValidation.js';
import logger from '$lib/server/logger.js';

const requestTracer = trace.getTracer('digitaldsa-v3.request');
const csrfSecret = CSRF_SECRET || '';

if (!csrfSecret && !dev) {
	logger.error('FATAL: CSRF_SECRET environment variable is required in production');
	process.exit(1);
}

// 🔒 SECURITY: CSRF token validation
function validateCSRF(event: RequestEvent): boolean {
	if (dev) {
		const hostname = event.url.hostname;
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
			return true;
		}
	}

	const method = event.request.method;
	if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
		return true;
	}

	const url = new URL(event.request.url);
	if (url.pathname.startsWith('/api/cron/')) {
		return true;
	}
	if (url.pathname.startsWith('/api/webhook/')) {
		return true;
	}

	// Skip CSRF for contact/inquiry submissions
	if (url.pathname === '/api/contact' || url.pathname.startsWith('/api/appointment')) {
		return true;
	}

	const csrfToken = event.request.headers.get('x-csrf-token');
	if (!csrfToken) {
		return false;
	}

	return verifyCsrfToken(csrfSecret, csrfToken);
}

export const handle: Handle = async ({ event, resolve }) => {
	return requestTracer.startActiveSpan(
		`${event.request.method} ${event.url.pathname}`,
		{
			attributes: {
				'http.request.method': event.request.method,
				'http.url': event.url.toString(),
				'url.path': event.url.pathname,
				'url.scheme': event.url.protocol.replace(':', '')
			}
		},
		async (rootSpan: Span) => {
			try {
				const response = await handleRequest(event, resolve);
				rootSpan.setAttribute('http.response.status_code', response.status);
				rootSpan.setStatus(
					response.status >= 500
						? { code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` }
						: { code: SpanStatusCode.OK }
				);
				return response;
			} catch (err) {
				if (!isRedirect(err) && !isHttpError(err)) {
					rootSpan.recordException(err as Error);
					rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'Unhandled error in handle()' });
				}
				throw err;
			} finally {
				rootSpan.end();
			}
		}
	);
};

async function handleRequest(
	event: RequestEvent,
	resolve: Parameters<Handle>[0]['resolve']
): Promise<Response> {
	validateRequiredEnv();

	// 🔒 SECURITY: Generate CSRF token for GET requests (only if CSRF_SECRET is configured)
	if (event.request.method === 'GET' && csrfSecret) {
		const csrfToken = createCsrfToken(csrfSecret);
		event.locals.csrfToken = csrfToken;

		event.cookies.set('csrf-token', csrfToken, {
			httpOnly: false,
			path: '/',
			maxAge: 60 * 60 * 24,
			secure: !dev,
			sameSite: 'strict'
		});
	}

	// 🔒 SECURITY: Validate CSRF token for state-changing requests
	if (!validateCSRF(event)) {
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Invalid CSRF token'
			}),
			{
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Website-only mode: no authentication or private roles
	event.locals.user = null;
	event.locals.role = null;

	// 🔒 SECURITY: Generate CSP nonce BEFORE resolve so it can be injected into HTML
	let cspNonce: string | undefined;
	if (!dev) {
		cspNonce = crypto.randomUUID().replace(/-/g, '');
		event.locals.cspNonce = cspNonce;
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			if (cspNonce) {
				return html.replace(/<script>/g, `<script nonce="${cspNonce}">`);
			}
			return html;
		}
	});

	// 🔒 SECURITY: Add security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	if (cspNonce) {
		response.headers.set(
			'Content-Security-Policy',
			`default-src 'self'; script-src 'self' 'nonce-${cspNonce}' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.razorpay.com https://ik.imagekit.io; frame-ancestors 'none'`
		);
	}

	return response;
}

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const err = error as Error;
	const summary = `[SSR-ERROR] ${event.request.method} ${event.url.pathname} status=${status} msg=${message} err=${err?.name ?? 'Unknown'}: ${err?.message ?? 'no-message'}`;
	
	console.error(summary);
	console.error('[SSR-ERROR-STACK]', err?.stack ?? '(no stack)');
	
	logger.error(
		{
			ssrError: true,
			path: event.url.pathname,
			method: event.request.method,
			status,
			message,
			errMessage: err?.message,
			errName: err?.name,
			stack: err?.stack
		},
		summary
	);

	sendErrorAlert({
		source: 'ssr',
		message: err?.message ?? message ?? 'Internal Error',
		stack: err?.stack,
		path: event.url.pathname,
		method: event.request.method,
		userAgent: event.request.headers.get('user-agent') ?? undefined,
		timestamp: new Date().toISOString(),
		status: typeof status === 'number' ? status : undefined,
		extra: { sveltekitMessage: message, errName: err?.name }
	});

	return undefined;
};
