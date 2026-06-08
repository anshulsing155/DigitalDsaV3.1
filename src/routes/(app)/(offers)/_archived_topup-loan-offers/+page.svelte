<!--
	════════════════════════════════════════════════════════════════════
	ARCHIVED 2026-06-02 (S214, TECH-DEBT-CLEANUP D7 — ADR-0020 + ADR-0024)

	Was: src/routes/(app)/(offers)/topup-loan-offers/+page.svelte

	Reason: this page rendered offers read from
	`localStorage.getItem('topupLoanOffers')`. Nothing in the
	post-rule-engine codebase wrote that storage key — the only writer had
	been `submitTopupLoanApplication()` in homeLoanApi.ts, which was itself
	dead code (never called). So this page permanently rendered the empty/
	fallback state on every visit.

	No code in the tree navigated to `/topup-loan-offers` either —
	routes.ts defined `OFFERS.TOPUP = '/topup-loan-offers'` as a URL
	constant but no `goto(ROUTES.OFFERS.TOPUP)` call site existed. The
	route was unreachable.

	S214 archived the route per the never-delete protocol. The `_archived_`
	folder-name prefix prevents SvelteKit from registering the URL. This
	+page.svelte is a compile-only stub per Pitfall #63 — Rollup still
	bundles `_archived_*` route folders even though SvelteKit's `_`-prefix
	privacy hides the URL, so the file must compile with zero imports from
	the now-archived homeLoanApi.ts (which would break the build).

	Restore path:
	  git show <pre-S214-sha>:src/routes/(app)/(offers)/topup-loan-offers/+page.svelte

	See docs/OFFERS-ARCHITECTURE.md §6 for the historical context and the
	live offers pipeline that superseded this surface.
	════════════════════════════════════════════════════════════════════
-->
<script lang="ts">
	// Intentionally empty — this stub exists only to keep Rollup happy.
	// Per Pitfall #63: archived route folders under `_archived_*` are still
	// bundled by Vite/Rollup even though SvelteKit's `_` prefix hides the
	// URL. The stub must be self-contained — no imports from the archived
	// homeLoanApi.ts which would break the build.
</script>

<svelte:head>
	<title>Page retired</title>
</svelte:head>

<p>This page has been retired. See docs/OFFERS-ARCHITECTURE.md.</p>
