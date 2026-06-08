<script>
  import NewPageLayout from "./NewPageLayout.svelte";

  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Seo from "./Seo.svelte";

  let firstTableData = [
    {
      columnName: [
        "<div class='flex gap-2 items-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Feature </div>",
        "<div class='flex gap-2 items-center'><img class='h-5' src='/icons/plotLoans.svg' alt='plot icon'> LAP (Loan Against Property) </div>",
        "<div class='flex gap-2 items-centers'> <img class='h-5' src='/icons/overDraft.svg' alt='dod icon'> DOD (Drop-Line Overdraft) </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='purpose icon'>Loan Type </span>":
            ["Term Loan", "Overdraft Facility"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/mutualFund.svg' alt='fund icon'>Disbursal</span>":
            ["Lump sum", "Withdraw as needed"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/availability.svg' alt='calc icon'>Interest Calculation</span>":
            ["Charged on full loan amount", "Charged only on utilized amount"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/loanValue.svg' alt='home icon'>Repayment</span>":
            ["Fixed EMIs over tenure", "Flexible, based on withdrawals"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/comparison.svg' alt='reduction icon'>Limit Reduction</span>":
            ["No reduction", "Limit reduces over time"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/bestFor.svg' alt='best icon'>Best For</span>":
            ["Long-term expenses", "Short-term cash flow needs"],
        },
      ],
    },
  ];
</script>

<Seo
  type="WebPage"
  title="LAP vs DOD: Compare Loan Against Property & Overdraft"
  image="/images/lap-vs-dod-blog.jpg"
  description="Compare Loan Against Property (LAP) & Drop-Line Overdraft (DOD) to choose the best secured loan for your financial needs. Find key differences now!"
  keywords="Loan Against Property, Drop-Line Overdraft, LAP vs DOD, Property Loan, Overdraft Facility, Term Loan, Business Loan, Working Capital Loan, Secured Loan, Loan Comparison, Flexible Loan, Loan Interest Calculation, EMI vs Overdraft, Financial Planning"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/lap-vs-dod-blog.jpg",
      sourceName: "Freepik",
      originalSource:
        "https://www.freepik.com/search?format=search&img=1&last_filter=query&last_value=story+of+loan+cpmplette+early+girl&query=story+of+loan+cpmplette+early+girl",
      coverAlt: "hero-cover",
      heading: "Unlocking the Power of Collateral",
      para: `<p class="p-[1rem] bg-gray-100">LAP (Loan Against Property) and DOD (Drop-Line Overdraft) are both credit facilities secured against property, but they serve different purposes and function differently. Here’s a detailed comparison</p>`,
    }}
  >
    <TwoColumnWithLeftHeading
      contents={{
        heading: "Loan Against Property (LAP)",
        listTopPara: `A term loan where you pledge your property as collateral to get a lump sum loan amount, which is repaid in fixed EMIs over a tenure.`,
        list: [
          {
            heading: `Lump Sum Disbursal:  <span class="font-Paragraph">The entire loan amount is given at once.</span>`,
          },
          {
            heading: `Fixed EMI Payments:  <span class="font-Paragraph">You repay the loan in monthly EMIs over a fixed tenure.Longer Tenure: Typically 10-20 years.</span>`,
          },
          {
            heading: `Longer Tenure: <span class="font-Paragraph">Typically 10-20 years.</span>`,
          },
          {
            heading: `Fixed or Floating Interest Rate:<span class="font-Paragraph">Interest can be fixed or linked to market rates.</span>`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><strong>💡Use case : </strong>Ideal for long-term financial needs like business expansion, medical expenses, or home renovation.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Drop-Line Overdraft (DOD)",
        listTopPara: `A flexible overdraft facility where you can withdraw funds as needed up to a sanctioned limit, and the limit reduces over time.`,
        list: [
          {
            heading: `Overdraft Facility: <span class="font-Paragraph">You can withdraw money as per your requirement instead of taking a lump sum.</span>`,
          },
          {
            heading: `Interest on Used Amount:  <span class="font-Paragraph">You pay interest only on the amount utilized and not on the full sanctioned limit.</span>`,
          },

          {
            heading: `Limit Reduction:  <span class="font-Paragraph">The sanctioned limit reduces at regular intervals (monthly or quarterly).</span>`,
          },

          {
            heading: `Flexible Repayment:   <span class="font-Paragraph">No fixed EMIs; you can repay as per your cash flow.</span>`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><Strong>💡Use case :</Strong> Best for businesses needing working capital or individuals with fluctuating cash flow needs</p>`,
      }}
    />

    <div
      class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-borderColor"
    >
      <div class="">
        <h2
          class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
        >
          LAP vs DOD
          <span
            class="underline decoration-4 underline-offset-4 decoration-btnBg italic"
            >Key Differences</span
          >
        </h2>
      </div>

      {#each firstTableData as tableData}
        <PaymentTable {tableData} />
      {/each}
    </div>

    <TwoColumnWithImage
      contents={{
        cardImage: "/images/cardImage.jpg",
        cardAltName: "LAP-section",
        cardHeading: `Which One Should You Choose?`,
      }}
    >
      <ul class="list-disc pl-4">
        <li class="">
          <span class="font-FourthHead">Choose LAP </span> if you need a large sum
          upfront and prefer structured repayments.
        </li>
        <li class="">
          <span class="font-FourthHead">Choose DOD </span> if you need flexibility
          in withdrawals and want to save on interest by paying only for what you
          use.
        </li>
      </ul>
    </TwoColumnWithImage>

    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp
        help={[
          {
            Heading: "Book an appointment",
            paragraph:
              "Book instantly to speak to a LAP loan specialist at a time that suits you",
            icon: "/icons/appointment.svg",
            altTitle: "icons",
            link: "/appointment",
          },
          {
            Heading: "Check loan offers",
            paragraph:
              "In as little as 10 minutes and tailored exactly as per your financial profile.",
            icon: "/icons/manageLoan2.svg",
            altTitle: "icons",
            link: "/get-started/how-can-we-help",
          },
          {
            Heading: "Contact us",
            paragraph:
              "Fast-track your call and connect with a specialist in the Digital DSA.",
            icon: "/icons/contact.svg",
            altTitle: "icons",
            link: "/contact",
          },
          {
            Heading: "Message us",
            paragraph:
              "Get instant help from our online assistants  or chat to a specialist.",
            icon: "/icons/msg.svg",
            altTitle: "icons",
            link: "/contact",
          },
        ]}
        heading="We're here to help"
      />
    </div>
  </NewPageLayout>
</section>
