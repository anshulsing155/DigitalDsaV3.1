<script lang="ts">
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import Seo from "$lib/components/Seo.svelte";

  let activeSection = "";
  let cardImg2 = "/images/credits & attributions.jpg";
  let cardAlt1 = "CardCover";
  let activeIndex: number | null = null;

  let navBarMedium = [
    "Attribution Practices",
    "Resources",
    "Logos & Trademarks",
    "Compliance",
  ];

  const slideDuration = 400;

  const toggleDropdown = (event: any, index: any) => {
    event.preventDefault();
    const summaryElement = event.currentTarget;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement;
    const contentElement = detailsElement.querySelector(".dropdown-content");

    // Calculate duration based on height (default min 300ms, max 800ms)
    let contentHeight = contentElement ? contentElement.scrollHeight : 0;
    let slideDuration = Math.min(800, Math.max(300, contentHeight * 2)); // Adjust formula as needed

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

      // Update activeIndex for animation
      setTimeout(() => {
        activeIndex = null;
      }, slideDuration);
    } else {
      detailsElement.setAttribute("open", "true");
      icon.classList.remove("fa-angle-down");
      icon.classList.add("fa-angle-up");

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      // Update activeIndex for animation
      activeIndex = index;
    }
  };

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
  title="Credits & Attributions - Digital DSA"
  image="/images/who-we-are.jpg"
  description="Learn about Digital DSA’s attribution practices, resources, logos, trademarks, and compliance policies for intellectual property rights."
  keywords="Digital DSA attributions, Intellectual property rights, Logo usage policy, Freepik attribution, Pexels attribution, FlatIcons license, Bank logos disclaimer, Copyright compliance, Fair use policy, Digital asset licensing"
/>

<section>
  <SecondPageLayout
    pageData={{
      heading: "Credits & Attributions",
      coverImage: "/images/who-we-are.jpg",
      coverAlt:
        "photo of human hands joining together representing DigitalDSA team",
      sourceName: "Freepik",
      originalSource:
        "https://www.freepik.com/free-photo/closeup-diverse-people-joining-their-hands_12193015.htm",
    }}
  >
    <!-- desktop view  -->

    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Attribution Practices",
              targetId: "attribution",
            },
            { name: "Resources", targetId: "resources" },

            { name: "Logos & Trademarks", targetId: "logo" },
            { name: "Compliance", targetId: "compliance" },
          ],
        }}
        {activeSection}
      />

      <div class="grid px-[4rem]">
        <div
          data-section="attribution"
          id="attribution"
          class="flex flex-col gap-[2.5rem] border-b border-[var(--form-border)] py-[3rem] text-black dark:text-white"
        >
          <p
            class="mt-[1rem] font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
          >
            Understanding Our Attribution Practices
          </p>
          <div class="grid gap-4 font-Paragraph text-subParaFont">
            <p>
              At DigitalDSA, we are committed to respecting intellectual
              property rights and adhering to licensing agreements for all
              third-party assets used on this platform. <br />This page provides
              a consolidated attribution for images, logos, and other digital
              elements featured on our website.
            </p>
          </div>
        </div>

        <div data-section="resources" id="resources">
          <TwoColumn
            cardImage={cardImg2}
            cardAltName={cardAlt1}
            cardHeading="Image & Graphic Resources"
            sourceName="Freepik"
            originalSource="https://www.freepik.com/free-photo/card-envelope-mockup-with-leaves-background_18415628.htm#fromView=search&page=1&position=2&uuid=bdd2b995-5dd3-40c3-83e2-040a49288fc8&query=thanks"
            reverse={true}
          >
            <ul
              class="grid gap-[2rem] font-Paragraph text-subParaFont"
              slot="list"
            >
              <div class="grid gap-5">
                <li>
                  Some images, icons, and illustrations on this website are
                  sourced from Freepik, Pexels, and FlatIcons, licensed under
                  their respective terms.
                </li>
                <li class="p-4 my-7 bg-grayColor border-l-4 border-btnBg">
                  <p>
                    <span class="font-FourthHead text-paraFont"
                      >Attribution :
                    </span>
                    <span class="pt-2">
                      Images and graphics used on this website are sourced from <span
                        class="font-FourthHead">Freepik</span
                      >,
                      <span class="font-FourthHead">Pexels</span>, <span class="font-FourthHead">Unsplash</span>, and
                      <span class="font-FourthHead">FlatIcons</span>. All rights
                      to these assets remain with their original creators.
                    </span>
                  </p>
                </li>
                <li>
                  <div>
                    <ul class="list-disc list-inside">
                      <p class="pb-4">
                        Where required, usage complies with the licensing terms
                        of each platform :
                      </p>
                      <li class="pb-2">
                        Freepik
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://www.freepik.com/legal/terms-of-use#nav-freepik"
                        >
                          Terms of use</a
                        >
                        &
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://www.freepik.com/legal/terms-of-use#nav-freepik-agreement"
                          >License agreement</a
                        > details
                      </li>

                      <li class="pb-2">
                        Pexels
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://www.pexels.com/terms-of-service/"
                        >
                          Terms of use</a
                        >
                        &
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://www.pexels.com/license/"
                          >License agreement</a
                        > details
                      </li>
                      <li class="pb-2">
                        Unsplash
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://unsplash.com/plus/terms"
                        >
                          Terms of use</a
                        >
                        &
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://unsplash.com/plus/license"
                          >License agreement</a
                        > details
                      </li>
                      <li class="pb-2">
                        FlatIcons
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://www.flaticon.com/legal"
                        >
                          Terms of use</a
                        >
                        &
                        <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="https://www.flaticon.com/license/license.pdf"
                          >License agreement</a
                        > details
                      </li>
                      <p class="pt-8">
                        If you believe an image on our website requires further
                        attribution or needs to be removed, please <a
                          class="underline underline-offset-4 hover:no-underline"
                          href="/contact">contact us.</a
                        >
                      </p>
                    </ul>
                  </div>
                </li>
              </div>
            </ul>
          </TwoColumn>
        </div>
      </div>
      <div data-section="logo" id="logo">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Bank Logos & Trademarks`,
            secHeading: `Usage Disclaimer for Bank Logos & Trademarks`,
            list: [
              {
                desc: `All bank logos, brand names, and trademarks displayed on this website are the exclusive property of their respective owners.`,
              },
              {
                desc: `Logos are used for informational and identification purposes only, assisting users in recognizing financial institutions.`,
              },
              {
                desc: `DigitalDSA does not claim ownership, affiliation, sponsorship, or endorsement from any financial institution unless explicitly stated.`,
              },
              {
                desc: `If any institution requests specific attribution or removal, they may <a class="underline underline-offset-4 hover:no-underline" href="/contact">contact us</a> for resolution.`,
              },
            ],
          }}
        />
      </div>

      <div data-section="compliance" id="compliance">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Compliance & Fair Use`,

            secPara: `<div class="">
                                        <p class="font-FourthHead text-minSubHead pb-6">At DigitalDSA, we:</p>
                                        <ul class="list-none space-y-2 bg-[var(--landing-bg-card)] p-4">
                                            <li class="flex items-center font-Paragraph text-subParaFont">
                                                <span class="text-green-500 mr-2 self-start">✔</span> 
                                                Ensure proper licensing and fair use of all third-party assets.
                                            </li>
                                            <li class="flex items-center font-Paragraph text-subParaFont">
                                                <span class="text-green-500 items-top mr-2 self-start">✔</span> 
                                                Do not modify or alter trademarks or copyrighted materials without authorization.
                                            </li>
                                            <li class="flex items-center font-Paragraph text-subParaFont">
                                                <span class="text-green-500 mr-2 self-start">✔</span> 
                                                Comply with all copyright laws, licensing agreements, and fair use policies.
                                            </li>
                                        </ul>
                                        <p class="font-Paragraph text-subParaFont pt-8">If any content owner or company has concerns about attribution, licensing, or usage, they can request modifications, credits, or removal by <a class="underline underline-offset-4 hover:no-underline" href="/contact">reaching out to us.</a></p>
                                  </div>`,
          }}
        />
      </div>
    </div>

    <!-- mobile view  -->

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

          {#if activeIndex === index}
            <div
              transitionslide={{ duration: slideDuration, delay: 200}}
              class="dropdown-content"
            >
              {#if index == 0}
                <div
                  id="attribution"
                  class="flex flex-col gap-[2.5rem] border-b border-[var(--form-border)] bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem] py-[3rem]"
                >
                  <p
                    class="mt-[1rem] font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    Understanding Our Attribution Practices
                  </p>
                  <div class="grid gap-4 font-Paragraph text-subParaFont">
                    <p>
                      At DigitalDSA, we are committed to respecting intellectual
                      property rights and adhering to licensing agreements for
                      all third-party assets used on this platform. <br />This
                      page provides a consolidated attribution for images,
                      logos, and other digital elements featured on our website.
                    </p>
                  </div>
                </div>
              {:else if index == 1}
                <div id="resources" class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem]">
                  <TwoColumn
                    cardImage={cardImg2}
                    cardAltName={cardAlt1}
                    cardHeading="Image & Graphic Resources"
                    sourceName=""
                    originalSource="www.digitaldsa.com"
                    reverse={true}
                  >
                    <ul
                      class="grid gap-[2rem] font-Paragraph text-subParaFont"
                      slot="list"
                    >
                      <div class="grid gap-5">
                        <li>
                          Some images, icons, and illustrations on this website
                          are sourced from Freepik, Pexels, and FlatIcons,
                          licensed under their respective terms.
                        </li>
                        <li
                          class="p-4 my-7 bg-grayColor border-l-4 border-btnBg"
                        >
                          <p>
                            <span class="font-FourthHead text-paraFont"
                              >Attribution :
                            </span>
                            <span class="">
                              Images and graphics used on this website are
                              sourced from <span class="font-FourthHead"
                                >Freepik</span
                              >,
                              <span class="font-FourthHead">Pexels</span>, <span class="font-FourthHead">Unsplash</span>, and
                              <span class="font-FourthHead">FlatIcons</span>.
                              All rights to these assets remain with their
                              original creators.
                            </span>
                          </p>
                        </li>
                        <li>
                          <div>
                            <p class="pb-4">
                              Where required, usage complies with the licensing
                              terms of each platform :
                            </p>
                            <ul class="list-disc pl-4">
                              <li class="pb-2">
                                Freepik
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://www.freepik.com/legal/terms-of-use#nav-freepik"
                                >
                                  Terms of use</a
                                >
                                &
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://www.freepik.com/legal/terms-of-use#nav-freepik-agreement"
                                  >License agreement</a
                                > details
                              </li>

                              <li class="pb-2">
                                Pexels
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://www.pexels.com/terms-of-service/"
                                >
                                  Terms of use</a
                                >
                                &
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://www.pexels.com/license/"
                                  >License agreement</a
                                > details
                              </li>
                              <li class="pb-2">
                                Unsplash
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://unsplash.com/plus/terms"
                                >
                                  Terms of use</a
                                >
                                &
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://unsplash.com/plus/license"
                                  >License agreement</a
                                > details
                              </li>
                              <li class="pb-2">
                                FlatIcons
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://www.flaticon.com/legal"
                                >
                                  Terms of use</a
                                >
                                &
                                <a
                                  class="underline underline-offset-4 hover:no-underline"
                                  href="https://www.flaticon.com/license/license.pdf"
                                  >License agreement</a
                                > details
                              </li>
                            </ul>
                            <p class="pt-8">
                              If you believe an image on our website requires
                              further attribution or needs to be removed, please <a
                                class="underline underline-offset-4 hover:no-underline"
                                href="/contact">contact us.</a
                              >
                            </p>
                          </div>
                        </li>
                      </div>
                    </ul>
                  </TwoColumn>
                </div>
              {:else if index == 2}
                <div id="logo" class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem]">
                  <TwoColumnWithLeftHeading
                    contents={{
                      heading: `Bank Logos & Trademarks`,
                      secHeading: `Usage Disclaimer for Bank Logos & Trademarks`,
                      list: [
                        {
                          desc: `All bank logos, brand names, and trademarks displayed on this website are the exclusive property of their respective owners.`,
                        },
                        {
                          desc: `Logos are used for informational and identification purposes only, assisting users in recognizing financial institutions.`,
                        },
                        {
                          desc: `DigitalDSA does not claim ownership, affiliation, sponsorship, or endorsement from any financial institution unless explicitly stated.`,
                        },
                        {
                          desc: `If any institution requests specific attribution or removal, they may <a class="underline underline-offset-4 hover:no-underline" href="/contact">contact us</a> for resolution.`,
                        },
                      ],
                    }}
                  />
                </div>
              {:else if index == 3}
                <div id="compliance" class="bg-[var(--landing-bg)] text-black dark:text-white">
                  <TwoColumnWithLeftHeading
                    contents={{
                      heading: `Compliance & Fair Use`,

                      secPara: `<div class="">
                                    <p class="font-FourthHead text-minSubHead pb-6">At DigitalDSA, we:</p>
                                    <ul class="list-none space-y-2 bg-[var(--landing-bg-card)] p-4">
                                        <li class="flex items-center font-Paragraph text-subParaFont">
                                            <span class="text-green-500 mr-2 self-start">✔</span> 
                                            Ensure proper licensing and fair use of all third-party assets.
                                        </li>
                                        <li class="flex items-center font-Paragraph text-subParaFont">
                                            <span class="text-green-500 items-top mr-2 self-start">✔</span> 
                                            Do not modify or alter trademarks or copyrighted materials without authorization.
                                        </li>
                                        <li class="flex items-center font-Paragraph text-subParaFont">
                                            <span class="text-green-500 mr-2 self-start">✔</span> 
                                            Comply with all copyright laws, licensing agreements, and fair use policies.
                                        </li>
                                    </ul>
                                    <p class="font-Paragraph text-subParaFont pt-8">If any content owner or company has concerns about attribution, licensing, or usage, they can request modifications, credits, or removal by <a class="underline underline-offset-4 hover:no-underline" href="/contact">reaching out to us.</a></p>
                                    </div>`,
                    }}
                  />
                </div>
              {/if}
            </div>
          {/if}
        </details>
      {/each}
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

<style>
  .dropdown-content {
    overflow: hidden;
    transition: height 0.4s ease-in-out;
  }
</style>
