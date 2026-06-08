<script>
  // import { onMount, createEventDispatcher } from "svelte";

  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";

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

  //it is useful when we want to get component data into page data i.e. child to parent
  // const dispatch = createEventDispatcher();

  // onMount(() => {
  //   setTimeout(() => {
  //     const text = document.querySelector(".content")?.innerText || "";
  //     dispatch("textExtracted", text);
  //   }, 100); // Small delay to ensure DOM updates
  // });

  let cyberThreats = {
    heading: `Cyber Threats Are Growing – Is Your Business Ready?`,
    para: `Imagine waking up to find your business's sensitive data compromised,
    customer trust shattered, and operations at a standstill. This isn't a
    distant nightmare; it's a reality many Indian businesses have faced. <br><br> In today's digital landscape, cyber criminals are becoming increasingly
    sophisticated. With India's rapid digital expansion, protecting your
    business from cyber threats is not just an option—it's a necessity.`,
  };

  let trueCost = {
    heading: `    The True Cost of Cyber Attacks: More Than Just Money`,
    para: `Cyber attacks can have devastating effects beyond financial losses. They can
    disrupt operations, lead to legal consequences, and severely damage your
    reputation.`,
    listItems: [
      {
        heading: `Escalating Threats:`,
        desc: `In 2024, India
    emerged as the second most targeted nation for cyber attacks globally, with
    95 entities falling victim to data theft. <a
      href="https://timesofindia.indiatimes.com/india/india-ranked-second-in-global-cyber-attack-targets-report/articleshow/116893292.cms?utm_source=chatgpt.com"
      class="text-linkColor">(Source)</a
    >`,
      },
      {
        heading: `Frequent Incidents:`,
        desc: `A study revealed
    that 83% of Indian organizations experienced at least one cybersecurity
    incident in the past year, with 48% facing ten or more attacks.  <a
      href="https://timesofindia.indiatimes.com/gadgets-news/over-80-indian-companies-hit-with-cyber-attacks-last-year-report/articleshow/103394017.cms?utm_source=chatgpt.com"
      class="text-linkColor">(Source)</a
    >`,
      },
    ],
  };

  let realLife = {
    heading: `Real-Life Cyber Incidents in India`,
    listItems: [
      {
        heading: `Star Health's Ransom Demand:`,
        desc: `In October 2024, India's largest health insurer, Star Health, faced a
    significant data breach. A hacker leaked customer data and medical records,
    demanding a ransom of $68,000.
    <a
      href="https://www.reuters.com/world/india/indias-star-health-says-it-received-68k-ransom-demand-after-data-leak-2024-10-12/?utm_source=chatgpt.com"
      class="text-linkColor">(Source)</a
    >`,
      },
      {
        heading: `Ransomware Attack on Small Indian Banks:`,
        desc: `In July 2024, a ransomware attack on C-Edge Technologies, a service provider
    for small Indian banks, disrupted operations across nearly 300 banks.
    <a
      href="https://www.reuters.com/technology/cybersecurity/ransomware-attack-forces-hundreds-small-indian-banks-offline-sources-say-2024-07-31/?utm_source=chatgpt.com"
      class="text-linkColor">(Source)</a
    >`,
      },
    ],
  };

  let howToMake = {
    heading: `How to Make Cyber Security a Part of Your Daily Business Routine`,
    para: `Think of cyber security as locking your office doors at the end of the
    day—you wouldn't leave them open for anyone to walk in. The same vigilance
    is required online. Here's how you can protect your business:`,
    listItems: [
      {
        heading: `Invest in Cyber Security:`,
        desc: `Prevention is
      better than cure; allocate resources to robust security measures`,
      },
      {
        heading: `Employee Training:`,
        desc: `Educate staff on phishing,
      social engineering, and span password practices.`,
      },
      {
        heading: `Regular System Updates:`,
        desc: `Keep software up
      to date and use multi-factor authentication.`,
      },
      {
        heading: `Protect Customer Data:`,
        desc: `Encrypt sensitive
      information and follow Indian cyber security regulations.`,
      },
    ],
  };

  let digital = {
    heading: `Digital DSA’s Commitment to Cyber Security`,
    para: `At <span class="font-FifthHead">Digital DSA</span>, we recognize that
    security is the foundation of trust in financial services. As a leading loan
    comparison platform, we are dedicated to:`,
    listItems: [
      {
        heading: `Advanced Encryption:`,
        desc: `Safeguarding user
      data with cutting-edge encryption technologies.`,
      },
      {
        heading: `Regular Security Audits:`,
        desc: `Conducting frequent
      assessments to identify vulnerabilities.`,
      },
      {
        heading: `Regulatory Compliance:`,
        desc: `Ensuring adherence
      to Indian cyber laws for transparency and trust.`,
      },
    ],
  };

  let finalThoughts = {
    heading: ` Final Thoughts: Stay One Step Ahead of Cyber Criminals`,
    para: `Cyber threats are evolving rapidly. Businesses that proactively strengthen
    their cyber security measures today will be better positioned to face the
    challenges of tomorrow. Don't wait for an attack to take action. <br><br> <span class="font-FifthHead"
      >Stay secure, stay vigilant, and let's build a cyber-resilient India
      together!</span
    ><br><br> For more insights and expert tips on protecting your business, follow <span
      class="font-FifthHead">Digital DSA</span
    > and stay informed.`,
  };

  let navBarMedium = [
    "Cyber Threat",
    "Real Life Incidents",
    "Safe Practices",
    "Digital DSA Commitment",
    "Final Thoughts",
  ];
</script>

<Seo
  type="WebPage"
  title="Protect Your Business from Cyber Threats | Digital DSA"
  image="/images/cyber-threat-blog.jpg"
  description="Cyber threats are rising in India. Learn how to protect your business with expert tips, safe practices & Digital DSA’s security solutions."
  keywords="Cybersecurity for Indian businesses, Cyber threats India 2025, Data breach protection India, Business cyber security tips, Ransomware attacks India, Indian cyber laws compliance, Small business data protection, Digital security for SMEs, Cybersecurity awareness India, Digital DSA cybersecurity"
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={{
      heading:
        "Take Control of Your Business’s Cybersecurity – Before Hackers Do",
      coverImage: "/images/cyber-threat-blog.jpg",
      coverAlt: "images-altName",
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "Cyber Threat", targetId: "cyberThreat" },
            { name: "Real Life Incidents", targetId: "realLife" },
            { name: "Safe Practices", targetId: "safe" },
            { name: "Digital DSA Commitment", targetId: "commitment" },
            { name: "Final Thoughts", targetId: "final" },
          ],
        }}
        {activeSection}
      />
      <!-- cyber threat -->
      <div data-section="cyberThreat" id="cyberThreat" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {cyberThreats.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html cyberThreats.para}
          </p>
        </div>
        <!-- true cost -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {trueCost.heading}
            </h2>
            <p class="font-Paragraph text-minParaFont">
              {trueCost.para}
            </p>
          </div>
          <ul class="space-y-6">
            {#each trueCost.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- real life -->
      <div data-section="realLife" id="realLife" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {realLife.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each realLife.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- how to make -->
      <div data-section="safe" id="safe" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {howToMake.heading}
            </h2>
            <p class="font-Paragraph text-minParaFont">
              {trueCost.para}
            </p>
          </div>
          <ul class="space-y-6">
            {#each howToMake.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- digital dsa -->
      <div data-section="commitment" id="commitment" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {digital.heading}
            </h2>
            <p class="font-Paragraph text-minParaFont">
              {@html trueCost.para}
            </p>
          </div>
          <ul class="space-y-6">
            {#each digital.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- final thoughts -->
      <div data-section="final" id="final" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {finalThoughts.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html finalThoughts.para}
          </p>
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
            <div id="cyberThreat" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {cyberThreats.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html cyberThreats.para}
                </p>
              </div>
              <!-- true cost -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {trueCost.heading}
                  </h2>
                  <p class="font-Paragraph text-minParaFont">
                    {trueCost.para}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each trueCost.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-FourthHead text-paraFont">
                        {list.heading}
                      </h3>
                      <p class="font-Paragraph text-minParaFont">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 1}
            <div id="realLife" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {realLife.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each realLife.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-FourthHead text-paraFont">
                        {list.heading}
                      </h3>
                      <p class="font-Paragraph text-minParaFont">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 2}
            <div id="safe" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {howToMake.heading}
                  </h2>
                  <p class="font-Paragraph text-minParaFont">
                    {trueCost.para}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each howToMake.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-FourthHead text-paraFont">
                        {list.heading}
                      </h3>
                      <p class="font-Paragraph text-minParaFont">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 3}
            <div id="commitment" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {digital.heading}
                  </h2>
                  <p class="font-Paragraph text-minParaFont">
                    {@html trueCost.para}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each digital.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-FourthHead text-paraFont">
                        {list.heading}
                      </h3>
                      <p class="font-Paragraph text-minParaFont">
                        {@html list.desc}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 4}
            <div id="final" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {finalThoughts.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html finalThoughts.para}
                </p>
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
              para: "Book instantly to speak to a loan specialist at a time that suits you",
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
