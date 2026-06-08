<script lang="ts">
	/**
	 * CompanyCharacterTab — Tab 2: Business Character
	 * ═══════════════════════════════════════════════════════════════════
	 * Captures HOW the business operates:
	 *   - Common questions (revenue pattern, customer base, premises, growth)
	 *   - Conditional questions (prior experience, GST filing)
	 *   - Category-specific sections for each selected category
	 *
	 * Uses bind:applicantData pattern (no direct formState access).
	 * Completion derived centrally in incomeTabState.ts.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import RadioIcon from '$lib/components/RadioIcon.svelte';
	import {
		CHARACTER_COMMON_QUESTIONS,
		CHARACTER_CONDITIONAL_QUESTIONS
	} from '$lib/config/companyProfile/questions';
	import type { BusinessCategoryEntry } from '$lib/types/companyIncome';
	import { formState } from '$lib/state/form.svelte';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		applicantData: Record<string, any>;
	}

	let { applicantData = $bindable({}) }: Props = $props();

	// ── Derived (categories stabilized to prevent unnecessary re-renders) ──
	const selectedCategories = $derived(
		(applicantData.businessCategories as BusinessCategoryEntry[] | undefined) ?? []
	);

	// Visible conditional questions (depends on applicant fields like vintage, gstStatus)
	const visibleConditionals = $derived(
		CHARACTER_CONDITIONAL_QUESTIONS.filter(
			(q) => !q.showWhen || q.showWhen(applicantData as Record<string, unknown>)
		)
	);

	let showErrors = $state(false);

	// ── Option filtering based on applicant data ─────────────────────

	/** Compute GST vintage in years from registration date */
	function getGSTVintageYears(): number {
		const ci = applicantData.companyIncome as Record<string, any> | undefined;
		const regDate = ci?.gst?.registrationDate as string | undefined;
		if (!regDate) return 0;
		const parts = regDate.split('-');
		if (parts.length < 2) return 0;
		const regYear = parseInt(parts[1]);
		const regMonth = new Date(`${parts[0]} 1, 2000`).getMonth() + 1;
		if (isNaN(regYear)) return 0;
		const now = new Date();
		return Math.max(0, now.getFullYear() - regYear + (now.getMonth() + 1 - regMonth) / 12);
	}

	/** Filter options for growthTrend and gstFiling based on vintage/GST date */
	function getFilteredOptions(question: {
		id: string;
		options: { label: string; value: string; icon?: string }[];
	}) {
		if (question.id === 'growthTrend') {
			const vintage = applicantData.businessVintage as string;
			const gstYears = getGSTVintageYears();
			// Business < 2 years AND GST vintage < 2 years → only "New business" applies
			const isNew = (vintage === 'less_1' || vintage === '1_2') && gstYears < 2;
			if (isNew) {
				return question.options.filter((o) => o.value === 'new_business');
			}
			// Business 2+ years OR GST vintage 2+ years → hide "New business" option
			return question.options.filter((o) => o.value !== 'new_business');
		}
		if (question.id === 'gstFiling') {
			const ci = applicantData.companyIncome as Record<string, any> | undefined;
			const regDate = ci?.gst?.registrationDate as string | undefined;
			if (regDate) {
				// Parse GST reg date and check if within ~1 year
				const parts = regDate.split('-');
				if (parts.length >= 2) {
					const regYear = parseInt(parts[1]);
					const regMonth = new Date(`${parts[0]} 1, 2000`).getMonth() + 1;
					if (!isNaN(regYear)) {
						const now = new Date();
						const yearsAgo = now.getFullYear() - regYear + (now.getMonth() + 1 - regMonth) / 12;
						if (yearsAgo > 1.5) {
							// Registered > 1.5 years ago → hide "Recently registered"
							return question.options.filter((o) => o.value !== 'recently_registered');
						}
					}
				}
			}
		}
		return question.options;
	}

	// Auto-select growthTrend when only one option available
	$effect(() => {
		const vintage = applicantData.businessVintage as string;
		const gstYears = getGSTVintageYears();
		const isNew = (vintage === 'less_1' || vintage === '1_2') && gstYears < 2;
		if (isNew) {
			if (applicantData.growthTrend !== 'new_business') {
				applicantData.growthTrend = 'new_business';
				formState.scheduleSave();
			}
		} else if (applicantData.growthTrend === 'new_business' && vintage) {
			// Vintage changed to 2+ years (or GST vintage ≥ 2) but "new_business" was selected → clear it
			applicantData.growthTrend = '';
			formState.scheduleSave();
		}
	});

	// Auto-clear gstFiling "recently_registered" if GST reg date is old
	$effect(() => {
		if (applicantData.gstFiling !== 'recently_registered') return;
		const ci = applicantData.companyIncome as Record<string, any> | undefined;
		const regDate = ci?.gst?.registrationDate as string | undefined;
		if (!regDate) return;
		const parts = regDate.split('-');
		if (parts.length < 2) return;
		const regYear = parseInt(parts[1]);
		const regMonth = new Date(`${parts[0]} 1, 2000`).getMonth() + 1;
		if (isNaN(regYear)) return;
		const now = new Date();
		const yearsAgo = now.getFullYear() - regYear + (now.getMonth() + 1 - regMonth) / 12;
		if (yearsAgo > 1.5) {
			applicantData.gstFiling = '';
			formState.scheduleSave();
		}
	});

	// ── Field updates — direct mutation via bind ─────────────────────
	function updateField(key: string, value: unknown) {
		applicantData[key] = value;
		formState.scheduleSave();
	}

	export function validate(): boolean {
		showErrors = true;
		// Check common
		const commonDone = CHARACTER_COMMON_QUESTIONS.filter((q) => q.required).every(
			(q) => applicantData[q.key] != null && applicantData[q.key] !== ''
		);
		// Check conditional
		const conditionalDone = visibleConditionals
			.filter((q) => q.required)
			.every((q) => applicantData[q.key] != null && applicantData[q.key] !== '');
		return commonDone && conditionalDone;
	}
</script>

<div class="flex flex-col gap-20 pb-4">
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- COMMON QUESTIONS                                                -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#each CHARACTER_COMMON_QUESTIONS as question (question.id)}
		{@const filtered = getFilteredOptions(question)}
		<div class="question-block" data-q={question.key}>
			<RadioIcon
				name={question.id}
				questionLabel={question.label}
				question={{ key: question.key, options: filtered }}
				selected={(applicantData[question.key] as string) ?? ''}
				onChange={(val) => updateField(question.key, val)}
				error={showErrors && question.required && !applicantData[question.key] ? 'Required' : ''}
				required={question.required}
				whyAsked={question.whyAsked}
			/>
		</div>
	{/each}

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- CONDITIONAL QUESTIONS — smooth slide-in                         -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#each visibleConditionals as question (question.id)}
		{@const filtered = getFilteredOptions(question)}
		<div class="question-block question-appear" data-q={question.key}>
			<RadioIcon
				name={question.id}
				questionLabel={question.label}
				question={{ key: question.key, options: filtered }}
				selected={(applicantData[question.key] as string) ?? ''}
				onChange={(val) => updateField(question.key, val)}
				error={showErrors && question.required && !applicantData[question.key] ? 'Required' : ''}
				required={question.required}
				whyAsked={question.whyAsked}
			/>
		</div>
	{/each}

	<!-- Category-specific deep profile questions removed — not needed for offer creation -->
</div>

<style>
	.question-block {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Smooth slide-in for conditional / category questions */
	.question-appear {
		animation: slideIn 0.35s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
