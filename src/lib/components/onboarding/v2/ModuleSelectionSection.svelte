<script lang="ts">
	import type { DsaModuleSelection } from '$lib/types/dsaOnboardingV2';
	import type { ModuleId } from '$lib/data/modules';
	import {
		Layers,
		Check,
		FileText,
		ClipboardList,
		Mail,
		Users,
		PieChart,
		Funnel,
		AlertCircle
	} from '$lib/utils/iconRegistry';

	interface AvailableModule {
		id: string;
		name: string;
		description: string;
	}

	interface Props {
		data: DsaModuleSelection;
		onUpdate: (data: DsaModuleSelection) => void;
		availableModules: AvailableModule[];
		errors?: Record<string, string>;
	}

	let { data, onUpdate, availableModules, errors = {} }: Props = $props();

	// ── Internal state (one-time snapshot from prop) ────────────
	// svelte-ignore state_referenced_locally
	let activeModules = $state<string[]>([...data.active_modules]);

	// ── Derived ──────────────────────────────────────────────────
	let selectedCount = $derived(activeModules.length);
	let totalCount = $derived(availableModules.length);

	// ── Module icon map ──────────────────────────────────────────
	const moduleIcons: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
		case_builder: { icon: ClipboardList, color: 'text-blue-600', bg: 'from-blue-50 to-blue-100' },
		file_builder: {
			icon: FileText,
			color: 'text-emerald-600',
			bg: 'from-emerald-50 to-emerald-100'
		},
		communication: { icon: Mail, color: 'text-purple-600', bg: 'from-purple-50 to-purple-100' },
		rm_database: { icon: Users, color: 'text-stone-600', bg: 'from-stone-50 to-stone-100' },
		crm: { icon: Funnel, color: 'text-red-500', bg: 'from-red-50 to-red-100' },
		analytics: { icon: PieChart, color: 'text-indigo-600', bg: 'from-indigo-50 to-indigo-100' }
	};

	const defaultModuleIcon = {
		icon: Layers,
		color: 'text-[var(--dash-text-secondary)]',
		bg: 'from-gray-50 to-gray-100'
	};

	// ── Toggle handler ───────────────────────────────────────────
	function toggleModule(moduleId: string) {
		if (activeModules.includes(moduleId)) {
			activeModules = activeModules.filter((m) => m !== moduleId);
		} else {
			activeModules = [...activeModules, moduleId];
		}
		emitUpdate();
	}

	function selectAll() {
		activeModules = availableModules.map((m) => m.id);
		emitUpdate();
	}

	function clearAll() {
		activeModules = [];
		emitUpdate();
	}

	function emitUpdate() {
		onUpdate({
			active_modules: activeModules as ModuleId[]
		});
	}
</script>

<div class="space-y-8">
	<!-- ── Section Header ─────────────────────────────────────── -->
	<div class="flex items-center gap-3 border-b border-[var(--dash-border)] pb-2">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100"
		>
			<Layers class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
		</div>
		<div>
			<h2 class="text-lg font-bold text-[var(--dash-text)]">Choose Your Modules</h2>
			<p class="text-sm text-[var(--dash-text-secondary)]">
				Select the tools you want activated in your dashboard
			</p>
		</div>
	</div>

	<!-- ── Counter + Quick Actions ─────────────────────────────── -->
	<div
		class="flex items-center justify-between rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] p-4"
	>
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
			>
				{selectedCount}
			</div>
			<span class="text-sm text-[var(--dash-text-secondary)]">
				of {totalCount} modules selected
			</span>
		</div>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={selectAll}
				disabled={selectedCount === totalCount}
				class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
					{selectedCount === totalCount
					? 'cursor-not-allowed text-[var(--dash-text-muted)]'
					: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40'}"
			>
				Select All
			</button>
			<button
				type="button"
				onclick={clearAll}
				disabled={selectedCount === 0}
				class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
					{selectedCount === 0
					? 'cursor-not-allowed text-[var(--dash-text-muted)]'
					: 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)]'}"
			>
				Clear All
			</button>
		</div>
	</div>

	{#if errors.active_modules}
		<p class="flex items-center gap-1 text-xs text-red-500">
			<AlertCircle class="h-3 w-3" />{errors.active_modules}
		</p>
	{/if}

	<!-- ── Module Cards Grid ──────────────────────────────────── -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each availableModules as mod}
			{@const isActive = activeModules.includes(mod.id)}
			{@const iconDef = moduleIcons[mod.id] ?? defaultModuleIcon}
			{@const Icon = iconDef.icon}
			<button
				type="button"
				class="group relative cursor-pointer rounded-xl border-2 p-5 text-left transition-all
					{isActive
					? 'border-indigo-400 bg-[var(--dash-bg-card)] shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900/40'
					: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] hover:border-[var(--dash-border)] hover:shadow-sm'}"
				onclick={() => toggleModule(mod.id)}
			>
				<!-- Check Badge -->
				<div class="absolute top-3 right-3">
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full transition-all
						{isActive
							? 'bg-indigo-500 text-white shadow-sm'
							: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] group-hover:bg-[var(--dash-bg-alt)]'}"
					>
						{#if isActive}
							<Check class="h-4 w-4" />
						{/if}
					</div>
				</div>

				<!-- Icon -->
				<div
					class="h-12 w-12 rounded-xl bg-gradient-to-br {iconDef.bg} mb-3 flex items-center justify-center"
				>
					<Icon class="h-6 w-6 {iconDef.color}" />
				</div>

				<!-- Name -->
				<h3
					class="mb-1 text-sm font-semibold
					{isActive ? 'text-[var(--dash-text)]' : 'text-[var(--dash-text-secondary)]'}"
				>
					{mod.name}
				</h3>

				<!-- Description -->
				<p
					class="text-xs leading-relaxed
					{isActive ? 'text-[var(--dash-text-secondary)]' : 'text-[var(--dash-text-muted)]'}"
				>
					{mod.description}
				</p>

				<!-- Active indicator bar -->
				{#if isActive}
					<div
						class="absolute right-4 bottom-0 left-4 h-0.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
					></div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- ── Tip ────────────────────────────────────────────────── -->
	<div
		class="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40"
	>
		<p class="text-xs text-blue-700 dark:text-blue-400">
			<strong>Tip:</strong> You can enable or disable modules anytime from your dashboard settings. Start
			with what you need most -- you don't have to use everything on day one.
		</p>
	</div>
</div>
