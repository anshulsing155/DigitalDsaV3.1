<script>
  import NewPageLayout from '$lib/components/layout/NewPageLayout.svelte';
  import TwoColumn from '$lib/components/sections/TwoColumn.svelte';
  import WhyChoose from '$lib/components/sections/WhyChoose.svelte';
  import Seo from '../layout/Seo.svelte';
  import HelpList from './HelpList.svelte';
  import content from "$lib/data/website/message24.json";

  let benefits = content.benefits;
  let instantSupport = content.instantSupport;
  let pageData = content.pageData;
  let howCanWeHelp = content.howCanWeHelp;
  let securityInfo = content.securityInfo;
  let help = content.help;
</script>

<Seo
  type="WebPage"
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="mx-auto w-full">
  <NewPageLayout {pageData}>
    <div class="px-[0.5rem] lg:px-[4rem]">
      <div class="border-b border-[var(--form-border)]">
        <WhyChoose facilities={benefits} gridCol={4} />
      </div>
      <TwoColumn
        cardImage={howCanWeHelp.cardImage}
        cardAltName={howCanWeHelp.cardAltName}
        cardHeading={howCanWeHelp.cardHeading}
        sourceName={howCanWeHelp.sourceName}
        originalSource={howCanWeHelp.originalSource}
        reverse={howCanWeHelp.reverse}
      >
        <ul
          class="grid gap-6 typography-body-md text-[var(--form-text-secondary)] list-disc pl-5"
          slot="list"
        >
          {#each howCanWeHelp.items as item}
            <li>
              <span class="font-semibold">{item.title}</span>
              <br />
              {@html item.desc}
            </li>
          {/each}
        </ul>
      </TwoColumn>

      <div class="border-y border-[var(--form-border)]">
        <WhyChoose facilities={instantSupport} gridCol={4} />
      </div>

      <TwoColumn
        cardImage={securityInfo.cardImage}
        sourceName={securityInfo.sourceName}
        originalSource={securityInfo.originalSource}
        cardAltName={securityInfo.cardAltName}
        cardHeading={securityInfo.cardHeading}
      >
        <div class="flex flex-col gap-5" slot="list">
          <ul class="grid gap-4 typography-body-md text-[var(--form-text-secondary)] list-disc pl-5">
            {#each securityInfo.items as item}
              <li>
                <span class="font-semibold">{item.title}</span> {@html item.desc}
              </li>
            {/each}
          </ul>
          <p class="mt-4 text-[var(--form-text-secondary)] typography-body-md">
            {securityInfo.footerPara}
          </p>
        </div>
      </TwoColumn>
    </div>

    <div slot="secondary">
      <HelpList
        contents={help}
      />
    </div>
  </NewPageLayout>
</section>
