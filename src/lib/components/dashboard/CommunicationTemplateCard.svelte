<script lang="ts">
	interface Props {
		template: {
			template_id: string;
			name: string;
			body: string;
			channel: string;
			category: string;
		};
		isSelected: boolean;
		onSelect: () => void;
	}

	let { template, isSelected, onSelect }: Props = $props();

	const bodyPreview = $derived(
		template.body.length > 80 ? template.body.slice(0, 80).trim() + '...' : template.body
	);

	const channelConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
		whatsapp: {
			label: 'WhatsApp',
			bgClass: 'bg-[var(--dash-btn-ghost-bg)]',
			textClass: 'text-[var(--dash-accent-text)]'
		},
		email: {
			label: 'Email',
			bgClass: 'bg-[var(--dash-bg-alt)]',
			textClass: 'text-[var(--dash-text)]'
		},
		sms: {
			label: 'SMS',
			bgClass: 'bg-gray-100 dark:bg-gray-800',
			textClass: 'text-gray-600 dark:text-gray-400'
		}
	};

	const categoryLabels: Record<string, string> = {
		customer: 'Customer',
		rm: 'RM',
		source: 'Source'
	};

	const channel = $derived(channelConfig[template.channel] || channelConfig.sms);
</script>

<button
	type="button"
	onclick={onSelect}
	class="template-card group relative flex w-full flex-col rounded-xl border bg-[var(--dash-bg-card)] p-4 text-left shadow-sm transition-all hover:shadow-md
		{isSelected
		? 'border-[var(--ddsa-accent-500)] ring-2 ring-[var(--ddsa-accent-500)]/20'
		: 'border-[var(--dash-border-light)] hover:border-[var(--ddsa-accent-500)]/30'}"
>
	<!-- Selected checkmark -->
	{#if isSelected}
		<div
			class="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ddsa-accent-500)] shadow-sm"
		>
			<svg
				class="h-3.5 w-3.5 text-white"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="3"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
			</svg>
		</div>
	{/if}

	<!-- Template name -->
	<h3
		class="mb-1.5 text-sm font-bold text-[var(--dash-text)] transition-colors group-hover:text-[var(--ddsa-accent-500)]"
	>
		{template.name}
	</h3>

	<!-- Body preview -->
	<p class="mb-3 flex-1 text-xs leading-relaxed text-[var(--dash-text-secondary)]">
		{bodyPreview}
	</p>

	<!-- Badges row -->
	<div class="flex items-center gap-2">
		<!-- Channel badge -->
		<span
			class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-semibold {channel.bgClass} {channel.textClass}"
		>
			{#if template.channel === 'whatsapp'}
				<svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
					/>
				</svg>
			{:else if template.channel === 'email'}
				<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
					/>
				</svg>
			{:else}
				<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
					/>
				</svg>
			{/if}
			{channel.label}
		</span>

		<!-- Category badge -->
		<span
			class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-[13px] font-medium text-[var(--dash-accent-text)]"
		>
			{categoryLabels[template.category] || template.category}
		</span>
	</div>
</button>

<style>
	.template-card {
		min-height: 2.75rem;
	}

	@media (max-width: 768px) {
		.template-card {
			padding: 0.875rem;
		}
	}
</style>
