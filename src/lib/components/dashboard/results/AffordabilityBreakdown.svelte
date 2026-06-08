<script lang="ts">
	import type { LenderResult } from '$lib/types/lenderResults';
	import { formatCurrency } from '$lib/i18n';

	interface Props {
		affordability: NonNullable<LenderResult['affordability']>;
		loanName?: string;
	}

	let { affordability, loanName = 'Home Loan' }: Props = $props();

	/** Build an ordered list of available scenarios for rendering */
	const scenarios = $derived.by(() => {
		const list: Array<{
			key: string;
			label: string;
			subtitle: string;
			colorClass: string;
			maxProperty: number;
			homeLoanAmount: number;
			homeLoanEMI: number;
			ltvPercent: number;
			downPaymentRequired: number;
			downPaymentPercent: number;
			/* Bridge-only fields */
			bridgeLoanAmount?: number;
			bridgeLoanEMI?: number;
			totalEMI?: number;
		}> = [];

		if (affordability.eligibility) {
			const e = affordability.eligibility;
			list.push({
				key: 'eligibility',
				label: 'Max Eligibility',
				subtitle: 'If you have sufficient down payment',
				colorClass: 'scenario-blue',
				maxProperty: e.maxPropertyCost,
				homeLoanAmount: e.homeLoanAmount,
				homeLoanEMI: e.homeLoanEMI,
				ltvPercent: e.ltvPercent,
				downPaymentRequired: e.downPaymentRequired,
				downPaymentPercent: e.downPaymentPercent
			});
		}

		if (affordability.dpConstrained) {
			const d = affordability.dpConstrained;
			list.push({
				key: 'dpConstrained',
				label: 'With Your DP',
				subtitle: 'Constrained by available down payment',
				colorClass: 'scenario-amber',
				maxProperty: d.maxPropertyCost,
				homeLoanAmount: d.homeLoanAmount,
				homeLoanEMI: d.homeLoanEMI,
				ltvPercent: d.ltvPercent,
				downPaymentRequired: d.downPaymentRequired,
				downPaymentPercent: d.downPaymentPercent
			});
		}

		if (affordability.bridge) {
			const b = affordability.bridge;
			list.push({
				key: 'bridge',
				label: 'With PL Bridge',
				subtitle: 'Personal loan supplements down payment',
				colorClass: 'scenario-emerald',
				maxProperty: b.maxPropertyCost,
				homeLoanAmount: b.homeLoanAmount,
				homeLoanEMI: b.homeLoanEMI,
				ltvPercent: b.ltvPercent,
				downPaymentRequired: b.downPaymentRequired,
				downPaymentPercent: b.downPaymentPercent,
				bridgeLoanAmount: b.bridgeLoanAmount,
				bridgeLoanEMI: b.bridgeLoanEMI,
				totalEMI: b.totalEMI
			});
		}

		return list;
	});
</script>

{#if scenarios.length > 0}
	<div class="afford-section">
		<div class="afford-header">
			<span class="afford-title">Property Affordability</span>
			<span class="afford-count">{scenarios.length} scenario{scenarios.length > 1 ? 's' : ''}</span>
		</div>

		<div
			class="afford-grid"
			class:afford-grid-2={scenarios.length === 2}
			class:afford-grid-1={scenarios.length === 1}
		>
			{#each scenarios as scenario (scenario.key)}
				<div class="afford-card {scenario.colorClass}">
					<!-- Mode label + subtitle -->
					<div class="afford-card-header">
						<span class="afford-label">{scenario.label}</span>
						<span class="afford-subtitle">{scenario.subtitle}</span>
					</div>

					<!-- Hero: affordable (max projected) property cost — labelled so it's never
					     mistaken for an actual/identified property cost (none exists yet). -->
					<div class="afford-hero-label">Affordable Property Cost</div>
					<div class="afford-hero">{formatCurrency(scenario.maxProperty, true)}</div>

					<!-- Metrics grid -->
					<div class="afford-metrics">
						<div class="afford-metric">
							<span class="afford-metric-label">{loanName}</span>
							<span class="afford-metric-value"
								>{formatCurrency(scenario.homeLoanAmount, true)}</span
							>
						</div>
						<div class="afford-metric">
							<span class="afford-metric-label">HL EMI</span>
							<span class="afford-metric-value">{formatCurrency(scenario.homeLoanEMI, true)}</span>
						</div>
						<div class="afford-metric">
							<span class="afford-metric-label">Down Payment</span>
							<span class="afford-metric-value"
								>{formatCurrency(scenario.downPaymentRequired, true)}</span
							>
						</div>
						<div class="afford-metric">
							<span class="afford-metric-label">LTV</span>
							<span class="afford-metric-value">{scenario.ltvPercent}%</span>
						</div>
					</div>

					<!-- Bridge-specific extras -->
					{#if scenario.bridgeLoanAmount !== undefined}
						<div class="afford-bridge">
							<div class="afford-bridge-row">
								<span class="afford-bridge-label">PL Bridge</span>
								<span class="afford-bridge-value"
									>{formatCurrency(scenario.bridgeLoanAmount, true)}</span
								>
							</div>
							<div class="afford-bridge-row">
								<span class="afford-bridge-label">PL EMI</span>
								<span class="afford-bridge-value"
									>{formatCurrency(scenario.bridgeLoanEMI ?? 0, true)}</span
								>
							</div>
							<div class="afford-bridge-row afford-bridge-total">
								<span class="afford-bridge-label">Total EMI</span>
								<span class="afford-bridge-value"
									>{formatCurrency(scenario.totalEMI ?? 0, true)}</span
								>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* ── Section shell (matches tranche-section pattern) ──── */
	.afford-section {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--dash-border);
	}

	.afford-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.afford-title {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--dash-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.afford-count {
		font-size: 0.5625rem;
		font-weight: 600;
		color: var(--dash-text-muted);
		background: var(--dash-bg-alt);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	/* ── Scenario grid ────────────────────────────────────── */
	.afford-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.afford-grid-2 {
		grid-template-columns: repeat(2, 1fr);
	}

	.afford-grid-1 {
		grid-template-columns: 1fr;
	}

	@media (max-width: 640px) {
		.afford-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Scenario card ────────────────────────────────────── */
	.afford-card {
		padding: 0.625rem;
		background: var(--dash-bg-alt);
		border-radius: 0.375rem;
		border: 1px solid var(--dash-border);
	}

	.afford-card-header {
		margin-bottom: 0.375rem;
	}

	.afford-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.afford-subtitle {
		display: block;
		font-size: 0.5625rem;
		color: var(--dash-text-muted);
		margin-top: 0.0625rem;
	}

	/* Color variants for the label */
	.scenario-blue .afford-label {
		color: #2563eb;
	}
	:global(.dark) .scenario-blue .afford-label {
		color: #60a5fa;
	}

	.scenario-amber .afford-label {
		color: #b45309;
	}
	:global(.dark) .scenario-amber .afford-label {
		color: #fbbf24;
	}

	.scenario-emerald .afford-label {
		color: #059669;
	}
	:global(.dark) .scenario-emerald .afford-label {
		color: #34d399;
	}

	/* ── Hero property cost ───────────────────────────────── */
	.afford-hero-label {
		display: block;
		font-size: 0.5625rem;
		font-weight: 600;
		color: var(--dash-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 0.0625rem;
	}

	.afford-hero {
		font-family: var(--font-title);
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--dash-text);
		margin-bottom: 0.375rem;
	}

	/* ── Metrics 2x2 grid ─────────────────────────────────── */
	.afford-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.25rem 0.5rem;
	}

	.afford-metric-label {
		display: block;
		font-size: 0.5625rem;
		color: var(--dash-text-muted);
	}

	.afford-metric-value {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
	}

	/* ── Bridge extras ────────────────────────────────────── */
	.afford-bridge {
		margin-top: 0.375rem;
		padding-top: 0.375rem;
		border-top: 1px dashed var(--dash-border);
	}

	.afford-bridge-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.0625rem 0;
	}

	.afford-bridge-label {
		font-size: 0.5625rem;
		color: var(--dash-text-muted);
	}

	.afford-bridge-value {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
	}

	.afford-bridge-total {
		margin-top: 0.125rem;
		padding-top: 0.125rem;
		border-top: 1px solid var(--dash-border);
	}

	.afford-bridge-total .afford-bridge-label {
		font-weight: 700;
		color: var(--dash-text-secondary);
	}

	.afford-bridge-total .afford-bridge-value {
		font-weight: 700;
		color: var(--dash-text);
	}
</style>
