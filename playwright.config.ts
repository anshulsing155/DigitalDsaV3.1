import { defineConfig, devices } from '@playwright/test';

const AUTH_DIR = 'test-results/playwright/.auth';

export default defineConfig({
	testDir: 'src/lib/testing/e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 60_000,

	/* Separate output folder for Playwright artifacts (screenshots, videos, traces) */
	outputDir: 'playwright-output',

	reporter: [
		['html', { outputFolder: 'test-results/playwright/html-report', open: 'never' }],
		['json', { outputFile: 'test-results/playwright/results.json' }],
		['list']
	],

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		actionTimeout: 10_000,
		navigationTimeout: 30_000
	},

	projects: [
		/* Setup project — authenticates all three roles */
		{
			name: 'setup',
			testMatch: 'global.setup.ts',
			use: { ...devices['Desktop Chrome'] }
		},

		/* DSA tests — all specs EXCEPT *-rm.spec.ts and *-admin.spec.ts */
		{
			name: 'dsa',
			testMatch: /^(?!.*-(rm|admin)\.spec\.ts$).*\.spec\.ts$/,
			use: {
				...devices['Desktop Chrome'],
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* RM tests — only *-rm.spec.ts files */
		{
			name: 'rm',
			testMatch: '*-rm.spec.ts',
			use: {
				...devices['Desktop Chrome'],
				storageState: `${AUTH_DIR}/rm.json`
			},
			dependencies: ['setup']
		},

		/* Admin tests — only *-admin.spec.ts files */
		{
			name: 'admin',
			testMatch: '*-admin.spec.ts',
			use: {
				...devices['Desktop Chrome'],
				storageState: `${AUTH_DIR}/admin.json`
			},
			dependencies: ['setup']
		},

		/* Cross-browser: Firefox */
		{
			name: 'dsa-firefox',
			testMatch: /^(?!.*-(rm|admin)\.spec\.ts$).*\.spec\.ts$/,
			use: {
				...devices['Desktop Firefox'],
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* Cross-browser: WebKit (Safari) */
		{
			name: 'dsa-webkit',
			testMatch: /^(?!.*-(rm|admin)\.spec\.ts$).*\.spec\.ts$/,
			use: {
				...devices['Desktop Safari'],
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* Cross-browser: Edge */
		{
			name: 'dsa-edge',
			testMatch: /^(?!.*-(rm|admin)\.spec\.ts$).*\.spec\.ts$/,
			use: {
				...devices['Desktop Edge'],
				channel: 'msedge',
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* Mobile viewport: iPhone 14 */
		{
			name: 'mobile',
			testMatch: /(?:dashboard-mobile\.spec\.ts|.*-happyPath\.spec\.ts)$/,
			use: {
				...devices['iPhone 14'],
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* Tablet viewport: iPad (gen 7) */
		{
			name: 'tablet',
			testMatch: /(?:dashboard-mobile\.spec\.ts|.*-happyPath\.spec\.ts)$/,
			use: {
				...devices['iPad (gen 7)'],
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* UI Health: Selector health check + Accessibility baseline diff */
		{
			name: 'selector-health',
			testMatch: /(?:selectorHealth|accessibilityBaseline)\.spec\.ts$/,
			use: {
				...devices['Desktop Chrome'],
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* Stage 1: Applicant setup for secured loans (saves storageState) */
		{
			name: 'applicant-setup-secured',
			testMatch: 'applicant-secured.setup.ts',
			use: {
				...devices['Desktop Chrome'],
				storageState: `${AUTH_DIR}/dsa.json`
			},
			dependencies: ['setup']
		},

		/* Stage 2: Full path test — loads Stage 1 storageState, fills remaining pages */
		{
			name: 'full-path-secured',
			testMatch: 'fullPath-homeLoan.spec.ts',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'test-results/playwright/.applicant-state/home-loan-salaried.json'
			},
			dependencies: ['applicant-setup-secured']
		}
	],

	webServer: {
		command: 'pnpm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
