<script>
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import { applicationData } from "$lib/stores/stores";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import Seo from "./Seo.svelte";

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

  let activeSection = "";

  // end-here

  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
      activeSection = firstSection.id;
    }
  };

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
      activeSection = currentSection;
    }
  };

  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  let zoneTable = [
    {
      columnName: [
        "<div class='flex flex-col lg:flex-row gap-2 items-center'> <img class='h-5' src='/icons/plotOnlyloan.svg' alt='gear icon'>Zone Type </div>",
        "<div class='flex flex-col lg:flex-row gap-2 items-center'> <img class='h-5' src='/icons/accessEnergy.svg' alt='thunder icon'>Zone Color </div>",
        "<div class='flex flex-col lg:flex-row gap-2 items-center'> <img class='h-5' src='/icons/features.svg' alt='gear icon'>Construction Allowed </div>",
        "<div class='flex flex-col lg:flex-row gap-2 items-center'> <img class='h-5' src='/icons/plotLoans.svg' alt='loan icon'>Maximum Built-up Area (FSI) </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/agriZone.svg' alt='purpose icon'>Agricultural Zone </span>":
            ["Green", "Only farm-related structures", "10%–15% of total area"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/residential.svg' alt='residential icon'>Residential Zone</span>":
            [
              "Yellow",
              "Houses, apartments, small commercial units",
              "1.0 – 3.5 (varies by city)",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/bt-2.svg' alt='commercial icon'>Commercial Zone	</span>":
            [
              "Blue",
              "Shops, offices, hotels, business spaces	",
              "Higher than residential zones",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/constructionTable.svg' alt='construction icon'>Industrial Zone</span>":
            [
              "Purple",
              "Factories, warehouses, and industrial units",
              "Based on local regulations",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/problem.svg' alt='problem icon'>Restricted Zone</span>":
            ["Red", "No construction allowed", "Not Applicable"],
        },
      ],
    },
  ];
</script>

<Seo
  type="WebPage"
  title="Agricultural to Residential Land Conversion Process & Costs"
  image= "/images/residential-land-blog.jpg"
  description="Convert agricultural land to residential property. Learn about zoning laws, approval process, costs, financing options, and key challenges."
  keywords="Agricultural to residential land conversion, Land conversion process, Convert farmland to residential, Zoning laws for land conversion, Land use change approval, Residential land conversion fees, Plot loan for land conversion, Financing options for land conversion, Land conversion challenges, No Objection Certificate for land conversion"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/residential-land-blog.jpg",
      coverAlt: "hero-cover",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[60svh]",
      heading: "Agricultural to residential land conversion",
      actionBtns: [
        {
          btnName: "Book appointment",
          btnLink: "/appointment",
        },
        {
          btnName: "Compare rates",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
          btnClick: () => {
            ($applicationData.LoanName = "Plot Loan"),
              ($applicationData.LoanType = "Plot Loan Only");
          },
        },
      ],
      para: `Transforming agricultural land into residential property opens new opportunities but comes with legal and financial challenges. This guide covers the approval process, zoning laws, costs, and key steps to help you navigate the transition smoothly.`,
    }}
  >
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Importance & benefits",
              targetId: `benefits`,
            },
            {
              name: "Land conversion process",
              targetId: `process`,
            },
            {
              name: "Challenges & finances",
              targetId: `challenges`,
            },
            {
              name: "Tools & calculators",
              targetId: `tools`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare rates",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                ($applicationData.LoanName = "Plot Loan"),
                  ($applicationData.LoanType = "Plot Loan Only");
              },
            },
          ],
        }}
        {activeSection}
      />

      <div id="benefits" data-section="features" class="section">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Importance & benefits of land conversion",
            cardData: [
              {
                title: "Higher land value & profitability",
                para: `Converting agricultural land into residential property increases its market value, making it a more profitable investment. Owners can sell or lease the land at better rates, maximizing financial returns.`,
              },
              {
                title: "Meeting housing & urbanization needs",
                para: `With rising urbanization, residential land is in high demand. Converting land helps address housing shortages and supports planned development, ensuring better living conditions.`,
              },
              {
                title: "Improved Infrastructure & Public Services",
                para: `Residential areas attract better infrastructure, including roads, electricity, water, and sanitation. Governments and private developers invest in essential services like schools and hospitals, improving overall quality of life.`,
              },
              {
                title: "Economic Growth & Employment Opportunities",
                para: `The conversion process creates jobs in construction, real estate, and local businesses. New residential areas also boost commercial activity, contributing to economic growth.`,
              },
            ],
          }}
        />
        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="space-y-[3rem]">
            <h2
              class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
            >
              Key Factors to Consider Before <br />
              <span
                class="underline decoration-4 underline-offset-4 decoration-btnBg"
                >Building on Agricultural Land</span
              >
            </h2>

            <ul class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <li>
                <div class="space-y-3">
                  <h3 class="font-ThirdHead text-minSubHead">
                    1. Zoning & Land Use Regulations
                  </h3>
                  <ul class="list-disc font-para text-subParaFont ml-[2rem]">
                    <li>
                      Check local zoning laws to see if the land is designated
                      for agricultural use only.
                    </li>
                    <li>Understand the process for rezoning if needed.</li>
                  </ul>
                </div>
              </li>
              <li>
                <div class="space-y-3">
                  <h3 class="font-ThirdHead text-minSubHead">
                    2. Land Conversion Process
                  </h3>
                  <ul class="list-disc font-para text-subParaFont ml-[2rem]">
                    <li>
                      Research the legal requirements to convert agricultural
                      land to residential or commercial use.
                    </li>
                    <li>Get necessary approvals from local authorities.</li>
                  </ul>
                </div>
              </li>
              <li>
                <div class="space-y-3">
                  <h3 class="font-ThirdHead text-minSubHead">
                    3. Environmental Impact & Restrictions
                  </h3>
                  <ul class="list-disc font-para text-subParaFont ml-[2rem]">
                    <li>Check for protected ecosystems or wildlife zones.</li>
                    <li>Ensure compliance with environmental regulations.</li>
                  </ul>
                </div>
              </li>
              <li>
                <div class="space-y-3">
                  <h3 class="font-ThirdHead text-minSubHead">
                    4. Infrastructure & Accessibility
                  </h3>
                  <ul class="list-disc font-para text-subParaFont ml-[2rem]">
                    <li>
                      Assess road access and proximity to essential services.
                    </li>
                    <li>Ensure compliance with transportation regulations.</li>
                  </ul>
                </div>
              </li>
              <li>
                <div class="space-y-3">
                  <h3 class="font-ThirdHead text-minSubHead">
                    5. Community & Legal Challenges
                  </h3>
                  <ul class="list-disc font-para text-subParaFont ml-[2rem]">
                    <li>
                      Be aware of objections from local communities or
                      authorities.
                    </li>
                    <li>
                      Understand legal risks involved in unauthorized
                      construction.
                    </li>
                  </ul>
                </div>
              </li>
            </ul>
            <div class="">
              {#each zoneTable as tableData}
                <PaymentTable {tableData} />
              {/each}
            </div>
          </div>
        </div>
      </div>
      <div id="process" data-section="process" class="section">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/buildingHome-cover.jpg",
            cardAltName: "housing-figure",
            cardHeading: "Land conversion process",
          }}
        >
          <div class="font-Paragraph text-minParaFont">
            <ul class="list-disc space-y-4">
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <p class="font-para text-subParaFont">
                  <span class="font-FourthHead">Check Zoning Regulations –</span
                  > Before initiating the conversion process, verify the land’s zoning
                  status in the revenue records. The local development authority
                  or municipal corporation determines land use based on master plans.
                </p>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <p class="font-para text-subParaFont">
                  <span class="font-FourthHead"
                    >Obtain No Objection Certificate (NOC) –</span
                  >A No Objection Certificate (NOC) may be required from various
                  departments, including:
                  <br />
                  <span class="font-FourthHead">Revenue Department – </span>To
                  confirm ownership and land classification.
                  <br />
                  <span class="font-FourthHead"
                    >Agricultural Department –
                  </span>To verify if the land can be converted.
                  <br />
                  <span class="font-FourthHead"
                    >Local Municipality or Panchayat –
                  </span>To ensure alignment with development plans.
                </p>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <p class="font-para text-subParaFont">
                  <span class="font-FourthHead"
                    >Apply for Land Conversion –
                  </span>
                  Submit an application to the local revenue authority (e.g., Tehsildar,
                  District Collector, or Town Planning Department) along with the
                  necessary documents:
                  <br />
                  <span class="font-FourthHead"
                    >Title deed of the land, <br /> Sale deed (if applicable),
                    <br />
                    Land records and tax receipts, <br /> Copy of zoning
                    certificate, <br />Develop ment plan or layout proposal</span
                  >
                </p>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <p class="font-para text-subParaFont">
                  <span class="font-FourthHead">Pay Conversion Fees – </span> The
                  state government charges a land conversion fee, which varies by
                  state and location. Fees are based on the land area and the difference
                  in land use categories.
                </p>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <p class="font-para text-subParaFont">
                  <span class="font-FourthHead"
                    >Inspection and Verification –
                  </span> Government officials inspect the land to ensure that conversion
                  aligns with local zoning laws and that there are no environmental
                  concerns.
                </p>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <p class="font-para text-subParaFont">
                  <span class="font-FourthHead"
                    >Issuance of Conversion Order –
                  </span>
                  Once approved, the revenue authority issues an official
                  <span class="font-FourthHead"
                    >Land Conversion Certificate</span
                  >
                  or
                  <span class="font-FourthHead"
                    >Change of Land Use (CLU) certificate</span
                  >, legally reclassifying the land.
                </p>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <p class="font-para text-subParaFont">
                  <span class="font-FourthHead">Update Land Records – </span>
                  After conversion, update the records at the revenue office to reflect
                  the new land use in official documents like the
                  <span class="font-FourthHead">Record of Rights (ROR)</span>
                  and
                  <span class="font-FourthHead">mutation records</span>.
                </p>
              </li>
            </ul>
          </div>
        </TwoColumnWithImage>

        <TwoColumnWithLeftHeading
          contents={{
            heading: "Turn Your vision into reality",

            secHeading: "Fund Your Construction or Refinance Smartly",
            secPara:
              "Compare interest rates and explore the latest construction loan and balance transfer offers. Get the best deal with flexible terms and expert guidance.",
            btnName: "Secure best offer",
            btnLink: "/get-started/how-can-we-help",
            btnColor: "#ffcc00",
            btnClick: () => {
              ($applicationData.LoanName = "Plot Loan"),
                ($applicationData.LoanType = "Construction Loan Only");
            },
          }}
        />
      </div>

      <div id="challenges" data-section="challenges" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Challenges during <br> Land Conversion`,
            list: [
              {
                heading: `Slow government approvals–`,
                desc: `
                    Lengthy approval processes with multiple government departments.
                    <br>
                    Frequent rejections due to minor documentation errors.
                    `,
              },
              {
                heading: `Demand for Extra Money–`,
                desc: `Officials may demand bribes to expedite approvals.
                    <br>
                    Middlemen often exploit landowners by promising faster conversions.`,
              },
              {
                heading: `Unauthorized Agents & Scams–`,
                desc: `Fake consultants offering guaranteed land conversion for hefty fees.
                    <br>
                    Selling agricultural land as “convertible” without legal approval.`,
              },
              {
                heading: `Conversion Fee Frauds–`,
                desc: `Misrepresentation of official fees by intermediaries.
                    <br>
                    Extra charges levied without government authorization.`,
              },
              {
                heading: `Land Mafia & Illegal Conversions–`,
                desc: `Organized groups illegally converting land and selling plots without approvals.
                    <br>
                    Risk of demolition or legal action against buyers of such properties.`,
              },
            ],
            listUrl: {
              url: "/plot-loan/plot-only-loan-challenges",
              linkName: "👉 Learn More About Plot Challenges",
            },
          }}
        />

        <!-- financial support -->
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Financing Options for Land Conversion`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Private Financing & NBFC Loans",
                para: `<a href="/plot-loan/plot-only-loan-challenges#alternate">Non-Banking Financial Companies (NBFCs)</a> and private lenders provide flexible financing with less documentation.
                    <br>
                    Interest rates may be higher compared to traditional bank loans.
                    ​​`,
              },
              {
                heading: "Personal Loans",
                para: `<a href="/personal-loan" class="decoration-underline underline-offset-4">Personal loans</a> that can be used for any purpose, including land conversion.
                    <br>
                    Interest rates are higher than secured loans.
                    <br>
                    Best for small conversion costs.
                    `,
              },
              {
                heading: "Loan Against Property (LAP)​",
                para: `You can use an existing property (land, house, or commercial building) as collateral by applying for <a href="/lap">LAP from digitalDSA</a>.
                    <br>
                    Lower interest rates compared to personal loans.
                    <br>
                    Suitable for large-scale conversions or development projects.
                    `,
              },
              {
                heading: "Construction Loan​",
                para: `If conversion is for residential or commercial development, a <a href="/plot-loan/construction-loan">construction loan</a> can help finance the project.
                    <br>
                    Requires prior land conversion approval.
                    `,
              },
            ],
          }}
        />

        <!-- if denied -->
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Alternative Options If Land Conversion Is Denied`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Reapply or Appeal",
                para: `Identify the reason for rejection, correct errors, and submit a fresh application or appeal with the land authority.`,
                icon: "/icons/nbfc.svg",
                altName: "home-icon",
              },
              {
                heading: "Lease for Permitted Use",
                para: `Use the land for farmhouses, eco-tourism, agricultural storage, or solar/wind projects without conversion.`,
                icon: "/icons/bt-2.svg",
                altName: "negotiate-icon",
              },
              {
                heading: "Apply for Special Permissions",
                para: `Check if mixed-use land approvals or partial conversions are allowed under local policies.`,
                icon: "/icons/lap.svg",
                altName: "phoneConnection-icon",
              },
              {
                heading: "Sell to Eligible Buyers",
                para: `Sell the land to farmers, agri-businesses, or developers with long-term plans for rezoning.`,
                icon: "/icons/goldLoan.svg",
                altName: "contact-icon",
              },

              {
                heading: "Partner for Agricultural Use",
                para: `Collaborate with agri-businesses, organic farming projects, or contract farming companies for profitable land use.​`,
                icon: "/icons/peoples.svg",
                altName: "inte-icon",
              },
              {
                heading: "Buy Already Converted Land",
                para: `Avoid conversion issues by purchasing land that is legally classified as residential, ensuring hassle-free ownership.`,
                icon: "/icons/plotLoans.svg",
                altName: "offers-icon",
              },
            ],
          }}
        />
      </div>

      <div id="tools" data-section="tools" class="section">
        <!-- money map -->
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Smart savings calculators – Plan your future with confidence`,
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Know How Long Your Savings Will Last",
                para: `Determine how many years your savings can support your lifestyle.`,
                icon: "/icons/clock.svg",
                altName: "clock-icon",
                linkName: "Check Your Savings Longevity",
                url: "/money-map/how-long-will-your-savings-support-you",
              },
              {
                heading: "Track Your Progress Towards Your Goal​",
                para: `Estimate the time required to reach your financial milestones.`,
                icon: "/icons/phoneConnection.svg",
                altName: "phoneConnection-icon",
                linkName: "Plan Your Savings Journey",
                url: "/money-map/how-long-will-it-take-to-save",
              },
              {
                heading: "Set a Target for Retirement Savings​​",
                para: `Calculate the amount needed for a secure and comfortable retirement.`,
                icon: "/icons/negotiate.svg",
                altName: "negotiate-icon",
                linkName: "Plan Your Retirement Fund",
                url: "/money-map/how-much-to-save-by-retirement",
              },
              {
                heading: "Grow Your Savings with Consistency​",
                para: `See how regular contributions can maximize your savings over time.`,
                icon: "/icons/coinHouse.svg",
                altName: "coinHouse-icon",
                linkName: "Calculate Your Future Savings",
                url: "/money-map/how-much-can-i-save-with-regular-contributions",
              },
            ],
          }}
        />
        <AboveTitleWithBlackCard
          contents={{
            heading: "Plot loan calculator",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "How much can I borrow?",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/eligibility-calculator",
              },
              {
                heading: "Plot loan repayments calculator",
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/planners/part-payment-planner",
              },
              {
                heading: "Stamp duty calculator",
                icon: "/icons/apply.svg",
                iconAltName: "icons-apply",
                url: "/calculators/stamp-duty-calculator",
              },
              {
                heading: "Balance transfer calculator",
                icon: "/icons/calc.svg",
                iconAltName: "icons-calc",
                url: "/calculators/balance-transfer-calculator",
              },
            ],
          }}
        />
        <ButtonBanner
          contents={{
            heading: `Ways to pay off your plot loan faster`,
            para: `Small changes now can mean big differences later to how much of your plot loan you end up repaying.`,
            btnName: `Find out how`,
            btnBorder: `#4F4C4D`,
            btnLink: "/planners/both",
          }}
        />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Importance & benefits", "Land conversion process", "Challenges & finances", "Tools & calculators"] as list, index}
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
            <div id="benefits" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Importance & benefits of land conversion",
                  cardData: [
                    {
                      title: "Higher land value & profitability",
                      para: `Converting agricultural land into residential property increases its market value, making it a more profitable investment. Owners can sell or lease the land at better rates, maximizing financial returns.`,
                    },
                    {
                      title: "Meeting housing & urbanization needs",
                      para: `With rising urbanization, residential land is in high demand. Converting land helps address housing shortages and supports planned development, ensuring better living conditions.`,
                    },
                    {
                      title: "Improved Infrastructure & Public Services",
                      para: `Residential areas attract better infrastructure, including roads, electricity, water, and sanitation. Governments and private developers invest in essential services like schools and hospitals, improving overall quality of life.`,
                    },
                    {
                      title: "Economic Growth & Employment Opportunities",
                      para: `The conversion process creates jobs in construction, real estate, and local businesses. New residential areas also boost commercial activity, contributing to economic growth.`,
                    },
                  ],
                }}
              />

              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="space-y-[3rem]">
                  <h2
                    class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
                  >
                    Key Factors to Consider Before <br />
                    <span
                      class="underline decoration-4 underline-offset-4 decoration-btnBg"
                      >Building on Agricultural Land</span
                    >
                  </h2>

                  <ul class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <li>
                      <div class="space-y-3">
                        <h3 class="font-ThirdHead text-minSubHead">
                          1. Zoning & Land Use Regulations
                        </h3>
                        <ul
                          class="list-disc font-para text-subParaFont ml-[2rem]"
                        >
                          <li>
                            Check local zoning laws to see if the land is
                            designated for agricultural use only.
                          </li>
                          <li>
                            Understand the process for rezoning if needed.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li>
                      <div class="space-y-3">
                        <h3 class="font-ThirdHead text-minSubHead">
                          2. Land Conversion Process
                        </h3>
                        <ul
                          class="list-disc font-para text-subParaFont ml-[2rem]"
                        >
                          <li>
                            Research the legal requirements to convert
                            agricultural land to residential or commercial use.
                          </li>
                          <li>
                            Get necessary approvals from local authorities.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li>
                      <div class="space-y-3">
                        <h3 class="font-ThirdHead text-minSubHead">
                          3. Environmental Impact & Restrictions
                        </h3>
                        <ul
                          class="list-disc font-para text-subParaFont ml-[2rem]"
                        >
                          <li>
                            Check for protected ecosystems or wildlife zones.
                          </li>
                          <li>
                            Ensure compliance with environmental regulations.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li>
                      <div class="space-y-3">
                        <h3 class="font-ThirdHead text-minSubHead">
                          4. Infrastructure & Accessibility
                        </h3>
                        <ul
                          class="list-disc font-para text-subParaFont ml-[2rem]"
                        >
                          <li>
                            Assess road access and proximity to essential
                            services.
                          </li>
                          <li>
                            Ensure compliance with transportation regulations.
                          </li>
                        </ul>
                      </div>
                    </li>
                    <li>
                      <div class="space-y-3">
                        <h3 class="font-ThirdHead text-minSubHead">
                          5. Community & Legal Challenges
                        </h3>
                        <ul
                          class="list-disc font-para text-subParaFont ml-[2rem]"
                        >
                          <li>
                            Be aware of objections from local communities or
                            authorities.
                          </li>
                          <li>
                            Understand legal risks involved in unauthorized
                            construction.
                          </li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                  <div class="">
                    {#each zoneTable as tableData}
                      <PaymentTable {tableData} />
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          {:else if index == 1}
            <div id="process" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/buildingHome-cover.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "Land conversion process",
                }}
              >
                <div class="font-Paragraph text-minParaFont">
                  <ul class="list-disc space-y-4">
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <p class="font-para text-subParaFont">
                        <span class="font-FourthHead"
                          >Check Zoning Regulations –</span
                        > Before initiating the conversion process, verify the land’s
                        zoning status in the revenue records. The local development
                        authority or municipal corporation determines land use based
                        on master plans.
                      </p>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <p class="font-para text-subParaFont">
                        <span class="font-FourthHead"
                          >Obtain No Objection Certificate (NOC) –</span
                        >A No Objection Certificate (NOC) may be required from
                        various departments, including:
                        <br />
                        <span class="font-FourthHead"
                          >Revenue Department –
                        </span>To confirm ownership and land classification.
                        <br />
                        <span class="font-FourthHead"
                          >Agricultural Department –
                        </span>To verify if the land can be converted.
                        <br />
                        <span class="font-FourthHead"
                          >Local Municipality or Panchayat –
                        </span>To ensure alignment with development plans.
                      </p>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <p class="font-para text-subParaFont">
                        <span class="font-FourthHead"
                          >Apply for Land Conversion –
                        </span>
                        Submit an application to the local revenue authority (e.g.,
                        Tehsildar, District Collector, or Town Planning Department)
                        along with the necessary documents:
                        <br />
                        <span class="font-FourthHead"
                          >Title deed of the land, <br /> Sale deed (if
                          applicable),
                          <br />
                          Land records and tax receipts, <br /> Copy of zoning
                          certificate, <br />Develop ment plan or layout
                          proposal</span
                        >
                      </p>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <p class="font-para text-subParaFont">
                        <span class="font-FourthHead"
                          >Pay Conversion Fees –
                        </span> The state government charges a land conversion fee,
                        which varies by state and location. Fees are based on the
                        land area and the difference in land use categories.
                      </p>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <p class="font-para text-subParaFont">
                        <span class="font-FourthHead"
                          >Inspection and Verification –
                        </span> Government officials inspect the land to ensure that
                        conversion aligns with local zoning laws and that there are
                        no environmental concerns.
                      </p>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <p class="font-para text-subParaFont">
                        <span class="font-FourthHead"
                          >Issuance of Conversion Order –
                        </span>
                        Once approved, the revenue authority issues an official
                        <span class="font-FourthHead"
                          >Land Conversion Certificate</span
                        >
                        or
                        <span class="font-FourthHead"
                          >Change of Land Use (CLU) certificate</span
                        >, legally reclassifying the land.
                      </p>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <p class="font-para text-subParaFont">
                        <span class="font-FourthHead"
                          >Update Land Records –
                        </span>
                        After conversion, update the records at the revenue office
                        to reflect the new land use in official documents like the
                        <span class="font-FourthHead"
                          >Record of Rights (ROR)</span
                        >
                        and
                        <span class="font-FourthHead">mutation records</span>.
                      </p>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>

              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Turn Your vision into reality",

                  secHeading: "Fund Your Construction or Refinance Smartly",
                  secPara:
                    "Compare interest rates and explore the latest construction loan and balance transfer offers. Get the best deal with flexible terms and expert guidance.",
                  btnName: "Secure best offer",
                  btnLink: "/get-started/how-can-we-help",
                  btnColor: "#ffcc00",
                  btnClick: () => {
                    ($applicationData.LoanName = "Plot Loan"),
                      ($applicationData.LoanType = "Construction Loan Only");
                  },
                }}
              />
            </div>
          {:else if index == 2}
            <div id="challenges" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Challenges during <br> Land Conversion`,
                  list: [
                    {
                      heading: `Slow government approvals–`,
                      desc: `
                    Lengthy approval processes with multiple government departments.
                    <br>
                    Frequent rejections due to minor documentation errors.
                    `,
                    },
                    {
                      heading: `Demand for Extra Money–`,
                      desc: `Officials may demand bribes to expedite approvals.
                    <br>
                    Middlemen often exploit landowners by promising faster conversions.`,
                    },
                    {
                      heading: `Unauthorized Agents & Scams–`,
                      desc: `Fake consultants offering guaranteed land conversion for hefty fees.
                    <br>
                    Selling agricultural land as “convertible” without legal approval.`,
                    },
                    {
                      heading: `Conversion Fee Frauds–`,
                      desc: `Misrepresentation of official fees by intermediaries.
                    <br>
                    Extra charges levied without government authorization.`,
                    },
                    {
                      heading: `Land Mafia & Illegal Conversions–`,
                      desc: `Organized groups illegally converting land and selling plots without approvals.
                    <br>
                    Risk of demolition or legal action against buyers of such properties.`,
                    },
                  ],
                  listUrl: {
                    url: "/plot-loan/plot-only-loan-challenges",
                    linkName: "👉 Learn More About Plot Challenges",
                  },
                }}
              />

              <!-- financial support -->
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Financing Options for Land Conversion`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Private Financing & NBFC Loans",
                      para: `<a href="/plot-loan/plot-only-loan-challenges#alternate">Non-Banking Financial Companies (NBFCs)</a> and private lenders provide flexible financing with less documentation.
                    <br>
                    Interest rates may be higher compared to traditional bank loans.
                    ​​`,
                    },
                    {
                      heading: "Personal Loans",
                      para: `<a href="/personal-loan" class="decoration-underline underline-offset-4">Personal loans</a> that can be used for any purpose, including land conversion.
                    <br>
                    Interest rates are higher than secured loans.
                    <br>
                    Best for small conversion costs.
                    `,
                    },
                    {
                      heading: "Loan Against Property (LAP)​",
                      para: `You can use an existing property (land, house, or commercial building) as collateral by applying for <a href="/lap">LAP from digitalDSA</a>.
                    <br>
                    Lower interest rates compared to personal loans.
                    <br>
                    Suitable for large-scale conversions or development projects.
                    `,
                    },
                    {
                      heading: "Construction Loan​",
                      para: `If conversion is for residential or commercial development, a <a href="/plot-loan/construction-loan">construction loan</a> can help finance the project.
                    <br>
                    Requires prior land conversion approval.
                    `,
                    },
                  ],
                }}
              />

              <!-- if denied -->
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Alternative Options If Land Conversion Is Denied`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Reapply or Appeal",
                      para: `Identify the reason for rejection, correct errors, and submit a fresh application or appeal with the land authority.`,
                      icon: "/icons/nbfc.svg",
                      altName: "home-icon",
                    },
                    {
                      heading: "Lease for Permitted Use",
                      para: `Use the land for farmhouses, eco-tourism, agricultural storage, or solar/wind projects without conversion.`,
                      icon: "/icons/bt-2.svg",
                      altName: "negotiate-icon",
                    },
                    {
                      heading: "Apply for Special Permissions",
                      para: `Check if mixed-use land approvals or partial conversions are allowed under local policies.`,
                      icon: "/icons/lap.svg",
                      altName: "phoneConnection-icon",
                    },
                    {
                      heading: "Sell to Eligible Buyers",
                      para: `Sell the land to farmers, agri-businesses, or developers with long-term plans for rezoning.`,
                      icon: "/icons/goldLoan.svg",
                      altName: "contact-icon",
                    },

                    {
                      heading: "Partner for Agricultural Use",
                      para: `Collaborate with agri-businesses, organic farming projects, or contract farming companies for profitable land use.​`,
                      icon: "/icons/peoples.svg",
                      altName: "inte-icon",
                    },
                    {
                      heading: "Buy Already Converted Land",
                      para: `Avoid conversion issues by purchasing land that is legally classified as residential, ensuring hassle-free ownership.`,
                      icon: "/icons/plotLoans.svg",
                      altName: "offers-icon",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="tools" class="bg-white text-black">
              <!-- money map -->
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Smart savings calculators – Plan your future with confidence`,
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Know How Long Your Savings Will Last",
                      para: `Determine how many years your savings can support your lifestyle.`,
                      icon: "/icons/clock.svg",
                      altName: "clock-icon",
                      linkName: "Check Your Savings Longevity",
                      url: "/money-map/how-long-will-your-savings-support-you",
                    },
                    {
                      heading: "Track Your Progress Towards Your Goal​",
                      para: `Estimate the time required to reach your financial milestones.`,
                      icon: "/icons/phoneConnection.svg",
                      altName: "phoneConnection-icon",
                      linkName: "Plan Your Savings Journey",
                      url: "/money-map/how-long-will-it-take-to-save",
                    },
                    {
                      heading: "Set a Target for Retirement Savings​​",
                      para: `Calculate the amount needed for a secure and comfortable retirement.`,
                      icon: "/icons/negotiate.svg",
                      altName: "negotiate-icon",
                      linkName: "Plan Your Retirement Fund",
                      url: "/money-map/how-much-to-save-by-retirement",
                    },
                    {
                      heading: "Grow Your Savings with Consistency​",
                      para: `See how regular contributions can maximize your savings over time.`,
                      icon: "/icons/coinHouse.svg",
                      altName: "coinHouse-icon",
                      linkName: "Calculate Your Future Savings",
                      url: "/money-map/how-much-can-i-save-with-regular-contributions",
                    },
                  ],
                }}
              />
              <AboveTitleWithBlackCard
                contents={{
                  heading: "Plot loan calculator",
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "How much can I borrow?",
                      icon: "/icons/calc.svg",
                      iconAltName: "icon-calc",
                      url: "/calculators/eligibility-calculator",
                    },
                    {
                      heading: "Plot loan repayments calculator",
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/planners/part-payment-planner",
                    },
                    {
                      heading: "Stamp duty calculator",
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",
                      url: "/calculators/stamp-duty-calculator",
                    },
                    {
                      heading: "Balance transfer calculator",
                      icon: "/icons/calc.svg",
                      iconAltName: "icons-calc",
                      url: "/calculators/balance-transfer-calculator",
                    },
                  ],
                }}
              />
              <ButtonBanner
                contents={{
                  heading: `Ways to pay off your plot loan faster`,
                  para: `Small changes now can mean big differences later to how much of your plot loan you end up repaying.`,
                  btnName: `Find out how`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/planners/both",
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <!-- message us  -->
   <TwoColumnWithImage
      contents={{
        cardImage: `/images/message.jpg`,
        cardAltName: `CardCover`,
        cardHeading: `Message us 24/7`,
        sourceName: "DigitalDSA",
        originalSource: "www.digitaldsa.com",
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>
    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a plot loan specialist at a time that suits you",
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
      <ThingsYouShould
        thinkKnow={{
          heading: `Things you should know`,
          paraGraph: [
            `<span class="font-FourthHead">Independent Facilitator:</span> DigitalDSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-FourthHead">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. DigitalDSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-FourthHead">Liability:</span> DigitalDSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and DigitalDSA.`,
            `<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through DigitalDSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
