<script>
  let { data } = $props();

  import { page } from "$app/state";
  import PageDesign from '$lib/components/layout/PageDesign.svelte';
  import Payments from '$lib/components/features/calculators/Payments.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
  import WeAreHereHelp from '$lib/components/sections/WeAreHereHelp.svelte';
  import content from "$lib/data/website/referAndEarnSlug.json";

  const { seo, help, keyBenefits, dsaAdvantage, thinkKnow } = content;

  let pageData = $derived({
    ...content.pageData,
    heroHeading: `You're referred by ${data.data.name}`
  });
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<div>
  <PageDesign {pageData}>
    <div class="px-[0.5rem] lg:px-[4rem]">
      <div class="py-[4rem] border-y border-[var(--landing-border)]">
        <Payments supportHeading={keyBenefits.supportHeading}>
          <div class="grid md:grid-cols-2 gap-[2rem]">
            <div class="col-span-1 grid gap-4 text-[var(--form-text)]">
              <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                {keyBenefits.referrerHeading}
              </h2>
              <ul class="grid gap-4 list-disc pl-4">
                {#each keyBenefits.referrerPoints as point}
                  <li>{point}</li>
                {/each}
              </ul>
            </div>
            <div class="col-span-1 grid gap-4 text-[var(--form-text)]">
              <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                {keyBenefits.refereeHeading}
              </h2>
              <ul class="grid gap-4 list-disc pl-4">
                {#each keyBenefits.refereePoints as point}
                  <li>{point}</li>
                {/each}
              </ul>
            </div>
          </div>
        </Payments>
      </div>
      <div class="py-[4rem] border-y border-[var(--landing-border)]">
        <Payments
          supportHeading={dsaAdvantage.supportHeading}
          colSpan={dsaAdvantage.colSpan}
          colSpanText={dsaAdvantage.colSpanText}
        >
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem] text-[var(--form-text)]">
            <div class="col-span-1 flex flex-col gap-4">
              <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                {dsaAdvantage.expertiseHeading}
              </h2>
              <ul class="list-disc pl-4 grid gap-4 text-[var(--landing-text-secondary)]">
                {#each dsaAdvantage.expertisePoints as point}
                  <li>{@html point}</li>
                {/each}
              </ul>
            </div>
            <div class="col-span-1 flex flex-col gap-4">
              <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                {dsaAdvantage.convenienceHeading}
              </h2>
              <ul class="list-disc pl-4 grid gap-4 text-[var(--landing-text-secondary)]">
                {#each dsaAdvantage.conveniencePoints as point}
                  <li>{@html point}</li>
                {/each}
              </ul>
            </div>
            <div class="col-span-1 flex flex-col gap-4">
              <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                {dsaAdvantage.valueHeading}
              </h2>
              <ul class="list-disc pl-4 grid gap-4 text-[var(--landing-text-secondary)]">
                {#each dsaAdvantage.valuePoints as point}
                  <li>{@html point}</li>
                {/each}
              </ul>
            </div>
          </div>
        </Payments>
      </div>
    </div>

    <div slot="secondary" class="">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} />
    </div>
  </PageDesign>
</div>
