<script lang="ts">
	import OverviewTab from '$lib/components/test-dashboard/OverviewTab.svelte';
	import RelationshipTestsTab from '$lib/components/test-dashboard/RelationshipTestsTab.svelte';
	import TestRunnerTab from '$lib/components/test-dashboard/TestRunnerTab.svelte';
	import TestDataManagerTab from '$lib/components/test-dashboard/TestDataManagerTab.svelte';

	let { data } = $props();

	const tabs = [
		{ id: 'overview', label: 'Getting Started', emoji: '1' },
		{ id: 'runner', label: 'Run Tests', emoji: '2' },
		{ id: 'relationships', label: 'Relationships', emoji: '3' },
		{ id: 'testdata', label: 'Test Data', emoji: '4' }
	];

	let activeTab = $state('overview');
</script>

<div class="pb-20 lg:pb-0">
	<!-- Dev warning banner -->
	<div class="mb-4 rounded-lg border border-stone-300 bg-stone-50 p-3 text-sm text-stone-800">
		DEV ONLY — This page is not available in production.
	</div>

	<!-- Header -->
	<div class="mb-5">
		<h1 class="text-xl font-bold text-[#1e293b] md:text-2xl">Home Loan — QA Test Dashboard</h1>
		<p class="mt-1 text-sm text-gray-500">
			Your one-stop dashboard to verify form logic, run automated tests, and generate test data.
			Start with "Getting Started" if you are new to this testing module.
		</p>
	</div>

	<!-- Tab navigation -->
	<div class="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1">
		{#each tabs as tab}
			<button
				type="button"
				class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all
					{activeTab === tab.id
					? 'bg-white text-[#1e293b] shadow-sm ring-1 ring-gray-200'
					: 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}"
				onclick={() => (activeTab = tab.id)}
			>
				<span
					class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
						{activeTab === tab.id ? 'bg-stone-500 text-white' : 'bg-gray-200 text-gray-500'}"
				>
					{tab.emoji}
				</span>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Active tab content -->
	{#if activeTab === 'overview'}
		<OverviewTab onNavigate={(tab) => (activeTab = tab)} />
	{:else if activeTab === 'runner'}
		<TestRunnerTab />
	{:else if activeTab === 'relationships'}
		<RelationshipTestsTab />
	{:else if activeTab === 'testdata'}
		<TestDataManagerTab schemaConstants={data.schemaConstants} />
	{/if}
</div>
