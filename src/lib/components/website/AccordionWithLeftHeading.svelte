<script lang="ts">
	import { ChevronDown } from '$lib/utils/iconRegistry';

	interface Props {
		contents?: {
			heading?: string;
			para?: string;
			accordions?: { question: string; answer: string }[];
		};
		paddingClass?: string;
	}

	let { contents = {}, paddingClass = 'px-[0.5rem] lg:px-16' }: Props = $props();
</script>

<div
	class="py-[4rem] text-[var(--form-text)] lg:border-b lg:border-[var(--form-border)] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
>
	<div class={`grid gap-[2rem] lg:grid-cols-12 lg:gap-[4rem]  ${paddingClass}`}>
		<!-- Left Column (Heading & Description) -->
		<div class="flex flex-col gap-4 lg:col-span-4">
			{#if contents.heading}
				<p class="typography-h2-md text-[var(--form-text)]">
					{@html contents.heading}
				</p>
			{/if}

			{#if contents.para}
				<p class="typography-body-md text-[var(--form-text-secondary)]">
					{@html contents.para}
				</p>
			{/if}
		</div>

		<!-- Right Column (Accordions - Multiple Q&A) -->
		{#if contents.accordions && contents.accordions.length > 0}
			<div class="flex flex-col gap-[1.5rem] lg:col-span-8">
				{#each contents.accordions as accordion, index}
					<details
						class="group border-b border-[var(--form-border)] py-4 select-none"
						open={index === 0}
					>
						<summary class="flex cursor-pointer items-start justify-between gap-4">
							<h2 class="typography-body-md !font-semibold text-[var(--form-text)]">
								{accordion.question}
							</h2>

							<ChevronDown
								class="h-5 w-5 transition-transform duration-300 group-open:rotate-180"
							/>
						</summary>

						<div class="typography-body-sm grid gap-4 pt-[1rem] text-[var(--form-text-secondary)]">
							<p>{@html accordion.answer}</p>
						</div>
					</details>
				{/each}
			</div>
		{/if}
	</div>
</div>


