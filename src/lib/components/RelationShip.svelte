<script lang="ts">
	import RelationshipCapture from './relationship-capture/RelationshipCapture.svelte';
	import { userRelationships } from './relationship-capture/relationshipStore';
	import { formState } from '$lib/state/form.svelte';
	import { deriveAllCompanyFamilyControl } from '$lib/utils/familyControlDerivation';
	import { AlertTriangle } from '$lib/utils/iconRegistry';
	import type { FamilyControlResult } from '$lib/types/form';
	import { get } from 'svelte/store';

	interface Props {
		isNextEnabled?: boolean;
	}

	let { isNextEnabled = $bindable(false) }: Props = $props();

	function handleComplete(relationships: any) {}

	let applicantData: any[] = $state([]);

	// ── Family control detection ────────────────────────────────
	let familyControlResults: Map<string, FamilyControlResult> = $state(new Map());

	$effect(() => {
		// Include all Individual applicants (directors are synced as Individual entries
		// by DirectorCards — all directors are co-applicants and already in formState)
		const individuals = formState.applicants.filter(
			(val: any) => val.applicantType === 'Individual'
		);

		// Ensure age is numeric
		const allPersons = individuals;
		applicantData = allPersons.map((a: any) => ({
			...a,
			age:
				typeof a.age === 'number'
					? a.age
					: typeof a.age === 'string' && a.age.trim() !== ''
						? Number(a.age)
						: undefined
		}));

		// Auto-enable next button when single person (no relationships needed)
		if (allPersons.length <= 1) {
			isNextEnabled = true;
		}
	});

	// Compute family control detection reactively when relationships change
	$effect(() => {
		const rels = $userRelationships;
		const hasCompanies = formState.applicants.some((a: any) => a.applicantType === 'Company');
		if (!hasCompanies || rels.length === 0) {
			familyControlResults = new Map();
			return;
		}
		familyControlResults = deriveAllCompanyFamilyControl(formState.applicants as any[], rels);
	});

	// Derived: companies with family control detected
	const familyControlledCompanies = $derived(
		[...familyControlResults.entries()]
			.filter(([_, result]) => result.familyControlled)
			.map(([companyId, result]) => {
				const company = formState.applicants.find((a: any) => a.id === companyId);
				return {
					companyName: (company?.companyName as string) || 'Company',
					...result
				};
			})
	);
</script>

<div>
	{#if applicantData.length > 1}
		<RelationshipCapture
			applicants={applicantData}
			onComplete={handleComplete}
			bind:isNextEnabled
		/>

		<!-- Family Control Detection Banner -->
		{#if familyControlledCompanies.length > 0}
			<div class="mt-6 space-y-3">
				{#each familyControlledCompanies as fc (fc.companyName)}
					<div class="warning-message">
						<AlertTriangle size="20" class="mt-0.5 shrink-0" />
						<div>
							<p class="font-titleBold alertText">Family-controlled entity detected</p>
							<p class="alertText mt-1">
								{fc.familyClusterSize} of {fc.totalDirectors}
								directors/partners of
								<strong>{fc.companyName}</strong>
								are related (combined stake: {fc.familyStakePercent}%). Lenders will treat this as a
								family-run business.
							</p>
							{#if fc.familyDominance === 'HIGH'}
								<p class="tinyText mt-1">Dominance: HIGH — Family members hold majority control</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="single-applicant-message">
			<p>Relationship mapping is not required for single applicant.</p>
		</div>
	{/if}
</div>

<style>
	.single-applicant-message {
		text-align: center;
		padding: 3rem 1.5rem;
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 12px;
	}

	.single-applicant-message p {
		font-family: var(--font-paragraph);
		font-size: 14px;
		color: var(--form-text-muted);
		margin: 0;
	}
</style>
