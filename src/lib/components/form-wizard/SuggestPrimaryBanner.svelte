<script lang="ts">
	/**
	 * SuggestPrimaryBanner — advisory banner shown inside the form wizard
	 * when a co-applicant would likely perform better as the primary applicant.
	 *
	 * Scoring mirrors suggestPrimaryApplicant.ts exactly (same weights, same
	 * thresholds, same ageFactor curve) — kept as a pure client-side $derived
	 * so it never imports from the server-only ruleEngine module.
	 *
	 * Only renders when:
	 *  - 2+ Individual applicants exist
	 *  - A non-primary scores >10% higher than applicants[0]
	 *  - The loan is not a Professional Loan (profession constraint locks [0])
	 *  - The user has not dismissed it this session
	 */

	import { Lightbulb, X, ArrowLeftRight } from '$lib/utils/iconRegistry';

	// ─────────────────────────────────────────────────────────────────────────
	// Props
	// ─────────────────────────────────────────────────────────────────────────

	interface Props {
		/** The full formState.applicants array (all entries, including Company type). */
		applicants: Array<Record<string, unknown>>;
		/** Called with the index of the applicant that should become [0]. */
		onSetPrimary: (newPrimaryIndex: number) => void;
		/** Loan name — "Professional Loan" suppresses the banner entirely. */
		loanName?: string;
	}

	let { applicants, onSetPrimary, loanName = '' }: Props = $props();

	// ─────────────────────────────────────────────────────────────────────────
	// Session-level dismissed flag
	// ─────────────────────────────────────────────────────────────────────────

	let dismissed = $state(false);

	// ─────────────────────────────────────────────────────────────────────────
	// Scoring constants — match suggestPrimaryApplicant.ts exactly
	// ─────────────────────────────────────────────────────────────────────────

	/** Only suggest if best beats current [0] by this relative margin */
	const SUGGESTION_THRESHOLD = 0.1;

	const WEIGHT_CIBIL = 0.4;
	const WEIGHT_INCOME = 0.3;
	const WEIGHT_AGE = 0.15;
	const WEIGHT_EMPLOYMENT = 0.15;

	/** CIBIL: scores plateau at 900 (floor=300, range=600) */
	const CIBIL_FLOOR = 300;
	const CIBIL_RANGE = 600;

	/** Income normalization cap — plateau at ₹2 lakh/month */
	const INCOME_CAP = 200_000;

	/** Employment weights — mirror EMPLOYMENT_SCORES in suggestPrimaryApplicant.ts */
	const EMPLOYMENT_WEIGHTS: Record<string, number> = {
		'Salaried(Private)': 1.0,
		'Salaried(Government)': 1.0,
		'Self-employed(Professional)': 0.7,
		'Self-employed(Businessman)': 0.7,
		'Self-employed(Other)': 0.7
	};
	const DEFAULT_EMPLOYMENT_WEIGHT = 0.5;

	// ─────────────────────────────────────────────────────────────────────────
	// Pure normalization helpers (no side effects)
	// ─────────────────────────────────────────────────────────────────────────

	function normalizeCibil(score: number): number {
		if (score <= CIBIL_FLOOR) return 0;
		return Math.min((score - CIBIL_FLOOR) / CIBIL_RANGE, 1);
	}

	function normalizeIncome(income: number, maxIncome: number): number {
		if (income <= 0 || maxIncome <= 0) return 0;
		// Relative to the highest earner among applicants (capped at INCOME_CAP)
		return Math.min(income / Math.min(maxIncome, INCOME_CAP), 1);
	}

	/**
	 * Age factor — peaks at 28–50 (broad plateau for secured loans).
	 *   <21 or >65 → 0
	 *   21–27 → ramp from 0.6 to 1.0
	 *   28–50 → 1.0
	 *   51–65 → decline from 1.0 to 0.4
	 * Matches the ageFactor() function in suggestPrimaryApplicant.ts.
	 */
	function ageFactor(age: number): number {
		if (age < 21 || age > 65) return 0;
		if (age >= 28 && age <= 50) return 1.0;
		if (age < 28) return 0.6 + (age - 21) * (0.4 / 7);
		// 51–65 declining
		return 1.0 - (age - 50) * (0.6 / 15);
	}

	function employmentWeight(type: string): number {
		return EMPLOYMENT_WEIGHTS[type] ?? DEFAULT_EMPLOYMENT_WEIGHT;
	}

	/**
	 * Extract gross income from an applicant object.
	 * Tries grossIncome → netIncome → incomeEntries (same logic as extractIncome() in the server module).
	 */
	function extractIncome(applicant: Record<string, unknown>): number {
		const gross = Number(applicant.grossIncome) || 0;
		if (gross > 0) return gross;

		const net = Number(applicant.netIncome) || 0;
		if (net > 0) return net;

		// Fall back to summing individual income entries
		const entries = applicant.incomeEntries as Array<Record<string, unknown>> | undefined;
		if (!entries?.length) return 0;

		let total = 0;
		for (const entry of entries) {
			const income = entry.income as Record<string, unknown> | undefined;
			if (!income) continue;

			total +=
				Number(income.grossMonthlySalary) ||
				Number(income.netMonthlySalary) ||
				Number(income.monthlySalaryAmount) ||
				Number(income.averageProfitPerWithdrawal) ||
				Number(income.netProfessionalIncome) ||
				Number(income.monthlyPensionAmount) ||
				Number(income.monthlyRentAmount) ||
				Number(income.averageMonthlyFreelanceIncome) ||
				0;
		}
		return total;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Derived: compute suggestion (runs whenever applicants changes)
	// ─────────────────────────────────────────────────────────────────────────

	interface ScoredApplicant {
		originalIndex: number;
		name: string;
		creditScore: number;
		monthlyIncome: number;
		age: number;
		employmentType: string;
		compositeScore: number;
	}

	const suggestion = $derived.by(() => {
		// Professional Loan: profession constraint locks who is primary — skip
		if (loanName.toLowerCase().includes('professional')) return null;

		// Score Individual applicants only; skip Company entries
		const scored: ScoredApplicant[] = [];

		// First pass: collect incomes to find max for relative normalization
		let maxIncome = 0;
		for (const applicant of applicants) {
			if (String(applicant.applicantType ?? 'Individual') === 'Company') continue;
			const income = extractIncome(applicant);
			if (income > maxIncome) maxIncome = income;
		}

		for (let i = 0; i < applicants.length; i++) {
			const applicant = applicants[i];
			if (String(applicant.applicantType ?? 'Individual') === 'Company') continue;

			const creditScore = Number(applicant.creditScore) || 0;
			const age = Number(applicant.age) || 0;
			const monthlyIncome = extractIncome(applicant);
			const empType = String(applicant.employmentType ?? '');

			// Composite score: same weights as the server-side module
			const composite =
				normalizeCibil(creditScore) * WEIGHT_CIBIL +
				normalizeIncome(monthlyIncome, maxIncome) * WEIGHT_INCOME +
				ageFactor(age) * WEIGHT_AGE +
				employmentWeight(empType) * WEIGHT_EMPLOYMENT;

			scored.push({
				originalIndex: i,
				name: String(applicant.fullName ?? `Applicant ${i + 1}`),
				creditScore,
				monthlyIncome,
				age,
				employmentType: empType,
				compositeScore: Math.round(composite * 1000) / 1000
			});
		}

		// Need at least 2 individuals to make a meaningful comparison
		if (scored.length < 2) return null;

		// Find who is currently marked as primary (isPrimaryApplicant flag),
		// falling back to index 0 when no one is explicitly tagged yet.
		const currentPrimary =
			scored.find((s) => applicants[s.originalIndex]?.isPrimaryApplicant === true) ??
			scored.find((s) => s.originalIndex === 0);
		if (!currentPrimary) return null;

		// Find the highest scorer
		const best = [...scored].sort((a, b) => b.compositeScore - a.compositeScore)[0];

		// Best is already the current primary — no suggestion needed
		if (best.originalIndex === currentPrimary.originalIndex) return null;

		// Only suggest if the margin exceeds the threshold
		if (currentPrimary.compositeScore === 0) return null;
		const relativeDiff =
			(best.compositeScore - currentPrimary.compositeScore) / currentPrimary.compositeScore;
		if (relativeDiff < SUGGESTION_THRESHOLD) return null;

		// Identify the main reason for the suggestion
		const reason = buildReason(best, currentPrimary);

		return {
			bestIndex: best.originalIndex,
			bestName: best.name,
			currentName: currentPrimary.name,
			reason
		};
	});

	// ─────────────────────────────────────────────────────────────────────────
	// Reason builder — surface the most impactful advantage
	// ─────────────────────────────────────────────────────────────────────────

	function buildReason(best: ScoredApplicant, current: ScoredApplicant): string {
		const advantages: string[] = [];

		if (best.creditScore > current.creditScore) {
			advantages.push(`higher CIBIL (${best.creditScore} vs ${current.creditScore})`);
		}
		if (best.monthlyIncome > current.monthlyIncome * 1.1) {
			advantages.push('higher income');
		}
		if (ageFactor(best.age) > ageFactor(current.age)) {
			advantages.push(`better age profile (${best.age} yrs)`);
		}

		if (advantages.length === 0) {
			return 'stronger overall profile';
		}
		return advantages.join(', ');
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Event handlers
	// ─────────────────────────────────────────────────────────────────────────

	function handleSetPrimary() {
		if (!suggestion) return;
		onSetPrimary(suggestion.bestIndex);
		// Dismiss after tagging — the isPrimaryApplicant flag will now match
		// the best scorer, so re-evaluation would produce no suggestion anyway.
		dismissed = true;
	}

	function handleDismiss() {
		dismissed = true;
	}
</script>

{#if suggestion && !dismissed}
	<div
		role="status"
		aria-live="polite"
		class="mt-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3
		       sm:flex-row sm:items-center sm:justify-between
		       dark:border-amber-700/50 dark:bg-amber-900/20"
	>
		<!-- Icon + message -->
		<div class="flex min-w-0 items-start gap-3 sm:items-center">
			<Lightbulb size={18} class="mt-0.5 shrink-0 text-amber-600 sm:mt-0 dark:text-amber-400" />
			<p class="alertText text-amber-800 dark:text-amber-300">
				<span class="font-titleBold">
					{suggestion.bestName}
				</span>
				may perform better as the primary applicant reason ({suggestion.reason}).
			</p>
		</div>

		<!-- Action buttons -->
		<div class="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
			<button
				onclick={handleSetPrimary}
				class="buttonText inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3
				       py-1.5 text-white transition-colors hover:bg-amber-700
				       active:bg-amber-800 dark:bg-amber-500 dark:hover:bg-amber-400"
				aria-label="Mark {suggestion.bestName} as primary applicant"
			>
				<ArrowLeftRight size={13} class="shrink-0" />
				Mark as Primary
			</button>

			<button
				onclick={handleDismiss}
				class="buttonText inline-flex min-h-[36px] cursor-pointer items-center rounded-lg px-2 py-1.5 text-amber-600 transition-colors
				       hover:bg-amber-100 active:bg-amber-200
				       dark:text-amber-400 dark:hover:bg-amber-900/40"
				aria-label="Dismiss suggestion"
				title="Dismiss"
			>
				<X size={15} />
			</button>
		</div>
	</div>
{/if}
