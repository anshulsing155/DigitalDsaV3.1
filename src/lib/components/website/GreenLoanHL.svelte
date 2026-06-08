<script>
  import StickyNavbar from "./StickyNavbar.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import PageDesign from "./PageDesign.svelte";
  import { onMount } from "svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import Button from "./Button.svelte";
  import Payments from "./Payments.svelte";

  let pageData = {
    coverImage: "/images/homeLoanGreenDigital.jpg",
    altName: "images-Green-loan",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[60svh]",
    heroHeading: "Green Loan",
    heroParagraph: `Get the tools to save on energy. Switch to solar with a undefined Green Loan.`,
  };
  let subList = [
    {
      name: "At a glance",
      targetId: `glance`,
    },
    {
      name: "Eligibility",
      targetId: `eligibility`,
    },
    {
      name: "How to apply",
      targetId: `apply`,
    },
    {
      name: "FAQs",
      targetId: `faq`,
    },
  ];
  let navList = [
    {
      actionBtn: [
        {
          firstBtn: "Call +91XXXXXXXXX",
          link: "/contact",
          btnColor: "#ffcc00",
        },
      ],
    },
  ];

  let navBarMedium = ["At a glance", "Eligibility", "How to apply", "FAQs"];
  let head = {
    heading: "Introducing undefined Green Loan",
  };
  let greenLoan = {
    paraGraph: [
      "solar panels",
      "battery packs",
      "solar/heat pump hot water systems",
      "electric vehicle charging stations",
      "switching from gas to electric cooking equipment",
      "enabling components to support solar PV and batteries",
      "smart/connected home products",
      "energy-efficient window treatments",
      "switching from non LED to LED lighting",
      "virtual power plants",
    ],
    subHeading: `A low, secured fixed rate loan with no establishment fee, monthly loan service fee or early repayment fee.`,
    bottomPara: [
      `at the property secured by their eligible undefined home loan or investment home loan.

`,
    ],
  };
  let glance = {
    paraGraph: [
      "solar panels",
      "Low-rate loan to be repaid over 10 years",
      "The flexibility to make additional payments or pay off your loan sooner with no fees or penalties",
      "$0 establishment fee",
      "$0 monthly loan service fees",
      "Borrow from $5,000 to $30,000 to fund the purchase and installation of eligible energy-efficient products",
    ],
    subHeading: "What you’ll get:",
  };
  let consider = {
    paraGraph: [
      "You won’t have access to an offset account, redraw or features like top-ups",
      "Switching and splitting aren’t available for this loan",
      "Total home loan balances (undefined home/investment home loan(s) and undefined Green Loan/undefined Investment Green Loan) must not exceed Loan to Value Ratio (LVR) of 80% (subject to any postcode restrictions)",
    ],
    subHeading: "Things to consider:",
  };
  let eligibleEnergy = {
    paraGraph: [
      "<strong>Solar panels </strong>  with a system size equal to or greater than 6 kilowatts (kW) (and inverter if applicable)",
      "<strong>Battery packs </strong> with a system size equal to or greater than 5 kilowatt-hour (kWh)",
      "<strong>Solar hot water system</strong> with a minimum system size equal to or greater than 250 litres (L)",
      "<strong>Heat pump </strong> hot water system with a system size equal to or greater than 250L",
      "<strong>Electric vehicle charging station(s) </strong>",
      "Switching from gas to electric cooking equipment (products must be all-electric and may include induction cooktop, electric element cooktop, electric oven, electric steam oven)",
      "Enabling components to support solar PV and batteries",
      "Smart/connected home products (for example smart thermostats, hot water control, lighting control, smart plugs for appliances and equipment control, home automation systems for the purpose of improving energy efficiency)",
      "Energy-efficient window treatments",
      "Switching from non-LED to LED lighting",
      "Virtual power plants",
    ],
    subHeading: "Eligible energy-efficient products",
    subPara: [
      `You can use a undefined Green Loan to buy and install one or more of the eligible energy-efficient products listed below.`,
    ],
    bottomPara: [
      `"Solar panels, battery packs and inverters (if applicable) must be purchased from a <a class="text-linkColor underline underline-offset-4"> New Energy Tech</a>  approved seller. The installer must be accredited with <a class="text-linkColor underline underline-offset-4">Solar Accreditation Australia</a> ,`,
      `  <strong>TIP: </strong> It’s important to do some research and spend time finding the right solar retailer and/or installer for your project. Be sure to get multiple quotes and compare them before choosing the right one for you .You can also check out <strong>approved solar retailers near you</strong> `,
      "You can find out more about eligible products in the <strong>FAQs</strong>",
    ],
  };
  let areYouEligible = {
    heading: "Are you eligible?",
    paraGraph: [
      "Has a total undefined home loan balance of $150,000 or more at the time the undefined Green Loan is funded (not including any redraw balances, loans for bridging purposes, Viridian Line of Credit limits, Equity Unlock for Seniors loan or the new undefined Green Loan)",
      "The eligible undefined home loan is secured by the same property as the undefined Green Loan",
      `The total  <a class="underline text-linkColor">Loan to Value Ratio (LVR) </a>  of the existing and/or new undefined home loan(s) or investment home loan(s) plus undefined Green Loan(s) does not exceed 80% (subject to any postcode restrictions)`,
      "The installation address of the eligible small scale renewables matches the address we have listed as security for your undefined Green Loan and undefined home loan or investment home loan (not a commercial property)",
    ],
    subHeading: "What you’ll get:",
    subPara: [
      `You can apply for the undefined Green Loan (personal borrower/s only) provided your new or existing undefined home/investment home loan(s) meets the conditions below:`,
    ],
    bottomPara: [
      `For more information, download the <a class='underline text-linkColor'> undefined Green Loan guide (PDF) </a>.`,
    ],
  };
  let faq = [
    {
      subHeading: "What is an Approved Solar Retailer and how can I find them?",
      subPara: [
        `Approved Solar Retailers meet the consumer protection standards set by the New Energy Tech Consumer Code by demonstrating their commitment to responsible sales and marketing activities and solar industry best practice.`,
        `Find an Approved Solar Retailers near you.`,
      ],
    },
    {
      subHeading: "What is an Approved Solar Retailer and how can I find them?",
      subPara: [
        `Approved Solar Retailers meet the consumer protection standards set by the New Energy Tech Consumer Code by demonstrating their commitment to responsible sales and marketing activities and solar industry best practice.`,
        `Find an Approved Solar Retailers near you.`,
      ],
    },
    {
      subHeading: "What is an Approved Solar Retailer and how can I find them?",
      subPara: [
        `Approved Solar Retailers meet the consumer protection standards set by the New Energy Tech Consumer Code by demonstrating their commitment to responsible sales and marketing activities and solar industry best practice.`,
        `Find an Approved Solar Retailers near you.`,
      ],
    },
    {
      subHeading: "What is an Approved Solar Retailer and how can I find them?",
      subPara: [
        `Approved Solar Retailers meet the consumer protection standards set by the New Energy Tech Consumer Code by demonstrating their commitment to responsible sales and marketing activities and solar industry best practice.`,
        `Find an Approved Solar Retailers near you.`,
      ],
    },
    {
      subHeading: "What is an Approved Solar Retailer and how can I find them?",
      subPara: [
        `Approved Solar Retailers meet the consumer protection standards set by the New Energy Tech Consumer Code by demonstrating their commitment to responsible sales and marketing activities and solar industry best practice.`,
        `Find an Approved Solar Retailers near you.`,
      ],
    },
  ];
  let switchList = [
    {
      num: "1",
      text: `Contact your <a class="underline text-linkColor"> Home Lending Specialist, call us on 13 2224</a>  or visit your nearest branch to confirm your eligibility and complete a undefined Green Loan application.
Make sure you obtain any relevant approvals for strata titled properties before completing the application.`,
    },
    {
      num: "2",
      text: `If you're conditionally pre-approved, source a quote for eligible energy-efficient products from an approved retailer.`,
    },
    {
      num: "3",
      text: `Share the quote with undefined and we’ll let you know when your new undefined Green Loan is approved. You can then instruct your retailer and/or installer to proceed.`,
    },
    {
      num: "4",
      text: `Once installation is complete, sign the final invoice and send it to undefined.`,
    },
    {
      num: "5",
      text: `We’ll pay the invoice directly to the approved installer or into your nominated Direct Debit account for your undefined Green Loan and you’ll be able to see your undefined Green Loan in NetBank and the undefined app.`,
    },
  ];
  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
        `^ Comparison rate calculated on a $30,000 secured loan over a 5-year term. WARNING: Comparison rate is true only for the examples given and may not include all fees and charges. Different terms, fees or other loan amounts might result in a different comparison rate.`,
  `This information has been provided without considering your individual objectives, financial situation or needs. Before making any decisions, you should consider its appropriateness to your circumstances and consider obtaining professional advice.`,
  `Applications are subject to credit approval, satisfactory security and minimum requirements. Full terms and conditions will be set out in our loan offer, if an offer is made. Fees and charges are payable. Interest rates are subject to change.`,
  `Commonwealth Bank of Australia ABN 48 123 123 124, Australian credit licence 234945.`
    ],
  };
  let cardImg1 = "/images/sustainabilityHL.jpg";
  let cardAlt1 = "images-sustainabilityHl";
  let cardHead1 = "Sustainability hub";

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
  // logic for second nav bar which is not working yet
  let activeSection = ""; // Initially no section is active

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

<section>
  <PageDesign {pageData}>
    <div class="px-[2rem] lg:hidden">
        <ThingsYouShould thinkKnow={head}>
            <div
              class="flex flex-col md:flex-row pb-[2rem] gap-[1rem] border-b border-borderColor"
              slot="list"
            >
              <div class="flex items-center gap-1">
                <h4 class="text-[6rem] font-ThirdHead">3.99</h4>
                <div class="flex flex-col items-center justify-center font-FourthHead">
                  <span class="text-[3rem] leading-[3rem]">%</span>
                  <span class="text-[2rem] leading-[2.15rem]">PA</span>
                </div>
              </div>
              <div class="flex flex-col gap-1 justify-center font-Paragraph text-subParaFont">
                <p class="font-FifthHead">10 Year fixed rate and Comparison rate^</p>
                <p>Minimum loan size $5,000. Maximum loan size</p>
                <p>
                  $30,000. 
                  <a class="underline text-linkColor">^Comparison rate warning.</a>
                </p>
              </div>
            </div>
          </ThingsYouShould>
          
          <div class="grid lg:grid-cols-5">
            <div class="col-span-2"></div>
            <div class="col-span-full lg:col-span-3">
              <ThingsYouShould
                thinkKnow={greenLoan}
                disc="list-disc"
                colSpan={5}
              />
            </div>
          </div>
    </div>
    <div class="hidden lg:block">
      <StickyNavbar navList={subList} {activeSection}>
        <div class="  flex gap-4 pr-4">
          {#each navList as lastItem}
            {#if lastItem.actionBtn}
              {#each lastItem.actionBtn as action}
                <div>
                  <Button
                    btnName={action.firstBtn}
                    btnColor={action.btnColor}
                    link={action.link}
                  />
                </div>
              {/each}
            {/if}
          {/each}
        </div>
      </StickyNavbar>
      <div class="px-[2rem] lg:px-[4rem] hidden lg:block">
        <div id="glance" data-section="glance">
          <div >
            <ThingsYouShould thinkKnow={head}>
              <div class="flex pb-[2rem] gap-2 border-b border-borderColor"
              slot="list"
                >
                <div
                class="flex items-center gap-1"
              >
                <h4 class="text-[6rem] font-ThirdHead">3.99</h4>
                <div
                  class="flex flex-col items-center justify-center font-FourthHead"
                >
                  <span class="text-[3rem] leading-[3rem]">%</span>
                  <span class="text-[2rem] leading-[2.15rem]">PA</span>
                </div>
              </div>
                <div class="flex flex-col gap-1  justify-center font-Paragraph text-subParaFont">
                    <p class="font-FifthHead">10 Year fixed rate and Comparison rate^</p>
                    <p>Minimum loan size $5,000. Maximum loan size</p>
                    <p> $30,000. <a class="underline text-linkColor">^Comparison rate warning.</a> </p>
                </div>
              </div>
              
            </ThingsYouShould>
          </div>
          <div class="grid lg:grid-cols-5 border-b">
            <div class="col-span-2"></div>
            <div class="col-span-full lg:col-span-3">
              <ThingsYouShould
                thinkKnow={greenLoan}
                disc="list-disc"
                colSpan={5}
              />
            </div>
          </div>
          <div class="grid lg:grid-cols-5 py-[2rem] border-b">
            <h2
              class="col-span-full lg:col-span-2 font-ThirdHead text-mobSubHead md:col-span-2 md:text-miniHeadFont lg:text-minHeadFont"
            >
              At glance
            </h2>

            <div class="col-span-full lg:col-span-3">
              <div class="border-b">
                <ThingsYouShould
                  thinkKnow={glance}
                  disc="list-disc"
                  colSpan="5"
                />
              </div>
              <div class="border-b">
                <ThingsYouShould
                  thinkKnow={consider}
                  disc="list-disc"
                  colSpan="5"
                />
              </div>
              <div class="">
                <ThingsYouShould
                  thinkKnow={eligibleEnergy}
                  disc="list-disc"
                  colSpan="5"
                />
              </div>
            </div>
          </div>

          <TwoColumn
            cardImage={cardImg1}
            cardAltName={cardAlt1}
            cardHeading={cardHead1}
          >
            <div class="grid gap-4 font-Paragraph text-subParaFont" slot="list">
              <li>
                Check out our range of resources to help you on your journey
                towards a more sustainable life.
              </li>
              <li>
                <a
                  class="text-linkColor underline underline-offset-4"
                  href="/home-loan/green-loan">Visit sustainability hub</a
                >
              </li>
            </div>
          </TwoColumn>
        </div>

        <div id="eligibility" data-section="eligibility"
          class="py-[2rem] border-b border-borderColor"
         
        >
          <ThingsYouShould thinkKnow={areYouEligible} disc="list-disc" />
        </div>

        <div id="apply"    data-section="apply"
          class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5"
        >
          <h3
            class="font-ThirdHead text-mobSubHead md:col-span-2 md:text-miniHeadFont lg:text-minHeadFont"
          >
            How to apply
          </h3>
          <div
            class="grid gap-5 overflow-hidden font-Paragraph text-subParaFont md:col-span-3"
          >
            {#each switchList as list}
              <ul class="flex flex-col gap-4">
                <li>
                  <div class="grid md:grid-cols-9 grid-cols-10 gap-2 lg:gap-0">
                    <span
                      class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]"
                      >{list.num}</span
                    >
                    <p
                      class="md:col-span-8 col-span-5 font-Paragraph text-subParaFont"
                    >
                      {@html list.text}
                    </p>
                  </div>
                </li>
              </ul>
            {/each}
          </div>
        </div>

        <div id="faq" data-section="faq"
          class="grid lg:grid-cols-5 py-[2rem] border-b"
          
        >
          <div class="lg:col-span-2">
            <h2
              class="  font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              FAQs
            </h2>
          </div>

          <div class=" lg:col-span-3 border-b">
            {#each faq as question}
              <div class="border-b border-borderColor">
                <ThingsYouShould
                  thinkKnow={question}
                  disc="list-disc"
                  colSpan={5}
                />
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class=" lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="list-none px-6 py-4"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div class=" bg-white text-black px-[2rem]" id="glance">
                <div class="">
                    
                      
                  <div class="grid lg:grid-cols-5 py-[2rem] border-b">
                    <h2
                      class="col-span-full lg:col-span-2 font-ThirdHead text-mobSubHead md:col-span-2 md:text-miniHeadFont lg:text-minHeadFont"
                    >
                      At glance
                    </h2>
        
                    <div class="col-span-full lg:col-span-3">
                      <div class="border-b">
                        <ThingsYouShould
                          thinkKnow={glance}
                          disc="list-disc"
                          colSpan="5"
                        />
                      </div>
                      <div class="border-b">
                        <ThingsYouShould
                          thinkKnow={consider}
                          disc="list-disc"
                          colSpan="5"
                        />
                      </div>
                      <div class="">
                        <ThingsYouShould
                          thinkKnow={eligibleEnergy}
                          disc="list-disc"
                          colSpan="5"
                        />
                      </div>
                    </div>
                  </div>
        
                  <TwoColumn
                    cardImage={cardImg1}
                    cardAltName={cardAlt1}
                    cardHeading={cardHead1}
                  >
                    <div class="grid gap-4 font-Paragraph text-subParaFont" slot="list">
                      <li>
                        Check out our range of resources to help you on your journey
                        towards a more sustainable life.
                      </li>
                      <li>
                        <a
                          class="text-linkColor underline underline-offset-4"
                          href="/home-loan/green-loan">Visit sustainability hub</a
                        >
                      </li>
                    </div>
                  </TwoColumn>
            </div>
            </div>
          {:else if index == 1}
            <div id="eligibility" class=" bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={areYouEligible} disc="list-disc" />

            </div>
          {:else if index == 2}
            <div class=" bg-white text-black px-[2rem] py-[1rem] flex flex-col  gap-[1rem] " id="apply">
                <h3
                class="font-ThirdHead text-mobSubHead  md:text-miniHeadFont lg:text-minHeadFont"
              >
                How to apply
              </h3>
              <div
                class="grid gap-5 overflow-hidden font-Paragraph text-subParaFont "
              >
                {#each switchList as list}
                  <ul class="flex flex-col gap-4">
                    <li>
                      <div class="grid md:grid-cols-9 grid-cols-6 gap-2 lg:gap-0">
                        <span
                          class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]"
                          >{list.num}</span
                        >
                        <p
                          class="md:col-span-8 col-span-5 font-Paragraph text-subParaFont"
                        >
                          {@html list.text}
                        </p>
                      </div>
                    </li>
                  </ul>
                {/each}
              </div>
            </div>
          {:else if index == 3}
            <div class=" bg-white text-black px-[2rem]" id="disclosure">
                <div class="lg:col-span-2">
                    <h2
                      class="  font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                    >
                      FAQs
                    </h2>
                  </div>
        
                  <div class=" lg:col-span-3 border-b">
                    {#each faq as question}
                      <div class="border-b border-borderColor">
                        <ThingsYouShould
                          thinkKnow={question}
                          disc="list-disc"
                          colSpan={5}
                        />
                      </div>
                    {/each}
                  </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
        <!-- <h2
                  class="font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
              >
                  We're here to help
              </h2> -->
        <ThingsYouShould {thinkKnow}  />
      </div>
  </PageDesign>
</section>

<style>
  details summary .icon-container .faq-icon {
    transition: transform 0.3s ease;
  }

  details[open] summary .icon-container .faq-icon {
    transform: rotate(180deg);
  }
</style>
