<script>
	let {
		pageData = {
    coverImage: "/images/happy-indian-family-in-kitchen.jpg",
    altName: "indian family enjoying in their kitchen",
    heading: "Should You Buy or Rent? Let’s Find Out Together!",
    para: ` <div class="text-center mt-4">
                        <blockquote class="relative text-gray-800 italic">
                            <span
                                class="text-3xl font-serif absolute left-0 -top-3"
                                >“</span
                            >
                            Home isn’t just a place, it’s a feeling. But should you rent or buy? <br>Let’s explore the right choice for you!
                            <span
                                class="text-3xl font-serif absolute right-0 -bottom-6"
                                >”</span
                            >
                        </blockquote>
                    </div>`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare rates",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
      },
    ],
  }
	} = $props();


  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Button from "./Button.svelte";
  import HelpList from "./HelpList.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import Seo from "./Seo.svelte";
  let activeSection = $state('');

  let firstTableData = [
    {
columnName: [
"<div class='flex gap-2 items-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Feature </div>",
"<div class='flex gap-2 items-center'><img class='h-5' src='/icons/plotLoans.svg' alt='renting icon'> Renting </div>",
"<div class='flex gap-2 items-center'> <img class='h-5' src='/icons/home.svg' alt='buying icon'> Buying </div>",
],
rowData: [
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/loanValue.svg' alt='monthly cost icon'> Monthly Cost </span>":
[
"Fixed rent, often lower than EMIs",
"EMIs, but equity builds over time",
],
},
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='flexibility icon'> Flexibility </span>":
[
"Move anytime, no strings attached",
"Long-term commitment to a location",
],
},
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/taxBenefits.svg' alt='upfront costs icon'> Upfront Costs </span>":
[
"Just a security deposit",
"Down payment, registration, stamp duty",
],
},
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='ownership icon'> Ownership </span>":
[
"No ownership, no asset building",
"You own the property, build equity",
],
},
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/constructionTable.svg' alt='maintenance icon'> Maintenance </span>":
["Covered by the landlord", "Out of pocket (repairs, renovations)"],
},
],
    },
  ];

  // mobile-accordion
  let navBarMedium = [
    "What's right",
    "Compare",
    "Pros & cons",
    "Tools & calculators",
  ];
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
detailsElement.scrollIntoView({
behavior: "smooth",
block: "start",
});
    }, 100);
  };

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
if (rect.top <= 100 && rect.bottom >= 200) {
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

;
</script>

<Seo
  type="WebPage"
  title="Renting vs Buying: Compare Costs & Decide What’s Best"
  image={pageData.coverImage}
  description="Should you rent or buy? Compare costs, pros & cons, and use our tools to find the best option for you. Get expert guidance today!"
  keywords="Rent vs Buy Calculator, Renting vs Buying Pros and Cons, Should I Buy or Rent a Home?, Homeownership vs Renting, Buying a House vs Renting, Renting vs Buying Cost Comparison, Home Loan Affordability Calculator, Down Payment for Buying a House, Real Estate Investment vs Renting, Mortgage vs Rent Cost Analysis"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- desktop view -->

    <div class="hidden lg:block">
      <div>
        <StickyNavbar
          navList={{
            items: [
              {
                name: "What's right",
                targetId: "right",
              },
              {
                name: "Compare",
                targetId: "compare",
              },
              {
                name: "Pros & cons",
                targetId: "prosCons",
              },
              {
                name: "Tools & calculators",
                targetId: "calculators",
              },
            ],
            actionBtns: [
              {
                btnName: "Book appointment",
                btnLink: "/appointment",
              },
              {
                btnName: "Compare rates",
                btnColor: "#ffcc00",
                btnLink: "/get-started/how-can-we-help",
              },
            ],
          }}
          {activeSection}
        ></StickyNavbar>
      </div>

      <div id="right" data-section="right" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "What’s Right for You?",
            listTopPara: `Answer these 3 quick questions to find out!`,
            list: [
              {
                heading: `What’s your current financial situation?`,
                desc: `<ul class="list-decimal list-inside mb-2 mt-2">
                                        <li>Saving for a future home</li>
                                        <li>Ready to invest</li>
                                        <li>Still figuring things out</li>
                                        </ul>`,
              },
              {
                heading: `What’s your lifestyle preference?`,
                desc: `<ul class="list-decimal list-inside mb-2 mt-2">
                                        <li>Flexibility (I want to move easily)</li>
                                        <li>Stability (I love being rooted)</li>
                                        <li>A mix of both</li>
                                        </ul>`,
              },
              {
                heading: `Do you prefer maintaining a home or having someone else take care of it?`,
                desc: `<ul class="list-decimal list-inside mb-2 mt-2">
                                        <li>DIY homeowner vibes!</li>
                                        <li>I’d rather call my landlord.</li>
                                        <li>Not sure yet.</li>
                                        </ul>`,
              },
            ],
          }}
        />
      </div>

      <div id="compare" data-section="compare" class="section">
        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="">
            <h2
              class="grid mb-[4rem] typography-h2 text-text-main text-center"
            >
              <p>Renting vs Buying</p>
              <span
                class="underline decoration-4 underline-offset-4 decoration-btnBg"
                >The Breakdown</span
              >
            </h2>
          </div>
          <div class="">
            {#each firstTableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
          <p class="typography-body-md text-text-light mt-14 text-center">
            💡 <span class="font-semibold mr-2">Fun Fact :</span> Did you know
            the cost of renting may seem lower upfront but adds up over years without
            offering ownership benefits?
          </p>
        </div>

        <div class="mt-[4rem]">
          <p
            class="typography-h2 text-text-main text-center mb-[2rem]"
          >
            Real-Life Scenarios: What Worked for Others
            <br /><span
              class="typography-body-md text-text-light mt-14 text-center"
              >Here’s what people like you did and why</span
            >
          </p>
          <TwoColumnWithImage
            contents={{
              cardImage: "/images/family-with-happy-expressions.jpg",
              cardAltName: "family with happy expressions",
              cardHeading: "The Buyer’s Story",
            }}
          >
            <div class="text-center mt-4">
              <blockquote class="relative text-gray-800 italic">
                <span class="text-4xl font-serif absolute -left-12 -top-3"
                  >“</span
                >
                We were renting for 5 years, paying ₹20,000/month. Buying was a big
                step, but our EMI is now ₹22,500— and every payment builds equity.
                Plus, it’s our home! We have the freedom to renovate and make it
                truly ours. The sense of stability and belonging is unmatched. It’s
                an investment in our future, and we couldn’t be happier with our
                decision.
                <span class="text-4xl font-serif absolute -right-4 -bottom-6"
                  >”</span
                >
              </blockquote>
            </div>
          </TwoColumnWithImage>

                    <TwoColumnWithImage
                        contents={{
                            cardImage: "/images/indian-couple-on-the-park-bench.jpg",
                            cardAltName: "indian couple sitting on the park bench",
                            cardHeading: "The Renter’s Story",
                            reverse: true,
                        }}
                    >
                        <div class="text-center mt-4">
                            <blockquote class="relative text-gray-800 italic">
                                <span
                                    class="text-4xl font-serif absolute -left-8 -top-3"
                                    >“</span
                                >
                                I travel a lot for work, so renting made sense. No
                                maintenance costs, and I can move anywhere anytime.
                                Renting gives me freedom! Plus, I don't have to worry
                                about property taxes or home repairs. It's convenient
                                and fits my lifestyle perfectly.
                                <span
                                    class="text-4xl font-serif absolute -right-2 -bottom-6"
                                    >”</span
                                >
                            </blockquote>
                            <p class="mt-10">
                                <a
                                    class="underline hover:no-underline underline-offset-4"
                                    href="/calculators/affordability-calculator"
                                    >Check Our Affordability Calculator</a
                                >
                            </p>
                        </div>
                    </TwoColumnWithImage>
                </div>

        <TwoColumnWithLeftHeading
          contents={{
            heading: "What About Costs? Breaking Down the Numbers",
            listTopPara: `Wondering what costs are involved? Let’s simplify them:`,
            list: [
              {
                heading: `Renting Costs`,
                desc: `<ul class="list-disc list-inside mb-2 mt-2">
                            <li><span class="font-semibold mr-1">Monthly Rent :</span> Depends on location, property size, and amenities—calculate based on your budget.</li>
                            <li><span class="font-semibold mr-1">Security Deposit :</span> Typically 1-3 months' rent, varying by landlord and city.</li>
                        </ul>`,
              },
              {
                heading: `Buying Costs`,
                desc: `<ul class="list-disc list-inside mb-2 mt-2">
                            <li><span class="font-semibold mr-1">Down Payment :</span> 10-20% of the property value</li>
                            <li><span class="font-semibold mr-1">Registration and Stamp Duty :</span> Varies by state</li>
                            <li><span class="font-semibold mr-1">Maintenance :</span> Annual upkeep and repairs</li>
                        </ul>`,
              },
            ],
            listSecPara: `💡<span class="font-semibold mr-2">Pro Tip : </span>Buying has higher upfront costs, but over time, it can save you money and build wealth.`,
          }}
        />
      </div>
      <div id="prosCons" class="section" data-section="prosCons">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Pros & Cons:<br> Renting vs Buying",
            secPara: `<div class="">


                    <div class="grid md:grid-cols-2">
                    <!-- Renting Section -->
                    <div class="p-5">
                    <h3 class="mb-4 font-semibold typography-body-md">🏠 Renting</h3>
                    <div class="space-y-2">
                        <p class="text-green-600 pb-2">✅ Pros:</p>
                        <ul class="list-disc pl-5 space-y-1">
                        <li>Flexibility to move anytime.</li>
                        <li>Lower upfront costs.</li>
                        <li>No responsibility for repairs.</li>
                        </ul>
                    </div>
                    <div class="my-4 space-y-2">
                        <p class="text-red-600 my-2">❌ Cons:</p>
                        <ul class="list-disc pl-5 space-y-1">
                        <li>No equity built—money spent doesn’t come back.</li>
                        <li>Rent can increase every year.</li>
                        </ul>
                    </div>
                    </div>

                    <!-- Buying Section -->
                    <div class="p-5">
                    <h3 class="mb-4 font-semibold typography-body-md">🏡 Buying</h3>
                    <div class="space-y-2 pb-2">
                        <p class="text-green-600">✅ Pros:</p>
                        <ul class="list-disc pl-5 space-y-1">
                        <li>You own your home no landlord hassles.</li>
                        <li>Equity growth and investment potential.</li>
                        <li>Freedom to renovate or customize.</li>
                        </ul>
                    </div>
                    <div class="mt-4 space-y-2">
                        <p class="text-red-600">❌ Cons:</p>
                        <ul class="list-disc pl-5 space-y-1">
                        <li>High upfront costs (down payment, taxes).</li>
                        <li>Less flexibility—harder to move quickly.</li>
                        </ul>
                    </div>
                    </div>
                    </div>
                    </div>`,
          }}
        />

        <TwoColumnWithLeftHeading
          contents={{
            heading: "Still Unsure? <br>Let’s Make It Easy!",
            listTopPara: `Renting or buying, there’s no one-size-fits-all answer. <br>It depends on:`,
            list: [
              {
                heading: `Your financial situation`,
              },
              {
                heading: `Your lifestyle preferences`,
              },
              {
                heading: `Your long-term goals`,
              },
            ],

            listSecPara: `<div>💡 Want help figuring it out? Explore our tools and guides to make an informed decision! <br>
                
               <p class="mt-8"> <a class="rounded-full border px-[2rem] py-3 typography-body-md text-text-light hover:opacity-90 w-fit text-black bg-btnBg" href="/appointment">Contact Us</a></p>
                
                
                
                </div>`,
          }}
        />
      </div>
      <div data-section="calculators" id="calculators" class="section">
        <AboveTitleWithBlackCard
          contents={{
            heading: "Home loan calculator",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: " How much can I borrow?",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/affordability-calculator",
              },
              {
                heading: " Home loan repayments calculator",
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/planners/part-payment-planner",
              },
              {
                heading: "  Stamp duty calculator",
                icon: "/icons/apply.svg",
                iconAltName: "icons-apply",
                url: "/calculators/stamp-duty-calculator",
              },
              {
                heading: "Calculators & tools?",
                icon: "/icons/calc.svg",
                iconAltName: "icons-calc",
                url: "/home-loan/home-loan-tools-calculator",
              },
            ],
          }}
        />
      </div>
    </div>

    <!-- mobile view -->
    <div class="block lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index === 0}
            <div
              id="right"
              data-section="right"
              class="section bg-white text-black"
            >
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "What’s Right for You?",
                  listTopPara: `Answer these 3 quick questions to find out!`,
                  list: [
                    {
                      heading: `What’s your current financial situation?`,
                      desc: `<ul class="list-decimal list-inside mb-2 mt-2">
                                                <li>Saving for a future home</li>
                                                <li>Ready to invest</li>
                                                <li>Still figuring things out</li>
                                                </ul>`,
                    },
                    {
                      heading: `What’s your lifestyle preference?`,
                      desc: `<ul class="list-decimal list-inside mb-2 mt-2">
                                                <li>Flexibility (I want to move easily)</li>
                                                <li>Stability (I love being rooted)</li>
                                                <li>A mix of both</li>
                                                </ul>`,
                    },
                    {
                      heading: `Do you prefer maintaining a home or having someone else take care of it?`,
                      desc: `<ul class="list-decimal list-inside mb-2 mt-2">
                                                <li>DIY homeowner vibes!</li>
                                                <li>I’d rather call my landlord.</li>
                                                <li>Not sure yet.</li>
                                                </ul>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 1}
            <div
              id="compare"
              data-section="compare"
              class="section bg-white text-black"
            >
              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="">
                  <h2
                    class="grid mb-[4rem] typography-h2 text-text-main text-center"
                  >
                    <p>Renting vs Buying</p>
                    <span
                      class="underline decoration-4 underline-offset-4 decoration-btnBg"
                      >The Breakdown</span
                    >
                  </h2>
                </div>
                <div class="">
                  {#each firstTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
                <p class="typography-body-md text-text-light mt-14 text-center">
                  💡 <span class="font-semibold mr-2">Fun Fact :</span> Did you
                  know the cost of renting may seem lower upfront but adds up over
                  years without offering ownership benefits?
                </p>
              </div>

              <div class="mt-[4rem]">
                <p
                  class="typography-h2 text-text-main text-center mb-[2rem]"
                >
                  Real-Life Scenarios: What Worked for Others
                  <br /><span
                    class="typography-body-md text-text-light mt-14 text-center"
                    >Here’s what people like you did and why</span
                  >
                </p>
                <TwoColumnWithImage
                  contents={{
                    cardImage: "/images/family-with-happy-expressions.jpg",
                    cardAltName: "family with happy expressions",
                    cardHeading: "The Buyer’s Story",
                  }}
                >
                  <div class="md:text-center mt-4">
                    <blockquote class="relative text-gray-800 italic">
                      We were renting for 5 years, paying ₹20,000/month. Buying
                      was a big step, but our EMI is now ₹22,500— and every
                      payment builds equity. Plus, it’s our home! We have the
                      freedom to renovate and make it truly ours. The sense of
                      stability and belonging is unmatched. It’s an investment
                      in our future, and we couldn’t be happier with our
                      decision.
                    </blockquote>
                  </div>
                </TwoColumnWithImage>

                <TwoColumnWithImage
                  contents={{
                    cardImage: "/images/indian-couple-on-the-park-bench.jpg",
                    cardAltName: "indian couple sitting on the park bench",
                    cardHeading: "The Renter’s Story",
                    reverse: true,
                  }}
                >
                  <div class="md:text-center mt-4">
                    <blockquote class="relative text-gray-800 italic">
                      I travel a lot for work, so renting made sense. No
                      maintenance costs, and I can move anywhere anytime.
                      Renting gives me freedom! Plus, I don't have to worry
                      about property taxes or home repairs. It's convenient and
                      fits my lifestyle perfectly.
                    </blockquote>
                    <p class="mt-10">
                      <a
                        href="/calculators/affordability-calculator"
                        class="underline">Check Our Affordability Calculator</a
                      >
                    </p>
                  </div>
                </TwoColumnWithImage>
              </div>

              <TwoColumnWithLeftHeading
                contents={{
                  heading: "What About Costs? Breaking Down the Numbers",
                  listTopPara: `Wondering what costs are involved? Let’s simplify them:`,
                  list: [
                    {
                      heading: `Renting Costs`,
                      desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                    <li><span class="font-semibold mr-1">Monthly Rent :</span> Depends on location, property size, and amenities—calculate based on your budget.</li>
                                    <li><span class="font-semibold mr-1">Security Deposit :</span> Typically 1-3 months' rent, varying by landlord and city.</li>
                                </ul>`,
                    },
                    {
                      heading: `Buying Costs`,
                      desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                    <li><span class="font-semibold mr-1">Down Payment :</span> 10-20% of the property value</li>
                                    <li><span class="font-semibold mr-1">Registration and Stamp Duty :</span> Varies by state</li>
                                    <li><span class="font-semibold mr-1">Maintenance :</span> Annual upkeep and repairs</li>
                                </ul>`,
                    },
                  ],
                  listSecPara: `💡<span class="font-semibold mr-2">Pro Tip : </span>Buying has higher upfront costs, but over time, it can save you money and build wealth.`,
                }}
              />
            </div>
          {:else if index === 2}
            <div
              id="prosCons"
              class="section bg-white text-black"
              data-section="prosCons"
            >
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Pros & Cons:<br> Renting vs Buying",
                  secPara: `<div class="">
                                            <div class="grid md:grid-cols-2">
                                            <!-- Renting Section -->
                                            <div class="">
                                            <h3 class="mb-4 font-semibold typography-body-md">🏠 Renting</h3>
                                            <div class="space-y-2">
                                                <p class="text-green-600 pb-2">✅ Pros:</p>
                                                <ul class="list-disc pl-5 space-y-1">
                                                <li>Flexibility to move anytime.</li>
                                                <li>Lower upfront costs.</li>
                                                <li>No responsibility for repairs.</li>
                                                </ul>
                                            </div>
                                            <div class="mt-4 space-y-2">
                                                <p class="text-red-600 my-2">❌ Cons:</p>
                                                <ul class="list-disc pl-5 space-y-1">
                                                <li>No equity built—money spent doesn’t come back.</li>
                                                <li>Rent can increase every year.</li>
                                                </ul>
                                            </div>
                                            </div>
                        
                                            <!-- Buying Section -->
                                            <div class="">
                                            <h3 class="my-4 font-semibold typography-body-md">🏡 Buying</h3>
                                            <div class="space-y-2 pb-2">
                                                <p class="text-green-600">✅ Pros:</p>
                                                <ul class="list-disc pl-5 space-y-1">
                                                <li>You own your home no landlord hassles.</li>
                                                <li>Equity growth and investment potential.</li>
                                                <li>Freedom to renovate or customize.</li>
                                                </ul>
                                            </div>
                                            <div class="mt-4 space-y-2">
                                                <p class="text-red-600">❌ Cons:</p>
                                                <ul class="list-disc pl-5 space-y-1">
                                                <li>High upfront costs (down payment, taxes).</li>
                                                <li>Less flexibility—harder to move quickly.</li>
                                                </ul>
                                            </div>
                                            </div>
                                            </div>
                                            </div>`,
                }}
              />

              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Still Unsure? <br>Let’s Make It Easy!",
                  listTopPara: `Renting or buying, there’s no one-size-fits-all answer. <br>It depends on:`,
                  list: [
                    {
                      heading: `Your financial situation`,
                    },
                    {
                      heading: `Your lifestyle preferences`,
                    },
                    {
                      heading: `Your long-term goals`,
                    },
                  ],

                  listSecPara: `<div>💡 Want help figuring it out? Explore our tools and guides to make an informed decision! <br>
                        
                       <p class="mt-8"> <a class="rounded-full border px-[2rem] py-3 typography-body-md text-text-light hover:opacity-90 w-fit text-black bg-btnBg" href="/appointment">Contact Us</a></p>
                        
                        
                        
                        </div>`,
                }}
              />
            </div>
          {:else if index === 3}
            <div
              data-section="calculators"
              id="calculators"
              class="section bg-white text-black"
            >
              <AboveTitleWithBlackCard
                contents={{
                  heading: "Home loan calculator",
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: " How much can I borrow?",
                      icon: "/icons/calc.svg",
                      iconAltName: "icon-calc",
                      url: "/calculators/affordability-calculator",
                    },
                    {
                      heading: " Home loan repayments calculator",
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/planners/part-payment-planner",
                    },
                    {
                      heading: "  Stamp duty calculator",
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",
                      url: "/calculators/stamp-duty-calculator",
                    },
                    {
                      heading: "Calculators & tools?",
                      icon: "/icons/calc.svg",
                      iconAltName: "icons-calc",
                      url: "/home-loan/home-loan-tools-calculator",
                    },
                  ],
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage
      contents={{
        cardImage: "/images/message.jpg",
        cardAltName: "housing-figure",
        cardHeading: "Message us 24/7",
        reverse: true,
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
    </TwoColumnWithImage>
    <div slot="secondary" class="px-2">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: false,
          cards: [
            {
              heading: "Know your borrowing power",
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

      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-decimal pl-4 flex flex-col gap-4 px-2">
          <li>
            Renting offers flexibility and lower upfront costs, but you don't
            build equity.
          </li>
          <li>
            Buying requires a significant initial investment, but it allows you
            to build equity over time.
          </li>
          <li>
            Consider your financial situation, lifestyle preferences, and
            long-term goals when deciding between renting and buying.
          </li>
          <li>
            Use our tools and calculators to get a clearer picture of what
            option suits you best.
          </li>
          <li>
            Contact our specialists for personalized advice and support in
            making your decision.
          </li>
          <li>
            Explore our guides to understand the pros and cons of each option in
            detail.
          </li>
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 5rem; /* Adjust this value to match your navbar height */
  }
</style>
