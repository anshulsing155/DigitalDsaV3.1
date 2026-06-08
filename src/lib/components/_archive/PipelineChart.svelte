<script lang="ts">
	interface PipelineStage {
		stage: string;
		label: string;
		count: number;
		color: string;
	}

	interface Props {
		stages: PipelineStage[];
		basePath?: string;
	}

	let { stages, basePath = '/dashboard/dsa/cases' }: Props = $props();

	const totalCases = $derived(stages.reduce((sum, s) => sum + s.count, 0));
	const maxCount = $derived(Math.max(...stages.map((s) => s.count), 1));
</script>

<div
	class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-semibold text-[var(--dash-text)]">Case Pipeline</h3>
		<span
			class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
		>
			{totalCases} active
		</span>
	</div>

	{#if totalCases === 0}
		<div class="flex flex-col items-center justify-center py-8 text-center">
			<div class="mb-2 text-3xl opacity-40">--</div>
			<p class="text-sm text-[var(--dash-text-muted)]">No active cases in pipeline</p>
		</div>
	{:else}
		<!-- Desktop: horizontal pipeline -->
		<div class="hidden md:block">
			<div class="flex items-end gap-1.5">
				{#each stages as stage, i}
					{@const barPercent = (stage.count / maxCount) * 100}
					<a
						href="{basePath}?stage={stage.stage}"
						class="group flex flex-1 flex-col items-center gap-1.5 transition-transform hover:scale-105"
						title="{stage.label}: {stage.count} case{stage.count !== 1 ? 's' : ''}"
					>
						<!-- Count label -->
						<span
							class="text-xs font-bold text-[var(--dash-text-secondary)] opacity-0 transition-opacity group-hover:opacity-100 {stage.count >
							0
								? '!opacity-100'
								: ''}"
						>
							{stage.count}
						</span>

						<!-- Bar -->
						<div class="relative w-full overflow-hidden rounded-t-md" style="height: 80px;">
							<div
								class="absolute bottom-0 w-full rounded-t-md transition-all duration-500 ease-out"
								style="height: {Math.max(
									barPercent,
									6
								)}%; background-color: {stage.color}; opacity: {stage.count > 0 ? 1 : 0.2};"
							></div>
						</div>

						<!-- Arrow connector (not on last) -->
						{#if i < stages.length - 1}
							<div
								class="absolute top-1/2 -right-2 hidden text-[var(--dash-text-muted)] lg:block"
							></div>
						{/if}
					</a>
				{/each}
			</div>

			<!-- Stage labels row -->
			<div class="mt-2 flex gap-1.5">
				{#each stages as stage}
					<div class="flex-1 text-center">
						<span class="text-[13px] leading-tight font-medium text-[var(--dash-text-secondary)]"
							>{stage.label}</span
						>
					</div>
				{/each}
			</div>

			<!-- Flow arrows row -->
			<div class="mt-1 flex items-center px-2">
				{#each stages as _, i}
					<div class="flex flex-1 justify-center">
						{#if i < stages.length - 1}
							<svg class="h-3 w-3 text-[var(--dash-text-muted)]" viewBox="0 0 12 12" fill="none">
								<path
									d="M4.5 2.5l3.5 3.5-3.5 3.5"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Mobile: horizontal bars -->
		<div class="space-y-2 md:hidden">
			{#each stages as stage}
				{@const barPercent = totalCases > 0 ? (stage.count / maxCount) * 100 : 0}
				<a
					href="{basePath}?stage={stage.stage}"
					class="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-[var(--dash-hover)]"
				>
					<span class="w-20 text-xs font-medium text-[var(--dash-text-secondary)]"
						>{stage.label}</span
					>
					<div class="relative h-5 flex-1 overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
						<div
							class="h-full rounded-full transition-all duration-500"
							style="width: {Math.max(
								barPercent,
								stage.count > 0 ? 8 : 0
							)}%; background-color: {stage.color};"
						></div>
					</div>
					<span class="w-6 text-right text-xs font-bold text-[var(--dash-text-secondary)]"
						>{stage.count}</span
					>
				</a>
			{/each}
		</div>
	{/if}
</div>
