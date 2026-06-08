<script lang="ts">
	import { MapPin } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n';
	import type { CaseRouteData } from '$lib/types/wizard';

	interface Props {
		routeData: CaseRouteData;
	}

	let { routeData }: Props = $props();

	// Display-only abbreviation map for the sidebar chip. Owns no canonical state —
	// routeData.loanType flows in unmodified as the canonical scope value, and this
	// map only shortens it for narrow column layout. Not consumed anywhere outside
	// this component. Per CLAUDE.md §16 Rule #15, expand or sunset this map only
	// alongside a scope-value rename in the form schema (single source of truth).
	const LOAN_TYPE_SHORT: Record<string, string> = {
		'New Loan': 'New',
		'Balance Transfer Only': 'BT Only',
		'Balance Transfer With Top-up': 'BT + Top-up',
		'Top-up Only': 'Top-up'
	};

	function loanTypeShort(val: string): string {
		return LOAN_TYPE_SHORT[val] || val;
	}

	// Build rows reactively — only include fields with values
	let rows = $derived.by(() => {
		const r: Array<{ label: string; value: string; accent?: boolean }> = [];

		r.push({ label: 'Loan', value: routeData.loanName, accent: true });

		if (routeData.loanType) {
			r.push({ label: 'Type', value: loanTypeShort(routeData.loanType) });
		}
		if (routeData.propertyArea) {
			r.push({ label: 'Area', value: routeData.propertyArea });
		}
		if (routeData.propertyStage) {
			r.push({ label: 'Stage', value: routeData.propertyStage });
		}
		if (routeData.applicantCount && routeData.applicantCount > 0) {
			r.push({ label: 'Applicants', value: routeData.applicantCount.toString() });
		}
		if (routeData.loanAmount && routeData.loanAmount > 0) {
			r.push({
				label: 'Loan Req.',
				value: formatCurrency(routeData.loanAmount, true),
				accent: true
			});
		}

		return r;
	});
</script>

<div class="route-tracker">
	<div class="route-header">
		<div class="route-badge bg-ddsa-gradient-primary">
			<MapPin class="h-5 w-5 shrink-0" />
		</div>
		<h3 class="text-sectionHeadingText !m-0 text-[#C3C6BB]">Case Route</h3>
	</div>

	<div class="route-rows">
		{#each rows as row (row.label)}
			<div class="route-row alertText">
				<span class="route-label">{row.label}</span>
				<span class="route-value buttonText text-[#C3C6BB]" class:route-accent={row.accent}>{row.value}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.route-tracker {
		padding: 0.875rem 1rem;
	}

	.route-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.route-badge {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		/* background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%); */
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.3);
	}

	.route-rows {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.route-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.route-label {
		color: var(--route-text-muted, var(--form-text-muted));
		white-space: nowrap;
		flex-shrink: 0;
	}

	.route-value {
		text-align: right;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.route-accent {
		color: var(--route-text-accent, var(--ddsa-primary-500));
	}
</style>
