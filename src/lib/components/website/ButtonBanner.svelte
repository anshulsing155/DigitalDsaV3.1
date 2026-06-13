<script lang="ts">
	import Button from './Button.svelte';

	type Props = {
		contents?: any;
	};

	const { contents = {} }: Props = $props();
</script>

<section class="w-full border-b border-[var(--form-border)] px-6 py-12 lg:px-16">
	{#if !contents.para}
		<div
			class="flex w-full flex-col items-center justify-center gap-8 md:gap-16 lg:w-auto lg:flex-row"
		>
			<h2 class="typography-h2-md text-[var(--form-text)]">
				{@html contents.heading}
			</h2>

			<div class="w-full flex justify-center md:w-auto lg:col-span-4 lg:justify-self-start">
				<Button
					btnName={contents.btnName}
					link={contents.btnLink}
					btnClass={contents.btnClass}
					onClick={contents.btnClick}
				/>
			</div>
		</div>
	{:else}
		<div class="flex w-full flex-col items-center justify-center gap-8 md:gap-16 lg:w-auto">
			<h2 class="typography-h2-md text-[var(--form-text)]">
				{@html contents.heading}
			</h2>

			<div class="grid gap-12 lg:grid-cols-12">
				<div class="lg:col-span-8">
					<p class="text-center lg:w-8/12 lg:justify-self-end typography-body-md text-[var(--form-text-secondary)]">
						{@html contents.para}
					</p>
				</div>

				<div class="w-full justify-self-center md:w-auto lg:col-span-4 lg:justify-self-start">
					<Button
						btnName={contents.btnName}
						link={contents.btnLink}
						btnClass={contents.btnClass}
						onClick={contents.btnClick}
					/>
				</div>
			</div>
		</div>
	{/if}
</section>
