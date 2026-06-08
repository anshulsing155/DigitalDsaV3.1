<script lang="ts">
	import type {
		DsaWorkflow,
		CustomerInteraction,
		DocumentCollection,
		FilePreparation,
		LenderSubmission,
		TrainingPreference
	} from '$lib/types/dsaOnboardingV2';
	import {
		Waypoints,
		Users,
		FileText,
		ClipboardList,
		Mail,
		Lightbulb,
		AlertCircle
	} from '$lib/utils/iconRegistry';

	interface Props {
		data: DsaWorkflow;
		onUpdate: (data: DsaWorkflow) => void;
		errors?: Record<string, string>;
	}

	let { data, onUpdate, errors = {} }: Props = $props();

	// ── Internal state (one-time snapshot from prop) ────────────
	// svelte-ignore state_referenced_locally
	let customerInteraction = $state<CustomerInteraction>(data.customer_interaction);
	// svelte-ignore state_referenced_locally
	let documentCollection = $state<DocumentCollection>(data.document_collection);
	// svelte-ignore state_referenced_locally
	let filePreparation = $state<FilePreparation>(data.file_preparation);
	// svelte-ignore state_referenced_locally
	let lenderSubmission = $state<LenderSubmission>(data.lender_submission);
	// svelte-ignore state_referenced_locally
	let trainingPreference = $state<TrainingPreference>(data.training_preference);

	// ── Radio group definitions ──────────────────────────────────
	interface RadioOption<T> {
		value: T;
		label: string;
		description: string;
	}

	interface RadioGroup<T> {
		key: string;
		label: string;
		subtitle: string;
		icon: typeof Users;
		iconColor: string;
		iconBg: string;
		options: RadioOption<T>[];
	}

	const radioGroups: RadioGroup<string>[] = [
		{
			key: 'customer_interaction',
			label: 'Customer Interaction',
			subtitle: 'How do you primarily meet and interact with customers?',
			icon: Users,
			iconColor: 'text-blue-600',
			iconBg: 'from-blue-50 to-blue-100',
			options: [
				{
					value: 'in_person',
					label: 'In Person',
					description: 'Face-to-face meetings, office visits, field work'
				},
				{ value: 'remote', label: 'Remote', description: 'Phone calls, video meetings, WhatsApp' },
				{ value: 'both', label: 'Both', description: 'Mix of in-person and remote interactions' }
			]
		},
		{
			key: 'document_collection',
			label: 'Document Collection',
			subtitle: 'How do you collect documents from your customers?',
			icon: FileText,
			iconColor: 'text-emerald-600',
			iconBg: 'from-emerald-50 to-emerald-100',
			options: [
				{
					value: 'physical',
					label: 'Physical',
					description: 'Paper documents, photocopies, in-person handover'
				},
				{
					value: 'digital',
					label: 'Digital',
					description: 'WhatsApp, email, cloud upload, scanned docs'
				},
				{ value: 'both', label: 'Both', description: 'Mix depending on customer and document type' }
			]
		},
		{
			key: 'file_preparation',
			label: 'File Preparation',
			subtitle: 'Who prepares and organizes the loan file before submission?',
			icon: ClipboardList,
			iconColor: 'text-purple-600',
			iconBg: 'from-purple-50 to-purple-100',
			options: [
				{
					value: 'self',
					label: 'Self',
					description: 'You do everything yourself -- from data entry to file packaging'
				},
				{
					value: 'back_office',
					label: 'Back Office',
					description: 'A team or assistant handles file preparation'
				},
				{ value: 'both', label: 'Both', description: 'You do some, back office handles the rest' }
			]
		},
		{
			key: 'lender_submission',
			label: 'Lender Submission',
			subtitle: 'How do you typically submit files to lenders?',
			icon: Mail,
			iconColor: 'text-stone-600',
			iconBg: 'from-stone-50 to-stone-100',
			options: [
				{
					value: 'email',
					label: 'Email',
					description: 'Email files and documents to RM or processing team'
				},
				{
					value: 'physical',
					label: 'Physical',
					description: 'Hand-deliver files to branch or RM office'
				},
				{
					value: 'portal',
					label: 'Portal',
					description: "Upload via lender's online portal or app"
				},
				{ value: 'mixed', label: 'Mixed', description: 'Different methods for different lenders' }
			]
		},
		{
			key: 'training_preference',
			label: 'Training Preference',
			subtitle: 'How would you prefer to learn new features and tools?',
			icon: Lightbulb,
			iconColor: 'text-red-500',
			iconBg: 'from-red-50 to-red-100',
			options: [
				{
					value: 'video',
					label: 'Video Tutorials',
					description: 'Watch short, focused videos at your own pace'
				},
				{
					value: 'live',
					label: 'Live Session',
					description: 'Interactive sessions with a trainer or support team'
				},
				{
					value: 'self_serve',
					label: 'Self-Serve Docs',
					description: 'Read guides and documentation when needed'
				},
				{
					value: 'none',
					label: 'No Training',
					description: "Jump right in -- I'll figure it out myself"
				}
			]
		}
	];

	// ── Get/Set handlers ─────────────────────────────────────────
	function getValue(key: string): string {
		switch (key) {
			case 'customer_interaction':
				return customerInteraction;
			case 'document_collection':
				return documentCollection;
			case 'file_preparation':
				return filePreparation;
			case 'lender_submission':
				return lenderSubmission;
			case 'training_preference':
				return trainingPreference;
			default:
				return '';
		}
	}

	function setValue(key: string, val: string) {
		switch (key) {
			case 'customer_interaction':
				customerInteraction = val as CustomerInteraction;
				break;
			case 'document_collection':
				documentCollection = val as DocumentCollection;
				break;
			case 'file_preparation':
				filePreparation = val as FilePreparation;
				break;
			case 'lender_submission':
				lenderSubmission = val as LenderSubmission;
				break;
			case 'training_preference':
				trainingPreference = val as TrainingPreference;
				break;
		}
		emitUpdate();
	}

	function emitUpdate() {
		onUpdate({
			customer_interaction: customerInteraction,
			document_collection: documentCollection,
			file_preparation: filePreparation,
			lender_submission: lenderSubmission,
			training_preference: trainingPreference
		});
	}

	// Count completed fields
	let completedCount = $derived(
		[
			customerInteraction,
			documentCollection,
			filePreparation,
			lenderSubmission,
			trainingPreference
		].filter(Boolean).length
	);
</script>

<div class="space-y-8">
	<!-- ── Section Header ─────────────────────────────────────── -->
	<div class="flex items-center gap-3 border-b border-[var(--dash-border)] pb-2">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 to-purple-100"
		>
			<Waypoints class="h-5 w-5 text-purple-600 dark:text-purple-400" />
		</div>
		<div>
			<h2 class="text-lg font-bold text-[var(--dash-text)]">Workflow Preferences</h2>
			<p class="text-sm text-[var(--dash-text-secondary)]">
				Tell us how you work day-to-day so we can customize your experience
			</p>
		</div>
	</div>

	<!-- ── Progress Indicator ─────────────────────────────────── -->
	<div
		class="flex items-center gap-3 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-4 py-3"
	>
		<div class="flex gap-1">
			{#each Array(5) as _, i}
				<div
					class="h-1.5 w-8 rounded-full transition-all {i < completedCount
						? 'bg-purple-500'
						: 'bg-[var(--dash-bg-alt)]'}"
				></div>
			{/each}
		</div>
		<span class="text-xs font-medium text-[var(--dash-text-secondary)]"
			>{completedCount} of 5 answered</span
		>
	</div>

	<!-- ── Radio Groups ───────────────────────────────────────── -->
	<div class="space-y-6">
		{#each radioGroups as group}
			{@const currentValue = getValue(group.key)}
			<div
				class="rounded-xl border-2 p-5 transition-colors
				{currentValue
					? 'border-[var(--dash-border-light)] bg-[var(--dash-bg-card)]'
					: 'border-[var(--dash-border)] bg-[var(--dash-bg-alt)]/30'}"
			>
				<!-- Group Header -->
				<div class="mb-4 flex items-center gap-3">
					<div
						class="h-9 w-9 rounded-lg bg-gradient-to-br {group.iconBg} flex flex-shrink-0 items-center justify-center"
					>
						<group.icon class="h-4.5 w-4.5 {group.iconColor}" />
					</div>
					<div>
						<h3 class="text-sm font-semibold text-[var(--dash-text)]">{group.label}</h3>
						<p class="text-xs text-[var(--dash-text-muted)]">{group.subtitle}</p>
					</div>
				</div>

				{#if errors[group.key]}
					<p class="mb-3 flex items-center gap-1 text-xs text-red-500">
						<AlertCircle class="h-3 w-3" />{errors[group.key]}
					</p>
				{/if}

				<!-- Radio Options -->
				<div class="grid grid-cols-1 md:grid-cols-{group.options.length <= 3 ? '3' : '2'} gap-2">
					{#each group.options as option}
						{@const isSelected = currentValue === option.value}
						<button
							type="button"
							class="cursor-pointer rounded-xl border-2 p-3 text-left transition-all
								{isSelected
								? 'border-purple-400 bg-purple-50 shadow-sm dark:bg-purple-950/40'
								: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] hover:border-[var(--dash-border)] hover:shadow-sm'}"
							onclick={() => setValue(group.key, option.value)}
						>
							<div class="flex items-start gap-2.5">
								<!-- Radio indicator -->
								<div
									class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors
									{isSelected ? 'border-purple-500 bg-purple-500' : 'border-[var(--dash-border)]'}"
								>
									{#if isSelected}
										<div class="h-2 w-2 rounded-full bg-white"></div>
									{/if}
								</div>

								<div>
									<p
										class="text-sm font-medium {isSelected
											? 'text-purple-800 dark:text-purple-400'
											: 'text-[var(--dash-text-secondary)]'}"
									>
										{option.label}
									</p>
									<p
										class="mt-0.5 text-xs {isSelected
											? 'text-purple-600 dark:text-purple-400'
											: 'text-[var(--dash-text-muted)]'}"
									>
										{option.description}
									</p>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
