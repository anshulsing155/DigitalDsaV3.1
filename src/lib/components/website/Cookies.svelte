<script>
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import Payments from "./Payments.svelte";
  import { onMount } from "svelte";
  import Seo from "./Seo.svelte";

  let pageData = {
    altName: "hero-cover",
    heroHeading: "Our Cookies Notice",
    heroParagraph: `We use cookies to keep our website running, provide customer support, learn how people are using our website and improve our services. Here’s more about what that actually means..`,
  };
  let subList = [
    { name: "What are cookies?", targetId: "cookies" },
    { name: "First party cookies", targetId: "firstPartyCookies" },
    { name: "Third Party cookies", targetId: "thirdPartyCookies" },
    { name: "How to delete cookies", targetId: "deleteCookies" },
  ];

  let navBarMedium = [
    "What are cookies?",
    "First party cookies",
    "Third Party cookies",
    "How to delete cookies",
  ];

  let cookies = {
    heading: `What is a cookie? 🍪`,
    subPara: [
      `Cookies are small text files that websites store on your browser and computer (or whatever device you’re using to visit).`,
      `It’s like the website writes a reminder on a tiny, virtual post it note, and sticks it onto you. That note might be something like: “This person has a teddy bear in their shopping basket” or “This person wants to stay logged in.”`,
      `Cookies are how websites seem to magically remember who you are. When you go back to a website, it checks your computer for the cookies it left there – reminding itself who you are, what pages you’ve visited, the account settings you chose, things like that.`,
      `Almost everything you do on the internet involves cookies in some way.Here's more about cookies and how they work.
`,
    ],
  };

  let firstPartyCookies = {
    heading: `First party cookies (cookies set on Digital DSA’s website)`,
    subPara: [`Type of Cookies and What these cookies do :`],
    paraGraph: [
      `Strictly necessary : Essential to keep our website running on a basic level. They log you into your account and live chat, and help you make payments for some of our services.`,
      `Functional : 	Recognize you when you return to our website, so we can do things like remember your preferences from last time.`,
      `User identification :	We display ads on Facebook and other sites to track which ad led you to our website and how you interact with it once you’re here. This information helps us make the website and future ads more relevant to you. For example, we might show you information about Home Loan instead of Loan Against Property (LAP) or other Loans based on your interests.`,
      `Analytics, performance and research :	Recognize and count how many visitors we get and how they use our website. This helps us improve the way the website works – for example, making pages easier to find.`,
    ],
    bottomPara: [
      `All the cookies we use play a part in fraud detection, prevention and investigation to help us keep our users secure. For example, cookies can help us identify if someone has accessed an account that doesn’t belong to them, and show us how they used that account.`,
    ],
  };
  let thirdPartyCookies = {
    heading: `How we use cookies`,
    subPara: [
      `We integrate a few other services into our website – for example, we use a service called Hotjar to generate pop up surveys for us.`,
      `These services might use cookies of their own. You can read their privacy policies here:`,
      `To change your web browser preferences:`,
    ],
  };
  let deleteCookies = {
    heading: `How to block or delete cookies`,
    subPara: [
      `Most browsers automatically accept cookies, but you can decline some or all non-essential cookies if you want to. Check the settings on your browser and whatever device you’re using to visit the website. Or search “how to turn off cookies”.`,

      `If you do block cookies, that might mean you won’t be able to access some parts of our website (or any of it).`,

      `We’re reviewing our use of non-essential cookies, and we’ll update this page and our cookie banner as soon as we have any changes.`,
    ],
  };

  let help = [
    {
      Heading: "Security and privacy",
      icon: "/icons/appointment.svg",
      altTitle: "icons",
    },
    {
      Heading: "Contact us",
      icon: "/icons/manageLoan2.svg",
      altTitle: "icons",
    },
    {
      Heading: "Find your nearest branch",
      icon: "/icons/contact.svg",
      altTitle: "icons",
    },
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

  // logic for second nav bar which is not working yet
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
  //ends here...
</script>

<Seo
  type="WebPage"
  title="Cookies Notice | How We Use Cookies & Your Privacy Choices"
  description="Learn how we use cookies to improve our website, enhance security, and personalize your experience. Manage your cookie settings anytime."
  keywords="cookies policy, cookie settings, how we use cookies, website cookies, privacy policy, manage cookies, analytics cookies, tracking cookies, essential cookies, block cookies, GDPR compliance, online privacy, website data tracking, cookie preferences."
/>

<section>
  <PageFullTextDesign {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar navList={subList} {activeSection} />
      <div class="px-[2rem] lg:px-[4rem]">
        <div
          id="cookies"
          class="border-b border-dividerColor"
          data-section="cookies"
        >
          <ThingsYouShould thinkKnow={cookies} />
        </div>

        <div
          data-section="firstPartyCookies"
          id="firstPartyCookies"
          class="py-[2rem] border-b border-borderColor"
        >
          <Payments supportHeading="Different types of cookies">
            <div class="grid grid-cols-2 gap-[2rem]">
              <div class="flex flex-col col-span-1 gap-[2rem]">
                <h2 class="typography-h3 font-semibold text-text-main">
                  Strictly necessary
                </h2>
                <p>
                  Essential to keep our website running on a basic level. They
                  log you into your account and live chat, and help you make
                  payments for some of our services.
                </p>
              </div>
              <div class="flex flex-col col-span-1 gap-[2rem]">
                <h2 class="typography-h3 font-semibold text-text-main">Functional</h2>
                <p>
                  Recognize you when you return to our website, so we can do
                  things like remember your preferences from last time.
                </p>
              </div>
              <div class="flex flex-col col-span-1 gap-[2rem]">
                <h2 class="typography-h3 font-semibold text-text-main">
                  User identification
                </h2>
                <p>
                  We display ads on Facebook and other sites to track which ad
                  led you to our website and how you interact with it once
                  you’re here. This information helps us make the website and
                  future ads more relevant to you. For example, we might show
                  you information about Home Loan instead of Loan Against
                  Property (LAP) or other Loans based on your interests.
                </p>
              </div>
              <div class="flex flex-col col-span-1 gap-[2rem]">
                <h2 class="typography-h3 font-semibold text-text-main">
                  Analytics, performance and research
                </h2>
                <p>
                  Analytics, performance and research : Recognize and count how
                  many visitors we get and how they use our website. This helps
                  us improve the way the website works – for example, making
                  pages easier to find.
                </p>
              </div>
            </div>
          </Payments>
        </div>

        <div
          data-section="thirdPartyCookies"
          id="thirdPartyCookies"
          class="border-b border-dividerColor"
        >
          <ThingsYouShould thinkKnow={thirdPartyCookies} disc="list-disc">
            <ul slot="list" class="list-disc ml-5">
             
              <a class="underline underline-offset-4 hover:no-underline" href="https://amplitude.com/privacy"><li>Amplitude</li></a>
              <a class="underline underline-offset-4 hover:no-underline" href="https://policies.google.com/privacy"><li>Google</li></a>
              <a class="underline underline-offset-4 hover:no-underline" href="https://www.microsoft.com/en-gb/privacy/privacystatement"
                ><li>MicroSoft</li></a
              >
            </ul>
          </ThingsYouShould>
        </div>

        <div id="deleteCookies" data-section="deleteCookies" class="py-[2rem]">
          <Payments supportHeading="How to block or delete cookies">
            <div class="flex flex-col gap-[2rem]">
              <p>
                Most browsers automatically accept cookies, but you can decline
                some or all non-essential cookies if you want to. Check the
                settings on your browser and whatever device you’re using to
                visit the website. Or search “how to turn off cookies”.
              </p>
              <p>
                If you do block cookies, that might mean you won’t be able to
                access some parts of our website (or any of it).
              </p>
              <p>
                We’re reviewing our use of non-essential cookies, and we’ll
                update this page and our cookie banner as soon as we have any
                changes.
              </p>
              <p>To change your web browser preferences:</p>
              <div class="flex flex-col gap-4">
                <h2 class="typography-h3 font-semibold text-text-main">Google Chrome</h2>
                <div class="flex flex-col gap-4">
                  <p>
                    Open your Chrome browser &gt; go to Customise and Control
                    Google Chrome &gt; Settings gt; Main Menu &gt; Advanced &gt;
                    Privacy and Security &gt; Content Settings &gt; Cookies.
                    Then you can choose your settings.
                  </p>
                  <p>
                    For more instructions visit <span
                      class="underline underline-offset-4 hover:no-underline"
                      ><a href="https://support.google.com/chrome/answer/95647"
                        >how to adjust cookie settings on mobile devices</a
                      ></span
                    >.
                  </p>
                </div>
              </div>
              <div class="flex flex-col gap-[2rem]">
                <h2 class="typography-h3 font-semibold text-text-main">Safari</h2>
                <div class="flex flex-col gap-4">
                  <p>
                    Go to Settings &gt; Safari &gt; Preferences &gt; Privacy.
                    Then you can choose your settings.
                  </p>
                  <p>
                    For more information, including on mobile visit <span
                      class="underline underline-offset-4 hover:no-underline"
                      ><a href="https://support.apple.com/en-au/HT201265"
                        >how to adjust cookie settings on Apple devices.</a
                      ></span
                    >.
                  </p>
                </div>
              </div>
              <div class="flex flex-col gap-[2rem]">
                <h2 class="typography-h3 font-semibold text-text-main">
                  Internet Explorer and Edge
                </h2>
                <div class="flex flex-col gap-4">
                  <p>
                    Open the browser &gt; select Tools &gt; Internet Options
                    &gt; Privacy &gt; Advanced. Then you can choose your
                    settings.
                  </p>
                  <p>
                    For more information visit <span
                      class="underline underline-offset-4 hover:no-underline"
                      ><a href="https://support.microsoft.com/en-au"
                        >Microsoft Support</a
                      ></span
                    >.
                  </p>
                </div>
              </div>
              <div class="flex flex-col gap-[2rem]">
                <h2 class="typography-h3 font-semibold text-text-main">Mozilla Firefox</h2>
                <div class="flex flex-col gap-4">
                  <p>
                    Open Firefox &gt; select Tools &gt; Options &gt; Privacy
                    &gt; Cookies. You can then choose your settings.
                  </p>
                  <p>
                    For more information visit <span
                      class="underline underline-offset-4 hover:no-underline"
                      ><a
                        href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
                        >Mozilla support</a
                      ></span
                    >.
                  </p>
                </div>
              </div>
            </div>
          </Payments>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
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
            <div id="cookies" class="text-black bg-white">
              <ThingsYouShould thinkKnow={cookies} />
            </div>
          {:else if index == 1}
            <div
              id="firstPartyCookies"
              class="text-black bg-white px-[0.5rem]"
            >
              <Payments supportHeading="Different types of cookies">
                <div class="grid md:grid-cols-2 gap-[2rem]">
                  <div class="flex flex-col col-span-1 gap-[2rem]">
                    <h2 class="typography-h3 font-semibold text-text-main">
                      Strictly necessary
                    </h2>
                    <p>
                      Essential to keep our website running on a basic level.
                      They log you into your account and live chat, and help you
                      make payments for some of our services.
                    </p>
                  </div>
                  <div class="flex flex-col col-span-1 gap-[2rem]">
                    <h2 class="typography-h3 font-semibold text-text-main">Functional</h2>
                    <p>
                      Recognize you when you return to our website, so we can do
                      things like remember your preferences from last time.
                    </p>
                  </div>
                  <div class="flex flex-col col-span-1 gap-[2rem]">
                    <h2 class="typography-h3 font-semibold text-text-main">
                      User identification
                    </h2>
                    <p>
                      We display ads on Facebook and other sites to track which
                      ad led you to our website and how you interact with it
                      once you’re here. This information helps us make the
                      website and future ads more relevant to you. For example,
                      we might show you information about Home Loan instead of
                      Loan Against Property (LAP) or other Loans based on your
                      interests.
                    </p>
                  </div>
                  <div class="flex flex-col col-span-1 gap-[2rem]">
                    <h2 class="typography-h3 font-semibold text-text-main">
                      Analytics, performance and research
                    </h2>
                    <p>
                      Analytics, performance and research : Recognize and count
                      how many visitors we get and how they use our website.
                      This helps us improve the way the website works – for
                      example, making pages easier to find.
                    </p>
                  </div>
                </div>
              </Payments>
            </div>
          {:else if index == 2}
            <div id="thirdPartyCookies" class="text-black bg-white">
              <ThingsYouShould thinkKnow={thirdPartyCookies} disc="list-disc">
                <ul slot="list" class="list-disc ml-5">
                  <a class="underline underline-offset-4 hover:no-underline"
                    href="https://help.hotjar.com/hc/en-us/articles/6952777582999-Cookies-Set-by-the-Hotjar-Tracking-Code"
                    ><li>HotStar</li></a
                  >
                  <a class="underline underline-offset-4 hover:no-underline" href="https://amplitude.com/privacy"><li>Amplitude</li></a>
                  <a class="underline underline-offset-4 hover:no-underline" href="https://policies.google.com/privacy"><li>Google</li></a>
                  <a class="underline underline-offset-4 hover:no-underline" href="https://www.microsoft.com/en-gb/privacy/privacystatement"
                    ><li>MicroSoft</li></a
                  >
                </ul>
              </ThingsYouShould>
            </div>
          {:else if index == 3}
            <div
              id="deleteCookies"
              class="text-black bg-white px-[0.5rem]"
            >
              <Payments supportHeading="How to block or delete cookies">
                <div class="flex flex-col gap-[2rem]">
                  <p>
                    Most browsers automatically accept cookies, but you can
                    decline some or all non-essential cookies if you want to.
                    Check the settings on your browser and whatever device
                    you’re using to visit the website. Or search “how to turn
                    off cookies”.
                  </p>
                  <p>
                    If you do block cookies, that might mean you won’t be able
                    to access some parts of our website (or any of it).
                  </p>
                  <p>
                    We’re reviewing our use of non-essential cookies, and we’ll
                    update this page and our cookie banner as soon as we have
                    any changes.
                  </p>
                  <p>To change your web browser preferences:</p>
                  <div class="flex flex-col gap-2">
                    <h2 class="typography-h3 font-semibold text-text-main">
                      Google Chrome
                    </h2>
                    <div class="flex flex-col py-[1rem] gap-4">
                      <p>
                        Open your Chrome browser &gt; go to Customise and
                        Control Google Chrome &gt; Settings gt; Main Menu &gt;
                        Advanced &gt; Privacy and Security &gt; Content Settings
                        &gt; Cookies. Then you can choose your settings.
                      </p>
                      <p>
                        For more instructions visit <span
                          class="underline underline-offset-4 hover:no-underline"
                          ><a
                            href="https://support.google.com/chrome/answer/95647"
                            >how to adjust cookie settings on mobile devices</a
                          ></span
                        >.
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <h2 class="typography-h3 font-semibold text-text-main">Safari</h2>
                    <div class="flex flex-col gap-4 py-[1rem]">
                      <p>
                        Go to Settings &gt; Safari &gt; Preferences &gt;
                        Privacy. Then you can choose your settings.
                      </p>
                      <p>
                        For more information, including on mobile visit <span
                          class="underline underline-offset-4 hover:no-underline"
                          ><a href="https://support.apple.com/en-au/HT201265"
                            >how to adjust cookie settings on Apple devices.</a
                          ></span
                        >.
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <h2 class="typography-h3 font-semibold text-text-main">
                      Internet Explorer and Edge
                    </h2>
                    <div class="flex flex-col py-[1rem] gap-4">
                      <p>
                        Open the browser &gt; select Tools &gt; Internet Options
                        &gt; Privacy &gt; Advanced. Then you can choose your
                        settings.
                      </p>
                      <p>
                        For more information visit <span
                          class="underline underline-offset-4 hover:no-underline"
                          ><a href="https://support.microsoft.com/en-au"
                            >Microsoft Support</a
                          ></span
                        >.
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <h2 class="typography-h3 font-semibold text-text-main">
                      Mozilla Firefox
                    </h2>
                    <div class="flex flex-col py-[1rem] gap-4">
                      <p>
                        Open Firefox &gt; select Tools &gt; Options &gt; Privacy
                        &gt; Cookies. You can then choose your settings.
                      </p>
                      <p>
                        For more information visit <span
                          class="underline underline-offset-4 hover:no-underline"
                          ><a
                            href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
                            >Mozilla support</a
                          ></span
                        >.
                      </p>
                    </div>
                  </div>
                </div>
              </Payments>
            </div>
          {/if}
        </details>
      {/each}
    </div>
  </PageFullTextDesign>
</section>


