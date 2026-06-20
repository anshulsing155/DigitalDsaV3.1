<script lang="ts">
type Props = {
    facilities?: any;
    gridCol?: number;
    paddingClass?: string;
  };
	let { facilities = {}, gridCol = 3, paddingClass = 'px-[0.5rem] lg:px-16' }: Props = $props();

	import Button from './Button.svelte';
</script>

<section
	class="py-[4rem] text-[var(--form-text)] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
>
	<div class={`grid gap-[2rem] ${paddingClass}`}>
		<div class="space-y-5">
			{#if facilities.heading}
				<h2 class="typography-h2-md text-[var(--form-text)] md:col-span-2">
					{@html facilities.heading}
				</h2>
			{/if}
			{#if facilities.subHeading}
				<p class="typography-body-md !font-semibold text-[var(--form-text-secondary)]">
					{@html facilities.subHeading}
				</p>
			{/if}
		</div>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-{gridCol}">
			{#each facilities.items as facility, index}
				<div class="group col-span-1 my-[4rem] mt-4 flex flex-col items-start gap-4 pr-4">
					{#if facility.icon}
						<div>
							<img
								class="h-10 transition-transform duration-300 group-hover:scale-125"
								src={facility.icon}
								alt={facility.altName}
							/>
						</div>
					{/if}
					{#if facility.title}
						<p class="typography-body-lg !font-semibold text-[var(--form-text)]">
							{facility.title}
						</p>
					{/if}
					{#if facility.desc}
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{@html facility.desc}
						</p>
					{/if}

					{#if facility.linkText}
						<a
							class:text-linkColor={facility.link !== ''}
							class:text-dangerColor={facility.link == ''}
							class="typography-body-md text-linkColor text-[var(--form-text-secondary)] underline underline-offset-4 hover:no-underline"
							href={facility.link}>{facility.linkText}</a
						>
					{/if}

					{#if facility.subitems}
						<ul class="grid list-disc gap-2 pl-5">
							{#each facility.subitems as item}
								{#if item.linkName}
									<li>
										<a
											href={item.url}
											class:text-linkColor={item.url !== ''}
											class:text-dangerColor={item.url == ''}
											class="typography-body-md text-linkColor text-[var(--form-text-secondary)] underline underline-offset-4 hover:no-underline"
											>{item.linkName}</a
										>
									</li>
								{:else}
									<li class="typography-body-sm text-[var(--form-text-secondary)]">
										{@html item.points}
									</li>
								{/if}
							{/each}
						</ul>
					{/if}

					{#if facility.subTick}
						{#each facility.subTick as item}
							<ul class="space-y-4">
								<li class="flex items-start gap-2">
									<svg
										class="h-5 w-5 flex-shrink-0 text-black dark:text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									<span>{item.points}</span>
								</li>
							</ul>
						{/each}
					{/if}
					{#if facility.btnName}
						<Button
							btnBorder={facility.btnBorder}
							btnName={facility.btnName}
							btnColor={facility.btnColor}
							link={facility.link}
						/>
					{/if}
				</div>
				{#if index < facilities.items.length - 1}
					<div class="h-[1px] w-full bg-[var(--form-border)] md:hidden"></div>
				{/if}
			{/each}
		</div>
	</div>
</section>
