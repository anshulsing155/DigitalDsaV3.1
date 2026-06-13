<script lang="ts">
	import Button from './Button.svelte';

	type ThinkKnow = {
		heading?: string;
		subHeading?: string;
		subPara?: string[];
		paraGraph?: string[];
		bottomHeading?: string;
		bottomList?: string[];
		bottomPara?: string[];
		btnName?: string;
		btnBorder?: string;
		btnColor?: string;
		btnLink?: string;
		linkName?: string;
		url?: string;
	};

	type Props = {
		thinkKnow?: ThinkKnow;
		disc?: string;
		isBorder?: boolean;
		colSpan?: number;
	};

	const { thinkKnow = {}, disc = 'list-disc', isBorder = false, colSpan = 8 }: Props = $props();
</script>

<div class="grid grid-cols-12 gap-8 px-4 py-12 lg:px-0 lg:py-20">
	{#if thinkKnow.heading}
		<div class="col-span-12 lg:col-span-4">
			<h2 class="typography-h2-md text-[var(--form-text)]">
				{@html thinkKnow.heading}
			</h2>
		</div>
	{/if}

	<div
		class={`col-span-12 lg:col-span-${colSpan} typography-body-md [overflow-wrap:anywhere] text-[var(--form-text-secondary)] text-wrap`}
	>
		<div class="grid gap-6">
			{#if thinkKnow.subHeading}
				<h3 class="typography-body-lg font-semibold break-words text-[var(--form-text)]">
					{@html thinkKnow.subHeading}
				</h3>
			{/if}

			{#if thinkKnow.subPara}
				{#each thinkKnow.subPara as para}
					<p class="break-words">
						{@html para}
					</p>
				{/each}
			{/if}

			{#if isBorder}
				<div class="border-t border-[var(--form-border)]"></div>
			{/if}

			{#if thinkKnow.paraGraph}
				<ul class={`grid gap-4 ${disc}`}>
					{#each thinkKnow.paraGraph as para}
						<li class="ml-5 break-words">
							{@html para}
						</li>
					{/each}
				</ul>
			{/if}

			{#if thinkKnow.bottomHeading}
				<h3 class="typography-body-lg font-semibold break-words text-[var(--form-text)]">
					{thinkKnow.bottomHeading}
				</h3>
			{/if}

			{#if thinkKnow.bottomList}
				<ul class="grid list-disc gap-4 break-words">
					{#each thinkKnow.bottomList as para}
						<li class="ml-5 break-words">
							{@html para}
						</li>
					{/each}
				</ul>
			{/if}

			{#if thinkKnow.bottomPara}
				<div class="grid gap-4">
					{#each thinkKnow.bottomPara as para}
						<p class="break-words">{@html para}</p>
					{/each}
				</div>
			{/if}

			{#if thinkKnow.btnName}
				<div class="pt-2">
					<Button
						btnName={thinkKnow.btnName}
						btnClass={thinkKnow.btnColor}
						link={thinkKnow.btnLink}
					/>
				</div>
			{/if}

			{#if thinkKnow.linkName}
				<a
					href={thinkKnow.url}
					class="font-medium underline underline-offset-4 hover:no-underline"
				>
					{thinkKnow.linkName}
				</a>
			{/if}

			<!-- svelte-ignore slot_element_deprecated -->
			<slot name="list" />
		</div>
	</div>
</div>

<style>
	:global(.think-know a) {
		overflow-wrap: anywhere;
		word-break: break-word;
	}
</style>
