<script lang="ts">
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import { fade, fly } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import Seo from '$lib/components/Seo.svelte';
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
		<div class="px-[0.5rem] lg:px-16">
			<div id="uses" data-section="uses" class="section">
				<AboveTitleWithTopIconCard contents={content.uses} />
			</div>

			<div id="business" data-section="business" class="section border-b border-[var(--form-border)]">
				<AboveTitleWithoutIconCard contents={content.loans} />
			</div>

			<section id="factors" class="border-b border-[var(--form-border)] pt-16 pb-32">
				<div class="container mx-auto">
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
									class="card flex h-full flex-col p-6"
									in:fly={{
										y: 50,
										duration: 800,
										delay: i * 150,
										easing: elasticOut
									}}
									out:fade={{ duration: 300 }}
								>
									<div class="mb-4">
										<div
											class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--landing-bg-card)]"
											role="img"
											aria-label="{factor.title} icon"
										>
											<span class="text-2xl">{iconMap[factor.icon]}</span>
										</div>
									</div>

									<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
										{factor.title}
									</h3>
									<p class="typography-body-md text-[var(--form-text-secondary)]">
										{factor.description}
									</p>

									<div class="mt-auto">
										<div class="rounded-xl bg-[var(--landing-bg-card)] pt-2">
											<p class="typography-body-sm text-[var(--form-text-secondary)]">
												<span class="font-semibold text-primary">Important:</span>
												{factor.importance}
											</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<div
						class="mt-12 rounded-xl border border-[var(--form-border)] bg-[var(--landing-bg-card)] p-6"
					>
						<div class="flex flex-col items-center md:flex-row">
							<div class="mr-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--landing-bg)]"
									role="img"
									aria-label="Information icon"
								>
									<span class="text-2xl">💡</span>
								</div>
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
				</div>
			</section>

			<div id="why" data-section="why" class="section">
				<AboveTitleWithTopIconCard contents={content.whyChooseUs} />

				<ButtonBanner contents={content.compareRatesBanner} />

				<div id="tools">
					<AboveTitleWithBlackCard contents={content.businessLoanCalculator} />
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

				<FeedbackCheck />
			</div>
		</div>

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			/>
		</div>
	</NewPageLayout>
</section>

<style>
	.card {
		background: var(--landing-bg-card);
		border: 1px solid var(--form-border);
		border-radius: var(--radius-md, 0.75rem);
		box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}

	.card:hover {
		transform: translateY(-4px);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
		border-color: var(--color-primary, #cb997e);
	}
</style>
