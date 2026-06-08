<script lang="ts">
	import {
		CirclePlus,
		User,
		Building,
		Lock,
		RotateCcw,
		CircleAlert
	} from '$lib/utils/iconRegistry';
	import QuestionRenderer from './QuestionRenderer.svelte';
	import { shouldShow } from '$lib/config/showWhenEngine';

	interface Props {
		editingIndex: number | null;
		formApplicant: Record<string, any>;
		formErrors: Record<string, string>;
		hasTriedToAddApplicant: boolean;
		isRestoredAndModified: boolean;
		restoredChangedKeys?: Set<string>;
		hasDeniedRecoveryMatches?: boolean;
		title: string;
		visibleQuestions: any[];
		applicantIndex: number;
		applicationData: Record<string, any>;
		maxReached: boolean;
		onFieldChange: (index: number, key: string, value: string | number | boolean) => void;
		onFieldBlur: (index: number, key: string, value: string | number | boolean) => void;
		onValidateField: (app: any, idx: number, key: string) => string | null | undefined;
		onSave: () => void;
		onSaveAsNew: () => void;
		onCancelEdit: () => void;
		onCancelNew: () => void;
		onRetriggerRecovery?: () => void;
	}

	let {
		editingIndex,
		formApplicant,
		formErrors,
		hasTriedToAddApplicant,
		isRestoredAndModified,
		restoredChangedKeys = new Set(),
		hasDeniedRecoveryMatches = false,
		title,
		visibleQuestions,
		applicantIndex,
		applicationData,
		maxReached,
		onFieldChange,
		onFieldBlur,
		onValidateField,
		onSave,
		onSaveAsNew,
		onCancelEdit,
		onCancelNew,
		onRetriggerRecovery
	}: Props = $props();

	/** Get human-readable label for a changed key from visible questions */
	function getChangedFieldLabel(key: string): string {
		const q = visibleQuestions.find((vq: any) => vq.key === key || vq.bindsTo === key);
		return q?.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase());
	}

	/** Whether to show the "Check for previous records" link.
	 * ALWAYS visible when user has denied matches and name is 2+ chars.
	 * No additional conditions (editing state, restored state) should hide it. */
	const showRetriggerLink = $derived(
		hasDeniedRecoveryMatches &&
			onRetriggerRecovery != null &&
			(String(formApplicant.fullName || '').trim().length >= 2 ||
				String(formApplicant.companyName || '').trim().length >= 2)
	);

	/** Name field keys — retrigger link appears after these */
	const NAME_KEYS = new Set(['fullName', 'companyName']);
</script>

{#if !maxReached || editingIndex !== null}
	<!-- Fieldset-style card: label sits on the top border -->
	<fieldset
		class="relative mt-3 md:mt-6 rounded-xl px-4 pt-3 pb-4 transition-all
		{editingIndex !== null
			? 'border border-[var(--form-border)] bg-[var(--form-bg-card)]'
			: 'border border-[var(--form-border)] bg-[var(--form-bg-card)]'}"
	>
		<legend
			class="alertText font-titleMedium px-2
			{editingIndex !== null ? 'text-primary' : 'text-[var(--form-text-label)]'}"
		>
			{editingIndex !== null ? `Editing Applicant ${editingIndex + 1}` : 'New Applicant'}
			{#if editingIndex !== null}
				<button
					onclick={onCancelEdit}
					class="tinyText ml-2 cursor-pointer text-[var(--form-text-muted)] underline underline-offset-4 transition-all hover:text-red-500"
				>
					Cancel
				</button>
			{:else if formApplicant.applicantType}
				<button
					onclick={onCancelNew}
					class="tinyText ml-2 cursor-pointer text-[var(--form-text-muted)] underline underline-offset-4 transition-all hover:text-red-500"
				>
					Cancel
				</button>
			{/if}
		</legend>

		<!-- ── Applicant Type Selector ── -->
		{#if editingIndex !== null}
			<!-- EDIT MODE: Locked badge — type cannot be changed -->
			<div class="mb-4 flex items-center gap-3">
				<div
					class="flex items-center gap-2 rounded-lg border border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-100)] px-4 py-2.5"
				>
					{#if formApplicant.applicantType === 'Individual'}
						<User size={18} class="text-primary" />
					{:else}
						<Building size={18} class="text-primary" />
					{/if}
					<span class="font-titleBold text-sm text-primary">{formApplicant.applicantType}</span>
					<Lock size={14} class="ml-1 text-primary/50" />
				</div>
				<span class="smallText text-[var(--form-text-muted)]"
					>Type cannot be changed while editing</span
				>
			</div>
		{:else}
			<!-- ADD MODE: Prominent type selector -->
			<div class="mb-5">
				<p class="text-labelText font-titleMedium !m-0 text-[var(--form-text-label)]">
					Who is applying?
				</p>
				<p class="smallText mb-3 text-[var(--form-text-muted)]">
					Select the applicant type — the details form will appear based on your selection
				</p>
				<div class="grid grid-cols-2 gap-3">
					{#each [{ value: 'Individual', Icon: User, hint: 'Salaried, Self-employed, Pensioner, Sole Proprietor' }, { value: 'Company', Icon: Building, hint: 'Pvt Ltd, Partnership, LLP, OPC, Trust' }] as opt (opt.value)}
						{@const isActive = (formApplicant.applicantType as string) === opt.value}
						<button
							type="button"
							onclick={() => onFieldChange(applicantIndex, 'applicantType', opt.value)}
							class="flex flex-col items-center justify-center gap-1 rounded-lg border border-[var(--form-border)] px-4 py-3 transition-all duration-200
							{isActive
								? 'bg-ddsa-gradient-primary border-transparent'
								: hasTriedToAddApplicant && !formApplicant.applicantType
									? 'border-red-400 bg-red-50 hover:border-primary/50 dark:bg-red-900/20'
									: 'border-gray-300 hover:border-primary/50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}"
						>
							<div class="flex items-center gap-3">
								<opt.Icon
									size={20}
									class={isActive ? 'text-white' : 'text-[var(--form-text-muted)]'}
								/>
								<span
									class="alertText font-titleBold {isActive
										? 'text-white'
										: 'text-[var(--form-text-muted)]'}">{opt.value}</span
								>
							</div>
							<span
								class="text-[10px] {isActive ? 'text-white/90' : 'text-[var(--form-text-muted)]'}"
								>{opt.hint}</span
							>
						</button>
					{/each}
				</div>
				{#if hasTriedToAddApplicant && !formApplicant.applicantType}
					<p class="smallText mt-2 flex items-start gap-1 text-red-600">
						<span>•</span>
						<span>Please select an applicant type to continue</span>
					</p>
				{/if}
			</div>
		{/if}

		<!-- ── Form fields (only visible after type is selected) ── -->
		{#if formApplicant.applicantType}
			<div class="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-6 lg:gap-x-8">
				{#each visibleQuestions as q (q.id || q.key)}
					{@const isChanged = isRestoredAndModified && restoredChangedKeys.has(q.key)}
					{@const isDisabled = q.disabledWhen ? shouldShow(q.disabledWhen, formApplicant) : false}
					<div class="{q.styleClass || 'col-span-1'}{isChanged ? ' restored-changed-field' : ''}">
						<QuestionRenderer
							q={q as any}
							index={applicantIndex}
							applicant={formApplicant}
							{applicationData}
							applicantErrors={{ [applicantIndex]: formErrors }}
							showValidationErrors={hasTriedToAddApplicant}
							isTouched={(formApplicant.touchedFields as Record<string, boolean>)?.[q.key] === true}
							onValidate={(app, idx, key) => onValidateField(app, idx, key)}
							{onFieldChange}
							{onFieldBlur}
							disabled={isDisabled}
						/>
					</div>
					<!-- Retrigger recovery link — always visible when user dismissed matches -->
					{#if NAME_KEYS.has(q.key) && showRetriggerLink}
						<div class="col-span-2 -mt-1">
							<button
								type="button"
								onclick={onRetriggerRecovery}
								class="tinyText flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
							>
								<RotateCcw size={12} />
								Previous records found — click to review
							</button>
						</div>
					{/if}
				{/each}
			</div>

			<!-- Action button — inside fieldset, separated from fields -->
			<div class="mt-6 flex flex-col items-center gap-2 border-t border-[var(--form-border)] pt-4">
				{#if isRestoredAndModified}
					<div class="warning-message !border-l-1">
						<p class="smallText font-titleBold mb-1.5">
							{restoredChangedKeys.size} field{restoredChangedKeys.size > 1 ? 's' : ''} changed{formApplicant.__restoredFrom
								? ' from restored record'
								: ''}:
						</p>
						<div class="flex flex-wrap gap-1.5">
							{#each [...restoredChangedKeys] as key (key)}
								<span
									class="tinyText font-titleBold inline-flex items-center rounded-full bg-amber-200/60 px-2.5 py-0.5 text-amber-800 dark:bg-amber-800/40 dark:text-amber-200"
								>
									{getChangedFieldLabel(key)}
								</span>
							{/each}
						</div>
					</div>
					<p class="font-titleMedium smallText text-center text-[var(--ddsa-warning)]">
						Save as update or as a new applicant?
					</p>
					<div class="flex gap-2">
						<button
							onclick={onSave}
							class="bg-ddsa-gradient-primary buttonText !m-0 cursor-pointer rounded-full px-5 py-2.5 shadow transition-opacity hover:opacity-90"
						>
							{editingIndex !== null ? `Update Applicant ${editingIndex + 1}` : 'Update Existing'}
						</button>
						<button
							onclick={onSaveAsNew}
							class="buttonText flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-[var(--ddsa-primary-500)] px-5 py-2.5 text-primary transition-colors hover:bg-[var(--ddsa-primary-50)]"
						>
							<CirclePlus size="14" />

							Add as New
						</button>
					</div>
					<button
						onclick={onCancelEdit}
						class="smallText cursor-pointer text-[var(--form-text-muted)] underline underline-offset-4 transition-all hover:text-red-500"
					>
						Cancel
					</button>
				{:else}
					<button
						onclick={onSave}
						class="px-6 py-2.5 {editingIndex !== null
							? 'bg-amber-600 hover:bg-amber-700'
							: 'bg-[var(--ddsa-primary-500)] hover:opacity-90'} font-titleBold buttonText flex items-center gap-2 rounded-full text-white shadow transition-all"
					>
						{#if editingIndex !== null}
							Update Applicant {editingIndex + 1}
						{:else}
							<CirclePlus size="16" />
							{title}
						{/if}
					</button>
					{#if editingIndex !== null}
						<button
							onclick={onCancelEdit}
							class="smallText cursor-pointer text-[var(--form-text-muted)] underline underline-offset-4 transition-all hover:text-red-500"
						>
							Cancel
						</button>
					{:else}
						<button
							onclick={onCancelNew}
							class="smallText cursor-pointer text-[var(--form-text-muted)] underline underline-offset-4 transition-all hover:text-red-500"
						>
							Cancel
						</button>
					{/if}
				{/if}
			</div>
		{/if}
	</fieldset>
{:else}
	<!-- Max applicants reached: explain why the Add form is no longer visible -->
	<div class="warning-message mt-6" role="status" aria-live="polite">
		<CircleAlert class="h-5 w-5" />
		<div>
			<p class="font-titleBold smallText">Maximum 8 applicants reached</p>
			<p class="tinyText mt-1">
				To add another applicant, remove one of the existing 8 from the table above.
			</p>
		</div>
	</div>
{/if}

<style>
	/* .applicant-type-selected {
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.3);
	} */

	/* Highlight changed fields with amber pulse ring */
	.restored-changed-field {
		position: relative;
		border-radius: 0.5rem;
		box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.5);
		animation: changed-pulse 2s ease-in-out 3;
	}

	@keyframes changed-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.4);
		}
		50% {
			box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.15);
		}
	}
</style>
