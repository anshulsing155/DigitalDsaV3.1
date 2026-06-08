/**
 * hooks.server.ts boot-observability lock
 * ══════════════════════════════════════════════════════════════════
 * Guards the BOOT checkpoints + process error handlers added after
 * the 2026-06-04 SSR canvas/jsdom prod-down incident. The chunk-init
 * error class bypasses SvelteKit's `handleError` because the hook
 * isn't installed yet when the throw fires; without these markers
 * Vercel function logs were empty for a 3-hour production outage.
 *
 * Static-source lock — assertions are intentionally cheap and
 * regex-based. A behavioral test would need a process-level boot
 * harness that doesn't pay for itself.
 *
 * Reference: ADR-0031, Pitfall #74, S223 incident.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hooksPath = resolve(process.cwd(), 'src/hooks.server.ts');
const src = readFileSync(hooksPath, 'utf8');

describe('hooks.server.ts retains its boot-observability surface', () => {
	it('emits [BOOT-1] before any other module-level side effect', () => {
		const boot1Idx = src.indexOf("console.error('[BOOT-1]");
		const startTelemetryIdx = src.indexOf('void startTelemetry()');
		expect(boot1Idx).toBeGreaterThan(-1);
		expect(startTelemetryIdx).toBeGreaterThan(-1);
		expect(boot1Idx).toBeLessThan(startTelemetryIdx);
	});

	it('emits [BOOT-2] after module-level init completes', () => {
		expect(src).toContain("console.error('[BOOT-2]");
		// BOOT-2 must come AFTER startTelemetry — otherwise it logs before
		// the only init step it's meant to certify completed.
		const boot2Idx = src.indexOf("console.error('[BOOT-2]");
		const startTelemetryIdx = src.indexOf('void startTelemetry()');
		expect(boot2Idx).toBeGreaterThan(startTelemetryIdx);
	});

	it('installs a process.on uncaughtException handler that logs to stderr', () => {
		// Match the real handler invocation (with callback) — not the comment
		// that references the same string. Must use console.error (not logger)
		// so it works even when Pino's own init fails. Same for unhandledRejection.
		const handlerMatch = src.match(
			/process\.on\(\s*['"]uncaughtException['"][\s\S]{0,400}?console\.error/
		);
		expect(handlerMatch).not.toBeNull();
	});

	it('installs a process.on unhandledRejection handler that logs to stderr', () => {
		const handlerMatch = src.match(
			/process\.on\(\s*['"]unhandledRejection['"][\s\S]{0,400}?console\.error/
		);
		expect(handlerMatch).not.toBeNull();
	});
});
