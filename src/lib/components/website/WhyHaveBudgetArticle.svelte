<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Tooltip from "$lib/components/website/Tooltip.svelte";
  import content from "$lib/data/website/whyHaveBudget.json";

  const { seo, pageData, extraIntro, sections } = content;
  let originalSource = "";
  let sourceName = "undefined";
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section class="w-full px-1">
  <div id="pageDesign" class="mx-auto bg-white">
    <div class="grid items-center lg:grid-cols-2 gap-[4rem] py-[4rem] lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] border-b border-[var(--form-border)]">
      <div class="order-2 lg:order-1">
        <h1 class="mb-[3rem] typography-h2 text-text-main">
          {pageData.heading}
        </h1>
        <p class="mb-[2rem] font-para typography-body-md">
          {pageData.para}
        </p>
        <p class="font-para typography-body-md">
          {extraIntro}
        </p>
      </div>
      <div class="order-1 lg:order-2 relative">
        <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
          <Tooltip
            linkName={`image source: <span class="underline underline-offset-4">${sourceName}</span>`}
            hoverLink={originalSource}
          />
        </div>
        <img
          src={pageData.coverImage}
          alt={pageData.coverAlt}
          class="aspect-[5/3] w-full object-cover object-top h-[15rem] lg:h-full"
        />
      </div>
    </div>

    {#each sections as section}
      <div class="py-[4rem] lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] border-b border-[var(--form-border)]">
        <h2 class="typography-h2 text-text-main mb-[3rem]">
          {section.title}
        </h2>
        {#each section.paragraphs as para, i}
          {#if i === 0}
            <p class="font-para typography-body-md mb-[2rem]">
              {para}
            </p>
          {:else}
            <div class="mt-8 p-6 bg-blue-50 border-l-4 border-[var(--form-border)] italic text-gray-700 shadow-md rounded-lg">
              <p class="font-para typography-body-md">
                {para}
              </p>
            </div>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</section>
