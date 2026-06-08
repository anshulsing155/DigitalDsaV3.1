<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { TEAM_ROLE_PRESETS, PREMIUM_TEAM_PERMISSIONS } from '$lib/types/team';
	import type { TeamRole, TeamMemberPermissions } from '$lib/types/team';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const initRole = data.member.team_role as TeamRole;
	// svelte-ignore state_referenced_locally
	const initPermissions = { ...data.member.permissions };
	let selectedRole = $state(initRole);
	let permissions = $state<TeamMemberPermissions>(initPermissions);
	let isSaving = $state(false);
	let saveError = $state('');

	const isPremium = $derived(data.ownerTier !== 'free');

	const PERMISSION_LABELS: Record<keyof TeamMemberPermissions, string> = {
		cases_view: 'View Cases',
		cases_create: 'Create Cases',
		cases_edit: 'Edit Cases',
		form_fill: 'Fill Forms',
		form_view: 'View Forms',
		results_view: 'View Results',
		file_builder_view: 'View File Builder',
		file_builder_configure: 'Configure File Builder',
		leads_view: 'View Leads',
		leads_create: 'Create Leads',
		leads_edit: 'Edit Leads',
		sources_view: 'View Sources',
		sources_manage: 'Manage Sources',
		communication_view: 'View Communication',
		analytics_view: 'View Analytics'
	};

	function applyPreset() {
		permissions = { ...TEAM_ROLE_PRESETS[selectedRole] };
	}

	async function save() {
		saveError = '';
		isSaving = true;
		try {
			const res = await secureFetch(`/api/team/members/${data.member.user_id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					team_role: selectedRole,
					permissions
				})
			});
			const result = await res.json();
			if (result.success) {
				await invalidateAll();
			} else {
				saveError = result.error || 'Failed to save';
			}
		} catch {
			saveError = 'Network error';
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Edit Member — {data.member.name} | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<button
			onclick={() => goto('/dashboard/dsa/team')}
			aria-label="Go back"
			class="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<div>
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">{data.member.name}</h1>
			<p class="text-sm text-[var(--dash-text-secondary)]">
				{data.member.mobile_number} — {data.member.status}
			</p>
		</div>
	</div>

	<!-- Role Selector -->
	<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<h2
			class="mb-4 text-sm font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase"
		>
			Role
		</h2>
		<div class="flex flex-wrap gap-3">
			{#each ['data_entry', 'field_agent', 'viewer', 'admin'] as const as role}
				<button
					onclick={() => {
						selectedRole = role;
						applyPreset();
					}}
					class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors
						{selectedRole === role
						? 'border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
						: 'border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					{role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
				</button>
			{/each}
		</div>
	</div>

	<!-- Permissions -->
	<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<h2
			class="mb-4 text-sm font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase"
		>
			Permissions
		</h2>
		{#if !isPremium}
			<p
				class="mb-4 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-3 text-sm text-[var(--dash-text-secondary)]"
			>
				Custom permissions require Pro/Enterprise. Upgrade to customize individual toggles.
			</p>
		{/if}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each Object.entries(PERMISSION_LABELS) as [key, label]}
				{@const isPremiumPerm = PREMIUM_TEAM_PERMISSIONS.includes(
					key as keyof TeamMemberPermissions
				)}
				{@const isLocked = !isPremium && isPremiumPerm}
				<label
					class="flex items-center justify-between rounded-lg border border-[var(--dash-border-light)] px-3 py-2.5 {isLocked
						? 'opacity-50'
						: ''}"
				>
					<span class="text-sm text-[var(--dash-text-secondary)]">
						{label}
						{#if isLocked}
							<span class="ml-1 text-xs text-[var(--dash-text-muted)]">Pro</span>
						{/if}
					</span>
					<input
						type="checkbox"
						checked={permissions[key as keyof TeamMemberPermissions]}
						disabled={isLocked || !isPremium}
						onchange={(e) => {
							permissions = { ...permissions, [key]: (e.target as HTMLInputElement).checked };
						}}
						class="h-4 w-4 rounded border-[var(--dash-border)] accent-[var(--ddsa-accent-500)] disabled:cursor-not-allowed"
					/>
				</label>
			{/each}
		</div>
	</div>

	<!-- Save -->
	{#if saveError}
		<p class="text-sm text-[var(--dash-contrast-text)]">{saveError}</p>
	{/if}
	<div class="flex gap-3">
		<button
			onclick={() => goto('/dashboard/dsa/team')}
			class="rounded-lg border border-[var(--dash-border)] px-6 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
		>
			Cancel
		</button>
		<button
			onclick={save}
			disabled={isSaving}
			class="rounded-lg bg-[var(--ddsa-accent-500)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
		>
			{isSaving ? 'Saving...' : 'Save Changes'}
		</button>
	</div>
</div>
