<script>
  // import { onMount, createEventDispatcher } from "svelte";

  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import Anchor from "$lib/components/website/Anchor.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import AboveTitleWithTopIconCard from "$lib/components/website/AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithoutIconCard from "$lib/components/website/AboveTitleWithoutIconCard.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";

  // const dispatch = createEventDispatcher();

  // onMount(() => {
  //   setTimeout(() => {
  //     const text = document.querySelector(".content")?.innerText || "";
  //     dispatch("textExtracted", text);
  //   }, 100); // Small delay to ensure DOM updates
  // });

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

  let threatReal = {
    heading: `The Cyber Threat is Real – And It’s Closer Than You Think`,
    subHead: `Why Should Indian Businesses Care?`,
    para: `India’s rapid digital transformation has brought innovation, convenience,
    and growth. However, with this digital boom comes a darker side—cyber
    threats that lurk behind every click. Whether you are a small business, a
    growing startup, or an established enterprise, cyber criminals are watching,
    waiting for a single weak link to exploit.`,
  };

  let common = {
    heading: ` The Most Common Cyber Threats in India`,
    listItems: [
      {
        heading: `Ransomware Attacks – The Digital Hostage Situation`,
        desc: `Cyber criminals infiltrate systems, encrypt files, and demand a ransom for
    their release. Paying the ransom does not guarantee data recovery.`,
        story: `
      <span class="font-semibold italic">Real Story:</span> In November 2022,
    the All India Institute of Medical Sciences (AIIMS) in Delhi suffered a
    ransomware attack that corrupted their systems, wiping outpatient and
    research data from primary and backup servers. This incident disrupted
    services for over a month, highlighting significant security lapses. (<a
      href="https://www.hindustantimes.com"
      class="text-linkColor underline underline-offset-4"
      >Source: Hindustan Times</a
    >)`,
      },
      {
        heading: `Business Email Compromise (BEC) – The CEO Fraud`,
        desc: `Hackers impersonate a CEO, manager, or vendor to trick employees into
    transferring money or sharing sensitive data.`,
        story: `
    <span class="font-semibold italic">Real Story:</span> A Khar-based
    chemicals trading firm in Mumbai was defrauded of ₹10 lakh after cyber
    criminals spoofed the email ID of one of the company's raw material
    suppliers. The accounts department, believing the email to be legitimate,
    processed the payment, only to realize later that it was a scam. (<a
      href="https://www.hindustantimes.com"
      class="text-linkColor underline underline-offset-4"
      >Source: Hindustan Times</a
    >)`,
      },
      {
        heading: `Phishing Scams – The Fake But Convincing Trap`,
        desc: `Fraudulent emails, SMS, or messages masquerade as trusted sources (banks,
    service providers, or even colleagues). Clicking on malicious links can
    install malware or steal login credentials.`,
        story: `
    <span class="font-semibold italic">Real Story:</span> Cybersecurity
    researchers have uncovered phishing scams where attackers pretend to be
    victims' bosses, urging them to transfer funds or share confidential
    information. Such incidents have been reported across various Indian
    organizations, leading to significant financial losses. (<a
      href="https://www.indianexpress.com"
      class="text-linkColor underline underline-offset-4"
      >Source: Indian Express</a
    >)`,
      },
    ],
  };

  let plan = {
    heading: `How to Protect Your Business: The Ultimate Cybersecurity Plan`,
    listItems: [
      {
        subHead: `Step 1: Educate Your Team – Your First Line of Defense`,
        lists: [
          `Train employees to recognize phishing emails, social engineering tactics,
      and fake websites.`,
          `Conduct regular cybersecurity awareness sessions.`,
          `Implement and enforce a comprehensive cyber hygiene policy.`,
        ],
      },
      {
        subHead: `Step 2: Lock Down Your Data and Devices`,
        lists: [
          `Regularly back up important files to separate hard drives or secure cloud
      storage.`,
          `Keep all devices updated with the latest security patches.`,
          `Avoid using public Wi-Fi for business transactions.`,
        ],
      },
      {
        subHead: ` Step 3: Secure Your Passwords and Online Accounts`,
        lists: [
          `Use strong, unique passphrases.`,
          `Enable two-factor authentication (2FA) on all accounts.`,
          `Utilize a reputable password manager to store and manage credentials.`,
        ],
      },
    ],
  };

  let final = {
    heading: `Final Thoughts: Take Action Today`,
    para: `Investing in cybersecurity is not an expense; it is a crucial investment in
    your business's longevity and reputation. By implementing proactive measures
    today, you can avert substantial financial and reputational damages in the
    future.
    <br><br>
    Stay secure, stay informed, and safeguard your business against cyber
    threats.`,
  };

  let navBarMedium = [
    "Cyber Threat is Real",
    "Common Threats",
    "Protect Business",
    "Final Thoughts",
  ];
</script>

<Seo
  type="WebPage"
  title="Protect Your Indian Business: Cybersecurity Tips & Threats 2025"
  image="/images/protect-your-business-blog.jpg"
  description="Shield your Indian business from cyber threats like ransomware, phishing, and BEC fraud. Act now to secure data and avoid losses."
  keywords="Cybersecurity in India, Cyber threats for Indian businesses, Ransomware attack India, Phishing scams India, Business email compromise India, Cybersecurity tips for businesses, Cybercrime protection for SMEs, India cyber attack case study, Cybersecurity awareness India, Small business cyber protection India"
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={{
      heading:
        "Cybersecurity in India: Protect Your Business Before It’s Too Late!",
      coverImage: "/images/protect-your-business-blog.jpg",
      coverAlt: "images-altName",
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "Cyber Threat is Real", targetId: "real" },
            { name: "Common Threats", targetId: "common" },
            { name: "Protect Business", targetId: "protect" },
            { name: "Final Thoughts", targetId: "final" },
          ],
        }}
        {activeSection}
      />
      <div data-section="real" id="real" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <p class="typography-body-sm text-text-light">
            Imagine waking up to find that your business bank account is wiped
            clean, or that your customers' personal data is leaked online.
            Unfortunately, this is the reality for thousands of Indian
            businesses every year. Cyber-crime is no longer just a technology
            problem—it affects everyone, from small business owners using
            digital payments to large enterprises handling vast amounts of
            customer data.
          </p>
        </div>
        <!-- cyber threat is real -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="typography-h2 text-text-main"
          >
            {threatReal.heading}
          </h2>
          <h3 class="font-semibold typography-body-md">{threatReal.subHead}</h3>
          <p class="typography-body-sm text-text-light">
            {@html threatReal.para}
          </p>
        </div>
      </div>
      <!-- common threat -->
      <div data-section="common" id="common" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              {common.heading}
            </h2>
          </div>
          <ul class="space-y-6">
            {#each common.listItems as list}
              <li class="space-y-4">
                <h3 class="font-semibold typography-body-md">{list.heading}</h3>
                <p class="typography-body-sm text-text-light">{@html list.desc}</p>
                <p class="typography-body-sm text-text-light">
                  {@html list.story}
                </p>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <!-- protect business -->
      <div data-section="protect" id="protect" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="typography-h2 text-text-main"
          >
            {plan.heading}
          </h2>
          {#each plan.listItems as list}
            <h3 class="font-semibold typography-body-md">{list.subHead}</h3>
            <ul class="space-y-2 pl-5">
              {#each list.lists as item}
                <li class="list-disc typography-body-sm text-text-light space-y-2">
                  {item}
                </li>
              {/each}
            </ul>
          {/each}
        </div>
      </div>
      <!-- final thoughts -->
      <div data-section="final" id="final" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="typography-h2 text-text-main"
          >
            {final.heading}
          </h2>
          <p class="typography-body-sm text-text-light">
            {@html final.para}
          </p>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 mx-1 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>
          {#if index == 0}
            <div id="real" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <p class="typography-body-sm text-text-light">
                  Imagine waking up to find that your business bank account is
                  wiped clean, or that your customers' personal data is leaked
                  online. Unfortunately, this is the reality for thousands of
                  Indian businesses every year. Cyber-crime is no longer just a
                  technology problem—it affects everyone, from small business
                  owners using digital payments to large enterprises handling
                  vast amounts of customer data.
                </p>
              </div>
              <!-- cyber threat is real -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="typography-h2 text-text-main"
                >
                  {threatReal.heading}
                </h2>
                <h3 class="font-semibold typography-body-md">
                  {threatReal.subHead}
                </h3>
                <p class="typography-body-sm text-text-light">
                  {@html threatReal.para}
                </p>
              </div>
            </div>
          {:else if index == 1}
            <!-- common threat -->
            <div id="common" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    {common.heading}
                  </h2>
                </div>
                <ul class="space-y-6">
                  {#each common.listItems as list}
                    <li class="space-y-4">
                      <h3 class="font-semibold typography-body-md">
                        {list.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {@html list.desc}
                      </p>
                      <p class="typography-body-sm text-text-light">
                        {@html list.story}
                      </p>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else if index == 2}
            <!-- protect business -->
            <div id="protect" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="typography-h2 text-text-main"
                >
                  {plan.heading}
                </h2>
                {#each plan.listItems as list}
                  <h3 class="font-semibold typography-body-md">{list.subHead}</h3>
                  <ul class="space-y-2 pl-5">
                    {#each list.lists as item}
                      <li
                        class="list-disc typography-body-sm text-text-light space-y-2"
                      >
                        {item}
                      </li>
                    {/each}
                  </ul>
                {/each}
              </div>
            </div>
          {:else if (index == 3)}
            <!-- final thoughts -->
            <div id="final" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="typography-h2 text-text-main"
                >
                  {final.heading}
                </h2>
                <p class="typography-body-sm text-text-light">
                  {@html final.para}
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
            `<span class="font-semibold">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-semibold">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
            `<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </SecondPageLayout>
</section>
