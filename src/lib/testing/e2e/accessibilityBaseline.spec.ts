/**
 * Accessibility Baseline & Diff
 * ══════════════════════════════════════════════════════════════════
 * Captures accessibility tree snapshots for key form pages.
 * On first run: saves baselines. On subsequent runs: diffs against
 * baselines and generates a change report.
 *
 * Run: pnpm exec playwright test accessibilityBaseline.spec.ts --project=selector-health
 * ══════════════════════════════════════════════════════════════════
 */

import { test } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { dismissResumeModal, dismissFormResumeModal } from './formHelpers';
import {
	diffSnapshots,
	buildFullDiffReport,
	formatDiffReport,
	type AccessibilityNode,
	type PageDiffReport
} from './accessibilityDiff';

const BASE_URL = 'http://localhost:5173';
const BASELINE_DIR = 'test-results/accessibility/baselines';
const REPORT_PATH = 'test-results/accessibility/diff-report.json';
const REPORT_TEXT_PATH = 'test-results/accessibility/diff-report.txt';

/**
 * Pages to snapshot. Each entry is a navigation step.
 * For pages behind progressive disclosure, we provide setup steps.
 */
const SNAPSHOT_PAGES = [
	{
		id: 'how-can-we-help',
		url: '/form/how-can-we-help',
		setup: async (page: import('@playwright/test').Page) => {
			await dismissResumeModal(page);
		}
	},
	{
		id: 'home-loan-page0',
		url: '/form/home-loan',
		setup: async (page: import('@playwright/test').Page) => {
			await dismissFormResumeModal(page);
		}
	}
];

/**
 * Capture a DOM structure snapshot as an accessibility-like tree.
 * Uses page.evaluate to extract roles, labels, and structure from the DOM
 * since page.accessibility.snapshot() is deprecated in newer Playwright.
 */
async function captureSnapshot(
	page: import('@playwright/test').Page
): Promise<AccessibilityNode | null> {
	const snapshot = await page.evaluate(() => {
		function extractNode(el: Element): {
			role: string;
			name: string;
			value?: string;
			children?: ReturnType<typeof extractNode>[];
		} | null {
			const role = el.getAttribute('role') || el.tagName.toLowerCase();
			const SKIP_TAGS = new Set(['script', 'style', 'link', 'meta', 'noscript']);
			if (SKIP_TAGS.has(el.tagName.toLowerCase())) return null;

			const name =
				el.getAttribute('aria-label') ||
				el.getAttribute('aria-labelledby') ||
				(el as HTMLInputElement).name ||
				el.getAttribute('data-question-id') ||
				el.id ||
				el.textContent?.trim().substring(0, 60) ||
				'';

			const value = (el as HTMLInputElement).value || el.getAttribute('aria-valuenow') || undefined;

			const children: ReturnType<typeof extractNode>[] = [];
			const INTERACTIVE = new Set(['input', 'button', 'select', 'textarea', 'a', 'label']);
			const HAS_ROLE = (e: Element) =>
				e.hasAttribute('role') ||
				e.hasAttribute('aria-label') ||
				e.hasAttribute('data-question-id') ||
				INTERACTIVE.has(e.tagName.toLowerCase());

			for (const child of el.children) {
				if (HAS_ROLE(child)) {
					const node = extractNode(child);
					if (node) children.push(node);
				} else {
					// Recurse into non-interactive containers to find interactive children
					for (const grandchild of child.children) {
						const node = extractNode(grandchild);
						if (node) children.push(node);
					}
				}
			}

			// Only include nodes that are interactive or have interactive children
			if (children.length === 0 && !HAS_ROLE(el)) return null;

			return {
				role,
				name: name.replace(/\s+/g, ' ').trim(),
				...(value ? { value } : {}),
				...(children.length > 0 ? { children } : {})
			};
		}

		const main = document.querySelector('main') || document.body;
		return extractNode(main);
	});

	return snapshot as AccessibilityNode | null;
}

/**
 * Load a baseline snapshot from disk if it exists.
 */
async function loadBaseline(pageId: string): Promise<AccessibilityNode | null> {
	const filePath = join(BASELINE_DIR, `${pageId}.json`);
	if (!existsSync(filePath)) return null;
	try {
		const content = await readFile(filePath, 'utf-8');
		return JSON.parse(content);
	} catch {
		return null;
	}
}

/**
 * Save a snapshot as the new baseline.
 */
async function saveBaseline(pageId: string, snapshot: AccessibilityNode): Promise<void> {
	await mkdir(BASELINE_DIR, { recursive: true });
	const filePath = join(BASELINE_DIR, `${pageId}.json`);
	await writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

// ============================================================================
// Test
// ============================================================================

test.describe('Accessibility Baseline & Diff', () => {
	test.describe.configure({ timeout: 120_000 });

	test('capture snapshots and diff against baselines', async ({ page }) => {
		const pageDiffs: PageDiffReport[] = [];
		let newBaselinesCreated = 0;

		for (const target of SNAPSHOT_PAGES) {
			// Navigate to the page
			await page.goto(`${BASE_URL}${target.url}`);
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(1000);

			// Run page-specific setup
			if (target.setup) {
				await target.setup(page);
				await page.waitForTimeout(500);
			}

			// Capture current snapshot
			const current = await captureSnapshot(page);
			if (!current) {
				console.log(`[${target.id}] Could not capture snapshot — skipping`);
				continue;
			}

			// Load existing baseline
			const baseline = await loadBaseline(target.id);

			if (!baseline) {
				// First run: save as baseline
				await saveBaseline(target.id, current);
				newBaselinesCreated++;
				console.log(`[${target.id}] Baseline created (first run)`);
				pageDiffs.push(diffSnapshots(target.id, null, current));
			} else {
				// Subsequent run: diff against baseline
				const diff = diffSnapshots(target.id, baseline, current);
				pageDiffs.push(diff);

				const changes = diff.added.length + diff.removed.length + diff.changed.length;
				if (changes > 0) {
					console.log(
						`[${target.id}] ${changes} changes detected: +${diff.added.length} -${diff.removed.length} ~${diff.changed.length}`
					);
				} else {
					console.log(`[${target.id}] No changes (${diff.unchanged} nodes match)`);
				}

				// Update baseline with current snapshot (rolling baseline)
				await saveBaseline(target.id, current);
			}
		}

		// Build and save full report
		const report = buildFullDiffReport(pageDiffs);
		await mkdir(join(REPORT_PATH, '..'), { recursive: true });
		await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');

		// Save human-readable text report
		const textReport = formatDiffReport(report);
		await writeFile(REPORT_TEXT_PATH, textReport, 'utf-8');

		console.log('\n' + textReport);

		if (newBaselinesCreated > 0) {
			console.log(`\n${newBaselinesCreated} new baselines created. Run again to diff.`);
		}
	});
});
