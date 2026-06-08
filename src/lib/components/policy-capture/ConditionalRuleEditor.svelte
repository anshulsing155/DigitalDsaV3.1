<script lang="ts">
	import type { ConditionalRule } from '$lib/types/policyCapture.js';

	/**
	 * Per-condition-type config: default row labels + value hints.
	 * RM can add, remove, or rename rows within each block.
	 */
	interface ConditionConfig {
		options: string[];
		valueLabel?: string;
		valuePlaceholder?: string;
	}

	interface Props {
		rules: ConditionalRule[];
		label?: string;
		conditionTypes?: { value: string; label: string }[];
		conditionConfigs?: Record<string, ConditionConfig>;
		isReadOnly: boolean;
		onUpdate: (rules: ConditionalRule[]) => void;
	}

	const DEFAULT_CONDITION_TYPES = [
		{ value: 'cibil_range', label: 'CIBIL Score Range' },
		{ value: 'loan_amount', label: 'Loan Amount Slab' },
		{ value: 'employment', label: 'Employment Type' },
		{ value: 'women_applicant', label: 'Women Applicant' },
		{ value: 'category', label: 'SC / ST / OBC' },
		{ value: 'govt_defence', label: 'Govt / Defence Employee' },
		{ value: 'income_level', label: 'Income Level' },
		{ value: 'property_type', label: 'Property Type' },
		{ value: 'geography', label: 'City / Zone' },
		{ value: 'age_group', label: 'Age Group' },
		{ value: 'scheme', label: 'Special Scheme' },
		{ value: 'combined', label: 'Combined (Multiple Factors)' },
		{ value: 'custom', label: 'Other / Custom' }
	];

	const DEFAULT_CONDITION_CONFIGS: Record<string, ConditionConfig> = {
		cibil_range: {
			options: ['800+', '750–799', '700–749', '650–699', 'Below 650', 'New to Credit / NTC'],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '8.5'
		},
		loan_amount: {
			options: [
				'Above ₹1 Cr',
				'₹75L – 1 Cr',
				'₹50L – 75L',
				'₹30L – 50L',
				'₹10L – 30L',
				'Below ₹10L'
			],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '8.75'
		},
		employment: {
			options: [
				'Salaried',
				'Self-Employed Business',
				'Self-Employed Professional',
				'Pensioner',
				'Agriculturist'
			],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '9.0'
		},
		women_applicant: {
			options: ['Women (primary applicant)', 'Women (co-applicant)'],
			valueLabel: 'Concession (%)',
			valuePlaceholder: '-0.05'
		},
		category: {
			options: ['SC', 'ST', 'OBC', 'EWS'],
			valueLabel: 'Concession (%)',
			valuePlaceholder: '-0.10'
		},
		govt_defence: {
			options: [
				'Central Govt',
				'State Govt',
				'Defence / Paramilitary',
				'PSU Employee',
				'Railway',
				'Police'
			],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '8.25'
		},
		income_level: {
			options: ['Above ₹2L / month', '₹1L – 2L / month', '₹50K – 1L / month', 'Below ₹50K / month'],
			valueLabel: 'Value',
			valuePlaceholder: '50%'
		},
		property_type: {
			options: [
				'Ready / Resale',
				'Under Construction',
				'Plot / Land',
				'Independent House / Villa',
				'Commercial'
			],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '8.75'
		},
		geography: {
			options: [
				'Metro Cities',
				'Tier-1 Cities',
				'Tier-2 Cities',
				'Tier-3 / Rural',
				'Specific State'
			],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '9.0'
		},
		age_group: {
			options: ['Below 25 years', '25–35 years', '35–45 years', '45–55 years', 'Above 55 years'],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '9.25'
		},
		scheme: {
			options: [
				'Festive Offer',
				'Top-up Scheme',
				'Balance Transfer',
				'Staff Housing',
				'Builder Tie-up',
				'PMAY'
			],
			valueLabel: 'Rate (%)',
			valuePlaceholder: '8.25'
		}
	};

	// Types that use a single free-text row instead of a rate card
	const FREE_TEXT_TYPES = new Set(['combined', 'custom']);

	let {
		// Default to [] so a capture with missing/partial step data (no
		// conditional-rule array) renders empty instead of throwing on
		// `rules.length` during SSR. See A.2 Slice 4a smoke (2026-05-21).
		rules = [],
		label = 'Conditional Rules',
		conditionTypes = DEFAULT_CONDITION_TYPES,
		conditionConfigs,
		isReadOnly,
		onUpdate
	}: Props = $props();

	const configs = $derived({ ...DEFAULT_CONDITION_CONFIGS, ...(conditionConfigs ?? {}) });

	// ── Group rules by condition_type for rate-card rendering ───────
	interface RuleGroup {
		type: string;
		typeLabel: string;
		entries: { rule: ConditionalRule; globalIndex: number }[];
	}

	let groups = $derived.by((): RuleGroup[] => {
		const result: RuleGroup[] = [];
		const seen = new Map<string, RuleGroup>();

		for (let i = 0; i < rules.length; i++) {
			const rule = rules[i]!;
			const existing = seen.get(rule.condition_type);
			if (existing) {
				existing.entries.push({ rule, globalIndex: i });
			} else {
				const typeLabel =
					conditionTypes.find((ct) => ct.value === rule.condition_type)?.label ??
					rule.condition_type;
				const group: RuleGroup = {
					type: rule.condition_type,
					typeLabel,
					entries: [{ rule, globalIndex: i }]
				};
				result.push(group);
				seen.set(rule.condition_type, group);
			}
		}
		return result;
	});

	// Types already added (to filter the "Add" dropdown)
	let usedTypes = $derived(new Set(rules.map((r) => r.condition_type)));

	// Available types to add (exclude already-used, except free-text types which allow multiples)
	let availableTypes = $derived(
		conditionTypes.filter((ct) => !usedTypes.has(ct.value) || FREE_TEXT_TYPES.has(ct.value))
	);

	// ── Dropdown state ─────────────────────────────────────────────
	let showAddDropdown = $state(false);

	// ── Inline editing state ───────────────────────────────────────
	let editingRow = $state<string | null>(null); // "globalIndex" as string
	let editRowText = $state('');
	let addingRowForType = $state<string | null>(null);
	let newRowText = $state('');

	// ── Actions ────────────────────────────────────────────────────

	/** Add a new condition type block with all its default rows */
	function addConditionBlock(type: string) {
		showAddDropdown = false;
		const config = configs[type];

		if (FREE_TEXT_TYPES.has(type) || !config?.options?.length) {
			// Single free-text entry
			onUpdate([
				...rules,
				{ condition_description: '', condition_type: type, value: '', value_label: '' }
			]);
			return;
		}

		// Add all default options as rows at once
		const newRules: ConditionalRule[] = config.options.map((opt) => ({
			condition_description: opt,
			condition_type: type,
			value: '',
			value_label: ''
		}));
		onUpdate([...rules, ...newRules]);
	}

	/** Remove an entire condition type block */
	function removeBlock(type: string) {
		onUpdate(rules.filter((r) => r.condition_type !== type));
	}

	/** Remove a single row by global index */
	function removeRow(globalIndex: number) {
		onUpdate(rules.filter((_, i) => i !== globalIndex));
	}

	/** Update a field on a specific row */
	function updateRow(globalIndex: number, field: keyof ConditionalRule, val: string) {
		const updated = rules.map((r, i) => (i === globalIndex ? { ...r, [field]: val } : r));
		onUpdate(updated);
	}

	/** Add a new row to an existing block */
	function addRowToBlock(type: string) {
		const text = newRowText.trim();
		if (!text) return;
		// Insert after the last rule of this type
		const lastIdx = rules.reduce((acc, r, i) => (r.condition_type === type ? i : acc), -1);
		const newRule: ConditionalRule = {
			condition_description: text,
			condition_type: type,
			value: '',
			value_label: ''
		};
		const updated = [...rules];
		updated.splice(lastIdx + 1, 0, newRule);
		onUpdate(updated);
		newRowText = '';
		addingRowForType = null;
	}

	/** Start inline editing a row label */
	function startEdit(globalIndex: number, currentText: string) {
		editingRow = String(globalIndex);
		editRowText = currentText;
	}

	function saveEdit(globalIndex: number) {
		const text = editRowText.trim();
		if (text) updateRow(globalIndex, 'condition_description', text);
		editingRow = null;
		editRowText = '';
	}

	function cancelEdit() {
		editingRow = null;
		editRowText = '';
	}

	function handleEditKeydown(e: KeyboardEvent, globalIndex: number) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEdit(globalIndex);
		} else if (e.key === 'Escape') cancelEdit();
	}

	function handleAddRowKeydown(e: KeyboardEvent, type: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addRowToBlock(type);
		} else if (e.key === 'Escape') {
			addingRowForType = null;
			newRowText = '';
		}
	}

	/** Svelte action: focuses an input on mount without using the `autofocus` HTML attribute */
	function autoFocusAction(node: HTMLElement) {
		node.focus();
	}
</script>

<div class="space-y-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">{label}</p>
		{#if !isReadOnly}
			<div class="relative">
				<button
					type="button"
					onclick={() => (showAddDropdown = !showAddDropdown)}
					class="rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
				>
					+ Add Rate Card
				</button>

				{#if showAddDropdown && availableTypes.length > 0}
					<div
						class="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
						role="menu"
					>
						{#each availableTypes as ct}
							<button
								type="button"
								onclick={() => addConditionBlock(ct.value)}
								class="w-full px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:bg-amber-50 hover:text-amber-800"
							>
								{ct.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Close dropdown on outside click -->
	{#if showAddDropdown}
		<button
			type="button"
			class="fixed inset-0 z-10 cursor-default border-none bg-transparent"
			onclick={() => (showAddDropdown = false)}
			aria-label="Close dropdown"
			tabindex="-1"
		></button>
	{/if}

	{#if groups.length === 0}
		<p class="text-xs text-gray-400 italic">
			No conditions yet. Click "+ Add Rate Card" to define how values vary by CIBIL, loan amount,
			employment type, etc.
		</p>
	{/if}

	<!-- Render each condition type as a rate card block -->
	{#each groups as group}
		{@const config = configs[group.type]}
		{@const isFreeText = FREE_TEXT_TYPES.has(group.type)}
		{@const valueLabel = config?.valueLabel ?? 'Value'}
		{@const valuePlaceholder = config?.valuePlaceholder ?? ''}

		<div class="overflow-hidden rounded-lg border border-amber-100 bg-amber-50/30">
			<!-- Block header -->
			<div
				class="flex items-center justify-between border-b border-amber-100 bg-amber-50/60 px-3 py-2"
			>
				<span class="text-xs font-semibold text-amber-800">{group.typeLabel}</span>
				{#if !isReadOnly}
					<button
						type="button"
						onclick={() => removeBlock(group.type)}
						class="text-[11px] text-red-400 hover:text-red-600"
					>
						Remove All
					</button>
				{/if}
			</div>

			{#if isFreeText}
				<!-- Free-text entries (combined / custom) -->
				<div class="space-y-2 p-3">
					{#each group.entries as { rule, globalIndex }}
						<div class="grid gap-2 sm:grid-cols-2">
							<div>
								<label for={`cond-desc-${globalIndex}`} class="text-[11px] text-gray-500"
									>When / Description</label
								>
								<input
									id={`cond-desc-${globalIndex}`}
									type="text"
									value={rule.condition_description}
									disabled={isReadOnly}
									oninput={(e) =>
										updateRow(globalIndex, 'condition_description', e.currentTarget.value)}
									placeholder={group.type === 'combined'
										? 'e.g., Salaried + CIBIL 750+ + Loan > ₹50L'
										: 'Describe the condition'}
									class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-amber-300 disabled:bg-gray-100"
								/>
							</div>
							<div class="flex items-end gap-1">
								<div class="flex-1">
									<label for={`cond-val-${globalIndex}`} class="text-[11px] text-gray-500"
										>{valueLabel}</label
									>
									<input
										id={`cond-val-${globalIndex}`}
										type="text"
										value={typeof rule.value === 'string' ? rule.value : String(rule.value)}
										disabled={isReadOnly}
										oninput={(e) => updateRow(globalIndex, 'value', e.currentTarget.value)}
										placeholder={valuePlaceholder}
										class="mt-0.5 w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-amber-300 disabled:bg-gray-100"
									/>
								</div>
								{#if !isReadOnly}
									<button
										type="button"
										onclick={() => removeRow(globalIndex)}
										class="mb-0.5 text-[11px] text-red-300 hover:text-red-500"
										title="Remove row">✕</button
									>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Rate card table -->
				<div class="divide-y divide-amber-50">
					<!-- Column headers -->
					<div class="grid grid-cols-[1fr_auto_auto] items-center gap-2 bg-amber-50/40 px-3 py-1.5">
						<span class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
							>When</span
						>
						<span class="w-28 text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
							>{valueLabel}</span
						>
						{#if !isReadOnly}
							<span class="w-5"></span>
						{/if}
					</div>

					<!-- Rows -->
					{#each group.entries as { rule, globalIndex }}
						<div
							class="group grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5 transition-colors hover:bg-amber-50/40"
						>
							<!-- Row label (editable) -->
							{#if editingRow === String(globalIndex) && !isReadOnly}
								<div class="flex items-center gap-1">
									<input
										type="text"
										bind:value={editRowText}
										onkeydown={(e) => handleEditKeydown(e, globalIndex)}
										class="w-full rounded border border-amber-400 bg-white px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-amber-300"
										use:autoFocusAction
									/>
									<button
										type="button"
										onclick={() => saveEdit(globalIndex)}
										class="text-xs text-green-600 hover:text-green-800">✓</button
									>
									<button
										type="button"
										onclick={cancelEdit}
										class="text-xs text-gray-400 hover:text-gray-600">✕</button
									>
								</div>
							{:else}
								<button
									type="button"
									disabled={isReadOnly}
									ondblclick={() => startEdit(globalIndex, rule.condition_description)}
									class="text-left text-xs font-medium text-gray-700 disabled:cursor-default"
									title={isReadOnly ? '' : 'Double-click to rename'}
								>
									{rule.condition_description || '(empty)'}
								</button>
							{/if}

							<!-- Value input -->
							<input
								type="text"
								value={typeof rule.value === 'string' ? rule.value : String(rule.value)}
								disabled={isReadOnly}
								oninput={(e) => updateRow(globalIndex, 'value', e.currentTarget.value)}
								placeholder={valuePlaceholder}
								class="w-28 rounded border border-gray-200 px-2 py-1 text-right text-xs outline-none focus:border-amber-300 disabled:bg-gray-100"
							/>

							<!-- Delete row -->
							{#if !isReadOnly}
								<button
									type="button"
									onclick={() => removeRow(globalIndex)}
									class="w-5 text-center text-[11px] text-red-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
									title="Remove row">✕</button
								>
							{/if}
						</div>
					{/each}

					<!-- Add row -->
					{#if !isReadOnly}
						<div class="px-3 py-1.5">
							{#if addingRowForType === group.type}
								<div class="flex items-center gap-1">
									<input
										type="text"
										bind:value={newRowText}
										onkeydown={(e) => handleAddRowKeydown(e, group.type)}
										placeholder="Type label & press Enter"
										class="flex-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-300"
										use:autoFocusAction
									/>
									<button
										type="button"
										onclick={() => addRowToBlock(group.type)}
										class="text-xs text-green-600 hover:text-green-800">✓</button
									>
									<button
										type="button"
										onclick={() => {
											addingRowForType = null;
											newRowText = '';
										}}
										class="text-xs text-gray-400 hover:text-gray-600">✕</button
									>
								</div>
							{:else}
								<button
									type="button"
									onclick={() => {
										addingRowForType = group.type;
										newRowText = '';
									}}
									class="text-[11px] text-amber-600 hover:text-amber-800 hover:underline"
								>
									+ Add row
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>
