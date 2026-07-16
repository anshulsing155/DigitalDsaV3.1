<script lang="ts">
	interface Props {
		heading: string;
		topPara: string;
		para: string;
		className?: string;
	}

	let { heading, topPara, para, className = '' }: Props = $props();
</script>

<div
	class={`flex h-full min-h-[320px] flex-col overflow-hidden rounded-lg border border-[var(--form-border)] shadow-[10px_10px_10px_rgba(0,0,0,0.15)] ${className}`}
>
	<!-- Content -->
	<div class="flex-1 p-4">
		<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
			{@html heading}
		</h2>

		<p class="typography-body-md text-[var(--form-text-secondary)] mt-4">
			{@html topPara}
		</p>
	</div>

	<!-- Fixed Footer -->
	<div class="bg-ddsa-gradient-primary mt-auto flex h-24 items-center rounded-b-lg p-4">
		<p class="typography-body-sm text-black">
			{@html para}
		</p>
	</div>
</div>
