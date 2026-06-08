import { test, expect } from '@playwright/test';
import { checkAccessibility, formatViolations } from './a11yHelper';

test.describe('Accessibility — WCAG 2.1 AA', () => {
	test('login page has no accessibility violations', async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');
		const results = await checkAccessibility(page);
		const summary = formatViolations(results.violations)
			.map((v) => `${v.impact}: ${v.description}`)
			.join('\n');
		expect(results.violations.length, summary).toBe(0);
	});

	test('dashboard has no critical accessibility violations', async ({ page }) => {
		await page.goto('/dashboard/dsa');
		await page.waitForLoadState('networkidle');
		const results = await checkAccessibility(page, {
			excludeSelectors: ['.third-party-widget']
		});
		const critical = results.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);
		const summary = formatViolations(critical)
			.map((v) => `${v.impact}: ${v.description}`)
			.join('\n');
		expect(critical.length, summary).toBe(0);
	});

	const loanForms = [
		{ name: 'Home Loan', url: '/form/home-loan' },
		{ name: 'LAP', url: '/form/lap' },
		{ name: 'Plot Loan', url: '/form/plot-loan' },
		{ name: 'Personal Loan', url: '/form/unsecure-loan/personal-loan' },
		{ name: 'Business Loan', url: '/form/unsecure-loan/business-loan' },
		{ name: 'Professional Loan', url: '/form/unsecure-loan/professional-loan' }
	];

	for (const loan of loanForms) {
		test(`${loan.name} form has no critical accessibility violations`, async ({ page }) => {
			await page.goto(loan.url);
			await page.waitForLoadState('networkidle');
			const results = await checkAccessibility(page, {
				excludeSelectors: ['.third-party-widget', '[data-testid="msg91"]']
			});
			const critical = results.violations.filter(
				(v) => v.impact === 'critical' || v.impact === 'serious'
			);
			const summary = formatViolations(critical)
				.map((v) => `${v.impact}: ${v.description}`)
				.join('\n');
			expect(critical.length, summary).toBe(0);
		});
	}
});
