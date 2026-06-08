<script lang="ts">
	import { FileText, Cpu, ChevronRight } from 'lucide-svelte';

	let {
		lenderName,
		loanProduct,
		existingFileName,
		isLoading,
		onStartParsing
	}: {
		lenderName: string;
		loanProduct: string;
		existingFileName: string;
		isLoading: boolean;
		onStartParsing: (sourceText: string, fileName: string, documentDate: string) => Promise<void>;
	} = $props();

	let sourceType = $state<'paste' | 'file'>('paste');
	let sourceText = $state('');
	// svelte-ignore state_referenced_locally
	let fileName = $state(existingFileName || 'policy.txt');
	let documentDate = $state(new Date().toISOString().slice(0, 10));

	const canStart = $derived(sourceText.trim().length > 50 && fileName.trim().length > 0);

	function handleStart() {
		if (!canStart || isLoading) return;
		onStartParsing(sourceText.trim(), fileName.trim(), documentDate);
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-xl font-bold text-gray-900">Document Setup</h1>
		<p class="mt-1 text-sm text-gray-500">
			Paste the policy document text to begin AI-assisted encoding for
			<strong>{lenderName}</strong> — <span class="text-amber-600">{loanProduct}</span>.
		</p>
	</div>

	<!-- Locked fields: lender + product -->
	<div class="grid grid-cols-2 gap-4">
		<div class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
			<p class="text-xs font-medium text-gray-400">Lender</p>
			<p class="mt-0.5 text-sm font-semibold text-gray-700">{lenderName}</p>
			<p class="mt-0.5 text-[10px] text-gray-400">Set from assignment</p>
		</div>
		<div class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
			<p class="text-xs font-medium text-gray-400">Loan Product</p>
			<p class="mt-0.5 text-sm font-semibold text-gray-700">{loanProduct}</p>
			<p class="mt-0.5 text-[10px] text-gray-400">Set from route</p>
		</div>
	</div>

	<div class="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
		<!-- Source type toggle -->
		<div>
			<p class="mb-2 text-sm font-medium text-gray-700">Source type</p>
			<div class="flex gap-2">
				{#each (['paste', 'file'] as const) as type (type)}
					<button
						type="button"
						onclick={() => (sourceType = type)}
						class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors
						{sourceType === type
							? 'border-amber-400 bg-amber-50 text-amber-700'
							: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
					>
						{type === 'paste' ? 'Paste text' : 'Upload file'}
					</button>
				{/each}
			</div>
		</div>

		<!-- File name -->
		<div>
			<label for="fileName" class="mb-1 block text-sm font-medium text-gray-700">
				Document file name
			</label>
			<input
				id="fileName"
				type="text"
				bind:value={fileName}
				placeholder="e.g. HDFC-HomeLoan-Policy-2025.pdf"
				class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
				focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
			/>
		</div>

		<!-- Document date -->
		<div>
			<label for="documentDate" class="mb-1 block text-sm font-medium text-gray-700">
				Policy document date
			</label>
			<input
				id="documentDate"
				type="date"
				bind:value={documentDate}
				class="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
				focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
			/>
		</div>

		<!-- Text paste area -->
		{#if sourceType === 'paste'}
			<div>
				<label for="sourceText" class="mb-1 block text-sm font-medium text-gray-700">
					Policy document text
					<span class="font-normal text-gray-400">(paste the full text below)</span>
				</label>
				<textarea
					id="sourceText"
					bind:value={sourceText}
					rows={12}
					placeholder="Paste the full lender policy document text here…"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs
					text-gray-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
				></textarea>
				{#if sourceText.length > 0}
					<p class="mt-1 text-xs text-gray-400">
						{sourceText.length.toLocaleString()} characters
					</p>
				{/if}
			</div>
		{:else}
			<!-- File upload placeholder — requires ImageKit integration -->
			<div
				class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed
				border-gray-200 bg-gray-50 py-10 text-center"
			>
				<FileText size={32} class="mb-2 text-gray-300" />
				<p class="text-sm font-medium text-gray-500">File upload coming soon</p>
				<p class="mt-1 text-xs text-gray-400">
					Use "Paste text" to copy text from your PDF viewer for now.
				</p>
			</div>
		{/if}

		<!-- Start button -->
		<button
			type="button"
			onclick={handleStart}
			disabled={!canStart || isLoading}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3
			text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
		>
			{#if isLoading}
				<span
					class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
				></span>
				Running AI pipeline…
			{:else}
				<Cpu size={16} />
				Start Parsing →
			{/if}
		</button>

		{#if !canStart && sourceText.length > 0}
			<p class="text-center text-xs text-red-500">
				Paste at least 50 characters of policy text to proceed.
			</p>
		{/if}
	</div>

	<!-- Info note -->
	<div class="flex items-start gap-2.5 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
		<ChevronRight size={14} class="mt-0.5 shrink-0" />
		<span>
			The AI pipeline will normalize terminology, classify clauses, and atomize conditions.
			This typically takes 20–30 seconds. Your draft is saved automatically.
		</span>
	</div>
</div>
