<script lang="ts">
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import {
		House,
		Landmark,
		TreePine,
		User,
		BriefcaseBusiness,
		Stethoscope,
		Check
	} from '$lib/utils/iconRegistry';
	import { bankData } from '$lib/config/bankSelection/bankName';

	// ── Loan Types ──
	const loanTypes = [
		{ id: 'Home Loan', label: 'Home Loan', icon: House },
		{ id: 'Loan Against Property', label: 'LAP', icon: Landmark },
		{ id: 'Plot and Construction Loan', label: 'Plot Loan', icon: TreePine },
		{ id: 'Personal Loan', label: 'Personal', icon: User },
		{ id: 'Business Loan', label: 'Business', icon: BriefcaseBusiness },
		{ id: 'Professional Loan', label: 'Professional', icon: Stethoscope }
	];

	function toggleLoanType(id: string) {
		const current = onboardingState.data.loanTypes || [];
		if (current.includes(id)) {
			onboardingState.data.loanTypes = current.filter((t: string) => t !== id);
		} else {
			onboardingState.data.loanTypes = [...current, id];
		}
		clearError('loanTypes');
	}

	// ── Lenders ──
	const lenders = bankData.map((b) => b.label);
	let lenderSearch = $state('');

	const filteredLenders = $derived(
		lenderSearch.length >= 1
			? lenders.filter((l) => l.toLowerCase().includes(lenderSearch.toLowerCase()))
			: lenders
	);

	function toggleLender(name: string) {
		const current = onboardingState.data.empanelledLenders || [];
		if (current.includes(name)) {
			onboardingState.data.empanelledLenders = current.filter((l: string) => l !== name);
		} else {
			onboardingState.data.empanelledLenders = [...current, name];
		}
		clearError('empanelledLenders');
	}

	// ── Volume ──
	const volumeOptions = [
		{ value: '1-5', label: '1–5 files' },
		{ value: '5-15', label: '5–15 files' },
		{ value: '15-30', label: '15–30 files' },
		{ value: '30+', label: '30+ files' }
	];

	function selectVolume(val: string) {
		onboardingState.data.monthlyVolume = val;
		clearError('monthlyVolume');
	}

	function clearError(field: string) {
		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated[field];
			return updated;
		});
	}

	const selectedLoanTypes = $derived(onboardingState.data.loanTypes || []);
	const selectedLenders = $derived(onboardingState.data.empanelledLenders || []);
</script>

<div class="space-y-8">
	<!-- Loan Types — icon card grid -->
	<div>
		<p class="mb-1 text-sm font-medium text-white/70">
			What loans do you handle? <span class="text-[var(--ddsa-error)]">*</span>
		</p>
		<p class="mb-3 text-xs text-white/30">Select all that apply</p>

		<div class="grid grid-cols-3 gap-2.5 md:grid-cols-3">
			{#each loanTypes as lt}
				{@const selected = selectedLoanTypes.includes(lt.id)}
				<button
					type="button"
					onclick={() => toggleLoanType(lt.id)}
					class="group relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-all
						{selected
						? 'border-[var(--ddsa-primary-400)]/60 bg-[var(--ddsa-primary-400)]/10'
						: 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'}"
				>
					{#if selected}
						<div
							class="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ddsa-primary-400)]"
						>
							<Check class="h-2.5 w-2.5 text-white" />
						</div>
					{/if}
					<lt.icon
						class="h-6 w-6 {selected ? 'text-[var(--ddsa-primary-300)]' : 'text-white/40'}"
					/>
					<span class="text-xs font-medium {selected ? 'text-white' : 'text-white/50'}">
						{lt.label}
					</span>
				</button>
			{/each}
		</div>

		{#if onboardingState.errors.loanTypes}
			<p class="mt-2 text-xs text-[var(--ddsa-error)]">{onboardingState.errors.loanTypes}</p>
		{/if}
	</div>

	<!-- Lenders — chip multi-select -->
	<div>
		<div class="mb-1 flex items-center justify-between">
			<p class="text-sm font-medium text-white/70">
				Lenders you work with <span class="text-[var(--ddsa-error)]">*</span>
			</p>
			{#if selectedLenders.length > 0}
				<span class="text-xs text-[var(--ddsa-primary-300)]">{selectedLenders.length} selected</span
				>
			{/if}
		</div>

		<!-- Search -->
		<input
			type="text"
			bind:value={lenderSearch}
			placeholder="Search lenders..."
			class="mb-3 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[var(--ddsa-primary-400)]/30"
		/>

		<!-- Chips -->
		<div
			class="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/[0.04] bg-white/[0.01] p-3"
		>
			{#each filteredLenders as lender}
				{@const selected = selectedLenders.includes(lender)}
				<button
					type="button"
					onclick={() => toggleLender(lender)}
					class="rounded-full border px-3 py-1.5 text-xs font-medium transition-all
						{selected
						? 'border-[var(--ddsa-primary-400)]/50 bg-[var(--ddsa-primary-400)]/15 text-[var(--ddsa-primary-200)]'
						: 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:border-white/[0.15] hover:text-white/70'}"
				>
					{#if selected}✓
					{/if}{lender}
				</button>
			{/each}
		</div>

		{#if onboardingState.errors.empanelledLenders}
			<p class="mt-2 text-xs text-[var(--ddsa-error)]">
				{onboardingState.errors.empanelledLenders}
			</p>
		{/if}
	</div>

	<!-- Monthly Volume — range chips -->
	<div>
		<p class="mb-1 text-sm font-medium text-white/70">
			Monthly file volume <span class="text-[var(--ddsa-error)]">*</span>
		</p>
		<p class="mb-3 text-xs text-white/30">How many loan files do you process monthly?</p>

		<div class="flex flex-wrap gap-2">
			{#each volumeOptions as vol}
				{@const selected = onboardingState.data.monthlyVolume === vol.value}
				<button
					type="button"
					onclick={() => selectVolume(vol.value)}
					class="rounded-full border-2 px-5 py-2.5 text-sm font-medium transition-all
						{selected
						? 'gold-gradient border-transparent shadow-[var(--ddsa-primary-400)]/15 shadow-md'
						: 'border-white/[0.08] bg-transparent text-white/50 hover:border-white/[0.15] hover:text-white/70'}"
				>
					{vol.label}
				</button>
			{/each}
		</div>

		{#if onboardingState.errors.monthlyVolume}
			<p class="mt-2 text-xs text-[var(--ddsa-error)]">{onboardingState.errors.monthlyVolume}</p>
		{/if}
	</div>
</div>
