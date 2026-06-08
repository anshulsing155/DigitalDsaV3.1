<script>
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

  let onlineBusiness = {
    heading: `How to Make Cybersecurity Integral to Your Online Business: An Indian
      Perspective`,
    para: `In today's digital landscape, small and medium-sized enterprises (SMEs) in
      India are increasingly vulnerable to cyberattacks. Despite misconceptions
      that cyber threats target only large corporations, SMEs often find
      themselves in the crosshairs due to limited cybersecurity measures.
      Understanding these risks and implementing robust security practices is
      essential for safeguarding your business.`,
  };

  let reality = {
    heading: `The Reality of Cyber Threats to Indian SMEs`,
    listItems: [
      {
        heading: `High Incidence of Attacks:`,
        desc: ` survey revealed that 88%
        of Indian SMEs experienced cybersecurity incidents in the past year. (<a
          href="https://economictimes.indiatimes.com"
          class="text-linkColor underline underline-offset-4">Economic Times</a
        >)`,
      },
      {
        heading: `Ransomware Vulnerability:`,
        desc: `Approximately 68% of Indian
        SMEs reported being targets of ransomware attacks, leading to
        significant financial and operational disruptions. (<a
          href="https://cybersecurityventures.com"
          class="text-linkColor underline underline-offset-4"
          >Cybersecurity Ventures</a
        >)`,
      },
    ],
  };

  let realLife = {
    heading: `Real-Life Incident: Ransomware Attack on Small Indian Banks`,
    para: `In July 2024, nearly 300 small Indian banks were forced offline due to a
      ransomware attack on their technology service provider, C-Edge
      Technologies. This incident disrupted payment systems and highlighted the
      vulnerabilities within smaller financial institutions. The National
      Payments Corporation of India (NPCI) had to temporarily disconnect these
      banks from the country's retail payment network to contain the threat. (<a
        href="https://www.reuters.com"
        class="text-linkColor underline underline-offset-4">Reuters</a
      >)`,
  };

  let threats = {
    heading: `Common Cyber Threats`,
    listItems: [
      {
        heading: `Phishing and Social Engineering:`,
        desc: ` Cybercriminals craft
        convincing messages to trick employees into revealing sensitive
        information. With the advent of generative AI, these phishing attempts
        have become more sophisticated, making it imperative for businesses to
        train their staff effectively. (<a
          href="https://timesofindia.indiatimes.com"
          class="text-linkColor underline underline-offset-4">Times of India</a
        >)`,
      },
      {
        heading: `Ransomware Attacks:`,
        desc: `The surge in ransomware incidents
        has been alarming. From 2021 to 2023, cyberattacks on startups and MSMEs
        in India increased by a staggering 508%, underscoring the urgent need
        for enhanced cybersecurity measures. (<a
          href="https://asiafoundation.org"
          class="text-linkColor underline underline-offset-4">Asia Foundation</a
        >)`,
      },
      {
        heading: `Data Breaches:`,
        desc: `Unauthorized access to sensitive customer
        and business data can result in severe reputational and financial damage.
        SMEs are often targeted due to weaker security infrastructures.`,
      },
    ],
  };

  let sme = {
    heading: `Why SMEs Need Proactive Cybersecurity Measures`,
    para: `The impact of a cyberattack on an SME can be devastating. Reports indicate
      that 60% of small businesses that fall victim to cyberattacks are forced
      to shut down within six months. Implementing proactive cybersecurity measures is crucial to prevent
      such outcomes.`,
  };

  let essential = {
    heading: `Essential Cybersecurity Practices`,
    listItems: [
      {
        heading: `Employee Training:`,
        desc: ` Regularly educate staff about cybersecurity
        principles, including recognizing phishing attempts and the importance of
        strong, unique passwords.`,
      },
      {
        heading: `Regular Software Updates:`,
        desc: `Keep all systems and software
        up to date to protect against known vulnerabilities.`,
      },
      {
        heading: `Data Backups:`,
        desc: `Maintain regular backups of critical data
        in secure, off-site locations to ensure business continuity in case of an
        attack.`,
      },
      {
        heading: `Multi-Factor Authentication (MFA):`,
        desc: `Implement MFA to add
        an extra layer of security, making unauthorized access more difficult.`,
      },
      {
        heading: `Incident Response Plan:`,
        desc: `Develop and regularly update an
        incident response plan to ensure a swift and coordinated response to cyber
        incidents.`,
      },
    ],
  };

  let example = {
    heading: `Real-Life Example: Phishing Scam in an Indian E-commerce Startup`,
    para: `The specific incident involving an e-commerce startup in Mumbai losing INR
      15 lakhs to a phishing scam in 2023 was a hypothetical example created to
      illustrate the potential risks and consequences of such attacks. While
      this particular story is fictional, it reflects the real and growing
      threat of phishing scams targeting businesses in India. For instance, in
      October 2023, Indian police uncovered a racket involving fake e-commerce
      websites that lured individuals with fraudulent discounts and deals. The
      suspects created deceptive links, gaining access to victims' bank accounts
      and extorting money. Financial analysis revealed transactions worth over
      INR 25 lakh from 15 victims. <a
        href="https://timesofindia.indiatimes.com/city/delhi/how-gang-used-fake-e-commerce-sites-to-dupe-several-people/articleshow/104355534.cms?utm_source=chatgpt.com"
        >(Times of India)</a
      >`,
  };

  let conclusion = {
    heading: `Conclusion`,
    para: `Cybersecurity is not a luxury but a necessity for Indian SMEs. By
      understanding the risks and implementing comprehensive security measures,
      businesses can protect themselves from potential threats and ensure their
      longevity in the digital age. At <span class="font-FifthHead"
        >DigitalDSA</span
      >, we are committed to helping businesses stay secure and resilient in an
      ever-evolving cyber landscape.`,
  };

  let navBarMedium = [
    "SME Threats",
    "Common Threats",
    "Essential Practices",
    "Conclusion",
  ];
</script>

<Seo
  type="WebPage"
  title="Cybersecurity for Indian SMEs: Protect Your Business Online"
  image="/images/integral-business-blog.jpg"
  description="Learn how Indian SMEs can tackle rising cyber threats with practical tips on training, ransomware defense, and data protection."
  keywords="Cybersecurity for SMEs India, Cybersecurity in Indian businesses, Cyber threats to Indian SMEs, Ransomware in Indian startups, Phishing scams India, Small business cyber protection India, Online business security India, Cybersecurity training for employees India, Data breaches in Indian SMEs, Cyberattack prevention India"
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={{
      heading:
        "Why Cybersecurity Must Be Integral to Your Online Business in India",
      coverImage: "/images/integral-business-blog.jpg",
      coverAlt: "images-altName",
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "SME Threats", targetId: "sme" },
            { name: "Common Threats", targetId: "threats" },
            { name: "Essential Practices", targetId: "prac" },
            { name: "Conclusion", targetId: "conclusion" },
          ],
        }}
        {activeSection}
      />
      <!-- online business -->
      <div data-section="sme" id="sme" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {onlineBusiness.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html onlineBusiness.para}
          </p>
        </div>
        <!-- reality -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {reality.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each reality.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
        <!-- real life -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {realLife.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html realLife.para}
          </p>
        </div>
      </div>
      <div data-section="threats" id="threats" class="">
        <!-- common threats -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {threats.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each threats.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
        <!-- sme -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {sme.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html sme.para}
          </p>
        </div>
      </div>
      <!-- essential practices -->
      <div data-section="prac" id="prac" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {essential.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each essential.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{list.desc}</p>
              </li>
            {/each}
          </ul>
        </div>
        <!-- example -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {example.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html example.para}
          </p>
        </div>
      </div>
      <!-- conclusion -->
      <div data-section="conclusion" id="conclusion" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {conclusion.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html conclusion.para}
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
            <div id="sme" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {onlineBusiness.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html onlineBusiness.para}
                </p>
              </div>
              <!-- reality -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {reality.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each reality.listItems as list}
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
              <!-- real life -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {realLife.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html realLife.para}
                </p>
              </div>
            </div>
          {:else if index == 1}
            <div id="threats" class="bg-white text-black">
              <!-- common threats -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {threats.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each threats.listItems as list}
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
              <!-- sme -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {sme.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html sme.para}
                </p>
              </div>
            </div>
          {:else if index == 2}
            <!-- essential practices -->
            <div id="prac" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {essential.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each essential.listItems as list}
                    <li class="space-y-2">
                      <h3 class="font-FourthHead text-paraFont">
                        {list.heading}
                      </h3>
                      <p class="font-Paragraph text-minParaFont">{list.desc}</p>
                    </li>
                  {/each}
                </ul>
              </div>
              <!-- example -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {example.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html example.para}
                </p>
              </div>
            </div>
          {:else if index == 3}
            <!-- conclusion -->
            <div id="conclusion" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {conclusion.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html conclusion.para}
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
