<script lang="ts">
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import { fade, fly } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import Seo from '$lib/components/website/Seo.svelte';
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import AboveTitleWithTopIconCard from '$lib/components/website/AboveTitleWithTopIconCard.svelte';
	import AboveTitleWithoutIconCard from '$lib/components/website/AboveTitleWithoutIconCard.svelte';
	import ButtonBanner from '$lib/components/website/ButtonBanner.svelte';
	import AboveTitleWithBlackCard from '$lib/components/website/AboveTitleWithBlackCard.svelte';
	import FeedbackCheck from '$lib/components/website/FeedbackCheck.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import content from '$lib/data/website/businessLoan.json';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';

	// Icon mapping for cleaner rendering
	const iconMap: Record<string, string> = {
		cash: '💰',
		bank: '🏦',
		receipt: '📄',
		chart: '📈'
	};

	// State for toggling visibility
	let visible = $state(true);
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="content">
	<NewPageLayout pageData={content.pageData}>
		<Sublist subList={content.subList} />
		<div class="lg:px-16">
			<div id="uses" data-section="uses" class="section">
				<AboveTitleWithTopIconCard contents={content.uses} paddingClass="lg:px-0" isBorder />
			</div>

			<div id="business" data-section="business" class="section">
				<AboveTitleWithoutIconCard contents={content.loans} paddingClass="lg:px-0" isBorder />
			</div>

			<section id="factors" class="border-b border-[var(--form-border)] px-[0.5rem] pt-16 pb-32">
				<div class="mx-auto mb-16 max-w-3xl text-center">
					<h2 class="typography-h2-md mb-4 text-[var(--form-text)]">
						{content.loanFactorsSection.heading}
					</h2>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						{content.loanFactorsSection.subHeading}
					</p>
				</div>

				{#if visible}
					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4" in:fade={{ duration: 300 }}>
						{#each content.loanFactorsSection.factors as factor, i}
							<div
								class="transition-all duration-300 ease-in-out hover:-translate-y-1 space-y-4 rounded-md border border-[var(--form-border)] p-2 lg:p-4"
								in:fly={{
									y: 50,
									duration: 800,
									delay: i * 150,
									easing: elasticOut
								}}
								out:fade={{ duration: 300 }}
							>
								<span class="typography-h2-md mx-auto flex h-4 w-4 items-center justify-center">
									{iconMap[factor.icon]}
								</span>

								<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
									{factor.title}
								</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{factor.description}
								</p>

								<div class="bg-[var(--ddsa-gray-50)] p-2 dark:bg-[var(--ddsa-gray-700)]">
									<p class="typography-body-sm text-[var(--form-text-secondary)]">
										<span class="font-semibold text-primary">Important:</span>
										{factor.importance}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="mt-12 rounded-md bg-[var(--ddsa-gray-50)] p-2 dark:bg-[var(--ddsa-gray-700)]">
					<div class="flex flex-col items-center md:flex-row">
						<div class="mr-4">
							<span class="text-2xl">💡</span>
						</div>
						<div>
							<h4 class="typography-body-lg !font-semibold text-[var(--form-text)]">
								{content.loanFactorsSection.tips.heading}
							</h4>
							<p class="typography-body-md text-[var(--form-text-secondary)]">
								{@html content.loanFactorsSection.tips.description}
							</p>
						</div>
					</div>
				</div>
			</section>

			<div id="why" data-section="why" class="section">
				<AboveTitleWithTopIconCard contents={content.whyChooseUs} paddingClass="lg:px-0" isBorder />

				<ButtonBanner contents={content.compareRatesBanner} isBorder />

				<div id="tools">
					<AboveTitleWithBlackCard
						contents={content.businessLoanCalculator}
						paddingClass="lg:px-0"
					/>
				</div>

				<div id="support" class="border-b border-[var(--form-border)]">
					<TwoColumn
						cardImage={content.support.cardImage}
						cardAltName={content.support.cardAltName}
						cardHeading={content.support.cardHeading}
						reverse={content.support.reverse}
					>
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{content.support.para}
						</p>

						<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
					</TwoColumn>
				</div>
			</div>
			<FeedbackCheck paddingClass="lg:px-0" />
		</div>

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList} isBorder />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			/>
		{/snippet}
	</NewPageLayout>
</section>

<!-- <style>
	.card {
		transition: all 0.3s ease;
	}

	.card:hover {
		transform: translateY(-4px);
	}
</style> -->
