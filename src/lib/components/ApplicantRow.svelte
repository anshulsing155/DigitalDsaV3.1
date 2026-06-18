<script lang="ts">
	import {
		Building2,
		User,
		CircleAlert,
		CircleCheckBig,
		CircleDashed,
		AlertTriangle,
		Mars,
		Venus,
		Handshake,
		CalendarFold,
		Pencil,
		RotateCcw,
		Trash2
	} from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import type { Applicant } from '$lib/types/form';
	import {
		computeSectionCompletion,
		areAllTabsComplete,
		areAllCompanyTabsComplete,
		computeCompanyCompletion
	} from '$lib/utils/incomeTabState';

	// Props (Svelte 5 runes)
	interface Props {
		applicant: Applicant & Record<string, any>;
		index: number;
		isSecuredLoan?: boolean;
		/** Number of cross-field warnings for this applicant (e.g. CIBIL mismatch) */
		warningCount?: number;
		onOpen?: (applicant: Applicant & Record<string, any>, index: number, startTab?: number) => void;
		onReset?: (applicant: Applicant & Record<string, any>, index: number) => void;
		onRemove?: (applicant: Applicant & Record<string, any>, index: number) => void;
	}

	let {
		applicant,
		index,
		isSecuredLoan = true,
		warningCount = 0,
		onOpen = () => {},
		onReset,
		onRemove
	}: Props = $props();

	// Derived values (Svelte 5 runes)
	const applicationData = $derived(formState.loanData);

	/** 3-state status: 'pending' | 'partial' | 'done' */
	const statusInfo = $derived.by(() => {
		if (!applicant?.applicantType) return { status: 'pending' as const, firstIncompleteTab: 0 };

		if (applicant.applicantType === 'Company') {
			const tabs = computeCompanyCompletion(applicant);
			const values = Object.values(tabs);
			const doneCount = values.filter(Boolean).length;
			if (doneCount === 0) return { status: 'pending' as const, firstIncompleteTab: 0 };
			if (doneCount === values.length) return { status: 'done' as const, firstIncompleteTab: 0 };
			// Find first incomplete tab index
			const tabKeys = Object.keys(tabs);
			const firstIdx = tabKeys.findIndex((k) => !tabs[k]);
			return { status: 'partial' as const, firstIncompleteTab: Math.max(0, firstIdx) };
		}

		const completion = computeSectionCompletion(applicant, {
			requireResidencePattern: isSecuredLoan,
			applicantClassification: applicant?.applicantClassification as string | undefined
		});
		const isAllDone = areAllTabsComplete(applicant, completion);
		if (isAllDone) return { status: 'done' as const, firstIncompleteTab: 0 };

		// Check if anything at all is filled (partial vs pending)
		const anyFilled =
			completion.profile ||
			completion.income_profiles ||
			completion.income_details ||
			completion.credit_score ||
			completion.obligations_details;
		const tabOrder = [
			'profile',
			'income_profiles',
			'income_details',
			'credit_score',
			'obligations_details'
		] as const;
		const firstIdx = tabOrder.findIndex((t) => !completion[t]);
		return {
			status: anyFilled ? ('partial' as const) : ('pending' as const),
			firstIncompleteTab: Math.max(0, firstIdx)
		};
	});

	const needsNRIAnswer = $derived(
		applicant.applicantType !== 'Company' &&
			(applicationData as any).ApplicantIsNRI === 'Yes' &&
			(!(applicant as any).isNRI || (applicant as any).isNRI === '')
	);

	const showAsIncomplete = $derived(statusInfo.status !== 'done' || needsNRIAnswer);

	const isMarried = $derived((applicant as any).maritalStatus === 'Married');

	const ageNum = $derived(Number(applicant.age) || 0);
</script>

<div
	class={`grid grid-cols-12 items-center border-b border-l-4 border-b-[var(--form-border)] bg-[var(--form-bg-card)] px-5 py-4 transition-all duration-200 last:border-b-0 hover:bg-[var(--dash-hover)] ${showAsIncomplete ? 'border-l-[var(--ddsa-primary-500)]' : 'border-l-transparent'}`}
>
	<!-- Applicant (3 cols) -->
	<div class="col-span-3 flex items-center gap-3">
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--trial-accent)]/25 bg-gradient-to-br from-[var(--trial-accent)]/20 via-[var(--trial-accent)]/10 to-transparent"
		>
			{#if applicant.applicantType === 'Company'}
				<Building2 size={18} class="text-[var(--form-text-secondary)]" />
			{:else if applicant.gender === 'female'}
				<Venus size={18} class="text-pink-500" />
			{:else if applicant.gender === 'male'}
				<Mars size={18} class="text-blue-500" />
			{:else}
				<User size={18} class="text-[var(--form-text-secondary)]" />
			{/if}
		</div>

		<div class="min-w-0">
			<p class="font-titleMedium buttonText line-clamp-1 text-[var(--form-text-secondary)]">
				{applicant.applicantType === 'Company'
					? (applicant as any).companyName
					: applicant.fullName}
			</p>
			<p class="tinyText mt-0.5 font-paragraph text-[var(--form-text-muted)]">
				{applicant.applicantType}
				{#if applicant.employmentType && applicant.applicantType !== 'Company'}
					&middot; {applicant.employmentType}
				{:else if applicant.applicantType === 'Company' && applicant.companyType}
					&middot; {applicant.companyType}
				{/if}
			</p>
		</div>
	</div>

	<!-- Age / Category (2 cols) -->
	<div class="col-span-2 flex items-center justify-center text-center">
		{#if applicant.applicantType === 'Individual'}
			<span
				class="tinyText inline-flex items-center  px-2 py-1 gap-1.5 rounded-lg bg-gray-100 font-paragraph text-[var(--form-text-secondary)]"
			>
				<CalendarFold size={12} class="text-[var(--form-text-secondary)]" />
				<span>{applicant.age} yrs</span>
				{#if ageNum > 55}
					<span
						class="font-titleMedium tinyText ml-0.5 rounded bg-gray-800 px-1 py-0.5 text-white dark:bg-gray-600"
						>Senior</span
					>
				{/if}
			</span>
		{:else}
			<span class="smallText font-paragraph text-[var(--form-text-secondary)]">
				{applicant.companyType}
			</span>
		{/if}
	</div>

	<!-- Marital Status (2 cols) -->
	<div class="col-span-2 flex items-center justify-center text-center">
		{#if applicant.applicantType === 'Individual' && (applicant as any).maritalStatus}
			<span
				class="tinyText inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 font-paragraph text-[var(--form-text-secondary)]"
			>
				{#if isMarried}
					<Handshake size={12} class="text-[var(--form-text-secondary)]" />
				{:else}
					<User size={12} class="text-[var(--form-text-secondary)]" />
				{/if}
				{(applicant as any).maritalStatus}
			</span>
		{:else}
			<span class="text-[var(--form-text-secondary)]">—</span>
		{/if}
	</div>

	<!-- NRI (2 cols) -->
	<div class="col-span-2 text-center">
		{#if needsNRIAnswer}
			<CircleAlert size={15} class="inline-block text-red-500" />
		{:else if (applicant as any).isNRI === 'Yes'}
			<span class="smallText font-paragraph text-[var(--form-text-secondary)]">Yes</span>
		{:else if (applicant as any).isNRI === 'No'}
			<span class="smallText font-paragraph text-[var(--form-text-secondary)]">No</span>
		{:else}
			<span class="text-[var(--form-text-secondary)]">—</span>
		{/if}
	</div>

	<!-- Status (2 cols) — 4 visual states: Done, Resolve Issues, Partial, Pending -->
	<div class="col-span-2 flex items-center justify-center text-center">
		{#if statusInfo.status === 'done' && !needsNRIAnswer && warningCount === 0}
			<span
				class="font-titleMedium smallText inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
			>
				<CircleCheckBig size={12} />
				Done
			</span>
		{:else if statusInfo.status === 'done' && !needsNRIAnswer && warningCount > 0}
			<!-- All inputs filled but cross-field issues detected (e.g. CIBIL mismatch) -->
			<button
				type="button"
				onclick={() => onOpen(applicant, index)}
				class="font-titleMedium smallText inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40"
				title="Click to resolve data inconsistencies"
			>
				<AlertTriangle size={12} />
				Resolve Issues
			</button>
		{:else if statusInfo.status === 'partial'}
			<button
				type="button"
				onclick={() => onOpen(applicant, index, statusInfo.firstIncompleteTab)}
				class="font-titleMedium smallText inline-flex cursor-pointer items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40"
				title="Click to continue where you left off"
			>
				<CircleDashed size={12} />
				Partial
			</button>
		{:else}
			<span
				class="font-titleMedium smallText inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[var(--color-error)] dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
			>
				<CircleAlert size={12} />
				Pending
			</span>
		{/if}
	</div>

	<!-- Action (1 col) — icon-only buttons for all rows -->
	<div class="col-span-1 flex items-center justify-center gap-0.5">
		<button
			onclick={() => onOpen(applicant, index)}
			title="Edit"
			class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-secondary)] transition-colors hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900 dark:hover:text-blue-400"
			aria-label="Edit"
		>
			<Pencil size={15} />
		</button>
		{#if onReset}
			<button
				onclick={() => onReset?.(applicant, index)}
				title="Reset"
				class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-secondary)] transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
				aria-label="Reset"
			>
				<RotateCcw size={15} />
			</button>
		{/if}
		{#if onRemove}
			<button
				onclick={() => onRemove?.(applicant, index)}
				title="Delete"
				class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-secondary)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
				aria-label="Delete"
			>
				<Trash2 size={15} />
			</button>
		{/if}
	</div>
</div>

<style>
	:global(.gradient-border) {
		border-left: 4px solid;
		border-image: linear-gradient(135deg, var(--ddsa-primary-500), var(--ddsa-accent-500)) 1;
	}
</style>
