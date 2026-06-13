<script>
	let { colSpan = 1, colSpanDesc = 2, gridColDesc = 2, journey = {} } = $props();

	import Button from './Button.svelte';
	import PremiumButton from './PremiumButton.svelte';
</script>

<section class="border-b border-[var(--form-border)] py-[4rem]">
	<div class="grid gap-[2rem] lg:grid-cols-3">
		<h2 class="col-span-3 lg:col-span-{colSpan} typography-h2-md text-[var(--form-text)]">
			{journey.heading}
		</h2>
		<div class="col-span-{colSpanDesc} grid grid-cols-{gridColDesc} gap-[2rem]">
			{#each journey.items as step, index (step)}
				<div
					class="col-span-2 grid gap-[2rem] pb-[3rem] md:col-span-1 md:pb-0 {index <
					journey.items.length - 1
						? 'border-[var(--form-border)] border-b md:border-r md:border-b-0'
						: ''}"
				>
					<div class="flex flex-col gap-4">
						<p class="typography-body-lg !font-semibold text-[var(--form-text)]">{step.title}</p>
						<p class="typography-body-md text-[var(--form-text-secondary)]">{@html step.desc}</p>
					</div>

					{#if step.btnName}
						<Button
							btnName={step.btnName}
							btnBorder={step.btnBorder}
							btnClass={step.btnClass}
							link={step.btnLink}
						/>
					{/if}

					{#if step.premiumBtnName}
						<PremiumButton
							premiumBtnName={step.premiumBtnName}
							premiumBtnLink={step.premiumBtnLink}
							premiumBtnClass={step.premiumBtnClass}
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
