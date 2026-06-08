<script lang="ts">
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import Anchor from "$lib/components/website/Anchor.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";

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

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

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
  let yourSavings = {
    heading: `Start with Your Savings: The Smartest First Step`,
    para: `Why rely on loans or external help when you can take charge of your
          finances? <span
            class="underline decoration-btnBg underline-offset-4 decoration-2"
            >Paying your down payment from your own savings</span
          >
          should be your
          <span
            class="underline decoration-btnBg underline-offset-4 decoration-2"
            >first priority</span
          >
          not an afterthought! Every rupee you arrange yourself
          <span
            class="underline decoration-btnBg underline-offset-4 decoration-2"
            >reduces your loan amount, slashes interest costs, and strengthens
            your financial credibility.</span
          >
          Lenders trust borrowers who invest their own money first, making it easier
          for you to secure a loan with better terms.
          <span
            class="underline decoration-btnBg underline-offset-4 decoration-2"
            >Stop looking for shortcuts—start saving, cut unnecessary expenses,
            and take responsibility for your down payment today!</span
          > The more you contribute upfront, the less you’ll struggle later!`,
  };

  let planning = {
    heading: `Strategies to Plan Your Home’s Down Payment in Advance`,
    para: `Planning your home’s down payment well in advance can reduce financial stress and improve your chances of securing a loan with favorable terms. Here are some effective strategies to help you save and prepare:`,
    listItems: [
      {
        heading: `1. Set a Clear Goal`,
        desc: `Determine the exact amount you need for your down payment. Research the property prices in your desired location and calculate a realistic savings target based on the required percentage.`,
      },
      {
        heading: `2. Create a Dedicated Savings Plan`,
        desc: `Open a separate savings account exclusively for your down payment. This prevents unnecessary spending and helps you track your progress more effectively. Consider choosing an account with high interest to maximize your savings.`,
      },
      {
        heading: `3. Reduce Unnecessary Expenses`,
        desc: `Analyze your monthly expenses and identify areas where you can cut costs. Consider dining out less, canceling unused subscriptions, and opting for budget-friendly alternatives in daily spending.`,
      },
      {
        heading: `4. Automate Your Savings`,
        desc: `Set up an automatic transfer from your primary account to your dedicated down payment savings account every month. Treat it like a fixed expense, just like rent or utility bills.`,
      },
      {
        heading: `5. Use Windfalls Wisely`,
        desc: `Any unexpected income, such as tax refunds, bonuses, or gifts, can significantly boost your savings. Instead of spending them, deposit them directly into your down payment account.`,
      },
      {
        heading: `6. Track and Adjust Your Budget`,
        desc: `Regularly review your budget to ensure you’re staying on track. If needed, adjust your savings plan by increasing contributions or reducing unnecessary expenditures.`,
      },
    ],
  };

  let loan = {
    heading: `Get a Personal Loan for Your Down Payment with digitalDSA`,
    para: `If you've explored various investment options but still find yourself short on funds for a down payment, a personal loan could be the solution. digitalDSA can assist you in securing a personal loan tailored to your eligibility and financial situation. Before applying, consider these key factors:`,
    listItems: [
      {
        heading: `Eligibility Criteria–`,
        desc: `
              Minimum age: 21 years (varies by lender)
              <br>
              Stable income source (salaried or self-employed)
              <br>
              Minimum credit score (typically 650+)
              `,
      },
      {
        heading: `Affordability & Repayment Capacity–`,
        desc: `Assess monthly income vs. loan EMI
              <br>
              Choose a loan tenure that keeps EMIs manageable
              <br>
              Factor in existing financial obligations
              `,
      },
      {
        heading: `Credibility & Documentation–`,
        desc: `Maintain a good credit history for better interest rates
              <br>
              Provide income proof, bank statements, and identity verification
              <br>
              Avoid multiple loan applications, which can impact your credit score
              `,
      },
    ],
    listUrl: {
      url: "/personal-loan/",
      linkName: "👉 Compare offers for a Personal Loan with digitalDSA",
    },
  };

  let navBarMedium = [
    "First Step",
    "Smart savings",
    "Withdraw and pay",
    "Smart investing",
    "Take loan",
  ];
</script>

<Seo
  type="WebPage"
  title="Ultimate Guide to Down Payment Savings & Loan Options"
  image="/images/arrange-down-payment-blog.png"
  description="Learn smart strategies, savings plans, and investment options to arrange your down payment. Explore loans & financial tips with digitalDSA."
  keywords="Down payment savings, Home down payment, How to save for a down payment, Best investments for down payment, Personal loan for down payment, Home loan down payment tips, Down payment strategies, Real estate down payment planning, Smart savings for home buying, digitalDSA loan options"
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={{
      heading: "The Ultimate Guide to Arranging Your Down Payment",
      coverImage: "/images/arrange-down-payment-blog.png",
      coverAlt: "images-altName",
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "First Step", targetId: "first" },
            { name: "Smart savings", targetId: "smart" },
            { name: "Withdraw and pay", targetId: "pay" },
            { name: "Smart investing", targetId: "invest" },
            { name: "Take loan", targetId: "loan" },
          ],
        }}
        {activeSection}
      />

      <!-- your savings -->
      <div data-section="first" id="first" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)] text-black dark:text-white"
        >
          <h2
            class="typography-h2 text-black dark:text-white"
          >
            {yourSavings.heading}
          </h2>
          <p class="typography-body-md text-[var(--form-text-secondary)]">
            {@html yourSavings.para}
          </p>
        </div>
        <!-- planning -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)] text-black dark:text-white"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-black dark:text-white"
            >
              {planning.heading}
            </h2>
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              {@html planning.para}
            </p>
          </div>
          <ul class="space-y-6">
            {#each planning.listItems as list}
              <li class="space-y-2">
                <h3 class="typography-body-lg !font-semibold text-black dark:text-white">{list.heading}</h3>
                <p class="typography-body-md text-[var(--form-text-secondary)]">{list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <!-- money map -->
      <div data-section="smart" id="smart" class="">
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
      </div>
      <!-- withdraw and pay -->
      <div data-section="pay" id="pay" class="">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Using Saved Investments for Your Down Payment`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "1. Withdraw",
                para: `If you have investments in savings schemes like Fixed Deposits (FDs) or Recurring Deposits (RDs), you can withdraw the matured amount along with the interest earned. Some investments allow early withdrawal, though penalties may apply.​​`,
              },
              {
                heading: "2. Liquidate",
                para: `If your money is in market-linked instruments like mutual funds, stocks, or gold ETFs, selling them at the right time can help you generate funds. For example, if your mutual fund investments have grown in value, redeeming them at a profitable point can contribute to your down payment.`,
              },
              {
                heading: "3. Using the Funds for a Down Payment​",
                para: `After withdrawing or liquidating investments, you can use the available cash to pay for your home’s down payment. If planned well, the returns from your investments can reduce the financial burden and help you reach your goal faster.`,
              },
            ],
          }}
        />
      </div>

      <!-- invest and save -->
      <div data-section="invest" id="invest" class="">
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Smart Investment Options to Fund Your Down Payment`,
            xlGridCol: 2,
            borderBottom: true,
            list: [
              {
                heading:
                  "Fixed Deposits (FDs) or <br> Recurring Deposits (RDs)",
                icon: "/icons/FD.svg",
                altName: "fd-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Open an FD or RD account with a bank or post office. Choose a tenure and deposit amount.`,
                  `<span class="font-FourthHead">Duration:</span> 6 months to 5 years`,
                  `<span class="font-FourthHead">Returns:</span> 5-7% per annum`,
                  `<span class="font-FourthHead">Risk:</span> Low (returns are guaranteed)`,
                  `<span class="font-FourthHead">Best for:</span> Those looking for safe investments with predictable returns.`,
                ],
              },
              {
                heading: "Mutual Funds <br> (SIP or Lump Sum)",
                icon: "/icons/mutualFund.svg",
                altName: "fund-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Invest through a Systematic Investment Plan (SIP) or a lump sum via platforms like mutual fund websites or brokerage apps.`,
                  `<span class="font-FourthHead">Duration:</span> 3-5 years for equity funds, 1-3 years for debt funds`,
                  `<span class="font-FourthHead">Returns:</span> 10-15% per annum (historical average for equity funds)`,
                  `<span class="font-FourthHead">Risk:</span> Medium to High (market fluctuations affect returns)`,
                  `<span class="font-FourthHead">Best for:</span> Investors willing to take moderate risks for higher returns.`,
                ],
              },
              {
                heading: "Stocks (Direct Equity Investment)",
                icon: "/icons/stocks.svg",
                altName: "stocks-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Open a Demat and trading account, research companies, and invest in shares.`,
                  `<span class="font-FourthHead">Duration:</span> 3+ years for stable returns`,
                  `<span class="font-FourthHead">Returns:</span> 12-20% per annum (historically, but varies)`,
                  `<span class="font-FourthHead">Risk:</span> High (stock market volatility)`,
                  `<span class="font-FourthHead">Best for:</span> Those who can analyze the market and take calculated risks.`,
                ],
              },
              {
                heading: "Real Estate (Short-Term Investment)",
                icon: "/icons/financialProfile.svg",
                altName: "profile-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Buy undervalued properties and sell when prices appreciate.`,
                  `<span class="font-FourthHead">Duration:</span> 2-5 years for decent appreciation`,
                  `<span class="font-FourthHead">Returns:</span> 8-15% (depending on location and market conditions)`,
                  `<span class="font-FourthHead">Risk:</span> Medium to High (depends on market trends and liquidity)`,
                  `<span class="font-FourthHead">Best for:</span> Those with higher capital and a longer investment horizon.`,
                ],
              },
              {
                heading: "Gold and Silver Investments",
                icon: "/icons/goldLoan.svg",
                altName: "gold-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Buy physical gold/silver, ETFs, or digital gold.`,
                  `<span class="font-FourthHead">Duration:</span> 1-3 years`,
                  `<span class="font-FourthHead">Returns:</span> 8-12% historically`,
                  `<span class="font-FourthHead">Risk:</span> Medium (gold prices fluctuate)`,
                  `<span class="font-FourthHead">Best for:</span> Those looking for a hedge against inflation.`,
                ],
              },
              {
                heading: "Government Bonds or <br> Corporate Bonds",
                icon: "/icons/apply.svg",
                altName: "apply-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Buy bonds through banks, stock exchanges, or bond platforms.`,
                  `<span class="font-FourthHead">Duration:</span> 3-10 years`,
                  `<span class="font-FourthHead">Returns:</span> 6-10% per annum`,
                  `<span class="font-FourthHead">Risk:</span> Low to Medium (government bonds are safer than corporate bonds)`,
                  `<span class="font-FourthHead">Best for:</span> Conservative investors seeking stable returns.`,
                ],
              },
              {
                heading: "Cryptocurrency",
                icon: "/icons/crypto.svg",
                altName: "crypto-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Buy through cryptocurrency exchanges and hold for price appreciation.`,
                  `<span class="font-FourthHead">Duration:</span> 1-5 years`,
                  `<span class="font-FourthHead">Returns:</span> Unpredictable (potential for high gains or losses)`,
                  `<span class="font-FourthHead">Risk:</span> Very High (extreme market fluctuations)`,
                  `<span class="font-FourthHead">Best for:</span> Risk-tolerant investors willing to gamble for high returns.`,
                ],
              },
              {
                heading: "Peer-to-Peer Lending (P2P)",
                icon: "/icons/clock.svg",
                altName: "clock-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Lend money through P2P platforms and earn interest.`,
                  `<span class="font-FourthHead">Duration:</span> 1-3 years`,
                  `<span class="font-FourthHead">Returns:</span> 10-15%`,
                  `<span class="font-FourthHead">Risk:</span> Medium to High (borrower defaults can occur)`,
                  `<span class="font-FourthHead">Best for:</span> Those looking for high returns outside traditional investments.`,
                ],
              },
              {
                heading: "High-Yield Savings Accounts",
                icon: "/icons/personalLoan.svg",
                altName: "loan-icon",
                desc: [
                  `<span class="font-FourthHead">How to Invest:</span> Open an account with a high-interest savings bank.`,
                  `<span class="font-FourthHead">Duration:</span> No fixed duration (funds are liquid)`,
                  `<span class="font-FourthHead">Returns:</span> 3-5%`,
                  `<span class="font-FourthHead">Risk:</span> Low (safe and insured by banks)`,
                  `<span class="font-FourthHead">Best for:</span> Keeping money safe while earning small returns.`,
                ],
              },
              {
                heading: "Friends and Family",
                icon: "/icons/negotiate.svg",
                altName: "negotiate-icon",
                desc: [
                  `<span class="font-FourthHead">How to Borrow:</span> Ask close family or friends for a loan with clear repayment terms.`,
                  `<span class="font-FourthHead">Duration:</span> Flexible, depending on the agreement`,
                  `<span class="font-FourthHead">Pay back:</span> Usually low or no interest`,
                  `<span class="font-FourthHead">Risk:</span> Low (but could strain relationships if not repaid)`,
                  `<span class="font-FourthHead">Best for:</span> Those needing quick access to funds without high-interest bank loans.`,
                ],
              },
            ],
          }}
          listGridAboveLg="2"
        />
      </div>
      <!-- take loan -->
      <div data-section="loan" id="loan" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)] text-black dark:text-white"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-black dark:text-white"
            >
              {loan.heading}
            </h2>
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              {@html loan.para}
            </p>
          </div>
          <ul class="space-y-6">
            {#each loan.listItems as list}
              <li class="space-y-2">
                <h3 class="typography-body-lg !font-semibold text-black dark:text-white">
                  {@html list.heading}
                </h3>
                <p class="typography-body-md text-[var(--form-text-secondary)]">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
          <Anchor link={loan.listUrl.url} linkName={loan.listUrl.linkName} />
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 mx-1 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="first" class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <h2
                  class="typography-h2 text-black dark:text-white"
                >
                  {yourSavings.heading}
                </h2>
                <p class="typography-body-md text-[var(--form-text-secondary)]">
                  {@html yourSavings.para}
                </p>
              </div>
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-black dark:text-white"
                  >
                    {planning.heading}
                  </h2>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    {@html planning.para}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each planning.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-FourthHead text-paraFont">
                        {list.heading}
                      </h3>
                      <p class="font-Paragraph text-minParaFont">{list.desc}</p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 1}
            <div id="smart" class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]">
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
            </div>
          {:else if index == 2}
            <div id="pay" class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Using Saved Investments for Your Down Payment`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "1. Withdraw",
                      para: `If you have investments in savings schemes like Fixed Deposits (FDs) or Recurring Deposits (RDs), you can withdraw the matured amount along with the interest earned. Some investments allow early withdrawal, though penalties may apply.​​`,
                    },
                    {
                      heading: "2. Liquidate",
                      para: `If your money is in market-linked instruments like mutual funds, stocks, or gold ETFs, selling them at the right time can help you generate funds. For example, if your mutual fund investments have grown in value, redeeming them at a profitable point can contribute to your down payment.`,
                    },
                    {
                      heading: "3. Using the Funds for a Down Payment​",
                      para: `After withdrawing or liquidating investments, you can use the available cash to pay for your home’s down payment. If planned well, the returns from your investments can reduce the financial burden and help you reach your goal faster.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="invest" class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Smart Investment Options to Fund Your Down Payment`,
                  xlGridCol: 2,
                  borderBottom: true,
                  list: [
                    {
                      heading:
                        "Fixed Deposits (FDs) or <br> Recurring Deposits (RDs)",
                      icon: "/icons/FD.svg",
                      altName: "fd-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Open an FD or RD account with a bank or post office. Choose a tenure and deposit amount.`,
                        `<span class="font-FourthHead">Duration:</span> 6 months to 5 years`,
                        `<span class="font-FourthHead">Returns:</span> 5-7% per annum`,
                        `<span class="font-FourthHead">Risk:</span> Low (returns are guaranteed)`,
                        `<span class="font-FourthHead">Best for:</span> Those looking for safe investments with predictable returns.`,
                      ],
                    },
                    {
                      heading: "Mutual Funds <br> (SIP or Lump Sum)",
                      icon: "/icons/mutualFund.svg",
                      altName: "fund-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Invest through a Systematic Investment Plan (SIP) or a lump sum via platforms like mutual fund websites or brokerage apps.`,
                        `<span class="font-FourthHead">Duration:</span> 3-5 years for equity funds, 1-3 years for debt funds`,
                        `<span class="font-FourthHead">Returns:</span> 10-15% per annum (historical average for equity funds)`,
                        `<span class="font-FourthHead">Risk:</span> Medium to High (market fluctuations affect returns)`,
                        `<span class="font-FourthHead">Best for:</span> Investors willing to take moderate risks for higher returns.`,
                      ],
                    },
                    {
                      heading: "Stocks (Direct Equity Investment)",
                      icon: "/icons/stocks.svg",
                      altName: "stocks-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Open a Demat and trading account, research companies, and invest in shares.`,
                        `<span class="font-FourthHead">Duration:</span> 3+ years for stable returns`,
                        `<span class="font-FourthHead">Returns:</span> 12-20% per annum (historically, but varies)`,
                        `<span class="font-FourthHead">Risk:</span> High (stock market volatility)`,
                        `<span class="font-FourthHead">Best for:</span> Those who can analyze the market and take calculated risks.`,
                      ],
                    },
                    {
                      heading: "Real Estate (Short-Term Investment)",
                      icon: "/icons/financialProfile.svg",
                      altName: "profile-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Buy undervalued properties and sell when prices appreciate.`,
                        `<span class="font-FourthHead">Duration:</span> 2-5 years for decent appreciation`,
                        `<span class="font-FourthHead">Returns:</span> 8-15% (depending on location and market conditions)`,
                        `<span class="font-FourthHead">Risk:</span> Medium to High (depends on market trends and liquidity)`,
                        `<span class="font-FourthHead">Best for:</span> Those with higher capital and a longer investment horizon.`,
                      ],
                    },
                    {
                      heading: "Gold and Silver Investments",
                      icon: "/icons/goldLoan.svg",
                      altName: "gold-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Buy physical gold/silver, ETFs, or digital gold.`,
                        `<span class="font-FourthHead">Duration:</span> 1-3 years`,
                        `<span class="font-FourthHead">Returns:</span> 8-12% historically`,
                        `<span class="font-FourthHead">Risk:</span> Medium (gold prices fluctuate)`,
                        `<span class="font-FourthHead">Best for:</span> Those looking for a hedge against inflation.`,
                      ],
                    },
                    {
                      heading: "Government Bonds or <br> Corporate Bonds",
                      icon: "/icons/apply.svg",
                      altName: "apply-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Buy bonds through banks, stock exchanges, or bond platforms.`,
                        `<span class="font-FourthHead">Duration:</span> 3-10 years`,
                        `<span class="font-FourthHead">Returns:</span> 6-10% per annum`,
                        `<span class="font-FourthHead">Risk:</span> Low to Medium (government bonds are safer than corporate bonds)`,
                        `<span class="font-FourthHead">Best for:</span> Conservative investors seeking stable returns.`,
                      ],
                    },
                    {
                      heading: "Cryptocurrency",
                      icon: "/icons/crypto.svg",
                      altName: "crypto-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Buy through cryptocurrency exchanges and hold for price appreciation.`,
                        `<span class="font-FourthHead">Duration:</span> 1-5 years`,
                        `<span class="font-FourthHead">Returns:</span> Unpredictable (potential for high gains or losses)`,
                        `<span class="font-FourthHead">Risk:</span> Very High (extreme market fluctuations)`,
                        `<span class="font-FourthHead">Best for:</span> Risk-tolerant investors willing to gamble for high returns.`,
                      ],
                    },
                    {
                      heading: "Peer-to-Peer Lending (P2P)",
                      icon: "/icons/clock.svg",
                      altName: "clock-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Lend money through P2P platforms and earn interest.`,
                        `<span class="font-FourthHead">Duration:</span> 1-3 years`,
                        `<span class="font-FourthHead">Returns:</span> 10-15%`,
                        `<span class="font-FourthHead">Risk:</span> Medium to High (borrower defaults can occur)`,
                        `<span class="font-FourthHead">Best for:</span> Those looking for high returns outside traditional investments.`,
                      ],
                    },
                    {
                      heading: "High-Yield Savings Accounts",
                      icon: "/icons/personalLoan.svg",
                      altName: "loan-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Invest:</span> Open an account with a high-interest savings bank.`,
                        `<span class="font-FourthHead">Duration:</span> No fixed duration (funds are liquid)`,
                        `<span class="font-FourthHead">Returns:</span> 3-5%`,
                        `<span class="font-FourthHead">Risk:</span> Low (safe and insured by banks)`,
                        `<span class="font-FourthHead">Best for:</span> Keeping money safe while earning small returns.`,
                      ],
                    },
                    {
                      heading: "Friends and Family",
                      icon: "/icons/negotiate.svg",
                      altName: "negotiate-icon",
                      desc: [
                        `<span class="font-FourthHead">How to Borrow:</span> Ask close family or friends for a loan with clear repayment terms.`,
                        `<span class="font-FourthHead">Duration:</span> Flexible, depending on the agreement`,
                        `<span class="font-FourthHead">Pay back:</span> Usually low or no interest`,
                        `<span class="font-FourthHead">Risk:</span> Low (but could strain relationships if not repaid)`,
                        `<span class="font-FourthHead">Best for:</span> Those needing quick access to funds without high-interest bank loans.`,
                      ],
                    },
                  ],
                }}
                listGridAboveLg="2"
              />
            </div>
          {:else if index == 4}
            <div id="loan" class="bg-[var(--landing-bg)] text-black dark:text-white border-[var(--form-border)]">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-black dark:text-white"
                  >
                    {loan.heading}
                  </h2>
                  <p class="typography-body-md text-[var(--form-text-secondary)]">
                    {@html loan.para}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each loan.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-FourthHead text-paraFont">
                        {@html list.heading}
                      </h3>
                      <p class="font-Paragraph text-minParaFont">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
                <Anchor
                  link={loan.listUrl.url}
                  linkName={loan.listUrl.linkName}
                />
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a personal loan specialist at a time that suits you",
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
              para: "Fast-track your call and connect with a specialist in the Digital DSA.",
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
            `<span class="font-FourthHead">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-FourthHead">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-FourthHead">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
            `<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </SecondPageLayout>
</section>
