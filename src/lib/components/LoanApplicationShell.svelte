<!--
  LoanApplicationShell — shared wrapper for all 6 loan application pages.
  Handles: loading spinner, submitted success screen, page header with back button,
  <svelte:head>, and shared styles. The parent page provides form content as children.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { ChevronLeft } from '$lib/utils/iconRegistry';
	import { t } from '$lib/i18n';

	interface Props {
		/** Full loan type label, e.g. "Home Loan", "Personal Loan" */
		loanType: string;
		/** Short display name for i18n, e.g. "Home", "Personal" */
		loanDisplayName: string;
		/** Route to navigate back to offers page */
		backRoute: string;
		/** Whether the page is still loading initial data */
		loading: boolean;
		/** Whether the form was successfully submitted */
		submitted: boolean;
		/** The form content provided by each loan-specific page */
		children: Snippet;
	}

	let { loanType, loanDisplayName, backRoute, loading, submitted, children }: Props = $props();
</script>

<svelte:head>
	<title>{loanType} Application - Digital DSA</title>
	<meta name="description" content="Apply for your {loanDisplayName} loan" />
</svelte:head>

<div class="loan-app-shell min-h-screen bg-[var(--form-bg-alt)]">
	{#if loading}
		<!-- Centered loading spinner -->
		<div class="flex h-screen items-center justify-center">
			<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
		</div>
	{:else if submitted}
		<!-- Success screen after form submission -->
		<div class="flex min-h-screen items-center justify-center p-4">
			<div
				class="w-full max-w-md rounded-lg bg-[var(--form-bg-card)] p-6 text-center shadow-lg sm:p-8"
			>
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40"
				>
					<svg
						class="h-8 w-8 text-green-600 dark:text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
						></path>
					</svg>
				</div>
				<h2 class="mb-4 text-xl font-bold text-blue-900 sm:text-2xl">
					{t('app.submitted.title')}
				</h2>
				<p class="mb-6 text-sm text-[var(--form-text-secondary)] sm:text-base">
					{t('app.submitted.message', { loanType: loanDisplayName })}
				</p>
				<div class="space-y-3">
					<button
						onclick={() => goto('/')}
						class="text-btnText w-full rounded-lg bg-primary px-4 py-3 text-white transition-colors hover:bg-primary/90"
					>
						{t('app.submitted.goHome')}
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main content: header bar + form content from parent -->
		<div class="mx-auto max-w-4xl">
			<!-- Mobile header -->
			<div class="border-b bg-primary text-white shadow-sm md:hidden">
				<div class="flex w-full items-center justify-start px-2 py-3">
					<div class="flex items-start justify-start">
						<button onclick={() => goto(backRoute)} class="p-2 hover:text-blue-900">
							<ChevronLeft />
						</button>
					</div>
					<div>
						<h1 class="text-subTitleText text-start">{loanType} Application</h1>
					</div>
				</div>
			</div>

			<!-- Desktop header -->
			<div class="hidden md:block">
				<div class="flex items-center gap-4 bg-primary py-4 text-white">
					<button onclick={() => goto(backRoute)} class="cursor-pointer p-2 hover:text-blue-900">
						<ChevronLeft />
					</button>
					<div>
						<h1 class="text-subTitleText">{loanType} Application</h1>
						<p class="inputText mt-1">Complete your application for the selected loan offer</p>
					</div>
				</div>
			</div>

			<!-- Form content provided by the specific loan page -->
			{@render children()}
		</div>
	{/if}
</div>

<style>
	/* Custom animations */
	.loan-app-shell :global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Enhanced focus styles */
	.loan-app-shell :global(input:focus) {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	/* Mobile-first responsive design */
	@media (max-width: 640px) {
		.loan-app-shell :global(.grid-cols-2 > *) {
			min-width: 0;
		}

		/* Prevent iOS zoom on input focus */
		.loan-app-shell :global(input) {
			font-size: 16px;
		}
	}

	/* Smooth transitions */
	.loan-app-shell :global(button),
	.loan-app-shell :global(input) {
		transition: all 0.2s ease-in-out;
	}
</style>
