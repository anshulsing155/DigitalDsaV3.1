<script>
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import Seo from "./Seo.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import { onMount } from "svelte";

  let pageData = {
    coverImage: "images/home-cover.jpg",
    altName: "hero-cover",
    heroHeading: "Group Privacy Statement",
    heroParagraph: `We take our responsibility to protect your privacy very seriously. We apply strict security and privacy controls to the way we handle your personal information.`,
  };
  let subList = [
    { name: "About this statement", targetId: "aboutPrivacy" },
    { name: "Data procesing", targetId: "dataProcessing" },
    { name: "Usage of Information", targetId: "usage" },
    { name: "Disclosure", targetId: "disclosure" },
    { name: "Privacy right", targetId: "right" },
    { name: "Navigation Beyond", targetId: "navigation" },
  ];

  let navBarMedium = [
    "About this statement",
    "Data procesing",
    "Usage of Information",
    "Disclosure",
    "Privacy right",
    "Navigation Beyond",
  ];
  let aboutPrivacy = {
    heading: `About this Privacy Statement`,
    subPara: [
      `Digital DSA is a 100% proprietary platform owned by E YANTRIK, registered as a proprietorship company. All rights, trademarks, and content associated with Digital DSA are under the sole ownership of E YANTRIK.
  			At Digital DSA, safeguarding your privacy is a core principle we hold in high regard. We are dedicated to maintaining the confidentiality, integrity, and security of all user information entrusted to us. This Privacy Policy details how our site collects and manages the personal data we receive from you. It outlines the methods by which we collect, use, process, and disclose your personal data, guided by our commitment to transparency and integrity. Please take a moment to review our practices and gain a clear understanding of how we handle your information when you interact with our products and services.`,
    ],
  };
  let accumulationInformation = {
    heading: `Accumulation of Information`,
    paraGraph: [
      `Data Logging: When you visit our website, we automatically log standard data such as your IP address, browser type, pages visited, visit time, and page duration.`,
      `Device Data Collection: We may collect information about the devices accessing our website, such as device type, operating system, unique identifiers, settings, and geo-location data.`,
      `User Provided Information: Specific information is required during the registration process and for ongoing activities within our platform.`,
      `Registration Details: We may collect personal information such as your full name, email address, and date of birth for registration purposes.`,
      `Additional Information: Depending on the services you seek, we may also need supplementary details including your residential address, financial information, and other officially valid documents.`,
      `Business Data Collection: This includes transaction records, stored files, user profiles, and analytics data generated during user interactions.`,
      `Impact of Withholding Information: Failure to provide necessary data may restrict access to certain features.`,
      `Device Permissions: If you grant device permissions, we may access and utilize the data obtained through these permissions.`,
      `Revoking Permissions: You have the right to modify or revoke access permissions granted to us.`,
    ],
  };
  let dataProcessing = {
    heading: `Our Data Processing Pledge`,
    subPara: [
      `We treat your personal information with care, following clear principles:`,
    ],
    paraGraph: [
      `Deal Makers: We use your data to fulfill contracts and cater to your requests.`,
      `Friendly Snoops: Our curiosity drives us to improve while keeping your interests front and center.`,
      `Your Call, Your Say: You can opt-in or out of newsletters easily.`,
      `By the Book: We ensure compliance with all legal obligations.`,
    ],
  };
  let usageInformation = {
    heading: `Usage of Information`,
    paraGraph: [
      `Enhancing Services: We use this information to improve user experience and maintain a secure environment.`,
      `Customer Support: We assist promptly and enhance support services.`,
      `Marketing Communications: We may market our services based on your preferences.`,
      `Regulatory Adherence: We uphold platform integrity and ensure protection against misuse.`,
      `Legal Compliance: We collect and process information to fulfill legal obligations and resolve disputes.`,
    ],
  };
  let disclosure = {
    heading: `Disclosure of Personal Information`,
    subPara: [
      `We may share your personal information with various third parties for specific purposes, including service providers and legal entities.

`,
    ],
  };
  let privacyRight = {
    heading: `Your Privacy Rights`,
    paraGraph: [
      `Consent and Age Requirement: Ensure that you are 21 or above to use our services.`,
      `Control and Restrictions: You can restrict the collection and use of your personal information.`,
      `Correction of Information: Contact us to correct any inaccuracies.`,
      `Complaints: Contact us if you believe we've breached data protection laws.`,
      `Unsubscribing: Easily unsubscribe from our communications.`,
    ],
  };
  let navigatingBeyond = {
    heading: `Navigating Beyond: External Links Disclosure`,
    subPara: [
      `We do not govern external sites and encourage you to review their privacy policies.`,
    ],
  };
  let amendments = {
    heading: `Amendments to Our Privacy Policy`,
    subPara: [
      `We reserve the right to update this Privacy Policy periodically. Any revisions will be effective immediately upon posting.`,
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
  // logic for second nav bar which is not working yet
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

    // console.log(activeSection, 'active');
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
  title="Digital DSA Privacy Policy – Secure & Transparent Data Use"
  description="Read Digital DSA’s Privacy Policy on data collection, security, and compliance. Protecting your personal information with transparency."
  keywords="privacy policy, data protection, personal data security, Digital DSA, user data privacy, data compliance, secure data handling, online privacy, privacy rights, GDPR compliance, information security, personal information protection, privacy policy UAE, data processing statement"
/>

<section>
  <PageFullTextDesign {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar navList={subList} {activeSection} />
      <div class="lg:px-[4rem]">
        <div
          class="border-b border-dividerColor"
          id="aboutPrivacy"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={aboutPrivacy} />
        </div>
        <div id="dataProcessing" data-section="aboutPrivacy">
          <div class="border-b border-dividerColor">
            <ThingsYouShould thinkKnow={dataProcessing} disc="list-disc" />
          </div>
          <div class="border-b border-dividerColor">
            <ThingsYouShould
              thinkKnow={accumulationInformation}
              disc="list-disc"
            />
          </div>
        </div>
        <div
          class="border-b border-dividerColor"
          id="usage"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={usageInformation} disc="list-disc" />
        </div>
        <div
          class="border-b border-dividerColor"
          id="disclosure"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={disclosure} disc="list-disc" />
        </div>
        <div
          class="border-b border-dividerColor"
          id="right"
          data-section="aboutPrivacy"
        >
          <ThingsYouShould thinkKnow={privacyRight} disc="list-disc" />
        </div>
        <div id="navigation" data-section="aboutPrivacy">
          <div class="border-b border-dividerColor">
            <ThingsYouShould thinkKnow={navigatingBeyond} disc="list-disc" />
          </div>
          <div class="border-b border-dividerColor">
            <ThingsYouShould thinkKnow={amendments} disc="list-disc" />
          </div>
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
            <div class="bg-white text-black" id="aboutPrivacy">
              <ThingsYouShould thinkKnow={aboutPrivacy} />
            </div>
          {:else if index == 1}
            <div id="dataProcessing" class="bg-white text-black">
              <div class="border-b border-dividerColor">
                <ThingsYouShould thinkKnow={dataProcessing} disc="list-disc" />
              </div>
              <div class="">
                <ThingsYouShould
                  thinkKnow={accumulationInformation}
                  disc="list-disc"
                />
              </div>
            </div>
          {:else if index == 2}
            <div class="bg-white text-black" id="usage">
              <ThingsYouShould thinkKnow={usageInformation} disc="list-disc" />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black" id="disclosure">
              <ThingsYouShould thinkKnow={disclosure} disc="list-disc" />
            </div>
          {:else if index == 4}
            <div class="bg-white text-black" id="right">
              <ThingsYouShould thinkKnow={privacyRight} disc="list-disc" />
            </div>
          {:else if index == 5}
            <div id="navigation" class="bg-white text-black">
              <div class="border-b border-dividerColor">
                <ThingsYouShould
                  thinkKnow={navigatingBeyond}
                  disc="list-disc"
                />
              </div>
              <div class="">
                <ThingsYouShould thinkKnow={amendments} disc="list-disc" />
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>
  </PageFullTextDesign>
</section>


