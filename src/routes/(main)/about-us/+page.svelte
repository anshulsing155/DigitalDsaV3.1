<script lang="ts">
  import Button from "$lib/components/website/Button.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import NewBlogCard from "$lib/components/website/NewBlogCard.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import { onMount } from "svelte";

  let cardImg1 = "/images/prashantbajpai.png";
  let cardImg2 = "/images/nishant.png";
  let cardAlt1 = "CardCover";

  let navBarMedium = [
    "Where it all began",
    "Meet Our Leaders",
    // "Leadership and Governance",
    // "Investors",
    "Core Values",
    // "Newsroom",
    // "Career",
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
  image="/images/who-we-are.jpg"
  title="Digital DSA: Simplifying Loans & Financial Empowerment"
  description="Join Digital DSA, where loans are simple, transparent & hassle-free. Empower your financial future with expert guidance & smart tools!"
  keywords="Digital DSA, Simplified loan process, Easy loan applications, Financial empowerment, Transparent loan solutions, Loan comparison platform, Financial education India, Hassle-free borrowing, Best loan platform India, Smart financial tools"
/>
<section>
  <SecondPageLayout
    pageData={{
      heading: "Reimagining Your Financial Future.",
      coverImage: "/images/who-we-are.jpg",
      coverAlt:
        "photo of human hands joining together representing DigitalDSA team",
      sourceName: "Freepik",
      originalSource:
        "https://www.freepik.com/free-photo/closeup-diverse-people-joining-their-hands_12193015.htm",
    }}
  >
    <div class="block lg:hidden">
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
            <div
              id="began"
              class="flex flex-col gap-[2.5rem] border-b border-borderColor py-[3rem] bg-white text-black px-[0.5rem]"
            >
              <p
                class="mt-[1rem] font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
              >
                Where it all began
              </p>
              <div class="grid gap-4 font-Paragraph text-subParaFont">
                <p>
                  Prashant and Nishant Bajpai, two determined brothers, turned a
                  frustrating experience into a groundbreaking venture. At the
                  beginning of 2023, they faced the red tape and confusion of
                  loan applications. This sparked a revolutionary idea: Digital
                  DSA
                </p>

                <p>
                  The Bajpai brothers envisioned a platform to simplify loans
                  and make financial education engaging. With this mission, they
                  created Digital DSA, aiming to empower every Indian with
                  straightforward, accessible loans and enjoyable financial
                  learning.
                </p>

                <p>
                  Digital DSA is more than a financial service; it’s a movement
                  rewriting finance rules. Prashant and Nishant believe
                  borrowing should be easy and financial education fun. They aim
                  to break down barriers making loans seem intimidating.
                </p>

                <p>
                  Digital DSA’s user-friendly platform guides users through loan
                  applications with clarity. Using cutting-edge technology, they
                  developed a seamless, transparent system that simplifies
                  securing loans. Their mission extends to financial literacy,
                  ensuring informed financial decisions.
                </p>

                <p>
                  Explore Digital DSA, where innovation meets accessibility, and
                  your financial and loan aspirations are within reach.
                </p>
              </div>
            </div>
          {:else if index == 1}
            <div class="pt-[2rem] bg-white text-black px-[0.5rem]" id="team">
              <h2 class="font-ThirdHead text-mobSubHead text-center">
                Meet Our Leaders
              </h2>
              <TwoColumn
                cardImage={cardImg1}
                cardAltName={cardAlt1}
                cardHeading="Prashant Bajpai"
                sourceName="DigitalDSA"
                originalSource="www.digitaldsa.com/about-us"
              >
                <ul
                  class="grid gap-[2rem] font-Paragraph text-subParaFont"
                  slot="list"
                >
                  <div class="grid gap-4">
                    <li class="font-ThirdHead text-minSubHead">
                      Founder Digital DSA
                    </li>
                    <li>
                      Introducing Prashant Bajpai – the engineering wizard and
                      founder of Digital DSA! With a B.Tech. in Mechanical
                      Engineering and over 20 years of experience in R & D,
                      Prashant is our go-to tech genius. He’s the mastermind
                      behind the scenes, ensuring our platform runs like a
                      dream. With his talent for tackling complex problems and
                      his flair for leadership, Prashant ensures that Digital
                      DSA runs smoothly and is a delight to use.
                    </li>
                  </div>
                </ul>
              </TwoColumn>
              <TwoColumn
                cardImage={cardImg2}
                cardAltName={cardAlt1}
                cardHeading="Nishant Bajpai"
                sourceName="DigitalDSA"
                originalSource="www.digitaldsa.com/about-us"
                reverse={true}
              >
                <ul
                  class="grid gap-[2rem] font-Paragraph text-subParaFont"
                  slot="list"
                >
                  <div class="grid gap-4">
                    <li class="font-ThirdHead text-minSubHead">
                      Co-founder Digital DSA
                    </li>
                    <li>
                      Meet Nishant Bajpai – the financial superhero and our
                      other co-founder! Armed with a BTech in Information
                      Technology and an MBA, Nishant’s 15 years of expertise in
                      banking and finance are truly unmatched. He’s the guy who
                      demystifies the complexities of loan products, bank loan
                      processes, document requirements, and financial jargon.
                      Nishant turns complex financial data into straightforward
                      solutions and keeps the loan process smooth and simple.
                      His mission is to make finance feel less like a chore and
                      more like a breeze.
                    </li>
                  </div>
                </ul>
              </TwoColumn>
            </div>
            <!-- {:else if index == 2}
              <div
                id="Leadership and Governance"
                class="border-t border-borderColor bg-white px-[2rem] text-black"
              >
                <HomeLoanCalculator
                  homeLoanCalculator={leadership}
                  gridCol={3}
                />
              </div> -->
            <!-- {:else if index == 3}
              <div id="Investors" class="bg-white px-[2rem] text-black">
                <TwoColumn
                  cardImage={cardImg1}
                  cardAltName={cardAlt1}
                  cardHeading={cardHead1}
                  reverse={true}
                >
                  <ul
                    class="grid gap-4 font-Paragraph text-subParaFont"
                    slot="list"
                  >
                    <li>
                      Visit our Investor centre for information on our
                      securities, financial results, announcements,
                      sustainability reporting, and other disclosures.
                    </li>
                    <li>
                      <Anchor linkName="Find out more" link="" />
                    </li>
                  </ul>
                </TwoColumn>
              </div> -->
          {:else if index == 2}
            <div
              id="sustainability"
              class="pt-[2rem] flex flex-col gap-[2.5rem] bg-white text-black px-[1rem]"
            >
              <h3
                class="font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
              >
                Core Values
              </h3>
              <div
                class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-[3rem]"
              >
                <NewBlogCard
                  blogLists={[
                    {
                      icon: "/images/vision.jpg",
                      altName: "blog-image",
                      heading: "Vision",
                      para: "To revolutionize the loan and financial services industry by making borrowing simple, transparent, and hassle-free for every individual.",
                      sourceName: "Freepik",
                      originalSource:
                        "https://www.freepik.com/free-photo/tourist-is-holding-through-binoculars-sunny-cloudy-sky-from-mountain-top_4351569.htm",
                      // linkName: "",
                      // url: "/sustainability",
                    },
                    {
                      icon: "/images/mission.jpg",
                      altName: "blog-image",
                      heading: "Mission",
                      para: "To empower customers with innovative financial tools, unbiased loan comparisons, and expert guidance—ensuring they make informed decisions with zero spam, zero hidden charges, and maximum savings.",
                      sourceName: "Freepik",
                      originalSource:
                        "https://www.freepik.com/free-photo/hiker-going-up-aiguille-du-midi_18642640.htm",
                      // linkName: "",
                      // url: "",
                    },
                    {
                      icon: "/images/values.jpg",
                      altName: "blog-image",
                      heading: "Values",
                      para: "Transparency in financial solutions, customer empowerment through smart tools, and continuous innovation for a seamless experience.",
                      sourceName: "Freepik",
                      originalSource:
                        "https://www.freepik.com/free-photo/silhouette-teamwork-helping-hand-trust-help-success-mountains-hikers-celebrate-with-hands-up-help-each-other-top-mountain-sunset-landscape_25595612",
                      linkName: "See our policies and practices",
                      url: "/privacy-policy",
                    },
                  ]}
                />
              </div>
            </div>
            <!-- {:else if index == 5}
              <div
                id="Career"
                class="flex flex-col bg-white px-[2rem] text-black"
              >
                <div class="grid gap-[2rem] border-t border-borderColor">
                  <h3
                    class="font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    Careers
                  </h3>
                  <div
                    class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-[3rem]"
                  >
                    {#each careers as career}
                      <BlogCard
                        icon={career.coverImg}
                        altName={career.altName}
                        title={career.title}
                        paragraph={career.paragraph}
                        linkName={career.linkName}
                        url={career.link}
                      />
                    {/each}
                  </div>
                </div>

                <div><Ways ways={Job} /></div>
              </div> -->
          {/if}
        </details>
      {/each}
    </div>

    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "Where it all began", targetId: "where" },
            { name: "Meet Our Leaders", targetId: "ourteam" },
            // { name: "Leadership and Governance", targetId: "leadership" },
            // { name: "Investors", targetId: "investors" },
            { name: "Core Values", targetId: "sustain" },
            // { name: "Newsroom", targetId: "newsroom" },
            // { name: "Careers", targetId: "career" },
          ],
        }}
        {activeSection}
      />

      <div class="grid px-[4rem]">
        <div
          data-section="where"
          id="where"
          class="flex flex-col gap-[2.5rem] border-b border-borderColor py-[3rem]"
        >
          <p
            class="mt-[1rem] font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
          >
            Where it all began
          </p>
          <div class="grid gap-4 font-Paragraph text-subParaFont">
            <p>
              Prashant and Nishant Bajpai, two determined brothers, turned a
              frustrating experience into a groundbreaking venture. At the
              beginning of 2023, they faced the red tape and confusion of loan
              applications. This sparked a revolutionary idea: Digital DSA
            </p>

            <p>
              The Bajpai brothers envisioned a platform to simplify loans and
              make financial education engaging. With this mission, they created
              Digital DSA, aiming to empower every Indian with straightforward,
              accessible loans and enjoyable financial learning.
            </p>

            <p>
              Digital DSA is more than a financial service; it’s a movement
              rewriting finance rules. Prashant and Nishant believe borrowing
              should be easy and financial education fun. They aim to break down
              barriers making loans seem intimidating.
            </p>

            <p>
              Digital DSA’s user-friendly platform guides users through loan
              applications with clarity. Using cutting-edge technology, they
              developed a seamless, transparent system that simplifies securing
              loans. Their mission extends to financial literacy, ensuring
              informed financial decisions.
            </p>

            <p>
              Explore Digital DSA, where innovation meets accessibility, and
              your financial and loan aspirations are within reach.
            </p>
          </div>
        </div>

        <div data-section="ourteam" id="ourteam" class="mt-[2rem]">
          <h2 class="font-SecHead text-mobHeadFont text-center">
            Meet Our Leaders
          </h2>
          <TwoColumn
            cardImage={cardImg1}
            cardAltName={cardAlt1}
            cardHeading="Prashant Bajpai"
            sourceName="DigitalDSA"
            originalSource="www.digitaldsa.com/about-us"
          >
            <ul
              class="grid gap-[2rem] font-Paragraph text-subParaFont"
              slot="list"
            >
              <div class="grid gap-4">
                <li class="font-ThirdHead text-minSubHead">Founder</li>
                <li>
                  Introducing Prashant Bajpai – the engineering wizard and
                  founder of Digital DSA! With a B.Tech. in Mechanical
                  Engineering and over 20 years of experience in R & D, Prashant
                  is our go-to tech genius. He’s the mastermind behind the
                  scenes, ensuring our platform runs like a dream. With his
                  talent for tackling complex problems and his flair for
                  leadership, Prashant ensures that Digital DSA runs smoothly
                  and is a delight to use.
                </li>
              </div>
            </ul>
          </TwoColumn>
          <TwoColumn
            cardImage={cardImg2}
            cardAltName={cardAlt1}
            cardHeading="Nishant Bajpai"
            sourceName="DigitalDSA"
            originalSource="www.digitaldsa.com/about-us"
            reverse={true}
          >
            <ul
              class="grid gap-[2rem] font-Paragraph text-subParaFont"
              slot="list"
            >
              <div class="grid gap-4">
                <li class="font-ThirdHead text-minSubHead">Co-founder</li>
                <li>
                  Meet Nishant Bajpai – the financial superhero and our other
                  co-founder! Armed with a B.Tech. in Information Technology and
                  an MBA, Nishant’s 15 years of expertise in banking and finance
                  are truly unmatched. He’s the guy who demystifies the
                  complexities of loan products, bank loan processes, document
                  requirements, and financial jargon. Nishant turns complex
                  financial data into straightforward solutions and keeps the
                  loan process smooth and simple. His mission is to make finance
                  feel less like a chore and more like a breeze.
                </li>
              </div>
            </ul>
          </TwoColumn>
        </div>

        <div
          data-section="sustain"
          id="sustain"
          class="grid gap-[2.5rem] py-[2rem] border-y border-borderColor"
        >
          <h3
            class="font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
          >
            Core Values
          </h3>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-[3rem]">
            <NewBlogCard
              blogLists={[
                {
                  icon: "/images/vision.jpg",
                  altName: "blog-image",
                  heading: "Vision",
                  para: "To revolutionize the loan and financial services industry by making borrowing simple, transparent, and hassle-free for every individual.",
                  sourceName: "Freepik",
                  originalSource:
                    "https://www.freepik.com/free-photo/tourist-is-holding-through-binoculars-sunny-cloudy-sky-from-mountain-top_4351569.htm",
                  // linkName: "",
                  // url: "/sustainability",
                },
                {
                  icon: "/images/mission.jpg",
                  altName: "blog-image",
                  heading: "Mission",
                  para: "To empower customers with innovative financial tools, unbiased loan comparisons, and expert guidance—ensuring they make informed decisions with zero spam, zero hidden charges, and maximum savings.",
                  sourceName: "Freepik",
                  originalSource:
                    "https://www.freepik.com/free-photo/hiker-going-up-aiguille-du-midi_18642640.htm",
                  // linkName: "",
                  // url: "",
                },
                {
                  icon: "/images/values.jpg",
                  altName: "blog-image",
                  heading: "Values",
                  para: "Transparency in financial solutions, customer empowerment through smart tools, and continuous innovation for a seamless experience.",
                  sourceName: "Freepik",
                  originalSource:
                    "https://www.freepik.com/free-photo/silhouette-teamwork-helping-hand-trust-help-success-mountains-hikers-celebrate-with-hands-up-help-each-other-top-mountain-sunset-landscape_25595612",
                  linkName: "See our policies and practices",
                  url: "/privacy-policy",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
    <TwoColumnWithImage
      contents={{
        cardImage: `/images/message.jpg`,
        cardAltName: `CardCover`,
        cardHeading: `Message us 24/7`,
        sourceName: "DigitalDSA",
        originalSource: "www.digitaldsa.com",
        reverse: false
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>
    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,

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
    </div>
  </SecondPageLayout>
</section>
