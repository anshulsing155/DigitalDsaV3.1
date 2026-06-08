<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf.js';
	import { browser } from '$app/environment';
	import { LogOut, ShieldAlert } from 'lucide-svelte';

	let {
		adminName,
		targetName,
		targetRole
	}: {
		adminName: string;
		targetName: string;
		targetRole: 'dsa' | 'rm';
	} = $props();

	let exiting = $state(false);

	const roleLabel = $derived(targetRole === 'dsa' ? 'DSA' : 'RM');

	async function exitImpersonation() {
		exiting = true;
		try {
			await secureFetch('/api/admin/impersonate/exit', { method: 'POST' });
			// Return to the admin Users table (where the impersonation was started
			// from in the new flow). The legacy RM-only path used /dashboard/admin/
			// rm-management; Users is the single landing now that DSA + RM share an
			// entry point.
			if (browser) window.location.href = '/dashboard/admin/users';
		} catch {
			exiting = false;
		}
	}
</script>

<div
	class="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-600 px-4 py-2 text-white shadow-sm"
>
	<div class="flex items-center gap-2 text-sm">
		<ShieldAlert size={15} class="shrink-0" />
		<span>
			<span class="font-semibold">{adminName}</span> is viewing as
			<span class="font-semibold">{targetName}</span>
			({roleLabel}) — all actions are logged
		</span>
	</div>
	<button
		onclick={exitImpersonation}
		disabled={exiting}
		class="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-xs font-medium transition hover:bg-white/30 disabled:opacity-60"
	>
		<LogOut size={12} />
		{exiting ? 'Exiting…' : `Exit ${roleLabel} view`}
	</button>
</div>
