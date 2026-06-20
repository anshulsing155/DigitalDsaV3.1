<script lang="ts">
	import Button from './Button.svelte';
	import type { Snippet } from 'svelte';

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
		btnClass?: string;
		btnLink?: string;
		linkName?: string;
		url?: string;
	};

	type Props = {
		thinkKnow?: ThinkKnow;
		disc?: string;
		isBorder?: boolean;
		sectionBorder?: boolean;
		colSpan?: number;
		containerClass?: string;
		list?: Snippet;
	};

	const {
		thinkKnow = {},
		disc = 'list-disc',
		isBorder = false,
		sectionBorder = false,
		colSpan = 8,
		containerClass = 'lg:px-16',
		list
	}: Props = $props();
</script>

<section
	class="w-full {sectionBorder
		? 'border-b border-[var(--form-border)] '
		: 'border-b-0'} bg-[var(--landing-bg)] px-[0.5rem] py-16 pb-[4rem] lg:py-0 lg:pt-16 lg:pb-[8rem] {containerClass}"
>
	<div class="grid gap-4 lg:grid-cols-12 lg:gap-8">
		{#if thinkKnow.heading}
			<div class="col-span-12 lg:col-span-4">
				<h2 class="typography-h2-md text-[var(--form-text)]">
					{@html thinkKnow.heading}
				</h2>
			</div>
		{/if}

		<div class={`col-span-12 text-[var(--form-text-secondary)] lg:col-span-8`}>
			<div class="flex flex-col gap-6">
				{#if thinkKnow.subHeading}
					<h3 class="typography-body-lg font-semibold text-[var(--form-text)]">
						{@html thinkKnow.subHeading}
					</h3>
				{/if}

				{#if thinkKnow.subPara}
					{#each thinkKnow.subPara as para}
						<p class="typography-body-md">
							{@html para}
						</p>
					{/each}
				{/if}

				{#if isBorder}
					<div class="border-t border-[var(--form-border)]"></div>
				{/if}

				{#if thinkKnow.paraGraph}
					<ul class={`list-disc space-y-4 pl-4 ${disc}`}>
						{#each thinkKnow.paraGraph as para}
							<li class="typography-body-md">
								{@html para}
							</li>
						{/each}
					</ul>
				{/if}

				{#if thinkKnow.bottomHeading}
					<h3 class="typography-body-lg font-semibold text-[var(--form-text)]">
						{thinkKnow.bottomHeading}
					</h3>
				{/if}

				{#if thinkKnow.bottomList}
					<ul class="list-disc space-y-4 pl-5">
						{#each thinkKnow.bottomList as para}
							<li class="typography-body-md">
								{@html para}
							</li>
						{/each}
					</ul>
				{/if}

				{#if thinkKnow.bottomPara}
					<div class="flex flex-col gap-4">
						{#each thinkKnow.bottomPara as para}
							<p class="typography-body-md">
								{@html para}
							</p>
						{/each}
					</div>
				{/if}

				{#if thinkKnow.btnName}
					<Button
						btnName={thinkKnow.btnName}
						btnClass={thinkKnow.btnClass}
						link={thinkKnow.btnLink}
					/>
				{/if}

				{#if thinkKnow.linkName}
					<a
						href={thinkKnow.url}
						class="font-medium underline underline-offset-4 hover:no-underline"
					>
						{thinkKnow.linkName}
					</a>
				{/if}

				{#if list}
					{@render list()}
				{/if}
			</div>
		</div>
	</div>
</section>
