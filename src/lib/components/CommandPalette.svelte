<script lang="ts">
	import { goto } from '$app/navigation';
	import { focusTrap } from '$lib/utils/focusTrap';

	interface SearchResult {
		label: string;
		description?: string;
		href: string;
		group: string;
	}

	interface Props {
		/** Current user role determines which pages are searchable */
		role: string;
	}

	let { role }: Props = $props();

	let open = $state(false);
	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	// ── Page registry by role ───────────────────────────────────
	const DSA_PAGES: SearchResult[] = [
		{
			label: 'Dashboard',
			description: 'Overview and stats',
			href: '/dashboard/dsa',
			group: 'Pages'
		},
		{
			label: 'Cases',
			description: 'All your loan cases',
			href: '/dashboard/dsa/cases',
			group: 'Pages'
		},
		{
			label: 'CRM',
			description: 'Leads, lenders, sources',
			href: '/dashboard/dsa/crm',
			group: 'Pages'
		},
		{
			label: 'CRM Leads',
			description: 'Lead management',
			href: '/dashboard/dsa/crm/leads',
			group: 'Pages'
		},
		{
			label: 'CRM Lenders',
			description: 'Lender contacts',
			href: '/dashboard/dsa/crm/lenders',
			group: 'Pages'
		},
		{
			label: 'CRM Sources',
			description: 'Lead sources',
			href: '/dashboard/dsa/crm/sources',
			group: 'Pages'
		},
		{
			label: 'Profile',
			description: 'Your DSA profile',
			href: '/dashboard/dsa/profile',
			group: 'Pages'
		},
		{
			label: 'Shared Links',
			description: 'Form links for applicants',
			href: '/dashboard/dsa/shared-links',
			group: 'Pages'
		},
		{
			label: 'RM Contacts',
			description: 'Bank RM directory',
			href: '/dashboard/dsa/rm-contacts',
			group: 'Pages'
		},
		{
			label: 'Communication',
			description: 'Templates and messaging',
			href: '/dashboard/dsa/communication',
			group: 'Pages'
		},
		{
			label: 'Analytics',
			description: 'Performance reports',
			href: '/dashboard/dsa/analytics',
			group: 'Pages'
		},
		{
			label: 'New Case',
			description: 'Start a new loan application',
			href: '/form/how-can-we-help',
			group: 'Actions'
		}
	];

	const ADMIN_PAGES: SearchResult[] = [
		{
			label: 'Admin Dashboard',
			description: 'System overview',
			href: '/dashboard/admin',
			group: 'Pages'
		},
		{
			label: 'Users',
			description: 'Manage DSA and RM users',
			href: '/dashboard/admin/users',
			group: 'Pages'
		},
		{
			label: 'Admin Accounts',
			description: 'Manage admin users',
			href: '/dashboard/admin/users/admins',
			group: 'Pages'
		},
		{
			label: 'Policies',
			description: 'Lender rule management',
			href: '/dashboard/admin/policies',
			group: 'Pages'
		},
		{
			label: 'Policy Approvals',
			description: 'Pending rule approvals',
			href: '/dashboard/admin/policies/approvals',
			group: 'Pages'
		},
		{
			label: 'Testing',
			description: 'Rule engine testing',
			href: '/dashboard/admin/testing',
			group: 'Pages'
		},
		{
			label: 'Audit Log',
			description: 'System activity log',
			href: '/dashboard/admin/audit',
			group: 'Pages'
		},
		{
			label: 'Settings',
			description: 'API keys and config',
			href: '/dashboard/admin/settings',
			group: 'Pages'
		}
	];

	const RM_PAGES: SearchResult[] = [
		{
			label: 'RM Dashboard',
			description: 'Partner overview',
			href: '/dashboard/rm',
			group: 'Pages'
		},
		{
			label: 'Cases Received',
			description: 'Cases from DSAs',
			href: '/dashboard/rm/cases',
			group: 'Pages'
		},
		{
			label: 'Communication',
			description: 'DSA messaging',
			href: '/dashboard/rm/communication',
			group: 'Pages'
		},
		{
			label: 'Broadcasts',
			description: 'Policy broadcasts',
			href: '/dashboard/rm/broadcasts',
			group: 'Pages'
		},
		{
			label: 'Policies',
			description: 'Your lender policies',
			href: '/dashboard/rm/policies',
			group: 'Pages'
		},
		{
			label: 'Submissions',
			description: 'Submitted files',
			href: '/dashboard/rm/submissions',
			group: 'Pages'
		},
		{
			label: 'DSA Search',
			description: 'Find DSA partners',
			href: '/dashboard/rm/dsa-search',
			group: 'Pages'
		},
		{
			label: 'Analytics',
			description: 'Performance metrics',
			href: '/dashboard/rm/analytics',
			group: 'Pages'
		},
		{
			label: 'Settings',
			description: 'RM settings',
			href: '/dashboard/rm/settings',
			group: 'Pages'
		}
	];

	const allPages = $derived(role === 'admin' ? ADMIN_PAGES : role === 'rm' ? RM_PAGES : DSA_PAGES);

	// ── Filtered results ────────────────────────────────────────
	const results = $derived.by(() => {
		if (!query.trim()) return allPages;
		const q = query.toLowerCase();
		return allPages.filter(
			(r) => r.label.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
		);
	});

	// ── Group results ───────────────────────────────────────────
	const groupedResults = $derived.by(() => {
		const groups: Record<string, SearchResult[]> = {};
		for (const r of results) {
			if (!groups[r.group]) groups[r.group] = [];
			groups[r.group].push(r);
		}
		return groups;
	});

	// ── Keyboard shortcut (Cmd+K / Ctrl+K) ─────────────────────
	function handleGlobalKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			toggle();
		}
		if (e.key === 'Escape' && open) {
			close();
		}
	}

	function toggle() {
		if (open) {
			close();
		} else {
			open = true;
			query = '';
			selectedIndex = 0;
			requestAnimationFrame(() => inputEl?.focus());
		}
	}

	function close() {
		open = false;
		query = '';
		selectedIndex = 0;
	}

	function navigate(result: SearchResult) {
		close();
		goto(result.href);
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter' && results[selectedIndex]) {
			e.preventDefault();
			navigate(results[selectedIndex]);
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if open}
	<div
		class="palette-backdrop"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') close();
		}}
		role="presentation"
	>
		<div class="palette" role="dialog" aria-label="Search pages" use:focusTrap>
			<!-- Search input -->
			<div class="palette-input-wrap">
				<svg
					class="palette-search-icon"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
					/>
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					onkeydown={handleInputKeydown}
					type="text"
					placeholder="Search pages..."
					class="palette-input"
					autocomplete="off"
					spellcheck="false"
				/>
				<kbd class="palette-kbd">Esc</kbd>
			</div>

			<!-- Results -->
			<div class="palette-results">
				{#if results.length === 0}
					<div class="palette-empty">No results for "{query}"</div>
				{:else}
					{#each Object.entries(groupedResults) as [group, items]}
						<div class="palette-group-label">{group}</div>
						{#each items as item, i}
							{@const flatIndex = results.indexOf(item)}
							<button
								type="button"
								class="palette-item"
								class:palette-item-selected={flatIndex === selectedIndex}
								onclick={() => navigate(item)}
								onmouseenter={() => {
									selectedIndex = flatIndex;
								}}
							>
								<div class="palette-item-text">
									<span class="palette-item-label">{item.label}</span>
									{#if item.description}
										<span class="palette-item-desc">{item.description}</span>
									{/if}
								</div>
								{#if flatIndex === selectedIndex}
									<svg
										class="palette-enter-icon"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="2"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
										/>
									</svg>
								{/if}
							</button>
						{/each}
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.palette-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 20vh;
		background: rgba(0, 0, 0, 0.4);
		animation: fadeIn 0.1s ease-out;
	}

	.palette {
		width: 100%;
		max-width: 32rem;
		margin: 0 1rem;
		border-radius: 0.75rem;
		border: 1px solid var(--dash-border);
		background: var(--dash-bg-card);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		overflow: hidden;
		animation: scaleIn 0.1s ease-out;
	}

	.palette-input-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--dash-border-light);
	}

	.palette-search-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--dash-text-muted);
		flex-shrink: 0;
	}

	.palette-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 0.9375rem;
		color: var(--dash-text);
		outline: none;
	}

	.palette-input::placeholder {
		color: var(--dash-text-muted);
	}

	.palette-kbd {
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--dash-border);
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-family: inherit;
		color: var(--dash-text-muted);
		background: var(--dash-bg-alt);
	}

	.palette-results {
		max-height: 20rem;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.palette-group-label {
		padding: 0.375rem 0.75rem 0.25rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--dash-text-muted);
	}

	.palette-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.1s;
		width: 100%;
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		text-align: left;
	}

	.palette-item-selected {
		background: var(--dash-hover, #f3f4f6);
	}

	.palette-item-text {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}

	.palette-item-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--dash-text);
	}

	.palette-item-desc {
		font-size: 0.75rem;
		color: var(--dash-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.palette-enter-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--dash-text-muted);
		flex-shrink: 0;
		transform: rotate(180deg);
	}

	.palette-empty {
		padding: 2rem 1rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--dash-text-muted);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
