<script lang="ts">
	import { onMount } from 'svelte';
	import Anchor from './Anchor.svelte';
	import Button from './Button.svelte';
	import TestBreadCrumb from './TestBreadCrumb.svelte';
	import Tooltip from './Tooltip.svelte';
	import HeroImage from './HeroImage.svelte';
	import type { Snippet } from 'svelte';
	
	type Props = {
		pageData?: any;
		actionBtns?: any[];
		secondary?: Snippet;
		children?: Snippet;
	};

	const { pageData = {}, actionBtns = [], secondary, children }: Props = $props();

	let isPageLoaded = $state(false);
	let isBelow1024 = $state(false);

	function updateSize() {
		isBelow1024 = window.innerWidth < 1024;
	}

	onMount(() => {
		isPageLoaded = true;

		updateSize();

		window.addEventListener('resize', updateSize);

		return () => {
			window.removeEventListener('resize', updateSize);
		};
	});
</script>

<section class="w-full bg-[var(--landing-bg)]">
	<div id="pageDesign" class="relative mx-auto h-full">
		<div class="relative mx-auto w-full pt-60 sm:pt-[23rem] lg:pt-0">
			<div class="hidden py-4 pl-16 lg:flex">
				<TestBreadCrumb />
			</div>

			<HeroImage
				coverImage={pageData.coverImage}
				coverAlt={pageData.coverAlt}
				sourceName={pageData.sourceName}
				originalSource={pageData.originalSource}
			/>

			<div class="mx-2 lg:mx-0">
				<div
					id="sideCard"
					class="relative w-full border border-[var(--landing-glass-border)] bg-[var(--landing-bg)] px-2 py-12 lg:w-1/2 lg:p-12 2xl:p-16"
				>
					<div class="flex flex-col gap-4 sm:gap-8">
						<h1 class="typography-h1 text-[var(--form-text)]">
							{@html pageData.heading}
						</h1>

						{#if pageData.subHeading}
							<p class="typography-body-md text-[var(--form-text-secondary)]">
								{@html pageData.subHeading}
							</p>
						{/if}

						{#if pageData.para}
							<p
								class={`typography-body-md text-[var(--form-text-secondary)] ${pageData.paraStyle}`}
							>
								{@html pageData.para}
							</p>
						{/if}

						{#if pageData.heroList?.length}
							<ul class="flex flex-col gap-4">
								{#each pageData.heroList as item}
									<li class="typography-body-md grid gap-4 text-[var(--form-text-secondary)]">
										<!-- keep your existing hero list code -->
									</li>
								{/each}
							</ul>
						{/if}

						{#if pageData?.actionBtn && pageData.hasOwnProperty('actionBtnsRequired')}
							<div class="mx-auto flex w-[85%] flex-col gap-4 sm:flex-row md:w-full">
								{#if pageData.actionBtn?.length}
									{#each pageData.actionBtn as btn}
										<Button
											btnName={btn.btnName}
											btnClass={btn.btnClass}
											link={btn.btnLink}
											onClick={btn.btnClick}
											btnAnimation={btn.animation}
										/>
									{/each}
								{/if}
							</div>
						{/if}

						{#if pageData.linkName}
							{#each pageData.links as link}
								<Anchor link={link.url} linkName={link.linkName} />
							{/each}
						{/if}
					</div>

					<div
						class="bg-ddsa-gradient-primary absolute top-0 left-0 h-2 w-full -translate-y-1/2 sm:h-3 lg:top-1/2 lg:h-[13rem] lg:w-4"
					></div>

					{#if isBelow1024}
						<div class="flex w-full items-center justify-center pt-4 md:block">
							<div class="flex w-80 flex-col gap-4 pt-4 md:w-auto md:flex-row">
								{#if pageData.actionBtns?.length}
									{#each pageData.actionBtns as btn}
										<Button
											btnName={btn.btnName}
											btnClass={btn.btnClass}
											link={btn.btnLink}
											onClick={btn.btnClick}
											btnAnimation={btn.animation}
										/>
									{/each}
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div
			class="relative z-10 mx-2 flex flex-col border border-[var(--form-border)] bg-[var(--landing-bg)] lg:mx-0"
		>
			<!-- svelte-ignore slot_element_deprecated -->
			{#if children}
				{@render children()}
			{/if}
		</div>

		<div class="lg:p-16">
			<!-- svelte-ignore slot_element_deprecated -->
			{#if secondary}
				{@render secondary()}
			{/if}
		</div>
	</div>
</section>

<style>
	@media (min-width: 1401px) and (max-width: 2560px) {
		#pageDesign {
			width: 1360px;
		}
	}

	@media (min-width: 2560px) and (max-width: 3860px) {
		#pageDesign {
			width: 2000px;
		}

		#sideCard {
			min-height: 25rem;
		}
	}

	@media (min-width: 3861px) {
		#pageDesign {
			width: 3000px;
		}

		#sideCard {
			min-height: 40rem;
		}
	}

	@media (min-width: 1024px) and (max-width: 1400px) {
		#pageDesign {
			width: 95%;
		}
	}
</style>
