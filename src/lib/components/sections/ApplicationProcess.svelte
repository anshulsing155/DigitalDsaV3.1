<script>
  import NewPageLayout from '../layout/NewPageLayout.svelte';
  import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
  import ThingsYouShould from './ThingsYouShould.svelte';
  import HelpList from './HelpList.svelte';
  import Seo from '../layout/Seo.svelte';
  import content from "$lib/data/website/applicationProcess.json";

  const { seo, pageData, steps, help, thinkYouShouldKnow } = content;
</script>

<Seo
  type={seo.type}
  image={seo.image}
  title={seo.title}
  description={seo.description}
  keywords={seo.keywords}
/>

<section>
  <NewPageLayout pageData={pageData}>
    <AboveTitleWithTopIconCard contents={steps} />
    <div slot="secondary">
      <HelpList contents={help} />
      <ThingsYouShould thinkKnow={thinkYouShouldKnow} disc="list-disc" containerClass="px-0" />
    </div>
  </NewPageLayout>
</section>
