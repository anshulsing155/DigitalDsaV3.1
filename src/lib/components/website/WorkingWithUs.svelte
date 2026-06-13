<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";

  const tableData = [
    [
      "Impactful Work – See how your contributions directly transform financial experiences for thousands of users.",
      "Ownership Mindset – Treat challenges as opportunities, take initiative, and own your work end-to-end.",
    ],
    [
      "Growth & Learning – Stay ahead in fintech with access to cutting-edge tech, mentorship, and continuous learning opportunities.",
      " Curiosity & Agility – Stay adaptable, question the norm, and be ready to pivot when necessary.",
    ],
    [
      "Collaboration & Respect – Work with a team that values your ideas, respects your individuality, and fosters a culture of open feedback and innovation.",
      "Team Spirit – Work together, lift others up, and share knowledge to achieve collective success.",
    ],
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
    }
    setTimeout(() => {
      detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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
      activeSection = currentSection;
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

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/familyWorkWithSmile.jpg",
      altName: "hero-cover",
      heading: "Working with Us",
      para: `We’re not just another fintech—we’re on a mission to revolutionize the loan and financial advisory space </span>  with transparency, innovation, and customer-first solutions. When you join us, you become part of a team that’s reshaping the way people access financial products, making it simpler, smarter, and stress-free </span> .`,
    }}
  >
    <div class="hidden lg:block">
      <div>
        <StickyNavbar
          navList={{
            items: [
              {
                name: "Our purpose",
                targetId: `purpose`,
              },
              {
                name: "Our core",
                targetId: `core`,
              },
              {
                name: "First Philosophy",
                targetId: `philosophy`,
              },
              {
                name: "Our People",
                targetId: `people`,
              },
              {
                name: "Our Code ",
                targetId: `code`,
              },
              {
                name: "Leadership ",
                targetId: `leadership`,
              },
            ],
          }}
          {activeSection}
        />
      </div>
      <div
        id="purpose"
        data-section="purpose"
        class="border-b border-[var(--form-border)] lg:px-[4rem]"
      >
        <ThingsYouShould
          thinkKnow={{
            heading: "Our Purpose",
            subheading: "Empowering financial freedom through innovation.",
            subPara: [
              `Every day, we wake up with one goal: to help people make better financial decisions by providing clear, unbiased, and tech-driven solutions. Our platform is designed to remove the confusion, middlemen, and hidden charges from financial products, giving customers  full control over their financial choices </span>.`,
            ],
          }}
        />
      </div>
      <div id="core" data-section="core">
        <AboveTitleWithTopIconCard
          contents={{
            heading: "Our Core Values",
            subHeading: "Our culture is built on three key pillars:",
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Care ",

                para: `We genuinely care about our customers and teammates, fostering an environment of trust, humility, and collaboration`,
                icon: "/icons/search.svg",
                altName: "icons-search",
              },
              {
                heading: "Courage ​​",
                para: `We challenge the status quo, embrace change, and take bold steps toward innovation and customer satisfaction.`,
                icon: "/icons/apply.svg",
                altName: "icons-apply",
              },
              {
                heading: "Commitment ",
                para: `We are relentless in our mission to simplify finance, ensuring every decision and action aligns with our purpose.`,
                icon: "/icons/apply-pen.svg",
                altName: "icons-apply-pen",
              },
            ],
          }}
        />
      </div>
      <div id="philosophy" data-section="philosophy">
        <AboveTitleWithTopIconCard
          contents={{
            heading: "Customer-First Philosophy: T.E.S. Approach",
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Transparency  ",

                para: `No hidden terms, no misleading sales tactics—just clear and honest financial advice.`,
                icon: "/icons/search.svg",
                altName: "icons-search",
              },
              {
                heading: "Empowerment  ​​",
                para: `Giving users the tools and knowledge to make informed financial choices <span class="font-semibold" without pressure or spam calls.</span>`,
                icon: "/icons/apply.svg",
                altName: "icons-apply",
              },
              {
                heading: "Simplicity  ",
                para: `Making loans, financial planning, and investment decisions as easy as a few clicks.`,
                icon: "/icons/apply-pen.svg",
                altName: "icons-apply-pen",
              },
            ],
          }}
        />
      </div>
      <div id="people" data-section="people">
        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="flex flex-col gap-[1rem] mb-[1rem]">
            <h2
              class="typography-h2 text-text-main"
            >
              Our People Promise
            </h2>
            <p class="typography-body-sm text-text-light">
              We don’t just build financial solutions—we build careers that
              matter. You can expect an environment where you’ll be challenged,
              supported, and empowered to do your best work.
            </p>
          </div>
          <div class="overflow-x-auto">
            <table
              class="w-full border border-gray-300 rounded-lg shadow-lg text-left font-semibold typography-body-sm"
            >
              <thead>
                <tr
                  class="bg-[#495057] grid grid-cols-2 text-white text-center"
                >
                  <th class="py-3 px-4 border-r border-white"
                    >What You Can Expect from Us
                  </th>
                  <th class="py-3 px-4">What We Expect from You </th>
                </tr>
              </thead>
              <tbody>
                {#each tableData as item, i}
                  <tr
                    class="border-b border-black grid grid-cols-2 divide-x {i % 2 === 0 ? 'bg-[#e5e5e5]' : 'bg-[#f8f9fa]'}"
                  >
                    {#each item as val}
                      <td class="py-4 px-4 border-black">{val}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="code" data-section="code">
        <div class="border-b border-[var(--form-border)] lg:px-[4rem]">
          <ThingsYouShould
            thinkKnow={{
              heading: "Our Code of Trust",
              subHeading: "Doing What’s Right, Always!",
              subPara: [
                `Our Code of Trust guides every decision we make. It ensures we uphold the highest ethical standards, prioritize customer-first solutions, and navigate challenges with integrity. When in doubt, we ask ourselves  “Is this truly in the best interest of our users?”  If the answer isn’t a clear yes , we go back to the drawing board.`,
              ],
            }}
          />
        </div>
      </div>
      <div id="leadership" data-section="leadership">
        <AboveTitleWithTopIconCard
          contents={{
            heading: "Our Leadership Principles",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Customer-First Obsession ",

                para: `<ul class="list-disc pl-4 space-y-2">
      <li> Put customers at the heart of every decision.</li>
      <li> Continuously improve their experience.</li>
      <li> Anticipate needs and create solutions before they ask.</li>
    </ul>`,
                icon: "/icons/search.svg",
                altName: "icons-search",
              },
              {
                heading: "Lead as an owner – ​​",
                para: `<ul class="list-disc pl-4 space-y-2">
      <li>Simplify complexity, build clarity, and align teams.</li>
      <li>Take smart risks and focus on long-term value.</li>
      <li>Seek out obstacles and turn them into opportunities.</li>
    </ul>`,
                icon: "/icons/apply.svg",
                altName: "icons-apply",
              },
              {
                heading: "Stay Humble, Stay Curious  ",
                para: `<ul class="list-disc pl-4 space-y-2">
      <li>Never stop learning—ask, listen, reflect, and evolve.</li>
      <li>Embrace feedback and use it to grow.</li>
      <li>Set ambitious goals and persist until they’re achieved.</li>
    </ul>`,
                icon: "/icons/apply-pen.svg",
                altName: "icons-apply-pen",
              },
              {
                heading: `Build "A-Teams" `,
                subHeading:
                  " Great people create exceptional companies. We hire smart, ambitious individuals and help them unlock their full potential.",
                para: `<ul class="list-disc pl-4 space-y-2">
      <li>Never stop learning—ask, listen, reflect, and evolve.</li>
      <li>Embrace feedback and use it to grow.</li>
      <li>Set ambitious goals and persist until they’re achieved.</li>
    </ul>`,
                icon: "/icons/contact.svg",
                altName: "icons-contact",
              },
            ],
          }}
        />
      </div>
    </div>

    <div class="lg:hidden">
      {#each ["Our purpose", "Our core", "First Philosophy", "Our People", "Our Code ", "Leadership "] as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-2 py-4"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div class="pb-[2rem] bg-white text-black">
              <ThingsYouShould
                thinkKnow={{
                  heading: "Our Purpose",
                  subheading:
                    "Empowering financial freedom through innovation.",
                  subPara: [
                    `Every day, we wake up with one goal: to help people make better financial decisions by providing clear, unbiased, and tech-driven solutions. Our platform is designed to remove the confusion, middlemen, and hidden charges from financial products, giving customers  full control over their financial choices </span>.`,
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div class="pb-[2rem] bg-white text-black px-2">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: "Our Core Values",
                  subHeading: "Our culture is built on three key pillars:",
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Care ",

                      para: `We genuinely care about our customers and teammates, fostering an environment of trust, humility, and collaboration`,
                      icon: "/icons/search.svg",
                      altName: "icons-search",
                    },
                    {
                      heading: "Courage ​​",
                      para: `We challenge the status quo, embrace change, and take bold steps toward innovation and customer satisfaction.`,
                      icon: "/icons/apply.svg",
                      altName: "icons-apply",
                    },
                    {
                      heading: "Commitment ",
                      para: `We are relentless in our mission to simplify finance, ensuring every decision and action aligns with our purpose.`,
                      icon: "/icons/apply-pen.svg",
                      altName: "icons-apply-pen",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div class="bg-white text-black px-2">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: "Customer-First Philosophy: T.E.S. Approach",
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Transparency  ",

                      para: `No hidden terms, no misleading sales tactics—just clear and honest financial advice.`,
                      icon: "/icons/search.svg",
                      altName: "icons-search",
                    },
                    {
                      heading: "Empowerment  ​​",
                      para: `Giving users the tools and knowledge to make informed financial choices <span class="font-semibold" without pressure or spam calls.</span>`,
                      icon: "/icons/apply.svg",
                      altName: "icons-apply",
                    },
                    {
                      heading: "Simplicity  ",
                      para: `Making loans, financial planning, and investment decisions as easy as a few clicks.`,
                      icon: "/icons/apply-pen.svg",
                      altName: "icons-apply-pen",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black px-2">
              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="flex flex-col gap-[1rem] mb-[1rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    Our People Promise
                  </h2>
                  <p class="typography-body-sm text-text-light">
                    We don’t just build financial solutions—we build careers
                    that matter. You can expect an environment where you’ll be
                    challenged, supported, and empowered to do your best work.
                  </p>
                </div>
                <div class="overflow-x-auto">
                  <table
                    class="w-full border border-gray-300 rounded-lg shadow-lg text-left font-semibold typography-body-sm"
                  >
                    <thead>
                      <tr
                        class="bg-[#495057] grid grid-cols-2 text-white text-center"
                      >
                        <th class="py-3 px-4 border-r border-white"
                          >What You Can Expect from Us
                        </th>
                        <th class="py-3 px-4">What We Expect from You </th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each tableData as item, i}
                        <tr
                          class="border-b border-black grid grid-cols-2 divide-x {i % 2 === 0 ? 'bg-[#e5e5e5]' : 'bg-[#f8f9fa]'}"
                        >
                          {#each item as val}
                            <td class="py-4 px-4 border-black">{val}</td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          {:else if index === 4}
            <div class="bg-white text-black px-2">
              <ThingsYouShould
                thinkKnow={{
                  heading: "Our Code of Trust",
                  subHeading: "Doing What’s Right, Always!",
                  subPara: [
                    `Our Code of Trust guides every decision we make. It ensures we uphold the highest ethical standards, prioritize customer-first solutions, and navigate challenges with integrity. When in doubt, we ask ourselves <span class="font-semibold"> “Is this truly in the best interest of our users?” </span> If the answer isn’t a clear <span class="font-semibold">yes </span> , we go back to the drawing board.`,
                  ],
                }}
              />
            </div>
          {:else if index === 5}
            <div class="bg-white text-black px-2">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: "Our Leadership Principles",
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Customer-First Obsession ",

                      para: `<ul class="list-disc pl-4 space-y-2">
        <li> Put customers at the heart of every decision.</li>
        <li> Continuously improve their experience.</li>
        <li> Anticipate needs and create solutions before they ask.</li>
      </ul>`,
                      icon: "/icons/search.svg",
                      altName: "icons-search",
                    },
                    {
                      heading: "Lead as an owner  ​​",
                      para: `<ul class="list-disc pl-4 space-y-2">
        <li>Simplify complexity, build clarity, and align teams.</li>
        <li>Take smart risks and focus on long-term value.</li>
        <li>Seek out obstacles and turn them into opportunities.</li>
      </ul>`,
                      icon: "/icons/apply.svg",
                      altName: "icons-apply",
                    },
                    {
                      heading: "Stay Humble, Stay Curious  ",
                      para: `<ul class="list-disc pl-4 space-y-2">
        <li>Never stop learning—ask, listen, reflect, and evolve.</li>
        <li>Embrace feedback and use it to grow.</li>
        <li>Set ambitious goals and persist until they’re achieved.</li>
      </ul>`,
                      icon: "/icons/apply-pen.svg",
                      altName: "icons-apply-pen",
                    },
                    {
                      heading: `Build "A-Teams" `,
                      subHeading:
                        " Great people create exceptional companies. We hire smart, ambitious individuals and help them unlock their full potential.",
                      para: `<ul class="list-disc pl-4 space-y-2">
        <li>Never stop learning—ask, listen, reflect, and evolve.</li>
        <li>Embrace feedback and use it to grow.</li>
        <li>Set ambitious goals and persist until they’re achieved.</li>
      </ul>`,
                      icon: "/icons/contact.svg",
                      altName: "icons-contact",
                    },
                  ],
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div
      class="px-[0.5rem] py-[2rem] lg:px-[4rem] typography-body-md lg:py-[4rem] space-y-2 lg:text-center"
    >
      <h3 class="">
        We’re not just offering a job—we’re inviting you to be part of a
        <span class="font-semibold">fintech revolution</span>.
        <br /> Are you ready to shape the future of
        <span class="font-semibold"> finance with us? </span> 🚀
      </h3>
    </div>
  </NewPageLayout>
</section>
