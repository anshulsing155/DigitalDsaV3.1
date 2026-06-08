<script lang="ts">
	import { dialogState } from '$lib/state/dialog.svelte';
	import NewSelect from './ApplicantSelect.svelte';
	import BooleanSelect from './BooleanSelect.svelte';
	import RadioIcon from './RadioIcon.svelte';
	import RendererInputField from './RendererInputField.svelte';
	import DirectorCountPicker from './DirectorCountPicker.svelte';
	import { getMinDirectors } from '$lib/utils/directorFormUtils';
	import { Lock } from '$lib/utils/iconRegistry';

	/** Question configuration for the renderer */
	interface RendererQuestion {
		key: string;
		type: 'text' | 'number' | 'radio' | 'select' | 'booleanSelect' | 'directorCountPicker';
		question?: string;
		inputRestriction?: string;
		maxlength?: number;
		maxLengthErrorMessage?: string;
		styleClass?: string;
		icon?: string;
		placeholder?: string;
		options?: Array<{ label: string; value: string | number | boolean }>;
		required?: boolean;
	}

	/** Applicant data with dynamic fields */
	type ApplicantData = Record<string, unknown>;

	/** Application data store */
	type ApplicationDataStore = Record<string, unknown>;

	/** Errors indexed by applicant index, then by field key */
	type ApplicantErrorsMap = Record<number, Record<string, string>>;

	interface Props {
		isTouched?: boolean;
		q: RendererQuestion;
		applicant: ApplicantData;
		index: number;
		applicationData: ApplicationDataStore;
		applicantErrors: ApplicantErrorsMap;
		onValidate: (applicant: ApplicantData, index: number, key: string) => string | null | undefined;
		onFieldChange: (index: number, key: string, value: string | number | boolean) => void;
		onFieldBlur?: (index: number, key: string, value: string | number | boolean) => void;
		showValidationErrors?: boolean;
		disabled?: boolean;
		lockedLabel?: string;
	}

	let {
		isTouched = false,
		q,
		applicant,
		index,
		applicationData,
		applicantErrors,
		onValidate,
		onFieldChange,
		onFieldBlur,
		showValidationErrors = false,
		disabled = false,
		lockedLabel = ''
	}: Props = $props();

	function triggerFEMA() {
		// Reset registrationCountry → India on BOTH paths (confirm + dismiss).
		// Pre-S104 only the confirm path reset the value; dismissing via Escape
		// or backdrop click left "Foreign" silently saved in formState even
		// though the user explicitly couldn't choose it. The dialog is
		// effectively a "you cannot proceed with this value" notice, so any
		// way the user closes it should revert the offending selection.
		const resetToIndia = () => {
			onFieldChange(index, 'registrationCountry', 'India');
		};
		dialogState.openConfirmModal(
			'FEMA Notice',
			'As per FEMA regulations, companies registered outside India cannot purchase residential property in India. Please select Individual (NRI/OCI) if the purchase is personal.',
			resetToIndia,
			{ confirmLabel: 'I understand', cancelLabel: null, onCancel: resetToIndia }
		);
	}
</script>

{#if disabled}
	<div class={q.styleClass ?? ''}>
		<span class="text-labelText font-titleMedium !m-0 text-[var(--form-text-label)]">
			{q.question} <span class="ml-1 tinyText font-titleMedium text-amber-600">locked</span>
		</span>
		<div
			class="flex items-center gap-2 rounded-lg px-3 py-2.5 descriptionText mt-1 cursor-not-allowed bg-[var(--form-bg-disabled)] text-[var(--form-text-muted)] border border-[var(--form-border)]"
		>
			<Lock class="text-amber-600 w-4 h-4" />
			{lockedLabel ||
				(q.options?.find((o) => o.value === applicant[q.key])?.label ?? applicant[q.key] ?? '')}
		</div>
	</div>
{:else if q.type === 'text' || q.type === 'number'}
	<RendererInputField
		id={`${q.key}-${index}`}
		label={q.question}
		value={applicant[q.key] as string | number | undefined}
		inputRestriction={q.inputRestriction as any}
		maxlength={q.maxlength}
		containerClass={q.styleClass}
		{isTouched}
		maxLengthErrorMessage={q.maxLengthErrorMessage}
		{showValidationErrors}
		type={q.type}
		icon={q.icon}
		placeholder={q.placeholder}
		validateOnInput={true}
		onInput={(val: string | number) => {
			onFieldChange(index, q.key, val);
		}}
		onBlur={(val: string | number) => {
			onValidate({ ...applicant, [q.key]: val }, index, q.key);
			onFieldBlur?.(index, q.key, val);
		}}
		error={applicantErrors[index]?.[q.key] ?? ''}
		required={q.required}
	/>
{:else if q.type === 'radio'}
	<RadioIcon
		questionLabel={q.question}
		name={`${q.key}-${index}`}
		question={{ key: q.key, options: q.options ?? [] } as any}
		containerClass={q.styleClass}
		selected={applicant[q.key] as string}
		error={applicantErrors[index]?.[q.key] ?? ''}
		required={q.required}
		{showValidationErrors}
		onChange={(val: string) => {
			onFieldChange(index, q.key, val);
			// onValidate?.({ ...applicant, [q.key]: val }, index, q.key); //it triggers all the validation chnaging applicant type one to another
		}}
	/>
{:else if q.type === 'select'}
	<NewSelect
		id={`${q.key}-${index}`}
		label={q.question}
		value={(applicant[q.key] ?? '') as string | number}
		options={q.options as any}
		icon={q.icon}
		containerClass={q.styleClass}
		placeholder={q.placeholder}
		selectedIndex={index}
		{showValidationErrors}
		{isTouched}
		onChange={(val: string | number) => {
			onFieldChange(index, q.key, val);
			onValidate?.({ ...applicant, [q.key]: val }, index, q.key);

			// Trigger validation on employmentType when NRI status changes
			if (q.key === 'isNRI') {
				setTimeout(() => {
					onValidate?.({ ...applicant, [q.key]: val }, index, 'employmentType');
				}, 50);
			}

			if (
				q.key === 'registrationCountry' &&
				applicant.applicantType === 'Company' &&
				String(val) !== 'India'
			) {
				triggerFEMA();
			}
		}}
		error={applicantErrors[index]?.[q.key] ?? ''}
		required={q.required}
	/>
{:else if q.type === 'booleanSelect'}
	<BooleanSelect
		id={`${q.key}-${index}`}
		label={q.question}
		value={applicant[q.key] as boolean | null | undefined}
		options={q.options as any}
		icon={q.icon}
		containerClass={q.styleClass}
		placeholder={q.placeholder}
		selectedIndex={index}
		{isTouched}
		{showValidationErrors}
		onChange={(val: boolean) => {
			onFieldChange(index, q.key, val);
			onValidate?.({ ...applicant, [q.key]: val }, index, q.key);
		}}
		error={applicantErrors[index]?.[q.key] ?? ''}
		required={q.required}
	/>
{:else if q.type === 'directorCountPicker'}
	<DirectorCountPicker
		id={`${q.key}-${index}`}
		value={applicant[q.key] as string | number | undefined}
		label={q.question}
		isOPC={applicant['companyType'] === 'One Person Company (OPC)'}
		minCount={getMinDirectors(String(applicant['companyType'] ?? ''))}
		containerClass={q.styleClass}
		{isTouched}
		{showValidationErrors}
		required={q.required}
		error={applicantErrors[index]?.[q.key] ?? ''}
		onChange={(val: string) => {
			onFieldChange(index, q.key, val);
			onValidate?.({ ...applicant, [q.key]: val }, index, q.key);
		}}
	/>
{/if}
