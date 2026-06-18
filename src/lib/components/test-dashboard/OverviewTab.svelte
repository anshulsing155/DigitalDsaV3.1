<script lang="ts">
	import { onMount } from 'svelte';
	import StatCard from '$lib/components/dashboard/StatCard.svelte';
	import { ClipboardList, Clapperboard, CircleCheck, CircleX } from 'lucide-svelte';

	interface Props {
		onNavigate: (tab: string) => void;
	}

	let { onNavigate }: Props = $props();

	let lastResults = $state<{
		vitest: { total: number; passed: number; failed: number } | null;
		lastRun: string | null;
	}>({ vitest: null, lastRun: null });

	async function fetchResults() {
		try {
			const res = await fetch('/api/test/results');
			if (res.ok) {
				lastResults = await res.json();
			}
		} catch {
			// API not available
		}
	}

	onMount(() => {
		fetchResults();
	});

	const unitPassed = $derived(lastResults.vitest?.passed ?? 0);
	const unitFailed = $derived(lastResults.vitest?.failed ?? 0);
	const unitTotal = $derived(lastResults.vitest?.total ?? 0);

	/* ── What Each Test File Validates ── */

	const unitTestMap = [
		{
			file: 'schemaAlignment.test.ts',
			what: 'Verifies pageFlowMap.ts matches the real homeLoanSchema.json',
			why: 'Catches drift if someone edits the JSON schema but forgets to update the test map',
			report:
				'If this fails, question IDs or contextKeys in pageFlowMap.ts are out of sync with the JSON'
		},
		{
			file: 'homeLoan-pageFlow.test.ts',
			what: 'Verifies page sequence for each loan type (New Loan, BT, Top-up, BT+Top-up)',
			why: 'A wrong page order means users see incorrect pages or skip required pages',
			report: 'If this fails, the page ordering logic or btTopUpSequence reordering is broken'
		},
		{
			file: 'questionVisibility.test.ts',
			what: 'Verifies showWhen conditions — which questions appear for which answers',
			why: 'Questions must show/hide correctly based on prior answers (e.g., seller info only for identified property)',
			report: 'If this fails, a question is showing when it should be hidden (or vice versa)'
		},
		{
			file: 'nextButtonLogic.test.ts',
			what: 'Verifies each page has correct required questions that block the Next button',
			why: 'If a required question is missing, users could proceed with incomplete data',
			report: 'If this fails, required field validation on a specific page is incorrect'
		},
		{
			file: 'payloadSanitization.test.ts',
			what: 'Verifies only visible-question answers are sent in the final API payload',
			why: 'Hidden fields should NOT be in the payload — prevents stale data going to lenders',
			report: 'If this fails, the payload contains answers from questions that were hidden/skipped'
		},
		{
			file: 'profileGeneration.test.ts',
			what: 'Verifies synthetic test profiles generate valid combinations',
			why: 'Bad test data would make other tests unreliable',
			report:
				'If this fails, the CombinationGenerator is producing invalid property/income profiles'
		},
		{
			file: 'relationshipInference.test.ts',
			what: 'Verifies the relationship engine (e.g., if A is Father of B, then B is Son of A)',
			why: 'Applicant relationships must auto-infer reciprocals correctly',
			report:
				'If this fails, the inference engine is producing wrong or missing relationship inferences'
		}
	];

	const e2eTestMap = [
		{
			file: 'homeLoan-newLoan-happyPath.spec.ts',
			what: 'Full New Loan application: select loan type, fill all pages, reach the end'
		},
		{
			file: 'homeLoan-newLoan-preSanction.spec.ts',
			what: 'New Loan with propertyIdentified=No — skips property pages, shows sanction page'
		},
		{
			file: 'homeLoan-balanceTransfer.spec.ts',
			what: 'Balance Transfer Only flow — verifies existing loan info appears, no propertyIdentified'
		},
		{
			file: 'homeLoan-topUp.spec.ts',
			what: 'Top-up Only flow — verifies topTenure appears instead of newTenure'
		},
		{
			file: 'homeLoan-btWithTopUp.spec.ts',
			what: 'BT + Top-up combined flow — verifies both BT and top-up fields appear'
		},
		{
			file: 'homeLoan-validation.spec.ts',
			what: 'Next button disabled until required fields filled, conditional question visibility'
		},
		{
			file: 'homeLoan-pageNavigation.spec.ts',
			what: 'Back/Forward navigation between pages, payload sanitization on path change'
		},
		{
			file: 'homeLoan-multiApplicant.spec.ts',
			what: 'Multiple applicants: relationship step appears, data persists per applicant'
		},
		{
			file: 'homeLoan-sessionResume.spec.ts',
			what: 'Page reload shows resume dialog, filled data persists after reload'
		}
	];

	/* ── Step-by-step Workflow ── */

	const workflow = [
		{
			step: 1,
			title: 'Run Unit Tests',
			action: 'Go to "Run Tests" tab and click "Run Unit Tests"',
			goal: 'All 159 tests should pass (green). Zero failures.',
			tab: 'runner'
		},
		{
			step: 2,
			title: 'Check Relationship Inference',
			action: 'Go to "Relationships" tab and click "Run All"',
			goal: 'All 10+ scenarios should show green checkmarks.',
			tab: 'relationships'
		},
		{
			step: 3,
			title: 'Generate Test Data',
			action: 'Go to "Test Data" tab, select filters, click "Generate Test Cases"',
			goal: 'Verify synthetic profiles are realistic (income ranges, city tiers, etc.)',
			tab: 'testdata'
		},
		{
			step: 4,
			title: 'Run E2E Tests (Terminal)',
			action: 'In your terminal: npx playwright test',
			goal: 'All 34 browser tests should pass. These open a real browser and fill the actual form.'
		}
	];
</script>

<div class="space-y-6">
	<!-- ═══ Quick Summary Stats ═══ -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatCard
			title="Unit Tests"
			value={unitTestMap.length}
			subtitle="vitest files"
			icon={ClipboardList}
		/>
		<StatCard
			title="E2E Tests"
			value={e2eTestMap.length}
			subtitle="playwright specs"
			icon={Clapperboard}
		/>
		<StatCard
			title="Passed"
			value={unitPassed}
			subtitle={unitTotal > 0 ? `of ${unitTotal} assertions` : 'click Run Tests to update'}
			icon={CircleCheck}
		/>
		<StatCard
			title="Failed"
			value={unitFailed}
			subtitle={unitTotal > 0 ? `of ${unitTotal} assertions` : 'click Run Tests to update'}
			icon={CircleX}
		/>
	</div>

	{#if lastResults.lastRun}
		<div class="rounded-lg border border-gray-100 bg-white px-4 py-2 text-xs text-gray-500">
			Last unit test run: <span class="font-medium text-gray-700">{lastResults.lastRun}</span>
		</div>
	{/if}

	<!-- ═══ Welcome / What Is This? ═══ -->
	<div class="rounded-xl border border-blue-200 bg-blue-50 p-5">
		<h2 class="text-base font-bold text-blue-900">Welcome to the QA Testing Module</h2>
		<p class="mt-2 text-sm leading-relaxed text-blue-800">
			This dashboard tests the <strong>Home Loan application form</strong> — a multi-page wizard
			where users fill property details, seller info, mortgage profile, etc. The form is
			<strong>entirely driven by JSON</strong> (<code class="rounded bg-blue-100 px-1 text-xs"
				>homeLoanSchema.json</code
			>), which controls what questions appear, when they show/hide, and what options are available.
		</p>
		<p class="mt-2 text-sm leading-relaxed text-blue-800">
			There are <strong>4 loan types</strong>: New Loan, Balance Transfer Only, Top-up Only, and
			Balance Transfer with Top-up. Each type shows a different set of pages and questions.
		</p>
	</div>

	<!-- ═══ Your Workflow (Step by Step) ═══ -->
	<div>
		<h2 class="mb-3 text-base font-bold text-[#1e293b]">Your Testing Workflow</h2>
		<p class="mb-4 text-xs text-gray-500">
			Follow these steps every time you run tests. Report the results to your QA lead.
		</p>
		<div class="space-y-3">
			{#each workflow as w}
				<div
					class="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
				>
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-500 text-sm font-bold text-white"
					>
						{w.step}
					</div>
					<div class="flex-1">
						<p class="text-sm font-semibold text-[#1e293b]">{w.title}</p>
						<p class="mt-0.5 text-xs text-gray-600">{w.action}</p>
						<p class="mt-1 rounded bg-green-50 px-2 py-1 text-xs text-green-700">
							Expected: {w.goal}
						</p>
					</div>
					{#if w.tab}
						<button
							type="button"
							class="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white"
							onclick={() => onNavigate(w.tab)}
						>
							Go &rarr;
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- ═══ Unit Tests — What Each File Checks ═══ -->
	<div>
		<h2 class="mb-1 text-base font-bold text-[#1e293b]">Unit Test Files (Vitest)</h2>
		<p class="mb-3 text-xs text-gray-500">
			These run in the background (no browser). They test the form's <strong>logic</strong> — page sequences,
			visibility rules, payload structure, etc.
		</p>
		<div class="space-y-2">
			{#each unitTestMap as t, i}
				<div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<span
							class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600"
						>
							{i + 1}
						</span>
						<div class="flex-1">
							<p class="text-sm font-semibold text-[#1e293b]">
								<code class="rounded bg-gray-100 px-1 text-xs">{t.file}</code>
							</p>
							<p class="mt-1 text-xs text-gray-700"><strong>Tests:</strong> {t.what}</p>
							<p class="mt-0.5 text-xs text-gray-500"><strong>Why it matters:</strong> {t.why}</p>
							<p
								class="mt-1 rounded border-l-2 border-red-300 bg-red-50 px-2 py-1 text-xs text-[var(--color-error)]"
							>
								If it fails: {t.report}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- ═══ E2E Tests — What Each Spec Does ═══ -->
	<div>
		<h2 class="mb-1 text-base font-bold text-[#1e293b]">E2E Test Files (Playwright)</h2>
		<p class="mb-3 text-xs text-gray-500">
			These open a <strong>real browser</strong>, click buttons, fill fields, and verify the UI
			behaves correctly. Run via terminal:
			<code class="rounded bg-gray-100 px-1 text-xs">npx playwright test</code>
		</p>
		<div class="space-y-2">
			{#each e2eTestMap as t, i}
				<div
					class="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm"
				>
					<span
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-600"
					>
						{i + 1}
					</span>
					<div>
						<p class="text-xs font-medium text-gray-800">
							<code class="rounded bg-gray-100 px-1">{t.file}</code>
						</p>
						<p class="mt-0.5 text-xs text-gray-500">{t.what}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- ═══ What To Report ═══ -->
	<div class="rounded-xl border border-purple-200 bg-purple-50 p-5">
		<h2 class="text-base font-bold text-purple-900">What to Report to QA Lead</h2>
		<div class="mt-3 space-y-2 text-sm text-purple-800">
			<div class="flex items-start gap-2">
				<span class="mt-0.5 text-purple-600">1.</span>
				<p>
					<strong>Unit Test Results:</strong> Total passed / failed count, and which specific test file(s)
					failed
				</p>
			</div>
			<div class="flex items-start gap-2">
				<span class="mt-0.5 text-purple-600">2.</span>
				<p>
					<strong>Relationship Tests:</strong> All scenarios passed? Any unexpected inference results?
				</p>
			</div>
			<div class="flex items-start gap-2">
				<span class="mt-0.5 text-purple-600">3.</span>
				<p>
					<strong>E2E Results:</strong> All 34 browser tests passed? Which spec file(s) failed and on
					which step?
				</p>
			</div>
			<div class="flex items-start gap-2">
				<span class="mt-0.5 text-purple-600">4.</span>
				<p>
					<strong>Test Data:</strong> Were generated profiles realistic? Any impossible combinations (e.g.,
					rural + 5Cr property)?
				</p>
			</div>
		</div>
		<div class="mt-4 rounded-lg border border-purple-300 bg-purple-100 p-3 text-xs text-purple-700">
			<strong>Quick Format:</strong> "Unit: 159/159 passed. Relationships: 10/10 passed. E2E: 34/34 passed.
			Test Data: Generated 50 profiles, all valid." — If anything failed, include the file name and error
			summary.
		</div>
	</div>
</div>
