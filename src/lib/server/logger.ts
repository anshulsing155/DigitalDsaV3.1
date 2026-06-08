// src/lib/server/logger.ts
import { NODE_ENV } from '$env/static/private';

// Simple console-based logger for better Vite compatibility
// Supports both pino-style (object, message) and simple (message, meta) signatures
type LogArgs = [message: string, meta?: unknown] | [meta: object, message: string];

interface Logger {
	info: (...args: LogArgs) => void;
	error: (...args: LogArgs) => void;
	warn: (...args: LogArgs) => void;
	debug: (...args: LogArgs) => void;
}

class ConsoleLogger implements Logger {
	private shouldLog(level: string): boolean {
		if (NODE_ENV === 'production') {
			return ['info', 'warn', 'error'].includes(level);
		}
		return true; // Log everything in development
	}

	private parseArgs(args: LogArgs): { message: string; meta?: unknown } {
		if (typeof args[0] === 'string') {
			return { message: args[0], meta: args[1] };
		}
		// Pino-style: (object, message)
		return { message: args[1] as string, meta: args[0] };
	}

	/**
	 * Convert Error objects (whose properties are non-enumerable) into plain
	 * objects so JSON.stringify includes message + stack + name. Recurses into
	 * meta objects so a `{err: new Error()}` payload is also expanded.
	 */
	private normalizeMeta(meta: unknown): unknown {
		if (meta instanceof Error) {
			return { name: meta.name, message: meta.message, stack: meta.stack };
		}
		if (meta && typeof meta === 'object') {
			const out: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
				out[k] = v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v;
			}
			return out;
		}
		return meta;
	}

	private formatMessage(level: string, message: string, meta?: unknown): string {
		const timestamp = new Date().toISOString();
		const normalized = meta !== undefined ? this.normalizeMeta(meta) : undefined;
		const metaStr = normalized ? ` ${JSON.stringify(normalized)}` : '';
		return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
	}

	info(...args: LogArgs): void {
		if (this.shouldLog('info')) {
			const { message, meta } = this.parseArgs(args);
			console.info(this.formatMessage('info', message, meta));
		}
	}

	error(...args: LogArgs): void {
		if (this.shouldLog('error')) {
			const { message, meta } = this.parseArgs(args);
			console.error(this.formatMessage('error', message, meta));
		}
	}

	warn(...args: LogArgs): void {
		if (this.shouldLog('warn')) {
			const { message, meta } = this.parseArgs(args);
			console.warn(this.formatMessage('warn', message, meta));
		}
	}

	debug(...args: LogArgs): void {
		if (this.shouldLog('debug')) {
			const { message, meta } = this.parseArgs(args);
			console.debug(this.formatMessage('debug', message, meta));
		}
	}
}

const logger = new ConsoleLogger();

export default logger;
