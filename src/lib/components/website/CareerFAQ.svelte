<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import Seo from "$lib/components/Seo.svelte";

  let thinkYouShouldKnow = {
    heading: "Things You Should Know",
    paraGraph: [
      `Timelines vary: While we strive to move quickly, some roles may have longer processing times depending on the number of applicants and required background checks.`,
      `Stay connected: Keep an eye on your <a href=""> email and phone </a> for updates regarding your application status.`,
      `Multiple applications? If you apply for multiple roles, each application will be assessed independently.`,
      `Need assistance? If you require accessibility accommodations, don’t hesitate to reach out – we’re here to support you.`,
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
      if (rect.top <= 100 && rect.bottom >= 100) {
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

<Seo
  type="WebPage"
  image="/images/career-faq-blog.jpg"
  title="Careers at DigitalDSA | Hiring Process, Roles & FAQs"
  description="Explore job openings, interview tips, and FAQs about working at DigitalDSA. Apply now and join a fast-growing fintech revolution!"
  keywords="DigitalDSA careers, Fintech jobs in India, Fintech hiring process, DigitalDSA job openings, Startup job opportunities, Careers at DigitalDSA, Work at fintech startup, DigitalDSA interview process, Apply for fintech jobs, DigitalDSA internships, Remote fintech jobs, Freshers jobs fintech, Hiring process DigitalDSA, Fintech company recruitment, DigitalDSA onboarding process"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/career-faq-blog.jpg",
      altName: "hero-cover",
      heading: "Careers FAQs",
      para: `Got a question about working with us?   Here are some of the most commonly asked questions about applying for a role at DigitalDSA.`,
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Hiring process",
              targetId: `hiring`,
            },
            {
              name: "Job opening",
              targetId: `opening`,
            },
            {
              name: "Interview process",
              targetId: `process`,
            },
            {
              name: "Background checks",
              targetId: `checks`,
            },
            {
              name: "Other FAQs",
              targetId: `faq`,
            },
          ],
        }}
        {activeSection}
      />
      <div id="hiring" data-section="hiring">
        <AboveTitleWithoutIconCard
          contents={{
            xlGridCol: 3,
            heading: "Our Hiring Process",
            borderBottom: true,
            cards: [
              {
                heading: "Q. What is the recruitment process at DigitalDSA?",
                subHeading: `Find the right opportunity for you `,
                para: `<p class=" mb-2">Ans. <span class="font-FifthHead" >Our hiring process is designed to be simple and efficient:</span></p> 
                <ul class="list-decimal pl-4">
      <li>Application Review – Our Talent Acquisition team reviews your application.</li>
      <li>Initial Screening – If shortlisted, you'll be invited for a virtual/phone screening.</li>
      <li>Interview Process – Depending on the role, you may have 1-2 interviews with team leads.</li>
      <li>Assessment (if required) – Some roles may require an online test.</li>
      <li>Offer & Onboarding – If selected, we’ll guide you through the onboarding process.</li>
    </ul>`,
              },
              {
                heading: "Q. How long does the hiring process take?​​",
                para: `Ans. Typically, the process takes <span class="font-FourthHead" 2-4 weeks  from application submission to offer.`,
              },
              {
                heading:
                  "Q. How will I be updated about my application status?​",
                para: `Ans. You’ll receive email notifications at each stage. If selected, a recruiter will connect with you directly.`,
              },
              {
                heading: "Q. Can I apply for multiple roles?",
                para: `Ans. Yes! Feel free to apply for any roles that match your skills and interests.​​`,
              },
              {
                heading:
                  "Q. I’m having trouble submitting my application. What should I do?​",
                para: `Ans. If you face issues, email <span class="font-FifthHead"> careers@digitaldsa.com </span>  for assistance `,
              },
            ],
          }}
        />
      </div>
      <div id="opening" data-section="opening">
        <AboveTitleWithoutIconCard
          contents={{
            xlGridCol: 3,
            heading: "Job Openings & Applications",
            borderBottom: true,
            cards: [
              {
                heading: "Q. Where can I find current job openings?",
                subHeading: `Find the right opportunity for you `,
                para: `Ans. Our latest job postings are available on our  Careers Page .`,
              },
              {
                heading: "Q. What roles are available at DigitalDSA?​​",
                para: `Ans. We are hiring in  Sales, Operations, Marketing, Product, and IT Support .`,
              },
              {
                heading: "Q. Do you offer remote or hybrid roles?",
                para: `Ans. Some roles are  remote-friendly , while others may require on-site presence. The job description will specify the work model`,
              },
              {
                heading: "Q. Do I need prior Fintech experience?",
                para: `Ans. It depends on the role. While Fintech experience is a plus, we value skills, adaptability, and a growth mindset.​`,
              },
              {
                heading:
                  "Q. Is there an age limit or specific qualifications required?​",
                para: `Ans. We welcome applicants from diverse backgrounds. Qualifications depend on the role, but passion and skills matter most! `,
              },
            ],
          }}
        />
      </div>
      <div id="process" data-section="process">
        <AboveTitleWithoutIconCard
          contents={{
            xlGridCol: 3,
            heading: "Interview Process",
            borderBottom: true,
            cards: [
              {
                heading: "Q. What should I expect in the interview?",
                subHeading: `Find the right opportunity for you `,
                para: `<p class="font-FifthHead mb-2">Ans. Our interviews are role-specific and may include:</p> <ul class="list-decimal pl-4">
      <li> A conversation about your experience & skills</li>
      <li> A technical or case-study discussion (for Product/IT roles)</li>
      <li> A problem-solving or sales scenario (for Sales/Marketing roles)</li>
      
    </ul>`,
              },
              {
                heading: "Q. What should I wear to the interview?",
                para: "Ans.  Smart casual  is fine, but feel free to dress in a way that makes you comfortable.",
              },
              {
                heading: "Q. I’m nervous about my interview. Any tips?",
                para: "Ans. Be yourself, research DigitalDSA, and come prepared with questions about the role.",
              },
            ],
          }}
        />
      </div>
      <div id="checks" data-section="checks">
        <AboveTitleWithoutIconCard
          contents={{
            xlGridCol: 3,
            heading: "Background Checks & Offers",
            borderBottom: true,
            cards: [
              {
                heading: "Q. Do you conduct background checks?",
                para: "Ans. Yes, we may verify employment history, education, and references.",
              },
              {
                heading: "Q. Will I receive a formal job offer?",
                para: "Ans. Yes! If selected, you’ll receive an  official offer letter   via email with role details and benefits.",
              },
              {
                heading: "Q. What benefits does DigitalDSA offer?",
                para: "Ans. Competitive salary, performance-based incentives, growth opportunities, and a  dynamic startup culture! ",
              },
            ],
          }}
        />
      </div>
      <div id="faq" data-section="faq">
        <AboveTitleWithoutIconCard
          contents={{
            xlGridCol: 3,
            heading: "Other FAQs",
            borderBottom: true,
            cards: [
              {
                heading: "Q. Can I apply if I’m a fresher?",
                para: "Ans. Absolutely! We welcome fresh talent with enthusiasm and a learning attitude.",
              },
              {
                heading: "Q. I didn’t get selected. Can I reapply?",
                para: "Ans. Yes! You can reapply after  3 months  for the same or other roles.",
              },
              {
                heading: "Q. Do you offer internships?",
                para: "Ans. Yes, we offer internships in Marketing, IT, and Product. Keep an eye on our careers page!",
              },
              {
                heading:
                  "Q. I have a disability. Can I get support during the hiring process?",
                para: `Ans. Yes! Please email  <span class="font-FifthHead"> careers@digitaldsa.com </span>   if you need accommodations.`,
              },
            ],
          }}
        />
      </div>
    </div>

    <div class="lg:hidden">
      {#each ["Hiring process", "Job opening", "Interview process", "Background checks", "Other FAQs"] as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="list-none px-2 py-4"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i> </span>
            </div>
          </summary>

          {#if index == 0}
            <div class="pb-[2rem] bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  xlGridCol: 3,
                  heading: "Our Hiring Process",
                  borderBottom: true,
                  cards: [
                    {
                      heading:
                        "Q. What is the recruitment process at DigitalDSA?",
                      subHeading: `Find the right opportunity for you `,
                      para: `<p class="font-FifthHead mb-2">Ans. Our hiring process is designed to be simple and efficient:</p> 
                      <ul class="list-decimal pl-4">
            <li>Application Review – Our Talent Acquisition team reviews your application.</li>
            <li>Initial Screening – If shortlisted, you'll be invited for a virtual/phone screening.</li>
            <li>Interview Process – Depending on the role, you may have 1-2 interviews with team leads.</li>
            <li>Assessment (if required) – Some roles may require an online test.</li>
            <li>Offer & Onboarding – If selected, we’ll guide you through the onboarding process.</li>
          </ul>`,
                    },
                    {
                      heading: "Q. How long does the hiring process take?​​",
                      para: `Ans. Typically, the process takes <span class="font-FourthHead" 2-4 weeks  from application submission to offer.`,
                    },
                    {
                      heading:
                        "Q. How will I be updated about my application status?​",
                      para: `Ans. You’ll receive email notifications at each stage. If selected, a recruiter will connect with you directly.`,
                    },
                    {
                      heading: "Q. Can I apply for multiple roles?",
                      para: `Ans. Yes! Feel free to apply for any roles that match your skills and interests.​​`,
                    },
                    {
                      heading:
                        "Q. I’m having trouble submitting my application. What should I do?​",
                      para: `Ans. If you face issues, email <span class="font-FifthHead"> careers@digitaldsa.com </span>  for assistance `,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div class="pb-[2rem] bg-white text-black px-2">
              <AboveTitleWithoutIconCard
                contents={{
                  xlGridCol: 3,
                  heading: "Job Openings & Applications",
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Q. Where can I find current job openings?",
                      subHeading: `Find the right opportunity for you `,
                      para: `Ans. Our latest job postings are available on our  Careers Page .`,
                    },
                    {
                      heading: "Q. What roles are available at DigitalDSA?​​",
                      para: `Ans. We are hiring in  Sales, Operations, Marketing, Product, and IT Support .`,
                    },
                    {
                      heading: "Q. Do you offer remote or hybrid roles?",
                      para: `Ans. Some roles are  remote-friendly , while others may require on-site presence. The job description will specify the work model`,
                    },
                    {
                      heading: "Q. Do I need prior Fintech experience?",
                      para: `Ans. It depends on the role. While Fintech experience is a plus, we value skills, adaptability, and a growth mindset.​`,
                    },
                    {
                      heading:
                        "Q. Is there an age limit or specific qualifications required?​",
                      para: `Ans. We welcome applicants from diverse backgrounds. Qualifications depend on the role, but passion and skills matter most! `,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div class="bg-white text-black px-2">
              <AboveTitleWithoutIconCard
                contents={{
                  xlGridCol: 3,
                  heading: "Interview Process",
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Q. What should I expect in the interview?",
                      subHeading: `Find the right opportunity for you `,
                      para: `<p class="font-FifthHead mb-2">Ans. Our interviews are role-specific and may include:</p> <ul class="list-decimal pl-4">
            <li> A conversation about your experience & skills</li>
            <li> A technical or case-study discussion (for Product/IT roles)</li>
            <li> A problem-solving or sales scenario (for Sales/Marketing roles)</li>
            
          </ul>`,
                    },
                    {
                      heading: "Q. What should I wear to the interview?",
                      para: "Ans.  Smart casual  is fine, but feel free to dress in a way that makes you comfortable.",
                    },
                    {
                      heading: "Q. I’m nervous about my interview. Any tips?",
                      para: "Ans. Be yourself, research DigitalDSA, and come prepared with questions about the role.",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black px-2">
              <AboveTitleWithoutIconCard
                contents={{
                  xlGridCol: 3,
                  heading: "Background Checks & Offers",
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Q. Do you conduct background checks?",
                      para: "Ans. Yes, we may verify employment history, education, and references.",
                    },
                    {
                      heading: "Q. Will I receive a formal job offer?",
                      para: "Ans. Yes! If selected, you’ll receive an  official offer letter   via email with role details and benefits.",
                    },
                    {
                      heading: "Q. What benefits does DigitalDSA offer?",
                      para: "Ans. Competitive salary, performance-based incentives, growth opportunities, and a  dynamic startup culture! ",
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 4}
            <div class="bg-white text-black px-2">
              <AboveTitleWithoutIconCard
                contents={{
                  xlGridCol: 3,
                  heading: "Other FAQs",
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Q. Can I apply if I’m a fresher?",
                      para: "Ans. Absolutely! We welcome fresh talent with enthusiasm and a learning attitude.",
                    },
                    {
                      heading: "Q. I didn’t get selected. Can I reapply?",
                      para: "Ans. Yes! You can reapply after  3 months  for the same or other roles.",
                    },
                    {
                      heading: "Q. Do you offer internships?",
                      para: "Ans. Yes, we offer internships in Marketing, IT, and Product. Keep an eye on our careers page!",
                    },
                    {
                      heading:
                        "Q. I have a disability. Can I get support during the hiring process?",
                      para: `Ans. Yes! Please email  <span class="font-FifthHead"> careers@digitaldsa.com </span>   if you need accommodations.`,
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
      class=" px-[0.5rem] py-[2rem] lg:px-[4rem] text-subParaFont lg:py-[4rem] space-y-2 lg:text-center"
    >
      <h4>
        If you have more questions, reach out to us at <span
          class="font-FourthHead"
        >
          careers@digitaldsa.com</span
        > .
      </h4>
      <h4>
        We’re excited to have you join <span class="font-FourthHead"
          >DigitalDSA – A Fintech Revolution! 🚀
        </span>
      </h4>
    </div>
  </NewPageLayout>
</section>
