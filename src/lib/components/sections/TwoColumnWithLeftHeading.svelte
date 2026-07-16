<script>
	let {
		contents = {},
		children = undefined,
		paddingClass = 'lg:px-16',
		isBorder = false
	} = $props();

	import Anchor from '../ui/Anchor.svelte';
	import Button from '../ui/Button.svelte';
</script>

<section
	class="py-[4rem] px-[0.5rem]  text-[var(--form-text)] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] {isBorder
		? 'border-b border-[var(--form-border)]'
		: ''}"
>
	<div class={`grid items-start gap-[2rem] lg:grid-cols-12 lg:gap-[4rem] ${paddingClass}`}>
		<!-- left-heading  -->
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

		<div class="flex flex-col gap-[3rem] lg:col-span-8">
			{#if contents.secHeading}
				<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
					{@html contents.secHeading}
				</h2>
			{/if}
			{#if contents.secPara}
				<p class="typography-body-md text-[var(--form-text-secondary)]">
					{@html contents.secPara}
				</p>
			{/if}

			{#if contents.btnName}
				<Button
					btnName={contents.btnName}
					link={contents.btnLink}
					btnClass={contents.btnClass}
					onClick={contents.btnClick}
				/>
			{/if}

			{#if contents.linkName}
				<Anchor link={contents.url} linkName={contents.linkName} />
			{/if}

			{#if contents.links}
				<div class="flex flex-col gap-2">
					{#each contents.links as link}
						<ul class="grid list-disc pl-5">
							<li>
								<Anchor link={link.secUrl} linkName={link.secLinkName} />
							</li>
						</ul>
					{/each}
				</div>
			{/if}

			{#if contents.list}
				<div class="space-y-[2rem]">
					{#if contents.listTopPara}
						<div class="">
							<p class="typography-body-md font-bold text-[var(--form-text-secondary)]">
								{@html contents.listTopPara}
							</p>
						</div>
					{/if}

					<ul class="ml-[1rem] list-disc space-y-4">
						{#each contents.list as listItem}
							<li class="typography-body-md text-[var(--form-text-secondary)]">
								<div class="flex flex-col gap-2">
									{#if listItem.heading}
										<span class="typography-body-md !font-semibold text-[var(--form-text)]">
											{@html listItem.heading}
										</span>
									{/if}
									{#if listItem.desc}
										<p class="typography-body-md text-[var(--form-text-secondary)]">
											{@html listItem.desc}
										</p>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
					{#if contents.listSecPara}
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{@html contents.listSecPara}
						</p>
					{/if}

					{#if contents.listUrl}
						<div>
							<Anchor link={contents.listUrl.url} linkName={contents.listUrl.linkName} />
						</div>
					{/if}

					{#if contents.listBtn}
						<div>
							<Button
								btnName={contents.listBtn.btnName}
								link={contents.listBtn.btnLink}
								btnClass={contents.listBtn.btnClass}
								onClick={contents.listBtn.btnClick}
							/>
						</div>
					{/if}
				</div>
			{/if}
			{@render children?.()}
		</div>
	</div>
</section>
