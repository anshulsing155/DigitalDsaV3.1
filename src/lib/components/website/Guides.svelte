<script>
	import Button from './Button.svelte';
	import Anchor from './Anchor.svelte';
	let { guide = {} } = $props();
</script>

<section
	class="grid gap-4 border-b border-[var(--form-border)] pt-[4rem] pb-[4rem] text-black md:gap-[2rem] lg:grid-cols-7 lg:gap-4 lg:pb-[8rem] dark:text-white"
>
	<div class="typography-h2-md lg:typography-h2 grid font-semibold md:text-start lg:col-span-3">
		{@html guide.heading}
	</div>
	<div class="grid gap-[2rem] lg:col-span-4">
		{#if guide.number}
			<p class="typography-body-md font-semibold text-[var(--form-text-secondary)] lg:col-span-3">
				{@html guide.number}
			</p>
		{/if}

		{#if guide.para}
			<p class="typography-body-md text-[var(--form-text-secondary)]">
				{@html guide.para}
			</p>
		{/if}

		{#if guide.list}
			<ul class="grid gap-4">
				{#each guide.list as item}
					<li class="typography-body-md text-[var(--form-text-secondary)]">{@html item}</li>
				{/each}
			</ul>
		{/if}

		<div>
			{#if guide.btnName}
				<Button
					btnName={guide.btnName}
					btnBorder={guide.btnBorder}
					btnClass={guide.btnClass}
					link={guide.btnLink}
				/>
			{:else if guide.linkText}
				<!-- <a
					href={guide.linkUrl}
					class="text-linkColor underline underline-offset-4 hover:no-underline">{guide.linkText}</a
				> -->
				<Anchor link={guide.linkUrl} linkName={guide.linkText} />
			{/if}
		</div>
	</div>
</section>
