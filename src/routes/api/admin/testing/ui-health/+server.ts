/**
 * GET /api/admin/testing/ui-health
 * ══════════════════════════════════════════════════════════════════
 * Returns the latest UI health check results:
 * - Selector health (broken selectors from selectorHealth.spec.ts)
 * - Accessibility diff (structural changes from accessibilityBaseline.spec.ts)
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk } from '$lib/server/apiResponse.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const PLAYWRIGHT_RESULTS = 'test-results/playwright/results.json';
const A11Y_DIFF_REPORT = 'test-results/accessibility/diff-report.json';
const A11Y_TEXT_REPORT = 'test-results/accessibility/diff-report.txt';

export const GET: RequestHandler = async ({ locals }) => {
	if (!dev) throw error(404, 'Not found');

	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const report: Record<string, unknown> = {
		generatedAt: new Date().toISOString()
	};

	// Load Playwright test results (includes selector health)
	if (existsSync(PLAYWRIGHT_RESULTS)) {
		try {
			const raw = await readFile(PLAYWRIGHT_RESULTS, 'utf-8');
			const results = JSON.parse(raw);
			// Extract selector health test results
			const selectorTests = (results.testResults ?? []).filter(
				(t: Record<string, unknown>) =>
					String(t.name ?? '').includes('selectorHealth') ||
					String(t.file ?? '').includes('selectorHealth')
			);
			report.selectorHealth = {
				available: true,
				tests: selectorTests.length,
				lastRun: results.startTime || null
			};
		} catch {
			report.selectorHealth = { available: false, error: 'Could not parse results' };
		}
	} else {
		report.selectorHealth = {
			available: false,
			error:
				'No test results found. Run: pnpm exec playwright test selectorHealth.spec.ts --project=selector-health'
		};
	}

	// Load accessibility diff report
	if (existsSync(A11Y_DIFF_REPORT)) {
		try {
			const raw = await readFile(A11Y_DIFF_REPORT, 'utf-8');
			report.accessibilityDiff = JSON.parse(raw);
		} catch {
			report.accessibilityDiff = { available: false, error: 'Could not parse diff report' };
		}
	} else {
		report.accessibilityDiff = {
			available: false,
			error:
				'No baseline found. Run: pnpm exec playwright test accessibilityBaseline.spec.ts --project=selector-health'
		};
	}

	// Load human-readable text report
	if (existsSync(A11Y_TEXT_REPORT)) {
		try {
			report.accessibilityDiffText = await readFile(A11Y_TEXT_REPORT, 'utf-8');
		} catch {
			/* non-fatal */
		}
	}

	return apiOk(report);
};
