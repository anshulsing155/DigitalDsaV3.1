<script>
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import FeedbackForm from "./FeedbackForm.svelte";
  import { onMount } from "svelte";
  import { feedbackYes } from "$lib/stores/stores";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";

  const toggleDropdown = (event, index) => {
    // if (event) {
    event.preventDefault();
    // }
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
  // logic for second nav bar which is not working yet
  let activeSection = $state(''); // Initially no section is active
  let showFeedback = false;
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

  function scrollToFeedback(id) {
    setTimeout(() => {
      const section = document.getElementById(id);

      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 200); // Give a short delay to ensure rendering
  }

  // Initialize the first active section when the component loads
  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
  //ends here...
</script>

<Seo
  type="WebPage"
  title="Feedback & Support | Digital DSA - Complaints & Assistance"
  image="/images/feedback.jpg"
  description="Share feedback, raise concerns, or give compliments. Get 24/7 support for complaints, scams, business, and financial assistance at Digital DSA."
  keywords="Digital DSA feedback, Digital DSA support, Raise a complaint online, Submit a complaint Digital DSA, Customer service Digital DSA, Financial support program, Loan assistance feedback, Protect from scams, Estate settlement support, Home purchase guide, Debt consolidation support"
/>

<section class="">
  <NewPageLayout
    pageData={{
      coverImage: "/images/feedback.jpg",
      coverAlt:
        "photo of a man's hand having two signs of happy and sad faces representing complaint and compliment section for DigitalDSA services",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
      heading: "Feedback",
      para: `We value your experience and are committed to improving our services. If we've let you down, let us know so we can make things right.

`,
    }}
  >
    <div class=" w-full hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: `Make a complaint <img src="/icons/dislike.svg" alt="dislike-icon" class="h-4" />`,
              targetId: "makeComplaint",
            },
            {
              name: `Give a compliment <img src="/icons/like.svg" alt="like-icon" class="h-4" />`,
              targetId: "giveComplaint",
            },

            { name: "Feedback", targetId: "feedback" },
          ],
        }}
        {activeSection}
      />

      <div class="px-[2rem] pt-5 lg:px-[4rem]">
        <div class="pb-[2rem]" id="makeComplaint" data-section="makeComplaint">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage="/images/raise-a-complaint.jpg"
              cardAltName="photo of a young woman raising her finger as seeking some information from DigitalDSA and providing feedback"
              cardHeading="Raise a Concern"
              reverse
            >
              <ul
                class="grid gap-[2rem] font-Paragraph text-subParaFont"
                slot="list"
              >
                <li>
                  If you're not satisfied with our services, products, staff, or
                  complaint resolution process, we want to hear from you.We take
                  every complaint seriously and work towards a fair resolution.
                </li>

                <div class="w-auto">
                  <button
                    type="button"
                    onclick={() => {
                      $feedbackYes = 2;
                      scrollToFeedback("feedForm");}}
                    class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto bg-btnBg"
                  >
                    Make a complaint
                  </button>
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>

        <div class="pb-[2rem]" id="giveComplaint" data-section="giveComplaint">
          <div class="border-b border-dividerColor">
            <TwoColumn
              cardImage="/images/compliment-to-DigitalDSA.jpg"
              cardAltName="Photo of a happy customer giving 5 star rating to DigitalDSA services"
              cardHeading="Tell us about your compliment"
            >
              <ul
                class="grid gap-[2rem] font-Paragraph text-subParaFont"
                slot="list"
              >
                <li>
                  We love to hear about your positive experiences and when
                  someone in our team makes things easier, quicker or special
                  for you. We’ll pass on the compliment and make sure we keep up
                  the good work.
                </li>

                <div class="w-auto">
                  <button
                    type="button"
                    onclick={() => {
                      $feedbackYes = 5;
                      scrollToFeedback("feedForm");}}
                    class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto bg-btnBg"
                  >
                    Give a compliment
                  </button>
                </div>
              </ul>
            </TwoColumn>
          </div>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each ["Make a complaint", "Give a compliment"] as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div
              class="pb-[2rem] px-[0.5rem] bg-white text-black"
              id="makeComplaint"
            >
              <div class="border-b border-dividerColor">
                <TwoColumn
                  cardImage="/images/raise-a-complaint.jpg"
                  cardAltName="photo of a young woman raising her finger as seeking some information from DigitalDSA and providing feedback"
                  cardHeading="Raise a Concern"
                >
                  <ul
                    class="grid gap-4 md:gap-[2rem] font-Paragraph text-subParaFont"
                    slot="list"
                  >
                    <li>
                      If you're not satisfied with our services, products,
                      staff, or complaint resolution process, we want to hear
                      from you.We take every complaint seriously and work
                      towards a fair resolution.
                    </li>

                    <div class="w-auto">
                      <button
                        type="button"
                        onclick={() => {
                          $feedbackYes = 2;
                          scrollToFeedback("feedback");}}
                        class=" rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto bg-btnBg"
                      >
                        Make a complaint
                      </button>
                    </div>
                  </ul>
                </TwoColumn>
              </div>
            </div>
          {:else if index == 1}
            <div
              class="pb-[2rem] bg-white text-black px-[0.5rem]"
              id="giveComplaint"
            >
              <div>
                <TwoColumn
                  cardImage="/images/compliment-to-DigitalDSA.jpg"
                  cardAltName="Photo of a happy customer giving 5 star rating to DigitalDSA services"
                  cardHeading="Tell us about your compliment"
                >
                  <ul
                    class="grid gap-[2rem] font-Paragraph text-subParaFont"
                    slot="list"
                  >
                    <li>
                      We love to hear about your positive experiences and when
                      someone in our team makes things easier, quicker or
                      special for you. We’ll pass on the compliment and make
                      sure we keep up the good work.
                    </li>

                    <div class="w-auto">
                      <div class="w-auto">
                        <button
                          type="button"
                          onclick={() => {
                            $feedbackYes = 5;
                            scrollToFeedback("feedback");}}
                          class=" rounded-full border px-[2rem] py-3 font-Paragraph text-subParaFont hover:opacity-90 md:w-auto bg-btnBg"
                        >
                          Give a compliment
                        </button>
                      </div>
                    </div>
                  </ul>
                </TwoColumn>
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <div id="feedback" data-section="feedback" class="bg-white text-black px-[0.5rem]">
      <div
        class="flex flex-col gap-[3rem] bg-white pt-[4rem] pb-[8rem]"
        id="loans"
      >
        <div id="feedForm" class="text-center space-y-3 feedForm">
          <FeedbackForm />
        </div>
      </div>
    </div>
    <div slot="secondary" class="">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 3,
          borderBottom: true,
          cards: [
            {
              heading: "Message us",
              para: `Reach out to us for any queries or assistance. We're here to help!`,
              icon: "/icons/msg.svg",
              altTitle: "icons",
              url: "/contact",
            },
            {
              heading: "Contact us",
              para: `Connect with us for any support, inquiries, or information. We're just a message away!`,
              icon: "/icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
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
          heading: "Things you should know",
          paraGraph: [
            `This is general educational content. Assess its relevance to your needs before making decisions.`,
            `With over 50 lenders partnered, Digital DSA compares a wide range of loan options. Find the best rates, terms, and eligibility across multiple banks, ensuring you get the most suitable loan for your needs.`,
            `Activate offers through the app for cashback. Cashback is typically received within 14 business days after qualifying.`,
            `Digital DSA arranges loans across 80+ cities. Terms and conditions may vary; check the latest details for your location.`,
          ],
        }}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
