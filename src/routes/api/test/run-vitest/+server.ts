import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { blockDemoWrite } from '$lib/server/guards.js';
import { apiError, parseJsonBody } from '$lib/server/apiResponse.js';

const execAsync = promisify(exec);

// SEC-8: allowlist for test-runner pattern input.
// The pattern is interpolated into a shell command via exec() — any
// character outside this set (backticks, $(), &&, ;, spaces, quotes)
// could enable command injection. Conservative set covers realistic
// vitest path/file patterns (src/lib/foo.test.ts, subdir/bar.spec.ts).
const TEST_PATTERN_ALLOWLIST = /^[\w\-./]+$/;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!dev) throw error(404, 'Not found');

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const parsed = await parseJsonBody<{ pattern?: string }>(request);
	const body = parsed.ok ? parsed.data : {};
	const pattern = body.pattern ?? '';

	if (pattern && !TEST_PATTERN_ALLOWLIST.test(pattern)) {
		return apiError('Invalid test pattern', 400);
	}

	const cmd = pattern
		? `npx vitest run --reporter=json "${pattern}"`
		: 'npx vitest run --reporter=json';

	try {
		const { stdout, stderr } = await execAsync(cmd, {
			cwd: process.cwd(),
			timeout: 120_000,
			maxBuffer: 5 * 1024 * 1024
		});

		// vitest --reporter=json outputs JSON to stdout
		let parsed: unknown = null;
		try {
			// vitest may output non-JSON before the actual JSON, find the JSON part
			const jsonStart = stdout.indexOf('{');
			if (jsonStart !== -1) {
				parsed = JSON.parse(stdout.slice(jsonStart));
			}
		} catch {
			// Couldn't parse - return raw output
		}

		return json({
			success: true,
			parsed,
			stdout: parsed ? undefined : stdout,
			stderr: stderr || undefined
		});
	} catch (err: unknown) {
		const execErr = err as { stdout?: string; stderr?: string; code?: number; message?: string };

		// vitest exits with code 1 if tests fail — still return JSON
		let parsed: unknown = null;
		if (execErr.stdout) {
			try {
				const jsonStart = execErr.stdout.indexOf('{');
				if (jsonStart !== -1) {
					parsed = JSON.parse(execErr.stdout.slice(jsonStart));
				}
			} catch {
				// ignore
			}
		}

		return json({
			success: false,
			exitCode: execErr.code ?? 1,
			parsed,
			stdout: parsed ? undefined : execErr.stdout,
			stderr: execErr.stderr || execErr.message || 'Unknown error'
		});
	}
};
