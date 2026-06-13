<script>
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import Information from "$lib/components/website/Information.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import Sublist from "$lib/components/website/Sublist.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import ThreeColumWithLeftHeading from "$lib/components/website/ThreeColumWithLeftHeading.svelte";
  import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
  import PaymentTable from "$lib/components/website/PaymentTable.svelte";
  import content from "$lib/data/website/professionalLoan.json";
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="content">
  <NewPageLayout pageData={content.pageData}>
    <Sublist subList={content.subList} />
    <div class="divide-y">
      <div id="type" class="px-4 lg:px-16">
        <WhyChoose facilities={content.professionalLoanType} />
      </div>
      <div class="px-4 lg:px-16" id="balanceTransfer">
        <WhyChoose facilities={content.balanceTransferTopup} />
      </div>
      <ButtonBanner contents={content.balanceTransferBanner} />

      <div class="" id="calculator">
        <ThreeColumWithLeftHeading contents={content.calculators} />
      </div>

      <div id="repayment" class="px-4 lg:px-16">
        <TwoColumn
          cardImage={content.repaymentsCard.cardImage}
          cardAltName={content.repaymentsCard.cardAltName}
          cardHeading={content.repaymentsCard.cardHeading}
          reverse={content.repaymentsCard.reverse}
        >
          <div class="flex flex-col gap-2">
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              {content.repaymentsCard.para}
            </p>
            <ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
              {#each content.repaymentsCard.bullets as bullet}
                <li class="flex gap-2 items-start">
                  <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-2" />
                  {bullet}
                </li>
              {/each}
            </ul>
          </div>

          <Button
            link="/planners/flexible-emi-planner"
            btnName="Calculate now"
            btnColor="#ffcc00"
          />
        </TwoColumn>
      </div>

      <ThreeColumWithLeftHeading contents={content.wealthCalculators} />

      <div
        id="securedUnsecured"
        class="py-8 lg:py-0 lg:pt-16 lg:pb-32 px-4 lg:px-16 w-full border-b border-[var(--form-border)] text-[var(--form-text)]"
      >
        <div class="">
          <h2
            class="typography-h2 text-center py-5 text-[var(--form-text)]"
          >
            <span class="underline"> Secured </span> vs
            <span class="underline"> Unsecured Loans</span>
          </h2>
        </div>
        <div class="">
          {#each content.firstTableData as tableData}
            <PaymentTable {tableData} />
          {/each}
        </div>
      </div>

      <div id="eligibility">
        <ThreeColumWithLeftHeading contents={content.eligibilitySection} />
      </div>
      
      <div class="px-4 lg:px-16">
        <WhyChoose facilities={content.whyChooseUs} />
      </div>

      <ThreeColumWithLeftHeading contents={content.exploreBanner} />

      <div class="px-4 lg:px-16">
        <TwoColumn
          cardImage={content.messageCard.cardImage}
          cardAltName={content.messageCard.cardAltName}
          cardHeading={content.messageCard.cardHeading}
        >
          <ul
            class="grid gap-8 typography-body-md text-[var(--form-text-secondary)]"
            slot="list"
          >
            <li>
              {content.messageCard.para}
            </li>

            <div class="w-auto">
              <Button
                link="/contact"
                btnBorder="#4F4C4D"
                btnName="Message us"
              />
            </div>
          </ul>
        </TwoColumn>
      </div>

      <div class="px-4 lg:px-16">
        <Information />
      </div>
    </div>

    <div slot="secondary" class="px[1rem] py-[2rem] lg:px-[0rem]">
      <h2
        class="typography-h3 text-[var(--form-text)]"
      >
        We're here to help
      </h2>
      <WeAreHereHelp help={content.help} />
      <ThingsYouShould
        thinkKnow={content.common_components.thingsYouShouldKnow}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>
