<script>
	let {
		blogData,
		budgetBlogs
	} = $props();

  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import content from "$lib/data/website/budget101.json";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import Button from "$lib/components/website/Button.svelte";

  const {
    seo,
    pageData,
    whyMatters,
    benefits,
    steps,
    actions,
    finalThoughts,
    messageUs,
    helpList,
    thingsYouShouldKnow
  } = content;
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section>
  <NewPageLayout {pageData}>
    <div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full divide-y relative">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-9 mx-auto">
          
          <!-- Why This Matters -->
          <div class="space-y-4 pt-[2rem] pb-[4rem] border-b border-[var(--form-border)]">
            <h2 class="typography-h2 text-[var(--form-text)]">
              {whyMatters.title}
            </h2>
            <p class="typography-body-lg text-[var(--form-text-secondary)] leading-relaxed">
              {whyMatters.description}
            </p>
          </div>

          <!-- Benefits -->
          <div class="space-y-4 pt-[4rem] pb-[4rem] border-b border-[var(--form-border)]">
            <h2 class="typography-h2 text-[var(--form-text)]">
              {benefits.title}
            </h2>
            <ul class="pl-2 space-y-3 typography-body-md text-[var(--form-text-secondary)]">
              {#each benefits.items as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>

          <!-- Steps -->
          <div class="space-y-8 pt-[4rem] pb-[4rem] border-b border-[var(--form-border)]">
            <h2 class="typography-h2 text-[var(--form-text)]">Core Budgeting Steps</h2>
            <ol class="list-decimal pl-6 space-y-6">
              {#each steps as step}
                <li>
                  <h3 class="typography-h3 font-semibold text-[var(--form-text)]">
                    {step.heading}
                  </h3>
                  <p class="typography-body-md text-[var(--form-text-secondary)] mt-2">
                    {step.desc}
                  </p>
                </li>
              {/each}
            </ol>
          </div>

          <!-- Actions -->
          <div class="space-y-4 pt-[4rem] pb-[4rem] border-b border-[var(--form-border)]">
            <h2 class="typography-h2 text-[var(--form-text)]">
              {actions.title}
            </h2>
            <ul class="list-disc pl-6 space-y-3 typography-body-md text-[var(--form-text-secondary)]">
              {#each actions.points as pt}
                <li>{pt}</li>
              {/each}
            </ul>
          </div>

          <!-- Final Thoughts -->
          <div class="space-y-4 pt-[4rem] pb-[4rem]">
            <h2 class="typography-h2 text-[var(--form-text)]">Final Thoughts</h2>
            {#each finalThoughts.paragraphs as para}
              <p class="typography-body-md text-[var(--form-text-secondary)] leading-relaxed">
                {para}
              </p>
            {/each}
          </div>

        </div>
      </div>
    </div>

    <!-- Message Us Section -->
    <TwoColumnWithImage contents={messageUs}>
      <p class="typography-body-md text-[var(--form-text-secondary)] mb-6">
        Need professional assistance to organize your budget or plan your savings? Connect with a financial specialist today for tailormade money management advice.
      </p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <div slot="secondary">
      <HelpList contents={helpList} />
      <ThingsYouShould thinkKnow={thingsYouShouldKnow} disc="list-decimal" containerClass="px-0" />
    </div>

  </NewPageLayout>
</section>
