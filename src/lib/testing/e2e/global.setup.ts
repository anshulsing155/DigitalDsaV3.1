/**
 * Playwright Setup Project — Multi-Role E2E Authentication
 *
 * Runs once before all test projects. Authenticates three test users
 * (DSA, RM, Admin) via the dev-only /api/test/e2e-auth endpoint and
 * saves separate browser storage states so each project reuses its role.
 */
import { test as setup, expect } from '@playwright/test';

const AUTH_DIR = 'test-results/playwright/.auth';

setup('authenticate DSA user', async ({ request }) => {
	const res = await request.post('/api/test/e2e-auth', {
		data: { role: 'dsa' }
	});
	expect(res.ok()).toBeTruthy();

	const body = await res.json();
	console.log(`[setup] DSA authenticated: ${body.user.name} (${body.user.mobileNumber})`);

	await request.storageState({ path: `${AUTH_DIR}/dsa.json` });
});

setup('authenticate RM user', async ({ request }) => {
	const res = await request.post('/api/test/e2e-auth', {
		data: { role: 'rm' }
	});
	expect(res.ok()).toBeTruthy();

	const body = await res.json();
	console.log(`[setup] RM authenticated: ${body.user.name} (${body.user.mobileNumber})`);

	await request.storageState({ path: `${AUTH_DIR}/rm.json` });
});

setup('authenticate Admin user', async ({ request }) => {
	const res = await request.post('/api/test/e2e-auth', {
		data: { role: 'admin' }
	});
	expect(res.ok()).toBeTruthy();

	const body = await res.json();
	console.log(`[setup] Admin authenticated: ${body.user.name} (${body.user.mobileNumber})`);

	await request.storageState({ path: `${AUTH_DIR}/admin.json` });
});
