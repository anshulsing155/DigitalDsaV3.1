<script lang="ts">
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
					<details class="border-b border-[var(--form-border)] py-[1rem]" open={index === 0}>
						<summary class="flex cursor-pointer items-center justify-between gap-4">
							<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
								{accordion.question}
							</h2>
							<div class="icon-container">
								<i class="fa-solid fa-angle-down transition-transform duration-300"></i>
							</div>
						</summary>
						<div class="typography-body-md grid gap-4 pt-[1rem] text-[var(--form-text-secondary)]">
							<p>{@html accordion.answer}</p>
						</div>
					</details>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	details summary {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.icon-container {
		display: flex;
		align-items: center;
	}

	details[open] .icon-container i {
		transform: rotate(180deg);
	}
</style>
