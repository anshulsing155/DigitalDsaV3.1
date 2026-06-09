<script>
  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  import SecondPageLayout from "./SecondPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
 



  let navBarMedium = [
    "Financial hardship",
    "Financial Guidance",
    "Planning for the Future",
    "Inclusive banking",
    "Get in touch",
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

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
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
</script>

<Seo
  type="WebPage"
  title="Financial Support & Planning | Manage Loans & Life Changes"
  image="/images/helping-hand.jpg"
  description="Get expert financial guidance, loan tools, and inclusive banking solutions to manage life’s uncertainties and plan for a secure future."
  keywords="Financial support, Loan repayment assistance, Flexible EMI planning, Loan restructuring, Balance transfer solutions, Financial hardship help, Inclusive banking, Loan calculators, Digital loan assistance, Financial planning tools, Support for migrants, Managing life’s uncertainties, Secure financial future, Part payment planner, Affordability calculator"
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={{
      heading: "We’re Here for Your Financial Need",
      para: `At DigitalDSA, we believe in empowering individuals with
                  financial knowledge and seamless solutions. Whether you're
                  managing life’s uncertainties or planning for a better future,
                  we’re here to assist with tools, services, and guidance
                  tailored to your unique circumstances.`,
      coverImage: "/images/helping-hand.jpg",
      originalSource: `freepik.com`,
      sourceName: `Freepik`,
      coverAlt: "images-altName",
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Financial hardship",
              targetId: "hardship",
            },
            {
              name: "Financial Guidance",
              targetId: "changes",
            },

            {
              name: "Planning for the Future",
              targetId: "planFuture",
            },
            {
              name: "Inclusive banking",
              targetId: "banking",
            },
            {
              name: "Get in touch",
              targetId: "support",
            },
          ],
        }}
        {activeSection}
      />

      <div data-section="hardship" id="hardship" class="">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "How we can help",
            listTopPara: `<span class="font-FourthHead">Life is full of uncertainties, and unexpected challenges can arise
            when we least expect them.</span>`,
            list: [
              {
                desc: `At DigitalDSA, we’re here to assist during difficult times, such as
            losing a loved one, facing unemployment, or dealing with
            health-related challenges.`,
              },
              {
                desc: `If your circumstances change, reach out to us promptly. Our tools
            and support services are designed to help you manage your financial
            situation effectively, providing the clarity and guidance you need
            to navigate life’s unpredictability. Together, we’ll find a way
            forward.`,
              },
            ],
          }}
        />
        <TwoColumnWithImage
          contents={{
            cardImage: `/images/financial-stress.jpg`,
            cardAltName: `DigitalDSA advisor helping it's user to navigate through financial hardship with best available options`,
            cardHeading: `Navigating Financial Hardship`,
            sourceName:"freepik",
            originalSource: "https://www.freepik.com/free-photo/analyzing-work-results-with-colleagues_5576878.htm",
            reverse: true,
          }}
        >
          <ul class="flex flex-col gap-4 font-SubPara text-subParaFont">
            <li>
              If you’re struggling to meet loan or EMI payments, our platform
              provides tools like <span class="font-FourthHead"
                >Part Payment Planner</span
              >,
              <span class="font-FourthHead">Flexible EMI Planner</span>, and
              <span class="font-FourthHead">Affordability Calculator</span>
              to help you strategize repayments effectively. Reach out to explore
              tailored solutions for loan restructuring or balance transfers.
            </li>

            <div class="w-full md:w-auto">
              <Button
                btnName="Financial Support"
                btnBorder="#706d6e"
                link="/finance-support/financial-hardship"
              />
            </div>
          </ul>
        </TwoColumnWithImage>
      </div>

      <div data-section="changes" id="changes" class="">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Financial Guidance for Life’s Unexpected Challenges",
            cardData: [
              {
                title: "Struggling with Loan Repayments? Let’s Fix That!",
                para: `Lost your job or facing a salary cut? Don’t let EMIs steal your sleep! We help you explore 
                <strong>loan restructuring, moratorium options, and balance transfers</strong> to lighten your financial burden.`,
                linkName: "EMI Calculator",
                url: "/calculators/emi-calculator",
              },
              {
                title: "Make Your Money Work for You",
                para: `Why just pay EMIs when you can also <strong>grow your wealth</strong>? Our <strong>ARN-holder experts</strong> 
                guide you through <strong>mutual funds, fixed-income plans, and smart financial strategies</strong> to maximize your returns.`,
                linkName: "How Much to Save by Retirement",
                url: "/money-map/how-much-to-save-by-retirement",
                
              },
              // {
              //   title: "Buying Property? Get the Right Deals",
              //   para: `No more shady deals or hidden costs! We connect you with <strong>verified RERA-registered properties</strong> 
              //   and <strong>trusted brokers</strong> so you can make informed, hassle-free decisions on your dream home.`,
              //   linkName: "Personalized. Transparent. Hassle-Free",
              //   url: "/get-started/how-can-we-help",
              // },
              // {
              //   title: "Loan vs. Investment – What’s Right for You?",
              //   para: `Should you <strong>prepay your loan</strong> or <strong>invest your surplus</strong>? 
              //   We help you strike the perfect balance so you can <strong>maximize returns without locking up your funds</strong>.`,
              //   linkName: "/planners/loan-vs-investment",
              //   url: "/planners/loan-vs-investment",
              // },
            ],

      
            }}
        />
      </div>

      <div data-section="planFuture" id="planFuture" class="">
        <TwoColumnWithImage
          contents={{
            cardImage: `/images/financial-planning-with-DigitalDSA.jpg`,
            cardAltName: `phot os young parents enoying with their child representing financial planning well in advance`,
            cardHeading: `Planning for the Future`,
            sourceName:"freepik",
            originalSource:"https://www.freepik.com/free-photo/family-walking-nature_1208507.htm",
            reverse: false,
          }}
        >
          <p>
            From planning for retirement to securing your family’s financial
            stability, our tools enable you to prepare for the future. With
            calculators and financial planners, we make it easy to map your
            financial journey step-by-step.
          </p>
        </TwoColumnWithImage>
      </div>

      <div data-section="banking" id="banking" class="">
        <TwoColumnWithImage
          contents={{
            cardImage: `/images/financial-wellbeing-exploration-onDigitalDSA-website.png`,
            cardAltName: `Photo of person lloking financial advices from DigitalDSA app`,
            cardHeading: `Inclusive Soultions for All`,
            sourceName:"DigitalDSA",
            originalSource:"https://www.digitaldsa.com",
            reverse: true,
          }}
        >
          <ul class="space-y-4 font-Paragraph text-subParaFont">
            <li class="flex flex-col gap-2">
              <span class="font-ThirdHead text-minSubHead">Loans Without Labels</span>
              <p>
                <strong>Salaried</strong>, <strong>self-employed</strong>, <strong>freelancer</strong>, or somewhere in between? We don’t do stereotypes—our loans fit <em>your profile</em>, not the other way around.
              </p>
            </li>

            <li class="flex flex-col gap-2">
              <span class="font-ThirdHead text-minSubHead">For NRIs: Homecoming Without Headaches</span>
              <p>
                Buying a home in India shouldn’t feel like an <em>immigration checkpoint</em>. We simplify the process so you get the <strong>best loan</strong> without the <em>red tape</em>.
              </p>
            </li>

            <li class="flex flex-col gap-2">
              <span class="font-ThirdHead text-minSubHead">First-Time Borrower? We’ve Got You</span>
              <p>
                Confused by <em>bank jargon</em>? Don't worry, we keep it simple—<strong>real numbers</strong>, <strong>clear guidance</strong>, and no <em>hidden fees lurking</em> in the fine print.
              </p>
            </li>

            <li class="flex flex-col gap-2">
              <span class="font-ThirdHead text-minSubHead">100% Digital, 0% Spam</span>
              <p>
                Compare loans, check eligibility, and apply without your number ending up in a <em>million marketing lists</em>. <strong>Your privacy</strong>, our priority.
              </p>
            </li>
          </ul>
        </TwoColumnWithImage>
      </div>

      <div data-section="support" id="support" class="">
        <TwoColumnWithImage
          contents={{
            cardImage: `/images/message.jpg`,
            cardAltName: `CardCover`,
            cardHeading: `Get in touch`,
            sourceName:"DigitalDSA",
            originalSource:"www.DigitalDSA.com",
          }}
        >
          <p>
            Whether you need help planning loan repayments, understanding your
            financial capacity, or seeking solutions during life’s challenges,
            DigitalDSA is here for you. Let’s simplify your financial journey
            together.
          </p>
          <div class="w-full lg:w-auto">
            <Button
              link="/contact"
              btnBorder="#4F4C4D"
              btnName="Contact us"
            />
          </div>
        </TwoColumnWithImage>
      </div>
    </div>

    <!-- accordion for mobile  -->
    <div class="lg:hidden lg:mt-0">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont leading-5">{list}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="hardship" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "How we can help",
                  listTopPara: `<span class="font-FourthHead">Life is full of uncertainties, and unexpected challenges can arise
            when we least expect them.</span>`,
                  list: [
                    {
                      desc: `At DigitalDSA, we’re here to assist during difficult times, such as
            losing a loved one, facing unemployment, or dealing with
            health-related challenges.`,
                    },
                    {
                      desc: `If your circumstances change, reach out to us promptly. Our tools
            and support services are designed to help you manage your financial
            situation effectively, providing the clarity and guidance you need
            to navigate life’s unpredictability. Together, we’ll find a way
            forward.`,
                    },
                  ],
                }}
              />
              <TwoColumnWithImage
              contents={{
                cardImage: `/images/financial-stress.jpg`,
                cardAltName: `DigitalDSA advisor helping it's user to navigate through financial hardship with best available options`,
                cardHeading: `Navigating Financial Hardship`,
                sourceName:"freepik",
                originalSource: "https://www.freepik.com/free-photo/analyzing-work-results-with-colleagues_5576878.htm",
                reverse: true,
              }}
              >
                <ul class="flex flex-col gap-4 font-SubPara text-subParaFont">
                  <li>
                    If you’re struggling to meet loan or EMI payments, our
                    platform provides tools like <span class="font-FourthHead"
                      >Part Payment Planner</span
                    >,
                    <span class="font-FourthHead">Flexible EMI Planner</span>,
                    and
                    <span class="font-FourthHead">Affordability Calculator</span
                    >
                    to help you strategize repayments effectively. Reach out to explore
                    tailored solutions for loan restructuring or balance transfers.
                  </li>

                  <div class="w-full md:w-auto">
                    <Button
                      btnName="Financial Support"
                      btnBorder="#706d6e"
                      link="/finance-support/financial-hardship"
                    />
                  </div>
                </ul>
              </TwoColumnWithImage>
            </div>
          {:else if index == 1}
            <div id="changes" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading:
                    "Financial Guidance for Life’s Unexpected Challenges",
                  cardData: [
                    {
                      title: "Major Life Events",
                      para: ` Life’s challenges, such as health issues, loss of a loved one,
                  or separation, often come with financial concerns. Our
                  planners can guide you in managing your finances effectively
                  during these times, ensuring you stay in control.`,
                    },
                    {
                      title: "Natural Disasters & Emergencies",
                      para: `Facing unforeseen events like floods or storms? Explore
                  financial assistance options and repayment strategies with our
                  platform to manage your loans seamlessly.`,
                    },
                    {
                      title: "Addiction or Financial Abuse",
                      para: `If you or someone you know is struggling with problem
                  gambling, financial abuse, or elder financial exploitation, we
                  provide resources to regain control of finances and protect
                  against misuse.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="planFuture" class="bg-white text-black">
              <TwoColumnWithImage
          contents={{
            cardImage: `/images/financial-planning-with-DigitalDSA.jpg`,
            cardAltName: `phot os young parents enoying with their child representing financial planning well in advance`,
            cardHeading: `Planning for the Future`,
            sourceName:"freepik",
            originalSource:"https://www.freepik.com/free-photo/family-walking-nature_1208507.htm",
            reverse: false,
          }}
        >
          <p>
            From planning for retirement to securing your family’s financial
            stability, our tools enable you to prepare for the future. With
            calculators and financial planners, we make it easy to map your
            financial journey step-by-step.
          </p>
        </TwoColumnWithImage>
            </div>
          {:else if index == 3}
            <div id="banking" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                   cardImage: `/images/financial-wellbeing-exploration-onDigitalDSA-website.png`,
                   cardAltName: `Photo of person lloking financial advices from DigitalDSA app`,
                  cardHeading: `Inclusive Soultions for All`,
                  reverse: true,
                }}
              >
                <ul class=" space-y-4 font-Paragraph text-subParaFont">
                  <li class="flex flex-col gap-2">
                    <span class="font-ThirdHead text-minSubHead"
                      >Accessible Financial Solutions</span
                    >
                    <p>
                      At DigitalDSA, we’re committed to making financial
                      services accessible to everyone. From tools for
                      self-employed individuals to salaried professionals, our
                      platform caters to diverse user needs.
                    </p>
                  </li>
                  <li class="flex flex-col gap-2">
                    <span class="font-ThirdHead text-minSubHead"
                      >Support for Migrants</span
                    >
                    <p>
                      If you’ve recently moved to India, our user-friendly tools
                      simplify loan processes, ensuring you can make informed
                      financial decisions.
                    </p>
                  </li>
                  <li class="flex flex-col gap-2">
                    <span class="font-ThirdHead text-minSubHead"
                      >Digital Assistance</span
                    >
                    <p>
                      Through our online platform, users can compare loan
                      offers, calculate eligibility, and receive step-by-step
                      guidance for loan applications without the hassle of spam
                      calls or unnecessary contact.
                    </p>
                  </li>
                </ul>
              </TwoColumnWithImage>
            </div>
          {:else if index == 4}
            <div id="support" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: `/images/message.jpg`,
                  cardAltName: `CardCover`,
                  cardHeading: `Get in touch`,
                }}
              >
                <p>
                  Whether you need help planning loan repayments, understanding
                  your financial capacity, or seeking solutions during life’s
                  challenges, DigitalDSA is here for you. Let’s simplify your
                  financial journey together.
                </p>
                <div class="w-full lg:w-auto">
                  <Button
                    link="mailto:'support@digitaldsa.com"
                    btnBorder="#4F4C4D"
                    btnName="Contact us"
                  />
                </div>
              </TwoColumnWithImage>
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <!-- help  -->
    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 3,
          cards: [
            {
              heading: "Contact Us",
              para: `Connect with us for any support, inquiries, or information. We're just a message away!`,
              icon: "icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message Us",
              para: `Reach out to us for any queries or assistance. We're here to help!`,
              icon: "icons/msg.svg",
              altTitle: "icons",
              url: "/contact",
            },
            // {
            //   heading: "FAQs",
            //   para: `Answers to common loan-related questions.`,
            //   icon: "/icons/contact.svg",
            //   altTitle: "icons",
            //   url: "/help-and-support",
            // },
            {
              heading: "Consultant",
              para: "Book an instant consultation with a  loan specialist at a time that suits you",
              icon: "/icons/appointment.svg",
              altName: "appointment Icon",
              url: "/appointment",
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
  </SecondPageLayout>
</section>
