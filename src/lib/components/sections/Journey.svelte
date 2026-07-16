<script lang="ts">
	type Props = {
		journey?: any;
		paddingClass?: string;
		isBorder?: boolean;
	};

	let { journey = {}, paddingClass = 'px-[0.5rem] lg:px-16', isBorder = false }: Props = $props();

	import Button from '../ui/Button.svelte';
	import PremiumButton from './PremiumButton.svelte';
</script>

<section class="py-[4rem] {isBorder ? 'border-b border-[var(--form-border)]' : ''}">
	<div class={`grid gap-[2rem] lg:grid-cols-3 ${paddingClass}`}>
		<!-- Heading -->
		<div>
			<h2 class="typography-h2-md text-[var(--form-text)]">
				{journey.heading}
			</h2>
		</div>

		<!-- Content -->
		<div class="grid gap-[2rem] md:grid-cols-2 lg:col-span-2">
			{#each journey.items as step, index (step)}
				<div
					class="grid gap-[2rem] pb-[3rem] md:pb-0
					{index < journey.items.length - 1
						? 'border-b border-[var(--form-border)] md:border-r md:border-b-0'
						: ''}"
				>
					<div class="flex flex-col gap-4">
						<p class="typography-body-lg !font-semibold text-[var(--form-text)]">
							{step.title}
						</p>

						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{@html step.desc}
						</p>
					</div>

					{#if step.btnName}
						<Button btnName={step.btnName} btnClass={step.btnClass} link={step.btnLink} />
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
