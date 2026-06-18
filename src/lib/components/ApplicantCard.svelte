<script lang="ts">
	import {
		CircleAlert,
		CircleCheckBig,
		AlertTriangle,
		Mars,
		Venus,
		User,
		Building2,
		Building,
		Handshake,
		CalendarFold,
		RotateCcw,
		UserMinus,
		CircleDashed
	} from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import type { Applicant } from '$lib/types/form';
	import {
		computeSectionCompletion,
		areAllTabsComplete,
		areAllCompanyTabsComplete
	} from '$lib/utils/incomeTabState';

	// Props (Svelte 5 runes)
	interface Props {
		applicant: Applicant & Record<string, any>;
		index: number;
		isComplete?: boolean;
		isSecuredLoan?: boolean;
		prefix?: string;
		showAtLeastOneNRIError?: boolean;
		/** Number of cross-field warnings for this applicant (e.g. CIBIL mismatch) */
		warningCount?: number;
		onOpen?: (applicant: Applicant & Record<string, any>, index: number) => void;
		onReset?: (applicant: Applicant & Record<string, any>, index: number) => void;
		onRemove?: (applicant: Applicant & Record<string, any>, index: number) => void;
		solo?: boolean;
	}

	let {
		applicant,
		index,
		isComplete: _isComplete = false,
		isSecuredLoan = true,
		prefix,
		showAtLeastOneNRIError: _showAtLeastOneNRIError = false,
		warningCount = 0,
		onOpen = () => {},
		onReset,
		onRemove,
		solo = false
	}: Props = $props();

	// Derived values (Svelte 5 runes)
	const applicationData = $derived(formState.loanData);

	const computedIsComplete = $derived.by(() => {
		if (!applicant?.applicantType) return false;
		if ((applicant.applicantType as string) === 'Company') {
			return areAllCompanyTabsComplete(applicant);
		}
		const completion = computeSectionCompletion(applicant, {
			requireResidencePattern: isSecuredLoan,
			applicantClassification: applicant?.applicantClassification as string | undefined
		});
		return areAllTabsComplete(applicant, completion);
	});

	// Check if NRI question needs to be answered (exclude Company applicants)
	const needsNRIAnswer = $derived(
		(applicant.applicantType as string) !== 'Company' &&
			(applicationData as any).ApplicantIsNRI === 'Yes' &&
			(!(applicant as any).isNRI || (applicant as any).isNRI === '')
	);

	const hasAnyDataFilled = $derived.by(() => {
		if (!applicant?.applicantType) return false;

		if ((applicant.applicantType as string) === 'Company') {
			const tabs = computeSectionCompletion(applicant as any);
			return Object.values(tabs).some(Boolean);
		}

		const completion = computeSectionCompletion(applicant, {
			requireResidencePattern: isSecuredLoan,
			applicantClassification: applicant?.applicantClassification as string | undefined
		});

		return (
			completion.profile ||
			completion.income_profiles ||
			completion.income_details ||
			completion.credit_score ||
			completion.obligations_details
		);
	});

	// 3-state status: 'complete' | 'warnings' | 'incomplete'
	// - complete: all inputs filled, no warnings
	// - warnings: all inputs filled but cross-field issues detected (e.g. CIBIL mismatch)
	// - incomplete: not all required inputs filled
	const cardStatus = $derived.by(() => {
		if (computedIsComplete && !needsNRIAnswer) {
			return warningCount > 0 ? 'warnings' : 'complete';
		}

		if (hasAnyDataFilled) {
			return 'partial';
		}

		return 'pending';
	});
	// const cardStatus = $derived.by(() => {
	// 	if (!computedIsComplete || needsNRIAnswer) return 'incomplete' as const;
	// 	if (warningCount > 0) return 'warnings' as const;
	// 	return 'complete' as const;
	// });

	// Backward compat — some template logic still checks this
	// const showAsIncomplete = $derived(cardStatus === 'incomplete');

	const showAsIncomplete = $derived(cardStatus === 'pending' || cardStatus === 'partial');
	const isMarried = $derived((applicant as any).maritalStatus === 'Married');

	const ageNum = $derived(Number(applicant.age) || 0);

	const isCompany = $derived((applicant.applicantType as string) === 'Company');
	const isIndividual = $derived((applicant.applicantType as string) === 'Individual');
</script>

<div
	class={`w-full overflow-hidden border border-[var(--form-border)] bg-[var(--form-bg-card)] transition-all duration-200 hover:shadow-lg
		${solo ? 'rounded-2xl shadow-md' : 'rounded-xl shadow-sm'}
	`}
>
	<!-- Top accent bar — trial red -->
	<div class="bg-ddsa-gradient-primary h-1.5 w-full"></div>

	<div class={solo ? 'p-5 sm:p-6' : 'p-4'}>
		<!-- Header: Avatar + Name + Status -->
		<div class="flex items-center gap-3 sm:gap-4">
			<!-- Avatar — gender-aware icon conveys gender visually -->
			<div
				class={`flex shrink-0 items-center justify-center rounded-full border border-[var(--form-border)] bg-gradient-to-br from-[var(--trial-accent)]/20 via-[var(--trial-accent)]/10 to-transparent
					${solo ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-11 w-11'}
				`}
			>
				{#if isCompany}
					<Building2 size={solo ? 24 : 18} class="text-[var(--form-text-secondary)]" />
				{:else if applicant.gender === 'female'}
					<Venus size={solo ? 24 : 18} class="text-pink-500" />
				{:else if applicant.gender === 'male'}
					<Mars size={solo ? 24 : 18} class="text-blue-500" />
				{:else}
					<User size={solo ? 24 : 18} class="text-[var(--form-text-secondary)]" />
				{/if}
			</div>

			<!-- Name block -->
			<div class="min-w-0 flex-1">
				<h3
					class={`font-titleBold line-clamp-1 text-[var(--form-text-secondary)] ${solo ? 'text-lg sm:text-xl' : 'buttonText'}`}
				>
					{#if !isCompany}
						{prefix} {applicant.fullName}
					{:else}
						{(applicant as any).companyName}
					{/if}
				</h3>
				<p
					class={`mt-0.5 font-paragraph text-[var(--form-text-muted)] ${solo ? 'text-sm' : 'tinyText'}`}
				>
					{applicant.applicantType}
					{#if applicant.employmentType && !isCompany}
						&middot; {applicant.employmentType}
					{:else if isCompany && applicant.companyType}
						&middot; {applicant.companyType}
					{/if}
				</p>
			</div>

			<!-- Status tag — 3 states: complete (green), warnings (amber), incomplete (red) -->
			<span
				class={`font-titleMedium inline-flex shrink-0 items-center gap-1 rounded-full
					${solo ? 'px-3 py-1.5 tinyText sm:text-sm' : 'tinyText px-2.5 py-1'}
					${
						cardStatus === 'complete'
							? 'border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400'
							: cardStatus === 'warnings'
								? 'border border-amber-300 bg-amber-50  text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40'
								: cardStatus === 'partial'
									? 'border border-amber-200 bg-amber-50  text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40'
									: 'border border-red-200 bg-red-50  text-[var(--color-error)] dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
					}
				`}
			>
				{#if cardStatus === 'complete'}
					<CircleCheckBig size={solo ? 14 : 12} />
					Completed
				{:else if cardStatus === 'warnings'}
					<AlertTriangle size={solo ? 14 : 12} />
					Resolve Issues
				{:else if cardStatus === 'partial'}
					<CircleDashed size={solo ? 14 : 12} />
					Partial
				{:else}
					<CircleAlert size={solo ? 14 : 12} />
					Pending
				{/if}
			</span>
		</div>

		<!-- Info chips row — age, marital status, NRI (no gender — avatar icon handles that) -->
		{#if isIndividual}
			<div class={`mt-3 flex flex-wrap items-center ${solo ? 'gap-2 sm:gap-3' : 'gap-2'}`}>
				<!-- Age chip -->
				{#if applicant.age}
					<span
						class={`inline-flex items-center gap-1 rounded-lg border border-[var(--form-border)] font-paragraph text-[var(--form-text-secondary)] ${solo ? 'px-2.5 py-1.5 tinyText sm:text-sm' : 'px-2 py-1 tinyText'}`}
					>
						<CalendarFold size={solo ? 14 : 12} class="text-[var(--form-text-secondary)]" />
						{applicant.age} yrs
						{#if ageNum > 55}
							<span
								class="font-titleMedium ml-0.5 rounded bg-gray-800 px-1 py-0.5 tinyText text-white"
								>Senior</span
							>
						{/if}
					</span>
				{/if}

				<!-- Marital status chip -->
				{#if (applicant as any).maritalStatus}
					<span
						class={`inline-flex items-center gap-1 rounded-lg border border-[var(--form-border)] text-[var(--form-text-secondary)] font-paragraph ${solo ? 'px-2.5 py-1.5 tinyText sm:text-sm' : 'px-2 py-1 tinyText'}`}
					>
						{#if isMarried}
							<Handshake size={solo ? 14 : 12} />
						{:else}
							<User size={solo ? 14 : 12} />
						{/if}
						{(applicant as any).maritalStatus}
					</span>
				{/if}

				<!-- NRI warning chip -->
				{#if needsNRIAnswer}
					<span
						class={`font-titleMedium inline-flex items-center gap-1 rounded-lg border border-[var(--form-border)] text-[var(--form-text-secondary)] ${solo ? 'px-2.5 py-1.5 tinyText sm:text-sm' : 'px-2 py-1 tinyText'}`}
					>
						<CircleAlert size={solo ? 14 : 12} />
						NRI status needed
					</span>
				{/if}
			</div>
		{:else if isCompany}
			<div class={`mt-3 flex flex-wrap items-center ${solo ? 'gap-2 sm:gap-3' : 'gap-2'}`}>
				{#if applicant.companyType}
					<span
						class={`inline-flex items-center gap-1 rounded-lg border border-[var(--form-border)] font-paragraph text-[var(--form-text-secondary)] ${solo ? 'px-2.5 py-1.5 tinyText sm:text-sm' : 'px-2 py-1 tinyText'}`}
					>
						<Building size={solo ? 14 : 12} class="text-[var(--form-text-secondary)]" />
						{applicant.companyType}
					</span>
				{/if}
			</div>
		{/if}

		<!-- CTA -->
		<div class={`border-t border-[var(--form-border)] ${solo ? 'mt-5 pt-4' : 'mt-3 pt-3'}`}>
			<button
				onclick={() => onOpen(applicant, index)}
				class={`font-titleMedium w-full rounded-lg transition-all duration-200 hover:shadow-md
					${solo ? 'py-3 text-sm sm:text-base' : 'buttonText py-2.5'}
					${
						cardStatus === 'pending'
							? 'animate-slow-pulse border border-red-200 bg-red-50 px-2.5 py-1 text-[var(--color-error)] dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
							: cardStatus === 'partial'
								? 'animate-slow-pulse border border-amber-200 bg-amber-50  text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40'
								: cardStatus === 'warnings'
									? 'animate-slow-pulse border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
									: 'border border-[var(--form-border)] bg-[var(--form-bg-alt)] text-[var(--form-text)] hover:bg-[var(--form-hover)]'
					}
				`}
			>
				{cardStatus === 'pending'
					? 'Start Details'
					: cardStatus === 'partial'
						? 'Continue Details'
						: cardStatus === 'warnings'
							? 'Resolve Issues'
							: 'View / Edit Details'} →
			</button>

			{#if !showAsIncomplete && (onReset || onRemove)}
				<div class="mt-2 flex items-center justify-center gap-4">
					{#if onReset}
						<button
							onclick={() => onReset?.(applicant, index)}
							class="tinyText inline-flex items-center gap-1 font-paragraph text-[var(--form-text-secondary)] transition-colors hover:text-gray-700 dark:hover:text-gray-300"
						>
							<RotateCcw size={12} />
							Reset
						</button>
					{/if}
					{#if onRemove}
						<button
							onclick={() => onRemove?.(applicant, index)}
							class="tinyText inline-flex items-center gap-1 font-paragraph text-red-400 transition-colors hover:text-red-600 dark:hover:text-red-300"
						>
							<UserMinus size={12} />
							Remove
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
