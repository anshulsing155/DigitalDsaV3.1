<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { openConfirmModal } from '$lib/stores/confirmModal';
	import { secureFetch } from '$lib/utils/csrf';
	import Admin2faSection from '$lib/components/admin/Admin2faSection.svelte';
	import ActiveSessionsSection from '$lib/components/account/ActiveSessionsSection.svelte';

	let { data } = $props();
	let admin = $derived(data.admin);
	let apiKeys = $derived(data.apiKeys);
	let systemConfigs = $derived(data.systemConfigs);

	// ── API Key state ──────────────────────────────────────────────
	let showAddKeyForm = $state(false);
	let newKeyProvider = $state<string>('openai');
	let newKeyLabel = $state('');
	let newKeyValue = $state('');
	let addingKey = $state(false);
	let addKeyError = $state('');

	let togglingKeyId = $state<string | null>(null);
	let deletingKeyId = $state<string | null>(null);
	let rotatingKeyId = $state<string | null>(null);
	let rotateNewValue = $state('');

	// ── System Config state ────────────────────────────────────────
	let savingConfigKey = $state<string | null>(null);
	/** Track pending number/string values before save */
	let editedConfigValues = $state<Record<string, string | number>>({});

	// ── Feedback ───────────────────────────────────────────────────
	let feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

	function showFeedback(type: 'success' | 'error', message: string) {
		if (feedbackTimer) clearTimeout(feedbackTimer);
		feedback = { type, message };
		feedbackTimer = setTimeout(() => {
			feedback = null;
		}, 4000);
	}

	// ── Provider badge colors ──────────────────────────────────────
	const providerColors: Record<string, string> = {
		openai: 'provider-openai',
		anthropic: 'provider-anthropic',
		google_gemini: 'provider-google',
		imagekit: 'provider-imagekit',
		msg91: 'provider-msg91',
		razorpay: 'provider-razorpay',
		credit_bureau: 'provider-credit-bureau',
		other: 'provider-other'
	};

	const providerLabels: Record<string, string> = {
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		google_gemini: 'Google Gemini',
		imagekit: 'ImageKit',
		msg91: 'MSG91',
		razorpay: 'Razorpay',
		credit_bureau: 'Credit Bureau',
		other: 'Other'
	};

	const configGroupLabels: Record<string, string> = {
		platform: 'Platform Toggles',
		features: 'Feature Flags',
		thresholds: 'Thresholds & Limits'
	};

	// ── Grouped system configs ─────────────────────────────────────
	let groupedConfigs = $derived(() => {
		const groups: Record<string, typeof systemConfigs> = {};
		for (const c of systemConfigs) {
			if (!groups[c.group]) groups[c.group] = [];
			groups[c.group].push(c);
		}
		return groups;
	});

	// ── Helper ─────────────────────────────────────────────────────
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleString('en-IN');
	}

	function getEditedValue(configKey: string, original: unknown): string | number {
		if (configKey in editedConfigValues) return editedConfigValues[configKey];
		return original as string | number;
	}

	// ═══════════════════════════════════════════════════════════════
	// API KEY ACTIONS
	// ═══════════════════════════════════════════════════════════════

	async function addApiKey() {
		if (!newKeyLabel.trim() || !newKeyValue.trim()) {
			addKeyError = 'Label and key value are required.';
			return;
		}
		addingKey = true;
		addKeyError = '';
		try {
			const res = await secureFetch('/api/admin/settings/api-keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: newKeyProvider,
					label: newKeyLabel.trim(),
					raw_key: newKeyValue.trim()
				})
			});
			const result = await res.json();
			if (result.success) {
				showFeedback('success', 'API key added successfully.');
				showAddKeyForm = false;
				newKeyProvider = 'openai';
				newKeyLabel = '';
				newKeyValue = '';
				await invalidateAll();
			} else {
				addKeyError = result.error || 'Failed to add API key.';
			}
		} catch {
			addKeyError = 'Network error. Please try again.';
		} finally {
			addingKey = false;
		}
	}

	async function toggleKeyActive(keyId: string, currentlyActive: boolean) {
		togglingKeyId = keyId;
		try {
			const res = await secureFetch(`/api/admin/settings/api-keys/${keyId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: !currentlyActive })
			});
			const result = await res.json();
			if (result.success) {
				showFeedback('success', `Key ${currentlyActive ? 'deactivated' : 'activated'}.`);
				await invalidateAll();
			} else {
				showFeedback('error', result.error || 'Failed to toggle key.');
			}
		} catch {
			showFeedback('error', 'Network error.');
		} finally {
			togglingKeyId = null;
		}
	}

	async function rotateKey(keyId: string) {
		if (!rotateNewValue.trim()) {
			showFeedback('error', 'Please enter the new key value.');
			return;
		}
		rotatingKeyId = keyId;
		try {
			const res = await secureFetch(`/api/admin/settings/api-keys/${keyId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ raw_key: rotateNewValue.trim() })
			});
			const result = await res.json();
			if (result.success) {
				showFeedback('success', 'Key rotated successfully.');
				rotateNewValue = '';
				rotatingKeyId = null;
				await invalidateAll();
			} else {
				showFeedback('error', result.error || 'Failed to rotate key.');
			}
		} catch {
			showFeedback('error', 'Network error.');
		} finally {
			rotatingKeyId = null;
		}
	}

	function cancelRotate() {
		rotatingKeyId = null;
		rotateNewValue = '';
	}

	function deleteKey(keyId: string, label: string) {
		openConfirmModal(
			'Delete API Key',
			`Delete API key "${label}"? This cannot be undone.`,
			async () => {
				deletingKeyId = keyId;
				try {
					const res = await secureFetch(`/api/admin/settings/api-keys/${keyId}`, {
						method: 'DELETE'
					});
					const result = await res.json();
					if (result.success) {
						showFeedback('success', 'API key deleted.');
						await invalidateAll();
					} else {
						showFeedback('error', result.error || 'Failed to delete key.');
					}
				} catch {
					showFeedback('error', 'Network error.');
				} finally {
					deletingKeyId = null;
				}
			},
			{ confirmLabel: 'Delete' }
		);
	}

	// ═══════════════════════════════════════════════════════════════
	// SYSTEM CONFIG ACTIONS
	// ═══════════════════════════════════════════════════════════════

	async function updateConfig(configKey: string, value: unknown) {
		savingConfigKey = configKey;
		try {
			const res = await secureFetch('/api/admin/settings/system-configs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ config_key: configKey, value })
			});
			const result = await res.json();
			if (result.success) {
				showFeedback('success', `Configuration "${configKey}" updated.`);
				// Clear edited value since it's now saved
				const next = { ...editedConfigValues };
				delete next[configKey];
				editedConfigValues = next;
				await invalidateAll();
			} else {
				showFeedback('error', result.error || 'Failed to update config.');
			}
		} catch {
			showFeedback('error', 'Network error.');
		} finally {
			savingConfigKey = null;
		}
	}

	function handleBooleanToggle(configKey: string, currentValue: unknown) {
		updateConfig(configKey, !currentValue);
	}

	function handleNumberSave(configKey: string) {
		const val = editedConfigValues[configKey];
		const num = Number(val);
		if (isNaN(num)) {
			showFeedback('error', 'Please enter a valid number.');
			return;
		}
		updateConfig(configKey, num);
	}

	function handleStringSave(configKey: string) {
		const val = editedConfigValues[configKey];
		updateConfig(configKey, String(val ?? ''));
	}
</script>

<svelte:head>
	<title>Admin: Settings | DigitalDSA</title>
</svelte:head>

<div class="settings-page">
	<h1>Admin Settings</h1>

	<!-- Feedback toast -->
	{#if feedback}
		<div
			class="feedback-toast"
			class:feedback-success={feedback.type === 'success'}
			class:feedback-error={feedback.type === 'error'}
		>
			{feedback.message}
		</div>
	{/if}

	{#if admin}
		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- SECTION 1: Admin Profile                                    -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<section class="profile-section">
			<h2>Admin Profile</h2>
			<div class="profile-card">
				<div class="avatar">
					{admin.name.charAt(0).toUpperCase()}
				</div>
				<div class="profile-details">
					<div class="detail-row">
						<span class="detail-label">Name</span>
						<span class="detail-value">{admin.name}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Mobile</span>
						<span class="detail-value">{admin.mobileNumber}</span>
					</div>
					{#if admin.email}
						<div class="detail-row">
							<span class="detail-label">Email</span>
							<span class="detail-value">{admin.email}</span>
						</div>
					{/if}
					<div class="detail-row">
						<span class="detail-label">Status</span>
						<span class="detail-value">
							<span
								class="status-indicator"
								class:active={admin.is_active}
								class:inactive={!admin.is_active}
							>
								{admin.is_active ? 'Active' : 'Inactive'}
							</span>
						</span>
					</div>
					{#if admin.last_login}
						<div class="detail-row">
							<span class="detail-label">Last Login</span>
							<span class="detail-value">{formatDate(admin.last_login)}</span>
						</div>
					{/if}
					{#if admin.created_at}
						<div class="detail-row">
							<span class="detail-label">Account Created</span>
							<span class="detail-value">{formatDate(admin.created_at)}</span>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<section class="permissions-section">
			<h2>Permissions</h2>
			<div class="permissions-grid">
				<div class="permission-card" class:enabled={admin.permissions.user_management}>
					<div class="permission-icon">{admin.permissions.user_management ? 'ON' : 'OFF'}</div>
					<div class="permission-info">
						<h3>User Management</h3>
						<p>View and manage DSA and RM user accounts</p>
					</div>
				</div>
				<div class="permission-card" class:enabled={admin.permissions.rule_authoring}>
					<div class="permission-icon">{admin.permissions.rule_authoring ? 'ON' : 'OFF'}</div>
					<div class="permission-info">
						<h3>Rule Authoring</h3>
						<p>Upload, parse, review, and publish lender rules</p>
					</div>
				</div>
				<div class="permission-card" class:enabled={admin.permissions.system_settings}>
					<div class="permission-icon">{admin.permissions.system_settings ? 'ON' : 'OFF'}</div>
					<div class="permission-info">
						<h3>System Settings</h3>
						<p>Access and modify system configuration</p>
					</div>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- SECTION 1b: Two-factor authentication (E.2)               -->
		<!-- ════════════════════════════════════════════════════════════ -->
		{#if admin?.twofa}
			<div class="mt-6">
				<Admin2faSection twofa={admin.twofa} onFeedback={showFeedback} />
			</div>
		{/if}

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- SECTION 1c: Active devices (E.3)                          -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<div class="mt-6">
			<ActiveSessionsSection />
		</div>


		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- SECTION 2: API Key Management                              -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<section class="api-keys-section">
			<div class="section-header">
				<h2>API Key Management</h2>
				<button
					class="btn-primary"
					onclick={() => {
						showAddKeyForm = !showAddKeyForm;
						addKeyError = '';
					}}
				>
					{showAddKeyForm ? 'Cancel' : 'Add API Key'}
				</button>
			</div>

			<!-- Add Key Form -->
			{#if showAddKeyForm}
				<div class="add-key-form">
					<div class="form-row">
						<div class="form-group">
							<label for="key-provider">Provider</label>
							<select id="key-provider" bind:value={newKeyProvider}>
								<option value="openai">OpenAI</option>
								<option value="anthropic">Anthropic</option>
								<option value="google_gemini">Google Gemini</option>
								<option value="imagekit">ImageKit</option>
								<option value="msg91">MSG91</option>
								<option value="razorpay">Razorpay</option>
								<option value="credit_bureau">Credit Bureau</option>
								<option value="other">Other</option>
							</select>
						</div>
						<div class="form-group">
							<label for="key-label">Label</label>
							<input
								id="key-label"
								type="text"
								bind:value={newKeyLabel}
								placeholder="e.g. Production Key"
							/>
						</div>
					</div>
					<div class="form-group">
						<label for="key-value">API Key Value</label>
						<input
							id="key-value"
							type="password"
							bind:value={newKeyValue}
							placeholder="sk-..."
							autocomplete="off"
						/>
					</div>
					{#if addKeyError}
						<p class="form-error">{addKeyError}</p>
					{/if}
					<button class="btn-primary" onclick={addApiKey} disabled={addingKey}>
						{addingKey ? 'Adding...' : 'Add Key'}
					</button>
				</div>
			{/if}

			<!-- Key list -->
			{#if apiKeys.length === 0}
				<div class="empty-card">
					<p>No API keys configured. Add one to get started.</p>
				</div>
			{:else}
				<div class="key-list">
					{#each apiKeys as key (key.key_id)}
						<div class="key-card" class:key-inactive={!key.is_active}>
							<div class="key-card-header">
								<span class="provider-badge {providerColors[key.provider] || 'provider-other'}">
									{providerLabels[key.provider] || key.provider}
								</span>
								<span class="key-label">{key.label}</span>
								<span class="key-masked">****{key.last_four}</span>
								<span
									class="status-indicator"
									class:active={key.is_active}
									class:inactive={!key.is_active}
								>
									{key.is_active ? 'Active' : 'Inactive'}
								</span>
							</div>

							<div class="key-card-meta">
								<span>Last used: {formatDate(key.last_used)}</span>
								<span>Created: {formatDate(key.created_at)}</span>
							</div>

							<!-- Rotate inline form -->
							{#if rotatingKeyId === key.key_id}
								<div class="rotate-form">
									<input
										type="password"
										bind:value={rotateNewValue}
										placeholder="Enter new key value..."
										autocomplete="off"
									/>
									<div class="rotate-actions">
										<button
											class="btn-primary btn-sm"
											onclick={() => rotateKey(key.key_id)}
											disabled={!rotateNewValue.trim()}
										>
											Confirm Rotate
										</button>
										<button class="btn-secondary btn-sm" onclick={cancelRotate}> Cancel </button>
									</div>
								</div>
							{/if}

							<div class="key-card-actions">
								<button
									class="btn-secondary btn-sm"
									onclick={() => toggleKeyActive(key.key_id, key.is_active)}
									disabled={togglingKeyId === key.key_id}
								>
									{togglingKeyId === key.key_id ? '...' : key.is_active ? 'Deactivate' : 'Activate'}
								</button>
								<button
									class="btn-secondary btn-sm"
									onclick={() => {
										rotatingKeyId = key.key_id;
										rotateNewValue = '';
									}}
									disabled={rotatingKeyId === key.key_id}
								>
									Rotate
								</button>
								<button
									class="btn-danger btn-sm"
									onclick={() => deleteKey(key.key_id, key.label)}
									disabled={deletingKeyId === key.key_id}
								>
									{deletingKeyId === key.key_id ? 'Deleting...' : 'Delete'}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- SECTION 3: System Configuration                            -->
		<!-- ════════════════════════════════════════════════════════════ -->
		<section class="system-config-section">
			<h2>System Configuration</h2>

			{#each Object.entries(groupedConfigs()) as [group, configs] (group)}
				<div class="config-group">
					<h3 class="config-group-title">{configGroupLabels[group] || group}</h3>
					<div class="config-list">
						{#each configs as config (config.config_key)}
							<div class="config-item">
								<div class="config-info">
									<span class="config-label">{config.label}</span>
									<span class="config-description">{config.description}</span>
									<span class="config-meta">
										Updated by {config.updated_by} on {formatDate(config.updated_at)}
									</span>
								</div>
								<div class="config-control">
									{#if config.value_type === 'boolean'}
										<button
											class="toggle-switch"
											class:toggle-on={!!config.value}
											onclick={() => handleBooleanToggle(config.config_key, config.value)}
											disabled={savingConfigKey === config.config_key}
											aria-label="Toggle {config.label}"
										>
											<span class="toggle-knob"></span>
										</button>
									{:else if config.value_type === 'number'}
										<div class="input-with-save">
											<input
												type="number"
												value={getEditedValue(config.config_key, config.value)}
												oninput={(e) => {
													editedConfigValues = {
														...editedConfigValues,
														[config.config_key]: (e.target as HTMLInputElement).value
													};
												}}
											/>
											<button
												class="btn-primary btn-sm"
												onclick={() => handleNumberSave(config.config_key)}
												disabled={savingConfigKey === config.config_key}
											>
												{savingConfigKey === config.config_key ? '...' : 'Save'}
											</button>
										</div>
									{:else}
										<div class="input-with-save">
											<input
												type="text"
												value={getEditedValue(config.config_key, config.value)}
												oninput={(e) => {
													editedConfigValues = {
														...editedConfigValues,
														[config.config_key]: (e.target as HTMLInputElement).value
													};
												}}
											/>
											<button
												class="btn-primary btn-sm"
												onclick={() => handleStringSave(config.config_key)}
												disabled={savingConfigKey === config.config_key}
											>
												{savingConfigKey === config.config_key ? '...' : 'Save'}
											</button>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}

			{#if systemConfigs.length === 0}
				<div class="empty-card">
					<p>No system configurations found. Defaults will be seeded on next page load.</p>
				</div>
			{/if}
		</section>
	{:else}
		<div class="empty-state">
			<p>Admin profile not found. Your session may have expired.</p>
			<a href="/login" class="login-link">Go to Login</a>
		</div>
	{/if}
</div>

<style>
	.settings-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 2rem;
		color: var(--dash-text);
	}

	h2 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem;
		color: var(--dash-text);
	}

	section {
		margin-bottom: 2rem;
	}

	/* ── Feedback Toast ────────────────────────────────────────── */
	.feedback-toast {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 100;
		padding: 0.75rem 1.25rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		animation: slideIn 0.25s ease-out;
	}

	.feedback-success {
		background: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.feedback-error {
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(1rem);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* ── Profile Card ──────────────────────────────────────────── */
	.profile-card {
		display: flex;
		gap: 1.5rem;
		padding: 1.5rem;
		background: var(--dash-bg-card);
		border: 1px solid var(--dash-border-light);
		border-radius: 0.75rem;
	}

	.avatar {
		width: 4rem;
		height: 4rem;
		border-radius: 9999px;
		background: var(--color-primary, #2563eb);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.profile-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.detail-label {
		font-size: 0.813rem;
		color: var(--dash-text-secondary);
		width: 8rem;
		flex-shrink: 0;
	}

	.detail-value {
		font-size: 0.875rem;
		color: var(--dash-text);
		font-weight: 500;
	}

	.status-indicator {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-indicator.active {
		background: #dcfce7;
		color: #166534;
	}

	.status-indicator.inactive {
		background: #fee2e2;
		color: #991b1b;
	}

	/* ── Permissions ───────────────────────────────────────────── */
	.permissions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.permission-card {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--dash-bg-card);
		border: 1px solid var(--dash-border-light);
		border-radius: 0.75rem;
		opacity: 0.6;
	}

	.permission-card.enabled {
		opacity: 1;
		border-color: #bbf7d0;
		background: #f0fdf4;
	}

	.permission-icon {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
	}

	.permission-card.enabled .permission-icon {
		background: #dcfce7;
		color: #166534;
	}

	.permission-info h3 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.25rem;
	}

	.permission-info p {
		font-size: 0.75rem;
		color: var(--dash-text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	/* ── Section Header (title + action button) ────────────────── */
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
	}

	/* ── Buttons ───────────────────────────────────────────────── */
	.btn-primary {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.813rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: var(--dash-bg-alt);
		color: var(--dash-text);
		border: 1px solid var(--dash-border-light);
		border-radius: 0.5rem;
		font-size: 0.813rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--dash-hover);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger {
		padding: 0.5rem 1rem;
		background: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		font-size: 0.813rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-danger:hover:not(:disabled) {
		background: #fecaca;
	}

	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
	}

	/* ── Add Key Form ──────────────────────────────────────────── */
	.add-key-form {
		padding: 1.25rem;
		background: var(--dash-bg-alt);
		border: 1px solid var(--dash-border-light);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.875rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-group label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text);
	}

	.form-group input,
	.form-group select {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--dash-border-light);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		background: var(--dash-bg-card);
		color: var(--dash-text);
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
	}

	.form-error {
		font-size: 0.813rem;
		color: #dc2626;
		margin: 0;
	}

	/* ── Key List ──────────────────────────────────────────────── */
	.key-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.key-card {
		padding: 1rem 1.25rem;
		background: var(--dash-bg-card);
		border: 1px solid var(--dash-border-light);
		border-radius: 0.75rem;
		transition: border-color 0.15s;
	}

	.key-card:hover {
		border-color: var(--dash-border-light);
	}

	.key-card.key-inactive {
		opacity: 0.65;
		background: var(--dash-bg-alt);
	}

	.key-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.key-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--dash-text);
	}

	.key-masked {
		font-size: 0.813rem;
		font-family: 'SF Mono', 'Fira Code', monospace;
		color: var(--dash-text-secondary);
		background: var(--dash-bg-alt);
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
	}

	.key-card-meta {
		display: flex;
		gap: 1.5rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--dash-text-muted);
	}

	.key-card-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	/* ── Rotate inline form ────────────────────────────────────── */
	.rotate-form {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: var(--dash-bg-alt);
		border: 1px solid var(--dash-border-light);
		border-radius: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rotate-form input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--dash-border-light);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		background: var(--dash-bg-card);
		width: 100%;
		box-sizing: border-box;
	}

	.rotate-form input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
	}

	.rotate-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* ── Provider Badges ───────────────────────────────────────── */
	.provider-badge {
		display: inline-block;
		padding: 0.125rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.688rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		white-space: nowrap;
	}

	.provider-openai {
		background: #dcfce7;
		color: #15803d;
	}

	.provider-anthropic {
		background: #ffedd5;
		color: #c2410c;
	}

	.provider-google {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.provider-imagekit {
		background: #f3e8ff;
		color: #7e22ce;
	}

	.provider-msg91 {
		background: #cffafe;
		color: #0e7490;
	}

	.provider-razorpay {
		background: #e0e7ff;
		color: #4338ca;
	}

	.provider-credit-bureau {
		background: #ebd7cc;
		color: #8e5739;
	}

	.provider-other {
		background: #f3f4f6;
		color: #4b5563;
	}

	/* ── System Config ─────────────────────────────────────────── */
	.config-group {
		margin-bottom: 1.5rem;
	}

	.config-group-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--dash-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--dash-border-light);
	}

	.config-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.config-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: var(--dash-bg-card);
		border: 1px solid var(--dash-border-light);
		border-radius: 0.75rem;
	}

	.config-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.config-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--dash-text);
	}

	.config-description {
		font-size: 0.75rem;
		color: var(--dash-text-secondary);
		line-height: 1.4;
	}

	.config-meta {
		font-size: 0.688rem;
		color: var(--dash-text-muted);
		margin-top: 0.125rem;
	}

	.config-control {
		flex-shrink: 0;
	}

	/* ── Toggle Switch ─────────────────────────────────────────── */
	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 2.75rem;
		height: 1.5rem;
		background: var(--dash-border-light);
		border: none;
		border-radius: 9999px;
		cursor: pointer;
		transition: background 0.2s;
		padding: 0;
	}

	.toggle-switch.toggle-on {
		background: #22c55e;
	}

	.toggle-switch:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-knob {
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		width: 1.25rem;
		height: 1.25rem;
		background: #fff;
		border-radius: 9999px;
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	}

	.toggle-switch.toggle-on .toggle-knob {
		transform: translateX(1.25rem);
	}

	/* ── Input with save button ────────────────────────────────── */
	.input-with-save {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.input-with-save input {
		width: 7rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--dash-border-light);
		border-radius: 0.375rem;
		font-size: 0.813rem;
		background: var(--dash-bg-card);
		color: var(--dash-text);
	}

	.input-with-save input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
	}

	/* ── Empty States ──────────────────────────────────────────── */
	.empty-card {
		padding: 2rem;
		background: var(--dash-bg-alt);
		border: 1px dashed var(--dash-border-light);
		border-radius: 0.75rem;
		text-align: center;
	}

	.empty-card p {
		font-size: 0.875rem;
		color: var(--dash-text-secondary);
		margin: 0;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--dash-text-secondary);
	}

	.empty-state p {
		margin: 0 0 1rem;
	}

	.login-link {
		color: var(--color-primary, #2563eb);
		text-decoration: none;
		font-weight: 500;
	}

	.login-link:hover {
		text-decoration: underline;
	}

	/* ── Responsive ────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.settings-page {
			padding: 1rem;
		}

		.profile-card {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.detail-row {
			flex-direction: column;
			gap: 0.25rem;
			text-align: center;
		}

		.detail-label {
			width: auto;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.key-card-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.375rem;
		}

		.key-card-actions {
			flex-wrap: wrap;
		}

		.config-item {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.input-with-save input {
			width: 100%;
			flex: 1;
		}
	}
</style>
