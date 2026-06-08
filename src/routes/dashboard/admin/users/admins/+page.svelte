<script lang="ts">
	/**
	 * Admin Management Page — /dashboard/admin/users/admins
	 * ═══════════════════════════════════════════════════════════════════
	 * Super admin only. Manage admin accounts, permissions, and roles.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import type { PageData } from './$types';
	import { openConfirmModal } from '$lib/stores/confirmModal';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	let { data }: { data: PageData } = $props();

	// ── State ────────────────────────────────────────────────────
	let showAddModal = $state(false);
	let showPromoteModal = $state(false);
	let promotingAdmin = $state<(typeof data.admins)[0] | null>(null);
	let promoteAction = $state<'promote' | 'demote'>('promote');
	let saving = $state(false);
	let saveError = $state('');
	let saveSuccess = $state('');

	// Add admin form
	let newName = $state('');
	let newMobile = $state('');
	let newPermUser = $state(false);
	let newPermRule = $state(false);
	let newPermSettings = $state(false);

	// OTP state
	let otpReqId = $state('');
	let otpValue = $state('');
	let otpSending = $state(false);
	let otpSent = $state(false);

	// ── Helpers ──────────────────────────────────────────────────
	function formatDate(iso: string | null): string {
		if (!iso) return 'Never';
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function clearMessages() {
		saveError = '';
		saveSuccess = '';
	}

	// ── Create Admin ────────────────────────────────────────────
	async function createAdmin() {
		clearMessages();
		if (!newName.trim() || !newMobile.trim()) {
			saveError = 'Name and mobile number are required';
			return;
		}

		saving = true;
		try {
			const res = await secureFetch('/api/admin/admins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newName.trim(),
					mobileNumber: Number(newMobile),
					permissions: {
						user_management: newPermUser,
						rule_authoring: newPermRule,
						system_settings: newPermSettings,
						qa_view: false,
						qa_write: false,
						qa_run: false
					}
				})
			});

			const result = await res.json();
			if (result.success) {
				saveSuccess = `Admin "${newName.trim()}" created successfully`;
				showAddModal = false;
				newName = '';
				newMobile = '';
				newPermUser = false;
				newPermRule = false;
				newPermSettings = false;
				await invalidateAll();
			} else {
				saveError = result.error || 'Failed to create admin';
			}
		} catch {
			saveError = 'Network error';
		} finally {
			saving = false;
		}
	}

	// ── Toggle Permission ───────────────────────────────────────
	async function togglePermission(adminId: string, permKey: string, currentValue: boolean) {
		clearMessages();
		try {
			const res = await secureFetch(`/api/admin/admins/${adminId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					permissions: { [permKey]: !currentValue }
				})
			});

			const result = await res.json();
			if (result.success) {
				// Update local state
				const admin = data.admins.find((a) => a._id === adminId);
				if (admin) {
					(admin.permissions as any)[permKey] = !currentValue;
				}
			} else {
				saveError = result.error || 'Failed to update permission';
			}
		} catch {
			saveError = 'Network error';
		}
	}

	// ── Toggle Active Status ────────────────────────────────────
	async function toggleActive(adminId: string, currentlyActive: boolean) {
		clearMessages();
		if (adminId === data.currentAdminId) {
			saveError = 'Cannot deactivate your own account';
			return;
		}

		openConfirmModal(
			`${currentlyActive ? 'Deactivate' : 'Activate'} Admin`,
			`${currentlyActive ? 'Deactivate' : 'Activate'} this admin account?`,
			async () => {
				try {
					const res = await secureFetch(`/api/admin/admins/${adminId}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ is_active: !currentlyActive })
					});

					const result = await res.json();
					if (result.success) {
						const admin = data.admins.find((a) => a._id === adminId);
						if (admin) admin.is_active = !currentlyActive;
					} else {
						saveError = result.error || 'Failed to update status';
					}
				} catch {
					saveError = 'Network error';
				}
			},
			{ confirmLabel: currentlyActive ? 'Deactivate' : 'Activate' }
		);
	}

	// ── Promote/Demote Flow ─────────────────────────────────────
	function startPromote(admin: (typeof data.admins)[0], action: 'promote' | 'demote') {
		clearMessages();
		promotingAdmin = admin;
		promoteAction = action;
		otpReqId = '';
		otpValue = '';
		otpSent = false;
		showPromoteModal = true;
	}

	async function sendPromoteOtp() {
		if (!promotingAdmin) return;
		otpSending = true;
		saveError = '';

		try {
			const res = await secureFetch(`/api/admin/admins/${promotingAdmin._id}/promote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'send-otp' })
			});

			const result = await res.json();
			if (result.success) {
				// Server now wraps reqId/message in { data: {...} } via apiOk() — DX-4 migration.
				otpReqId = result.data?.reqId ?? result.reqId;
				otpSent = true;
			} else {
				saveError = result.error || 'Failed to send OTP';
			}
		} catch {
			saveError = 'Network error';
		} finally {
			otpSending = false;
		}
	}

	async function confirmPromote() {
		if (!promotingAdmin || !otpValue || !otpReqId) return;
		saving = true;
		saveError = '';

		try {
			const res = await secureFetch(`/api/admin/admins/${promotingAdmin._id}/promote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: promoteAction,
					otp: otpValue,
					reqId: otpReqId
				})
			});

			const result = await res.json();
			if (result.success) {
				saveSuccess = result.message;
				showPromoteModal = false;
				// Update local state
				const admin = data.admins.find((a) => a._id === promotingAdmin!._id);
				if (admin) admin.is_super_admin = promoteAction === 'promote';
			} else {
				saveError = result.error || 'Failed to update role';
			}
		} catch {
			saveError = 'Network error';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Manage Admins | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between gap-3">
		<div>
			<h1 class="text-xl font-bold text-[var(--dash-text)]">Admin Accounts</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Manage admin users, permissions, and super admin roles
			</p>
		</div>
		<button
			onclick={() => {
				showAddModal = true;
				clearMessages();
			}}
			class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)]"
		>
			+ Add Admin
		</button>
	</div>

	<!-- Messages -->
	{#if saveError}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
		>
			{saveError}
		</div>
	{/if}
	{#if saveSuccess}
		<div
			class="rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-accent-text)]"
		>
			{saveSuccess}
		</div>
	{/if}

	<!-- Admin Table -->
	<div
		class="overflow-x-auto rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm"
	>
		<table class="w-full text-sm">
			<thead>
				<tr
					class="border-b border-[var(--dash-border-light)] text-left text-xs font-medium tracking-wider text-[var(--dash-text-muted)] uppercase"
				>
					<th class="px-4 py-3">Admin</th>
					<th class="px-4 py-3">Role</th>
					<th class="px-4 py-3">Permissions</th>
					<th class="px-4 py-3">Status</th>
					<th class="px-4 py-3">Last Active</th>
					<th class="px-4 py-3">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[var(--dash-border-light)]">
				{#each data.admins as admin (admin._id)}
					{@const isSelf = admin._id === data.currentAdminId}
					<tr class="transition-colors hover:bg-[var(--dash-hover)]">
						<!-- Name + Mobile -->
						<td class="px-4 py-3">
							<p class="font-semibold text-[var(--dash-text)]">
								{admin.name}
								{#if isSelf}
									<span class="ml-1 text-[12px] font-medium text-[var(--ddsa-accent-500)]"
										>(you)</span
									>
								{/if}
							</p>
							<p class="text-xs text-[var(--dash-text-muted)]">{admin.mobileNumber}</p>
						</td>

						<!-- Role Badge -->
						<td class="px-4 py-3">
							{#if admin.is_super_admin}
								<span
									class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-semibold text-[var(--dash-text)]"
								>
									Super Admin
								</span>
							{:else}
								<span
									class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-semibold text-[var(--dash-text-secondary)]"
								>
									Admin
								</span>
							{/if}
						</td>

						<!-- Permission Toggles -->
						<td class="px-4 py-3">
							<div class="flex flex-wrap gap-1.5">
								{#each [{ key: 'user_management', label: 'Users', color: 'blue' }, { key: 'rule_authoring', label: 'Rules', color: 'amber' }, { key: 'system_settings', label: 'Settings', color: 'slate' }] as perm}
									{@const isOn = admin.permissions[perm.key as keyof typeof admin.permissions]}
									<button
										onclick={() => togglePermission(admin._id, perm.key, isOn)}
										disabled={admin.is_super_admin}
										title={admin.is_super_admin
											? 'Super admins have all permissions'
											: `Toggle ${perm.label}`}
										class="rounded px-1.5 py-0.5 text-[12px] font-medium transition-colors
											{isOn || admin.is_super_admin
											? `bg-${perm.color}-100 dark:bg-${perm.color}-950/40 text-${perm.color}-700 dark:text-${perm.color}-400`
											: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] line-through'}
											{admin.is_super_admin ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80'}"
									>
										{perm.label}
									</button>
								{/each}
							</div>
						</td>

						<!-- Status -->
						<td class="px-4 py-3">
							{#if admin.is_active}
								<span
									class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-[12px] font-semibold text-[var(--dash-accent-text)]"
								>
									Active
								</span>
							{:else}
								<span
									class="rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2 py-0.5 text-[12px] font-semibold text-[var(--dash-contrast-text)]"
								>
									Inactive
								</span>
							{/if}
						</td>

						<!-- Last Active -->
						<td class="px-4 py-3 text-xs text-[var(--dash-text-muted)]">
							{formatDate(admin.lastActiveAt)}
						</td>

						<!-- Actions -->
						<td class="px-4 py-3">
							<div class="flex items-center gap-2">
								<!-- Activate/Deactivate -->
								{#if !isSelf}
									<button
										onclick={() => toggleActive(admin._id, admin.is_active)}
										class="rounded-lg border border-[var(--dash-border)] px-2 py-1 text-[12px] font-medium transition-colors hover:bg-[var(--dash-hover)]
											{admin.is_active ? 'text-[var(--dash-contrast-text)]' : 'text-[var(--dash-accent-text)]'}"
									>
										{admin.is_active ? 'Deactivate' : 'Activate'}
									</button>
								{/if}

								<!-- Promote/Demote -->
								{#if !isSelf}
									{#if admin.is_super_admin}
										<button
											onclick={() => startPromote(admin, 'demote')}
											class="rounded-lg border border-[var(--dash-border)] px-2 py-1 text-[12px] font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
										>
											Demote
										</button>
									{:else}
										<button
											onclick={() => startPromote(admin, 'promote')}
											class="rounded-lg border border-[var(--dash-btn-ghost-border)] px-2 py-1 text-[12px] font-medium text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-btn-ghost-bg)]"
										>
											Promote
										</button>
									{/if}
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Add Admin Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Add admin user"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) showAddModal = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showAddModal = false;
		}}
	>
		<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl">
			<h3 class="mb-4 text-lg font-bold text-[var(--dash-text)]">Add Admin User</h3>

			<div class="space-y-4">
				<div>
					<label
						for="admin-name"
						class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Name</label
					>
					<input
						id="admin-name"
						type="text"
						bind:value={newName}
						placeholder="Admin name"
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
					/>
				</div>

				<div>
					<label
						for="admin-mobile"
						class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
						>Mobile Number</label
					>
					<input
						id="admin-mobile"
						type="tel"
						bind:value={newMobile}
						placeholder="10-digit mobile"
						maxlength="10"
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
					/>
				</div>

				<div>
					<p class="mb-2 text-xs font-medium text-[var(--dash-text-secondary)]">Permissions</p>
					<div class="space-y-2">
						<label class="flex items-center gap-2 text-sm text-[var(--dash-text)]">
							<input type="checkbox" bind:checked={newPermUser} class="rounded" />
							User Management
						</label>
						<label class="flex items-center gap-2 text-sm text-[var(--dash-text)]">
							<input type="checkbox" bind:checked={newPermRule} class="rounded" />
							Rule Authoring
						</label>
						<label class="flex items-center gap-2 text-sm text-[var(--dash-text)]">
							<input type="checkbox" bind:checked={newPermSettings} class="rounded" />
							System Settings
						</label>
					</div>
				</div>
			</div>

			{#if saveError}
				<p class="mt-3 text-xs font-medium text-[var(--dash-contrast-text)]">{saveError}</p>
			{/if}

			<div class="mt-6 flex gap-3">
				<button
					onclick={() => {
						showAddModal = false;
					}}
					class="flex-1 rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Cancel
				</button>
				<button
					onclick={createAdmin}
					disabled={saving}
					class="flex-1 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)] disabled:opacity-50"
				>
					{saving ? 'Creating...' : 'Create Admin'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Promote/Demote OTP Modal -->
{#if showPromoteModal && promotingAdmin}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Promote or demote admin"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) showPromoteModal = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showPromoteModal = false;
		}}
	>
		<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl">
			<h3 class="mb-2 text-lg font-bold text-[var(--dash-text)]">
				{promoteAction === 'promote' ? 'Promote to Super Admin' : 'Demote from Super Admin'}
			</h3>
			<p class="mb-4 text-sm text-[var(--dash-text-secondary)]">
				{promoteAction === 'promote'
					? `This will grant ${promotingAdmin.name} full access to all admin features including account management.`
					: `This will remove super admin privileges from ${promotingAdmin.name}. They will be restricted to their assigned permissions.`}
			</p>

			<div class="mb-4 rounded-lg bg-[var(--dash-bg-alt)] p-3">
				<p class="text-xs font-medium text-[var(--dash-text-secondary)]">
					For security, an OTP will be sent to your phone to confirm this action.
				</p>
			</div>

			{#if !otpSent}
				<button
					onclick={sendPromoteOtp}
					disabled={otpSending}
					class="w-full rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)] disabled:opacity-50"
				>
					{otpSending ? 'Sending OTP...' : 'Send OTP to My Phone'}
				</button>
			{:else}
				<div class="space-y-3">
					<div>
						<label
							for="otp-input"
							class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
							>Enter OTP</label
						>
						<input
							id="otp-input"
							type="text"
							bind:value={otpValue}
							placeholder="4-digit OTP"
							maxlength="6"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-center font-mono text-lg tracking-widest text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
						/>
					</div>

					<button
						onclick={confirmPromote}
						disabled={saving || !otpValue}
						class="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50
							{promoteAction === 'promote'
							? 'bg-[var(--dash-btn-bg)] hover:brightness-110'
							: 'bg-[var(--dash-bg-alt)] hover:bg-[var(--dash-hover)]'}"
					>
						{saving
							? 'Processing...'
							: promoteAction === 'promote'
								? 'Confirm Promotion'
								: 'Confirm Demotion'}
					</button>
				</div>
			{/if}

			{#if saveError}
				<p class="mt-3 text-xs font-medium text-[var(--dash-contrast-text)]">{saveError}</p>
			{/if}

			<button
				onclick={() => {
					showPromoteModal = false;
				}}
				class="mt-3 w-full rounded-lg border border-[var(--dash-border)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}
