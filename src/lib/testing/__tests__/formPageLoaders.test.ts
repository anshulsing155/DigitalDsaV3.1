/**
 * Loader smoke tests — exercises the exact code path of
 *   /form/home-loan/+page.server.ts
 *   /form/lap/+page.server.ts
 *   /form/plot-loan/+page.server.ts
 *
 * Reproduces (or proves cleared) the S102 carry-forward bug:
 * "Form page /form/home-loan returns 500 when loaded directly — only the
 * page server load fails; /api/form/evaluate works."
 *
 * If this test fails, the loader has a real bug. If it passes for all 3
 * secured loans, the original 500 has been resolved by intervening commits.
 */

import { describe, it, expect } from 'vitest';
import { createFormEngine } from '$lib/server/formEngine/engine';
import { getEngineOptions } from '$lib/server/formEngine/engineContext';

describe('Form page-server loaders — page 0 evaluation with empty answers', () => {
	it('Home Loan loader does not throw', async () => {
		const engine = createFormEngine('Home Loan');
		const options = getEngineOptions();
		const initialPage = await engine.evaluatePage(0, {}, options);
		expect(initialPage).toBeDefined();
		expect(initialPage.questions).toBeInstanceOf(Array);
		expect(typeof initialPage.totalVisiblePages).toBe('number');
		expect(initialPage.totalVisiblePages).toBeGreaterThan(0);
	});

	it('LAP loader does not throw', async () => {
		const engine = createFormEngine('Loan Against Property');
		const options = getEngineOptions();
		const initialPage = await engine.evaluatePage(0, {}, options);
		expect(initialPage).toBeDefined();
		expect(initialPage.questions).toBeInstanceOf(Array);
		expect(initialPage.totalVisiblePages).toBeGreaterThan(0);
	});

	it('Plot Loan loader does not throw', async () => {
		const engine = createFormEngine('Plot Loan');
		const options = getEngineOptions();
		const initialPage = await engine.evaluatePage(0, {}, options);
		expect(initialPage).toBeDefined();
		expect(initialPage.questions).toBeInstanceOf(Array);
		expect(initialPage.totalVisiblePages).toBeGreaterThan(0);
	});

	it('Personal Loan loader does not throw', async () => {
		const engine = createFormEngine('Personal Loan');
		const options = getEngineOptions();
		const initialPage = await engine.evaluatePage(0, {}, options);
		expect(initialPage).toBeDefined();
		expect(initialPage.questions).toBeInstanceOf(Array);
		expect(initialPage.totalVisiblePages).toBeGreaterThan(0);
	});

	it('Business Loan loader does not throw', async () => {
		const engine = createFormEngine('Business Loan');
		const options = getEngineOptions();
		const initialPage = await engine.evaluatePage(0, {}, options);
		expect(initialPage).toBeDefined();
		expect(initialPage.questions).toBeInstanceOf(Array);
		expect(initialPage.totalVisiblePages).toBeGreaterThan(0);
	});

	it('Professional Loan loader does not throw', async () => {
		const engine = createFormEngine('Professional Loan');
		const options = getEngineOptions();
		const initialPage = await engine.evaluatePage(0, {}, options);
		expect(initialPage).toBeDefined();
		expect(initialPage.questions).toBeInstanceOf(Array);
		expect(initialPage.totalVisiblePages).toBeGreaterThan(0);
	});
});
