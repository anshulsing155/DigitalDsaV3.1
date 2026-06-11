<script lang="ts">
  import NewPageLayout from "./NewPageLayout.svelte";
  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/lapVsDod.json";

  let {
    pageData = content.pageData
  }: { pageData?: any } = $props();
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section>
  <NewPageLayout pageData={pageData}>
    <TwoColumnWithLeftHeading contents={content.lap} />
    <TwoColumnWithLeftHeading contents={content.dod} />

    <div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-borderColor">
      <div>
        <h2 class="grid mb-[4rem] typography-h2 text-text-main text-center">
          {content.comparison.heading}
          <span class="underline decoration-4 underline-offset-4 decoration-btnBg italic">
            {content.comparison.italicHeading}
          </span>
        </h2>
      </div>

      {#each content.comparison.tableData as tableData}
        <PaymentTable {tableData} />
      {/each}
    </div>

    <TwoColumnWithImage contents={content.whichToChoose.contents}>
      <ul class="list-disc pl-4">
        {#each content.whichToChoose.list as item}
          <li>
            <span class="font-semibold">{item.bold}</span> {item.text}
          </li>
        {/each}
      </ul>
    </TwoColumnWithImage>

    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp
        help={content.common_components.helpList.contents.cards}
        heading={content.common_components.helpList.contents.heading}
      />
    </div>
  </NewPageLayout>
</section>
