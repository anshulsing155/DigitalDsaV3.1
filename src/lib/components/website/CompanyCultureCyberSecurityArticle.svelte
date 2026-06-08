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

  let storyData = {
    heading: `Cybersecurity: Why Your Chai Break Could Save the Company`,
    para: ` It was a regular Monday morning at Raj’s office in Mumbai. As he sipped his
    steaming cup of chai, he casually skimmed through emails. One subject line
    caught his eye: <strong>"Salary Update: Action Required."</strong> Without thinking
    twice, he clicked the link. Within seconds, his screen went dark. A message appeared:
    <br><br>
    <span class="border-l-4 border-red-500 pl-2">
    🔒 <em
      >“Your files have been encrypted. Pay ₹5 lakhs in cryptocurrency to regain
      access.”</em
    >
  </span>
  <br><br>
Panic set in. Raj had unknowingly triggered a ransomware attack that locked
    the entire company’s systems. Orders were delayed, clients were furious, and
    the company lost lakhs in revenue—all because of one innocent click.
    <br><br>
Sounds like a nightmare? Unfortunately, it’s a reality for many businesses.
    For example, in 2021, <strong>Air India</strong> suffered a data breach that
    exposed the personal information of 4.5 million passengers.
    <br><br>
 But the real question is: <em>Could this happen at your company?</em>
    `,
  };

  let everyone = {
    heading: `Cybersecurity Isn’t Just for Techies—It’s Everyone’s Job`,
    para: `Gone are the days when cybersecurity was solely the IT department’s
    headache. In today’s digital world, every employee holds the keys to the
    company’s digital fortress. Whether you're a marketing executive in Delhi or
    an HR manager in Bengaluru, a single careless click can open the door to
    cybercriminals.
    <br><br>
 But here’s the good news: building a cyber-aware culture doesn’t mean
    drowning employees in tech jargon. Instead, it’s about helping them
    understand how their everyday actions impact the company’s security—and
    making the learning process engaging, relatable, and yes, even fun! 🎉
    `,
  };

  let example = {
    heading: `The Power of Leading by Example 🧑‍💼💼`,
    para: `Picture this: Your company’s leadership rolls out a new cybersecurity
    policy, but the CEO continues using “password123” for their email. Not
    exactly inspiring, right?
    <br><br>
 Now, imagine the opposite. After a data breach exposed customer information
    at <strong>Domino’s India</strong>, the company’s leadership implemented
    stricter cybersecurity measures and password protocols.
    <br><br>
    The lesson? Cybersecurity starts at the top. When leaders model good habits,
    employees naturally follow suit.
    `,
  };

  let fun = {
    heading: `Making Cybersecurity Personal (and a Little Fun) 😎`,
    firstPara: `Let’s face it—traditional cybersecurity training can be as exciting as
    watching paint dry. But what if learning to spot phishing emails or creating
    strong passwords could be engaging and even competitive?`,
    secPara: `The goal? To make cybersecurity part of everyday life—not just something
    employees think about during an annual training session.`,
    listItems: [
      {
        heading: `Cybersecurity Escape Rooms:`,
        desc: `Imagine teams racing against the
      clock to stop a simulated cyberattack—solving puzzles, cracking codes, and
      learning critical skills in the process. 🕶️💾`,
      },
      {
        heading: `Real-Life Case Studies:`,
        desc: `Share stories of companies that
      suffered cyberattacks—and those that prevented them. For example, after
      falling victim to ransomware, <strong>Cognizant</strong> lost an estimated
      $50-$70 million.`,
      },
      {
        heading: `Friendly Competitions:`,
        desc: `Host phishing simulation challenges
      and reward employees who spot suspicious emails. A little healthy competition
      can make cybersecurity more engaging. 🏆`,
      },
    ],
  };

  let empowerment = {
    heading: `From Fear to Empowerment: Creating a Blame-Free Culture 🗝️💡`,
    para: `Imagine this scenario: A junior employee in a Chennai-based IT firm clicks
    on a suspicious link. Worried about getting into trouble, they stay silent.
    Days later, malware spreads across the network, causing massive disruptions.
    <br><br>
    Now picture a different outcome. The same employee clicks the link but
    immediately reports it. The IT team isolates the infected computer,
    preventing the malware from spreading. Crisis averted.
    <br><br>
What made the difference? A company culture where employees feel safe
    reporting mistakes. Instead of blaming individuals, the focus is on fixing
    issues quickly and learning from them. This approach encourages employees to
    speak up—crucial for catching cyber threats before they escalate.
    `,
  };

  let investing = {
    heading: `Why Investing in Cybersecurity Is Cheaper Than a Cyberattack 🏧🛡️`,
    para: ` Some businesses hesitate to invest in cybersecurity, thinking it’s too
    expensive. But here’s the reality: the cost of a cyberattack can be
    devastating.
    <br><br>
    For example, the <strong>WannaCry ransomware attack</strong> crippled
    systems worldwide, including India’s Andhra Pradesh police department,
    causing massive disruptions.
    <br><br>
    A single ransomware incident can halt operations, damage customer trust, and
    lead to legal penalties—especially with India’s new <strong
      >Digital Personal Data Protection Act (DPDPA)</strong
    >. And let’s not forget the hit to your company’s reputation. In today’s
    competitive market, losing customer trust can be harder to recover from than
    a financial loss.
    `,
  };

  let team = {
    heading: `Cybersecurity Is a Team Sport 🤝`,
    para: `Let’s go back to Raj’s story. After the ransomware attack, his company
    learned a hard lesson. They introduced role-specific cybersecurity training,
    encouraging employees to report suspicious activity without fear of blame.
    Within months, the number of phishing incidents dropped, and employees
    became more confident in spotting cyber threats.
    <br><br>
     The takeaway? Building a cyber-aware culture is like building a winning
    cricket team. Every player—from the CEO to the newest intern—has a role to
    play. And just like in cricket, success comes from teamwork, practice, and
    staying one step ahead of the competition.
    `,
  };

  let final = {
    heading: `Final Thought: Could You Spot the Next Cyber Threat? 💻🕶️`,
    para: `The next time a suspicious email lands in your inbox, will you recognize it
    in time? Will you report unusual activity before it becomes a crisis? In the
    game of cybersecurity, the smallest actions can make the biggest difference.
    <br><br>
So, as you sip your next cup of chai at work, remember: You might just be
    the unsung hero who saves the day. ☕🦸‍♂️🦸‍♀️
    `,
  };

  let navBarMedium = [
    "First Step",
    "Smart Defense",
    "Cyber Awareness",
    "Final Thoughts",
  ];
</script>

<Seo
  type="WebPage"
  title="Take Control of Your Business Cybersecurity in India 2024"
  image="/images/company-cyber-security-blog.jpg"
  description="Protect your business from growing cyber threats in India with proven security practices and employee training. Stay safe in 2024."
  keywords="Business cybersecurity India, Cybersecurity threats 2024, Cyber attack prevention, Ransomware attacks India, Cybersecurity training for employees, Data breach India, Cybersecurity best practices, Indian cyber laws compliance, Cybersecurity awareness, Digital data protection India"
/>

<section class="mx-auto w-full">
  <SecondPageLayout
    pageData={{
      heading: " Coffee, Emails & Cyber Threats: A Modern Office Story",
      coverImage: "/images/company-cyber-security-blog.jpg",
      coverAlt: "images-altName",
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "First Step", targetId: "first" },
            { name: "Smart Defense", targetId: "smart" },
            { name: "Cyber Awareness", targetId: "awareness" },
            { name: "Final Thoughts", targetId: "final" },
          ],
        }}
        {activeSection}
      />

      <!-- story -->
      <div data-section="first" id="first" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {storyData.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html storyData.para}
          </p>
        </div>
        <!-- everyone's job -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {everyone.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html everyone.para}
          </p>
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
      <!-- fun -->
      <div data-section="smart" id="smart" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {fun.heading}
            </h2>
            <p class="font-Paragraph text-minParaFont">
              {@html fun.firstPara}
            </p>
          </div>
          <ul class="space-y-6">
            {#each fun.listItems as list}
              <li class="space-y-2">
                <h3 class="font-FourthHead text-paraFont">{list.heading}</h3>
                <p class="font-Paragraph text-minParaFont">{@html list.desc}</p>
              </li>
            {/each}
          </ul>
          <p class="font-Paragraph text-minParaFont">
            {@html fun.secPara}
          </p>
        </div>
      </div>
      <!-- empowerment -->
      <div data-section="awareness" id="awareness" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {empowerment.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html empowerment.para}
          </p>
        </div>
        <!-- investing -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {investing.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html investing.para}
          </p>
        </div>
      </div>
      <!-- team -->
      <div data-section="final" id="final" class="">
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {team.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html team.para}
          </p>
        </div>
        <!-- final thought -->
        <div
          class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <h2
            class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            {final.heading}
          </h2>
          <p class="font-Paragraph text-minParaFont">
            {@html final.para}
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
            <div id="first" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {storyData.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html storyData.para}
                </p>
              </div>
              <!-- everyone's job -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {everyone.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html everyone.para}
                </p>
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
          {:else if index == 1}
            <div id="smart" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {fun.heading}
                  </h2>
                  <p class="font-Paragraph text-minParaFont">
                    {@html fun.firstPara}
                  </p>
                </div>
                <ul class="space-y-6">
                  {#each fun.listItems as list}
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
                <p class="font-Paragraph text-minParaFont">
                  {@html fun.secPara}
                </p>
              </div>
            </div>
          {:else if index == 2}
            <div id="awareness" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {empowerment.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html empowerment.para}
                </p>
              </div>
              <!-- investing -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {investing.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html investing.para}
                </p>
              </div>
            </div>
          {:else if index == 3}
            <div id="final" class="bg-white text-black">
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {team.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {@html team.para}
                </p>
              </div>
              <!-- final thought -->
              <div
                class="flex flex-col gap-[2rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <h2
                  class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  {final.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
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
