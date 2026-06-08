<script lang="ts">
	/**
	 * RM Contacts Management — /dashboard/dsa/rm-contacts
	 * ═══════════════════════════════════════════════════════════════════
	 * DSA can view, search, filter, add, confirm, and edit RM contacts.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { openConfirmModal } from '$lib/stores/confirmModal';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { secureFetch } from '$lib/utils/csrf';

	let { data }: { data: PageData } = $props();

	// ── State ────────────────────────────────────────────────────
	// svelte-ignore state_referenced_locally
	let searchInput = $state(data.activeFilters.search);
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let confirming = $state('');
	let deactivating = $state('');
	let actionError = $state('');

	// ── Modal state ─────────────────────────────────────────────
	let showModal = $state(false);
	let editingId = $state('');
	let formName = $state('');
	let formLender = $state('');
	let formBranch = $state('');
	let formCity = $state('');
	let formPhone = $state('');
	let formEmail = $state('');
	let formWhatsapp = $state('');
	let formDesignation = $state('');
	let formLoanTypes = $state<string[]>([]);
	let formNotes = $state('');
	let formSaving = $state(false);
	let formError = $state('');

	const LOAN_TYPES = [
		'Home Loan',
		'Loan Against Property',
		'Personal Loan',
		'Business Loan - Unsecured',
		'Business Loan - Secured',
		'Plot and Construction Loan'
	];

	const DESIGNATIONS = ['RM', 'Senior RM', 'Credit Manager', 'Branch Manager', 'Other'];

	// ── Sync search input with server data ──────────────────────
	$effect(() => {
		searchInput = data.activeFilters.search;
	});

	// ── Filter helpers (URL-driven) ─────────────────────────────
	function applyFilters(params: Record<string, string>) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(params)) {
			if (value) {
				url.searchParams.set(key, value);
			} else {
				url.searchParams.delete(key);
			}
		}
		// Reset to page 1 on filter change (unless changing page)
		if (!('page' in params)) {
			url.searchParams.delete('page');
		}
		goto(url.toString(), { replaceState: true, keepFocus: true });
	}

	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			applyFilters({ search: searchInput });
		}, 400);
	}

	function clearFilters() {
		searchInput = '';
		goto('/dashboard/dsa/rm-contacts', { replaceState: true });
	}

	const hasActiveFilters = $derived(
		data.activeFilters.search !== '' ||
			data.activeFilters.lender !== '' ||
			data.activeFilters.city !== ''
	);

	// ── Confirm RM contact ──────────────────────────────────────
	async function confirmContact(rmId: string) {
		confirming = rmId;
		actionError = '';

		try {
			const res = await secureFetch(`/api/rm-contacts/${rmId}/confirm`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const result = await res.json();

			if (result.success) {
				// Update local state
				const contact = data.contacts.find((c: any) => c._id === rmId);
				if (contact) {
					contact.confirmation_count = (contact.confirmation_count || 0) + 1;
					contact.last_confirmed_at = new Date().toISOString();
					if (!contact.contributed_by.includes(data.dsaId)) {
						contact.contributed_by.push(data.dsaId);
					}
				}
			} else {
				actionError = result.error || 'Failed to confirm contact';
			}
		} catch {
			actionError = 'Network error. Please try again.';
		} finally {
			confirming = '';
		}
	}

	// ── Deactivate RM contact ───────────────────────────────────
	function deactivateContact(rmId: string) {
		openConfirmModal(
			'Deactivate RM Contact',
			'Deactivate this RM contact? It will be hidden from all DSAs.',
			async () => {
				deactivating = rmId;
				actionError = '';

				try {
					const res = await secureFetch(`/api/rm-contacts/${rmId}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ is_active: false })
					});
					const result = await res.json();

					if (result.success) {
						await invalidateAll();
					} else {
						actionError = result.error || 'Failed to deactivate contact';
					}
				} catch {
					actionError = 'Network error. Please try again.';
				} finally {
					deactivating = '';
				}
			},
			{ confirmLabel: 'Deactivate' }
		);
	}

	// ── Modal: open for create/edit ─────────────────────────────
	function openCreateModal() {
		editingId = '';
		formName = '';
		formLender = '';
		formBranch = '';
		formCity = '';
		formPhone = '';
		formEmail = '';
		formWhatsapp = '';
		formDesignation = '';
		formLoanTypes = [];
		formNotes = '';
		formError = '';
		showModal = true;
	}

	function openEditModal(contact: any) {
		editingId = contact._id;
		formName = contact.rm_name || '';
		formLender = contact.lender_name || '';
		formBranch = contact.branch || '';
		formCity = contact.city || '';
		formPhone = contact.phone || '';
		formEmail = contact.email || '';
		formWhatsapp = contact.whatsapp || '';
		formDesignation = contact.designation || '';
		formLoanTypes = contact.loan_types_handled || [];
		formNotes = (contact.notes_by_dsa && contact.notes_by_dsa[data.dsaId]) || '';
		formError = '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingId = '';
		formError = '';
	}

	function toggleLoanType(lt: string) {
		if (formLoanTypes.includes(lt)) {
			formLoanTypes = formLoanTypes.filter((t) => t !== lt);
		} else {
			formLoanTypes = [...formLoanTypes, lt];
		}
	}

	async function saveContact() {
		if (!formName.trim() || !formLender.trim()) {
			formError = 'RM Name and Lender are required';
			return;
		}

		formSaving = true;
		formError = '';

		const body: Record<string, any> = {
			rm_name: formName.trim(),
			lender_name: formLender.trim()
		};

		if (formBranch.trim()) body.branch = formBranch.trim();
		if (formCity.trim()) body.city = formCity.trim();
		if (formPhone.trim()) body.phone = formPhone.trim();
		if (formEmail.trim()) body.email = formEmail.trim();
		if (formWhatsapp.trim()) body.whatsapp = formWhatsapp.trim();
		if (formDesignation) body.designation = formDesignation;
		if (formLoanTypes.length > 0) body.loan_types_handled = formLoanTypes;
		if (formNotes.trim()) body.notes_by_dsa = { [data.dsaId]: formNotes.trim() };

		try {
			const url = editingId ? `/api/rm-contacts/${editingId}` : '/api/rm-contacts';
			const method = editingId ? 'PATCH' : 'POST';

			const res = await secureFetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const result = await res.json();

			if (result.success) {
				closeModal();
				await invalidateAll();
			} else {
				formError = result.error || 'Failed to save contact';
			}
		} catch {
			formError = 'Network error. Please try again.';
		} finally {
			formSaving = false;
		}
	}

	// ── Format helpers ──────────────────────────────────────────
	function formatTimeAgo(dateStr: string): string {
		const now = new Date();
		const date = new Date(dateStr);
		const diffMs = now.getTime() - date.getTime();
		const mins = Math.floor(diffMs / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `${days}d ago`;
		const months = Math.floor(days / 30);
		return `${months}mo ago`;
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((w) => w[0])
			.join('')
			.substring(0, 2)
			.toUpperCase();
	}
</script>

<svelte:head>
	<title>RM Contacts — DigitalDSA</title>
</svelte:head>

<div class="space-y-5">
	<!-- Header -->
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold text-[var(--dash-text)]">RM Contacts</h1>
				{#if data.pagination.total > 0}
					<span
						class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-bold text-[var(--dash-text-secondary)]"
					>
						{data.pagination.total}
					</span>
				{/if}
			</div>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Manage bank RM contacts for faster case processing
			</p>
		</div>
		<button
			onclick={openCreateModal}
			class="shrink-0 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-semibold text-[var(--dash-btn-text)] shadow-sm transition-opacity hover:opacity-90"
		>
			Add RM Contact
		</button>
	</div>

	<!-- Filter Bar -->
	<div class="flex flex-wrap items-center gap-3">
		<!-- Search -->
		<div class="relative min-w-0 flex-1">
			<svg
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]"
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
				type="text"
				placeholder="Search by name, lender, branch..."
				bind:value={searchInput}
				oninput={handleSearchInput}
				class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-2 pr-3 pl-9 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
			/>
		</div>

		<!-- Lender filter -->
		<select
			value={data.activeFilters.lender}
			onchange={(e) => applyFilters({ lender: e.currentTarget.value })}
			class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
		>
			<option value="">All Lenders</option>
			{#each data.lenderOptions as l}
				<option value={l}>{l}</option>
			{/each}
		</select>

		<!-- City filter -->
		<select
			value={data.activeFilters.city}
			onchange={(e) => applyFilters({ city: e.currentTarget.value })}
			class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
		>
			<option value="">All Cities</option>
			{#each data.cityOptions as c}
				<option value={c}>{c}</option>
			{/each}
		</select>

		<!-- Clear filters -->
		{#if hasActiveFilters}
			<button
				onclick={clearFilters}
				class="rounded-lg border border-[var(--dash-contrast-ghost-border)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)] transition-colors hover:bg-[var(--dash-contrast-ghost-bg)]"
			>
				Clear Filters
			</button>
		{/if}
	</div>

	<!-- Action error -->
	{#if actionError}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
		>
			{actionError}
		</div>
	{/if}

	<!-- Contact List -->
	{#if data.contacts.length > 0}
		<div class="space-y-3">
			{#each data.contacts as contact (contact._id)}
				{@const isContributor = contact.contributed_by.includes(data.dsaId)}
				<div
					class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm transition-all hover:shadow-md"
				>
					<div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
						<!-- Left: Info -->
						<div class="flex gap-3">
							<!-- Avatar -->
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ddsa-primary-100)] to-[var(--ddsa-accent-100)]"
							>
								<span class="text-xs font-bold text-[var(--ddsa-accent-500)]"
									>{getInitials(contact.rm_name)}</span
								>
							</div>

							<div class="min-w-0">
								<!-- Name + Designation -->
								<div class="flex items-center gap-2">
									<span class="text-sm font-bold text-[var(--dash-text)]">{contact.rm_name}</span>
									{#if contact.designation}
										<span
											class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-semibold text-[var(--dash-text-secondary)]"
										>
											{contact.designation}
										</span>
									{/if}
								</div>

								<!-- Lender + Location -->
								<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
									{contact.lender_name}{#if contact.branch || contact.city}
										<span class="text-[var(--dash-text-muted)]">
											{' '}&middot;{' '}
											{[contact.branch, contact.city].filter(Boolean).join(', ')}
										</span>
									{/if}
								</p>

								<!-- Confirmation info -->
								<p class="mt-1 text-[13px] text-[var(--dash-text-muted)]">
									Confirmed by {contact.confirmation_count} DSA{contact.confirmation_count !== 1
										? 's'
										: ''}
									<span class="mx-1">&middot;</span>
									Last confirmed {formatTimeAgo(contact.last_confirmed_at)}
								</p>

								<!-- Loan types -->
								{#if contact.loan_types_handled?.length}
									<div class="mt-1.5 flex flex-wrap gap-1">
										{#each contact.loan_types_handled as lt}
											<span
												class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-accent-text)]"
											>
												{lt}
											</span>
										{/each}
									</div>
								{/if}

								<!-- DSA's private note -->
								{#if contact.notes_by_dsa?.[data.dsaId]}
									<p class="mt-1.5 text-[13px] text-[var(--dash-text-muted)] italic">
										Note: {contact.notes_by_dsa[data.dsaId]}
									</p>
								{/if}
							</div>
						</div>

						<!-- Right: Actions -->
						<div class="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
							{#if contact.phone}
								<a
									href="tel:{contact.phone}"
									class="flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--dash-btn-ghost-border)] hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--dash-accent-text)]"
									title="Call {contact.rm_name}"
								>
									<svg
										class="h-3.5 w-3.5"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="2"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
										/>
									</svg>
									Call
								</a>
							{/if}

							{#if contact.whatsapp}
								<a
									href="https://wa.me/91{contact.whatsapp}"
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--dash-btn-ghost-border)] hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--dash-accent-text)]"
									title="WhatsApp {contact.rm_name}"
								>
									<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
										<path
											d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
										/>
									</svg>
									WhatsApp
								</a>
							{/if}

							<button
								onclick={() => confirmContact(contact._id)}
								disabled={confirming === contact._id}
								class="flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--dash-btn-ghost-border)] hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--dash-accent-text)] disabled:opacity-50"
								title="Confirm this RM is active and responsive"
							>
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								{confirming === contact._id ? 'Confirming...' : 'Confirm'}
							</button>

							<button
								onclick={() => openEditModal(contact)}
								class="rounded-lg border border-[var(--dash-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--ddsa-accent-500)]/50 hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--ddsa-accent-500)]"
								title="Edit contact details"
							>
								Edit
							</button>

							{#if isContributor}
								<button
									onclick={() => deactivateContact(contact._id)}
									disabled={deactivating === contact._id}
									class="rounded-lg border border-[var(--dash-contrast-ghost-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--dash-contrast-text)] transition-colors hover:bg-[var(--dash-contrast-ghost-bg)] disabled:opacity-50"
									title="Deactivate this contact"
								>
									{deactivating === contact._id ? '...' : 'Deactivate'}
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div class="flex items-center justify-between pt-2">
				<button
					onclick={() => applyFilters({ page: String(data.pagination.page - 1) })}
					disabled={data.pagination.page <= 1}
					class="rounded-lg border border-[var(--dash-border)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-40"
				>
					Previous
				</button>
				<span class="text-xs text-[var(--dash-text-muted)]">
					Page {data.pagination.page} of {data.pagination.totalPages}
				</span>
				<button
					onclick={() => applyFilters({ page: String(data.pagination.page + 1) })}
					disabled={data.pagination.page >= data.pagination.totalPages}
					class="rounded-lg border border-[var(--dash-border)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-40"
				>
					Next
				</button>
			</div>
		{/if}
	{:else}
		<!-- Empty State -->
		{#if hasActiveFilters}
			<EmptyState title="No contacts match your filters" variant="filtered">
				{#snippet action()}
					<button
						onclick={clearFilters}
						class="rounded-lg border border-[var(--dash-border)] px-4 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
					>
						Clear Filters
					</button>
				{/snippet}
			</EmptyState>
		{:else}
			<EmptyState
				title="No RM contacts yet"
				description="Add your first bank RM contact to speed up case processing"
				variant="default"
			>
				{#snippet action()}
					<button
						onclick={openCreateModal}
						class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-xs font-semibold text-[var(--dash-btn-text)] shadow-sm transition-opacity hover:opacity-90"
					>
						Add RM Contact
					</button>
				{/snippet}
			</EmptyState>
		{/if}
	{/if}
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- ADD / EDIT MODAL                                                -->
<!-- ═══════════════════════════════════════════════════════════════ -->
{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="dialog"
		aria-modal="true"
		aria-label={editingId ? 'Edit RM contact' : 'Add RM contact'}
		tabindex="-1"
		onkeydown={(e) => {
			if (e.key === 'Escape') closeModal();
		}}
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
	>
		<div
			class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] shadow-2xl"
		>
			<div class="border-b border-[var(--dash-border)] px-5 py-4">
				<h2 class="text-lg font-bold text-[var(--dash-text)]">
					{editingId ? 'Edit RM Contact' : 'Add RM Contact'}
				</h2>
			</div>

			<div class="space-y-4 px-5 py-4">
				<!-- RM Name -->
				<div>
					<label
						for="rm-name"
						class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
						>RM Name <span class="text-[var(--dash-contrast-text)]">*</span></label
					>
					<input
						id="rm-name"
						type="text"
						bind:value={formName}
						placeholder="e.g. Sanjay Kapoor"
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					/>
				</div>

				<!-- Lender Name -->
				<div>
					<label
						for="rm-lender"
						class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
						>Lender <span class="text-[var(--dash-contrast-text)]">*</span></label
					>
					<input
						id="rm-lender"
						type="text"
						bind:value={formLender}
						list="lender-suggestions"
						placeholder="e.g. HDFC Bank"
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					/>
					<datalist id="lender-suggestions">
						{#each data.lenderOptions as l}
							<option value={l}></option>
						{/each}
					</datalist>
				</div>

				<!-- Branch + City -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label
							for="rm-branch"
							class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Branch</label
						>
						<input
							id="rm-branch"
							type="text"
							bind:value={formBranch}
							placeholder="e.g. Andheri West"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="rm-city"
							class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">City</label
						>
						<input
							id="rm-city"
							type="text"
							bind:value={formCity}
							placeholder="e.g. Mumbai"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Phone + WhatsApp -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label
							for="rm-phone"
							class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Phone</label
						>
						<input
							id="rm-phone"
							type="tel"
							bind:value={formPhone}
							placeholder="e.g. 9876543210"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="rm-whatsapp"
							class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
							>WhatsApp</label
						>
						<input
							id="rm-whatsapp"
							type="tel"
							bind:value={formWhatsapp}
							placeholder="e.g. 9876543210"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Email -->
				<div>
					<label
						for="rm-email"
						class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Email</label
					>
					<input
						id="rm-email"
						type="email"
						bind:value={formEmail}
						placeholder="e.g. sanjay.kapoor@hdfc.com"
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					/>
				</div>

				<!-- Designation -->
				<div>
					<label
						for="rm-designation"
						class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
						>Designation</label
					>
					<select
						id="rm-designation"
						bind:value={formDesignation}
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					>
						<option value="">Select designation</option>
						{#each DESIGNATIONS as d}
							<option value={d}>{d}</option>
						{/each}
					</select>
				</div>

				<!-- Loan Types Handled -->
				<div>
					<span class="mb-1.5 block text-xs font-medium text-[var(--dash-text-secondary)]"
						>Loan Types Handled</span
					>
					<div class="flex flex-wrap gap-2">
						{#each LOAN_TYPES as lt}
							<button
								type="button"
								onclick={() => toggleLoanType(lt)}
								class="rounded-full border px-3 py-1 text-[13px] font-medium transition-colors
									{formLoanTypes.includes(lt)
									? 'border-[var(--ddsa-accent-500)] bg-[var(--dash-btn-ghost-bg)] text-[var(--ddsa-accent-500)]'
									: 'border-[var(--dash-border)] text-[var(--dash-text-secondary)] hover:border-[var(--ddsa-accent-500)]/50'}"
							>
								{lt}
							</button>
						{/each}
					</div>
				</div>

				<!-- Notes -->
				<div>
					<label
						for="rm-notes"
						class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
						>Your Note <span class="text-[var(--dash-text-muted)]">(private to you)</span></label
					>
					<textarea
						id="rm-notes"
						bind:value={formNotes}
						rows="2"
						placeholder="e.g. Quick responder for HL cases"
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/30 focus:outline-none"
					></textarea>
				</div>

				<!-- Error -->
				{#if formError}
					<div
						class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
					>
						{formError}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-end gap-3 border-t border-[var(--dash-border)] px-5 py-4"
			>
				<button
					onclick={closeModal}
					class="rounded-lg border border-[var(--dash-border)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Cancel
				</button>
				<button
					onclick={saveContact}
					disabled={formSaving}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-semibold text-[var(--dash-btn-text)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{formSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Contact'}
				</button>
			</div>
		</div>
	</div>
{/if}
