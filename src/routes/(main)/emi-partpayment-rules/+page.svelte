<script lang="ts">
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";

  import WhyChoose from "$lib/components/website/WhyChoose.svelte";

  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";

  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";

  import PaymentTable from "$lib/components/website/PaymentTable.svelte";

  import Seo from "$lib/components/Seo.svelte";

  let pageData = {
    coverImage: "/images/bank-rules-for-EMI-change-and-PartPayment.jpg",
    altName: "photo of a young girl pointing finger towards bank rules",
    sourceName: "Freepik",
    originalSource: "www.freepik.com",
    classStyle: "object-cover xl:h-[120svh] 3xl:max-h-[70svh]",
    heading:
      "EMI Increment & Part-Payment Rules in Indian Banks – A Smart Borrower’s Guide",
    heroList: [
      {
        id: 1,
        text: `<p> When taking a loan, most borrowers focus on getting the best interest rate and tenure. However, understanding how <span class="font-FourthHead">EMI increment </span>  and  <span class="font-FourthHead">part-payments </span>  work can help you manage your loan better and even save lakhs in interest! In this blog, we break down these concepts and how they apply to different loan types in India.  </p>`,
      },
    ],
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare now",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
      },
    ],
  };

  let emiIncrement = {
    heading: "What is EMI increment?",
    subPara: [
      "EMI (Equated Monthly Installment) increment refers to increasing your monthly payment amount, helping you pay off your loan faster and reduce interest costs. This can be done under certain conditions set by banks.",
    ],
  };
  let whenToIncreaseEmi = {
    heading: " When to raise EMI? ",
    paraGraph: [
      `<span class="font-FourthHead">Increase in Income</span> – If your salary grows, you can request a higher EMI.`,
      `<span class="font-FourthHead">Step-up EMI Loans</span> – Some banks offer step-up loans where EMIs gradually increase.`,
      `<span class="font-FourthHead">Rising Interest Rates</span> – If your loan is on a floating interest rate, EMI may increase.`,
      `<span class="font-FourthHead">Loan Restructuring</span> – Banks allow EMI increments to reduce tenure and total interest.`,
      `<span class="font-FourthHead">Prepayment Considerations</span> – Some banks allow EMI increments instead of bulk prepayments.`,
    ],
  };

  let benefitsOfEmiIncrement = {
    heading: "Benefits of EMI increment",
    items: [
      {
        id: 1,
        title: "Reduces Total Interest Paid ​",
        desc: `A higher EMI helps you repay the principal faster, lowering the total interest paid over the loan period.`,
        icon: "/icons/inte.svg",
        altName: "interest-icon",
      },
      {
        id: 2,
        title: "Shortens Loan Tenure​​",
        desc: "By increasing your EMI, you can reduce the loan duration, helping you become debt-free sooner.",
        icon: "/icons/negotiate.svg",
        altName: "negotiate-icon",
      },
      {
        id: 3,
        title: "Faster Loan Closure & Better Credit Score​",
        desc: "Early loan repayment improves your credit score, making it easier to secure future loans at better rates.",
        icon: "/icons/clock.svg",
        altName: "clock-icon",
      },
    ],
  };

  let partPayment = {
    heading: "What is Part-Payment?",
    subPara: [
      "A part-payment is when you repay a chunk of your outstanding loan before schedule, reducing the principal amount and lowering either EMI or tenure.",
    ],
  };
  let partPaymentRules = {
    heading: "Part-Payment Rules in Indian Banks",
    subPara: [
      "Most banks allow part-payments, but they come with conditions:",
      `<span class="font-FourthHead">1. Lock-in Period</span> – Some banks require you to complete 6-12 months before making part-payments.`,
      `<span class="font-FourthHead">2.     Minimum Part-Payment Amount</span> – Generally, at least 1-2 EMIs worth.`,
      `<span class="font-FourthHead">3. Prepayment Charges –</span>`,
    ],
    paraGraph: [
      `Floating Rate Loans → No prepayment charges (RBI rule).`,
      `Fixed Rate Loans → May attract 2-4% charges.Tenure vs EMI Adjustment – Choose whether to reduce your EMI or tenure. Frequency Limits – Some banks allow part-payments only once or twice per year.`,
    ],
  };

  let smartBorrowerTips = {
    heading: "Smart Borrower Tips for Loan Management",
    paraGraph: [
      `<span class="font-FourthHead">Opt for Floating Rate Loans</span> – No prepayment charges as per RBI guidelines.`,
      `<span class="font-FourthHead">Negotiate EMI Increments</span> – Helps close your loan faster with lower interest.`,
      `<span class="font-FourthHead">Plan Part-Payments Strategically</span> – Avoid breaking FD or investments if part-payment charges are high.`,
      `<span class="font-FourthHead">Use Bonuses & Windfalls for Prepayments</span> – Annual bonuses, tax refunds, or unexpected income can reduce your loan burden.`,
    ],
  };
  let finalThought = {
    heading: "Final Thoughts",
    subPara: [
      `Understanding EMI increments and part-payments can help you manage your loan wisely and save a significant amount on interest. Before opting for prepayment, always check your bank’s latest policies and ensure there are no hidden charges.

`,
    ],
  };
  let partPaymentLimitTable = [
    {
      columnName: [
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/features.svg' alt='home icon'>Loan Type </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/plotLoans.svg' alt='home icon'> Maximum Part-Payment Allowed </div>",
        "<div class='flex gap-2 items-center justify-center'> <img class='h-5' src='/icons/accessEnergy.svg' alt='home icon'> Other Rule </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='home icon'> Home Loan </span>":
            [
              "Purchase of residential plots",
              "Purchase or construction of a house/apartment",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/constructionTable.svg' alt='home icon'>Construction Requirement</span>":
            [
              "20-25% per year in some banks.",
              "Prepayment allowed after 12 months.",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='home icon'>LAP (Loan Against Property)	</span>":
            [
              "Up to 25% per year in many banks.",
              "Prepayment charges may apply.",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/loanValue.svg' alt='home icon'>Business Loan</span>":
            [
              "Restrictions apply based on lender.",
              "Full pre-closure may be required.",
            ],
        },
      ],
    },
  ];

  let bankWiseEMITable = [
    {
      columnName: [
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/features.svg' alt='home icon'> Bank</div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/plotLoans.svg' alt='home icon'>  Max Part-Payment Limit</div>",
        "<div class='flex gap-2 items-center justify-center'> <img class='h-5' src='/icons/accessEnergy.svg' alt='home icon'> Other Conditions </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/FD.svg' alt='bank icon'>SBI </span>":
            ["No max limit for floating-rate loans.", "No prepayment charges."],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/FD.svg' alt='bank icon'>HDFC</span>":
            ["Max 25% per year.", "Charges 2–4% on fixed-rate loans."],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/FD.svg' alt='bank icon'>ICICI	</span>":
            [
              "Max 25% per year for LAP & personal loans.",
              "Allowed after 12 months.",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/FD.svg' alt='bank icon'>Axis Bank</span>":
            [
              "Max 25% per year for home loans.",
              "2% charge on fixed-rate loans.",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/FD.svg' alt='bank icon'>Kotak</span>":
            [
              "Allowed, but charges apply for fixed-rate loans.",
              "Only after 12 months.",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/FD.svg' alt='bank icon'>Bajaj Finserv</span>":
            [
              "20% per year for personal loans.",
              "₹1,000-₹2,000 charges apply.",
            ],
        },
      ],
    },
  ];

  let help = [
    {
      Heading: "Book an  appointment",
      paragraph:
        "Book instantly to speak to a loan specialist at a time that suits you",
      icon: "/icons/appointment.svg",
      altTitle: "appointment Icon",
      link: "/appointment",
    },
    {
      Heading: "Check loan offers",
      paragraph:
        "In as little as 10 minutes and tailored exactly as per your financial profile.",
      icon: "/icons/manageLoan2.svg",
      altTitle: "Alert Icon",
      link: "/get-started/how-can-we-help",
    },
    {
      Heading: "Contact us",
      paragraph:
        "Fast-track your call and connect with a specialist in the DigitalDSA.",
      icon: "/icons/contact.svg",
      altTitle: "Alert Icon",
      link: "/contact",
    },
    {
      Heading: "Message us",
      paragraph: `Get instant help from our online assistants  or chat to a specialist.`,
      icon: "/icons/msg.svg",
      altTitle: "Alert Icon",
      link: "/contact",
    },
  ];

  let navBarMedium = [
    "About EMI",
    "About part-payment",
    "What's next?",
    "Loan tips",
  ];

  const toggleDropdown = (event: any, index: any) => {
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
  title="EMI & Part-Payment Rules in India – Save Loan Interest"
  image="/images/bank-rules-for-EMI-change-and-PartPayment.jpg"
  description="Learn EMI increment & part-payment tips to reduce loan interest, shorten tenure & manage loans better. A must-read for smart borrowers in India."
  keywords="EMI increment rules India, part-payment rules Indian banks, home loan prepayment tips, reduce loan interest India, floating vs fixed rate loan, EMI management tips, SBI HDFC ICICI EMI rules, smart borrower guide India, how to save on home loan interest, loan repayment strategy India"
/>

<section class=" mx-auto w-full">
  <NewPageLayout {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "About EMI",
              targetId: `emi`,
            },
            {
              name: "About part-payment",
              targetId: `partPayment`,
            },
            {
              name: "What's next?",
              targetId: `table`,
            },
            {
              name: "Loan tips",
              targetId: `tips`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare now",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div class="px-[2rem] lg:px-[4rem]">
        <div id="emi" data-section="emi">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={emiIncrement} disc={"list-disc"} />
          </div>

          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={whenToIncreaseEmi} disc={"list-disc"} />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <WhyChoose facilities={benefitsOfEmiIncrement} />
          </div>
        </div>

        <div id="partPayment" data-section="partPayment">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={partPayment} disc={"list-disc"} />
          </div>
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={partPaymentRules} disc={"list-disc"} />
          </div>
        </div>
        <div id="table" data-section="table">
          <div
            class="flex flex-col xl:grid grid-cols-5 gap-[3rem] pt-[4rem] pb-[8rem] border-b border-[var(--form-border)] text-black dark:text-white"
          >
            <div class=" col-span-2">
              <h2
                class="grid mb-[1.5rem] typography-h2 text-black dark:text-white"
              >
                Maximum Part-Payment Limits in Indian Banks
              </h2>
            </div>
            <div class="col-span-3">
              {#each partPaymentLimitTable as tableData}
                <PaymentTable {tableData} />
              {/each}
            </div>
          </div>

          <div
            class="flex flex-col xl:grid grid-cols-5 gap-[3rem] pt-[4rem] pb-[8rem] border-b border-[var(--form-border)] text-black dark:text-white"
          >
            <div class="col-span-2">
              <h2
                class="grid mb-[1.5rem] typography-h2 text-black dark:text-white"
              >
                Bank-Wise EMI Increment & Part-Payment Rules
              </h2>
            </div>
            <div class="col-span-3">
              {#each bankWiseEMITable as tableData}
                <PaymentTable {tableData} />
              {/each}
            </div>
          </div>
        </div>

        <div id="tips" data-section="tips">
          <div class="border-b border-[var(--form-border)]">
            <ThingsYouShould thinkKnow={smartBorrowerTips} disc={"list-disc"} />
          </div>
          <ThingsYouShould thinkKnow={finalThought} disc={"list-disc"} />
        </div>
      </div>
    </div>
    <div class="lg:hidden block">
      {#each navBarMedium as list, index}
        <details
          class="border-bgBtn dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div
              id="emi"
              data-section="emi"
              class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]"
            >
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={emiIncrement} disc={"list-disc"} />
              </div>

              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould
                  thinkKnow={whenToIncreaseEmi}
                  disc={"list-disc"}
                />
              </div>
              <div class="px-[0.5rem]">
                <WhyChoose facilities={benefitsOfEmiIncrement} />
              </div>
            </div>
          {:else if index == 1}
            <div
              id="partPayment"
              data-section="partPayment"
              class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]"
            >
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould thinkKnow={partPayment} disc={"list-disc"} />
              </div>

              <ThingsYouShould
                thinkKnow={partPaymentRules}
                disc={"list-disc"}
              />
            </div>
          {:else if index == 2}
            <div
              id="table"
              data-section="table"
              class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]"
            >
              <div
                class="flex flex-col xl:grid grid-cols-5 gap-[1rem] py-[4rem] px-[0.5rem] border-b border-[var(--form-border)]"
              >
                <div class=" col-span-2">
                  <h2
                    class="grid typography-h2 text-black dark:text-white"
                  >
                    Maximum Part-Payment Limits in Indian Banks
                  </h2>
                </div>
                <div class="col-span-3">
                  {#each partPaymentLimitTable as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>

              <div
                class="flex flex-col xl:grid grid-cols-5 gap-[1rem] py-[4rem] px-[0.5rem]"
              >
                <div class="col-span-2">
                  <h2
                    class="grid typography-h2 text-black dark:text-white"
                  >
                    Bank-Wise EMI Increment & Part-Payment Rules
                  </h2>
                </div>
                <div class="col-span-3">
                  {#each bankWiseEMITable as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 3}
            <div
              id="tips"
              data-section="tips"
              class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]"
            >
              <div class="border-b border-[var(--form-border)]">
                <ThingsYouShould
                  thinkKnow={smartBorrowerTips}
                  disc={"list-disc"}
                />
              </div>
              <ThingsYouShould thinkKnow={finalThought} disc={"list-disc"} />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary">
      <WeAreHereHelp {help} heading="We're here to help" />
      <!-- <ThingsYouShould {thinkKnow} disc="list-decimal" /> -->
    </div>
  </NewPageLayout>
</section>

<style>
  .custom-tooltip {
    background-color: #4caf50; /* Green background */
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); /* Optional shadow */
  }
</style>
