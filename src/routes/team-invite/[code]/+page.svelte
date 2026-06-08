<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	const ROLE_LABELS: Record<string, string> = {
		admin: 'Admin',
		data_entry: 'Data Entry',
		viewer: 'Viewer',
		field_agent: 'Field Agent'
	};
</script>

<svelte:head>
	<title>Team Invite | DigitalDSA</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[var(--form-bg-alt)] p-4">
	<div
		class="w-full max-w-md rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-8 text-center shadow-lg"
	>
		<div
			class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30"
		>
			<span class="text-3xl">👥</span>
		</div>

		<h1 class="mb-2 text-xl font-bold text-[var(--form-text)]">Team Invite</h1>

		<p class="mb-6 text-sm text-[var(--form-text-secondary)]">
			<strong>{data.ownerName}</strong> has invited you to join their team as a
			<span class="font-medium text-blue-700">{ROLE_LABELS[data.role] || data.role}</span>.
		</p>

		<div class="mb-6 rounded-lg bg-[var(--form-bg-alt)] p-4">
			<p class="text-xs text-[var(--form-text-secondary)]">Invite Code</p>
			<p class="font-mono text-2xl font-bold tracking-widest text-[var(--form-text)]">
				{data.inviteCode}
			</p>
		</div>

		<p class="mb-6 text-sm text-[var(--form-text-secondary)]">
			To accept this invite, login with your phone number and you'll be guided through a quick
			setup.
		</p>

		<button
			onclick={() => goto('/login')}
			class="w-full rounded-lg bg-[var(--ddsa-accent-500)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
		>
			Login to Accept
		</button>
	</div>
</div>
