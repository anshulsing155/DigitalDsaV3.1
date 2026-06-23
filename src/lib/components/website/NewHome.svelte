<script>
	let { steps = {}, isBorder = false, paddingClass = 'lg:px-16' } = $props();

	import Button from './Button.svelte';
</script>

<section
	class="px-[0.5rem] py-[4rem] text-[var(--form-text)] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] {isBorder
		? 'border-b border-[var(--form-border)]'
		: ''}"
>
	<div class="grid grid-cols-3 gap-[2rem] {paddingClass}">
		<div class="col-span-3 lg:col-span-1">
			{#if steps.heading}
				<p class="typography-h2-md text-[var(--form-text)]">{steps.heading}</p>
			{/if}

			{#if steps.paraGraph}
				<p class="typography-body-md mt-4 text-[var(--form-text-secondary)]">{steps.paraGraph}</p>
			{/if}
		</div>
		<div class="col-span-3 grid grid-cols-2 gap-[4rem] lg:col-span-2">
			{#each steps.data as step}
				<div class="col-span-2 grid gap-[2rem] md:col-span-1 border-b last:border-b-0 border-[var(--form-border)] lg:border-b-0 pb-[4rem] last:pb-0 lg:pb-0">
					{#if step.icon}
						<img src={step.icon} alt={step.altTitle} class="h-10" />
					{/if}
					<div class="flex flex-col gap-4">
						<p class="typography-body-lg !font-semibold text-[var(--form-text)]">{step.title}</p>

						<p class="typography-body-md text-[var(--form-text-secondary)]">{@html step.desc}</p>
					</div>
					{#if step.btnText}
						<div>
							<Button
								btnName={step.btnText}
								btnClass={step.btnClass}
								link={step.btnLink}
								onClick={() => (window.location.href = step.btnLink)}
							/>
						</div>
					{/if}

					{#if step.link}
						<a
							href={step.url}
							class:text-linkColor={step.url !== ''}
							class:text-deActiveLinkColor={step.url == ''}
							class="typography-body-md text-linkColor underline hover:no-underline">{step.link}</a
						>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
