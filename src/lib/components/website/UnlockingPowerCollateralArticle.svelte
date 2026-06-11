<script lang="ts">
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/unlockingPowerCollateral.json";

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
    <TwoColumnWithLeftHeading contents={content.understandingRole} />
    <TwoColumnWithLeftHeading contents={content.maximizePotential} />
    <ThreeColumWithLeftHeading contents={content.strategicUses} />
    <ThreeColumWithLeftHeading contents={content.caseStudy} />
    <TwoColumnWithLeftHeading contents={content.conclusion} />

    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp
        help={content.common_components.helpList.contents.cards}
        heading={content.common_components.helpList.contents.heading}
      />
    </div>
  </NewPageLayout>
</section>
