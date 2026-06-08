/**
 * Data-Driven Form Fill — E2E Spec
 * ══════════════════════════════════════════════════════════════════
 * Triggered by admin portal via E2E_RUN_ID env var.
 * Fills the loan application form using a fixture/synthetic profile
 * payload, reporting progress and screenshots to the admin API.
 *
 * Named dataFill.spec.ts (not *-admin.spec.ts) so it matches the
 * DSA playwright project — form filling runs as a DSA user.
 * ══════════════════════════════════════════════════════════════════
 */

import { test } from '@playwright/test';
import { runDataDrivenFill } from './dataFillHelpers';

const runId = process.env.E2E_RUN_ID;
const baseURL = 'http://localhost:5173';

test('data-driven form fill', async ({ page, request }) => {
	test.skip(!runId, 'No E2E_RUN_ID — skipping data-driven fill');

	test.setTimeout(180_000); // 3 minutes for full form fill

	await runDataDrivenFill(page, request, runId!, baseURL);
});
