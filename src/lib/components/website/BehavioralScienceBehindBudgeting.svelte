<script>
  let { data } = $props();

  import NewPageLayout from "./NewPageLayout.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import Seo from "./Seo.svelte";
  import content from "$lib/data/website/behavioralScienceBehindBudgeting.json";
  	import SectionIntro from '$lib/components/website/SectionIntro.svelte';


  const { seo, pageData, tips, conclusion } = content;
</script>

<Seo
  type={seo.type}
  title={seo.title}
  image={seo.image}
  description={seo.description}
  keywords={seo.keywords}
/>

<section class="content">
  <NewPageLayout {pageData}>
    <div class="border-b border-[var(--form-border)]">
      {#each tips as tip}
        <div class="border-b border-[var(--form-border)]">
          <ThingsYouShould thinkKnow={tip} disc="list-disc" />
        </div>
      {/each}
    </div>
    <!-- <div
      class="flex flex-col py-[2rem] lg:py-[4rem] px-[1rem] lg:px-[4rem] gap-[1rem]"
    >
      <h2 class="typography-h2 text-text-main">
        {conclusion.heading}
      </h2>
      <h3 class="typography-h3 font-semibold text-text-main">
        {conclusion.subHeading}
      </h3>
      <p class="typography-body-md text-[var(--form-text-secondary)]">
        {conclusion.para}
      </p>
    </div> -->
 
  <SectionIntro heading={conclusion.heading} subHeading={conclusion.subHeading} para={conclusion.para} isBorder={true} />


  </NewPageLayout>
</section>

<style>
</style>
