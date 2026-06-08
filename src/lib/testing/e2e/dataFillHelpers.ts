/**
 * Data-Driven Form Fill Helpers
 * ══════════════════════════════════════════════════════════════════
 * Orchestration utilities for E2E form filling driven by E2eFillConfig.
 * Used by dataFill.spec.ts when triggered by admin portal.
 *
 * ═══════════════════════════════════════════════════════════════
 * Aligned with REAL user progression:
 *   - Clears all form storage before starting (clean slate)
 *   - Handles resume modals on form pages
 *   - Progressive disclosure: waits for questions to appear, skips hidden ones
 *   - Re-attempts fills after answer-triggered reveals
 * ═══════════════════════════════════════════════════════════════
 */

import type { Page, APIRequestContext } from '@playwright/test';
import type {
	FillInstruction,
	E2eFillConfig,
	CustomPageFill
} from '$lib/server/testing/payloadToFillInstructions';
import {
	selectRadio,
	fillText,
	selectOption,
	fillCurrency,
	selectMultipleOptions,
	waitForQuestion,
	waitForPageReady,
	clickNext,
	navigateToLoanForm,
	clearFormStorage,
	dismissFormResumeModal
} from './formHelpers';
import { executeCustomFill } from './customPageFillers';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const FILL_DELAY_MS = 300;
const SCREENSHOT_DIR = 'test-results/playwright/screenshots';

/**
 * Fill a single page using the provided fill instructions.
 *
 * Handles progressive disclosure with 5 passes:
 *   Pass 1 (0ms):   Fill all currently visible questions
 *   Pass 2 (200ms): Retry — answers from Pass 1 may reveal new questions
 *   Pass 3 (400ms): Retry — handles A→B→C two-level dependency chains
 *   Pass 4 (600ms): Retry — handles deeper chains (A→B→C→D)
 *   Pass 5 (800ms): Final retry with longest wait for complex cascades
 *
 * Total extra cost vs 3-pass: < 2 seconds, but catches 4-5 level chains.
 */
export async function fillPageFromConfig(
	page: Page,
	fills: FillInstruction[]
): Promise<{ filled: string[]; skipped: string[] }> {
	const filled: string[] = [];
	let remaining = [...fills];

	// 5-pass progressive disclosure with escalating delays
	const PASS_DELAYS = [0, 200, 400, 600, 800];
	for (let pass = 0; pass < PASS_DELAYS.length; pass++) {
		if (remaining.length === 0) break;

		if (PASS_DELAYS[pass] > 0) {
			// Wait once per pass, not per question — faster overall
			await page.waitForTimeout(PASS_DELAYS[pass]);
		}

		const stillSkipped: FillInstruction[] = [];
		for (const fill of remaining) {
			const success = await tryFillQuestion(page, fill);
			if (success) {
				filled.push(fill.questionId);
			} else {
				stillSkipped.push(fill);
			}
		}
		remaining = stillSkipped;
	}

	// Log any questions that couldn't be filled after all passes
	if (remaining.length > 0) {
		console.warn(
			`[E2E] fillPageFromConfig: ${remaining.length} questions skipped after 5 passes:`,
			remaining.map((f) => `${f.questionId} (${f.type})`).join(', ')
		);
	}

	return { filled, skipped: remaining.map((f) => f.questionId) };
}

/**
 * Attempt to fill a single question. Returns true if successful.
 * Logs diagnostic info on failure so test output shows WHICH question failed.
 */
async function tryFillQuestion(page: Page, fill: FillInstruction): Promise<boolean> {
	try {
		// Wait for the question element to appear (visibility dependencies)
		await waitForQuestion(page, fill.questionId, 6000);
	} catch {
		// Question not visible — likely hidden by showWhen conditions (expected, not an error)
		return false;
	}

	await page.waitForTimeout(FILL_DELAY_MS);

	try {
		switch (fill.type) {
			case 'radio':
				await selectRadio(page, fill.questionId, String(fill.value));
				break;
			case 'text':
			case 'number':
				await fillText(page, fill.questionId, String(fill.value));
				break;
			case 'select':
				await selectOption(page, fill.questionId, String(fill.value));
				break;
			case 'currency':
				await fillCurrency(page, fill.questionId, String(fill.value));
				break;
			case 'multiple-select':
				if (Array.isArray(fill.value)) {
					await selectMultipleOptions(page, fill.questionId, fill.value);
				} else {
					await selectMultipleOptions(page, fill.questionId, [String(fill.value)]);
				}
				break;
			case 'date':
				await fillText(page, fill.questionId, String(fill.value));
				break;
		}

		// Location cascade: after selecting a state, wait for city dropdown to load
		// using state-based wait instead of fixed timeout
		if (fill.questionId.endsWith('StateName') || fill.questionId.includes('State')) {
			await waitForPageReady(page, 8000);
		}

		return true;
	} catch (err) {
		// Log with question context so test output shows exactly what failed
		console.warn(
			`[E2E] tryFillQuestion FAILED: ${fill.questionId} (${fill.type}=${JSON.stringify(fill.value)}): ${(err as Error).message}`
		);
		return false;
	}
}

/**
 * Report progress to the admin API.
 */
async function reportProgress(
	request: APIRequestContext,
	baseUrl: string,
	runId: string,
	update: Record<string, unknown>
): Promise<void> {
	try {
		await request.patch(`${baseUrl}/api/admin/testing/e2e-runs/${runId}`, {
			data: update
		});
	} catch {
		// Non-fatal: admin UI just won't see live updates
	}
}

/**
 * Take a screenshot and save to the run's directory.
 */
async function takeScreenshot(page: Page, runId: string, pageId: string): Promise<string> {
	const dir = join(SCREENSHOT_DIR, runId);
	await mkdir(dir, { recursive: true });
	const filePath = join(dir, `${pageId}.png`);
	await page.screenshot({ path: filePath, fullPage: true });
	return filePath;
}

/**
 * Full orchestration: fetch config, navigate, fill each page, screenshot, report.
 *
 * Mirrors the real user journey:
 *   1. Clear all form storage → user arrives with clean slate
 *   2. Navigate to how-can-we-help → handle resume modal if present
 *   3. Select loan type via progressive disclosure flow
 *   4. Fill each form page → handle showWhen-dependent progressive reveals
 *   5. Screenshot after each page
 *   6. Navigate to next page
 */
export async function runDataDrivenFill(
	page: Page,
	request: APIRequestContext,
	runId: string,
	baseUrl: string
): Promise<void> {
	// 1. Fetch fill config
	const configResponse = await request.get(`${baseUrl}/api/test/e2e-run-config?runId=${runId}`);
	const configBody = await configResponse.json();

	if (!configBody.success || !configBody.data) {
		throw new Error(`Failed to fetch fill config: ${configBody.error || 'Unknown error'}`);
	}

	const config: E2eFillConfig = configBody.data;

	// Build a lookup for custom page fills
	const customPageMap = new Map<string, CustomPageFill>();
	for (const cp of config.customPages ?? []) {
		customPageMap.set(cp.pageId, cp);
	}

	// 2. Clear form storage for a clean start
	// Must navigate to a page first so we have a browser context
	await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
	await clearFormStorage(page);

	// 3. Report running status
	await reportProgress(request, baseUrl, runId, {
		status: 'page_filling',
		total_pages: config.pages.length
	});

	// 4. Navigate to the loan form via how-can-we-help
	const loanUrlMap: Record<string, string> = {
		'Home Loan': '/form/home-loan',
		'Loan Against Property': '/form/lap',
		LAP: '/form/lap',
		'Plot Loan': '/form/plot-loan',
		'Plot and Construction Loan': '/form/plot-loan',
		'Personal Loan': '/form/personal-loan',
		'Business Loan': '/form/business-loan',
		'Professional Loan': '/form/professional-loan'
	};

	const expectedUrl = loanUrlMap[config.loanName] || '/form/home-loan';
	// Pass the scope (config.loanType) as q4_loanType for fixture-driven navigation.
	// q4_loanType is the canonical scope question on the how-can-we-help page.
	const navFormPath = config.loanType ? { q4_loanType: config.loanType } : undefined;
	await navigateToLoanForm(page, config.loanName, expectedUrl, config.loanType, navFormPath);

	// Log unmapped keys for diagnostic
	if (config.unmappedKeys?.length) {
		await reportProgress(request, baseUrl, runId, {
			unmapped_keys: config.unmappedKeys
		});
	}

	// 5. Fill each page
	for (let i = 0; i < config.pages.length; i++) {
		const pageConfig = config.pages[i];

		// Report current page
		await reportProgress(request, baseUrl, runId, {
			status: 'page_filling',
			current_page: i,
			current_page_id: pageConfig.pageId,
			fill_count: pageConfig.fills.length
		});

		// Handle any resume modal on this page (defensive)
		await dismissFormResumeModal(page);

		// Fill schema questions with 3-pass progressive disclosure
		const { filled, skipped } = await fillPageFromConfig(page, pageConfig.fills);

		// Execute custom page fill if this page has a custom strategy
		const customFill = customPageMap.get(pageConfig.pageId);
		if (customFill) {
			try {
				await executeCustomFill(page, customFill);
			} catch (err) {
				// Non-fatal: custom fills are best-effort
				await reportProgress(request, baseUrl, runId, {
					error: `Custom fill failed for ${pageConfig.pageId}: ${err instanceof Error ? err.message : String(err)}`
				});
			}
		}

		// Report fill progress with diagnostic detail
		await reportProgress(request, baseUrl, runId, {
			status: 'page_filling',
			current_page: i,
			current_page_id: pageConfig.pageId,
			fill_stats: {
				filled: filled.length,
				skipped: skipped.length,
				skipped_questions: skipped,
				attempted_questions: pageConfig.fills.map((f) => f.questionId)
			}
		});

		// Screenshot after filling
		const screenshotPath = await takeScreenshot(page, runId, pageConfig.pageId);

		// Report screenshot
		await reportProgress(request, baseUrl, runId, {
			screenshots: [
				{
					page_id: pageConfig.pageId,
					path: screenshotPath,
					timestamp: new Date().toISOString()
				}
			]
		});

		// Navigate to next page (skip for last page)
		if (i < config.pages.length - 1) {
			try {
				await clickNext(page);
				// clickNext already calls waitForPageReady() internally
			} catch (err) {
				// Next button might not be available — report and continue
				const filledStr = filled.join(', ') || 'none';
				const skippedStr = skipped.map((f) => f).join(', ') || 'none';
				await reportProgress(request, baseUrl, runId, {
					status: 'page_filling',
					error: `Next blocked on page ${pageConfig.pageId} (${i + 1}/${config.pages.length}). Filled: [${filledStr}]. Skipped: [${skippedStr}]. ${err instanceof Error ? err.message : String(err)}`
				});
				// Try to take an error screenshot
				try {
					await takeScreenshot(page, runId, `${pageConfig.pageId}_error`);
				} catch {
					/* non-fatal */
				}
				throw err;
			}
		}
	}

	// 6. Report completion
	await reportProgress(request, baseUrl, runId, {
		status: 'completed'
	});
}
