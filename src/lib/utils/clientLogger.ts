/**
 * Client-side structured logger.
 *
 * Mirrors the server-side logger API (`$lib/server/logger`) so isomorphic
 * service code can swap imports without touching call sites. Cannot use
 * the server logger directly because it reads `$env/static/private`,
 * which is not available in browser bundles.
 *
 * Gating:
 *   - `info` / `debug`: dev-only (noise-free prod console)
 *   - `warn`  / `error`: always visible (actionable signals a user can
 *     paste from devtools when reporting bugs)
 *
 * Signature (matches server logger):
 *   logger.error('AuthService: login failed', err)
 *   logger.error({ userId }, 'AuthService: login failed')
 *
 * When wiring an error-reporting service (Sentry/etc.) later, replace
 * this module — call sites stay unchanged.
 */
import { dev } from '$app/environment';

type LogArgs = [message: string, meta?: unknown] | [meta: object, message: string];

interface Logger {
	info: (...args: LogArgs) => void;
	warn: (...args: LogArgs) => void;
	error: (...args: LogArgs) => void;
	debug: (...args: LogArgs) => void;
}

function parseArgs(args: LogArgs): { message: string; meta?: unknown } {
	if (typeof args[0] === 'string') {
		return { message: args[0], meta: args[1] };
	}
	// Pino-style: (object, message)
	return { message: args[1] as string, meta: args[0] };
}

function format(level: string, message: string, meta?: unknown): string {
	const ts = new Date().toISOString();
	let metaStr = '';
	if (meta !== undefined) {
		try {
			metaStr = ` ${JSON.stringify(meta)}`;
		} catch {
			// Circular refs, Error objects, etc. — fall back to String().
			metaStr = ` ${String(meta)}`;
		}
	}
	return `[${ts}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

const clientLogger: Logger = {
	info(...args) {
		if (!dev) return;
		const { message, meta } = parseArgs(args);
		console.info(format('info', message, meta));
	},
	debug(...args) {
		if (!dev) return;
		const { message, meta } = parseArgs(args);
		console.debug(format('debug', message, meta));
	},
	warn(...args) {
		const { message, meta } = parseArgs(args);
		console.warn(format('warn', message, meta));
	},
	error(...args) {
		const { message, meta } = parseArgs(args);
		console.error(format('error', message, meta));
	}
};

export default clientLogger;
