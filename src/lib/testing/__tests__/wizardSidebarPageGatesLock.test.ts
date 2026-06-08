/**
 * Wizard Sidebar → Page Gates — structural pairing lock (D13).
 *
 * Spec: docs/specs/_archive/TECH-DEBT-CLEANUP-2026-05-31.md §3 D13 / §5 Session 4 (shipped + archived S215).
 *
 * What this guards
 * ────────────────
 * The wizard renders TWO views of every form: a sidebar (driven by
 * `WizardSectionConfig` in `src/lib/config/wizardSections/{loan}.ts`) and the
 * actual form pages (`getAllPages()` in `src/lib/config/{loan}/pages.ts`).
 *
 * A `WizardSubsection` declares `pageIds: string[]` pointing at one or more
 * pages, plus optional `showWhen` that gates the sidebar chip. A `RawSchemaPage`
 * carries its own optional `showWhen` (JSON-Logic) that gates whether the page
 * actually mounts.
 *
 * If a page can be hidden (page-level `showWhen` exists) but neither the
 * subsection chip NOR its parent section has any gate, the sidebar shows a
 * dead chip — clicking it would jump to a page that immediately hides itself.
 * That's the bug class D13 catches.
 *
 * Rules locked here
 * ─────────────────
 *  R1 (referential integrity) — every `pageIds[]` entry MUST resolve to a real
 *  page in the loan's `getAllPages()` output. A typo breaks navigation
 *  silently.
 *
 *  R2 (sidebar/page gate pairing) — for every (subsection, pageId) pair where
 *  the looked-up page has a `showWhen`, the subsection OR its parent section
 *  MUST also carry a `showWhen`. We can't prove semantic equivalence between
 *  the TS predicate (sidebar) and the JSON-Logic gate (page) — but we lock
 *  the structural pairing: the sidebar acknowledges the page can hide.
 *
 * Allowlist
 * ─────────
 * Some shared component pages (applicant pages used across all loans) carry
 * very-broad gates like `__applicantCount === 1` that the sidebar mirrors
 * differently (a separate subsection shows for multi-applicant flows). When
 * both flavors of subsection exist and exactly one matches the page-mount
 * scenario at runtime, locking the sidebar showWhen at each call-site would
 * be redundant noise. Such pairs are recorded in {@link KNOWN_GATE_PAIRINGS}
 * with a one-line justification + sunset trigger per CLAUDE.md §16 Rule #15.
 *
 * If this test fails
 * ──────────────────
 *  - "Unknown pageId" → fix the typo in `wizardSections/{loan}.ts` or rename
 *    the page in `{loan}/pages.ts` to match.
 *  - "Ungated subsection chip → gated page" → add the `showWhen` to the
 *    subsection that mirrors the page's gate, OR add an entry to the allowlist
 *    with a one-line reason + sunset trigger.
 */

import { describe, it, expect } from 'vitest';
import {
	homeLoanSections,
	businessLoanSections,
	lapLoanSections,
	plotLoanSections,
	personalLoanSections,
	professionalLoanSections
} from '$lib/config/wizardSections';
import { getAllPages as getHomeLoanPages } from '$lib/config/homeLoan/pages';
import { getAllPages as getBusinessLoanPages } from '$lib/config/businessLoan/pages';
import { getAllPages as getLapLoanPages } from '$lib/config/lapLoan/pages';
import { getAllPages as getPlotLoanPages } from '$lib/config/plotLoan/pages';
import { getAllPages as getPersonalLoanPages } from '$lib/config/personalLoan/pages';
import { getAllPages as getProfessionalLoanPages } from '$lib/config/professionalLoan/pages';
import type { WizardSectionConfig } from '$lib/types/wizard';

/**
 * Allowlist: known (loanName, subsectionId, pageId) triples where the page has
 * a `showWhen` but neither the subsection nor its parent section need one.
 *
 * Format: `${loanName}::${subsectionId}::${pageId}` keyed to a one-line reason.
 *
 * Add an entry here ONLY when the runtime guarantees the subsection chip is
 * mutually-exclusive with a sibling subsection that covers the alternate
 * branch (so the user always sees one chip and the chosen chip's page mounts).
 * Otherwise, add the missing `showWhen` to the subsection.
 *
 * Sunset (all entries): when sidebar generation is unified through a single
 * source-of-truth (e.g., a derive-sidebar-from-pages helper), this allowlist
 * becomes unnecessary and can be deleted alongside the migration.
 */
const KNOWN_GATE_PAIRINGS: Record<string, string> = {
	// Entries are added on demand. Empty by default — every entry should
	// reference a concrete runtime guarantee.
};

interface LoanFixture {
	loanName: string;
	sections: WizardSectionConfig;
	pages: ReturnType<typeof getHomeLoanPages>;
}

const LOANS: LoanFixture[] = [
	{ loanName: 'Home Loan', sections: homeLoanSections, pages: getHomeLoanPages() },
	{ loanName: 'Business Loan', sections: businessLoanSections, pages: getBusinessLoanPages() },
	{ loanName: 'LAP', sections: lapLoanSections, pages: getLapLoanPages() },
	{ loanName: 'Plot Loan', sections: plotLoanSections, pages: getPlotLoanPages() },
	{ loanName: 'Personal Loan', sections: personalLoanSections, pages: getPersonalLoanPages() },
	{
		loanName: 'Professional Loan',
		sections: professionalLoanSections,
		pages: getProfessionalLoanPages()
	}
];

interface Violation {
	loanName: string;
	sectionId: string;
	subsectionId: string;
	pageId: string;
	kind: 'unknown-page' | 'ungated-sidebar';
	detail: string;
}

function auditLoan(fixture: LoanFixture): Violation[] {
	const pageMap = new Map(fixture.pages.map((p) => [p.id, p]));
	const violations: Violation[] = [];

	for (const section of fixture.sections.sections) {
		for (const sub of section.subsections) {
			for (const pageId of sub.pageIds) {
				const page = pageMap.get(pageId);
				if (!page) {
					violations.push({
						loanName: fixture.loanName,
						sectionId: section.id,
						subsectionId: sub.id,
						pageId,
						kind: 'unknown-page',
						detail: `pageId "${pageId}" not found in ${fixture.loanName} getAllPages()`
					});
					continue;
				}

				// R2: if page can be hidden, the sidebar must acknowledge it.
				const pageHasGate = page.showWhen !== undefined && page.showWhen !== null;
				const subHasGate = typeof sub.showWhen === 'function';
				const sectionHasGate = typeof section.showWhen === 'function';

				if (pageHasGate && !subHasGate && !sectionHasGate) {
					const key = `${fixture.loanName}::${sub.id}::${pageId}`;
					if (KNOWN_GATE_PAIRINGS[key]) continue;
					violations.push({
						loanName: fixture.loanName,
						sectionId: section.id,
						subsectionId: sub.id,
						pageId,
						kind: 'ungated-sidebar',
						detail: `page "${pageId}" has showWhen but neither subsection "${sub.id}" nor parent section "${section.id}" carries a gate`
					});
				}
			}
		}
	}

	return violations;
}

function formatViolations(violations: Violation[]): string {
	const lines = violations.map(
		(v) => `  [${v.kind}] ${v.loanName} → section "${v.sectionId}" → subsection "${v.subsectionId}" → page "${v.pageId}"\n      ${v.detail}`
	);
	return lines.join('\n');
}

describe('wizard sidebar / page gate pairing (D13 lock)', () => {
	it.each(LOANS)(
		'$loanName: every pageId resolves AND every gated page has a paired sidebar gate',
		(loan) => {
			const violations = auditLoan(loan);
			if (violations.length > 0) {
				throw new Error(
					`D13 violation(s) in ${loan.loanName}:\n${formatViolations(violations)}\n\n` +
						`Fix one of two ways:\n` +
						`  - Add a matching showWhen to the subsection in src/lib/config/wizardSections/{loan}.ts\n` +
						`  - If the chip should remain visible (mutually-exclusive sibling subsection covers the alternate), add an entry to KNOWN_GATE_PAIRINGS in this test with a one-line reason + sunset trigger.`
				);
			}
			expect(violations).toEqual([]);
		}
	);

	it('audits all 6 loans (sanity)', () => {
		expect(LOANS).toHaveLength(6);
		const names = LOANS.map((l) => l.loanName).sort();
		expect(names).toEqual(
			['Business Loan', 'Home Loan', 'LAP', 'Personal Loan', 'Plot Loan', 'Professional Loan'].sort()
		);
	});
});
