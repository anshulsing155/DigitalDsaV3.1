<script lang="ts">
	import { computeInferredRelationships } from '$lib/components/relationship-capture/inferenceEngine';
	import type { Relationship } from '$lib/components/relationship-capture/types';
	import { relationshipTestScenarios } from '$lib/data/relationshipTestScenarios';
	import StatCard from '$lib/components/dashboard/StatCard.svelte';
	import { ClipboardList, CircleCheck, CircleX, Clock } from 'lucide-svelte';

	type ScenarioStatus = 'pass' | 'fail' | 'pending' | 'running';

	let results: Map<string, { status: ScenarioStatus; actual: Relationship[] }> = $state(new Map());
	let expandedId: string | null = $state(null);

	function getStatus(id: string): ScenarioStatus {
		return results.get(id)?.status ?? 'pending';
	}

	function getActual(id: string): Relationship[] {
		return results.get(id)?.actual ?? [];
	}

	function runScenario(scenarioId: string) {
		const scenario = relationshipTestScenarios.find((s) => s.id === scenarioId);
		if (!scenario) return;

		// Mark running
		results = new Map(results);
		results.set(scenarioId, { status: 'running', actual: [] });

		// Run inference (synchronous, pure TS)
		setTimeout(() => {
			const actual = computeInferredRelationships(scenario.applicants, scenario.userRelationships);

			// Compare: every expected must be in actual
			const allExpectedFound = scenario.expectedInferences.every((exp) =>
				actual.some(
					(a) =>
						a.fromId === exp.fromId && a.toId === exp.toId && a.relationType === exp.relationType
				)
			);

			// For edge cases with empty expected: actual should also be empty
			const noUnexpected = scenario.expectedInferences.length === 0 ? actual.length === 0 : true;

			const passed = allExpectedFound && noUnexpected;

			results = new Map(results);
			results.set(scenarioId, { status: passed ? 'pass' : 'fail', actual });
		}, 100);
	}

	function runAll() {
		for (const scenario of relationshipTestScenarios) {
			runScenario(scenario.id);
		}
	}

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	const passing = $derived([...results.values()].filter((r) => r.status === 'pass').length);
	const failing = $derived([...results.values()].filter((r) => r.status === 'fail').length);
	const pending = $derived(relationshipTestScenarios.length - passing - failing);

	const statusColors: Record<ScenarioStatus, string> = {
		pass: 'border-green-400 bg-green-50',
		fail: 'border-red-400 bg-red-50',
		pending: 'border-gray-200 bg-white',
		running: 'border-blue-400 bg-blue-50'
	};

	const statusIcons: Record<ScenarioStatus, string> = {
		pass: '✅',
		fail: '❌',
		pending: '⏳',
		running: '🔄'
	};
</script>

<div class="space-y-6">
	<!-- What this tab does -->
	<div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
		<h3 class="text-sm font-bold text-blue-900">What does this do?</h3>
		<p class="mt-1 text-xs leading-relaxed text-blue-800">
			Tests the <strong>relationship inference engine</strong>. When a user adds multiple applicants
			(e.g., Father + Son), the system must auto-infer reciprocal relationships. Example: if "A is
			Father of B", the engine should infer "B is Son of A".
		</p>
		<p class="mt-2 text-xs text-blue-700">
			<strong>How to use:</strong> Click "Run All" to test all scenarios. Each card shows the applicants,
			user-defined relationships, expected inferences, and actual results. Green = passed, Red = unexpected
			result. Click any card to expand details.
		</p>
		<p class="mt-2 text-xs text-blue-700">
			<strong>What to report:</strong> "Relationships: X/Y passed." If any fail, note the scenario name
			and what was expected vs what actually happened.
		</p>
	</div>

	<!-- Summary Stats -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<StatCard title="Total" value={relationshipTestScenarios.length} icon={ClipboardList} />
		<StatCard title="Passing" value={passing} icon={CircleCheck} />
		<StatCard title="Failing" value={failing} icon={CircleX} />
		<StatCard title="Pending" value={pending} icon={Clock} />
	</div>

	<!-- Run All Button -->
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold text-[#1e293b]">
			Inference Scenarios ({relationshipTestScenarios.length})
		</h3>
		<button
			type="button"
			class="rounded-lg bg-gradient-to-r from-[var(--ddsa-primary-400)] via-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-400)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110"
			onclick={runAll}
		>
			Run All
		</button>
	</div>

	<!-- Scenario Cards (inlined) -->
	<div class="space-y-3">
		{#each relationshipTestScenarios as scenario (scenario.id)}
			{@const status = getStatus(scenario.id)}
			{@const actual = getActual(scenario.id)}
			<div class="rounded-xl border-l-4 shadow-sm transition-all {statusColors[status]}">
				<div class="flex items-center justify-between p-4">
					<button
						type="button"
						class="flex flex-1 items-center gap-3 text-left"
						onclick={() => toggleExpand(scenario.id)}
					>
						<span class="text-lg">{statusIcons[status]}</span>
						<div>
							<p class="text-sm font-semibold text-gray-800">{scenario.name}</p>
							<p class="text-xs text-gray-500">{scenario.description}</p>
						</div>
					</button>
					<button
						type="button"
						class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
						onclick={() => runScenario(scenario.id)}
					>
						Run
					</button>
				</div>

				{#if expandedId === scenario.id}
					<div class="border-t border-gray-100 p-4">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<!-- Applicants -->
							<div>
								<p class="mb-1 text-xs font-medium text-gray-600">Applicants</p>
								<div class="space-y-1">
									{#each scenario.applicants as a}
										<div class="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">
											{a.name} ({a.gender}, {a.age}y) — {a.id}
										</div>
									{/each}
								</div>
							</div>

							<!-- User Relationships -->
							<div>
								<p class="mb-1 text-xs font-medium text-gray-600">User Relationships</p>
								<div class="space-y-1">
									{#each scenario.userRelationships as r}
										<div class="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">
											{r.fromId} → "{r.relationType}" → {r.toId}
										</div>
									{/each}
								</div>
							</div>

							<!-- Expected Inferences -->
							<div>
								<p class="mb-1 text-xs font-medium text-gray-600">Expected</p>
								{#if scenario.expectedInferences.length === 0}
									<p class="text-xs text-gray-400 italic">No inferences expected</p>
								{:else}
									<div class="space-y-1">
										{#each scenario.expectedInferences as exp}
											<div class="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
												{exp.fromId} → "{exp.relationType}" → {exp.toId}
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Actual Inferences -->
							<div>
								<p class="mb-1 text-xs font-medium text-gray-600">Actual</p>
								{#if actual.length === 0}
									<p class="text-xs text-gray-400 italic">
										{status === 'pending' ? 'Run to see results' : 'No inferences produced'}
									</p>
								{:else}
									<div class="space-y-1">
										{#each actual as inf}
											<div
												class="rounded px-2 py-1 text-xs {scenario.expectedInferences.some(
													(e) =>
														e.fromId === inf.fromId &&
														e.toId === inf.toId &&
														e.relationType === inf.relationType
												)
													? 'bg-green-50 text-green-700'
													: 'bg-yellow-50 text-yellow-700'}"
											>
												{inf.fromId} → "{inf.relationType}" → {inf.toId}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
