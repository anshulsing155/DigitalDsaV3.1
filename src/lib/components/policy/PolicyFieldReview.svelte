<script lang="ts">
	import type { PolicyFields, PolicyFieldKey } from '$lib/types/policyEngine.js';
	import {
		FIELD_GROUPS,
		POLICY_FIELD_LABELS,
		formatPolicyValue,
		isBooleanField
	} from '$lib/config/policyFieldUtils.js';

	type ValidationStatus = 'pending' | 'correct' | 'wrong';

	export interface FieldValidation {
		status: ValidationStatus;
		note: string;
	}

	interface Props {
		policyFields: PolicyFields;
		lenderName: string;
		productLabel: string;
		variationLabel: string;
		geoLabel: string;
		versionNumber: number;
		effectiveFrom?: string | null;
		sourceType?: string | null;
		readonly?: boolean;
		onvalidationchange?: (validations: Record<string, FieldValidation>) => void;
	}

	let {
		policyFields,
		lenderName,
		productLabel,
		variationLabel,
		geoLabel,
		versionNumber,
		effectiveFrom = null,
		sourceType = null,
		readonly: isReadonly = false,
		onvalidationchange
	}: Props = $props();

	// Build the list of present field keys
	const presentFieldKeys = $derived(new Set(Object.keys(policyFields)));

	// Active groups: only groups that have at least one present field
	const activeGroups = $derived(
		FIELD_GROUPS.map((group) => ({
			...group,
			activeKeys: group.keys.filter((k) => presentFieldKeys.has(k))
		})).filter((g) => g.activeKeys.length > 0)
	);

	// Total field count across all active groups
	const totalFields = $derived(activeGroups.reduce((sum, g) => sum + g.activeKeys.length, 0));

	// Per-field validation state
	let validations = $state<Record<string, FieldValidation>>({});

	// Initialize validations for all present fields
	$effect(() => {
		const newValidations: Record<string, FieldValidation> = {};
		for (const group of activeGroups) {
			for (const key of group.activeKeys) {
				newValidations[key] = validations[key] || { status: 'pending', note: '' };
			}
		}
		validations = newValidations;
	});

	// Computed counts
	const verifiedCount = $derived(
		Object.values(validations).filter((v) => v.status !== 'pending').length
	);
	const correctCount = $derived(
		Object.values(validations).filter((v) => v.status === 'correct').length
	);
	const wrongCount = $derived(
		Object.values(validations).filter((v) => v.status === 'wrong').length
	);

	// Notify parent on change
	$effect(() => {
		// Access all validation values to track changes
		const snapshot = JSON.stringify(validations);
		if (snapshot && onvalidationchange) {
			onvalidationchange(validations);
		}
	});

	function setFieldStatus(key: string, status: ValidationStatus) {
		if (isReadonly) return;
		validations[key] = {
			...validations[key],
			status: validations[key]?.status === status ? 'pending' : status,
			note: validations[key]?.note || ''
		};
	}

	function setFieldNote(key: string, note: string) {
		if (isReadonly) return;
		validations[key] = { ...validations[key], note };
	}

	// Per-group verification counts
	function groupVerifiedCount(activeKeys: PolicyFieldKey[]): number {
		return activeKeys.filter((k) => validations[k]?.status !== 'pending').length;
	}

	function groupAllCorrect(activeKeys: PolicyFieldKey[]): boolean {
		return activeKeys.every((k) => validations[k]?.status === 'correct');
	}

	function formatEffectiveDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// Expose validations for parent to read
	export function getValidations(): Record<string, FieldValidation> {
		return validations;
	}

	export function getAllVerified(): boolean {
		return totalFields > 0 && verifiedCount === totalFields;
	}

	export function getAllCorrect(): boolean {
		return totalFields > 0 && correctCount === totalFields;
	}

	export function getWrongFields(): Array<{ key: string; label: string; note: string }> {
		return Object.entries(validations)
			.filter(([, v]) => v.status === 'wrong')
			.map(([key, v]) => ({
				key,
				label: POLICY_FIELD_LABELS[key as PolicyFieldKey] || key,
				note: v.note
			}));
	}
</script>

<!-- Header -->
<div class="space-y-5">
	<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-5">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-lg font-bold text-[var(--dash-text-primary)]">{lenderName}</h2>
				<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">
					{productLabel} &mdash; {variationLabel}
				</p>
				<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--dash-text-muted)]">
					<span
						class="inline-flex items-center gap-1 rounded-full bg-[var(--ddsa-primary-50)] px-2.5 py-0.5 text-[var(--ddsa-primary-700)]"
					>
						<svg
							class="h-3 w-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z"
							/>
						</svg>
						{geoLabel}
					</span>
					<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600">v{versionNumber}</span>
					{#if effectiveFrom}
						<span class="text-[var(--dash-text-muted)]">
							Effective: {formatEffectiveDate(effectiveFrom)}
						</span>
					{/if}
					{#if sourceType}
						<span class="text-[var(--dash-text-muted)]">Source: {sourceType}</span>
					{/if}
				</div>
			</div>
			{#if !isReadonly && totalFields > 0}
				<div class="shrink-0 text-right">
					<div class="text-2xl font-bold text-[var(--dash-text-primary)]">
						{verifiedCount}<span class="text-sm font-normal text-[var(--dash-text-muted)]"
							>/{totalFields}</span
						>
					</div>
					<p class="text-xs text-[var(--dash-text-muted)]">fields reviewed</p>
					{#if wrongCount > 0}
						<p class="mt-0.5 text-xs font-medium text-red-600">{wrongCount} marked wrong</p>
					{/if}
				</div>
			{/if}
		</div>

		{#if !isReadonly && totalFields > 0}
			<!-- Progress bar -->
			<div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
				<div
					class="h-full rounded-full transition-all duration-300"
					style="width: {(verifiedCount / totalFields) * 100}%; background-color: {wrongCount > 0
						? '#f59e0b'
						: '#22c55e'};"
				></div>
			</div>
		{/if}
	</div>

	<!-- Field Groups -->
	{#if activeGroups.length === 0}
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
		>
			<p class="text-sm text-[var(--dash-text-muted)] italic">
				No policy fields have been set for this version.
			</p>
		</div>
	{:else}
		{#each activeGroups as group}
			{@const gVerified = groupVerifiedCount(group.activeKeys)}
			{@const gAll = group.activeKeys.length}
			{@const gAllCorrect = groupAllCorrect(group.activeKeys)}
			<div
				class="overflow-hidden rounded-xl border transition-colors duration-200
					{gAllCorrect && !isReadonly
					? 'border-green-200 bg-green-50/30'
					: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)]'}"
			>
				<!-- Group Header -->
				<div
					class="flex items-center justify-between border-b border-[var(--dash-border)] px-5 py-3"
				>
					<h3 class="text-sm font-semibold text-[var(--dash-text-primary)]">{group.title}</h3>
					{#if !isReadonly}
						<span class="text-xs text-[var(--dash-text-muted)]">
							{gVerified}/{gAll} reviewed
						</span>
					{/if}
				</div>

				<!-- Fields -->
				<div class="divide-y divide-[var(--dash-border)]">
					{#each group.activeKeys as fieldKey}
						{@const val = policyFields[fieldKey]}
						{@const formatted = formatPolicyValue(fieldKey, val)}
						{@const label = POLICY_FIELD_LABELS[fieldKey]}
						{@const isBool = isBooleanField(fieldKey)}
						{@const vStatus = validations[fieldKey]?.status || 'pending'}
						{@const vNote = validations[fieldKey]?.note || ''}

						<div class="px-5 py-3.5">
							<!-- Field row: label + value -->
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1">
									<span class="text-sm text-[var(--dash-text-secondary)]">{label}</span>
								</div>
								<div class="shrink-0 text-right">
									{#if isBool && typeof val === 'boolean'}
										<span
											class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
												{val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}"
										>
											{formatted}
										</span>
									{:else}
										<span class="text-sm font-medium text-[var(--dash-text-primary)]">
											{formatted}
										</span>
									{/if}
								</div>
							</div>

							<!-- Validation toggles -->
							{#if !isReadonly}
								<div class="mt-2 flex items-center gap-2">
									<button
										type="button"
										onclick={() => setFieldStatus(fieldKey, 'correct')}
										class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all
											{vStatus === 'correct'
											? 'bg-green-100 text-green-700 ring-1 ring-green-300'
											: 'bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600'}"
										title="Mark as correct"
									>
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2.5"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="m4.5 12.75 6 6 9-13.5"
											/>
										</svg>
										Correct
									</button>
									<button
										type="button"
										onclick={() => setFieldStatus(fieldKey, 'wrong')}
										class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all
											{vStatus === 'wrong'
											? 'bg-red-100 text-red-700 ring-1 ring-red-300'
											: 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600'}"
										title="Mark as wrong"
									>
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2.5"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M6 18 18 6M6 6l12 12"
											/>
										</svg>
										Wrong
									</button>
								</div>

								<!-- Correction note (shows when wrong) -->
								{#if vStatus === 'wrong'}
									<div class="mt-2">
										<input
											type="text"
											value={vNote}
											oninput={(e) => setFieldNote(fieldKey, (e.target as HTMLInputElement).value)}
											placeholder="What's wrong? e.g. 'Should be 8.5% not 9.0%'"
											class="w-full rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-sm text-[var(--dash-text-primary)] placeholder-red-300 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
										/>
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
