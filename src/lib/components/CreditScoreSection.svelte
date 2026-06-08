<script lang="ts">
	/**
	 * CreditScoreSection — Tab 3 of Income & Credit Assessment
	 * ═══════════════════════════════════════════════════════════════════
	 * Captures:
	 *   1. Credit Score (CIBIL) — number 300-900
	 *   2. Per-applicant credit history status (defaulter/guarantor)
	 *   3. Three graduated credit signal questions + conditional explanations
	 *   (ObligationsRunning question moved to UnsecuredObligation.svelte)
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import TextField from './TextField.svelte';
	import RadioField from './RadioField.svelte';
	import SelectField from './SelectField.svelte';
	import { deviceState } from '$lib/stores/device.svelte';
	import { onMount } from 'svelte';
	import {
		AlertCircle,
		AlertTriangle,
		CircleAlert,
		Search,
		TrendingUp,
		ShieldCheck
	} from '$lib/utils/iconRegistry';

	interface Props {
		creditScore: number | string;
		whyLowCredit: string[];
		// New graduated credit questions (per-applicant)
		creditHistoryStatus?: string;
		emiBounceCount?: string;
		defaultSettlementStatus?: string;
		recentEnquiryCount?: string;
		bounceReason?: string;
		defaultReason?: string;
		enquiryReason?: string;
		// Legacy props (kept for backward compat during migration)
		creditFactorAnswers?: Record<string, 'Yes' | 'No'>;
		creditFactorReasons?: Record<string, string | string[]>;
		onAnswerChange?: (answers: Record<string, unknown>) => void;
		errors?: Record<string, string | null>;
	}

	let {
		creditScore = $bindable(''),
		whyLowCredit = $bindable([]),
		creditHistoryStatus = $bindable(''),
		emiBounceCount = $bindable(''),
		defaultSettlementStatus = $bindable(''),
		recentEnquiryCount = $bindable(''),
		bounceReason = $bindable(''),
		defaultReason = $bindable(''),
		enquiryReason = $bindable(''),
		creditFactorAnswers = {},
		creditFactorReasons = {},
		onAnswerChange,
		errors = {}
	}: Props = $props();

	// ── Valid score: -1, 0, or 300–900 ──────────────────────────
	function isValidScore(val: number | string): boolean {
		const n = Number(val);
		if (val === '' || val === '-' || isNaN(n)) return false;
		return n === -1 || n === 0 || (n >= 300 && n <= 900);
	}

	let scoreError = $derived.by(() => {
		if (creditScore === '' || creditScore === '-') return null;
		const n = Number(creditScore);
		if (isNaN(n)) return 'Enter a valid number';
		if (!isValidScore(n)) return 'Enter -1 (not applicable), 0 (no history), or 300–900';
		return null;
	});

	// ── DOM-level guard: block non-digit characters at beforeinput ──
	// User reported (S104, screenshot from /form/home-loan Credit Score page):
	// typing "dsa" stayed in the CIBIL input. The onInput callback already
	// strips non-digits AND force-syncs the DOM input value, but in some
	// reactivity-dependent code paths Svelte didn't roll the DOM update back
	// (the input had model value '' but display value 'dsa' until next reactive
	// event). Attaching an `inputType === 'insertText'` beforeinput listener
	// rejects non-digit keystrokes at the browser level — before any Svelte
	// reactivity even fires. Paste / cut events fall through to onInput's
	// strip so users can still paste mixed content and have it cleaned.
	onMount(() => {
		const inputEl = document.getElementById('q_creditScore') as HTMLInputElement | null;
		if (!inputEl) return;
		const handler = (e: Event) => {
			const evt = e as InputEvent;
			if (evt.inputType === 'insertText' && evt.data && /\D/.test(evt.data)) {
				evt.preventDefault();
			}
		};
		inputEl.addEventListener('beforeinput', handler);
		return () => inputEl.removeEventListener('beforeinput', handler);
	});

	// ── Credit score visual indicator ────────────────────────────
	let scoreCategory = $derived.by(() => {
		const score = Number(creditScore);
		if (isNaN(score)) return null;
		if (score === -1)
			return {
				label: 'Not Applicable',
				color: 'text-[var(--form-text-secondary)]',
				icon: CircleAlert
			};
		if (score === 0)
			return { label: 'No History', color: 'text-[var(--form-text-secondary)]', icon: CircleAlert };
		if (score < 300) return null;
		// Out-of-range upper bound (e.g. user typed 999) — refuse to classify as
		// Excellent. Returning null suppresses the badge so the user sees the
		// validation error from `scoreError` instead.
		if (score > 900) return null;
		if (score < 600)
			return { label: 'Poor', color: 'text-red-600 dark:text-red-400', icon: AlertCircle };
		if (score < 650)
			return { label: 'Low', color: 'text-neutral-600 dark:text-neutral-400', icon: AlertTriangle };
		if (score < 700)
			return { label: 'Fair', color: 'text-stone-600 dark:text-stone-400', icon: AlertTriangle };
		if (score < 750)
			return { label: 'Good', color: 'text-green-600 dark:text-green-400', icon: TrendingUp };
		return {
			label: 'Excellent',
			color: 'text-emerald-600 dark:text-emerald-400',
			icon: ShieldCheck
		};
	});

	// ── Two-column layout for radio options on desktop ────────────
	let twoColClass = $derived(
		deviceState.isMobile ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-3'
	);

	// ── Show graduated questions when score is valid ─────────────
	let showGraduatedQuestions = $derived(isValidScore(creditScore));

	// ── CIBIL score vs selected answers consistency check ────────
	// A high CIBIL score is incompatible with defaulter status, active defaults,
	// written-offs, heavy EMI bounces, or excessive enquiries. Flag these so
	// the DSA can verify before submission — lenders will catch the mismatch.
	let mismatchWarnings = $derived.by(() => {
		const score = Number(creditScore);
		if (!isValidScore(score) || score === -1 || score === 0) return [];

		const warnings: string[] = [];

		if (score >= 750) {
			if (creditHistoryStatus === 'defaulter' || creditHistoryStatus === 'both')
				warnings.push(
					'Being a past defaulter would have significantly reduced the CIBIL score below 750.'
				);
			if (emiBounceCount === '3+')
				warnings.push(
					'3 or more EMI bounces in 12 months would bring the CIBIL score well below 750.'
				);
			if (defaultSettlementStatus === 'ACTIVE_DEFAULT')
				warnings.push('An active default cannot coexist with an Excellent CIBIL score.');
			if (defaultSettlementStatus === 'WRITTEN_OFF')
				warnings.push('A written-off loan would severely reduce the CIBIL score below 750.');
			if (defaultSettlementStatus === 'SETTLED')
				warnings.push('A settled loan record would typically reduce the CIBIL score below 750.');
			if (recentEnquiryCount === '6+')
				warnings.push('6 or more enquiries in 2 months is inconsistent with an Excellent score.');
		} else if (score >= 700) {
			if (creditHistoryStatus === 'defaulter' || creditHistoryStatus === 'both')
				warnings.push(
					`Being a current defaulter is inconsistent with a Good CIBIL score of ${score}.`
				);
			if (defaultSettlementStatus === 'ACTIVE_DEFAULT')
				warnings.push('An active default would reduce the CIBIL score well below 700.');
			if (defaultSettlementStatus === 'WRITTEN_OFF')
				warnings.push(`A written-off loan is inconsistent with a Good CIBIL score of ${score}.`);
			if (emiBounceCount === '3+')
				warnings.push(
					'3 or more EMI bounces in 12 months would significantly reduce the CIBIL score below 700.'
				);
		}

		return warnings;
	});

	// ── Explanation visibility ───────────────────────────────────
	let showBounceReason = $derived(emiBounceCount !== '' && emiBounceCount !== '0');
	let showDefaultReason = $derived(
		defaultSettlementStatus !== '' && defaultSettlementStatus !== 'CLEAN'
	);
	let showEnquiryReason = $derived(
		recentEnquiryCount !== 'none' && recentEnquiryCount !== '1_2' && recentEnquiryCount !== ''
	);

	// ── Helper: check if a value has been answered ─────────────
	// Uses explicit empty/null checks instead of falsy (!val) to avoid
	// treating legitimate values like '0' or 0 as "not answered".
	function hasAnswer(val: string | number | undefined | null): boolean {
		if (val == null) return false;
		if (typeof val === 'string') return val !== '';
		return true; // number 0 is still a valid answer
	}

	// ── All graduated questions answered check ──────────────────
	let allGraduatedAnswered = $derived.by(() => {
		if (!showGraduatedQuestions) return false;
		const score = Number(creditScore);
		// For -1 or 0: skip graduated questions
		if (score === -1 || score === 0) return true;

		if (!hasAnswer(creditHistoryStatus)) return false;
		if (!hasAnswer(emiBounceCount)) return false;
		if (!hasAnswer(defaultSettlementStatus)) return false;
		if (!hasAnswer(recentEnquiryCount)) return false;

		// Check required explanations
		if (showBounceReason && !hasAnswer(bounceReason)) return false;
		if (showDefaultReason && !hasAnswer(defaultReason)) return false;
		if (showEnquiryReason && !hasAnswer(enquiryReason)) return false;

		return true;
	});

	// ── Bounce reason options ───────────────────────────────────
	const bounceReasonOptions = [
		{ label: 'Technical issue (auto-debit failure)', value: 'technical' },
		{ label: 'Cash flow gap', value: 'cash_flow' },
		{ label: 'Bank error', value: 'bank_error' },
		{ label: 'Account switch in progress', value: 'account_switch' },
		{ label: 'Other', value: 'other' }
	];

	const defaultReasonOptions = [
		{ label: 'Job loss / income disruption', value: 'job_loss' },
		{ label: 'Medical emergency', value: 'medical' },
		{ label: 'Business downturn', value: 'business_downturn' },
		{ label: 'Dispute with lender', value: 'dispute' },
		{ label: 'Other', value: 'other' }
	];

	const enquiryReasonOptions = [
		{ label: 'Rate shopping across lenders', value: 'rate_shopping' },
		{ label: 'Multiple applications', value: 'multiple_applications' },
		{ label: 'Pre-approval checks', value: 'pre_approval' },
		{ label: 'Co-applicant enquiries', value: 'co_applicant' },
		{ label: 'Other', value: 'other' }
	];

	function notifyChange() {
		onAnswerChange?.({
			creditScore,
			whyLowCredit,
			creditHistoryStatus,
			emiBounceCount,
			defaultSettlementStatus,
			recentEnquiryCount,
			bounceReason,
			defaultReason,
			enquiryReason,
			// Legacy: mark all graduated questions as complete for backward compat
			creditFactorsAnswered: allGraduatedAnswered,
			// Pass empty legacy keys so parent doesn't break
			creditFactorAnswers: {},
			creditFactorReasons: {}
		});
	}

	// ── Clear explanation when parent value goes back to clean ──
	function handleBounceCountChange(val: string) {
		emiBounceCount = val;
		if (val === '0') bounceReason = '';
		notifyChange();
	}

	function handleDefaultStatusChange(val: string) {
		defaultSettlementStatus = val;
		if (val === 'CLEAN') defaultReason = '';
		notifyChange();
	}

	function handleEnquiryCountChange(val: string) {
		recentEnquiryCount = val;
		if (val === 'none' || val === '1_2') enquiryReason = '';
		notifyChange();
	}

	let creditScoreStr = $derived(String(creditScore ?? ''));

	const creditScoreDescription = `
<div style="font-family: system-ui, -apple-system, sans-serif;">
	<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
		<span style="font-size: 1.25rem;">📊</span>
		<span style="font-size: 1rem; font-weight: 700; color: var(--form-text, #1f2937);">Understanding CIBIL Score</span>
	</div>
	<div class="mb-3.5 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-3 dark:border-stone-700 dark:bg-stone-950/40">
		<p class="m-0 text-sm leading-relaxed text-stone-800 dark:text-stone-300">
			In India, the <strong>CIBIL score</strong> is a 3-digit number (300–900) that summarises your credit history.
			A higher score means better creditworthiness—leading to faster approvals, lower interest rates, and higher loan amounts.
		</p>
	</div>
	<div style="font-size: 0.75rem; font-weight: 600; color: var(--form-text-secondary, #6b7280); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Score Categories</div>
	<div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
		<div class="flex items-center gap-2.5 rounded-lg border-l-4 border-emerald-600 bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
			<div class="min-w-[70px]"><span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">750 – 900</span></div>
			<div><span class="font-semibold text-emerald-800 dark:text-emerald-300">Excellent</span><span class="text-xs text-[var(--form-text-secondary)]"> · Low-risk borrower. Fastest approvals, best rates & highest loan amounts.</span></div>
		</div>
		<div class="flex items-center gap-2.5 rounded-lg border-l-4 border-green-600 bg-green-50 px-3 py-2 dark:bg-green-950/40">
			<div class="min-w-[70px]"><span class="text-sm font-bold text-green-600 dark:text-green-400">700 – 749</span></div>
			<div><span class="font-semibold text-green-800 dark:text-green-300">Good</span><span class="text-xs text-[var(--form-text-secondary)]"> · Strong profile. High approval probability, competitive interest rates.</span></div>
		</div>
		<div class="flex items-center gap-2.5 rounded-lg border-l-4 border-stone-500 bg-stone-50 px-3 py-2 dark:bg-stone-950/40">
			<div class="min-w-[70px]"><span class="text-sm font-bold text-stone-500 dark:text-stone-400">650 – 699</span></div>
			<div><span class="font-semibold text-stone-800 dark:text-stone-300">Fair</span><span class="text-xs text-[var(--form-text-secondary)]"> · Approval possible but with higher rates. Co-applicant or collateral may help.</span></div>
		</div>
		<div class="flex items-center gap-2.5 rounded-lg border-l-4 border-neutral-600 bg-neutral-50 px-3 py-2 dark:bg-neutral-950/40">
			<div class="min-w-[70px]"><span class="text-sm font-bold text-neutral-600 dark:text-neutral-400">600 – 649</span></div>
			<div><span class="font-semibold text-neutral-800 dark:text-neutral-300">Low</span><span class="text-xs text-[var(--form-text-secondary)]"> · Considered risky. Limited options with unfavourable terms.</span></div>
		</div>
		<div class="flex items-center gap-2.5 rounded-lg border-l-4 border-red-600 bg-red-50 px-3 py-2 dark:bg-red-950/40">
			<div class="min-w-[70px]"><span class="text-sm font-bold text-red-600 dark:text-red-400">Below 600</span></div>
			<div><span class="font-semibold text-red-800 dark:text-red-300">Poor</span><span class="text-xs text-[var(--form-text-secondary)]"> · Urgent action needed. Very unlikely to get approved for standard loans.</span></div>
		</div>
		<div class="flex items-center gap-2.5 rounded-lg border-l-4 px-3 py-2" style="border-left-color: var(--form-text-secondary, #6b7280); background: var(--form-bg-alt, #f9fafb);">
			<div class="min-w-[70px]"><span class="text-sm font-bold" style="color: var(--form-text-secondary, #6b7280);">0</span></div>
			<div><span class="font-semibold" style="color: var(--form-text, #374151);">No History</span><span class="text-xs text-[var(--form-text-secondary)]"> · Never taken a loan or credit card. Some lenders may be hesitant.</span></div>
		</div>
		<div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; border-left: 4px solid var(--form-text-muted, #9ca3af); background: var(--form-bg-alt, #f9fafb);">
			<div style="min-width: 70px;"><span style="font-weight: 700; color: var(--form-text-muted, #9ca3af); font-size: 0.85rem;">-1</span></div>
			<div><span style="font-weight: 600; color: var(--form-text, #374151);">Not Applicable</span><span style="color: var(--form-text-secondary, #6b7280); font-size: 0.75rem;"> · Score not available or not applicable to this applicant.</span></div>
		</div>
	</div>
	<div class="rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2.5 dark:border-blue-700 dark:bg-blue-950/40">
		<p class="m-0 text-xs leading-normal text-blue-800 dark:text-blue-300">
			<strong>💡 How to check:</strong> Visit <em>cibil.com</em>, or use apps like Paytm, PhonePe, or your bank\'s app for a free credit report.
		</p>
	</div>
</div>`;
</script>

<div class="flex flex-col gap-5">
	<!-- <p class="text-xs leading-relaxed text-[var(--form-text-muted)]">
		Provide the applicant's CIBIL score and credit profile details.
	</p> -->

	<!-- CIBIL Score Input + Badge -->
	<div class="score-input-row">
		<div class="score-input-field">
			<TextField
				id="q_creditScore"
				label="What's the CIBIL Score?"
				placeholder="Enter CIBIL Score"
				value={creditScoreStr}
				required={true}
				icon="Gauge"
				type="text"
				maxLength={3}
				description={creditScoreDescription}
				error={scoreError || errors.creditScore || null}
				onInput={(val) => {
					// CIBIL is an integer in 300–900 (or -1 sentinel for no-history).
					// Strip everything except digits — protects against decimals, spaces,
					// signs, and other non-digit characters whether typed or pasted.
					const raw = String(val).replace(/\D/g, '').slice(0, 3);
					if (raw === '') {
						creditScore = '';
					} else {
						const n = Number(raw);
						creditScore = isNaN(n) ? '' : n;
					}
					// Svelte's controlled-input update skips the DOM write when the
					// reactive `value` prop computes to the same string as the prior
					// frame (e.g. typing "." when creditScore was already empty leaves
					// the input showing "." even though the model is ''). Force the
					// DOM input element back to the canonical string ourselves.
					const inputEl = document.getElementById('q_creditScore') as HTMLInputElement | null;
					if (inputEl && inputEl.value !== raw) {
						inputEl.value = raw;
					}
					notifyChange();
				}}
			/>
		</div>
		{#if scoreCategory}
			<div class="score-badge pt-7">
				<scoreCategory.icon class="h-4 w-4 {scoreCategory.color}" />
				<span class="alertText font-titleMedium {scoreCategory.color}">
					{scoreCategory.label}{Number(creditScore) >= 300 && !deviceState.isMobile
						? ' CIBIL Score'
						: ''}
				</span>
			</div>
		{/if}
	</div>

	<!-- Mismatch warning: high CIBIL + contradictory selections -->
	{#if mismatchWarnings.length > 0}
		<div class="error-message">
			<div class="flex items-start gap-2">
				<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 " />
				<div>
					<p class="alertText font-titleMedium">
						Despite a CIBIL score of {creditScore}, the selected options are not consistent with
						this profile.
					</p>
					{#if mismatchWarnings.length === 1}
						<p class="tinyText mt-0.5">{mismatchWarnings[0]}</p>
					{:else}
						<ul class="tinyText mt-1 list-inside list-disc">
							{#each mismatchWarnings as warning}
								<li>{warning}</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Graduated Credit Questions (shown when score is valid, not -1/0) -->
	{#if showGraduatedQuestions && Number(creditScore) !== -1 && Number(creditScore) !== 0}
		<div class="flex flex-col gap-[3rem] mt-[2rem]">
			<!-- Q0: Credit History Status (per-applicant, moved from old Page 1) -->
			<RadioField
				id="q_creditHistoryStatus"
				label="Has this applicant ever been a defaulter or guarantor for a defaulted loan?"
				optionContainerClass={twoColClass}
				options={[
					{ label: 'Neither', value: 'clean', icon: 'EqualNot' },
					{ label: 'Defaulter', value: 'defaulter', icon: 'ShieldOff' },
					{ label: 'Guarantor for default', value: 'guarantor', icon: 'HandFist' },
					{ label: 'Both', value: 'both', icon: 'Workflow' }
				]}
				value={creditHistoryStatus}
				required={true}
				error={errors.creditHistoryStatus || null}
				onChange={(val) => {
					creditHistoryStatus = val as string;
					notifyChange();
				}}
			/>

			<!-- Q1: EMI Bounce History -->
			{#if hasAnswer(creditHistoryStatus)}
				<RadioField
					id="q_emiBounceCount"
					label="How many EMI bounces in the last 12 months?"
					optionContainerClass={twoColClass}
					options={[
						{ label: 'No bounces', value: '0', icon: 'CircleSlash' },
						{ label: '1 bounce', value: '1', icon: 'Tally1' },
						{ label: '2 bounces', value: '2', icon: 'Tally2' },
						{ label: '3 or more', value: '3+', icon: 'Plus' }
					]}
					value={emiBounceCount}
					required={true}
					error={errors.emiBounceCount || null}
					onChange={(val) => handleBounceCountChange(val as string)}
				/>
			{/if}

			<!-- Bounce reason (conditional) -->
			{#if showBounceReason}
				<SelectField
					id="q_bounceReason"
					label="What caused the EMI bounce?"
					options={bounceReasonOptions}
					value={bounceReason}
					required={true}
					error={errors.bounceReason || null}
					onChange={(val) => {
						bounceReason = val as string;
						notifyChange();
					}}
				/>
			{/if}

			<!-- Q2: Default / Settlement History -->
			{#if hasAnswer(emiBounceCount)}
				<RadioField
					id="q_defaultSettlementStatus"
					label="Any loan default or settlement history?"
					optionContainerClass={twoColClass}
					options={[
						{ label: 'No defaults or settlements', value: 'CLEAN' },
						{ label: 'Settled (paid and closed)', value: 'SETTLED' },
						{ label: 'Written off (unpaid)', value: 'WRITTEN_OFF' },
						{ label: 'Active default', value: 'ACTIVE_DEFAULT' }
					]}
					value={defaultSettlementStatus}
					required={true}
					error={errors.defaultSettlementStatus || null}
					onChange={(val) => handleDefaultStatusChange(val as string)}
				/>
			{/if}

			<!-- Default reason (conditional) -->
			{#if showDefaultReason}
				<SelectField
					id="q_defaultReason"
					label="What led to the default / settlement?"
					options={defaultReasonOptions}
					value={defaultReason}
					required={true}
					error={errors.defaultReason || null}
					onChange={(val) => {
						defaultReason = val as string;
						notifyChange();
					}}
				/>
			{/if}

			<!-- Q3: Recent Enquiries -->
			{#if hasAnswer(defaultSettlementStatus)}
				<RadioField
					id="q_recentEnquiryCount"
					label="Credit enquiries in the last 2 months?"
					optionContainerClass={twoColClass}
					options={[
						{ label: 'None', value: 'none' },
						{ label: '1-2 enquiries', value: '1_2' },
						{ label: '3-5 enquiries', value: '3_5' },
						{ label: '6+ enquiries', value: '6+' }
					]}
					value={recentEnquiryCount}
					required={true}
					error={errors.recentEnquiryCount || null}
					onChange={(val) => handleEnquiryCountChange(val as string)}
				/>
			{/if}

			<!-- Enquiry reason (conditional) -->
			{#if showEnquiryReason}
				<SelectField
					id="q_enquiryReason"
					label="Reason for multiple enquiries?"
					options={enquiryReasonOptions}
					value={enquiryReason}
					required={true}
					error={errors.enquiryReason || null}
					onChange={(val) => {
						enquiryReason = val as string;
						notifyChange();
					}}
				/>
			{/if}
		</div>
	{/if}
</div>

<style>
	.score-input-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.score-input-field {
		width: 100%;
	}

	@media (min-width: 768px) {
		.score-input-field {
			width: 16rem;
		}
	}

	.score-badge {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		gap: 6px;
		/* padding: 8px 16px; */
		white-space: nowrap;
	}
</style>
