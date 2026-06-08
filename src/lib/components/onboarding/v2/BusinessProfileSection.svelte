<script lang="ts">
	import type {
		DsaBusinessProfile,
		EmpanelledLender,
		TeamSize,
		MonthlyFileVolume,
		CurrentTool,
		LeadSource
	} from '$lib/types/dsaOnboardingV2';
	import { bankData } from '$lib/config/bankSelection/bankName';
	import { personalLoanType } from '$lib/config/applicantOptions/loanTypes';
	import {
		Building2,
		Plus,
		Trash2,
		Pencil,
		Check,
		X,
		ChevronDown,
		ChevronUp,
		MapPin,
		Phone,
		Mail,
		User,
		Landmark,
		AlertCircle
	} from '$lib/utils/iconRegistry';

	interface Props {
		data: DsaBusinessProfile;
		onUpdate: (data: DsaBusinessProfile) => void;
		errors?: Record<string, string>;
	}

	let { data, onUpdate, errors = {} }: Props = $props();

	// ── Internal reactive state (one-time snapshot from prop) ───
	// svelte-ignore state_referenced_locally
	let firmName = $state(data.firm_name ?? '');
	// svelte-ignore state_referenced_locally
	let gstin = $state(data.gstin ?? '');
	// svelte-ignore state_referenced_locally
	let yearsInBusiness = $state(data.years_in_business ?? 0);
	// svelte-ignore state_referenced_locally
	let teamSize = $state<TeamSize>(data.team_size);
	// svelte-ignore state_referenced_locally
	let monthlyFileVolume = $state<MonthlyFileVolume>(data.monthly_file_volume);
	// svelte-ignore state_referenced_locally
	let primaryLoanTypes = $state<string[]>([...data.primary_loan_types]);
	// svelte-ignore state_referenced_locally
	let empanelledLenders = $state<EmpanelledLender[]>(
		data.empanelled_lenders.map((l) => ({ ...l }))
	);
	// svelte-ignore state_referenced_locally
	let city = $state(data.geography.city);
	// svelte-ignore state_referenced_locally
	let areasOfOperation = $state((data.geography.areas_of_operation ?? []).join(', '));
	// svelte-ignore state_referenced_locally
	let currentTools = $state<CurrentTool[]>([...data.current_tools]);
	// svelte-ignore state_referenced_locally
	let hasWebsite = $state(data.has_website);
	// svelte-ignore state_referenced_locally
	let leadSources = $state<LeadSource[]>([...data.lead_sources]);

	// ── Lender form state ────────────────────────────────────────
	let showLenderForm = $state(false);
	let editingLenderIndex = $state<number | null>(null);
	let lenderForm = $state<EmpanelledLender>({
		lender_name: '',
		has_direct_code: false,
		dsa_code: '',
		rm_name: '',
		rm_phone: '',
		rm_email: ''
	});
	let showRmDetails = $state(false);

	// ── Options ──────────────────────────────────────────────────
	const lenderOptions = bankData.map((b) => ({ label: b.label, value: b.value }));

	const teamSizeOptions: { value: TeamSize; label: string; description: string }[] = [
		{ value: 'solo', label: 'Solo', description: 'Just me' },
		{ value: '2-5', label: '2-5', description: 'Small team' },
		{ value: '6-15', label: '6-15', description: 'Growing team' },
		{ value: '15+', label: '15+', description: 'Large operation' }
	];

	const fileVolumeOptions: { value: MonthlyFileVolume; label: string; description: string }[] = [
		{ value: '0-5', label: '0-5', description: 'Getting started' },
		{ value: '5-15', label: '5-15', description: 'Steady flow' },
		{ value: '15-30', label: '15-30', description: 'High volume' },
		{ value: '30+', label: '30+', description: 'Power user' }
	];

	const toolOptions: { value: CurrentTool; label: string }[] = [
		{ value: 'excel', label: 'Excel / Sheets' },
		{ value: 'paper', label: 'Paper / Register' },
		{ value: 'whatsapp', label: 'WhatsApp' },
		{ value: 'other_software', label: 'Other Software' },
		{ value: 'none', label: 'None' }
	];

	const leadSourceOptions: { value: LeadSource; label: string }[] = [
		{ value: 'self', label: 'Self Generated' },
		{ value: 'broker', label: 'Broker Network' },
		{ value: 'builder', label: 'Builder Tie-ups' },
		{ value: 'ca', label: 'CA / Professional' },
		{ value: 'digital', label: 'Digital / Online' },
		{ value: 'walk_in', label: 'Walk-in' },
		{ value: 'referral', label: 'Referral' }
	];

	// ── Emit updates ─────────────────────────────────────────────
	function emitUpdate() {
		const areas = areasOfOperation
			.split(',')
			.map((a) => a.trim())
			.filter(Boolean);
		onUpdate({
			firm_name: firmName || undefined,
			gstin: gstin || undefined,
			years_in_business: yearsInBusiness || undefined,
			team_size: teamSize,
			monthly_file_volume: monthlyFileVolume,
			primary_loan_types: primaryLoanTypes,
			empanelled_lenders: empanelledLenders,
			geography: {
				city,
				areas_of_operation: areas.length > 0 ? areas : undefined
			},
			current_tools: currentTools,
			has_website: hasWebsite,
			lead_sources: leadSources
		});
	}

	// ── Checkbox toggle helpers ──────────────────────────────────
	function toggleLoanType(val: string) {
		if (primaryLoanTypes.includes(val)) {
			primaryLoanTypes = primaryLoanTypes.filter((t) => t !== val);
		} else {
			primaryLoanTypes = [...primaryLoanTypes, val];
		}
		emitUpdate();
	}

	function toggleTool(val: CurrentTool) {
		if (currentTools.includes(val)) {
			currentTools = currentTools.filter((t) => t !== val);
		} else {
			currentTools = [...currentTools, val];
		}
		emitUpdate();
	}

	function toggleLeadSource(val: LeadSource) {
		if (leadSources.includes(val)) {
			leadSources = leadSources.filter((s) => s !== val);
		} else {
			leadSources = [...leadSources, val];
		}
		emitUpdate();
	}

	// ── Lender CRUD ──────────────────────────────────────────────
	function resetLenderForm() {
		lenderForm = {
			lender_name: '',
			has_direct_code: false,
			dsa_code: '',
			rm_name: '',
			rm_phone: '',
			rm_email: ''
		};
		showRmDetails = false;
		editingLenderIndex = null;
		showLenderForm = false;
	}

	function openAddLender() {
		resetLenderForm();
		showLenderForm = true;
	}

	function openEditLender(index: number) {
		const lender = empanelledLenders[index];
		lenderForm = { ...lender };
		showRmDetails = !!(lender.rm_name || lender.rm_phone || lender.rm_email);
		editingLenderIndex = index;
		showLenderForm = true;
	}

	function saveLender() {
		if (!lenderForm.lender_name) return;
		const entry: EmpanelledLender = {
			lender_name: lenderForm.lender_name,
			has_direct_code: lenderForm.has_direct_code,
			...(lenderForm.has_direct_code && lenderForm.dsa_code
				? { dsa_code: lenderForm.dsa_code }
				: {}),
			...(lenderForm.rm_name ? { rm_name: lenderForm.rm_name } : {}),
			...(lenderForm.rm_phone ? { rm_phone: lenderForm.rm_phone } : {}),
			...(lenderForm.rm_email ? { rm_email: lenderForm.rm_email } : {})
		};

		if (editingLenderIndex !== null) {
			empanelledLenders = empanelledLenders.map((l, i) => (i === editingLenderIndex ? entry : l));
		} else {
			empanelledLenders = [...empanelledLenders, entry];
		}
		resetLenderForm();
		emitUpdate();
	}

	function removeLender(index: number) {
		empanelledLenders = empanelledLenders.filter((_, i) => i !== index);
		emitUpdate();
	}

	// Track whether the lender already exists
	let lenderAlreadyAdded = $derived(
		empanelledLenders.some(
			(l, i) => l.lender_name === lenderForm.lender_name && i !== editingLenderIndex
		)
	);

	// Lender search filter
	let lenderSearch = $state('');
	let showLenderDropdown = $state(false);
	let filteredLenders = $derived(
		lenderOptions.filter((l) => l.label.toLowerCase().includes(lenderSearch.toLowerCase()))
	);
</script>

<div class="space-y-8">
	<!-- ── Section Header ─────────────────────────────────────── -->
	<div class="flex items-center gap-3 border-b border-[var(--dash-border)] pb-2">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-stone-50 to-stone-100"
		>
			<Building2 class="h-5 w-5 text-stone-600 dark:text-stone-400" />
		</div>
		<div>
			<h2 class="text-lg font-bold text-[var(--dash-text)]">Business Profile</h2>
			<p class="text-sm text-[var(--dash-text-secondary)]">
				Tell us about your DSA business and operations
			</p>
		</div>
	</div>

	<!-- ── Firm Details ───────────────────────────────────────── -->
	<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
		<!-- Firm Name -->
		<div class="flex flex-col gap-1.5">
			<label for="firm_name" class="text-sm font-medium text-[var(--dash-text-secondary)]">
				Firm / Business Name
			</label>
			<input
				id="firm_name"
				type="text"
				bind:value={firmName}
				oninput={() => emitUpdate()}
				placeholder="e.g. Sharma Finance Consultants"
				class="w-full rounded-xl border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-3 text-sm text-[var(--dash-text)] transition-all outline-none
					focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
			/>
		</div>

		<!-- GSTIN -->
		<div class="flex flex-col gap-1.5">
			<label for="gstin" class="text-sm font-medium text-[var(--dash-text-secondary)]">
				GSTIN <span class="font-normal text-[var(--dash-text-muted)]">(optional)</span>
			</label>
			<input
				id="gstin"
				type="text"
				bind:value={gstin}
				oninput={() => {
					gstin = gstin.toUpperCase();
					emitUpdate();
				}}
				placeholder="e.g. 22ABCDE1234F1Z5"
				class="w-full rounded-xl border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-3 text-sm text-[var(--dash-text)] uppercase transition-all outline-none
					focus:border-stone-400 focus:ring-2 focus:ring-stone-100
					{errors.gstin ? 'border-red-400' : ''}"
			/>
			{#if errors.gstin}
				<p class="flex items-center gap-1 text-xs text-red-500">
					<AlertCircle class="h-3 w-3" />{errors.gstin}
				</p>
			{/if}
		</div>

		<!-- Years in Business -->
		<div class="flex flex-col gap-1.5">
			<label for="years_in_business" class="text-sm font-medium text-[var(--dash-text-secondary)]">
				Years in Business
			</label>
			<input
				id="years_in_business"
				type="number"
				min="0"
				max="50"
				bind:value={yearsInBusiness}
				oninput={() => emitUpdate()}
				placeholder="e.g. 3"
				class="w-full rounded-xl border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-3 text-sm text-[var(--dash-text)] transition-all outline-none
					focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
			/>
		</div>
	</div>

	<!-- ── Team Size ──────────────────────────────────────────── -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-[var(--dash-text-secondary)]">
			Team Size <span class="text-red-500">*</span>
		</span>
		{#if errors.team_size}
			<p class="flex items-center gap-1 text-xs text-red-500">
				<AlertCircle class="h-3 w-3" />{errors.team_size}
			</p>
		{/if}
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			{#each teamSizeOptions as option}
				<button
					type="button"
					class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-all
						{teamSize === option.value
						? 'border-stone-400 bg-stone-50 text-stone-700 shadow-sm dark:bg-stone-950/40 dark:text-stone-400'
						: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)] hover:shadow-sm'}"
					onclick={() => {
						teamSize = option.value;
						emitUpdate();
					}}
				>
					<span class="text-base font-bold">{option.label}</span>
					<span class="text-xs text-[var(--dash-text-muted)]">{option.description}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- ── Monthly File Volume ────────────────────────────────── -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-[var(--dash-text-secondary)]">
			Monthly File Volume <span class="text-red-500">*</span>
		</span>
		{#if errors.monthly_file_volume}
			<p class="flex items-center gap-1 text-xs text-red-500">
				<AlertCircle class="h-3 w-3" />{errors.monthly_file_volume}
			</p>
		{/if}
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			{#each fileVolumeOptions as option}
				<button
					type="button"
					class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-all
						{monthlyFileVolume === option.value
						? 'border-stone-400 bg-stone-50 text-stone-700 shadow-sm dark:bg-stone-950/40 dark:text-stone-400'
						: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)] hover:shadow-sm'}"
					onclick={() => {
						monthlyFileVolume = option.value;
						emitUpdate();
					}}
				>
					<span class="text-base font-bold">{option.label}</span>
					<span class="text-xs text-[var(--dash-text-muted)]">{option.description}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- ── Primary Loan Types ─────────────────────────────────── -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-[var(--dash-text-secondary)]">
			Primary Loan Types <span class="text-red-500">*</span>
		</span>
		<p class="text-xs text-[var(--dash-text-muted)]">
			Select all loan types you commonly work with
		</p>
		{#if errors.primary_loan_types}
			<p class="flex items-center gap-1 text-xs text-red-500">
				<AlertCircle class="h-3 w-3" />{errors.primary_loan_types}
			</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			{#each personalLoanType as lt}
				{@const isSelected = primaryLoanTypes.includes(lt.value as string)}
				<button
					type="button"
					class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all
						{isSelected
						? 'border-stone-300 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-400'
						: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)]'}"
					onclick={() => toggleLoanType(lt.value as string)}
				>
					{#if isSelected}
						<Check class="h-3.5 w-3.5" />
					{/if}
					{lt.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- ── Empanelled Lenders ─────────────────────────────────── -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<span class="text-sm font-medium text-[var(--dash-text-secondary)]">
					Empanelled Lenders <span class="text-red-500">*</span>
				</span>
				<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">Add banks/NBFCs you work with</p>
			</div>
			{#if !showLenderForm}
				<button
					type="button"
					onclick={openAddLender}
					class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-600"
				>
					<Plus class="h-4 w-4" />
					Add Lender
				</button>
			{/if}
		</div>

		{#if errors.empanelled_lenders}
			<p class="flex items-center gap-1 text-xs text-red-500">
				<AlertCircle class="h-3 w-3" />{errors.empanelled_lenders}
			</p>
		{/if}

		<!-- Lender Cards -->
		{#if empanelledLenders.length > 0}
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				{#each empanelledLenders as lender, index}
					<div
						class="relative rounded-xl border-2 border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 transition-colors hover:border-[var(--dash-border)]"
					>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100"
								>
									<Landmark class="h-5 w-5 text-blue-600 dark:text-blue-400" />
								</div>
								<div>
									<p class="text-sm font-semibold text-[var(--dash-text)]">{lender.lender_name}</p>
									{#if lender.has_direct_code && lender.dsa_code}
										<p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
											DSA Code: {lender.dsa_code}
										</p>
									{:else}
										<p class="text-xs text-[var(--dash-text-muted)]">No direct code</p>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-1">
								<button
									type="button"
									onclick={() => openEditLender(index)}
									class="cursor-pointer rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-stone-50 hover:text-stone-600 dark:hover:bg-stone-950/40 dark:hover:text-stone-400"
									aria-label="Edit lender"
								>
									<Pencil class="h-4 w-4" />
								</button>
								<button
									type="button"
									onclick={() => removeLender(index)}
									class="cursor-pointer rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
									aria-label="Remove lender"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</div>
						{#if lender.rm_name || lender.rm_phone || lender.rm_email}
							<div
								class="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--dash-border-light)] pt-3 text-xs text-[var(--dash-text-secondary)]"
							>
								{#if lender.rm_name}
									<span class="flex items-center gap-1"
										><User class="h-3 w-3" />{lender.rm_name}</span
									>
								{/if}
								{#if lender.rm_phone}
									<span class="flex items-center gap-1"
										><Phone class="h-3 w-3" />{lender.rm_phone}</span
									>
								{/if}
								{#if lender.rm_email}
									<span class="flex items-center gap-1"
										><Mail class="h-3 w-3" />{lender.rm_email}</span
									>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Add/Edit Lender Form -->
		{#if showLenderForm}
			<div
				class="space-y-4 rounded-xl border-2 border-stone-200 bg-stone-50/30 p-5 dark:border-stone-800 dark:bg-stone-950/20"
			>
				<div class="flex items-center justify-between">
					<h4 class="text-sm font-semibold text-[var(--dash-text)]">
						{editingLenderIndex !== null ? 'Edit Lender' : 'Add New Lender'}
					</h4>
					<button
						type="button"
						onclick={resetLenderForm}
						class="cursor-pointer rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-bg-alt)] hover:text-[var(--dash-text-secondary)]"
					>
						<X class="h-4 w-4" />
					</button>
				</div>

				<!-- Lender Name with search -->
				<div class="relative flex flex-col gap-1.5">
					<label
						for="lender_name_input"
						class="text-xs font-medium text-[var(--dash-text-secondary)]"
						>Bank / NBFC Name <span class="text-red-500">*</span></label
					>
					<input
						id="lender_name_input"
						type="text"
						bind:value={lenderSearch}
						onfocus={() => {
							showLenderDropdown = true;
						}}
						oninput={() => {
							showLenderDropdown = true;
						}}
						placeholder="Search for a bank or NBFC..."
						class="w-full rounded-lg border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-2.5 text-sm text-[var(--dash-text)] transition-all outline-none
							focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
					/>
					{#if lenderForm.lender_name && !showLenderDropdown}
						<div class="mt-1 flex items-center gap-2">
							<span
								class="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
							>
								{lenderForm.lender_name}
							</span>
							<button
								type="button"
								onclick={() => {
									lenderForm.lender_name = '';
									lenderSearch = '';
								}}
								class="cursor-pointer text-[var(--dash-text-muted)] hover:text-red-500"
							>
								<X class="h-3 w-3" />
							</button>
						</div>
					{/if}
					{#if showLenderDropdown && lenderSearch.length > 0}
						<div
							class="absolute top-full right-0 left-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] shadow-lg"
						>
							{#each filteredLenders as option}
								<button
									type="button"
									class="w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-950/40
										{lenderForm.lender_name === option.value
										? 'bg-stone-50 font-medium text-stone-700 dark:bg-stone-950/40 dark:text-stone-400'
										: 'text-[var(--dash-text-secondary)]'}"
									onclick={() => {
										lenderForm.lender_name = option.value;
										lenderSearch = option.label;
										showLenderDropdown = false;
									}}
								>
									{option.label}
								</button>
							{:else}
								<p class="px-4 py-3 text-sm text-[var(--dash-text-muted)]">No lenders found</p>
							{/each}
						</div>
					{/if}
					{#if lenderAlreadyAdded}
						<p class="text-xs text-neutral-500">This lender is already in your list</p>
					{/if}
				</div>

				<!-- Has Direct Code Toggle -->
				<div class="space-y-2">
					<span class="text-xs font-medium text-[var(--dash-text-secondary)]"
						>Do you have a direct DSA code?</span
					>
					<div class="flex gap-3">
						<button
							type="button"
							class="flex-1 cursor-pointer rounded-lg border-2 px-3 py-2.5 text-xs font-medium transition-all
								{lenderForm.has_direct_code
								? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
								: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)]'}"
							onclick={() => {
								lenderForm.has_direct_code = true;
							}}
						>
							Yes
						</button>
						<button
							type="button"
							class="flex-1 cursor-pointer rounded-lg border-2 px-3 py-2.5 text-xs font-medium transition-all
								{!lenderForm.has_direct_code
								? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
								: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)]'}"
							onclick={() => {
								lenderForm.has_direct_code = false;
								lenderForm.dsa_code = '';
							}}
						>
							No
						</button>
					</div>
				</div>

				<!-- DSA Code (conditional) -->
				{#if lenderForm.has_direct_code}
					<div class="flex flex-col gap-1.5">
						<label
							for="lender_dsa_code"
							class="text-xs font-medium text-[var(--dash-text-secondary)]"
							>DSA Code <span class="text-red-500">*</span></label
						>
						<input
							id="lender_dsa_code"
							type="text"
							bind:value={lenderForm.dsa_code}
							oninput={() => {
								lenderForm.dsa_code = (lenderForm.dsa_code ?? '').toUpperCase();
							}}
							placeholder="Enter your DSA code"
							class="w-full rounded-lg border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-2.5 text-sm text-[var(--dash-text)] uppercase transition-all outline-none
								focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
						/>
					</div>
				{/if}

				<!-- RM Details Toggle -->
				<button
					type="button"
					class="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:text-stone-600 dark:hover:text-stone-400"
					onclick={() => {
						showRmDetails = !showRmDetails;
					}}
				>
					{#if showRmDetails}
						<ChevronUp class="h-3.5 w-3.5" />
						Hide RM Details
					{:else}
						<ChevronDown class="h-3.5 w-3.5" />
						Add RM Details (optional)
					{/if}
				</button>

				{#if showRmDetails}
					<div
						class="grid grid-cols-1 gap-3 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)]/70 p-3 md:grid-cols-3"
					>
						<div class="flex flex-col gap-1">
							<label for="rm_name" class="text-xs font-medium text-[var(--dash-text-secondary)]"
								>RM Name</label
							>
							<input
								id="rm_name"
								type="text"
								bind:value={lenderForm.rm_name}
								placeholder="e.g. Ravi Kumar"
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none focus:border-stone-400"
							/>
						</div>
						<div class="flex flex-col gap-1">
							<label for="rm_phone" class="text-xs font-medium text-[var(--dash-text-secondary)]"
								>RM Phone</label
							>
							<input
								id="rm_phone"
								type="tel"
								bind:value={lenderForm.rm_phone}
								placeholder="10-digit mobile"
								maxlength={10}
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none focus:border-stone-400"
							/>
						</div>
						<div class="flex flex-col gap-1">
							<label for="rm_email" class="text-xs font-medium text-[var(--dash-text-secondary)]"
								>RM Email</label
							>
							<input
								id="rm_email"
								type="email"
								bind:value={lenderForm.rm_email}
								placeholder="rm@bank.com"
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none focus:border-stone-400"
							/>
						</div>
					</div>
				{/if}

				<!-- Save / Cancel -->
				<div class="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={resetLenderForm}
						class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-bg-alt)] hover:text-[var(--dash-text)]"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={saveLender}
						disabled={!lenderForm.lender_name ||
							lenderAlreadyAdded ||
							(lenderForm.has_direct_code && !lenderForm.dsa_code)}
						class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition-all
							{!lenderForm.lender_name ||
						lenderAlreadyAdded ||
						(lenderForm.has_direct_code && !lenderForm.dsa_code)
							? 'cursor-not-allowed bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
							: 'bg-stone-500 text-white shadow-sm hover:bg-stone-600'}"
					>
						<Check class="h-4 w-4" />
						{editingLenderIndex !== null ? 'Update' : 'Add'}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- ── Geography ──────────────────────────────────────────── -->
	<div class="space-y-4">
		<span class="text-sm font-medium text-[var(--dash-text-secondary)]">Geography</span>
		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			<div class="flex flex-col gap-1.5">
				<label for="geography_city" class="text-xs font-medium text-[var(--dash-text-secondary)]">
					City <span class="text-red-500">*</span>
				</label>
				<div class="relative">
					<MapPin
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]"
					/>
					<input
						id="geography_city"
						type="text"
						bind:value={city}
						oninput={() => emitUpdate()}
						placeholder="e.g. Mumbai"
						class="w-full rounded-xl border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-3 pr-4 pl-10 text-sm text-[var(--dash-text)] transition-all outline-none
							focus:border-stone-400 focus:ring-2 focus:ring-stone-100
							{errors['geography.city'] ? 'border-red-400' : ''}"
					/>
				</div>
				{#if errors['geography.city']}
					<p class="text-xs text-red-500">{errors['geography.city']}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label
					for="areas_of_operation"
					class="text-xs font-medium text-[var(--dash-text-secondary)]"
				>
					Areas of Operation <span class="font-normal text-[var(--dash-text-muted)]"
						>(comma-separated)</span
					>
				</label>
				<input
					id="areas_of_operation"
					type="text"
					bind:value={areasOfOperation}
					oninput={() => emitUpdate()}
					placeholder="e.g. Andheri, Bandra, Powai"
					class="w-full rounded-xl border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-3 text-sm text-[var(--dash-text)] transition-all outline-none
						focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
				/>
			</div>
		</div>
	</div>

	<!-- ── Current Tools ──────────────────────────────────────── -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-[var(--dash-text-secondary)]">
			Current Tools <span class="text-red-500">*</span>
		</span>
		<p class="text-xs text-[var(--dash-text-muted)]">What do you use to manage your files today?</p>
		{#if errors.current_tools}
			<p class="flex items-center gap-1 text-xs text-red-500">
				<AlertCircle class="h-3 w-3" />{errors.current_tools}
			</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			{#each toolOptions as option}
				{@const isSelected = currentTools.includes(option.value)}
				<button
					type="button"
					class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all
						{isSelected
						? 'border-stone-300 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-400'
						: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)]'}"
					onclick={() => toggleTool(option.value)}
				>
					{#if isSelected}
						<Check class="h-3.5 w-3.5" />
					{/if}
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- ── Has Website ────────────────────────────────────────── -->
	<div class="space-y-2">
		<span class="text-sm font-medium text-[var(--dash-text-secondary)]">
			Do you have a website? <span class="text-red-500">*</span>
		</span>
		<div class="flex gap-3">
			<button
				type="button"
				class="flex-1 cursor-pointer rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all
					{hasWebsite
					? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-400'
					: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)]'}"
				onclick={() => {
					hasWebsite = true;
					emitUpdate();
				}}
			>
				Yes
			</button>
			<button
				type="button"
				class="flex-1 cursor-pointer rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all
					{!hasWebsite
					? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/40 dark:text-blue-400'
					: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)]'}"
				onclick={() => {
					hasWebsite = false;
					emitUpdate();
				}}
			>
				No
			</button>
		</div>
	</div>

	<!-- ── Lead Sources ───────────────────────────────────────── -->
	<div class="space-y-3">
		<span class="text-sm font-medium text-[var(--dash-text-secondary)]">
			Lead Sources <span class="text-red-500">*</span>
		</span>
		<p class="text-xs text-[var(--dash-text-muted)]">Where do your customers come from?</p>
		{#if errors.lead_sources}
			<p class="flex items-center gap-1 text-xs text-red-500">
				<AlertCircle class="h-3 w-3" />{errors.lead_sources}
			</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			{#each leadSourceOptions as option}
				{@const isSelected = leadSources.includes(option.value)}
				<button
					type="button"
					class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all
						{isSelected
						? 'border-stone-300 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-400'
						: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)]'}"
					onclick={() => toggleLeadSource(option.value)}
				>
					{#if isSelected}
						<Check class="h-3.5 w-3.5" />
					{/if}
					{option.label}
				</button>
			{/each}
		</div>
	</div>
</div>
