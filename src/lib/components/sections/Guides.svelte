<script lang="ts">
	import Button from '../ui/Button.svelte';
	import Anchor from '../ui/Anchor.svelte';
	type Props = {
		guide?: {
			heading?: string;
			para?: string;
			number?: string;
			list?: string[];
			btnName?: string;
			btnClass?: string;
			btnBorder?: boolean;
			btnLink?: string;
			linkText?: string;
			linkUrl?: string;
		};
		paddingClass?: string;
		isBorder?: boolean;
	};
	let { guide = {}, paddingClass = 'px-[0.5rem] lg:px-16', isBorder = false }: Props = $props();
</script>

<section
	class="pt-[4rem] pb-[4rem] lg:pb-[8rem] {isBorder ? 'border-b border-[var(--form-border)]' : ''}"
>
	<div class={`grid gap-4 md:gap-[2rem] lg:grid-cols-7 lg:gap-4 ${paddingClass}`}>
		<div
			class="typography-h2-md justify-self-start text-[var(--form-text)] md:text-start lg:col-span-3"
		>
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
	</div>
</section>
