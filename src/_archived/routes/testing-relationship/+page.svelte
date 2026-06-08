<script lang="ts">
	import RelationshipCapture from '$lib/components/relationship-capture/RelationshipCapture.svelte';
	import type { Relationship } from '$lib/components/relationship-capture/types';
	import { formState } from '$lib/state/form.svelte';
	import type { LegacyApplicant } from '$lib/stores/loanData';
	import { v4 as uuidv4 } from 'uuid';

	let isNextEnabled = $state(false);

	function handleComplete(relationships: Relationship[]) {}

	// Helper to determine role from onLoan/onProperty flags
	function getRole(
		onLoan: boolean,
		onProperty: boolean
	): 'both' | 'repayment_only' | 'property_only' {
		if (onLoan && onProperty) return 'both';
		if (onLoan) return 'repayment_only';
		return 'property_only';
	}

	const testApplicants: LegacyApplicant[] = [
		{
			id: uuidv4(),
			fullName: 'Babban Kumar',
			age: '75',
			gender: 'male',
			maritalStatus: 'married',
			onEMI: true,
			onProperty: true
		},
		{
			id: uuidv4(),
			fullName: 'Banita Kumari',
			age: '70',
			gender: 'female',
			maritalStatus: 'married',
			onEMI: true,
			onProperty: true
		},
		{
			id: uuidv4(),
			fullName: 'Rajesh Kumar',
			age: '45',
			gender: 'male',
			maritalStatus: 'married',
			onEMI: true,
			onProperty: true
		},
		{
			id: uuidv4(),
			fullName: 'Priya Kumar',
			age: '42',
			gender: 'female',
			maritalStatus: 'married',
			onEMI: true,
			onProperty: true
		},
		{
			id: uuidv4(),
			fullName: 'Arjun Kumar',
			age: '22',
			gender: 'male',
			maritalStatus: 'single',
			onEMI: true,
			onProperty: false
		},
		{
			id: uuidv4(),
			fullName: 'Sneha Sharma',
			age: '20',
			gender: 'female',
			maritalStatus: 'single',
			onEMI: false,
			onProperty: true
		}
	];

	formState.replaceApplicants(testApplicants as any);

	// Transform LegacyApplicant to RelationshipCapture Applicant format
	let transformedApplicants = $derived(
		(formState.applicants as LegacyApplicant[]).map((a) => ({
			id: a.id || uuidv4(),
			name: a.fullName || '',
			age: typeof a.age === 'string' ? parseInt(a.age, 10) : 0,
			gender: (a.gender || 'male') as 'male' | 'female',
			maritalStatus: (a.maritalStatus || 'single') as 'single' | 'married' | 'divorced' | 'widowed',
			role: getRole(a.onEMI ?? true, a.onProperty ?? true)
		}))
	);
</script>

<RelationshipCapture
	applicants={transformedApplicants}
	bind:isNextEnabled
	onComplete={handleComplete}
/>
