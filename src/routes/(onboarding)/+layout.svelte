<script lang="ts">
	import { page } from '$app/state';
	import clientLogger from '$lib/utils/clientLogger';
	import { pushState } from '$app/navigation';
	import { tick } from 'svelte';
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import {
		CircleCheckBig,
		ChevronLeft,
		Loader2,
		Rocket,
		ShieldCheck,
		Zap,
		Handshake
	} from '$lib/utils/iconRegistry';
	import { addToast } from '$lib/stores/stores.js';
	import { validateProfessionalBase } from '$lib/validation/common/validateCommonDetails';
	import { validateDSAStep2 } from '$lib/validation/dsa-onboarding/validateDSAStep2';
	import { validateRMStep2 } from '$lib/validation/rm-onboarding/validateRMStep2';
	import {
		validateStep1,
		validateStep2,
		validateStep3
	} from '$lib/validation/dsa-onboarding/validateNewOnboarding';
	import { coinsState } from '$lib/stores/coins/coins.svelte';
	import EmailOtpModal from '$lib/components/EmailOtpModal.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { emailVerificationState } from '$lib/stores/emailVerificationContext.svelte';
	import { verifyEmailOTP, resendEmailOTP } from '$lib/services/verifyEmailOTP.js';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}
	let { data, children }: Props = $props();

	let isWaiting = $state(false);
	let role = $derived(data.role);

	$effect(() => {
		onboardingState.setSteps(data.steps);
	});

	$effect(() => {
		const stepParam = page.url.searchParams.get('step');
		const s = stepParam !== null ? +stepParam : NaN;
		if (!isNaN(s)) onboardingState.setActiveStep(s);
	});

	async function go(step: number) {
		const currentStep = onboardingState.activeStep;
		const result = validateCurrentStep() || { valid: true, errors: {} };
		onboardingState.setErrors(result.errors);
		await tick();
		if (result.valid) onboardingState.markCompleted(currentStep);
		else onboardingState.unmarkCompleted(currentStep);
		onboardingState.setActiveStep(step);
		const url = new URL(page.url);
		url.searchParams.set('step', String(step));
		pushState(url, {});
	}

	$effect(() => {
		const result = validateCurrentStep();
		if (!result.valid) onboardingState.unmarkCompleted(onboardingState.activeStep);
	});

	function back() {
		if (onboardingState.activeStep > 0) go(onboardingState.activeStep - 1);
	}

	function validateCurrentStep(): { valid: boolean; errors: Record<string, string> } {
		const step = onboardingState.activeStep;
		const currentRole = onboardingState.data.selectedRole || role?.toLowerCase() || '';

		// New 3-step DSA onboarding
		if (currentRole === 'dsa' && onboardingState.steps.length === 3) {
			if (step === 0) return validateStep1(onboardingState.data);
			if (step === 1) return validateStep2(onboardingState.data);
			if (step === 2) return validateStep3(onboardingState.data);
		}

		// Legacy RM onboarding (single step)
		if (step === 0) {
			const baseResult = validateProfessionalBase(onboardingState.data);
			const roleResult =
				currentRole === 'rm'
					? validateRMStep2(onboardingState.data)
					: validateDSAStep2(onboardingState.data);
			return {
				valid: baseResult.valid && roleResult.valid,
				errors: { ...baseResult.errors, ...roleResult.errors }
			};
		}

		return { valid: true, errors: {} };
	}

	async function submitOnboarding(currentRole: string) {
		if (isWaiting) return;
		isWaiting = true;
		const submitURL =
			currentRole === 'rm' ? '/api/onboarding/rm-onboarding' : '/api/onboarding/dsa-onboarding';

		try {
			const snapshot = $state.snapshot(onboardingState.data);
			const res = await secureFetch(submitURL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					onboardingData: snapshot,
					role: currentRole,
					availableCoins: coinsState.available
				})
			});
			const result = await res.json();

			if (!res.ok) {
				if (result?.details && typeof result.details === 'object') {
					onboardingState.setErrors(result.details);
					const errorCount = Object.keys(result.details).length;
					addToast({
						type: 'error',
						message: `Please fix ${errorCount} field${errorCount > 1 ? 's' : ''}: ${result.error || 'Validation failed'}`
					});
				} else {
					addToast({
						type: 'error',
						message: result?.error || 'Something went wrong. Please try again.'
					});
				}
				return;
			}

			addToast({ type: 'success', message: 'Welcome aboard! Setting up your dashboard...' });
			if (data.redirectUrl) {
				window.location.href = data.redirectUrl;
				return;
			}
			if (result.redirect) {
				window.location.href = result.redirect;
				return;
			}
		} catch (err: any) {
			clientLogger.error({ err }, 'Onboarding submission failed:');
			addToast({
				type: 'error',
				message: 'Network error. Please check your connection and try again.'
			});
		} finally {
			isWaiting = false;
		}
	}

	async function handleNext() {
		const result = validateCurrentStep() || { valid: true, errors: {} };
		const currentRole = onboardingState.data.selectedRole || role?.toLowerCase() || '';
		onboardingState.setErrors(result.errors);
		await tick();

		if (!result.valid) {
			const errorCount = Object.keys(result.errors).length;
			addToast({
				type: 'error',
				message: `Please complete ${errorCount} required field${errorCount > 1 ? 's' : ''} to continue`
			});
			await tick();
			const firstErrorEl = document.querySelector('.text-error, .text-red-500');
			if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}

		onboardingState.markCompleted(onboardingState.activeStep);
		if (onboardingState.activeStep >= onboardingState.steps.length - 1) {
			await submitOnboarding(currentRole);
			return;
		}
		go(onboardingState.activeStep + 1);
	}

	const progressPct = $derived(
		Math.round(((onboardingState.activeStep + 1) / onboardingState.steps.length) * 100)
	);
</script>

<!-- Clean, centered onboarding — no sidebar -->
<div class="onboarding-shell flex min-h-screen flex-col">
	<!-- Top bar -->
	<header
		class="sticky top-0 z-50 border-b border-white/[0.06] bg-[var(--ddsa-secondary-900)]/80 backdrop-blur-xl"
	>
		<div class="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
			<div class="flex items-center gap-3">
				{#if onboardingState.activeStep > 0}
					<button
						onclick={back}
						class="flex h-11 w-11 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white/80"
					>
						<ChevronLeft class="h-5 w-5" />
					</button>
				{/if}
				<div class="flex items-center gap-2">
					<img src="/logo/blackLogoIcon.svg" alt="DigitalDSA" class="h-5 opacity-70 invert" />
					<span class="text-sm font-medium text-white/60">Digital DSA</span>
				</div>
			</div>

			{#if onboardingState.steps.length > 1}
				<div class="flex items-center gap-2 text-xs text-white/40">
					<span>Step {onboardingState.activeStep + 1} of {onboardingState.steps.length}</span>
					<div class="h-1 w-16 overflow-hidden rounded-full bg-white/[0.08]">
						<div
							class="gold-gradient h-full rounded-full transition-all duration-500"
							style="width: {progressPct}%"
						></div>
					</div>
				</div>
			{/if}
		</div>
	</header>

	<!-- Main content — single centered column -->
	<main class="flex-1">
		<div class="mx-auto w-full max-w-xl px-5 py-8 md:py-12">
			<!-- Step Header -->
			<div class="mb-8 md:mb-10">
				<h1 class="font-titleBold text-2xl text-white md:text-[1.75rem]">
					{#if onboardingState.activeStep === 0}
						About you
					{:else if onboardingState.activeStep === 1}
						Your business
					{:else if onboardingState.activeStep === 2}
						What brings you here?
					{:else}
						Set up your profile
					{/if}
				</h1>
				<p class="mt-2 text-sm leading-relaxed text-white/40">
					{#if onboardingState.activeStep === 0}
						Just the basics — takes 30 seconds
					{:else if onboardingState.activeStep === 1}
						Tell us about your loan business
					{:else if onboardingState.activeStep === 2}
						Pick your top 3 challenges — we'll personalize your dashboard
					{:else}
						Quick setup to get you started
					{/if}
				</p>
			</div>

			<!-- Form content -->
			<div class="space-y-8">
				{@render children()}
			</div>

			<!-- Submit -->
			<div class="mt-10">
				<button
					onclick={handleNext}
					class="gold-gradient group flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-[var(--ddsa-primary-400)]/15 shadow-lg transition-all hover:shadow-[var(--ddsa-primary-400)]/25 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
					disabled={isWaiting}
				>
					{#if isWaiting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Setting up your account...
					{:else if onboardingState.activeStep === onboardingState.steps.length - 1}
						Complete Setup
					{:else}
						Continue
					{/if}
				</button>
			</div>

			<!-- Trust strip -->
			<div class="mt-8 flex items-center justify-center gap-5 opacity-40">
				<div class="flex items-center gap-1.5 text-[11px] text-white/70">
					<ShieldCheck class="h-3.5 w-3.5" />
					<span>Encrypted</span>
				</div>
				<div class="h-3 w-px bg-white/20"></div>
				<div class="flex items-center gap-1.5 text-[11px] text-white/70">
					<Zap class="h-3.5 w-3.5" />
					<span>50+ Lenders</span>
				</div>
				<div class="h-3 w-px bg-white/20"></div>
				<div class="flex items-center gap-1.5 text-[11px] text-white/70">
					<Handshake class="h-3.5 w-3.5" />
					<span>RM Network</span>
				</div>
			</div>
		</div>
	</main>
</div>

{#if dialogState.showEmailOtpModal}
	<EmailOtpModal
		onSubmit={(otp) =>
			verifyEmailOTP(otp, emailVerificationState.email, emailVerificationState.role)}
		onResend={resendEmailOTP}
	/>
{/if}

<style>
	.onboarding-shell {
		background: var(--ddsa-secondary-900);
	}
</style>
