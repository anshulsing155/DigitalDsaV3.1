<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import { onMount } from "svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import Button from "./Button.svelte";
  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import Seo from "./Seo.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  let activeSection = "";
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
  title="LAP Balance Transfer with Top-up – Lower EMI & Extra Funds"
  image="/images/lap-bt-topup-blog.jpg"
  description="Transfer your LAP to a lower interest rate & get a top-up loan. Reduce EMIs, access extra funds & enjoy better loan terms. Apply now!"
  keywords="LAP Balance Transfer, Loan Against Property Transfer, LAP Balance Transfer with Top-up, Lower Interest Rate LAP, Top-up Loan on Property, Loan Against Property Refinancing, LAP Balance Transfer Benefits, Best LAP Transfer Offers, Extra Funds on LAP Transfer, Lower EMI with LAP Transfer"
/>

<section class="content">
  <NewPageLayout
    pageData={{
      coverImage: "/images/lap-bt-topup-blog.jpg",
      coverAlt: "hero-cover",
      heading: "LAP Balance Transfer with Top-up",
      para: `<p>Transferring your LAP balance with a top-up can provide you with additional funds while potentially lowering your interest rate. This process is straightforward and can offer significant financial benefits.<br> <span class="mt-4"> Take advantage of this opportunity today!</span> </p>`,

      actionBtns: [
        {
          btnName: "Book appointment",
          btnLink: "/appointment",
        },
        {
          btnName: "Compare best rates",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
        },
      ],
    }}
  >
    <!-- desktop view -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "What? & Why?",
              targetId: "what-why",
            },
            {
              name: "Eligibility",
              targetId: "eligibility",
            },
            {
              name: "Process",
              targetId: "process",
            },
            {
              name: "When to opt for",
              targetId: `when-to-opt`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare best rates",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div id="what-why" data-section="what-why">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "What?",
            secPara: `<p>A <strong> Loan Against Property (LAP) Balance Transfer with Top-up</strong> allows you to transfer your existing LAP from one bank to another at a lower interest rate while also availing an additional loan amount (top-up) on the same property.</p>`,
          }}
        />

        <ThreeColumWithLeftHeading
          contents={{
            heading: "Why?",
            cardData: [
              {
                id: "1",
                title: "✅Lower Interest Rates",
                para: "Reduce your monthly EMI burden by transferring to a bank offering better rates.",
              },
              {
                id: "2",
                title: "✅Extra Funds for Your Needs",
                para: "Get additional funds over and above your existing LAP for business expansion, personal needs, or debt consolidation.",
              },
              {
                id: "3",
                title: "✅Extended Tenure Options",
                para: "Reduce EMI burden by restructuring the loan tenure with the new bank.",
              },
              {
                id: "4",
                title: "✅Better Loan Terms",
                para: "Improve terms like foreclosure charges, prepayment flexibility, and documentation ease.",
              },
            ],
          }}
        />

        <ThreeColumWithLeftHeading
          contents={{
            heading: "Key Benefits",
            cardData: [
              {
                id: "1",
                title: "📌Reduced EMI Burden",
                para: "Switching to a lower interest rate can lead to significant savings.",
              },
              {
                id: "2",
                title: "📌High-Value Top-up",
                para: "Depending on property valuation and repayment track record, you can get extra funds.",
              },
              {
                id: "3",
                title: "📌No Restriction on Usage",
                para: "The top-up amount can be used for business, education, home renovation, medical emergencies, etc.",
              },
              {
                id: "4",
                title: "📌Fast Processing",
                para: "If you have a clean repayment history, the new bank will process your transfer & top-up swiftly.",
              },
            ],
          }}
        />
      </div>

      <div id="eligibility" data-section="eligibility">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Eligibility",
            cardData: [
              {
                id: "1",
                title: "✅ Existing LAP",
                para: "Must be with a recognized bank/NBFC.",
              },
              {
                id: "2",
                title: "✅ Good Repayment Track Record",
                para: "No defaults, timely EMI payments.",
              },
              {
                id: "3",
                title: "✅ Sufficient Property Value",
                para: "To support additional top-up amount.",
              },
              {
                id: "4",
                title: "✅ Stable Income Source",
                para: "Salary or business proof required.",
              },
              {
                id: "5",
                title: "✅ Loan-to-Value (LTV)",
                para: "Within the new bank’s policy.",
              },
            ],
          }}
        />

        <ThreeColumWithLeftHeading
          contents={{
            heading: "Documents",
            cardData: [
              {
                id: "1",
                title: "📑 Existing Loan Documents",
                para: "Sanction letter, repayment schedule, outstanding balance statement.",
              },
              {
                id: "2",
                title: "📑 KYC Documents",
                para: "PAN, Aadhaar, passport, or voter ID.",
              },
              {
                id: "3",
                title: "📑 Income Proof",
                para: "Salary slips (for salaried), ITR & bank statements (for self-employed).",
              },
              {
                id: "4",
                title: "📑 Property Documents",
                para: "Sale deed, title deed, mortgage deed, latest valuation report.",
              },
            ],
          }}
        />
      </div>

      <div id="process" data-section="process">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Process",
            list: [
              {
                heading: `<span>Step 1:</span>`,
                desc: `<span>Check the outstanding loan amount & foreclosure charges with the existing lender.</span>`,
              },
              {
                heading: `<span>Step 2:</span>`,
                desc: `<span>Compare new bank offers & check top-up eligibility.</span>`,
              },
              {
                heading: `<span>Step 3:</span>`,
                desc: `<span>Apply with the new lender & submit documents.</span>`,
              },
              {
                heading: `<span>Step 4:</span>`,
                desc: `<span>Property re-evaluation & income assessment by the new bank.</span>`,
              },
              {
                heading: `<span>Step 5:</span>`,
                desc: `<span>New loan approval, existing loan closure, and fund disbursement for top-up.</span>`,
              },
            ],
          }}
        />
      </div>
      <div id="when-to-opt" data-section="when-to-opt">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "When to opt for",
            cardData: [
              {
                id: "1",
                title: "🚀 Lower Interest Rates",
                para: "When you are paying a high interest rate & a new bank is offering lower rates.",
              },
              {
                id: "2",
                title: "🚀 Extra Funds",
                para: "When you need extra funds but don’t want to take a separate loan.",
              },
              {
                id: "3",
                title: "🚀 Increased Property Value",
                para: "When your property value has increased, making you eligible for a top-up.",
              },
              {
                id: "4",
                title: "🚀 Extended Tenure",
                para: "When you need to extend your tenure for lower EMIs.",
              },
            ],
          }}
        />

        <ButtonBanner
          contents={{
            heading: `Need Help Choosing the Right Option?`,
            para: `Compare offers, check eligibility, and apply seamlessly on DigitalDSA! 🚀`,
            btnName: "Check offers",
            btnBorder: `#4F4C4D`,
            btnColor: `#ffcc00`,
            btnLink: "/get-started/how-can-we-help",
          }}
        />
      </div>
    </div>

    <!-- mobile view -->

    <div class="lg:hidden block">
      {#each ["What? & Why?", "Eligibility", "Process", "When to opt for"] as list, index}
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
            <div id="what-why" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "What?",
                  secPara: `<p>A <strong> Loan Against Property (LAP) Balance Transfer with Top-up</strong> allows you to transfer your existing LAP from one bank to another at a lower interest rate while also availing an additional loan amount (top-up) on the same property.</p>`,
                }}
              />

              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Why?",
                  cardData: [
                    {
                      id: "1",
                      title: "✅Lower Interest Rates",
                      para: "Reduce your monthly EMI burden by transferring to a bank offering better rates.",
                    },
                    {
                      id: "2",
                      title: "✅Extra Funds for Your Needs",
                      para: "Get additional funds over and above your existing LAP for business expansion, personal needs, or debt consolidation.",
                    },
                    {
                      id: "3",
                      title: "✅Extended Tenure Options",
                      para: "Reduce EMI burden by restructuring the loan tenure with the new bank.",
                    },
                    {
                      id: "4",
                      title: "✅Better Loan Terms",
                      para: "Improve terms like foreclosure charges, prepayment flexibility, and documentation ease.",
                    },
                  ],
                }}
              />

              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Key Benefits",
                  cardData: [
                    {
                      id: "1",
                      title: "📌Reduced EMI Burden",
                      para: "Switching to a lower interest rate can lead to significant savings.",
                    },
                    {
                      id: "2",
                      title: "📌High-Value Top-up",
                      para: "Depending on property valuation and repayment track record, you can get extra funds.",
                    },
                    {
                      id: "3",
                      title: "📌No Restriction on Usage",
                      para: "The top-up amount can be used for business, education, home renovation, medical emergencies, etc.",
                    },
                    {
                      id: "4",
                      title: "📌Fast Processing",
                      para: "If you have a clean repayment history, the new bank will process your transfer & top-up swiftly.",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="eligibility" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Eligibility",
                  cardData: [
                    {
                      id: "1",
                      title: "✅ Existing LAP",
                      para: "Must be with a recognized bank/NBFC.",
                    },
                    {
                      id: "2",
                      title: "✅ Good Repayment Track Record",
                      para: "No defaults, timely EMI payments.",
                    },
                    {
                      id: "3",
                      title: "✅ Sufficient Property Value",
                      para: "To support additional top-up amount.",
                    },
                    {
                      id: "4",
                      title: "✅ Stable Income Source",
                      para: "Salary or business proof required.",
                    },
                    {
                      id: "5",
                      title: "✅ Loan-to-Value (LTV)",
                      para: "Within the new bank’s policy.",
                    },
                  ],
                }}
              />

              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Documents",
                  cardData: [
                    {
                      id: "1",
                      title: "📑 Existing Loan Documents",
                      para: "Sanction letter, repayment schedule, outstanding balance statement.",
                    },
                    {
                      id: "2",
                      title: "📑 KYC Documents",
                      para: "PAN, Aadhaar, passport, or voter ID.",
                    },
                    {
                      id: "3",
                      title: "📑 Income Proof",
                      para: "Salary slips (for salaried), ITR & bank statements (for self-employed).",
                    },
                    {
                      id: "4",
                      title: "📑 Property Documents",
                      para: "Sale deed, title deed, mortgage deed, latest valuation report.",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="process" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Process",
                  list: [
                    {
                      heading: `<span>Step 1:</span>`,
                      desc: `<span>Check the outstanding loan amount & foreclosure charges with the existing lender.</span>`,
                    },
                    {
                      heading: `<span>Step 2:</span>`,
                      desc: `<span>Compare new bank offers & check top-up eligibility.</span>`,
                    },
                    {
                      heading: `<span>Step 3:</span>`,
                      desc: `<span>Apply with the new lender & submit documents.</span>`,
                    },
                    {
                      heading: `<span>Step 4:</span>`,
                      desc: `<span>Property re-evaluation & income assessment by the new bank.</span>`,
                    },
                    {
                      heading: `<span>Step 5:</span>`,
                      desc: `<span>New loan approval, existing loan closure, and fund disbursement for top-up.</span>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="when-to-opt" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "When to opt for",
                  cardData: [
                    {
                      id: "1",
                      title: "🚀 Lower Interest Rates",
                      para: "When you are paying a high interest rate & a new bank is offering lower rates.",
                    },
                    {
                      id: "2",
                      title: "🚀 Extra Funds",
                      para: "When you need extra funds but don’t want to take a separate loan.",
                    },
                    {
                      id: "3",
                      title: "🚀 Increased Property Value",
                      para: "When your property value has increased, making you eligible for a top-up.",
                    },
                    {
                      id: "4",
                      title: "🚀 Extended Tenure",
                      para: "When you need to extend your tenure for lower EMIs.",
                    },
                  ],
                }}
              />

              <ButtonBanner
                contents={{
                  heading: `Need Help Choosing the Right Option?`,
                  para: `Compare offers, check eligibility, and apply seamlessly on DigitalDSA! 🚀`,
                  btnName: "Check offers",
                  btnBorder: `#4F4C4D`,
                  btnColor: `#ffcc00`,
                  btnLink: "/get-started/how-can-we-help",
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage
      contents={{
        cardImage: `/images/message.jpg`,
        cardAltName: `CardCover`,
        cardHeading: `Message us 24/7`,
      }}
    >
      <p>
        Reach out to us anytime for expert guidance on your loan needs. Our team
        is ready to offer professional advice, assist you through the loan
        process, and help you find the best solutions. No matter when you need
        us, we're here to support you! Send us a message, and we’ll respond
        promptly.
      </p>
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <div slot="secondary">
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
      <ThingsYouShould
        thinkKnow={{
          heading: "Things you should know",
          paraGraph: [
            `Interest rates and loan terms are subject to change based on the lender's policies and market conditions.`,
            `Ensure you understand the terms of your loan agreement, including any fees or charges that may apply.`,
            `Consider consulting with a financial advisor to understand the implications of transferring your loan.`,
            `Review the eligibility criteria and required documentation before applying for a loan transfer.`,
            `Be aware of the potential impact on your credit score when applying for new credit or transferring existing loans.`,
          ],
        }}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
