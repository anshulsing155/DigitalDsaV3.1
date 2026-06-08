<script lang="ts">
	import type { IncomeTypeAssessment, IncomeCondition } from '$lib/types/policyCapture.js';
	import { INCOME_CONDITIONS } from '$lib/types/policyCapture.js';
	import { INCOME_PROFILE_CARDS } from '$lib/config/incomeProfiles/profileCards.js';

	interface Props {
		assessments: IncomeTypeAssessment[];
		isReadOnly: boolean;
		onUpdate: (assessments: IncomeTypeAssessment[]) => void;
	}

	// Default [] — guards SSR against a capture missing this assessments array.
	let { assessments = [], isReadOnly, onUpdate }: Props = $props();

	// Initialize assessments from all 12 income types if empty
	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let items = $state<IncomeTypeAssessment[]>(
		assessments.length > 0
			? assessments
			: INCOME_PROFILE_CARDS.filter((c) => !c.exclusive).map((card) => ({
					profile_type: card.type,
					accepted: null,
					haircut_percent: null,
					max_contribution_percent: null,
					conditions: [],
					special_notes: null
				}))
	);

	let expandedType = $state<string | null>(null);

	function updateItem(index: number, changes: Partial<IncomeTypeAssessment>) {
		items = items.map((item, i) => (i === index ? { ...item, ...changes } : item));
		onUpdate(items);
	}

	function toggleCondition(index: number, condition: IncomeCondition) {
		const item = items[index];
		const conditions = item.conditions.includes(condition)
			? item.conditions.filter((c) => c !== condition)
			: [...item.conditions, condition];
		updateItem(index, { conditions });
	}

	function getCard(type: string) {
		return INCOME_PROFILE_CARDS.find((c) => c.type === type);
	}

	const employmentItems = $derived(
		items.filter((i) => getCard(i.profile_type)?.category === 'employment_business')
	);
	const otherItems = $derived(
		items.filter((i) => getCard(i.profile_type)?.category === 'other_income')
	);
</script>

<div class="space-y-6">
	<!-- Employment & Business -->
	<div class="space-y-2">
		<p class="text-xs font-semibold tracking-wider text-gray-400 uppercase">
			Employment & Business Income
		</p>
		{#each employmentItems as item, _idx}
			{@const card = getCard(item.profile_type)}
			{@const globalIdx = items.findIndex((i) => i.profile_type === item.profile_type)}
			{@const isExpanded = expandedType === item.profile_type}
			{#if card}
				<div
					class="rounded-lg border {item.accepted === true
						? 'border-green-200 bg-green-50/30'
						: item.accepted === false
							? 'border-red-100 bg-red-50/20'
							: 'border-gray-100 bg-gray-50/50'}"
				>
					<button
						type="button"
						onclick={() => (expandedType = isExpanded ? null : item.profile_type)}
						class="flex w-full items-center justify-between p-3 text-left"
					>
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium text-gray-800">{card.label}</span>
							<span class="text-xs text-gray-400">{card.description}</span>
						</div>
						<div class="flex items-center gap-2">
							{#if item.accepted === true}
								<span class="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"
									>ACCEPTED</span
								>
							{:else if item.accepted === false}
								<span class="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600"
									>NOT ACCEPTED</span
								>
							{:else}
								<span class="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500"
									>NOT SET</span
								>
							{/if}
							<span class="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
						</div>
					</button>

					{#if isExpanded}
						<div class="space-y-3 border-t border-gray-100 p-3">
							<!-- Accepted/Rejected/DontKnow -->
							<div class="flex gap-2">
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() => updateItem(globalIdx, { accepted: true })}
									class="rounded px-3 py-1.5 text-xs font-medium {item.accepted === true
										? 'bg-green-100 text-green-700 ring-1 ring-green-200'
										: 'bg-white text-gray-500 hover:bg-gray-100'}"
								>
									Accepted
								</button>
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() => updateItem(globalIdx, { accepted: false })}
									class="rounded px-3 py-1.5 text-xs font-medium {item.accepted === false
										? 'bg-red-100 text-red-600 ring-1 ring-red-200'
										: 'bg-white text-gray-500 hover:bg-gray-100'}"
								>
									Not Accepted
								</button>
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() => updateItem(globalIdx, { accepted: null })}
									class="rounded px-3 py-1.5 text-xs font-medium {item.accepted === null
										? 'bg-orange-100 text-orange-600 ring-1 ring-orange-200'
										: 'bg-white text-gray-500 hover:bg-gray-100'}"
								>
									Don't Know
								</button>
							</div>

							{#if item.accepted === true}
								<div class="grid gap-3 sm:grid-cols-2">
									<div>
										<label for="emp-{item.profile_type}-haircut" class="text-[11px] text-gray-500"
											>Haircut % (income deduction)</label
										>
										<input
											id="emp-{item.profile_type}-haircut"
											type="number"
											min="0"
											max="100"
											value={item.haircut_percent ?? ''}
											disabled={isReadOnly}
											oninput={(e) =>
												updateItem(globalIdx, {
													haircut_percent: e.currentTarget.value
														? Number(e.currentTarget.value)
														: null
												})}
											placeholder="e.g., 30"
											class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
										/>
									</div>
									<div>
										<label
											for="emp-{item.profile_type}-max-contrib"
											class="text-[11px] text-gray-500">Max Contribution to Total Income (%)</label
										>
										<input
											id="emp-{item.profile_type}-max-contrib"
											type="number"
											min="0"
											max="100"
											value={item.max_contribution_percent ?? ''}
											disabled={isReadOnly}
											oninput={(e) =>
												updateItem(globalIdx, {
													max_contribution_percent: e.currentTarget.value
														? Number(e.currentTarget.value)
														: null
												})}
											placeholder="e.g., 50 (leave blank = no limit)"
											class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
										/>
									</div>
								</div>

								<!-- Conditions -->
								<div>
									<span class="text-[11px] text-gray-500">Required Conditions</span>
									<div class="mt-1 flex flex-wrap gap-1.5">
										{#each INCOME_CONDITIONS as cond}
											<button
												type="button"
												disabled={isReadOnly}
												onclick={() => toggleCondition(globalIdx, cond.value)}
												class="rounded px-2 py-1 text-[11px] font-medium transition-colors
													{item.conditions.includes(cond.value)
													? 'bg-blue-100 text-blue-700'
													: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
											>
												{cond.label}
											</button>
										{/each}
									</div>
								</div>

								<!-- Special Notes -->
								<div>
									<label for="emp-{item.profile_type}-notes" class="text-[11px] text-gray-500"
										>Special Notes</label
									>
									<input
										id="emp-{item.profile_type}-notes"
										type="text"
										value={item.special_notes ?? ''}
										disabled={isReadOnly}
										oninput={(e) =>
											updateItem(globalIdx, { special_notes: e.currentTarget.value || null })}
										placeholder="Any special conditions for this income type..."
										class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
									/>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</div>

	<!-- Other Income -->
	<div class="space-y-2">
		<p class="text-xs font-semibold tracking-wider text-gray-400 uppercase">Other Income Sources</p>
		{#each otherItems as item}
			{@const card = getCard(item.profile_type)}
			{@const globalIdx = items.findIndex((i) => i.profile_type === item.profile_type)}
			{@const isExpanded = expandedType === item.profile_type}
			{#if card}
				<div
					class="rounded-lg border {item.accepted === true
						? 'border-green-200 bg-green-50/30'
						: item.accepted === false
							? 'border-red-100 bg-red-50/20'
							: 'border-gray-100 bg-gray-50/50'}"
				>
					<button
						type="button"
						onclick={() => (expandedType = isExpanded ? null : item.profile_type)}
						class="flex w-full items-center justify-between p-3 text-left"
					>
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium text-gray-800">{card.label}</span>
							<span class="text-xs text-gray-400">{card.description}</span>
						</div>
						<div class="flex items-center gap-2">
							{#if item.accepted === true}
								<span class="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"
									>ACCEPTED</span
								>
							{:else if item.accepted === false}
								<span class="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600"
									>NOT ACCEPTED</span
								>
							{:else}
								<span class="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500"
									>NOT SET</span
								>
							{/if}
							<span class="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
						</div>
					</button>

					{#if isExpanded}
						<div class="space-y-3 border-t border-gray-100 p-3">
							<div class="flex gap-2">
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() => updateItem(globalIdx, { accepted: true })}
									class="rounded px-3 py-1.5 text-xs font-medium {item.accepted === true
										? 'bg-green-100 text-green-700 ring-1 ring-green-200'
										: 'bg-white text-gray-500 hover:bg-gray-100'}"
								>
									Accepted
								</button>
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() => updateItem(globalIdx, { accepted: false })}
									class="rounded px-3 py-1.5 text-xs font-medium {item.accepted === false
										? 'bg-red-100 text-red-600 ring-1 ring-red-200'
										: 'bg-white text-gray-500 hover:bg-gray-100'}"
								>
									Not Accepted
								</button>
								<button
									type="button"
									disabled={isReadOnly}
									onclick={() => updateItem(globalIdx, { accepted: null })}
									class="rounded px-3 py-1.5 text-xs font-medium {item.accepted === null
										? 'bg-orange-100 text-orange-600 ring-1 ring-orange-200'
										: 'bg-white text-gray-500 hover:bg-gray-100'}"
								>
									Don't Know
								</button>
							</div>

							{#if item.accepted === true}
								<div class="grid gap-3 sm:grid-cols-2">
									<div>
										<label for="other-{item.profile_type}-haircut" class="text-[11px] text-gray-500"
											>Haircut %</label
										>
										<input
											id="other-{item.profile_type}-haircut"
											type="number"
											min="0"
											max="100"
											value={item.haircut_percent ?? ''}
											disabled={isReadOnly}
											oninput={(e) =>
												updateItem(globalIdx, {
													haircut_percent: e.currentTarget.value
														? Number(e.currentTarget.value)
														: null
												})}
											placeholder="e.g., 30"
											class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
										/>
									</div>
									<div>
										<label
											for="other-{item.profile_type}-max-contrib"
											class="text-[11px] text-gray-500">Max Contribution %</label
										>
										<input
											id="other-{item.profile_type}-max-contrib"
											type="number"
											min="0"
											max="100"
											value={item.max_contribution_percent ?? ''}
											disabled={isReadOnly}
											oninput={(e) =>
												updateItem(globalIdx, {
													max_contribution_percent: e.currentTarget.value
														? Number(e.currentTarget.value)
														: null
												})}
											placeholder="Leave blank = no limit"
											class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
										/>
									</div>
								</div>

								<div>
									<span class="text-[11px] text-gray-500">Required Conditions</span>
									<div class="mt-1 flex flex-wrap gap-1.5">
										{#each INCOME_CONDITIONS as cond}
											<button
												type="button"
												disabled={isReadOnly}
												onclick={() => toggleCondition(globalIdx, cond.value)}
												class="rounded px-2 py-1 text-[11px] font-medium transition-colors
													{item.conditions.includes(cond.value)
													? 'bg-blue-100 text-blue-700'
													: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
											>
												{cond.label}
											</button>
										{/each}
									</div>
								</div>

								<div>
									<label for="other-{item.profile_type}-notes" class="text-[11px] text-gray-500"
										>Special Notes</label
									>
									<input
										id="other-{item.profile_type}-notes"
										type="text"
										value={item.special_notes ?? ''}
										disabled={isReadOnly}
										oninput={(e) =>
											updateItem(globalIdx, { special_notes: e.currentTarget.value || null })}
										placeholder="Any special conditions..."
										class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-300 disabled:bg-gray-100"
									/>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
</div>
