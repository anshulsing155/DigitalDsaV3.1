<script>
	let {
		data
	} = $props();




  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";

  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";

  import { onMount } from "svelte";

  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";

  import FeedbackCheck from "./FeedbackCheck.svelte";

  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { applicationData } from "$lib/stores/stores";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Seo from "./Seo.svelte";

  let activeSection = $state("");

  let subList = [
    {
name: "What is LAP",
targetId: `ready`,
    },
    {
name: "Find a home",
targetId: `find`,
    },
    {
name: "What's next?",
targetId: `next`,
    },
    {
name: "Tools & calculators",
targetId: `calculators`,
    },
  ];
  let navList = [
    {
actionBtn: [
{
firstBtn: "Book appointment",
link: "/appointment",
btnColor: "#ffcc00",
},
{
firstBtn: "Apply online",
link: "/get-started/how-can-we-help",
},
],
    },
  ];

  let getStart = [
    {
heading: "Getting ready to buy",
data: [
{
id: "1",
title: "Home buying made easy",
desc: `Your step-by-step guide to buying property, whether it's a home to live in or an investment for your future.`,
link: "Read home buying guide (PDF)",
},
{
id: "2",
title: "Saving for a deposit ",
desc: `Get some tips to help you start saving for your house deposit.`,
link: "Tell me more about saving for a deposit",
},
{
id: "3",
title: "Should you get conditional pre-approval?",
desc: `Having conditional pre-approval can help show that you're serious about buying. `,
link: "Keep reading about conditional pre-approval",
},
{
id: "4",
title: "Understand the costs",
desc: `There are a number of costs you'll need to factor into your home buying budget.`,
link: "Find out more about home buying costs",
},
],
    },
  ];

  let cardDataList = [
    {
heading: "Know your borrowing power",
para: "Get the confidence to act quickly when the right property comes along",
icon: "/icons/checklist.svg",
iconAltName: "Message Icon",
link: "https://example.com",
btnName: "Check condition approval",
actionBtn: "",
    },
    {
heading: "Apply for a loan",
para: "When you've found a property or want to refinance with undefined.",
icon: "/icons/apply-pen.svg",
iconAltName: "Alert Icon",
link: "https://example.com/alert",
btnName: "Apply for a home loan",
    },
    {
heading: "Ask a Lending expert",
para: "Talk on the phone or in person – whatever works best for you.",
icon: "/icons/contact.svg",
iconAltName: "Alert Icon",
link: "https://example.com/alert",
btnName: "Book an appointment",
    },
    {
heading: "Make informed property decisions with Home Hub",
para: "Get access to all the property tools and guidance you need in one place in ",
icon: "/icons/home.svg",
iconAltName: "Alert Icon",
link: "https://example.com/alert",
btnName: "Check out Home Hub",
    },
  ];

  let forHome = [
    {
heading: "Property report ",
para: `Make informed property decisions and understand the market.`,
link: "https://example.com",
linkName: "Get Property Report",
    },
    {
heading: "Simplify your property purchase with Home-in",
para: `Digital DSA has partnered with Home-in, your personal home buying concierge to help simplify your first home buying journey. Helping you at every step, from pre-approval to shortlisting homes, conveyancing and settling on your new property.`,
link: "https://example.com/alert",
linkName: "Get started with Home-in",
    },
    {
heading: "Watch our webinars for more guidance",
para: `We've created a four-part webinar series to support you as you get started on your property journey, whether you're looking for a place to live in or invest.`,
link: "https://example.com/alert",
linkName: "Watch webinars",
    },
  ];

  let whatNext = [
    {
heading: "Understanding the home loan process",
para: `Our step-by-step guide from applying for your home loan to settlement. `,
link: "https://example.com",
linkName: "Tell me more",
    },
    {
heading: "Making an offer",
para: `Here's what you need to know about the final steps to owning a home.`,
link: "https://example.com/alert",
linkName: "Keep reading",
    },
    {
heading: "Offset accounts",
para: `Offsetting your interest could shave thousands off your home loan.`,
link: "https://example.com/alert",
linkName: "Keep reading",
    },
  ];

  let IconCardHeading = "Start your home buying journey with us today";

  let contents = [
    {
id: 1,
title: "Calculators",
links: [
{ id: 1, name: "How much can I borrow?", url: "/" },
{ id: 2, name: "What would my repayments be?", url: "/" },
{ id: 3, name: "What would my upfront costs be?", url: "/" },
],
    },
    {
id: 2,
title: "Tools",
links: [
{ id: 1, name: "Compare our home loans", url: "/" },
{ id: 2, name: "Budget planner", url: "/" },
{ id: 3, name: "Search for a property", url: "/" },
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
"Fast-track your call and connect with a specialist in the Digital DSA.",
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
    "What is Budget",
    "Process",
    "Set financial goals",
    "Things to consider",
    "Start today",
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`This article is for general educational purposes only and does not consider your specific financial situation or needs.`,
`It should not be taken as financial advice.`,
`Terms and conditions apply to our financial well-being features.`,

,
    ],
  };
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
  //let activeSection = $state(""); // Initially no section is active

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
</script>

<Seo
  type="WebPage"
  title="How to Make a Budget: Simple Steps for Financial Success"
  image="/images/howtomakebudget.jpg"
  description="Learn how to budget effectively with simple steps, goal setting, and smart expense tracking to improve your financial well-being today!"
  keywords="Budgeting tips, How to make a budget, Personal finance planning, Money management, Budget planner, Expense tracking, Financial goals, 50/30/20 rule, Smart budgeting, Monthly budget plan, Saving money tips, Budgeting for beginners"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/howtomakebudget.jpg",
      coverAlt: "photo of an indian couple making budget for expenses with the help of DigitalDSA budget planner",
      heading: "How to Make a Budget",
      sourceName:"pexels",
      originalSource:"www.pexels.com",  
      actionBtns: [
        {
          btnName: "Connect with us",
          btnLink: "/appointment",
          btnColor: "",
        },
        {
          btnName: "Compare loans",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
          btnClick: () => {
            $applicationData.LoanName = "Loan Against Property";
          },
        },
      ],
      para: `Budgeting doesn’t have to be <strong>complicated! </strong> <br> Here are some simple and practical steps to get you started.`,
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "What is Budget",
              targetId: "what",
            },
            {
              name: "Process",
              targetId: "process",
            },
            {
              name: "Set financial goals",
              targetId: "setGoals",
            },
            {
              name: "Things to consider",
              targetId: "things",
            },
            {
              name: "Start today",
              targetId: "startToday",
            },
          ],
          actionBtns: [
            {
              btnName: "Connect with us",
              btnLink: "/appointment",
              btnColor: "",
            },
            {
              btnName: "Compare loans",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Loan Against Property";
              },
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div id="what" data-section="what">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "What is Budgeting ?",
            secPara: `Budgeting looks different for everyone, depending on individual needs and priorities.<br><br> Our research 
              shows that taking the time to create and follow a budget can significantly improve your <a  class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/financial-wellbeing"> financial well-being</a>. 
              <br><br>Already confident in budgeting but need help with the numbers? <br> Check out our <a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/planners/budget-planner"> Budget Planner</a>. <br>
              If you're just getting started and need some practical tips, keep reading!`,
          }}
        />
      </div>

      <div id="process" data-section="process">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Understanding Your Income & Expenses`,
            secPara: ` 
        
     
            Budgeting doesn’t mean giving up fun! It’s just about making sure your money isn’t 
            <span class="underline">disappearing faster than golgappas at a wedding.</span> 
            <br><br>
            The first step is to track every rupee, like <strong>a missing Tupperware lid</strong>—you know it’s somewhere, but where? <br> <br>
            You need to figure out where your money comes from and where it goes. <br>More often, 
            you’ll find it vanishing into <strong>Zomato orders</strong> and <strong>impulse shopping</strong> during sales. <br>  
            <br>
            Small, unnecessary expenses add up quickly like - <br>  
            <ul class="list-disc ml-8">
            <li>
            <strong>Gym membership</strong> you never use,<br> 
            </li> 
            <li> 
            <strong>OTT subscriptions</strong> you got for just one show,<br> 
            </li> 
            <li>
            <strong>Chai/ Coffee stops</strong> that seem harmless  
            but pile up. 
            </li> 
            </ul>
            
            <br>  The bottom line? <strong >Knowledge is power</strong>. <br> And in this case, it’s the power to stop your bank  balance from looking like "a prepaid mobile recharge at the end of the month".
        

   `,
          }}
        />
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/budget-page-screen.jpg",
            cardAltName: "housing-figure",
            cardHeading: "Tracking Your Income",
            sourceName:"DigitalDSA",
            originalSource:"www.DigitalDSA.com",
            reverse: true,
          }}
        >
          <p class="font-Paragraph text-subParaFont">
            Income isn’t just your salary—it includes any sources of money you
            regularly receive. This could be freelance earnings, interest from
            savings, or investments, side gigs, or even alimony.
          </p>

          <div class="flex flex-col gap-2">
            <p class="font-FourthHead">Tips:</p>

            <li>List all your income sources.</li>
            <li>Use apps or simple spreadsheets to track it each month.</li>
          </div>
        </TwoColumnWithImage>

        <TwoColumnWithImage
          contents={{
            cardImage: "/images/housing.jpg",
            cardAltName: "housing-figure",
            cardHeading: "Categorizing Your Expenses",
          }}
        >
          <p class="font-Paragraph text-minParaFont">
            Expenses are typically broken down into:<br /><br />
            <span class="font-FourthHead">Fixed Expenses:</span> Bills you pay
            monthly, like rent, utilities, loans, and subscriptions.<br />
            <span class="font-FourthHead">Variable Expenses:</span> Costs that
            can fluctuate month-to-month, like groceries, entertainment, and
            shopping.<br />
            <span class="font-FourthHead">Discretionary Expenses:</span>
            Non-essential spending, like dining out, hobbies, and vacations.<br
            />
          </p>

          <div class="flex flex-col gap-2">
            <p class="font-FourthHead">Tips:</p>
            <li>
              Use budgeting apps that automatically categorize your expenses.
            </li>
            <li>
              Review your last 2-3 months of spending to identify where you’re
              spending most.
            </li>
          </div>
        </TwoColumnWithImage>
      </div>

      <div id="setGoals" data-section="setGoals">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Set financial goals`,
            xlGridCol: 2,
            cards: [
              {
                heading: "Plan SMART goals",
                para: `<ul class="list-disc flex flex-col gap-2 list-inside">
        
        <li><span class="font-FourthHead">S</span>pecific, <li><span class="font-FourthHead">M</span>easurable, <li><span class="font-FourthHead">A</span>chievable, <li><span class="font-FourthHead">R</span>ealistic, and <li><span class="font-FourthHead">T</span>ime-bound goals help you stay on track.
        <br><br> You may set a <span class="font-FourthHead">SMART</span> goal like:<br>

        "Save ₹5,000 per month for the next 6 months for my emergency fund."`,
              },
              {
                heading: "Prioritize your Goals",
                para: `It’s important to differentiate between <span class="font-FourthHead"> short-term</span> goals (1 year or less) and <span class="font-FourthHead">long-term</span> goals (3-5 years or more).
        <br><br>
          <span class="font-FourthHead">Tips:</span>
         
          <li>List your goals, then prioritize them based on urgency and importance.</li>
          <li>Create a timeline for achieving each goal.</li>`,
              },
            ],
          }}
        />

        <AboveTitleWithoutIconCard
          contents={{
            heading: `Categorize Your Spending`,
            xlGridCol: 2,
            cards: [
              {
                heading: "Essentials vs. Non-Essentials",
                para: `When you categorize your expenses, you take control of your spending. It helps you see where you’re spending too much, so you can adjust accordingly. Categorization makes budgeting more precise and efficient.`,
              },
              {
                heading: "How to Categorize Your Expenses",
                para: `
        
        <li><span class="font-FourthHead">Essentials:</span>Rent, bills, groceries, transportation. 
        <li><span class="font-FourthHead">Non-Essentials:</span>Dining out, shopping, entertainment. 
        <li><span class="font-FourthHead">Savings & Investments:</span>Emergency funds, retirement savings, mutual funds.
                `,
              },
              {
                heading: "Benefits of Categorization",
                para: `
        
        <li><span class="font-FourthHead">Tracking:</span>It becomes easier to see where your money goes. 
        <li><span class="font-FourthHead">Cut Back:</span>: You can identify areas where you’re overspending and make adjustments.
        <li><span class="font-FourthHead">Flexibility:</span>Reassign funds to essential categories if needed, especially during uncertain times.
                `,
              },
            ],
          }}
        />
      </div>

      <div id="things" data-section="things">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/home-scheme.jpg",
            cardAltName: "parent-figure",
            cardHeading: "50/30/20 Rule",
            reverse: true,
          }}
        >
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <p>
                The 50/30/20 rule is a simple way to manage your budget. It
                helps you divide your income into three broad categories that
                give you a balanced approach to managing your finances.
              </p>
              <ul class="list-disc pl-4">
                <li>
                  <span class="font-FourthHead">50%</span> for Essential Expenses
                  (rent, bills, groceries)
                </li>
                <li>
                  <span class="font-FourthHead">30%</span> for Lifestyle Costs (entertainment,
                  dining out, shopping)
                </li>
                <li>
                  <span class="font-FourthHead">20%</span> for Savings (emergency
                  fund, retirement fund, investment)
                </li>
              </ul>
              <p class="font-ThirdHead">Why It Works:</p>
              <ul class="list-disc pl-4">
                <li>
                  It’s simple, effective, and easy to follow, ensuring you take
                  care of your essentials while also enjoying life and saving
                  for the future.
                </li>
                <li>
                  <span class="font-FourthHead">Tips:</span>
                </li>
                <li>
                  If you’re spending more than 50% on essentials, reassess your
                  living situation (e.g., rent, utilities).
                </li>
                <li>
                  Try to reduce discretionary expenses under 30% to boost
                  savings.
                </li>
              </ul>
            </div>
          </div>
        </TwoColumnWithImage>
      </div>

      <div id="startToday" data-section="startToday">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Start Budgeting Today`,
            secPara: `Creating a budget doesn’t have to be overwhelming. With these simple steps, you can begin to take control of your financial life, achieve your goals, and gain peace of mind. <br><br><br>
                <span class="font-FourthHead"">Read more</span></br>
                <ul class="list-disc pl-4 space-y-2"> 
                <li><a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/finance-support/budgeting-tips">6 budgeting tips for a financially successful year</a></li>
                <li><a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/finance-support/behavioral-science-behind-budgeting">Would you like to learn about the behavioral science behind budgeting? Read this article to dive deeper into how psychology impacts your financial choices.</a></li>
                <li><a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/finance-support/adjust-your-budget">How to Adjust Your Budget When You Need To</a></li>
                </ul>`,
          }}
        />
      </div>
    </div>

    <div class="lg:hidden block">
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
              <h2 class="font-FifthHead text-paraFont">{navBar}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="what" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "What is Budgeting ?",
                  secPara: `Budgeting looks different for everyone, depending on individual needs and priorities.<br><br> Our research 
              shows that taking the time to create and follow a budget can significantly improve your <a  class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/financial-wellbeing"> financial well-being</a>. 
              <br><br>Already confident in budgeting but need help with the numbers? Check out our <a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/planners/budget-planner"> Budget Planner</a>.
              If you're just getting started and need some practical tips, keep reading!`,
                }}
              />
            </div>
          {:else if index == 1}
            <div id="process" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Understanding Your Income & Expenses`,
                  secPara: `To create a successful budget, the first step is to understand where your money comes from and where it goes. This is all about tracking both income and expenses so you can get a clear picture of your financial situation. Tracking will help you identify areas where you might be overspending, or where you can save more.`,
                }}
              />
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/housing.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "Tracking Your Income",
                  reverse: true,
                }}
              >
                <p class="font-Paragraph text-minParaFont">
                  Income isn’t just your salary—it includes any sources of money
                  you regularly receive. This could be freelance earnings,
                  interest from savings, or investments, side gigs, or even
                  alimony.
                </p>

                <div class="flex flex-col gap-2">
                  <p class="font-FourthHead">Tips:</p>

                  <li>List all your income sources.</li>
                  <li>
                    Use apps or simple spreadsheets to track it each month.
                  </li>
                </div>
              </TwoColumnWithImage>

              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/housing.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "Categorizing Your Expenses",
                }}
              >
                <p class="font-Paragraph text-minParaFont">
                  Expenses are typically broken down into:<br /><br />
                  <span class="font-FourthHead">Fixed Expenses:</span> Bills you
                  pay monthly, like rent, utilities, loans, and subscriptions.<br
                  />
                  <span class="font-FourthHead">Variable Expenses:</span> Costs
                  that can fluctuate month-to-month, like groceries,
                  entertainment, and shopping.<br />
                  <span class="font-FourthHead">Discretionary Expenses:</span>
                  Non-essential spending, like dining out, hobbies, and vacations.<br
                  />
                </p>

                <div class="flex flex-col gap-2">
                  <p class="font-FourthHead">Tips:</p>
                  <li>
                    Use budgeting apps that automatically categorize your
                    expenses.
                  </li>
                  <li>
                    Review your last 2-3 months of spending to identify where
                    you’re spending most.
                  </li>
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 2}
            <div id="setGoals" class="bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Set financial goals`,
                  xlGridCol: 2,
                  cards: [
                    {
                      heading: "Plan SMART goals",
                      para: `<ul class="list-disc flex flex-col gap-2 list-inside">
        
        <li><span class="font-FourthHead">S</span>pecific, <li><span class="font-FourthHead">M</span>easurable, <li><span class="font-FourthHead">A</span>chievable, <li><span class="font-FourthHead">R</span>ealistic, and <li><span class="font-FourthHead">T</span>ime-bound goals help you stay on track.
        <br><br> You may set a <span class="font-FourthHead">SMART</span> goal like:<br>

        "Save ₹5,000 per month for the next 6 months for my emergency fund."`,
                    },
                    {
                      heading: "Prioritize your Goals",
                      para: `It’s important to differentiate between <span class="font-FourthHead"> short-term</span> goals (1 year or less) and <span class="font-FourthHead">long-term</span> goals (3-5 years or more).
        <br><br>
          <span class="font-FourthHead">Tips:</span>
         
          <li>List your goals, then prioritize them based on urgency and importance.</li>
          <li>Create a timeline for achieving each goal.</li>`,
                    },
                  ],
                }}
              />

              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Categorize Your Spending`,
                  xlGridCol: 2,
                  cards: [
                    {
                      heading: "Essentials vs. Non-Essentials",
                      para: `When you categorize your expenses, you take control of your spending. It helps you see where you’re spending too much, so you can adjust accordingly. Categorization makes budgeting more precise and efficient.`,
                    },
                    {
                      heading: "How to Categorize Your Expenses",
                      para: `
        
        <li><span class="font-FourthHead">Essentials:</span>Rent, bills, groceries, transportation. 
        <li><span class="font-FourthHead">Non-Essentials:</span>Dining out, shopping, entertainment. 
        <li><span class="font-FourthHead">Savings & Investments:</span>Emergency funds, retirement savings, mutual funds.
                `,
                    },
                    {
                      heading: "Benefits of Categorization",
                      para: `
        
        <li><span class="font-FourthHead">Tracking:</span>It becomes easier to see where your money goes. 
        <li><span class="font-FourthHead">Cut Back:</span>: You can identify areas where you’re overspending and make adjustments.
        <li><span class="font-FourthHead">Flexibility:</span>Reassign funds to essential categories if needed, especially during uncertain times.
                `,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="things" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/home-scheme.jpg",
                  cardAltName: "parent-figure",
                  cardHeading: "50/30/20 Rule",
                  reverse: true,
                }}
              >
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col gap-2">
                    <p>
                      The 50/30/20 rule is a simple way to manage your budget.
                      It helps you divide your income into three broad
                      categories that give you a balanced approach to managing
                      your finances.
                    </p>
                    <ul class="list-disc pl-4">
                      <li>
                        <span class="font-FourthHead">50%</span> for Essential Expenses
                        (rent, bills, groceries)
                      </li>
                      <li>
                        <span class="font-FourthHead">30%</span> for Lifestyle Costs
                        (entertainment, dining out, shopping)
                      </li>
                      <li>
                        <span class="font-FourthHead">20%</span> for Savings (emergency
                        fund, retirement fund, investment)
                      </li>
                    </ul>
                    <p class="font-ThirdHead">Why It Works:</p>
                    <ul class="list-disc pl-4">
                      <li>
                        It’s simple, effective, and easy to follow, ensuring you
                        take care of your essentials while also enjoying life
                        and saving for the future.
                      </li>
                      <li>
                        <span class="font-FourthHead">Tips:</span>
                      </li>
                      <li>
                        If you’re spending more than 50% on essentials, reassess
                        your living situation (e.g., rent, utilities).
                      </li>
                      <li>
                        Try to reduce discretionary expenses under 30% to boost
                        savings.
                      </li>
                    </ul>
                  </div>
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 4}
            <div id="startToday" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Start Budgeting Today`,
                  secPara: `Creating a budget doesn’t have to be overwhelming. With these simple steps, you can begin to take control of your financial life, achieve your goals, and gain peace of mind. <br><br><br>
                    <span class="font-FourthHead"">Read more</span></br>
                    <ul class="list-disc pl-4 space-y-2"> 
                    <li><a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/finance-support/budgeting-tips">6 budgeting tips for a financially successful year</a></li>
                    <li><a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/finance-support/behavioral-science-behind-budgeting">Would you like to learn about the behavioral science behind budgeting? Read this article to dive deeper into how psychology impacts your financial choices.</a></li>
                    <li><a class="underline underline-offset-4 text-linkColor hover:no-underline font-Paragraph text-subParaFont cursor-pointer" href="/finance-support/adjust-your-budget">How to Adjust Your Budget When You Need To</a></li>
                    </ul>`,
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <FeedbackCheck />

    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </NewPageLayout>
</section>
