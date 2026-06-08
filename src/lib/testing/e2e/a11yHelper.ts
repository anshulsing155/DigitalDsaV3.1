import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export interface A11yOptions {
	excludeSelectors?: string[];
	wcagLevel?: 'wcag2a' | 'wcag2aa' | 'wcag2aaa';
}

export async function checkAccessibility(page: Page, options: A11yOptions = {}) {
	const { excludeSelectors = [], wcagLevel = 'wcag2aa' } = options;

	let builder = new AxeBuilder({ page }).withTags([wcagLevel, 'best-practice']);

	for (const selector of excludeSelectors) {
		builder = builder.exclude(selector);
	}

	const results = await builder.analyze();
	return results;
}

export function formatViolations(violations: any[]) {
	return violations.map((v) => ({
		id: v.id,
		impact: v.impact,
		description: v.description,
		nodes: v.nodes.length,
		help: v.helpUrl
	}));
}
