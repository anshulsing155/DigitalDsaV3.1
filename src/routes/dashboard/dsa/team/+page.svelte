<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf.js';
	import PageTourButton from '$lib/components/walkthrough/PageTourButton.svelte';

	let { data } = $props();

	let showInviteForm = $state(false);
	let inviteName = $state('');
	let inviteMobile = $state('');
	let inviteEmail = $state('');
	let inviteRole = $state<'data_entry' | 'viewer' | 'field_agent' | 'admin'>('data_entry');
	let isInviting = $state(false);
	let inviteError = $state('');
	let inviteCode = $state('');
	let inviteEmailSent = $state(false);
	let isCreatingTeam = $state(false);

	const ROLE_LABELS: Record<string, string> = {
		admin: 'Admin',
		data_entry: 'Data Entry',
		viewer: 'Viewer',
		field_agent: 'Field Agent'
	};

	const STATUS_COLORS: Record<string, string> = {
		invited: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		active: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		suspended: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	async function createTeam() {
		isCreatingTeam = true;
		try {
			const res = await secureFetch('/api/team', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			if (res.ok) {
				await invalidateAll();
			}
		} finally {
			isCreatingTeam = false;
		}
	}

	async function inviteMember() {
		inviteError = '';
		inviteCode = '';
		inviteEmailSent = false;
		const mobile = Number(inviteMobile);
		if (!inviteName.trim() || isNaN(mobile) || String(mobile).length !== 10) {
			inviteError = 'Please enter a valid name and 10-digit mobile number';
			return;
		}

		// Email is optional; only validate format when something was typed.
		const emailTrimmed = inviteEmail.trim();
		if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
			inviteError = 'Email address looks invalid';
			return;
		}

		isInviting = true;
		try {
			const body: Record<string, unknown> = {
				mobile_number: mobile,
				name: inviteName.trim(),
				team_role: inviteRole
			};
			if (emailTrimmed) body.email = emailTrimmed;
			const res = await secureFetch('/api/team/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = await res.json();
			if (result.success) {
				inviteCode = result.data.invite_code;
				inviteEmailSent = Boolean(result.data.email_sent);
				await invalidateAll();
			} else {
				inviteError = result.error || 'Failed to invite';
			}
		} catch {
			inviteError = 'Network error';
		} finally {
			isInviting = false;
		}
	}

	async function removeMember(userId: string) {
		const res = await secureFetch(`/api/team/members/${userId}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
	}

	async function toggleSuspend(userId: string, currentStatus: string) {
		const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
		const res = await secureFetch(`/api/team/members/${userId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: newStatus })
		});
		if (res.ok) await invalidateAll();
	}
</script>

<svelte:head>
	<title>Team Management | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-bold text-[var(--dash-text)]">Team Management</h1>
				<PageTourButton pageId="team" />
			</div>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Manage your team members and their permissions
			</p>
		</div>
		{#if data.hasTeam}
			<button
				data-walkthrough="team-invite-button"
				onclick={() => {
					showInviteForm = true;
					inviteCode = '';
					inviteError = '';
				}}
				class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
			>
				Invite Member
			</button>
		{/if}
	</div>

	{#if !data.hasTeam}
		<!-- No team yet — prompt to create -->
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<span class="text-3xl">👥</span>
			</div>
			<h2 class="mb-2 text-lg font-semibold text-[var(--dash-text)]">Create Your Team</h2>
			<p class="mb-6 text-sm text-[var(--dash-text-secondary)]">
				Invite data entry staff, field agents, and other team members to collaborate on your cases.
			</p>
			<button
				data-walkthrough="team-create-button"
				onclick={createTeam}
				disabled={isCreatingTeam}
				class="rounded-lg bg-[var(--ddsa-accent-500)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
			>
				{isCreatingTeam ? 'Creating...' : 'Create Team'}
			</button>
		</div>
	{:else}
		<!-- Member list -->
		{#if data.members.length === 0}
			<div
				class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
			>
				<p class="text-sm text-[var(--dash-text-secondary)]">
					No team members yet. Invite someone to get started!
				</p>
			</div>
		{:else}
			<div class="space-y-3" data-walkthrough="team-member-list">
				{#each data.members as member}
					<div
						class="flex items-center justify-between rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-4"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-bg-alt)] text-lg font-semibold text-[var(--dash-text-secondary)]"
							>
								{member.name.charAt(0).toUpperCase()}
							</div>
							<div>
								<p class="text-sm font-semibold text-[var(--dash-text)]">{member.name}</p>
								<p class="text-xs text-[var(--dash-text-secondary)]">{member.mobile_number}</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span
								class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2.5 py-1 text-xs font-medium text-[var(--dash-accent-text)]"
							>
								{ROLE_LABELS[member.team_role] || member.team_role}
							</span>
							<span
								class="rounded-full px-2.5 py-1 text-xs font-medium {STATUS_COLORS[member.status] ||
									'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
							>
								{member.status}
							</span>
							{#if member.status !== 'invited'}
								<a
									href="/dashboard/dsa/team/{member.user_id}"
									class="text-xs text-[var(--dash-accent-text)] hover:underline"
								>
									Edit
								</a>
								<button
									onclick={() => toggleSuspend(member.user_id, member.status)}
									class="text-xs text-[var(--dash-text-secondary)] hover:underline"
								>
									{member.status === 'suspended' ? 'Reactivate' : 'Suspend'}
								</button>
							{/if}
							<button
								onclick={() => removeMember(member.user_id)}
								class="text-xs text-[var(--dash-contrast-text)] hover:underline"
							>
								Remove
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Tier info -->
		{#if data.ownerTier === 'free'}
			<div
				data-walkthrough="team-tier-info"
				class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-4"
			>
				<p class="text-sm text-[var(--dash-text-secondary)]">
					<strong>Free tier:</strong> Team members can fill forms and create cases. Upgrade to Pro to
					unlock results, analytics, file builder, and custom permissions.
				</p>
			</div>
		{/if}
	{/if}

	<!-- Invite Modal -->
	{#if showInviteForm}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Invite team member"
			tabindex="-1"
			onclick={(e) => {
				if (e.target === e.currentTarget) showInviteForm = false;
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') showInviteForm = false;
			}}
		>
			<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl">
				<h3 class="mb-4 text-lg font-bold text-[var(--dash-text)]">Invite Team Member</h3>

				{#if inviteCode}
					<div class="space-y-4 text-center">
						<div class="rounded-lg bg-[var(--dash-btn-ghost-bg)] p-4">
							<p class="mb-2 text-sm text-[var(--dash-accent-text)]">
								Invite sent! Share this code with the member:
							</p>
							<p
								class="font-mono text-3xl font-bold tracking-widest text-[var(--dash-accent-text)]"
							>
								{inviteCode}
							</p>
						</div>
						{#if inviteEmailSent}
							<p class="text-xs text-[var(--dash-text-secondary)]">
								We've also emailed the invite to <strong>{inviteEmail.trim()}</strong> with the
								join link.
							</p>
						{:else}
							<p class="text-xs text-[var(--dash-text-secondary)]">
								The member should login with their phone, enter this code, and complete a quick
								profile setup.
							</p>
						{/if}
						<button
							onclick={() => {
								showInviteForm = false;
								inviteName = '';
								inviteMobile = '';
								inviteEmail = '';
								inviteCode = '';
								inviteEmailSent = false;
							}}
							class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
						>
							Done
						</button>
					</div>
				{:else}
					<div class="space-y-4">
						<div>
							<label
								for="invite-name"
								class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]">Name</label
							>
							<input
								id="invite-name"
								type="text"
								bind:value={inviteName}
								placeholder="Member's name"
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
							/>
						</div>
						<div>
							<label
								for="invite-mobile"
								class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
								>Mobile Number</label
							>
							<input
								id="invite-mobile"
								type="tel"
								bind:value={inviteMobile}
								placeholder="10-digit number"
								maxlength="10"
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
							/>
						</div>
						<div>
							<label
								for="invite-email"
								class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
								>Email <span class="text-xs text-[var(--dash-text-muted)]">(optional, we'll send them the join link)</span></label
							>
							<input
								id="invite-email"
								type="email"
								bind:value={inviteEmail}
								placeholder="name@example.com"
								autocomplete="off"
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
							/>
						</div>
						<div>
							<label
								for="invite-role"
								class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]">Role</label
							>
							<select
								id="invite-role"
								bind:value={inviteRole}
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
							>
								<option value="data_entry">Data Entry</option>
								<option value="field_agent">Field Agent</option>
								<option value="viewer">Viewer</option>
								<option value="admin">Admin</option>
							</select>
						</div>

						{#if inviteError}
							<p class="text-sm text-[var(--dash-contrast-text)]">{inviteError}</p>
						{/if}

						<div class="flex gap-3 pt-2">
							<button
								onclick={() => (showInviteForm = false)}
								class="flex-1 rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
							>
								Cancel
							</button>
							<button
								onclick={inviteMember}
								disabled={isInviting}
								class="flex-1 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
							>
								{isInviting ? 'Inviting...' : 'Send Invite'}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
