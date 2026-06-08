<script lang="ts">
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import { TRIAL_DAYS } from '$lib/config/billing';

	const disclaimers = [
		'DigitalDSA is a B2B SaaS platform for loan professionals. We are not a lender, NBFC, or financial institution.',
		'Lender policy data is updated regularly from official sources but may not always reflect real-time changes. Always verify with your RM before filing.',
		"Match percentages and eligibility indicators are based on policy rules and are indicative only. Actual sanction is at the lender's discretion.",
		'Your data is never shared with third parties, other DSAs, or lenders. You control what you share and with whom.',
		`Every plan starts with a ${TRIAL_DAYS}-day Pro trial — no charge until it ends. Subscription fees thereafter are non-refundable; cancel anytime to stop future charges.`
	];
</script>

<SectionWrapper id="disclaimer" background="alt">
	<div class="disclaimer-container">
		<h3 class="disclaimer-heading">Things You Should Know</h3>
		<div class="disclaimer-list">
			{#each disclaimers as text, i}
				<div class="disclaimer-item">
					<span class="disclaimer-number">{i + 1}</span>
					<p class="disclaimer-text">{text}</p>
				</div>
			{/each}
		</div>
	</div>
</SectionWrapper>

<style>
	.disclaimer-container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.disclaimer-heading {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--landing-text-secondary);
		margin-bottom: 1.5rem;
	}

	.disclaimer-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.disclaimer-item {
		display: flex;
		gap: 0.875rem;
		align-items: flex-start;
	}

	.disclaimer-number {
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		font-size: 0.7rem;
		font-weight: 700;
		background: color-mix(in srgb, var(--landing-accent) 15%, transparent);
		color: var(--landing-accent-accessible);
	}

	.disclaimer-text {
		font-size: 0.8rem;
		line-height: 1.6;
		color: var(--landing-text-muted);
	}
</style>
