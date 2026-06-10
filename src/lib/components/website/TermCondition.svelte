<script>
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import { onMount } from "svelte";

  let pageData = {
    heroHeading: "Terms of Service",
    heroParagraph: `By using Digital DSA, you agree to our Terms of Service. Review them regularly for updates. Contact us for questions.`,
  };
  let subList = [
    { name: "Explore", targetId: "explore" },
    { name: "Restriction", targetId: "restriction" },
    { name: "Submission", targetId: "submission" },
    { name: "Online", targetId: "online" },
    { name: "Communication", targetId: "communication" },
    { name: "External Link", targetId: "externalLink" },
    { name: "Intellectual", targetId: "intellectual" },
    { name: "Standard ", targetId: "standard" },
  ];

  let navBarMedium = [
    "Explore",
    "Restriction",
    "Submission",
    "Online",
    "Communication",
    "External Link",
    "Intellectual",
    "Standard "
    
  ];
  let explore = {
    heading: `Explore Our Services`,
    subPara: [
      `At Digital DSA, we are dedicated to providing comprehensive information and access to a wide range of products tailored to meet your needs. Our website serves as your gateway to exploring various offerings. By accessing our platform, you agree to take responsibility for any associated third-party fees and ensure you have the necessary equipment for connectivity. When you provide us with your personal or contact details, you indicate your interest in availing and purchasing the services you have selected. Digital DSA may contact you electronically to better understand your preferences, provide assistance with product selection, and fulfill your requests. By using our platform, you also agree to receive promotional materials and special offers from Digital DSA via email. Your privacy and preferences are important to us, and we strive to ensure transparency and clarity in all interactions.`,
    ],
  };
  let responsibilities = {
    heading: `User Responsibilities and Restrictions`,
    subHeading: `Limited License and Usage Terms:`,

    paraGraph: [
      `<strong> Personal Use Only: </strong> The platform and services are granted for personal use only.`,
      `<strong>  Prohibited Activities: </strong> Activities like downloading or copying for third-party benefit, unauthorized linking or framing, and posting harmful material are prohibited.`,
      `<strong> No Commercial Use: </strong>  Commercial use and fraudulent transactions are not allowed on the platform.`,
      `<strong>  Access Restrictions: </strong> Bypassing access restrictions or violating these terms may lead to termination of access.`,
    ],
  };
  let eligibility = {
    heading: `Eligibility and Restrictions`,
    subPara: [
      `To ensure compliance and security, Digital DSA restricts access to our services to individuals who are not 21 years of age or older and who have not been suspended or removed from our system for any reason. If you do not meet the eligibility criteria, you are prohibited from using our Service or accessing our Site. These measures help maintain the integrity and quality of our platform for all users.
`,
    ],
  };
  let dataResponsibilities = {
    heading: `    Data Responsibilities`,
    subPara: [
      `By using Digital DSA's Site, you confirm your legal capacity to enter into contracts and agree to use our services for legitimate purposes only. It's essential to provide accurate information and update it promptly. You are responsible for maintaining the confidentiality of your details and must notify us immediately of any unauthorized use. Additional terms apply to purchases, and you agree to abide by service providers' rules. Violation may result in cancellation of purchases and access denial.`,
    ],
  };
  let submission = {
    heading: `Content Submission Terms`,
    subPara: [
      `When you submit materials through Digital DSA's Site, you retain ownership. We will not use, share, or distribute your data without your consent. Your content may be used to improve our services and shared only with lenders as necessary. By submitting, you grant Digital DSA a license to use your materials with your permission. You are responsible for ensuring your submissions comply with our guidelines and do not infringe on any rights. Digital DSA reserves the right to review and remove inappropriate content.`,
    ],
  };
  let limitation = {
    heading: `Limitation in Accuracy`,
    subPara: [
      `At Digital DSA, we endeavor to present accurate and up-to-date information on our website. Despite our efforts, there may be occasional errors in any of the materials provided. We do not guarantee that all content is error-free, complete, or updated.
`,
    ],
  };
  let online = {
    heading: `Online Availability and Advertising`,
    subPara: [
      `Digital DSA makes no guarantees or warranties regarding the online availability, impressions, or click-through of its Site, its web pages, or any material, information, links, or content presented therein. The Site may be unavailable for access at any time. Advertising sponsors and materials must be approved by Digital DSA before posting. We reserve the right to accept or reject any advertising sponsor or material for any reason.
`,
    ],
  };
  let compliance = {
    heading: `Compliance and Jurisdiction`,
    subPara: [
      `Digital DSA adheres to local, state, and central laws and cooperates with authorized government agencies for cybersecurity activities and law enforcement purposes. We commit to providing information promptly upon lawful authorization. Digital DSA operates from Noida, India, and does not guarantee the suitability of its website materials for use in other locations. Users accessing the site from outside India are responsible for compliance with local laws. All marketing materials on this site are intended for individuals, companies, or entities in India and comply with local regulations. Disputes shall be governed by the exclusive jurisdiction of the courts in Noida.
`,
    ],
  };
  let communication = {
    heading: `Electronic Communication Consent`,
    subPara: [
      `By using Digital DSA's Site or contacting us via email, you agree to receive communications from Digital DSA electronically. This includes communications sent to your email ID. Digital DSA may communicate with you via email, postings on the Site, or other standard communication methods. You acknowledge that all agreements, notices, disclosures, and other communications provided electronically by Digital DSA fulfill any legal requirement for written communication.`,
    ],
  };
  let posting = {
    heading: ` User Postings and Content Guidelines`,
    subPara: [
      `Digital DSA's Site allows users to send emails and post messages. While Digital DSA is not obligated to review or assume responsibility for user-posted content, we may monitor and remove unacceptable postings. Users are prohibited from posting unlawful, offensive, or privacy-violating material, including advertisements, impersonations, personal information, copyrighted material, chain letters, and misleading information. Adherence to these guidelines ensures a positive community experience for all users.
`,
    ],
  };
  let externalLink = {
    heading: `External Links Disclaimer`,
    subPara: [
      `Digital DSA's Site may contain links to other websites or resources. Since Digital DSA does not control these external sites and resources, you acknowledge and agree that Digital DSA is not responsible for their availability. We do not endorse or assume responsibility for any content, advertising, products, or materials available on or through these sites. Digital DSA shall not be liable for any damages or losses arising from or in connection with the use of or reliance on any such content, goods, or services obtained through these external sites or resources.


`,
    ],
  };
  let changes = {
    heading: `Changes to Terms of Use`,
    subPara: [
      `Digital DSA reserves the right to update the Site, along with related policies, agreements, Terms of Service, and Privacy Policy at its discretion. In the event of a material modification to these Terms of Service, Digital DSA may provide notice by prominently displaying an announcement above the text of the Terms of Service or Privacy Policy. However, we are not obliged to revise or update information unless required. Remember that the notification will serve as adequate disclosure of such changes. If you have not accessed the Site for more than 45 days, it is advisable to review the updated Terms of Service and Privacy Policy before continuing use. By continuing to use the Site following such modifications, you agree to accept the revised Terms of Service or Privacy Policy.


`,
    ],
  };
  let intellectual = {
    heading: `Intellectual Property Notice`,
    subPara: [
      `The trademarks, logos, and service marks displayed on Digital DSA's Site are the property of Digital DSA. Users are strictly prohibited from using any Marks for any purpose, including but not limited to using them as meta tags on other web pages or sites on the World Wide Web, without the prior written consent of Digital DSA. All information, content, and software programs available on or through the Site are protected by copyright laws. Users are expressly prohibited from modifying, copying, distributing, transmitting, displaying, publishing, selling, licensing, creating derivative works, or using any Content for commercial or public purposes without the explicit permission of Digital DSA.
`,
    ],
  };
  let continued = {
    heading: `Continued Obligations`,
    subPara: [
      `Certain obligations under this Terms of Service will continue to apply even after the agreement ends or is terminated.
`,
    ],
  };
  let standard = {
    heading: `Some Other Standard Terms`,
    subPara: [
      `If any part of these terms is deemed invalid or unenforceable, both parties agree that the court should interpret the provision to fulfill the original intent, and the remaining terms will remain valid. Headings are for reference only and do not limit the scope of each section. These terms and your relationship with Digital DSA are governed by Indian law, with jurisdiction in Noida for any disputes. Digital DSA's failure to enforce any part of these terms does not waive its right to enforce it later. Digital DSA reserves the right to address breaches of these terms at its discretion. This agreement is solely between you and Digital DSA and governs your use of the Site, replacing any previous agreements.
`,
    ],
  };
  let indemnification = {
    heading: `Indemnification`,
    subPara: [
      `You agree to defend, indemnify, and hold Digital DSA and its affiliates harmless from any claims, liabilities, damages, costs, and expenses, including reasonable attorneys' fees, arising from your use of our services or any violation of our terms of service.
`,
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

<section>
  <PageFullTextDesign {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar navList={subList} {activeSection} />
      <div class="px-[2rem] lg:px-[4rem]">
        <div id="explore" data-section="explore">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={explore} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={responsibilities} disc="list-disc" />
          </div>
        </div>
        <div id="restriction" data-section="restriction">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={eligibility} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould
              thinkKnow={dataResponsibilities}
              disc="list-disc"
            />
          </div>
        </div>
        <div id="submission" data-section="submission">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={submission} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={limitation} disc="list-disc" />
          </div>
        </div>
        <div id="online" data-section="online">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={online} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={compliance} disc="list-disc" />
          </div>
        </div>
        <div id="communication" data-section="communication">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={communication} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={posting} disc="list-disc" />
          </div>
        </div>
        <div id="externalLink" data-section="externalLink">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={externalLink} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={changes} disc="list-disc" />
          </div>
        </div>
        <div id="intellectual" data-section="intellectual">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={intellectual} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={continued} disc="list-disc" />
          </div>
        </div>
        <div id="standard" data-section="standard">
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={standard} disc="list-disc" />
          </div>
          <div class="border-b border-borderColor">
            <ThingsYouShould thinkKnow={indemnification} disc="list-disc" />
          </div>
        </div>
      </div>
    </div>
    <div class="block lg:hidden">
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
          <div id="explore" data-section="explore" class="bg-white text-black">
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={explore} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={responsibilities} disc="list-disc" />
            </div>
          </div>
          {:else if index == 1}
          <div id="restriction" data-section="restriction" class="bg-white text-black" >
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={eligibility} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould
                thinkKnow={dataResponsibilities}
                disc="list-disc"
              />
            </div>
          </div>
          {:else if index == 2}
          <div id="submission" data-section="submission" class="bg-white text-black">
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={submission} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={limitation} disc="list-disc" />
            </div>
          </div>
          {:else if index == 3}
          <div id="online" data-section="online" class="bg-white text-black">
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={online} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={compliance} disc="list-disc" />
            </div>
          </div>
          {:else if index == 4}
          <div id="communication" data-section="communication" class="bg-white text-black">
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={communication} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={posting} disc="list-disc" />
            </div>
          </div>
          {:else if index == 5}
          <div id="externalLink" data-section="externalLink" class="bg-white text-black">
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={externalLink} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={changes} disc="list-disc" />
            </div>
          </div>
          {:else if index == 6}
          <div id="intellectual" data-section="intellectual" class="bg-white text-black">
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={intellectual} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={continued} disc="list-disc" />
            </div>
          </div>
          {:else if index==7}
          <div id="standard" data-section="standard" class="bg-white text-black">
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={standard} disc="list-disc" />
            </div>
            <div class="border-b border-borderColor">
              <ThingsYouShould thinkKnow={indemnification} disc="list-disc" />
            </div>
          </div>
          {/if}
        </details>
      {/each}
    </div>
  </PageFullTextDesign>
</section>


