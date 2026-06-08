import { test, expect } from '@playwright/test';

test.describe('Performance — Core Web Vitals', () => {
	test('login page loads within performance budget', async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('load');

		const timing = await page.evaluate(() => {
			const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			const paint = performance.getEntriesByType('paint');
			const fcp = paint.find((p) => p.name === 'first-contentful-paint');
			return {
				ttfb: nav.responseStart - nav.requestStart,
				domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
				load: nav.loadEventEnd - nav.fetchStart,
				fcp: fcp?.startTime ?? null
			};
		});

		expect(timing.ttfb).toBeLessThan(800);
		expect(timing.domContentLoaded).toBeLessThan(3000);
		if (timing.fcp !== null) {
			expect(timing.fcp).toBeLessThan(1800);
		}
	});

	test('dashboard loads within performance budget', async ({ page }) => {
		await page.goto('/dashboard/dsa');
		await page.waitForLoadState('load');

		const timing = await page.evaluate(() => {
			const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			return {
				ttfb: nav.responseStart - nav.requestStart,
				domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
				load: nav.loadEventEnd - nav.fetchStart
			};
		});

		expect(timing.ttfb).toBeLessThan(1000);
		expect(timing.domContentLoaded).toBeLessThan(5000);
	});

	test('home loan form loads within performance budget', async ({ page }) => {
		await page.goto('/form/home-loan');
		await page.waitForLoadState('load');

		const timing = await page.evaluate(() => {
			const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			return {
				ttfb: nav.responseStart - nav.requestStart,
				load: nav.loadEventEnd - nav.fetchStart
			};
		});

		expect(timing.ttfb).toBeLessThan(1000);
		expect(timing.load).toBeLessThan(5000);
	});
});
