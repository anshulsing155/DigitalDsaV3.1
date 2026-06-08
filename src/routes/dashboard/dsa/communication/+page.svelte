<script lang="ts">
	import { page } from '$app/stores';
	import CommunicationTemplateCard from '$lib/components/dashboard/CommunicationTemplateCard.svelte';
	import MessageComposer from '$lib/components/dashboard/MessageComposer.svelte';
	import PageTourButton from '$lib/components/walkthrough/PageTourButton.svelte';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			templates: Array<{
				template_id: string;
				name: string;
				category: string;
				channel: string;
				subject: string;
				body: string;
				variables: Array<{
					name: string;
					description: string;
					required: boolean;
				}>;
				trigger_stage: string | null;
			}>;
			recentCases: Array<{
				case_id: string;
				label: string;
				loan_type: string;
				stage: string;
			}>;
			dsaProfile: {
				name: string;
				firmName?: string;
				phone?: string;
			} | null;
		}
	);

	// ── Local state ──────────────────────────────────────────────
	let selectedTab = $state<'customer' | 'rm' | 'source'>('customer');
	let searchQuery = $state('');
	let selectedTemplateId = $state('');

	// ── Derived: template counts per category ────────────────────
	const customerCount = $derived(
		(data.templates || []).filter((t) => t.category === 'customer').length
	);
	const rmCount = $derived((data.templates || []).filter((t) => t.category === 'rm').length);
	const sourceCount = $derived(
		(data.templates || []).filter((t) => t.category === 'source').length
	);

	// ── Derived: filtered templates ──────────────────────────────
	const filteredTemplates = $derived.by(() => {
		let templates = (data.templates || []).filter((t) => t.category === selectedTab);
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			templates = templates.filter(
				(t) => t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)
			);
		}
		return templates;
	});

	// ── Derived: selected template object ────────────────────────
	const selectedTemplate = $derived(
		(data.templates || []).find((t) => t.template_id === selectedTemplateId) || null
	);

	// ── Tab config ───────────────────────────────────────────────
	const tabs = $derived([
		{ key: 'customer' as const, label: 'Customer', count: customerCount },
		{ key: 'rm' as const, label: 'RM', count: rmCount },
		{ key: 'source' as const, label: 'Source / Broker', count: sourceCount }
	]);

	// ── Handlers ─────────────────────────────────────────────────
	function handleTabChange(tab: 'customer' | 'rm' | 'source') {
		selectedTab = tab;
		// Clear selection when changing tabs
		selectedTemplateId = '';
	}

	function handleSelectTemplate(templateId: string) {
		selectedTemplateId = selectedTemplateId === templateId ? '' : templateId;
	}

	function handleCloseComposer() {
		selectedTemplateId = '';
	}
</script>

<svelte:head>
	<title>Communication | DigitalDSA</title>
</svelte:head>

<div class="pb-20 lg:pb-0">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- PAGE HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold text-[var(--dash-text)] md:text-2xl">Communication Hub</h1>
				<PageTourButton pageId="communication" />
			</div>
			<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">
				Browse templates, fill in details, and share with one click
			</p>
		</div>
		<a
			href="/dashboard/dsa"
			class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3.5 py-2 text-sm font-medium text-[var(--dash-text-secondary)] shadow-sm transition-colors hover:bg-[var(--dash-hover)]"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
				/>
			</svg>
			Dashboard
		</a>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- CATEGORY TABS                                              -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div
		class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
		data-walkthrough="comm-category-tabs"
	>
		<div class="comm-tabs-scroll">
			<div
				class="flex gap-1.5 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-1 shadow-sm"
			>
				{#each tabs as tab}
					<button
						type="button"
						onclick={() => handleTabChange(tab.key)}
						class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all
							{selectedTab === tab.key
							? 'bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)] shadow-sm'
							: 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]'}"
					>
						{tab.label}
						<span
							class="rounded-full px-1.5 py-0.5 text-[12px] font-bold
							{selectedTab === tab.key
								? 'bg-white/20 text-white'
								: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
						>
							{tab.count}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Search -->
		<div class="relative" data-walkthrough="comm-search">
			<svg
				class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]"
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
				placeholder="Search templates..."
				bind:value={searchQuery}
				class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-2 pr-4 pl-10 text-sm text-[var(--dash-text-secondary)] shadow-sm transition-colors placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none sm:w-64"
			/>
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- TEMPLATE CARDS GRID                                        -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if filteredTemplates.length > 0}
		<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each filteredTemplates as template, i (template.template_id)}
				<div data-walkthrough={i === 0 ? 'comm-template-first' : undefined}>
					<CommunicationTemplateCard
						{template}
						isSelected={selectedTemplateId === template.template_id}
						onSelect={() => handleSelectTemplate(template.template_id)}
					/>
				</div>
			{/each}
		</div>
	{:else if searchQuery.trim()}
		<!-- No search results -->
		<div
			class="mb-6 rounded-2xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-6 py-12 text-center"
		>
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-6 w-6 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
					/>
				</svg>
			</div>
			<h3 class="mb-1 text-sm font-bold text-[var(--dash-text)]">No templates found</h3>
			<p class="text-xs text-[var(--dash-text-secondary)]">
				No templates match "<span class="font-medium">{searchQuery}</span>" in this category. Try a
				different search term.
			</p>
		</div>
	{:else}
		<!-- Empty category -->
		<div
			class="mb-6 rounded-2xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-6 py-12 text-center"
		>
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-6 w-6 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
					/>
				</svg>
			</div>
			<h3 class="mb-1 text-sm font-bold text-[var(--dash-text)]">No templates in this category</h3>
			<p class="text-xs text-[var(--dash-text-secondary)]">
				Templates for this category have not been added yet.
			</p>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- COMPOSE PANEL (shown when a template is selected)          -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if selectedTemplate}
		<div class="mb-6" data-walkthrough="comm-composer">
			<!-- Close / deselect bar -->
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-sm font-bold text-[var(--dash-text)]">Compose Message</h2>
				<button
					type="button"
					onclick={handleCloseComposer}
					class="flex items-center gap-1 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
				>
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
					Close
				</button>
			</div>

			<MessageComposer
				template={selectedTemplate}
				recentCases={data.recentCases || []}
				dsaProfile={data.dsaProfile}
			/>
		</div>
	{:else}
		<!-- Hint when no template is selected -->
		<div
			class="rounded-xl border border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-6 py-8 text-center"
		>
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
			>
				<svg
					class="h-6 w-6 text-[var(--ddsa-accent-500)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
					/>
				</svg>
			</div>
			<h3 class="mb-1 text-sm font-bold text-[var(--dash-text)]">
				Select a template to get started
			</h3>
			<p class="mx-auto max-w-sm text-xs text-[var(--dash-text-secondary)]">
				Choose a message template from the cards above. You can then link it to a case, customise
				the variables, and share via WhatsApp or copy to clipboard.
			</p>
		</div>
	{/if}
</div>

<style>
	.comm-tabs-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	@media (max-width: 768px) {
		.comm-tabs-scroll {
			margin-left: -0.25rem;
			margin-right: -0.25rem;
			padding-left: 0.25rem;
			padding-right: 0.25rem;
		}
	}
</style>
