<script lang="ts">
	import Anchor from '../ui/Anchor.svelte';
	import Button from '../ui/Button.svelte';
	import { onMount } from 'svelte';
	import TestBreadCrumb from './TestBreadCrumb.svelte';
	import Tooltip from '../ui/Tooltip.svelte';

	interface Props {
		pageData?: any;
		children?: any;
		secondary?: any;
	}

	let {
		pageData = {},
		children,
		secondary
	}: Props = $props();

	let isPageLoaded = $state(false);
	let isBelow1024 = $state(false);

	function updateSize() {
		isBelow1024 = window.innerWidth < 1024;
	}

	onMount(() => {
		isPageLoaded = true;
		updateSize(); // Set initial value
		window.addEventListener('resize', updateSize);

		return () => {
			window.removeEventListener('resize', updateSize); // Cleanup
		};
	});
</script>

<section class="w-full">
	<div id="pageDesign" class="relative mx-auto h-full">
		<div class="relative mx-auto pt-[15rem] sm:pt-[23rem] lg:pt-0 w-full">
			<!-- breadcrumb  -->
			<div class="hidden lg:flex pl-[4rem] py-4">
				<TestBreadCrumb />
			</div>
			{#if pageData.coverImage}
				<div
					id="image"
					class="lg:-right-[5rem] absolute w-full lg:w-[calc(50%+12.5rem)] top-0 z-0 overflow-hidden"
				>
					<div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
						<Tooltip
							linkName={`image source: <span class="underline">${pageData.sourceName}</span>`}
							hoverLink={pageData.originalSource}
						/>
					</div>
					<img
						src={pageData.coverImage}
						alt={pageData.coverAlt || 'page-cover'}
						class="w-full h-full object-cover object-top"
						loading="lazy"
					/>
				</div>
			{/if}
			<!-- side-card  -->
			<div class="mx-2 lg:mx-0">
				<div
					id="sideCard"
					class="relative bg-[var(--landing-bg-card)] px-6 py-[3rem] lg:p-[3rem] 2xl:p-[4rem] w-full lg:w-[50%]"
				>
					<div class="flex flex-col gap-4 sm:gap-[2rem]">
						<h1 class="font-ThirdHead text-title">
							{@html pageData.heading || ''}
						</h1>

						{#if pageData.subHeading}
							<p class="font-ThirdHead text-miniSubHead">
								{@html pageData.subHeading}
							</p>
						{/if}

						{#if pageData.para}
							<p class={`font-SubPara text-subPara ${pageData.paraStyle || ''}`}>
								{@html pageData.para}
							</p>
						{/if}

						{#if pageData.heroList && pageData.heroList.length > 0}
							<ul class="flex flex-col gap-4">
								{#each pageData.heroList as item}
									<li class="grid gap-4 font-Paragraph text-subParaFont">
										{#if typeof item.text === 'object'}
											{#if item.text.subText}
												<span>{@html item.text.subText}</span>
											{/if}

											<ul class="grid list-disc gap-2">
												{#each item.text.points as subItem}
													{#if subItem.tick}
														<li class="flex gap-2 items-center">
															<div>
																<img
																	src="/icons/circle-check.svg"
																	alt="check-icon"
																	class="h-4"
																/>
															</div>
															<p class="text-start">{@html subItem.list}</p>
														</li>
													{:else}
														<li>{subItem.list}</li>
													{/if}
												{/each}
											</ul>
										{:else}
											{@html item.text}
										{/if}
									</li>
								{/each}
							</ul>
						{/if}

						<!-- buttons  -->
						{#if pageData.actionBtn}
							<div
								class="flex flex-col gap-4 font-Paragraph text-subPara sm:flex-row w-[85%] md:w-full mx-auto"
							>
								{#each pageData.actionBtn as btn}
									{#if btn.btnClick}
										<button
											type="button"
											onclick={btn.btnClick}
											class="w-full rounded-full border px-[2rem] py-3 md:w-auto text-black cursor-pointer {btn.animation
												? 'animate-scaleLoop'
												: ''}"
											style={`background-color: ${btn.btnColor || '#ffcc00'}; border-color: #4F4C4D;`}
										>
											{btn.btnName}
										</button>
									{:else if btn.btnLink}
										<a href={btn.btnLink} class="text-black">
											<button
												type="button"
												class="w-full rounded-full border px-[2rem] py-3 md:w-auto cursor-pointer {btn.animation
													? 'animate-scaleLoop'
													: ''}"
												style={`background-color: ${btn.btnColor || '#ffcc00'}; border-color: #4F4C4D;`}
											>
												{btn.btnName}
											</button>
										</a>
									{/if}
								{/each}
							</div>
						{/if}

						<!-- anchor-tag  -->
						{#if pageData.linkName}
							{#each pageData.links as link}
								<Anchor link={link.url} linkName={link.linkName} />
							{/each}
						{/if}
					</div>

					<!-- line-css  -->
					<div
						class="absolute left-0 top-0 h-2 w-full -translate-y-1/2 transform bg-btnBg sm:h-3 lg:top-1/2 lg:h-[13rem] lg:w-4"
					></div>

					<!-- button for below 1024px screen -->
					{#if isBelow1024}
						<div class="flex w-full items-center justify-center md:block pt-[1rem]">
							<div class="flex gap-[1rem] flex-col md:flex-row pt-[1rem] w-[20rem] md:w-auto">
								{#if pageData.actionBtn}
									{#each pageData.actionBtn as btn}
										<Button
											btnName={btn.btnName}
											btnColor={btn.btnColor || '#ffcc00'}
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
		<div class="relative flex flex-col bg-[var(--landing-bg)] border-t border-[var(--form-border)] z-10 mx-2 lg:mx-0">
			{#if children}
				{@render children()}
			{/if}
		</div>
		<!-- px-[2rem] -->
		<div class="lg:p-[4rem]">
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
		#image {
			height: calc(100% + 10%);
		}
	}
	@media (min-width: 2560px) and (max-width: 3860px) {
		#pageDesign {
			width: 2000px;
		}
		#image {
			height: calc(100% + 10%);
		}
		#sideCard {
			min-height: 25rem;
		}
	}
	@media (min-width: 3861px) {
		#pageDesign {
			width: 3000px;
		}
		#image {
			height: calc(100% + 10%);
		}
		#sideCard {
			min-height: 40rem;
		}
	}

	@media (min-width: 1024px) {
		#image {
			height: calc(100% + 180px);
		}
	}

	@media (min-width: 1024px) and (max-width: 1400px) {
		#pageDesign {
			width: 95%; /* Shrinks to 95% of its original size */
		}
	}

	@media (max-width: 1023px) {
		#image {
			height: calc(60%);
		}
	}

	@media (max-width: 640px) {
		#image {
			height: 250px;
		}
	}
</style>
