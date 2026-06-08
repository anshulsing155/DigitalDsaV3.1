<script lang="ts">
	import { AlertTriangle, CheckCircle, CreditCard, Code2, LayoutTemplate, ChevronRight } from 'lucide-svelte';
	import type { Pass2Clause, ConditionalOverride } from '$lib/config/pms/policyTypes.js';

	let {
		clauses,
		encodings,
		decisions,
		isLoading,
		onEncodingsChange,
		onVerify
	}: {
		clauses: Pass2Clause[];
		encodings: Partial<ConditionalOverride>[];
		decisions: Record<string, string>;
		isLoading: boolean;
		onEncodingsChange: (e: Partial<ConditionalOverride>[]) => void;
		onVerify: (encodings: Partial<ConditionalOverride>[]) => Promise<void>;
	} = $props();

	// Only show in-scope clauses in the encoding panel
	const inScopeClauses = $derived(
		clauses.filter((c) => decisions[c.id] !== 'out_of_scope' && decisions[c.id] !== 'bank_card')
	);

	// svelte-ignore state_referenced_locally
	let selectedClauseId = $state<string | null>(inScopeClauses[0]?.id ?? null);
	let activeTab = $state<'template' | 'custom_json' | 'bank_card'>('template');

	// Per-clause encoding state — keyed by clauseId
	type ClauseEncoding = {
		mode: 'template' | 'custom_json' | 'bank_card';
		templateId: string;
		templateValue: string; // value param for the selected template (e.g. "75" for LTV 75%)
		customJson: string;
		bankCardNote: string;
		customJsonConfirmed: boolean;
		isComplete: boolean;
	};

	// Initialize from server-side encodings
	// svelte-ignore state_referenced_locally
	let clauseEncodings = $state<Record<string, ClauseEncoding>>(
		Object.fromEntries(
			inScopeClauses.map((clause) => {
				const existing = encodings.find((e) => e.sourceClauseId === clause.id);
				const cond = existing?.condition as Record<string, unknown> | null | undefined;
				return [
					clause.id,
					{
						mode: (existing?.authoringMode as 'template' | 'custom_json' | 'bank_card') ?? 'template',
						templateId: existing?.templateId ?? '',
						templateValue: (cond?.value as string) ?? '',
						customJson: cond && existing?.authoringMode === 'custom_json' ? JSON.stringify(cond, null, 2) : '',
						bankCardNote: existing?.notes ?? '',
						customJsonConfirmed: false,
						isComplete: !!existing?.authoringMode
					}
				];
			})
		)
	);

	const encodedCount = $derived(
		Object.values(clauseEncodings).filter((e) => e.isComplete).length
	);
	const canVerify = $derived(encodedCount === inScopeClauses.length && !isLoading);

	const selectedClause = $derived(inScopeClauses.find((c) => c.id === selectedClauseId));
	const selectedEncoding = $derived(
		selectedClauseId ? clauseEncodings[selectedClauseId] : null
	);

	// When RM manually switches from Template → Custom JSON: require confirmation
	const isManualCustomJson = $derived(
		activeTab === 'custom_json' &&
			selectedEncoding?.mode !== 'custom_json' // was template, now switching
	);

	function updateEncoding(clauseId: string, updates: Partial<ClauseEncoding>) {
		clauseEncodings = {
			...clauseEncodings,
			[clauseId]: { ...clauseEncodings[clauseId], ...updates }
		};
		syncEncodings();
	}

	function markComplete(clauseId: string) {
		const enc = clauseEncodings[clauseId];
		if (!enc) return;

		const isValid: boolean =
			(enc.mode === 'template' && !!enc.templateId.trim() && !!enc.templateValue.trim()) ||
			(enc.mode === 'custom_json' && !!enc.customJson.trim() && enc.customJsonConfirmed) ||
			(enc.mode === 'bank_card' && !!enc.bankCardNote.trim());

		updateEncoding(clauseId, { isComplete: isValid });
	}

	// Build the encodings array to pass back to the parent
	function syncEncodings() {
		const updated: Partial<ConditionalOverride>[] = inScopeClauses.map((clause) => {
			const enc = clauseEncodings[clause.id];
			// For template mode, condition carries the value param so it round-trips on resume
			const condition =
				enc?.mode === 'template' && enc.templateValue
					? { value: enc.templateValue }
					: enc?.mode === 'custom_json' && enc.customJson
						? (() => {
								try { return JSON.parse(enc.customJson); } catch { return null; }
							})()
						: null;
			return {
				sourceClauseId: clause.id,
				authoringMode: enc?.mode ?? 'template',
				templateId: enc?.templateId || null,
				notes: enc?.bankCardNote ?? '',
				condition
			};
		});
		onEncodingsChange(updated);
	}

	function validateJson(json: string): boolean {
		try {
			JSON.parse(json);
			return true;
		} catch {
			return false;
		}
	}

	function dotColor(clauseId: string): string {
		const enc = clauseEncodings[clauseId];
		if (!enc) return 'bg-gray-200';
		if (enc.isComplete) return 'bg-green-500';
		if (enc.mode === 'bank_card') return 'bg-blue-400';
		return 'bg-gray-300';
	}
</script>

<div class="flex h-full gap-5">
	<!-- ── Left sidebar: clause list ─────────────────────────────────────────── -->
	<div class="w-52 shrink-0 space-y-1">
		<div class="mb-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Clauses</p>
			<!-- Progress bar -->
			<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
				<div
					class="h-1.5 rounded-full bg-amber-500 transition-all duration-300"
					style="width: {inScopeClauses.length ? (encodedCount / inScopeClauses.length) * 100 : 0}%"
				></div>
			</div>
			<p class="mt-1 text-[10px] text-gray-400">
				{encodedCount} / {inScopeClauses.length} encoded
			</p>
		</div>

		{#each inScopeClauses as clause (clause.id)}
			<button
				type="button"
				onclick={() => { selectedClauseId = clause.id; activeTab = clauseEncodings[clause.id]?.mode ?? 'template'; }}
				class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors
				{selectedClauseId === clause.id
					? 'bg-amber-50 text-amber-700 font-medium'
					: 'text-gray-600 hover:bg-gray-50'}"
			>
				<span class="h-2 w-2 shrink-0 rounded-full {dotColor(clause.id)}"></span>
				<span class="line-clamp-2 flex-1">{clause.originalText.slice(0, 60)}…</span>
			</button>
		{/each}
	</div>

	<!-- ── Main panel: selected clause encoding ──────────────────────────────── -->
	<div class="min-w-0 flex-1 space-y-4">
		{#if !selectedClause}
			<div class="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
				Select a clause to begin encoding
			</div>
		{:else}
			<!-- Clause text -->
			<div class="rounded-xl border border-gray-200 bg-white p-5">
				<p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
					Clause — {selectedClause.tag}
				</p>
				<p class="text-sm text-gray-700">{selectedClause.originalText}</p>
				{#if selectedClause.normalizedText !== selectedClause.originalText}
					<p class="mt-1.5 text-xs italic text-gray-400">
						Normalized: {selectedClause.normalizedText}
					</p>
				{/if}
			</div>

			<!-- Tab switcher -->
			<div class="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
				{#each (['template', 'custom_json', 'bank_card'] as const) as tab (tab)}
					<button
						type="button"
						onclick={() => {
							activeTab = tab;
							if (tab !== clauseEncodings[selectedClauseId!]?.mode) {
								updateEncoding(selectedClauseId!, { mode: tab, customJsonConfirmed: false });
							}
						}}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs
						font-medium transition-colors
						{activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
					>
						{#if tab === 'template'}
							<LayoutTemplate size={12} /> Template
						{:else if tab === 'custom_json'}
							<Code2 size={12} /> Custom JSON
						{:else}
							<CreditCard size={12} /> Bank Card
						{/if}
					</button>
				{/each}
			</div>

			<!-- Tab A: Template -->
			{#if activeTab === 'template'}
				<div class="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
					<div>
						<label for="encoding-template" class="mb-1.5 block text-sm font-medium text-gray-700">
							Template
						</label>
						<select
							id="encoding-template"
							value={selectedEncoding?.templateId ?? ''}
							onchange={(e) => updateEncoding(selectedClauseId!, {
								templateId: (e.target as HTMLSelectElement).value,
								mode: 'template'
							})}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
							focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
						>
							<option value="">— Select a template —</option>
							<option value="ltv_max_percent">LTV max percent</option>
							<option value="foir_max_percent">FOIR max percent</option>
							<option value="min_credit_score">Minimum credit score</option>
							<option value="max_age_primary">Maximum age (primary applicant)</option>
							<option value="min_income">Minimum income</option>
							<option value="tenure_max_months">Maximum tenure (months)</option>
							<option value="roi_base_percent">ROI base percent</option>
							<option value="roi_spread_over_repo">ROI spread over repo rate</option>
							<option value="processing_fee_percent">Processing fee percent</option>
							<option value="bt_down_payment">BT down payment percent</option>
							<option value="nri_ltv_max">NRI LTV max</option>
							<option value="salaried_foir_override">Salaried FOIR override</option>
							<option value="self_employed_foir_override">Self-employed FOIR override</option>
							<option value="geo_state_exclude">Geo state exclusion</option>
							<option value="geo_city_exclude">Geo city exclusion</option>
							<option value="credit_card_foir_method">Credit card FOIR method</option>
							<option value="prepayment_charge">Prepayment charge</option>
							<option value="rental_income_cap">Rental income cap</option>
							<option value="pensioner_max_age">Pensioner max age</option>
							<option value="min_loan_amount">Minimum loan amount</option>
							<option value="max_loan_amount">Maximum loan amount</option>
							<option value="property_stage_restriction">Property stage restriction</option>
						</select>
					</div>

					{#if selectedEncoding?.templateId}
						<div>
							<label for="encoding-value" class="mb-1 block text-sm font-medium text-gray-700">
								Value
							</label>
							<input
								id="encoding-value"
								type="text"
								value={selectedEncoding?.templateValue ?? ''}
								oninput={(e) => updateEncoding(selectedClauseId!, {
									templateValue: (e.target as HTMLInputElement).value
								})}
								placeholder="e.g. 75 (for 75%)"
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
								focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
							/>
						</div>
					{/if}

					<button
						type="button"
						onclick={() => markComplete(selectedClauseId!)}
						disabled={!selectedEncoding?.templateId}
						class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium
						text-white hover:bg-green-700 disabled:opacity-40"
					>
						<CheckCircle size={14} /> Mark as encoded
					</button>
				</div>

			<!-- Tab B: Custom JSON -->
			{:else if activeTab === 'custom_json'}
				<div class="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
					<!-- Amber banner — always shown for custom JSON -->
					<div class="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
						<AlertTriangle size={13} class="mt-0.5 shrink-0" />
						{#if isManualCustomJson}
							<span>
								You are overriding the template suggestion. Please ensure your JSON-Logic
								is correct before proceeding.
							</span>
						{:else}
							<span>
								AI could not find a template for this clause — custom JSON was used.
								Review carefully before accepting.
							</span>
						{/if}
					</div>

					<div>
						<label for="encoding-json" class="mb-1 block text-sm font-medium text-gray-700">
							JSON-Logic condition
						</label>
						<textarea
							id="encoding-json"
							value={selectedEncoding?.customJson ?? ''}
							oninput={(e) => updateEncoding(selectedClauseId!, {
								customJson: (e.target as HTMLTextAreaElement).value
							})}
							rows={8}
							spellcheck={false}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs
							text-gray-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
							placeholder={'{\n  ">=": [{"var": "creditScore"}, 700]\n}'}
						></textarea>
						{#if selectedEncoding?.customJson && !validateJson(selectedEncoding.customJson)}
							<p class="mt-1 text-xs text-red-500">Invalid JSON — fix syntax before confirming.</p>
						{/if}
					</div>

					<!-- Confirmation checkbox — required only when manually switching to custom JSON -->
					{#if isManualCustomJson}
						<label class="flex cursor-pointer items-start gap-2.5 text-sm">
							<input
								type="checkbox"
								checked={selectedEncoding?.customJsonConfirmed ?? false}
								onchange={(e) => updateEncoding(selectedClauseId!, {
									customJsonConfirmed: (e.target as HTMLInputElement).checked
								})}
								class="mt-0.5"
							/>
							<span class="text-gray-700">I confirm this custom JSON-Logic is correct</span>
						</label>
					{/if}

					<button
						type="button"
						onclick={() => markComplete(selectedClauseId!)}
						disabled={
							!selectedEncoding?.customJson ||
							!validateJson(selectedEncoding.customJson) ||
							(isManualCustomJson && !selectedEncoding?.customJsonConfirmed)
						}
						class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium
						text-white hover:bg-green-700 disabled:opacity-40"
					>
						<CheckCircle size={14} /> Accept encoding
					</button>
				</div>

			<!-- Tab C: Bank Card -->
			{:else}
				<div class="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
					<p class="text-sm text-gray-600">
						This clause will appear as a plain-language note on the DSA bank card.
						It will not be encoded as a JSON-Logic rule.
					</p>

					<div>
						<label for="encoding-bankcard" class="mb-1 block text-sm font-medium text-gray-700">
							Bank card note
						</label>
						<textarea
							id="encoding-bankcard"
							value={selectedEncoding?.bankCardNote ?? ''}
							oninput={(e) => updateEncoding(selectedClauseId!, {
								bankCardNote: (e.target as HTMLTextAreaElement).value,
								mode: 'bank_card'
							})}
							rows={4}
							placeholder="Plain-language note for the DSA bank card…"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700
							outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
						></textarea>
					</div>

					<button
						type="button"
						onclick={() => markComplete(selectedClauseId!)}
						disabled={!selectedEncoding?.bankCardNote?.trim()}
						class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium
						text-white hover:bg-blue-700 disabled:opacity-40"
					>
						<CreditCard size={14} /> Save bank card note
					</button>
				</div>
			{/if}

			<!-- Verify button (shown when all clauses encoded) -->
			{#if canVerify}
				<div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
					<p class="mb-2 text-sm font-medium text-green-800">
						All {inScopeClauses.length} clauses encoded — ready to verify.
					</p>
					<button
						type="button"
						onclick={() => onVerify(encodings)}
						disabled={isLoading}
						class="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold
						text-white hover:bg-amber-700 disabled:opacity-40"
					>
						{#if isLoading}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							Verifying encodings…
						{:else}
							Verify Encodings <ChevronRight size={15} />
						{/if}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
