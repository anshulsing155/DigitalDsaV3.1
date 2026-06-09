<script>
	let {
		data
	} = $props();



  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";

  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Anchor from "./Anchor.svelte";
  import HelpList from "./HelpList.svelte";
 
  import Seo from "./Seo.svelte";

  let safeguardWays = [
    {
title: "Set up multi-factor authentication on devices",
icons: "/icons/contact.svg",
altIcons: "icons-contact",
link: "/cyber-security-against-scams/ways-safeguard"

    },
    {
title: "Use CallerCheck to verify your caller",
icons: "/icons/home.svg",
altIcons: "icons-home",
link: "/cyber-security-against-scams/how-protect-from-scam"
    },
    {
title: "Create strong, unique passwords for your accounts",
icons: "/icons/lock&key.svg",
altIcons: "icons-lock&key",
  link: "/knowledge/protect-your-business"
    },
    {
title: "Think before clicking on any links or email attachments",
icons: "/icons/securityShield.svg",
altIcons: "icons-securityShield",
    link: "/cyber-security-against-scams/scam-target-business"
    },
  ];

  let stopCheckReject = [
    {
title: "Stop",
para: "Does a call, email or text seem off? The best thing to do is stop. Take a breath. Real organisations won’t put you under pressure to act instantly.",
    },
    {
title: "Check",
para: "Ask someone you trust or contact the organisation the message claims to be from.",
    },

    {
title: "Reject ",
para: "If you’re unsure, hang up on the caller, delete the email, block the phone number. Change your password if you think someone else may have it, and make sure you pick something long and unique.",
    },
  ];
  let moreResources = [
    {
image: "/images/csk-logo.jpg",
alt: "cyber swachhata kendra  portal's logo",
heading: "Cyber Swachhta Kendra",
para: `  Also known as the Botnet Cleaning and Malware Analysis Centre, this initiative provides tools and guidance to help users detect and remove malware from their systems.`,
linkName: "You can visit 'Cyber Swachhta Kendra' portal from here",
link: "https://www.csk.gov.in/security-best-practices.html",
    },
    {
image: "/images/nccrp.jpg",
alt: "national cyber crime reporting portal's logo",
heading: "National Cyber Crime Reporting Portal",
para: ` This platform enables citizens to report cybercrimes online, covering offenses such as hacking, identity theft, online fraud, and cyberbullying.`,
linkName: "You can visit 'NCCR' portal from here",
link: "https://services.india.gov.in/service/detail/national-cyber-crime-reporting-portal?utm_source=chatgpt.com",
    },
    {
image: "/images/isea-logo.jpg",
alt: "Information Security Education and Awarness portal's logo",
heading: "Information Security Education and Awareness (ISEA):",
para: ` This project aims to develop human resources for a safe and secure cyberspace, offering educational materials and awareness programs.`,
linkName: "You can visit 'ISEA' portal from here",
link: "https://isea.gov.in/ ",
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

  let activeSection = $state("");
  let pageData = {
    coverImage: "/images/senior-person-looking-on-phone.jpg",
    coverAlt: "cyber security related photo",
    sourceName:"Freepik",
    originalSource:"https://www.freepik.com/free-photos-vectors/asian-senior/4",
    heading: "Cyber Security Against Scams & Threats",
    para: "Keeping your business safe is our priority. We provide a guidance",
    actionBtns: [
{
btnName: "Book appointment",
btnLink: "/appointment",
btnColor: "#ffcc00",
},
{
btnName: "Compare Loan Offers, Securely",
btnLink: "/get-started/how-can-we-help",
},
    ],
  };

  // end-here

  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
activeSection = firstSection.id;
    }
  };

  const handleScroll = () => {
    const sections = document.querySelectorAll("[data-section]");
    let currentSection = "";

    sections.forEach((section) => {
const rect = section.getBoundingClientRect();
if (rect.top <= 100 && rect.bottom >= 200) {
currentSection = section.id;
}
    });

    if (currentSection) {
activeSection = currentSection;
    }
  };

  function confirmRedirect(event, url) {
    // Prevent the default anchor link behavior
    event.preventDefault();

    // Show the confirmation prompt
    if (
confirm(
"You are about to leave this site and open an external page. Do you want to continue?"
)
    ) {
// Redirect to the external site if confirmed
window.location.href = url;
    }
  }

  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
window.removeEventListener("scroll", handleScroll);
    };
  });

  //send data child to parent
  const dispatch = createEventDispatcher();

  $effect(() => {
    onMount(() => {
setTimeout(() => {
const text = document.querySelector(".content")?.innerText || "";
dispatch("textExtracted", text);
dispatch("pageData", pageData);
}, 100); // Small delay to ensure DOM updates
    });
  });
</script>

<Seo
  type="WebPage"
  title="Cyber Security & Scam Protection for Businesses | DSA"
  image="/images/senior-person-looking-on-phone.jpg"
  description="Stay safe from cyber threats! Learn how to protect your business from scams with expert tips, multi-factor authentication & fraud prevention."
  keywords="cyber security, business scam protection, prevent cyber threats, phishing scams, business fraud prevention, online security tips, cybersecurity awareness, multi-factor authentication, cybercrime reporting, secure passwords, cyber fraud protection, cybersecurity for small businesses, scam prevention, digital security, protect business online."
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "How to protect you",
              targetId: `howProtect`,
            },
            {
              name: "Protect your business",
              targetId: `protectbusiness`,
            },
            {
              name: "Resources",
              targetId: `resources`,
            },
            // {
            //   name: "Latest articles",
            //   targetId: `latestArticle`,
            // },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
             
            },
            {
              btnName: "Compare Loan Offers, Securely",
              btnLink: "/get-started/how-can-we-help",
               btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>
      <!-- <AnchorCounter /> -->

      <div
        id="howProtect"
        data-section="howProtect"
        class="flex flex-col lg:grid lg:grid-cols-3 px-[0.5rem] lg:px-[4rem] gap-[2rem] pt-[4rem] pb-[8rem] border-b"
      >
        <div>
          <h2
            class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            Protect yourself from scams
          </h2>
          <p class="font-Paragraph text-subParaFont py-[1rem]">
            Remember three simple steps: <br><span class="font-FourthHead">
               Stop.   Check.  Reject.
            </span>
          </p>
        </div>
        <div class="col-span-2 space-y-4">
          

          {#each stopCheckReject as item, index}
            <div class="grid grid-cols-12">
              <p
                class="w-[1.5rem] h-[1.5rem] sm:w-[2rem] sm:h-[2rem] border rounded-full flex justify-center items-center bg-black text-white"
              >
                {index + 1}
              </p>
              <div class="col-span-11">
                <p>
                  <span class="font-FourthHead">
                    {item.title}-
                  </span>
                  {item.para}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div id="protectbusiness" data-section="protectbusiness">
        <div>
          <TwoColumnWithImage
            contents={{
              cardImage: "/images/business-man-working-on-laptop.jpg",
              cardAltName: "photo of a businessman exploring DigitalDSA web app, securely on his laptop",
              cardHeading: "Protect your business",
              sourceName:"Freepik",
              originalSource:"https://www.freepik.com/free-photo/arabic-man-watching-online-webinar-sitting-kitchen-with-computer-enjoying-distance-learning_15321519.htm",
              reverse: true,
            }}
          >
            <p class="font-FourthHead text-paraFont">
              Stay one step ahead of scams
            </p>
            <p>
              Cybercriminals may try and scam your business through email, text
              messages, phone calls and social media. They will often pretend to
              be a person or organisation you trust. We will never ask you to
              transfer funds, share your screen or reveal your passwords.
            </p>
            <Button
              btnName="Scams that target businesses"
              link="/cyber-security-against-scams/scam-target-business"
            />
          </TwoColumnWithImage>
        </div>
        <div
          class="pt-[4rem] pb-[8rem] border-b px-[0.5rem] lg:px-[4rem] space-y-6"
        >
          <h2
            class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
          >
            4 ways to safeguard your business
          </h2>
          <div class="grid md:grid-cols-2 gap-[1rem]">
            {#each safeguardWays as item, index}
              <a href={item.link}>
                <div
                  class="border flex p-8 shadow-md hover:shadow-xl gap-[2rem]"
                >
                  <img src={item.icons} alt={item.altIcons} class="h-10" />
                  <h3>{item.title}</h3>
                </div></a
              >
            {/each}
          </div>
        </div>

        <!-- <div>
          <TwoColumnWithImage
            contents={{
              cardImage: "/images/home-scheme.jpg",
              cardAltName: "parent-figure",
              cardHeading: "Tips to keep your business safe",
              reverse: true,
            }}
          >
            <p class="font-FourthHead text-paraFont">
              Stay one step ahead of scams
            </p>
            <p>
              Whether you’re small, medium or large, every business needs cyber
              protection
            </p>
            <Button btnName="Scams that target businesses" />
          </TwoColumnWithImage>
        </div> -->
      </div>

      <div
        id="resources"
        data-section="resources"
        class="flex flex-col lg:grid lg:grid-cols-3 px-[0.5rem] lg:px-[4rem] pt-[4rem] pb-[6rem] border-b gap-[2rem]"
      >
        <h2
          class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
        >
          More resources for your business
        </h2>
        <div class="col-span-2">
          {#each moreResources as itemObj, index}
            <div
              class="flex flex-col md:flex-row gap-[2rem] {moreResources.length >
              index + 1
                ? 'border-b'
                : ''}  py-[2rem]"
            >
              <img src={itemObj.image} alt={itemObj.alt} class="h-[8rem]" />
              <div class="flex flex-col gap-[2rem]">
                <h2 class="font-FourthHead text-minSubHead">
                  {itemObj.heading}
                </h2>
                <p class="font-Paragraph text-minParaFont">
                  {itemObj.para}
                </p>
                <Anchor
                  link={itemObj.link}
                  linkName={itemObj.linkName}
                  onClick={(event) => confirmRedirect(event, itemObj.link)}
                />
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["How to protect you", "Protect your business", "Resources"] as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="howProtect" class="bg-white text-black">
              <div
                class="flex flex-col lg:grid lg:grid-cols-3  px-[0.5rem]  gap-[2rem] py-[4rem] border-b"
              >
                <div class="space-y-[2rem]">
                  <h2
                    class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    Protect your business from scams
                  </h2>
                  <p class="font-Paragraph text-minParaFont">
                    Remember three simple <span class="font-FourthHead">
                      steps: Stop. Check. Reject.
                    </span>
                  </p>
                </div>
                <div class="col-span-2 space-y-4">
                  <h2 class="font-ThirdHead">Stop. Check. Reject.</h2>

                  {#each stopCheckReject as item, index}
                    <div class="grid grid-cols-12">
                      <p
                        class="w-[1.5rem] h-[1.5rem] sm:w-[2rem] sm:h-[2rem] border rounded-full flex justify-center items-center bg-black text-white"
                      >
                        {index + 1}
                      </p>
                      <div class="col-span-11">
                        <p>
                          <span class="font-FourthHead">
                            {item.title}-
                          </span>
                          {item.para}
                        </p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 1}
            <div id="protectbusiness" class=" bg-white text-black">
              <div>
                <TwoColumnWithImage
                  contents={{
                    cardImage: "/images/business-man-working-on-laptop.jpg",
                    cardAltName: "business-man-working-on-laptop",
                    cardHeading: "Protect your business",
                     sourceName:"Freepik",
              originalSource:"https://www.freepik.com/free-photo/arabic-man-watching-online-webinar-sitting-kitchen-with-computer-enjoying-distance-learning_15321519.htm",
                    reverse: true,
                  }}
                >
                  <p class="font-FourthHead text-paraFont">
                    Stay one step ahead of scams
                  </p>
                  <p>
                    Cybercriminals may try and scam your business through email,
                    text messages, phone calls and social media. They will often
                    pretend to be a person or organisation you trust. We will
                    never ask you to transfer funds, share your screen or reveal
                    your passwords.
                  </p>
                  <Button
                    btnName="Scams that target businesses"
                    link="/cyber-security-against-scams/scam-target-business"
                  />
                </TwoColumnWithImage>
              </div>
              <div
                class="py-[4rem]  px-[0.5rem] space-y-6"
              >
                <h2
                  class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  4 ways to safeguard your business
                </h2>
                <div class="grid md:grid-cols-2 gap-[1rem]">
                  {#each safeguardWays as item, index}
                    <a href={item.link}>
                      <div
                        class="border flex p-8 shadow-md hover:shadow-xl gap-[2rem]"
                      >
                        <img
                          src={item.icons}
                          alt={item.altIcons}
                          class="h-10"
                        />
                        <h3>{item.title}</h3>
                      </div></a
                    >
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 2}
            <div id="resources" class="bg-white text-black">
              <div
                class="flex flex-col px-[0.5rem]  py-[4rem]  gap-[2rem]"
              >
                <h2
                  class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                >
                  More resources for your business
                </h2>
                <div class="col-span-2">
                  {#each moreResources as itemObj, index}
                    <div
                      class="flex flex-col md:flex-row gap-[2rem] {moreResources.length >
                      index + 1
                        ? 'border-b'
                        : ''}  py-[2rem]"
                    >
                      <img
                        src={itemObj.image}
                        alt={itemObj.alt}
                        class="h-[8rem]"
                      />
                      <div class="flex flex-col gap-[2rem]">
                        <h2 class="font-FourthHead text-minSubHead">
                          {itemObj.heading}
                        </h2>
                        <p class="font-Paragraph text-minParaFont">
                          {itemObj.para}
                        </p>
                        <Anchor
                          link={itemObj.link}
                          linkName={itemObj.linkName}
                          onClick={(event) =>
                            confirmRedirect(event, itemObj.link)}
                        />
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <TwoColumnWithImage
      contents={{
        cardImage: `/images/message.jpg`,
        cardAltName: `photo of laptop screen showing contact details of DigitalDSA`,
        sourceName:"DigitalDSA",
        originalSource: "www.DigitalDSA.com",
        cardHeading: `Message us 24/7`,
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

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
    heading: "Things You Should Know",
    paraGraph: [
      `<span class="font-FourthHead">DigitalDSA Will Never Request Sensitive Information:</span> DigitalDSA will never ask you to transfer funds, share your screen, reveal your passwords, or provide sensitive personal details over phone, email, or messages. Be cautious of any such requests claiming to be from us.`,
      
      `<span class="font-FourthHead">Beware of Fraudulent Communications:</span> Cybercriminals may impersonate DigitalDSA, banks, or financial institutions via emails, phone calls, or messages to trick you into making payments or sharing personal information. Always verify the authenticity of any request before responding.`,
      
      `<span class="font-FourthHead">Protect Your Business & Personal Accounts:</span> Set up strong, unique passwords for all your accounts, enable multi-factor authentication, and avoid clicking on suspicious links or attachments. Always verify payment requests directly through a trusted contact method before transferring funds.`,
      
      `<span class="font-FourthHead">Recognizing & Preventing Scams:</span> Common scams include business email compromise (BEC), remote access fraud, and impersonation scams. If you receive unexpected requests for payments, changes in account details, or threats of legal action, pause, verify, and report immediately.`,
      
      `<span class="font-FourthHead">Report Suspected Cyber Fraud:</span> If you suspect a scam or fraudulent activity, report it immediately to the <a href="https://www.cybercrime.gov.in/" target="_blank" rel="noopener noreferrer" class="text-blue-500">National Cyber Crime Reporting Portal</a> or call the Government of India’s Cybercrime Helpline at <strong>1930</strong>. Prompt action can help prevent financial loss and safeguard your business.`,
      
      `<span class="font-FourthHead">DigitalDSA’s Limited Liability:</span> DigitalDSA is not liable for any financial loss, unauthorized transactions, or damages resulting from cyber fraud or third-party scams. Users are responsible for securing their accounts and verifying all communications independently.`,
    ],
  }}
  disc="list-decimal"
></ThingsYouShould>

    </div>
  </NewPageLayout>
</section>

<div class="w-2/3">
  <div class="flex flex-col gap-6"></div>
</div>


