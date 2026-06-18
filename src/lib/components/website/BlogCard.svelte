<script>
	let {
		icon = '',
		altName = '',
		title = '',
		paragraph = '',
		linkColor = '#1175BC',
		underline = true,
		linkName = '',
		link = '',
		hyper = false,
		btnColor = '',
		btnBorder = '',
		btnName = '',
		cardBorder = '',
		sourceName = 'undefined',
    btnClass = '',
		originalSource = '',
		url = '',
		onClick = () => {},
		btnClick = undefined,
		children = undefined
	} = $props();

	function handleOnClick(e) {
		const handler = btnClick || onClick;
		if (handler) handler(e);
	}

	import Tooltip from './Tooltip.svelte';
</script>

<div
	class="group relative flex flex-col gap-2 overflow-hidden {cardBorder
		? 'rounded-xl border border-[var(--form-border)]'
		: ''}"
>
	<div class="relative w-full">
		{#if icon}
			<img
				src={icon}
				alt={altName}
				class="aspect-square h-[15rem] max-h-[25rem] w-full object-cover object-top"
			/>
		{:else}
			<img
				src="images/family.jpg"
				alt={altName}
				class="aspect-square h-[15rem] max-h-[25rem] w-full object-cover object-top"
			/>
		{/if}

		<div class="bg-opacity-50 absolute top-0 right-0 text-center text-white">
			<Tooltip
				linkName={`<span class="underline underline-offset-4">${sourceName}</span>`}
				hoverLink={originalSource}
			/>
		</div>
	</div>
	<div class="flex h-full flex-col items-start justify-between gap-4 {cardBorder ? 'p-4' : ''}">
		<div class="flex flex-col gap-4">
			<h3 class="typography-h2-md text-[var(--form-text)]">{title}</h3>
			<p class="typography-body-md text-[var(--form-text-secondary)]">{paragraph}</p>
		</div>

		{#if linkName}
			<div class="flex h-full w-full items-end justify-start text-start">
				<a
					href={url}
					onclick={handleOnClick}
					class={`typography-body-md block w-full rounded-full hover:no-underline hover:opacity-90 md:w-auto`}
					class:text-linkColor={url !== ''}
					class:text-dangerColor={url == ''}
					class:underline
					class:underline-hover={!underline}
					aria-label={linkName}
				>
					{linkName}
				</a>
			</div>
		{/if}
		{#if btnName}
			<div class="w-full">
				{#if btnColor}
					<button
						type="button"
						onclick={handleOnClick}
						class="typography-button btn w-full text-black md:w-auto {btnClass}"
					>
						<a href={link} class="block w-full">{btnName}</a>
					</button>
				{:else}
					<button
						type="button"
						onclick={handleOnClick}
						class="typography-button btn btn-secondary w-full md:w-auto"
					>
						<a href={link} class="block w-full">{btnName}</a>
					</button>
				{/if}
			</div>
		{/if}
		{#if !btnName}
			<div>
				{@render children?.()}
			</div>
		{/if}
	</div>
</div>

<style>
	.underline-hover:hover {
		text-decoration: underline;
	}
</style>
