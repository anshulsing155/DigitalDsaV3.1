<script lang="ts">
	import type { IncomeAssessmentData } from '$lib/types/policyCapture.js';
	import { createDefaultIncomeAssessment } from '$lib/types/policyCapture.js';
	import IncomeTypeGrid from '../IncomeTypeGrid.svelte';
	import ConditionalRuleEditor from '../ConditionalRuleEditor.svelte';
	import CustomEntryEditor from '../CustomEntryEditor.svelte';

	interface Props {
		data?: IncomeAssessmentData;
		isReadOnly: boolean;
		unknownFields: string[];
		onUpdate: (data: IncomeAssessmentData) => void;
		onUnknownToggle: (field: string, isUnknown: boolean) => void;
	}

	let {
		data,
		isReadOnly,
		unknownFields: _unknownFields,
		onUpdate,
		onUnknownToggle: _onUnknownToggle
	}: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let form = $state<IncomeAssessmentData>(data ?? createDefaultIncomeAssessment());

	function update<K extends keyof IncomeAssessmentData>(key: K, value: IncomeAssessmentData[K]) {
		form = { ...form, [key]: value };
		onUpdate(form);
	}
</script>

<div class="space-y-8">
	<div>
		<h3 class="text-lg font-semibold text-gray-900">Income Assessment</h3>
		<p class="mt-1 text-sm text-gray-500">
			For each income type, specify whether this bank accepts it, the haircut percentage, and any
			required conditions. Click a card to expand details.
		</p>
	</div>

	<!-- Income Type Grid -->
	<IncomeTypeGrid
		assessments={form.assessments}
		{isReadOnly}
		onUpdate={(assessments) => update('assessments', assessments)}
	/>

	<!-- Conditional Rules & Custom Entries -->
	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<ConditionalRuleEditor
			rules={form.conditional_rules}
			label="Conditional Income Rules"
			conditionTypes={[
				{ value: 'employment', label: 'Employment Type' },
				{ value: 'income_level', label: 'Income Level' },
				{ value: 'geography', label: 'Geography' },
				{ value: 'business_vintage', label: 'Business Vintage' },
				{ value: 'itr_status', label: 'ITR Status' },
				{ value: 'custom', label: 'Other / Custom' }
			]}
			{isReadOnly}
			onUpdate={(rules) => update('conditional_rules', rules)}
		/>
	</div>

	<div class="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
		<CustomEntryEditor
			entries={form.custom_entries}
			label="Anything else about Income Assessment?"
			placeholder="e.g., Special income consideration rules, employer categories..."
			{isReadOnly}
			onUpdate={(e) => update('custom_entries', e)}
		/>
	</div>
</div>
