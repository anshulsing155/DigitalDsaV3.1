<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { secureFetch } from '$lib/utils/csrf';

	let { data, form } = $props();

	// State
	let selectedFixtureId = $state('');
	// svelte-ignore state_referenced_locally
	const initSyntheticProfile = data.syntheticProfile;
	let customPayload = $state(
		initSyntheticProfile ? JSON.stringify(initSyntheticProfile.payload, null, 2) : ''
	);
	let useCustomPayload = $state(!!initSyntheticProfile);
	let isRunning = $state(false);
	let expandedSections = $state<Record<string, boolean>>({});

	// Derived
	let selectedFixture = $derived(
		data.fixtures.find((f: any) => f.fixture_id === selectedFixtureId) || null
	);

	let currentPayload = $derived.by(() => {
		if (useCustomPayload) {
			try {
				return JSON.parse(customPayload);
			} catch {
				return null;
			}
		}
		return selectedFixture?.payload || null;
	});

	let payloadValid = $derived(currentPayload !== null);

	let payloadJson = $derived(currentPayload ? JSON.stringify(currentPayload) : '');

	// Form result parsing
	let evaluation = $derived(form && !form.error && form.mode === 'single' ? form.evaluation : null);
	let compareData = $derived(form && !form.error && form.mode === 'compare' ? form : null);
	let formError = $derived(form?.error as string | undefined);

	// Helpers
	function formatIndian(num: number): string {
		return num.toLocaleString('en-IN');
	}

	function formatCurrency(num: number): string {
		if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
		if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
		return formatIndian(num);
	}

	function formatPercent(num: number): string {
		return `${(num * 100).toFixed(1)}%`;
	}

	function toggleSection(key: string) {
		expandedSections = { ...expandedSections, [key]: !expandedSections[key] };
	}

	const severityConfig: Record<string, { bg: string; text: string; badge: string; icon: string }> =
		{
			blocking: {
				bg: 'bg-[var(--dash-contrast-ghost-bg)]',
				text: 'text-[var(--dash-contrast-text)]',
				badge: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
				icon: '🚫'
			},
			limiting: {
				bg: 'bg-[var(--dash-bg-alt)]',
				text: 'text-[var(--dash-text-secondary)]',
				badge: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
				icon: '⚠️'
			},
			marginal: {
				bg: 'bg-[var(--dash-bg-alt)]',
				text: 'text-[var(--dash-text-muted)]',
				badge: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
				icon: '💡'
			}
		};

	const effortConfig: Record<string, { color: string }> = {
		easy: { color: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]' },
		moderate: { color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]' },
		significant: { color: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]' }
	};

	const trafficColors: Record<string, { bg: string; text: string; border: string; badge: string }> =
		{
			green: {
				bg: 'bg-[var(--dash-btn-ghost-bg)]',
				text: 'text-[var(--dash-accent-text)]',
				border: 'border-[var(--dash-btn-ghost-border)]',
				badge: 'bg-green-500'
			},
			amber: {
				bg: 'bg-[var(--dash-bg-alt)]',
				text: 'text-[var(--dash-text-secondary)]',
				border: 'border-[var(--dash-border)]',
				badge: 'bg-amber-500'
			},
			red: {
				bg: 'bg-[var(--dash-contrast-ghost-bg)]',
				text: 'text-[var(--dash-contrast-text)]',
				border: 'border-[var(--dash-contrast-ghost-border)]',
				badge: 'bg-red-500'
			},
			grey: {
				bg: 'bg-[var(--dash-bg-alt)]',
				text: 'text-[var(--dash-text-muted)]',
				border: 'border-[var(--dash-border)]',
				badge: 'bg-[var(--dash-text-muted)]'
			}
		};

	// Built-in fixture profiles (fallback when DB has none)
	const BUILT_IN_FIXTURES = [
		{ fixture_id: 'fixture01', name: 'Salaried Clean (80K, CIBIL 780, HL 60L)' },
		{ fixture_id: 'fixture02', name: 'Salaried with Car Loan (35K, CIBIL 720, HL 25L)' },
		{ fixture_id: 'fixture03', name: 'Self-employed CA (3yr ITR, CIBIL 750, HL 50L)' },
		{ fixture_id: 'fixture04', name: 'Cash-heavy Trader (CIBIL 680, no ITR, HL 30L)' },
		{ fixture_id: 'fixture05', name: 'Pensioner (40K, CIBIL 800, HL 15L)' },
		{ fixture_id: 'fixture06', name: 'NRI Salaried (CIBIL 760, HL 80L)' },
		{ fixture_id: 'fixture07', name: 'Company Pvt Ltd (8yr, CIBIL 730, BL 50L)' },
		{ fixture_id: 'fixture08', name: 'BT Clean Track (90K, CIBIL 770, Outstanding 40L)' },
		{ fixture_id: 'fixture09', name: 'BT Irregular Track (60K, CIBIL 650, Outstanding 30L)' },
		{ fixture_id: 'fixture10', name: 'Low CIBIL 580 with Default (50K, HL 20L)' },
		{ fixture_id: 'fixture11', name: 'High FOIR >70% (1L income, 72K EMIs)' },
		{ fixture_id: 'fixture12', name: 'Couple Joint (80K+50K, CIBIL 760/740, HL 80L)' },
		{ fixture_id: 'fixture13', name: 'High Net Worth (20L/month, CIBIL 820, HL 5Cr)' },
		{ fixture_id: 'fixture14', name: 'Young First-time Buyer (23yr, 30K, CIBIL 730, HL 15L)' },
		{ fixture_id: 'fixture15', name: 'Senior Pensioner (58yr, 30K, CIBIL 790, HL 10L)' }
	];

	let fixtureList = $derived(data.fixtures.length > 0 ? data.fixtures : BUILT_IN_FIXTURES);

	let seedLoading = $state(false);
	let seedMessage = $state('');

	async function seedTestData() {
		seedLoading = true;
		seedMessage = '';
		try {
			const res = await secureFetch('/api/admin/policies/seed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const result = await res.json();
			if (result.success) {
				const d = result.data;
				seedMessage = `Seeded: ${d.fixtures_inserted} fixtures, ${d.sample_rules_inserted} sample rules, ${d.real_bank_rules_inserted} real bank rules`;
				// Reload to pick up new fixtures
				if (browser) window.location.reload();
			} else {
				seedMessage = `Seed failed: ${result.error}`;
			}
		} catch {
			seedMessage = 'Failed to connect to server';
		} finally {
			seedLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Policy Test | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-[1400px] p-4 md:p-6">
	<!-- Header -->
	<header class="mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<a
				href="/dashboard/admin/policies/{data.artifact._id}"
				class="text-sm text-[var(--dash-accent-text)] hover:underline"
			>
				&larr; Back to Pipeline
			</a>
			<h1 class="mt-1 text-xl font-bold text-[var(--dash-text)]">
				Test Rules: {data.artifact.lender_name}
			</h1>
			<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">
				Version {data.artifact.version} &middot; {data.artifact.artifact_id}
			</p>
		</div>
		<span
			class="rounded-full px-3 py-1 text-xs font-semibold uppercase
			{data.artifact.status === 'active'
				? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
				: data.artifact.status === 'approved'
					? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
					: data.artifact.status === 'in_review'
						? 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
						: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
		>
			{data.artifact.status.replace('_', ' ')}
		</span>
	</header>

	<!-- Seed Banner (when no DB fixtures) -->
	{#if data.fixtures.length === 0}
		<div
			class="mb-6 flex items-center justify-between rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-4"
		>
			<div>
				<p class="text-sm font-medium text-[var(--dash-text)]">No fixtures found in database</p>
				<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
					Seed test data to populate fixtures and sample rule documents for evaluation testing.
				</p>
				{#if seedMessage}
					<p
						class="mt-1 text-xs font-medium {seedMessage.startsWith('Seed failed')
							? 'text-[var(--dash-contrast-text)]'
							: 'text-[var(--dash-accent-text)]'}"
					>
						{seedMessage}
					</p>
				{/if}
			</div>
			<button
				onclick={seedTestData}
				disabled={seedLoading}
				class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-110 disabled:opacity-50"
			>
				{seedLoading ? 'Seeding...' : 'Seed Test Data'}
			</button>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
		<!-- Left: Input Panel -->
		<section
			class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<h2 class="mb-4 text-base font-semibold text-[var(--dash-text)]">Test Input</h2>

			<!-- Mode Toggle -->
			<div class="mb-4 flex overflow-hidden rounded-lg ring-1 ring-[var(--dash-border-light)]">
				<button
					class="flex-1 px-3 py-2 text-sm font-medium transition-colors {!useCustomPayload
						? 'bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)]'
						: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]'}"
					onclick={() => {
						useCustomPayload = false;
					}}
				>
					Fixture Profiles
				</button>
				<button
					class="flex-1 px-3 py-2 text-sm font-medium transition-colors {useCustomPayload
						? 'bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)]'
						: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg)]'}"
					onclick={() => {
						useCustomPayload = true;
					}}
				>
					Custom JSON
				</button>
			</div>

			{#if !useCustomPayload}
				<div class="space-y-3">
					<label for="fixture-select" class="block text-sm font-medium text-[var(--dash-text)]"
						>Select Fixture Profile</label
					>
					<select
						id="fixture-select"
						bind:value={selectedFixtureId}
						class="w-full rounded-md border border-[var(--dash-border-light)] bg-[var(--dash-bg)] px-3 py-2 text-sm text-[var(--dash-text)]"
					>
						<option value="">-- Select a fixture --</option>
						{#each fixtureList as fixture}
							<option value={fixture.fixture_id}>{fixture.name}</option>
						{/each}
					</select>

					{#if selectedFixture}
						<div
							class="rounded-md bg-[var(--dash-bg-alt)] p-3 text-xs text-[var(--dash-text-secondary)]"
						>
							{selectedFixture.description}
						</div>
					{/if}
				</div>

				{#if currentPayload}
					<details class="mt-4">
						<summary class="cursor-pointer text-sm font-medium text-[var(--dash-text-secondary)]"
							>Payload Preview</summary
						>
						<pre
							class="mt-2 max-h-[300px] overflow-auto rounded-md bg-[var(--dash-bg-alt)] p-3 text-xs leading-relaxed text-[var(--dash-text)]">{JSON.stringify(
								currentPayload,
								null,
								2
							)}</pre>
					</details>
				{/if}
			{:else}
				<div class="space-y-2">
					<label for="custom-payload" class="block text-sm font-medium text-[var(--dash-text)]"
						>Paste JSON Payload</label
					>
					<textarea
						id="custom-payload"
						bind:value={customPayload}
						rows="18"
						class="w-full rounded-md border border-[var(--dash-border-light)] bg-[var(--dash-bg)] px-3 py-2 font-mono text-xs leading-relaxed text-[var(--dash-text)]"
						placeholder={'{\n  "loanTransaction": { ... },\n  "allApplicantDetails": [ ... ]\n}'}
					></textarea>
					{#if customPayload && !payloadValid}
						<p class="text-xs text-[var(--dash-contrast-text)]">
							Invalid JSON. Please check your payload.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Evaluate (single lender) -->
			<form
				method="POST"
				action="?/evaluate"
				use:enhance={() => {
					isRunning = true;
					return async ({ update }) => {
						await update();
						isRunning = false;
					};
				}}
			>
				<input type="hidden" name="payload" value={payloadJson} />
				<button
					type="submit"
					disabled={!payloadValid || isRunning}
					class="mt-4 w-full rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isRunning ? 'Evaluating...' : 'Evaluate This Lender'}
				</button>
			</form>

			<!-- Compare All Lenders -->
			<form
				method="POST"
				action="?/compare"
				use:enhance={() => {
					isRunning = true;
					return async ({ update }) => {
						await update();
						isRunning = false;
					};
				}}
			>
				<input type="hidden" name="payload" value={payloadJson} />
				<button
					type="submit"
					disabled={!payloadValid || isRunning}
					class="mt-2 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-4 py-2.5 text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-bg)] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isRunning ? 'Comparing...' : 'Compare All Active Lenders'}
				</button>
			</form>
		</section>

		<!-- Right: Results Panel -->
		<section
			class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<h2 class="mb-4 text-base font-semibold text-[var(--dash-text)]">Results</h2>

			{#if formError}
				<div
					class="mb-4 rounded-lg border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] p-4"
				>
					<p class="text-sm font-medium text-[var(--dash-contrast-text)]">Error</p>
					<p class="mt-1 text-sm text-[var(--dash-contrast-text)]">{formError}</p>
				</div>
			{/if}

			<!-- SINGLE EVALUATION MODE -->
			{#if evaluation}
				{@const ev = evaluation}
				{@const tc = trafficColors[ev.traffic_light] || trafficColors.grey}

				<!-- Traffic Light Card -->
				<div class="mb-5 flex items-center gap-4 rounded-lg border-l-4 {tc.border} {tc.bg} p-4">
					<span class="rounded px-3 py-1.5 text-xs font-bold tracking-wide text-white {tc.badge}">
						{ev.traffic_light.toUpperCase()}
					</span>
					<div class="flex-1">
						<p class="text-sm font-medium {tc.text}">{ev.traffic_light_message}</p>
						<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
							{ev.lender_name} ({ev.classification}) &middot; Approval probability: {formatPercent(
								ev.approval_probability
							)}
						</p>
					</div>
				</div>

				<!-- Key Metrics Grid -->
				<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">Offered Amount</p>
						<p class="mt-1 text-lg font-bold text-[var(--dash-text)]">
							{formatCurrency(ev.offered_amount)}
						</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">ROI</p>
						<p class="mt-1 text-lg font-bold text-[var(--dash-text)]">{ev.roi.toFixed(2)}%</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">EMI</p>
						<p class="mt-1 text-lg font-bold text-[var(--dash-text)]">{formatCurrency(ev.emi)}</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">Tenure</p>
						<p class="mt-1 text-lg font-bold text-[var(--dash-text)]">{ev.tenure_months} mo</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">FOIR</p>
						<p class="mt-1 text-lg font-bold text-[var(--dash-text)]">{formatPercent(ev.foir)}</p>
						<p class="text-xs text-[var(--dash-text-muted)]">max {formatPercent(ev.max_foir)}</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">Assessed Income</p>
						<p class="mt-1 text-lg font-bold text-[var(--dash-text)]">
							{formatCurrency(ev.assessed_income)}
						</p>
					</div>
				</div>

				<!-- Amount Breakdown -->
				{#if ev.eligible_amount !== ev.offered_amount || ev.ltv_capped_amount}
					<div class="mb-5 rounded-lg bg-[var(--dash-bg-alt)] p-4">
						<h3 class="mb-2 text-sm font-semibold text-[var(--dash-text)]">Amount Breakdown</h3>
						<div class="space-y-1 text-sm text-[var(--dash-text-secondary)]">
							<div class="flex justify-between">
								<span>FOIR-eligible amount</span>
								<span class="font-mono">{formatCurrency(ev.foir_eligible_amount)}</span>
							</div>
							{#if ev.ltv_capped_amount != null}
								<div class="flex justify-between">
									<span
										>LTV-capped amount (LTV: {ev.ltv != null ? formatPercent(ev.ltv) : 'N/A'} / max {ev.max_ltv !=
										null
											? formatPercent(ev.max_ltv)
											: 'N/A'})</span
									>
									<span class="font-mono">{formatCurrency(ev.ltv_capped_amount)}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span>Eligible amount</span>
								<span class="font-mono">{formatCurrency(ev.eligible_amount)}</span>
							</div>
							<div
								class="flex justify-between border-t border-[var(--dash-border-light)] pt-1 font-semibold text-[var(--dash-text)]"
							>
								<span>Offered amount</span>
								<span class="font-mono">{formatCurrency(ev.offered_amount)}</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Gate Results -->
				<div class="mb-4">
					<button
						class="flex w-full items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-left text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-bg)]"
						onclick={() => toggleSection('gates')}
					>
						<span
							>Gate Results ({ev.gate_results.filter((g: any) => g.passed).length}/{ev.gate_results
								.length} passed)</span
						>
						<span class="text-xs text-[var(--dash-text-muted)]"
							>{expandedSections.gates ? 'Collapse' : 'Expand'}</span
						>
					</button>
					{#if expandedSections.gates}
						<div class="mt-2 space-y-1.5">
							{#each ev.gate_results as gate}
								<div
									class="flex items-start gap-2 rounded px-3 py-2 text-xs
									{gate.passed ? 'bg-[var(--dash-btn-ghost-bg)]' : 'bg-[var(--dash-contrast-ghost-bg)]'}"
								>
									<span
										class="mt-0.5 shrink-0 font-bold {gate.passed
											? 'text-[var(--dash-accent-text)]'
											: 'text-[var(--dash-contrast-text)]'}"
									>
										{gate.passed ? 'PASS' : 'FAIL'}
									</span>
									<div class="flex-1">
										<span class="font-mono font-medium text-[var(--dash-text)]"
											>[{gate.section}] {gate.rule_id}</span
										>
										<p class="mt-0.5 text-[var(--dash-text-secondary)]">{gate.description}</p>
										{#if !gate.passed && gate.fail_message}
											<p class="mt-0.5 font-medium text-[var(--dash-contrast-text)]">
												{gate.fail_message}
											</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Income Assessment -->
				{#if ev.income_sources && ev.income_sources.length > 0}
					<div class="mb-4">
						<button
							class="flex w-full items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-left text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-bg)]"
							onclick={() => toggleSection('income')}
						>
							<span
								>Income Assessment ({ev.income_sources.length} source{ev.income_sources.length !== 1
									? 's'
									: ''})</span
							>
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{expandedSections.income ? 'Collapse' : 'Expand'}</span
							>
						</button>
						{#if expandedSections.income}
							<div class="mt-2 overflow-x-auto">
								<table class="w-full text-xs">
									<thead>
										<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Applicant</th
											>
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Profile</th
											>
											<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
												>Gross</th
											>
											<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
												>Haircut</th
											>
											<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
												>Assessed</th
											>
											<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
												>Final</th
											>
										</tr>
									</thead>
									<tbody>
										{#each ev.income_sources as src}
											<tr class="border-b border-[var(--dash-border-light)]">
												<td class="px-3 py-2 text-[var(--dash-text)]">#{src.applicant_index + 1}</td
												>
												<td class="px-3 py-2 text-[var(--dash-text)]">{src.profile_type}</td>
												<td class="px-3 py-2 text-right font-mono text-[var(--dash-text)]"
													>{formatIndian(src.gross_amount)}</td
												>
												<td class="px-3 py-2 text-right font-mono text-[var(--dash-text-secondary)]"
													>{src.haircut_percent}%</td
												>
												<td class="px-3 py-2 text-right font-mono text-[var(--dash-text)]"
													>{formatIndian(src.assessed_amount)}</td
												>
												<td
													class="px-3 py-2 text-right font-mono font-medium text-[var(--dash-text)]"
													>{formatIndian(src.final_amount)}</td
												>
											</tr>
										{/each}
										<tr class="bg-[var(--dash-bg-alt)] font-semibold">
											<td colspan="5" class="px-3 py-2 text-right text-[var(--dash-text)]"
												>Total Assessed</td
											>
											<td class="px-3 py-2 text-right font-mono text-[var(--dash-text)]"
												>{formatIndian(ev.assessed_income)}</td
											>
										</tr>
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Obligation Treatment -->
				{#if ev.obligation_details && ev.obligation_details.length > 0}
					<div class="mb-4">
						<button
							class="flex w-full items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-left text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-bg)]"
							onclick={() => toggleSection('obligations')}
						>
							<span
								>Obligations ({ev.obligation_details.length}) &middot; Monthly Load: {formatIndian(
									ev.obligation_load_monthly
								)}</span
							>
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{expandedSections.obligations ? 'Collapse' : 'Expand'}</span
							>
						</button>
						{#if expandedSections.obligations}
							<div class="mt-2 overflow-x-auto">
								<table class="w-full text-xs">
									<thead>
										<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Applicant</th
											>
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Type</th
											>
											<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
												>Original</th
											>
											<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
												>Counted</th
											>
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Treatment</th
											>
										</tr>
									</thead>
									<tbody>
										{#each ev.obligation_details as obl}
											<tr class="border-b border-[var(--dash-border-light)]">
												<td class="px-3 py-2 text-[var(--dash-text)]">#{obl.applicant_index + 1}</td
												>
												<td class="px-3 py-2 text-[var(--dash-text)]">{obl.type}</td>
												<td class="px-3 py-2 text-right font-mono text-[var(--dash-text)]"
													>{formatIndian(obl.original_amount)}</td
												>
												<td class="px-3 py-2 text-right font-mono text-[var(--dash-text)]"
													>{formatIndian(obl.counted_amount)}</td
												>
												<td class="px-3 py-2 text-[var(--dash-text-secondary)]"
													>{obl.treatment_applied}</td
												>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Deviations Applied -->
				{#if ev.deviations_applied && ev.deviations_applied.length > 0}
					<div class="mb-4">
						<button
							class="flex w-full items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-left text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-bg)]"
							onclick={() => toggleSection('deviations')}
						>
							<span>Deviations Applied ({ev.deviations_applied.length})</span>
							<span class="text-xs">{expandedSections.deviations ? 'Collapse' : 'Expand'}</span>
						</button>
						{#if expandedSections.deviations}
							<div class="mt-2 space-y-2">
								{#each ev.deviations_applied as dev}
									<div
										class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-3"
									>
										<p class="text-xs font-semibold text-[var(--dash-text)]">
											{dev.deviation_id}
										</p>
										<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
											{dev.description}
										</p>
										<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
											Deviates from: {dev.deviates_from} &middot; Authority: {dev.approval_authority}
											&middot; Probability modifier: {dev.probability_modifier > 0
												? '+'
												: ''}{dev.probability_modifier * 100}%
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Discomfort Zones (powered by DiscomfortAnalyzer) -->
				{#if ev.discomfort && ev.discomfort.discomfort_zones.length > 0}
					<div class="mb-4">
						<button
							class="flex w-full items-center justify-between rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-4 py-3 text-left text-sm font-semibold text-[var(--dash-contrast-text)] transition-colors hover:brightness-110"
							onclick={() => toggleSection('discomfort')}
						>
							<span class="flex items-center gap-2">
								<span>Discomfort Zones ({ev.discomfort.discomfort_zones.length})</span>
								{#each ['blocking', 'limiting', 'marginal'] as sev}
									{@const count = ev.discomfort.discomfort_zones.filter(
										(z: any) => z.severity === sev
									).length}
									{#if count > 0}
										<span
											class="rounded-full px-1.5 py-0.5 text-[12px] font-bold {severityConfig[sev]
												?.badge || ''}">{count} {sev}</span
										>
									{/if}
								{/each}
							</span>
							<span class="text-xs">{expandedSections.discomfort ? 'Collapse' : 'Expand'}</span>
						</button>
						{#if expandedSections.discomfort}
							<div class="mt-2 space-y-2">
								{#each ev.discomfort.discomfort_zones as zone}
									{@const sc = severityConfig[zone.severity] || severityConfig.marginal}
									<div class="rounded-lg border-l-3 p-3 {sc.bg}" style="border-left: 3px solid;">
										<div class="flex items-start gap-2">
											<span class="text-sm">{sc.icon}</span>
											<div class="flex-1">
												<div class="flex items-center gap-2">
													<span class="text-xs font-bold {sc.text}">{zone.label}</span>
													<span
														class="rounded-full px-1.5 py-0.5 text-[12px] font-bold uppercase {sc.badge}"
														>{zone.severity}</span
													>
													<span
														class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-muted)]"
														>{zone.category}</span
													>
												</div>
												<p class="mt-1 text-xs text-[var(--dash-text-secondary)]">
													{zone.explanation}
												</p>
												<div class="mt-1.5 flex gap-4 text-[12px] text-[var(--dash-text-muted)]">
													<span
														>Current: <span class="font-mono font-medium text-[var(--dash-text)]"
															>{typeof zone.current_value === 'number' && zone.current_value < 1
																? (zone.current_value * 100).toFixed(1) + '%'
																: zone.current_value?.toLocaleString('en-IN')}</span
														></span
													>
													<span
														>Required: <span class="font-mono font-medium text-[var(--dash-text)]"
															>{typeof zone.required_value === 'number' && zone.required_value < 1
																? (zone.required_value * 100).toFixed(1) + '%'
																: zone.required_value?.toLocaleString('en-IN')}</span
														></span
													>
													<span
														>Gap: <span class="font-mono font-bold {sc.text}"
															>{zone.gap}{zone.gap_unit}</span
														></span
													>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>

							<!-- Quick Solutions -->
							{#if ev.discomfort.quick_solutions && ev.discomfort.quick_solutions.length > 0}
								<div class="mt-3">
									<p class="mb-2 text-xs font-bold text-[var(--dash-text-secondary)]">
										Quick Solutions
									</p>
									<div class="space-y-2">
										{#each ev.discomfort.quick_solutions as sol}
											<div
												class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-3"
											>
												<div class="flex items-start justify-between">
													<div class="flex-1">
														<p class="text-xs font-semibold text-[var(--dash-text)]">{sol.title}</p>
														<p class="mt-0.5 text-[13px] text-[var(--dash-text-secondary)]">
															{sol.description}
														</p>
													</div>
													<div class="ml-2 flex shrink-0 flex-col items-end gap-1">
														<span
															class="rounded-full px-1.5 py-0.5 text-[12px] font-bold {effortConfig[
																sol.effort
															]?.color || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
															>{sol.effort}</span
														>
														{#if sol.timeframe}
															<span class="text-[12px] text-[var(--dash-text-muted)]"
																>{sol.timeframe}</span
															>
														{/if}
													</div>
												</div>
												<div class="mt-1.5 flex flex-wrap gap-2 text-[12px]">
													{#if sol.impact?.improvement}
														<span class="text-[var(--dash-accent-text)]"
															>{sol.impact.improvement}</span
														>
													{/if}
													{#if sol.intent_risk !== 'none' && sol.intent_risk_note}
														<span class="text-[var(--dash-contrast-text)]"
															>Intent risk ({sol.intent_risk}): {sol.intent_risk_note}</span
														>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Async Hints -->
							{#if ev.discomfort.async_hints}
								{@const hints = ev.discomfort.async_hints}
								{#if hints.needs_cross_lender || hints.needs_inverse_solve || hints.needs_pl_bridge}
									<div class="mt-3 flex flex-wrap gap-2">
										{#if hints.needs_cross_lender}
											<span
												class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--dash-accent-text)]"
												>Try other lenders</span
											>
										{/if}
										{#if hints.needs_inverse_solve}
											<span
												class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-1 text-[12px] font-medium text-[var(--dash-text-secondary)]"
												>Inverse solve available</span
											>
										{/if}
										{#if hints.needs_pl_bridge}
											<span
												class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-1 text-[12px] font-medium text-[var(--dash-text-secondary)]"
												>PL bridge feasible</span
											>
										{/if}
									</div>
								{/if}
							{/if}
						{/if}
					</div>
				{/if}

				<!-- Policies -->
				{#if ev.policies && ev.policies.length > 0}
					<div class="mb-4">
						<button
							class="flex w-full items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-left text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-bg)]"
							onclick={() => toggleSection('policies')}
						>
							<span>Policies ({ev.policies.length})</span>
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{expandedSections.policies ? 'Collapse' : 'Expand'}</span
							>
						</button>
						{#if expandedSections.policies}
							<div class="mt-2 overflow-x-auto">
								<table class="w-full text-xs">
									<thead>
										<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Key</th
											>
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Label</th
											>
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Value</th
											>
											<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
												>Category</th
											>
										</tr>
									</thead>
									<tbody>
										{#each ev.policies as pol}
											<tr class="border-b border-[var(--dash-border-light)]">
												<td class="px-3 py-2 font-mono text-[var(--dash-text)]">{pol.policy_key}</td
												>
												<td class="px-3 py-2 text-[var(--dash-text)]">{pol.label}</td>
												<td class="px-3 py-2 font-mono text-[var(--dash-text)]"
													>{typeof pol.value === 'object'
														? JSON.stringify(pol.value)
														: String(pol.value)}</td
												>
												<td class="px-3 py-2 text-[var(--dash-text-secondary)]">{pol.category}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Raw JSON -->
				<details class="mt-4">
					<summary
						class="cursor-pointer rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-sm font-medium text-[var(--dash-text-secondary)]"
					>
						Raw JSON Output
					</summary>
					<pre
						class="mt-1 max-h-[400px] overflow-auto rounded-b-lg bg-[var(--dash-bg-alt)] p-3 text-xs leading-relaxed text-[var(--dash-text)]">{JSON.stringify(
							evaluation,
							null,
							2
						)}</pre>
				</details>

				<!-- COMPARE MODE -->
			{:else if compareData}
				{@const summary = compareData.results.summary}
				{@const results = compareData.results.results}

				<!-- Summary Header -->
				<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
						<p class="text-xs text-[var(--dash-text-muted)]">Lenders Evaluated</p>
						<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">{summary.total_lenders}</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-btn-ghost-bg)] p-3 text-center">
						<p class="text-xs text-[var(--dash-accent-text)]">Green</p>
						<p class="mt-1 text-2xl font-bold text-[var(--dash-accent-text)]">
							{summary.green_count}
						</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
						<p class="text-xs text-[var(--dash-text-secondary)]">Amber</p>
						<p class="mt-1 text-2xl font-bold text-[var(--dash-text-secondary)]">
							{summary.amber_count}
						</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-3 text-center">
						<p class="text-xs text-[var(--dash-contrast-text)]">Red</p>
						<p class="mt-1 text-2xl font-bold text-[var(--dash-contrast-text)]">
							{summary.red_count}
						</p>
					</div>
				</div>

				<!-- Best Metrics -->
				<div class="mb-5 grid grid-cols-3 gap-3">
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">Best Amount</p>
						<p class="mt-1 text-sm font-bold text-[var(--dash-text)]">
							{formatCurrency(summary.best_amount.value)}
						</p>
						<p class="text-xs text-[var(--dash-text-secondary)]">{summary.best_amount.lender}</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">Best ROI</p>
						<p class="mt-1 text-sm font-bold text-[var(--dash-text)]">
							{summary.best_roi.value.toFixed(2)}%
						</p>
						<p class="text-xs text-[var(--dash-text-secondary)]">{summary.best_roi.lender}</p>
					</div>
					<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3">
						<p class="text-xs text-[var(--dash-text-muted)]">Best EMI</p>
						<p class="mt-1 text-sm font-bold text-[var(--dash-text)]">
							{formatCurrency(summary.best_emi.value)}
						</p>
						<p class="text-xs text-[var(--dash-text-secondary)]">{summary.best_emi.lender}</p>
					</div>
				</div>

				<!-- Lender Comparison Table -->
				<div class="overflow-x-auto">
					<table class="w-full text-xs">
						<thead>
							<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
								<th class="px-3 py-2 text-left font-medium text-[var(--dash-text-secondary)]"
									>Lender</th
								>
								<th class="px-3 py-2 text-center font-medium text-[var(--dash-text-secondary)]"
									>Signal</th
								>
								<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
									>Offered</th
								>
								<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
									>ROI</th
								>
								<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
									>EMI</th
								>
								<th class="px-3 py-2 text-right font-medium text-[var(--dash-text-secondary)]"
									>Tenure</th
								>
								<th class="px-3 py-2 text-center font-medium text-[var(--dash-text-secondary)]"
									>Rating</th
								>
							</tr>
						</thead>
						<tbody>
							{#each results as r}
								{@const rc = trafficColors[r.traffic_light] || trafficColors.grey}
								<tr class="border-b border-[var(--dash-border-light)]">
									<td class="px-3 py-2.5">
										<p class="font-medium text-[var(--dash-text)]">{r.lender_name}</p>
										<p class="text-[var(--dash-text-muted)]">{r.traffic_light_message}</p>
									</td>
									<td class="px-3 py-2.5 text-center">
										<span
											class="inline-block rounded px-2 py-0.5 text-xs font-bold text-white {rc.badge}"
										>
											{r.traffic_light.toUpperCase()}
										</span>
									</td>
									<td class="px-3 py-2.5 text-right font-mono text-[var(--dash-text)]"
										>{formatCurrency(r.offered_amount)}</td
									>
									<td class="px-3 py-2.5 text-right font-mono text-[var(--dash-text)]"
										>{r.roi.toFixed(2)}%</td
									>
									<td class="px-3 py-2.5 text-right font-mono text-[var(--dash-text)]"
										>{formatCurrency(r.emi)}</td
									>
									<td class="px-3 py-2.5 text-right font-mono text-[var(--dash-text)]"
										>{r.tenure_months} mo</td
									>
									<td class="px-3 py-2.5 text-center">
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium
											{r.rating === 'excellent'
												? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
												: r.rating === 'good'
													? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
													: r.rating === 'average'
														? 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
														: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'}"
										>
											{r.rating}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Per-lender expandable details -->
				{#each results as r, idx}
					{@const lenderEv = compareData.evaluations[idx]}
					<div class="mt-4">
						<button
							class="flex w-full items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-left text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-bg)]"
							onclick={() => toggleSection(`compare-${idx}`)}
						>
							<span class="flex items-center gap-2">
								{r.lender_name} — Details
								{#if lenderEv?.discomfort?.discomfort_zones?.length}
									<span
										class="rounded-full bg-[var(--dash-contrast-ghost-bg)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--dash-contrast-text)]"
									>
										{lenderEv.discomfort.discomfort_zones.length} zone{lenderEv.discomfort
											.discomfort_zones.length !== 1
											? 's'
											: ''}
									</span>
								{/if}
							</span>
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{expandedSections[`compare-${idx}`] ? 'Collapse' : 'Expand'}</span
							>
						</button>
						{#if expandedSections[`compare-${idx}`]}
							<div class="mt-2 space-y-3 px-1">
								<!-- Discomfort Zones (compact) -->
								{#if lenderEv?.discomfort?.discomfort_zones?.length}
									<div>
										<p class="mb-1 text-xs font-bold text-[var(--dash-contrast-text)]">
											Discomfort Zones
										</p>
										<div class="space-y-1">
											{#each lenderEv.discomfort.discomfort_zones as zone}
												{@const sc = severityConfig[zone.severity] || severityConfig.marginal}
												<div class="flex items-start gap-2 rounded px-3 py-2 text-xs {sc.bg}">
													<span class="mt-0.5 shrink-0 text-sm">{sc.icon}</span>
													<div class="flex-1">
														<span class="font-bold {sc.text}">{zone.label}</span>
														<span
															class="ml-1 rounded-full px-1.5 py-0.5 text-[12px] font-bold uppercase {sc.badge}"
															>{zone.severity}</span
														>
														<p class="mt-0.5 text-[var(--dash-text-secondary)]">
															{zone.explanation}
														</p>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Quick Solutions (top 3) -->
								{#if lenderEv?.discomfort?.quick_solutions?.length}
									<div>
										<p class="mb-1 text-xs font-bold text-[var(--dash-text-secondary)]">
											Top Solutions
										</p>
										<div class="space-y-1">
											{#each lenderEv.discomfort.quick_solutions.slice(0, 3) as sol}
												<div
													class="rounded bg-[var(--dash-bg-card)] p-2 text-xs ring-1 ring-[var(--dash-border-light)]"
												>
													<div class="flex items-center justify-between">
														<span class="font-medium text-[var(--dash-text)]">{sol.title}</span>
														<span
															class="rounded-full px-1.5 py-0.5 text-[12px] font-bold {effortConfig[
																sol.effort
															]?.color || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
															>{sol.effort}</span
														>
													</div>
													{#if sol.impact?.improvement}
														<p class="mt-0.5 text-[var(--dash-accent-text)]">
															{sol.impact.improvement}
														</p>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{/if}

								{#if r.factors && r.factors.length > 0}
									<div>
										<p class="mb-1 text-xs font-semibold text-[var(--dash-text-secondary)]">
											Decision Factors
										</p>
										<div class="space-y-1">
											{#each r.factors as f}
												<div class="flex items-start gap-2 text-xs">
													<span
														class="mt-0.5 shrink-0 font-bold
														{f.impact === 'positive'
															? 'text-[var(--dash-accent-text)]'
															: f.impact === 'negative'
																? 'text-[var(--dash-contrast-text)]'
																: 'text-[var(--dash-text-muted)]'}"
													>
														{f.impact === 'positive' ? '+' : f.impact === 'negative' ? '-' : '*'}
													</span>
													<div>
														<span class="font-medium text-[var(--dash-text)]">{f.label}</span>
														<span class="ml-1 text-[var(--dash-text-secondary)]"
															>{f.description}</span
														>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/if}
								{#if r.suggestions && r.suggestions.length > 0}
									<div>
										<p class="mb-1 text-xs font-semibold text-[var(--dash-text-secondary)]">
											Improvement Suggestions
										</p>
										<div class="space-y-1">
											{#each r.suggestions as s}
												<div class="rounded bg-[var(--dash-btn-ghost-bg)] p-2 text-xs">
													<span class="font-medium text-[var(--dash-accent-text)]">{s.title}</span>
													<span class="ml-1 text-[var(--dash-text-secondary)]">{s.description}</span
													>
													{#if s.potential_impact}
														<span class="ml-1 text-[var(--dash-accent-text)]"
															>({s.potential_impact.estimated_value ||
																`${s.potential_impact.direction} ${s.potential_impact.metric}`})</span
														>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}

				<!-- Raw JSON -->
				<details class="mt-4">
					<summary
						class="cursor-pointer rounded-lg bg-[var(--dash-bg-alt)] px-4 py-3 text-sm font-medium text-[var(--dash-text-secondary)]"
					>
						Raw JSON Output
					</summary>
					<pre
						class="mt-1 max-h-[400px] overflow-auto rounded-b-lg bg-[var(--dash-bg-alt)] p-3 text-xs leading-relaxed text-[var(--dash-text)]">{JSON.stringify(
							compareData,
							null,
							2
						)}</pre>
				</details>
			{:else if !formError}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<p class="text-sm text-[var(--dash-text-muted)]">
						Select a fixture profile or paste a custom payload, then click "Evaluate This Lender" to
						run the real evaluation engine, or "Compare All Active Lenders" to evaluate across all
						lenders.
					</p>
				</div>
			{/if}
		</section>
	</div>
</div>
