<script>
	import { page } from '$app/state';
	import TestBreadCrumb from './TestBreadCrumb.svelte';
	import Tooltip from './Tooltip.svelte';

	let { pageData = {}, secondary, children } = $props();

	let shouldShowBreadcrumbs = $derived(
		(() => {
			const pathSegments = page.url.pathname.split('/').filter(Boolean);
			return pathSegments.length > 1; // Show breadcrumbs only if there's more than one segment
		})()
	);
</script>

<section
	class="w-full border border-[var(--landing-glass-border)] bg-[var(--landing-bg)] text-[var(--form-text)]"
>
	<div id="parentDiv" class="relative mx-1 lg:mx-auto">
		{#if shouldShowBreadcrumbs}
			<div class="hidden py-4 pl-[4rem] lg:flex">
				<TestBreadCrumb />
			</div>
		{/if}

		<div class="relative mx-auto">
			<img
				src={pageData.coverImage}
				alt={pageData.coverAlt}
				class="h-[30svh] w-full border-b-[1.5rem] border-primary object-cover object-top md:h-[50svh] lg:h-[70svh]"
			/>
			<div class="bg-opacity-50 absolute top-0 right-0 text-center text-white">
				<Tooltip
					linkName={`image source: <span class="underline underline-offset-4">${pageData.sourceName}</span>`}
					hoverLink={pageData.originalSource}
				/>
			</div>
		</div>

		<div
			id="pageDesign"
			class="relative -top-[3rem] mx-auto w-full md:-top-[5rem] lg:-top-[16rem] lg:px-0"
		>
			<div
				class="relative z-40 mx-auto flex items-center justify-center border border-b border-[var(--landing-glass-border)] bg-[var(--landing-bg)] p-6 text-center text-[var(--form-text)] sm:p-8 lg:w-[80%]"
			>
				<div class="flex flex-col gap-4">
					<h1 class="typography-h1 text-[var(--form-text)]">
						{pageData.heading}
					</h1>
					{#if pageData.para}
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{@html pageData.para}
						</p>
					{/if}
				</div>
			</div>
			<div
				class="right-0 mx-auto h-full border border-[var(--landing-glass-border)] bg-[var(--landing-bg)] text-[var(--form-text)]"
			>
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>

		<div class="relative -top-[3rem] md:-top-[5rem] lg:-top-[13rem] lg:p-[4rem]">
			<!-- svelte-ignore slot_element_deprecated -->
			<!-- <slot name="secondary" /> -->

			
			{#if secondary}
				{@render secondary()}
			{/if}
		</div>
	</div>
</section>

<style>
	@media (min-width: 1024px) and (max-width: 1456px) {
		#pageDesign {
			width: 95%; /* Shrinks to 90% of its original size */
		}
	}
	@media (min-width: 1456px) and (max-width: 2560px) {
		#pageDesign {
			width: 1360px;
		}
		#parentDiv {
			width: 1450px;
		}
	}
	@media (min-width: 2560px) and (max-width: 3860px) {
		#pageDesign {
			width: 2000px;
		}
		#parentDiv {
			width: 2200px;
		}
	}
	@media (min-width: 3861px) {
		#pageDesign {
			width: 3000px;
		}
	}
</style>
