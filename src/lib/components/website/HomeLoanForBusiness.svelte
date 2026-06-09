<script>
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Journey from "$lib/components/website/Journey.svelte";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import PremiumButton from "./PremiumButton.svelte";
  import Guides from "./Guides.svelte";
  import AccordionWithLeftHeading from "./AccordionWithLeftHeading.svelte";
  import Seo from "./Seo.svelte";
  import HelpList from "./HelpList.svelte";
  import { banks } from "$lib/data/bankEligibilityData";

  function findLowestROIWithBank(data, key) {
    return data.reduce(
      (minObj, obj) => {
        const value = parseFloat(obj[key]); // Convert to number
        if (!isNaN(value) && value < minObj.roi) {
          return { bank: obj.BankName, roi: value.toFixed(2) };
        }
        return minObj;
      },
      { bank: null, roi: Infinity }
    );
  }
  const key =
    "(HL/Construction/Plot+Construction/Plot) ROI as per CIBIL / 800+";
  const result = findLowestROIWithBank(banks, key);
  // console.log("Bank with Lowest ROI:", result.bank, "ROI:", result.roi);

  let cardImg1 = "/images/beautiful-drawing-room.jpg";
  let cardAlt1 = "images-HLGreenDigital";
  let cardHead1 = "What Documents Do You Need?";

  let pageData = {
    coverImage: "/images/business-owners.jpg",
    coverAlt: "photo of two business owners",
    classStyle: "object-cover xl:h-[60svh] 3xl:max-h-[70svh]",
    heroHeading: "Home loans for business owners",
    heroParagraph: `Are you self-employed, a shopkeeper, or running a small business? </br> 
      At Digital DSA, we specialize in helping self-employed individuals and business owners from all sectors—organized or unorganized—secure the perfect home loan solution, no matter how complex your income verification might seem.
    `,
  };

  let navBarMedium = [
    "Get started",
    "Why Digital DSA",
    "Home loan options",
    "What documents do you need",

    "Verification process",
    "Rates & fees",
    "Tools & support",
  ];

  let journey = {
    heading: "Get started",
    items: [
      {
        id: 1,
        title: "Just need a home loan?",
        desc: "Talk to our Home Loan Assistant about finding the right home loan for you.",
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        id: 2,
        title: "Looking for a home & business loan?",
        desc: "Talk to our specialists about financing your home and business loan together.",
        premiumBtnName: "Book appointment",
        premiumBtnLink: "/appointment",
      },
    ],
  };

  let verification = [
    {
      firstBox: [
        {
          heading: `Our simplified verification process`,
          list: [
            `A simple application process for business owners with less documents to prove your income.`,
            `Get in touch with our Home Lending Specialists to discuss your options.`,
          ],
        },
      ],
      secBox: [
        {
          heading: "You may be eligible if:",
          list: [
            `You’re self-employed`,
            `You pay yourself a regular salary from your business`,
          ],
        },
      ],
      thirdBox: [
        {
          heading: "If eligible, you'll need:",
          para: `In some instances, we may need more information. Our Home Lending Specialists will let you know.`,
          list: [
            `Six months of salary credits in an account`,
            `Financial records showing profit and loss for the last two years, with a profit each year`,
          ],
        },
      ],
    },
  ];

  let facilities = {
    heading: "Why Digital DSA?",
    items: [
      {
        id: 1,
        title: "Custom Solutions for All Business Owners​",
        desc: `Whether you’re a shopkeeper, mechanic, electrician, food joint owner, or running any other small business, we offer personalized loan solutions.`,
        icon: "/icons/uniqueLink.svg",
        altName: "unique-icon",
      },
      {
        id: 2,
        title: "No Strict Financial History Required​",
        desc: `Don’t have three years of financial records? Don’t worry! We can assist even if you have only 2 years, 1 year, or no financial records at all.`,
        icon: "/icons/apply-pen.svg",
        altName: "pen-icon",
      },
      {
        id: 3,
        title: "Access to Multiple Lenders​",
        desc: `With partnerships across banks, NBFCs, and financial institutions, we match you with the best home loan options available for your unique situation.`,
        icon: "/icons/FD.svg",
        altName: "fd-icon",
      },
      {
        id: 4,
        title: "Competitive Interest Rates",
        desc: `Get affordable interest rates and repayment options, whether you have formal income proof or not.​`,
        icon: "/icons/interestIcon.svg",
        altName: "interest-icon",
      },
      {
        id: 5,
        title: "Dedicated Support",
        desc: `Our specialists will guide you through the entire process, ensuring a seamless experience.​`,
        icon: "/icons/negotiate.svg",
        altName: "hands-icon",
      },
      {
        id: 6,
        title: "Flexible Appointments",
        desc: `We’re available to assist you in person, over the phone, or online, at a time that works for you.​`,
        icon: "/icons/appointment.svg",
        altName: "appoint-icon",
      },
    ],
  };

  let homeLoanOptions = {
    heading: `Home Loan Options for </br> Business Owners`,
    items: [
      {
        id: 1,
        title: "For Established Business Owners with Financial Records",
        desc: `Provide ITRs, computation of income, and other financial documents for the last 2–3 years to get the best loan options tailored to your needs.`,
      },
      {
        id: 2,
        title: "For New Business Owners (1 Year or Less)",
        desc: `Even if your business has been running for just one year, we can help you secure a loan by evaluating your current income and projections.`,
      },
      {
        id: 3,
        title: "For Small Vendors and Unorganized Businesses",
        desc: `No formal financial records? No problem! We specialize in finding solutions for small vendors, shopkeepers, mechanics, electricians, and others in the unorganized sector.`,
      },
    ],
  };

  let guide = {
    heading: `How We Help Business </br> Owners Without Documents`,
    para: `For individuals like shopkeepers, small vendors, or repair workers with no financial records: </br>
    <ul class="list-disc pl-4 space-y-4 mt-4">
      <li><span class="font-FourthHead">Cash Flow Assessment:</span> We evaluate your income using your bank deposits, expense patterns, and other financial behaviors. </li>
      <li><span class="font-FourthHead">Alternate Documentation: </span> If you don’t have ITRs or financial statements, we help by submitting alternative proofs like rent agreements, utility bills, or sales invoices. </li>
      <li><span class="font-FourthHead">Tailored Solutions: </span>Our wide network of lenders allows us to offer customized loan options for unorganized sector businesses. </li>
    </ul>
    `,
  };

  let getStart = {
    heading: `How to Get Started`,
    para: `For individuals like shopkeepers, small vendors, or repair workers with no financial records: </br>
    <ul class="list-disc pl-4 space-y-4 mt-4">
      <li><span class="font-FourthHead">Step 1: First Time Free Consultation</span> </br> Speak with our Loan Specialists to discuss your needs and financial situation. </li>
      <li><span class="font-FourthHead">Step 2: Check Your Eligibility </span> </br>Use our <a href="/calculators/eligibility-calculator" class="underline underline-offset-4">Home Loan Eligibility Calculator</a> or connect with us to get a quick estimate. </li>
      <li><span class="font-FourthHead">Step 3: Submit Documents</span>Provide the necessary financial or alternate documents based on your business type. </li>
      <li><span class="font-FourthHead">Step 4: Choose Your Loan</span>We’ll match you with the best lenders and guide you through the application process.</li>
    </ul>
    `,
  };

  let documentsGuide = [
    {
      para: `Depending on your business profile, you may need:`,
      lists: [
        {
          heading: `For Organized Sector Business Owners`,
          subList: [
            {
              list: `ITR (Income Tax Returns) for the last 2–3 years (if available).`,
            },
            {
              list: `Computation of income and profit & loss statements.`,
            },
            {
              list: `Bank statements for the last 6–12 months`,
            },
          ],
        },
        {
          heading: `For New or Unorganized Business Owners`,
          subList: [
            {
              list: `Bank statements for 6–12 months to assess cash flow.`,
            },
            {
              list: `Any business-related documents like a GST certificate, shop registration, or invoices.`,
            },
            {
              list: `A declaration of your income (self-declared income affidavit).`,
            },
          ],
        },
      ],
    },
  ];

  let rates = [
    {
      heading: "Rate & fees",
      left: [
        {
          heading: `Interest Rates (${result.roi}% PA)`,
          lists: [
            `Starting from 8.10% p.a. for new home loans.`,
            `Flexible financing options with Loan-to-Value (LTV) ratios up to 80%–90%, depending on the lender.`,
          ],
        },
      ],
      right: [
        {
          heading: "Fees (10-15k)",
          lists: [
            `Processing Fee: ₹10,000–₹15,000 (varies by lender, often negotiable).`,
            `Service Charges: Detailed in your loan agreement based on the loan type and lender.`,
          ],
        },
      ],
    },
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
      `<span class="font-FourthHead">Independent Facilitator:</span> Digital DSA serves as an independent loan facilitator, helping business owners connect with licensed banks and NBFCs for home loan solutions. We do not provide loans directly and are not a financial institution.`,
      `<span class="font-FourthHead">Loan Approval:</span> Home loan approval for business owners depends entirely on the respective bank or NBFC's assessment of financial stability, income consistency, and creditworthiness. Digital DSA does not guarantee approval, as decisions are based on the lender’s policies, terms, and conditions. Interest rates, repayment options, and processing fees may vary accordingly.`,
      `<span class="font-FourthHead">Liability:</span> Digital DSA is not responsible for any delays, rejections, or financial losses encountered during the loan application process. The final approval decision rests with the bank or NBFC, and their terms will apply.`,
      `<span class="font-FourthHead">Important Information:</span> The details shared on this page are for informational purposes only and may not be suitable for every business owner. Home loan eligibility and benefits depend on various factors, including income stability, business history, and lender requirements. Exclusive loan offers may be available through Digital DSA, subject to specific eligibility criteria.`,
    ],
  };

  // Function to handle opening and closing of details
  // Toggle dropdown with animation
  const toggleDropdown = (event, index) => {
    event.preventDefault();
    const summaryElement = event.currentTarget;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement;

    // Close all dropdowns except the clicked one
    document.querySelectorAll(".dropdown").forEach((otherDetails, idx) => {
      const otherIcon = otherDetails.querySelector(".faq-icon");

      if (idx !== index) {
        otherDetails.removeAttribute("open");
        if (otherIcon) {
          otherIcon.classList.remove("fa-angle-up");
          otherIcon.classList.add("fa-angle-down");
        }
      }
    });

    // Toggle current dropdown open/close state
    const isOpen = detailsElement.hasAttribute("open");
    if (isOpen) {
      detailsElement.removeAttribute("open");
      icon.classList.remove("fa-angle-up");
      icon.classList.add("fa-angle-down");
    } else {
      detailsElement.setAttribute("open", "true");
      icon.classList.remove("fa-angle-down");
      icon.classList.add("fa-angle-up");
    }
    setTimeout(() => {
      detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };
  let activeSection = $state(''); // Initially no section is active

  // This function sets the first section as active on initial load
  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
      activeSection = firstSection.id;
    }
  };

  // Handle scroll event to dynamically update the active section
  const handleScroll = () => {
    const sections = document.querySelectorAll("[data-section]");
    let currentSection = "";

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 200 && rect.bottom >= 200) {
        currentSection = section.id;
      }
    });

    if (currentSection) {
      activeSection = currentSection; // Update the active section dynamically
    }

    // console.log(activeSection, 'active');
  };

  // Initialize the first active section when the component loads
  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
  //ends here...
</script>

<Seo
  type="WebPage"
  title="Home Loans for Business Owners | Easy Approval | Digital DSA"
  image="/images/business-owners.jpg"
  description="Get a home loan as a business owner, even with minimal documents. Flexible options, low rates, & fast approval. Apply now with Digital DSA!"
  keywords="Home loans for business owners, Self-employed home loans, Small business home loans, No ITR home loan, Home loan for shopkeepers, Home loan for self-employed, Home loan for unorganized businesses, Home loan without financial records, Low document home loans, Digital DSA home loan"
/>

<section>
  <PageDesign {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Get started",
              targetId: `started`,
            },
            {
              name: "Why Digital DSA",
              targetId: `choose`,
            },
            {
              name: "Home loan options",
              targetId: `loanOptions`,
            },
            {
              name: "What documents do you need",
              targetId: `whatDocs`,
            },

            {
              name: "Verification process",
              targetId: `process`,
            },
            {
              name: "Rates & fees",
              targetId: `fees`,
            },

            {
              name: "Tools & support",
              targetId: `support`,
            },
          ],
        }}
        {activeSection}
      />
      <div class="px-[2rem] lg:px-[4rem]">
        <div id="started" data-section="started" class="section">
          <Journey {journey} />
        </div>

        <div
          id="choose"
          data-section="choose"
          class="border-b border-borderColor"
        >
          <WhyChoose {facilities} gridCol="3" />
        </div>

        <div
          class="border-b border-borderColor"
          id="loanOptions"
          data-section="loanOptions"
        >
          <WhyChoose facilities={homeLoanOptions} gridCol="3" />
        </div>

        <div
          class="border-b border-borderColor"
          id="whatDocs"
          data-section="whatDocs"
        >
          <TwoColumn
            cardImage={cardImg1}
            cardAltName={cardAlt1}
            cardHeading={cardHead1}
            reverse={true}
          >
            <div class="flex flex-col gap-4">
              {#each documentsGuide as guide}
                <div class="flex flex-col gap-2">
                  <p class="font-Paragraph text-minParaFont">{guide.para}</p>

                  {#each guide.lists as list, index}
                    <li class="list-none font-FourthHead text-subParaFont">
                      {index + 1}. {list.heading}
                    </li>
                    <ul class="pl-4">
                      {#each list.subList as subList}
                        <li class="list-disc font-Paragraph text-subParaFont">
                          {subList.list}
                        </li>
                      {/each}
                    </ul>
                  {/each}
                </div>
              {/each}
            </div>
          </TwoColumn>

          <Guides {guide} />
        </div>

        <div
          class="py-[4rem] border-b border-borderColor"
          id="process"
          data-section="process"
        >
          {#each verification as contents}
            <div class="grid grid-cols-3 gap-[2rem]">
              {#each contents.firstBox as content}
                <div>
                  <h3
                    class="mb-[1.5rem] md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {content.heading}
                  </h3>
                  <ul class="space-y-2 mb-4">
                    {#each content.list as list}
                      <li class="font-Paragraph text-minParaFont">
                        {list}
                      </li>
                    {/each}
                  </ul>
                  <div class="mb-[1.5rem]">
                    <PremiumButton
                      premiumBtnName="Book appointment"
                      premiumBtnLink="/appointment"
                    />
                  </div>
                </div>
              {/each}
              {#each contents.secBox as content}
                <div>
                  <h3 class="mb-[1.5rem] font-ThirdHead text-minSubHead">
                    {content.heading}
                  </h3>
                  <ul class="list-disc mt-[1.5rem] space-y-2 mb-4 pl-4">
                    {#each content.list as list}
                      <li class="font-Paragraph text-minParaFont">
                        {list}
                      </li>
                    {/each}
                  </ul>
                </div>
              {/each}
              {#each contents.thirdBox as content}
                <div>
                  <h3 class="mb-[1.5rem] font-ThirdHead text-minSubHead">
                    {content.heading}
                  </h3>
                  <ul class="list-disc space-y-2 mb-4 pl-4">
                    {#each content.list as list}
                      <li class="font-Paragraph text-minParaFont">
                        {list}
                      </li>
                    {/each}
                  </ul>
                  <p class="mb-[1.5rem] font-Paragraph text-subParaFont">
                    {content.para}
                  </p>
                </div>
              {/each}
            </div>
          {/each}
        </div>

        <div id="fees" data-section="fees" class="py-[4rem] section">
          {#each rates as rate}
            <div class="grid grid-cols-3 gap-[2rem]">
              <h2
                class="mt-4 col-span-3 lg:col-span-1 font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
              >
                {rate.heading}
              </h2>

              <div class="col-span-3 lg:col-span-2">
                <div class="grid grid-cols-2 pt-4 gap-[2rem]">
                  {#each rate.left as content}
                    <div class="space-y-4">
                      <h3 class="font-ThirdHead text-minSubHead">
                        {content.heading}
                      </h3>
                      <ul class="list-disc pl-4 marker:black space-y-2">
                        {#each content.lists as list}
                          <li class="font-Paragraph text-minParaFont">
                            {list}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/each}
                  {#each rate.right as content}
                    <div class="space-y-4">
                      <h3 class="font-ThirdHead text-minSubHead">
                        {content.heading}
                      </h3>

                      <ul class="list-disc pl-4 marker:black space-y-2">
                        {#each content.lists as list}
                          <li class="font-Paragraph text-minParaFont">
                            {list}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        </div>

        <div id="support" class="section" data-section="support">
          <AccordionWithLeftHeading
            contents={{
              heading: `Frequently asked questions`,
              accordions: [
                {
                  question: `What if I don’t have ITRs or profit & loss statements?`,
                  answer: `We can work with alternative documentation, such as: <br/>
                     <ul class="list-disc pl-4">
                        <li>Bank statements showing cash flow.</li>
                        <li>Self-declared income affidavits.</li>
                        <li>Business-related certificates or invoices.</li>
                    </ul>`,
                },
                {
                  question: `Can I still apply if my business is less than a year old?`,
                  answer: `Yes! We have solutions tailored for new businesses based on current income and growth potential.`,
                },
                {
                  question: `What’s the maximum loan amount I can get?`,
                  answer: `Loan amounts depend on factors like your business cash flow, property value, and lender policies. Our Loan Specialists will help you estimate your eligibility.`,
                },
                {
                  question: `Can I combine my home loan with financing for my business?`,
                  answer: `Absolutely! We can help you explore options to combine your home and business loan financing for better management and savings.`,
                },
              ],
            }}
          />
          <Guides guide={getStart} />
        </div>
      </div>
    </div>

    <div class="lg:hidden block">
      {#each navBarMedium as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="started" class="bg-white text-black px-[0.5rem]">
              <Journey {journey} />
            </div>
          {:else if index == 1}
            <div id="choose" class="bg-white text-black px-[0.5rem]">
              <WhyChoose {facilities} gridCol="4" />
            </div>
          {:else if index == 2}
            <div id="loanOptions" class="bg-white text-black px-[0.5rem]">
              <WhyChoose facilities={homeLoanOptions} gridCol="3" />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black px-[0.5rem]" id="whatDocs">
              <TwoColumn
                cardImage={cardImg1}
                cardAltName={cardAlt1}
                cardHeading={cardHead1}
                reverse={true}
              >
                <div class="flex flex-col gap-4">
                  {#each documentsGuide as guide}
                    <div class="flex flex-col gap-2">
                      <p class="font-Paragraph text-minParaFont">
                        {guide.para}
                      </p>

                      {#each guide.lists as list, index}
                        <li class="list-none font-FourthHead text-subParaFont">
                          {index + 1}. {list.heading}
                        </li>
                        <ul class="pl-4">
                          {#each list.subList as subList}
                            <li
                              class="list-disc font-Paragraph text-subParaFont"
                            >
                              {subList.list}
                            </li>
                          {/each}
                        </ul>
                      {/each}
                    </div>
                  {/each}
                </div>
              </TwoColumn>

              <Guides {guide} />
            </div>
          {:else if index == 4}
            <div id="process" class="bg-white text-black px-[0.5rem] py-[4rem]">
              {#each verification as contents}
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                  {#each contents.firstBox as content}
                    <div>
                      <h3
                        class="mb-[1.5rem] md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                      >
                        {content.heading}
                      </h3>
                      <ul class="space-y-2 mb-4">
                        {#each content.list as list}
                          <li class="font-Paragraph text-minParaFont">
                            {list}
                          </li>
                        {/each}
                      </ul>
                      <div class="mb-[1.5rem]">
                        <PremiumButton
                          premiumBtnName="Book appointment"
                          premiumBtnLink="/appointment"
                        />
                      </div>
                    </div>
                  {/each}
                  {#each contents.secBox as content}
                    <div class="">
                      <h3 class="mb-[1.5rem] font-ThirdHead text-minSubHead">
                        {content.heading}
                      </h3>
                      <ul class="list-disc mt-[1.5rem] space-y-2 md:mb-4 pl-4">
                        {#each content.list as list}
                          <li class="font-Paragraph text-minParaFont">
                            {list}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/each}
                  {#each contents.thirdBox as content}
                    <div class="">
                      <h3 class="mb-[1.5rem] font-ThirdHead text-minSubHead">
                        {content.heading}
                      </h3>
                      <ul class="list-disc space-y-2 mb-4 pl-4">
                        {#each content.list as list}
                          <li class="font-Paragraph text-minParaFont">
                            {list}
                          </li>
                        {/each}
                      </ul>
                      <p class="mb-[1.5rem] font-Paragraph text-subParaFont">
                        {content.para}
                      </p>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          {:else if index == 5}
            <div id="fees" class="bg-white text-black px-[0.5rem] py-[4rem]">
              {#each rates as rate}
                <div class="grid grid-cols-3 gap-[2rem]">
                  <h2
                    class="col-span-3 lg:col-span-1 font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {rate.heading}
                  </h2>

                  <div class="col-span-3 lg:col-span-2">
                    <div class="grid md:grid-cols-2 gap-[2rem]">
                      {#each rate.left as content}
                        <div class="space-y-4">
                          <h3 class="font-ThirdHead text-minSubHead">
                            {content.heading}
                          </h3>
                          <ul class="list-disc pl-4 marker:black space-y-2">
                            {#each content.lists as list}
                              <li class="font-Paragraph text-minParaFont">
                                {list}
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/each}
                      {#each rate.right as content}
                        <div class="space-y-4">
                          <h3 class="font-ThirdHead text-minSubHead">
                            {content.heading}
                          </h3>

                          <ul class="list-disc pl-4 marker:black space-y-2">
                            {#each content.lists as list}
                              <li class="font-Paragraph text-minParaFont">
                                {list}
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else if index == 6}
            <div id="support" class="bg-white text-black px-[0.5rem]">
              <AccordionWithLeftHeading
                contents={{
                  heading: `Frequently asked questions`,
                  accordions: [
                    {
                      question: `What if I don’t have ITRs or profit & loss statements?`,
                      answer: `We can work with alternative documentation, such as: <br/>
                     <ul class="list-disc pl-4">
                        <li>Bank statements showing cash flow.</li>
                        <li>Self-declared income affidavits.</li>
                        <li>Business-related certificates or invoices.</li>
                    </ul>`,
                    },
                    {
                      question: `Can I still apply if my business is less than a year old?`,
                      answer: `Yes! We have solutions tailored for new businesses based on current income and growth potential.`,
                    },
                    {
                      question: `What’s the maximum loan amount I can get?`,
                      answer: `Loan amounts depend on factors like your business cash flow, property value, and lender policies. Our Loan Specialists will help you estimate your eligibility.`,
                    },
                    {
                      question: `Can I combine my home loan with financing for my business?`,
                      answer: `Absolutely! We can help you explore options to combine your home and business loan financing for better management and savings.`,
                    },
                  ],
                }}
              />
              <Guides guide={getStart} />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div class="px-[0.5rem] lg:px-0">
      <TwoColumn
        cardImage="/images/message.jpg"
        cardAltName="housing-figure"
        cardHeading="Why Wait? Let Us Help You Own Your Dream Home!"
      >
        <ul class="grid gap-[2rem] font-Paragraph text-subParaFont" slot="list">
          <li>
            At Digital DSA, we’re committed to making the loan process easier
            for self-employed individuals and business owners from all walks of
            life.
          </li>

          <div class="w-auto">
            <Button
              link="/contact"
              btnBorder="#4F4C4D"
              btnName="Contact us today"
            />
          </div>
        </ul>
      </TwoColumn>
    </div>
    <div slot="secondary" class="">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a home loan specialist at a time that suits you",
              icon: "/icons/appointment.svg",
              altName: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              altName: "Alert Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Fast-track your call and connect with a specialist in the DigitalDSA.",
              icon: "/icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Get instant help from our online assistants  or chat to a specialist.`,
              icon: "/icons/msg.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>
