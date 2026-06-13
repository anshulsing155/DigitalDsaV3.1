<script>
  import EnquiryContactPage from "./EnquiryContactPage.svelte";
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import Seo from "./Seo.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import content from "$lib/data/website/contact.json";

  let pageData = content.pageData;
  let enquiry = content.enquiry;
</script>

<Seo
  type="WebPage"
  title={content.seo.title}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="xl:contianer mx-auto w-full bg-mainBg">
  <PageFullTextDesign {pageData}>
    <div class="mx-1 lg:mx-0 lg:px-[4rem]">
      <div class="border-b border-dividerColor">
        <EnquiryContactPage {enquiry} heading="What is enquiry?" />
      </div>

      <div class="border-t border-[var(--form-border)] py-[2rem] space-y-5">
        <TwoColumn
          cardImage={content.beforeReachingUs.cardImage}
          cardAltName={content.beforeReachingUs.cardAltName}
          cardHeading={content.beforeReachingUs.cardHeading}
          sourceName={content.beforeReachingUs.sourceName}
          originalSource={content.beforeReachingUs.originalSource}
          reverse={content.beforeReachingUs.reverse}
        >
          <ul
            class="grid gap-6 typography-body-sm text-text-light md:typography-body-md list-disc pl-5"
            slot="list"
          >
            {#each content.beforeReachingUs.items as item}
              <li>
                <span class="font-semibold">{item.title}</span>
                <br />
                {@html item.desc}
              </li>
            {/each}
          </ul>
        </TwoColumn>
      </div>

      <div class="border-t border-[var(--form-border)] py-[2rem] space-y-5">
        <TwoColumn
          cardImage={content.securityInfo.cardImage}
          sourceName={content.securityInfo.sourceName}
          originalSource={content.securityInfo.originalSource}
          cardAltName={content.securityInfo.cardAltName}
          cardHeading={content.securityInfo.cardHeading}
        >
          <div class="flex flex-col gap-5" slot="list">
            <ul
              class="grid gap-4 typography-body-sm text-text-light md:typography-body-md list-disc pl-5"
            >
              {#each content.securityInfo.items as item}
                <li>
                  <span class="font-semibold">{item.title}</span> {@html item.desc}
                </li>
              {/each}
            </ul>
            <p class="mt-4 typography-body-sm text-text-light md:typography-body-md">
              {content.securityInfo.footerPara}
            </p>
          </div>
        </TwoColumn>
      </div>

      <div class="border-t border-[var(--form-border)] py-[6rem] space-y-5">
        <div class="flex flex-col gap-[3rem] w-full">
          <!-- first div  -->
          <div class="grid grid-cols-12 gap-4">
            <h2
              class="col-span-12 first-letter:lg:col-span-5 typography-h3 font-semibold md:typography-h2-md"
            >
              {content.mapSection.heading}
            </h2>
            <div
              class="col-span-12 first-letter: lg:col-span-7 typography-body-sm text-text-light md:typography-body-md"
            >
              <p>
                {content.mapSection.subHeading}
              </p>
            </div>
          </div>
          <!-- sec div  -->
          <div
            class="grid grid-cols-3 justify-between gap-4 typography-body-sm text-text-light md:typography-body-md"
          >
            <div class="col-span-3 lg:col-span-2">
              <div
                class="w-full flex justify-center items-center mx-auto h-[20rem]"
              >
                <iframe
                  src={content.mapSection.iframeSrc}
                  width="100%"
                  height="100%"
                  title="office-location-map"
                  style="border:0; border-radius: 8px;"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                >
                </iframe>
              </div>
              <div class="pt-4 h-[5rem]">
                <p>
                  <span class="font-semibold">{content.mapSection.officeLabel}</span>
                  <br /> {@html content.mapSection.addressLines}
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-4 col-span-3 lg:col-span-1">
              <div
                class="border-[var(--form-border)] border py-4 divide-x grid grid-cols-12"
              >
                <div
                  class="h-[3rem] flex justify-center col-span-2 lg:col-span-3"
                >
                  <img
                    src={content.contactMethods.call.icon}
                    alt="contact-icon"
                    class="h-full"
                  />
                </div>
                <div class="col-span-10 lg:col-span-9 pl-4">
                  <p>
                    <span class="font-semibold">{content.contactMethods.call.title}</span> <br /> {content.contactMethods.call.value}
                  </p>
                </div>
              </div>

              <div
                class="border-[var(--form-border)] border py-4 divide-x grid grid-cols-12"
              >
                <div
                  class="h-[1.5rem] md:h-[2rem] lg:h-[2.4rem] flex justify-center col-span-2 lg:col-span-3"
                >
                  <img
                    src={content.contactMethods.email.icon}
                    alt="mail-icon"
                    class="h-full justify-self-center"
                  />
                </div>
                <div class="col-span-10 lg:col-span-9 pl-4">
                  <p>
                    <span class="font-semibold">{content.contactMethods.email.title}</span> <br /> {content.contactMethods.email.value}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageFullTextDesign>
</section>
