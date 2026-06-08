<script lang="ts">
	import { Users, CreditCard, TrendingUp, CirclePlus, Trash2 } from '$lib/utils/iconRegistry';

	interface DirectorCibilEntry {
		name: string;
		cibilScore: string;
	}

	interface Props {
		/** Number of directors/partners declared (drives how many rows to show) */
		count: number;
		/** Company type — label changes to "Partner" for Partnership Firm / LLP */
		companyType?: string;
		/** Current entries array */
		entries: DirectorCibilEntry[];
		/** Called whenever entries change */
		onChange: (entries: DirectorCibilEntry[]) => void;
		/** Whether to show validation errors */
		showValidationErrors?: boolean;
	}

	let {
		count,
		companyType = '',
		entries = $bindable([]),
		onChange,
		showValidationErrors = false
	}: Props = $props();

	// Label for director vs partner
	const memberLabel = $derived(
		companyType === 'Partnership Firm' || companyType === 'LLP' ? 'Partner' : 'Director'
	);

	// For OPC: exactly 1; for others: use declared count, capped at 20
	const targetCount = $derived(
		companyType === 'One Person Company (OPC)' ? 1 : Math.max(1, Math.min(count || 1, 20))
	);

	// Sync entries length with targetCount
	$effect(() => {
		const tc = targetCount;
		const current = entries.length;
		if (current === tc) return;

		if (current < tc) {
			// Add empty slots
			const newEntries = [
				...entries,
				...Array.from({ length: tc - current }, () => ({ name: '', cibilScore: '' }))
			];
			onChange(newEntries);
		} else {
			// Trim excess slots
			onChange(entries.slice(0, tc));
		}
	});

	function updateEntry(i: number, field: keyof DirectorCibilEntry, value: string) {
		const updated = entries.map((e, idx) => (idx === i ? { ...e, [field]: value } : e));
		onChange(updated);
	}

	function getCibilColor(score: string): string {
		const n = parseInt(score, 10);
		if (isNaN(n)) return 'text-gray-400';
		if (n >= 750) return 'text-green-600 dark:text-green-400';
		if (n >= 650) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-500 dark:text-red-400';
	}

	function getCibilLabel(score: string): string {
		const n = parseInt(score, 10);
		if (isNaN(n) || score.length < 3) return '';
		if (n >= 750) return 'Excellent';
		if (n >= 700) return 'Good';
		if (n >= 650) return 'Fair';
		if (n >= 300) return 'Poor';
		return '';
	}

	function validateName(name: string): string {
		if (!name || name.trim().length === 0) return `${memberLabel} name is required`;
		if (name.trim().length < 2) return 'Name must be at least 2 characters';
		return '';
	}

	function validateCibil(score: string): string {
		if (!score || score.trim().length === 0) return 'CIBIL score is required';
		const n = parseInt(score, 10);
		if (isNaN(n)) return 'Enter a valid number';
		if (n < 300) return 'Score must be at least 300';
		if (n > 900) return 'Score must not exceed 900';
		return '';
	}
</script>

<div class="mt-2">
	<!-- Section header -->
	<div class="mb-3 flex items-center gap-2">
		<div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
			<CreditCard size={14} />
		</div>
		<div>
			<p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
				{memberLabel} CIBIL Details
			</p>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				CIBIL score for each {memberLabel.toLowerCase()} — required by lenders for company loan assessment
			</p>
		</div>
	</div>

	<!-- Director / Partner rows -->
	<div class="flex flex-col gap-3">
		{#each entries as entry, i}
			<div
				class="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900"
			>
				<!-- Row label -->
				<p
					class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
				>
					{memberLabel}
					{i + 1}
					{#if companyType === 'One Person Company (OPC)'}
						<span class="ml-1 font-normal text-primary/80 normal-case">(sole owner)</span>
					{/if}
				</p>

				<div class="grid grid-cols-2 gap-2">
					<!-- Name -->
					<div class="col-span-2 sm:col-span-1">
						<label for="dir-name-{i}" class="mb-1 block text-xs text-gray-500 dark:text-gray-400">
							Full Name <span class="text-red-500">*</span>
						</label>
						<input
							id="dir-name-{i}"
							type="text"
							placeholder="{memberLabel} {i + 1} name"
							value={entry.name}
							oninput={(e) => updateEntry(i, 'name', (e.currentTarget as HTMLInputElement).value)}
							maxlength={50}
							class="w-full rounded-lg border px-3 py-2 text-sm transition-colors
								{showValidationErrors && validateName(entry.name)
								? 'border-red-400 bg-red-50 dark:bg-red-900/10'
								: 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}
								text-gray-900  focus:border-primary focus:ring-2
								focus:ring-primary/40 focus:outline-none dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
						/>
						{#if showValidationErrors && validateName(entry.name)}
							<p class="mt-1 text-xs text-red-500">{validateName(entry.name)}</p>
						{/if}
					</div>

					<!-- CIBIL Score -->
					<div>
						<label for="dir-cibil-{i}" class="mb-1 block text-xs text-gray-500 dark:text-gray-400">
							CIBIL Score <span class="text-red-500">*</span>
						</label>
						<div class="relative">
							<input
								id="dir-cibil-{i}"
								type="text"
								inputmode="numeric"
								placeholder="300–900"
								value={entry.cibilScore}
								oninput={(e) => {
									const raw = (e.currentTarget as HTMLInputElement).value
										.replace(/\D/g, '')
										.slice(0, 3);
									updateEntry(i, 'cibilScore', raw);
								}}
								maxlength={3}
								class="w-full rounded-lg border px-3 py-2 text-sm transition-colors
									{showValidationErrors && validateCibil(entry.cibilScore)
									? 'border-red-400 bg-red-50 dark:bg-red-900/10'
									: 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}
									pr-16 text-gray-900 placeholder-gray-400 focus:border-primary
									focus:ring-2 focus:ring-primary/40 focus:outline-none dark:text-gray-100 dark:placeholder-gray-500"
							/>
							{#if entry.cibilScore && entry.cibilScore.length === 3}
								<span
									class="absolute top-1/2 right-2 -translate-y-1/2 text-xs font-semibold {getCibilColor(
										entry.cibilScore
									)}"
								>
									{getCibilLabel(entry.cibilScore)}
								</span>
							{/if}
						</div>
						{#if showValidationErrors && validateCibil(entry.cibilScore)}
							<p class="mt-1 text-xs text-red-500">{validateCibil(entry.cibilScore)}</p>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Score legend -->
	<div class="mt-3 flex flex-wrap gap-3 px-1">
		<div class="flex items-center gap-1.5">
			<TrendingUp size={12} class="text-green-500" />
			<span class="text-xs text-gray-500 dark:text-gray-400">750+ Excellent</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="inline-block h-2 w-2 rounded-full bg-yellow-400"></span>
			<span class="text-xs text-gray-500 dark:text-gray-400">700–749 Good</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="inline-block h-2 w-2 rounded-full bg-orange-400"></span>
			<span class="text-xs text-gray-500 dark:text-gray-400">650–699 Fair</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="inline-block h-2 w-2 rounded-full bg-red-400"></span>
			<span class="text-xs text-gray-500 dark:text-gray-400">&lt;650 Poor</span>
		</div>
	</div>
</div>
