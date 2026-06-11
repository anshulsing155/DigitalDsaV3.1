<script lang="ts">
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/dodArticle.json";

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
    <TwoColumnWithLeftHeading contents={content.howItWorks} />
    <TwoColumnWithLeftHeading contents={content.benefits} />
    <TwoColumnWithLeftHeading contents={content.features} />
    <TwoColumnWithLeftHeading contents={content.whenToUse} />
    <TwoColumnWithLeftHeading contents={content.conclusion} />

    <TwoColumnWithImage contents={content.messageUs}>
      <p class="typography-body-sm text-text-light">{content.messageUs.text}</p>
      <Button
        link={content.messageUs.button.link}
        btnBorder={content.messageUs.button.btnBorder}
        btnName={content.messageUs.button.btnName}
      />
    </TwoColumnWithImage>

    <div slot="secondary" class="px-2">
      <HelpList contents={content.common_components.helpList.contents} />
    </div>
  </NewPageLayout>
</section>
