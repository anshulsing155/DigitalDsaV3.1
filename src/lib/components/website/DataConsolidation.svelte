<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import Seo from "./Seo.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { applicationData } from "$lib/stores/stores";
  import { onMount } from "svelte";

  let activeSection = "";
  let navBarMedium = [
    "What is Debt Consolidation?",
    "Benefits",
    "Drawbacks",
    "Is Right for you?",
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
      detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

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

    // //console.log(activeSection, 'active');
  };

  // Initialize the first active section when the component loads
  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
</script>

<Seo
  type="WebPage"
  title="Debt Consolidation in India: Simplify Loans & Lower EMIs"
  image="/images/familyWorkWithSmile.jpg"
  description="Combine multiple loans into one with lower EMIs. Explore personal loans, LAP & balance transfer options for easy debt management in India."
  keywords="Debt consolidation in India, Loan consolidation options, Personal loan for debt consolidation, Balance transfer loan India, Loan against property for debt, Best way to consolidate debt, Lower EMI loan options, Reduce interest on loans, Debt management in India, Digital DSA loan offers"
/>

<section class="content">
  <NewPageLayout
    pageData={{
      coverImage: "/images/familyWorkWithSmile.jpg",
      coverAlt: "hero-cover",
      heading: "What is Debt Consolidation and How Can It Help You?",
      para: `<p>Managing multiple EMIs every month whether it’s for your car, home, or credit card can feel overwhelming. That’s where <strong>debt consolidation</strong> comes in. It allows you to combine all your loans into one, making repayment simpler and often more affordable.
                   <br> Here’s a step-by-step guide tailored for you:
                    </p>`,

      actionBtns: [
        {
          btnName: "Book appointment",
          btnLink: "/appointment",
        },
        {
          btnName: "Check Offers",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
        },
      ],
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "What is Debt Consolidation?",
              targetId: "debtConsolidation",
            },
            {
              name: "Benefits",
              targetId: "benefitConsolidation",
            },
            {
              name: "Drawbacks",
              targetId: "drawbacks",
            },
            {
              name: "Is Right for you?",
              targetId: "isRight",
            },
          ],
          actionBtns: [
            {
              btnName: "Book Appointment",
              btnLink: "/appointment",
              btnColor: "",
            },
            {
              btnName: "Apply Online",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Loan Against Property";
              },
            },
          ],
        }}
        {activeSection}
      />

      <div id="debtConsolidation" data-section="debtConsolidation">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "What is Debt Consolidation?",
            listTopPara: `<p>Debt consolidation is the process of combining multiple loans into a single one. Instead of paying different lenders at varying interest rates and due dates, you’ll only make one monthly payment to your new lender.</p>`,
            list: [
              {
                heading: `How It Works in India:`,
                desc: `<ul class="list-disc list-inside">
                              <li>Apply for a loan (like a personal loan or loan against property) that covers all your existing debts.</li>
                              <li>Use the new loan amount to pay off your current debts.</li>
                              <li>Now, focus on repaying this single loan with a more manageable EMI.</li>
                             </ul>`,
              },
            ],
            listSecPara: `<p>For instance, if you have high-interest credit card dues, a personal loan at a lower interest rate can help you save money.</p>`,
          }}
        />

        <AboveTitleWithoutIconCard
          contents={{
            heading: `Popular Debt Consolidation Options in India`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Personal Loans",
                para: `<strong>What it is :</strong> A common option in India for consolidating debts. These are unsecured loans with flexible repayment terms.
                                     <br><strong>Best For:</strong> Combining credit card debt, personal loans, or overdue EMIs.`,
              },
              {
                heading: "Loan Against Property (LAP)",
                para: `<strong>What it is :</strong> Use your home or property as collateral to get a loan at lower interest rates.
                                     <br><strong>Best For:</strong> Homeowners with significant equity who need a large amount to consolidate multiple debts.`,
              },
              {
                heading: "Balance Transfer of Loans",
                para: `<strong>What it is :</strong> Transfer your existing personal or home loan to another bank offering a lower interest rate. This reduces your EMI burden while consolidating payments.
                                     <br><strong>Best For:</strong> Those who qualify for better terms from a new lender.`,
              },
            ],
          }}
        />
      </div>

      <div id="benefitConsolidation" data-section="benefitConsolidation">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Benefits of Debt Consolidation",
            listTopPara: `<p>Debt consolidation offers several benefits:</p>`,
            list: [
              {
                heading: `a) Simplified Repayments`,
                desc: `Paying one EMI instead of juggling multiple payments reduces stress and the chances of missing deadlines.`,
              },
              {
                heading: `b) Lower Interest Rates`,
                desc: `By consolidating high-interest loans into one with a lower interest rate, you can save a significant amount over time.`,
              },
              {
                heading: `c) Better Cash Flow`,
                desc: `With a lower EMI, you’ll free up funds for other financial goals.`,
              },
              {
                heading: `d) Peace of Mind`,
                desc: `Managing a single loan is less mentally taxing, allowing you to focus on repaying your debt faster.`,
              },
            ],
          }}
        />
      </div>

      <div id="drawbacks" data-section="drawbacks">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Watch Out for These Drawbacks",
            listTopPara: `<p>While debt consolidation has its benefits, be aware of these potential drawbacks:</p>`,
            list: [
              {
                heading: `a) Prepayment Penalties`,
                desc: `Some loans in India come with prepayment or foreclosure charges. Make sure to calculate these before consolidating.`,
              },
              {
                heading: `b) Overborrowing`,
                desc: `It’s tempting to borrow more than you need during consolidation. Stick to what’s necessary to avoid future debt trouble.`,
              },
              {
                heading: `c) Risk with Secured Loans`,
                desc: `If you’re using property as collateral, ensure you have a clear repayment plan to avoid risking your home.`,
              },
            ],
          }}
        />
      </div>

      <div id="isRight" data-section="isRight">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Is Debt Consolidation Right for You?",
            listTopPara: `<p>Debt consolidation can work wonders if:</p>`,
            list: [
              {
                heading: `<p class="font-Paragraph">You’re paying multiple high-interest loans.</p>`,
              },
              {
                heading: `<p class="font-Paragraph">You qualify for a loan with lower interest rates.</p>`,
              },
              {
                heading: `<p class="font-Paragraph">You’re disciplined enough to avoid accumulating new debt.</p>`,
              },
            ],
            listSecPara: `<p>However, it’s not a magic solution. If overspending or poor budgeting caused your debt, it’s important to address those habits too.</p>`,
          }}
        />

        <TwoColumnWithImage
          contents={{
            cardImage: "/images/buildingHome-cover.jpg",
            cardAltName: "housing-figure",
            cardHeading: "Get Started with Debt Consolidation",
          }}
        >
          <div class="font-Paragraph text-minParaFont">
            <p>
              Assess your debts and explore options that fit your needs. Tools
              like our <a
                href="/calculators/affordability-calculator"
                class="underline underline-offset-4 hover:no-underline"
                >Affordability Calculator</a
              >
              and
              <a
                href="/calculators/balance-transfer-calculator"
                class="underline underline-offset-4 hover:no-underline"
                >Balance Transfer Calculator</a
              > can help you figure out how much you’ll save by consolidating your
              debts.
            </p>
            <p class="mt-2 mb-8">
              <strong>Need assistance? </strong>Digital DSA offers expert
              guidance and the best loan offers tailored to your needs.
            </p>
            <Button
              link="/get-started/how-can-we-help"
              btnBorder="#4F4C4D"
              btnColor="#ffcc00"
              btnName="Check Offers"
            />
          </div>
        </TwoColumnWithImage>

        <TwoColumnWithLeftHeading
          contents={{
            heading: "Conclusion: <br>Smart Borrowing, Maximum Impact",
            listSecPara: `<p>Debt consolidation can simplify your finances, save on interest, and reduce stress. But the key to success is choosing the right option and staying disciplined with repayments.</p>`,
            list: [],
          }}
        />
      </div>
    </div>

    <div class="lg:hidden">
      {#each navBarMedium as navBar, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index <
          navBar.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{navBar}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="debtConsolidation" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "What is Debt Consolidation?",
                  listTopPara: `<p>Debt consolidation is the process of combining multiple loans into a single one. Instead of paying different lenders at varying interest rates and due dates, you’ll only make one monthly payment to your new lender.</p>`,
                  list: [
                    {
                      heading: `How It Works in India:`,
                      desc: `<ul class="list-disc list-inside">
                                  <li>Apply for a loan (like a personal loan or loan against property) that covers all your existing debts.</li>
                                  <li>Use the new loan amount to pay off your current debts.</li>
                                  <li>Now, focus on repaying this single loan with a more manageable EMI.</li>
                                 </ul>`,
                    },
                  ],
                  listSecPara: `<p>For instance, if you have high-interest credit card dues, a personal loan at a lower interest rate can help you save money.</p>`,
                }}
              />

              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Popular Debt Consolidation Options in India`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Personal Loans",
                      para: `<strong>What it is :</strong> A common option in India for consolidating debts. These are unsecured loans with flexible repayment terms.
                                         <br><strong>Best For:</strong> Combining credit card debt, personal loans, or overdue EMIs.`,
                    },
                    {
                      heading: "Loan Against Property (LAP)",
                      para: `<strong>What it is :</strong> Use your home or property as collateral to get a loan at lower interest rates.
                                         <br><strong>Best For:</strong> Homeowners with significant equity who need a large amount to consolidate multiple debts.`,
                    },
                    {
                      heading: "Balance Transfer of Loans",
                      para: `<strong>What it is :</strong> Transfer your existing personal or home loan to another bank offering a lower interest rate. This reduces your EMI burden while consolidating payments.
                                         <br><strong>Best For:</strong> Those who qualify for better terms from a new lender.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="benefitConsolidation" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Benefits of Debt Consolidation",
                  listTopPara: `<p>Debt consolidation offers several benefits:</p>`,
                  list: [
                    {
                      heading: `a) Simplified Repayments`,
                      desc: `Paying one EMI instead of juggling multiple payments reduces stress and the chances of missing deadlines.`,
                    },
                    {
                      heading: `b) Lower Interest Rates`,
                      desc: `By consolidating high-interest loans into one with a lower interest rate, you can save a significant amount over time.`,
                    },
                    {
                      heading: `c) Better Cash Flow`,
                      desc: `With a lower EMI, you’ll free up funds for other financial goals.`,
                    },
                    {
                      heading: `d) Peace of Mind`,
                      desc: `Managing a single loan is less mentally taxing, allowing you to focus on repaying your debt faster.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="drawbacks" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Watch Out for These Drawbacks",
                  listTopPara: `<p>While debt consolidation has its benefits, be aware of these potential drawbacks:</p>`,
                  list: [
                    {
                      heading: `a) Prepayment Penalties`,
                      desc: `Some loans in India come with prepayment or foreclosure charges. Make sure to calculate these before consolidating.`,
                    },
                    {
                      heading: `b) Overborrowing`,
                      desc: `It’s tempting to borrow more than you need during consolidation. Stick to what’s necessary to avoid future debt trouble.`,
                    },
                    {
                      heading: `c) Risk with Secured Loans`,
                      desc: `If you’re using property as collateral, ensure you have a clear repayment plan to avoid risking your home.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="isRight" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Is Debt Consolidation Right for You?",
                  listTopPara: `<p>Debt consolidation can work wonders if:</p>`,
                  list: [
                    {
                      heading: `<p class="font-Paragraph">You’re paying multiple high-interest loans.</p>`,
                    },
                    {
                      heading: `<p class="font-Paragraph">You qualify for a loan with lower interest rates.</p>`,
                    },
                    {
                      heading: `<p class="font-Paragraph">You’re disciplined enough to avoid accumulating new debt.</p>`,
                    },
                  ],
                  listSecPara: `<p>However, it’s not a magic solution. If overspending or poor budgeting caused your debt, it’s important to address those habits too.</p>`,
                }}
              />

              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/buildingHome-cover.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "Get Started with Debt Consolidation",
                }}
              >
                <div class="font-Paragraph text-minParaFont">
                  <p>
                    Assess your debts and explore options that fit your needs.
                    Tools like our <a
                      href="/calculators/affordability-calculator"
                      class="underline underline-offset-4 hover:no-underline"
                      >Affordability Calculator</a
                    >
                    and
                    <a
                      href="/calculators/balance-transfer-calculator"
                      class="underline underline-offset-4 hover:no-underline"
                      >Balance Transfer Calculator</a
                    > can help you figure out how much you’ll save by consolidating
                    your debts.
                  </p>
                  <p class="mt-2 mb-8">
                    <strong>Need assistance? </strong>Digital DSA offers expert
                    guidance and the best loan offers tailored to your needs.
                  </p>
                  <Button
                    link="/get-started/how-can-we-help"
                    btnBorder="#4F4C4D"
                    btnColor="#ffcc00"
                    btnName="Check Offers"
                  />
                </div>
              </TwoColumnWithImage>

              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Conclusion: <br>Smart Borrowing, Maximum Impact",
                  listSecPara: `<p>Debt consolidation can simplify your finances, save on interest, and reduce stress. But the key to success is choosing the right option and staying disciplined with repayments.</p>`,
                  list: [],
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
      <p class="font-Paragraph text-minParaFont">
        Reach out to us anytime for expert guidance on your loan needs. Our team
        is ready to offer professional advice, assist you through the loan
        process, and help you find the best solutions. No matter when you need
        us, we're here to support you! Send us a message, and we’ll respond
        promptly.
      </p>
      <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
    </TwoColumnWithImage>
    <div slot="secondary">
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
    </div>
  </NewPageLayout>
</section>
