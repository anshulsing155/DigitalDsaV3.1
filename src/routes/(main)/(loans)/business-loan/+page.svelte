<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import { fade, fly } from "svelte/transition";
  import { elasticOut } from "svelte/easing";
  import Sublist from "$lib/components/website/Sublist.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
  import AboveTitleWithBlackCard from "$lib/components/website/AboveTitleWithBlackCard.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import FeedbackCheck from "$lib/components/website/FeedbackCheck.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import content from "$lib/data/website/businessLoan.json";

  // Icon mapping for cleaner rendering
  const iconMap: Record<string, string> = {
    cash: "💰",
    bank: "🏦",
    receipt: "📄",
    chart: "📈",
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
  <NewPageLayout
    pageData={content.pageData}
  >
    <Sublist subList={content.subList} />

    <div id="uses" data-section="uses" class="section">
      <AboveTitleWithTopIconCard contents={content.uses} />
    </div>

    <div id="business" data-section="business" class="section">
      <AboveTitleWithoutIconCard contents={content.loans} />
    </div>

    <section id="factors" class="pt-16 pb-32 px-4 lg:px-16 bg-[var(--landing-bg)] section">
      <div class="container mx-auto px-4">
        <div class="max-w-3xl mx-auto text-center mb-16">
          <h2 class="typography-h2 mb-4 text-[var(--form-text)]">
            {content.loanFactorsSection.heading}
          </h2>
          <p class="typography-body-md text-[var(--form-text-secondary)]">
            {content.loanFactorsSection.subHeading}
          </p>
        </div>

        {#if visible}
          <div
            class="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8"
            in:fade={{ duration: 300 }}
          >
            {#each content.loanFactorsSection.factors as factor, i}
              <div
                class="card p-6 h-full flex flex-col"
                in:fly={{
                  y: 50,
                  duration: 800,
                  delay: i * 150,
                  easing: elasticOut,
                }}
                out:fade={{ duration: 300 }}
              >
                <div class="mb-4">
                  <div
                    class="w-12 h-12 mx-auto bg-[var(--landing-bg-card)] rounded-full flex items-center justify-center"
                    role="img"
                    aria-label="{factor.title} icon"
                  >
                    <span class="text-2xl">{iconMap[factor.icon]}</span>
                  </div>
                </div>

                <h3 class="typography-h3 mb-2 text-[var(--form-text)]">
                  {factor.title}
                </h3>
                <p class="typography-body-md text-[var(--form-text-secondary)] mb-4">{factor.description}</p>

                <div class="mt-auto">
                  <div class="bg-[var(--landing-bg-card)] p-3 rounded-xl">
                    <p class="typography-body-sm text-[var(--form-text)]">
                      <span class="text-btnBg font-semibold">Important:</span>
                      {factor.importance}
                    </p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="mt-12 p-6 bg-[var(--landing-bg-card)] border border-[var(--form-border)] rounded-xl">
          <div class="flex flex-col md:flex-row items-center">
            <div class="mr-4">
              <div
                class="w-12 h-12 bg-[var(--landing-bg)] rounded-full flex items-center justify-center"
                role="img"
                aria-label="Information icon"
              >
                <span class="text-2xl">💡</span>
              </div>
            </div>
            <div>
              <h4 class="typography-h3 mb-2 text-[var(--form-text)]">
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

      <div id="support">
        <TwoColumnWithImage
          contents={{
            cardImage: content.support.cardImage,
            cardAltName: content.support.cardAltName,
            cardHeading: content.support.cardHeading,
            reverse: content.support.reverse,
          }}
        >
          <p class="typography-body-md text-[var(--form-text-secondary)]">
            {content.support.para}
          </p>
          <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
        </TwoColumnWithImage>
      </div>

      <FeedbackCheck />
    </div>

    <div slot="secondary">
      <HelpList
        contents={content.common_components.helpList}
      />
      <ThingsYouShould
        thinkKnow={content.common_components.thinkYouShouldKnow}
        disc="list-decimal"
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
