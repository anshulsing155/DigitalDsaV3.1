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

	const {
		thinkKnow = {},
		disc = 'list-disc',
		isBorder = false,
		colSpan = 8
	}: Props = $props();
</script>

<div
	class="grid grid-cols-12 gap-8 py-12 lg:py-20 px-4 lg:px-0"
>
	{#if thinkKnow.heading}
		<div class="col-span-12 lg:col-span-4">
			<h2
				class="typography-h2"
			>
				{@html thinkKnow.heading}
			</h2>
		</div>
	{/if}

	<div
		class={`col-span-12 lg:col-span-${colSpan} typography-body-md text-[var(--form-text-secondary)]`}
	>
		<div class="grid gap-6">
			{#if thinkKnow.subHeading}
				<h3
					class="text-xl font-semibold text-[#1F1F1F]"
				>
					{@html thinkKnow.subHeading}
				</h3>
			{/if}

			{#if thinkKnow.subPara}
				{#each thinkKnow.subPara as para}
					<p>{@html para}</p>
				{/each}
			{/if}

			{#if isBorder}
				<div class="border-t border-gray-200"></div>
			{/if}

			{#if thinkKnow.paraGraph}
				<ul class={`grid gap-4 ${disc}`}>
					{#each thinkKnow.paraGraph as para}
						<li class="ml-5">
							{@html para}
						</li>
					{/each}
				</ul>
			{/if}

			{#if thinkKnow.bottomHeading}
				<h3
					class="text-2xl font-semibold text-[#1F1F1F]"
				>
					{thinkKnow.bottomHeading}
				</h3>
			{/if}

			{#if thinkKnow.bottomList}
				<ul class="grid gap-4 list-disc">
					{#each thinkKnow.bottomList as para}
						<li class="ml-5">
							{@html para}
						</li>
					{/each}
				</ul>
			{/if}

			{#if thinkKnow.bottomPara}
				<div class="grid gap-4">
					{#each thinkKnow.bottomPara as para}
						<p>{@html para}</p>
					{/each}
				</div>
			{/if}

			{#if thinkKnow.btnName}
				<div class="pt-2">
					<Button
						btnName={thinkKnow.btnName}
						btnBorder={thinkKnow.btnBorder}
						btnColor={thinkKnow.btnColor}
						link={thinkKnow.btnLink}
					/>
				</div>
			{/if}

			{#if thinkKnow.linkName}
				<a
					href={thinkKnow.url}
					class:text-[#d4aa00]={thinkKnow.url !== ''}
					class:text-gray-400={thinkKnow.url === ''}
					class="underline underline-offset-4 hover:no-underline font-medium"
				>
					{thinkKnow.linkName}
				</a>
			{/if}

			<!-- svelte-ignore slot_element_deprecated -->
			<slot name="list" />
		</div>
	</div>
</div>