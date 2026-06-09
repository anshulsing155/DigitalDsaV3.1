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
  import HelpList from "./HelpList.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import Payments from "./Payments.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import Seo from "./Seo.svelte";

  let steps = [
    {
id: 1,
title: "Stop",
desc: "Does a call, email or text seem off? The best thing to do is stop. Take a breath.Real organizations won’t put you under pressure to act instantly.",
    },
    {
id: 2,
title: "Check",
desc: "Ask someone you trust or contact the organization the message claims to be from.",
    },
    {
id: 3,
title: "Reject",
desc: "If you’re unsure, hang up on the caller, delete the email, block the phone number.Change your passwords.",
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
    coverImage: "/images/protect-from-scam-blog.jpg",
    coverAlt: "hero-cover",
    heading: "How to protect yourself from scams",
    para: "Learn about the latest scams, how to spot them and how to keep yourself safe.",
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
if (rect.top <= 200 && rect.bottom >= 200) {
currentSection = section.id;
}
    });

    if (currentSection) {
activeSection = currentSection;
    }
  };

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
  title="How to Spot & Prevent Scams | Protect Yourself Online"
  image="/images/protect-from-scam-blog.jpg"
  description="Learn about common scams, how to spot fraud, and protect yourself. Stay safe from SMS, email, and online scams with these security tips."
  keywords="scam prevention, online fraud, avoid scams, scam awareness, protect from scams, SMS scams, email scams, digital fraud, cybercrime, online security, phishing scams, investment scams, job scams, fraud protection, scam safety tips, cybersecurity awareness, digital wallet scams, scam alerts"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Types of scams",
              targetId: `scamType`,
            },
            {
              name: "Protecting yourself",
              targetId: `protecting`,
            },
            {
              name: "More information",
              targetId: `information`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
              btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>
      <!-- <AnchorCounter /> -->
      <div id="scamType" data-section="scamType" class="">
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Common types of scams`,
            subHeading: `Scams are deliberately designed to deceive you. Remember, if it sounds too good to be true, it probably is.`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "SMS & email scams",
                para: `Messages might include a link to direct you to a fraudulent website or ask you for personal information`,
                icon: "/icons/msg.svg",
                altName: "icons-msg",
              },
              {
                heading: "Online shopping scams​​",
                para: `What might look like a genuine website selling goods at low prices could actually be a scam.`,
                icon: "/icons/shoppingScam.svg",
                altName: "shopping-icon",
              },
              {
                heading: "Remote access scams​",
                para: `Where a scammer calls you and attempts to obtain access to your accounts or device, pretending to be from a well-known company.`,
                icon: "/icons/phoneConnection.svg",
                altName: "phoneConnection-icon",
              },
              {
                heading: "Investment scams",
                para: `When a money making opportunity seem too good to be true.​​`,
                icon: "/icons/investmentScam.svg",
                altName: "investment-icon",
              },
              {
                heading: "Romance & dating scams",
                para: `Where someone you meet online may not be who they claim to be, and set out to steal your heart in order to defraud you.​`,
                icon: "/icons/riskFactor.svg",
                altName: "risk-icon",
              },
              {
                heading: "Scams that target businesses​",
                para: `Learn about the main types of scams your staff need to be able to recognise to protect your business.`,
                icon: "/icons/expansion.svg",
                altName: "business-icon",
              },
              {
                heading: "Threat & penalty scams​",
                para: `Where a scammer uses threats of penalty or harm to extort money from their victims.`,
                icon: "/icons/processing.svg",
                altName: "processing-icon",
              },
              {
                heading: "Job scams​",
                para: `Where a job opportunity appears to require little effort for a high financial reward and promises to make you money quickly.`,
                icon: "/icons/apply.svg",
                altName: "icons-apply",
              },
              {
                heading: "Digital wallet scams​",
                para: `When you are contacted, usually by SMS or email, and trick you into sharing your card details. Scammers will use this information to enter your card details into a digital wallet on another phone, so they can spend your money.`,
                icon: "/icons/securityShield.svg",
                altName: "shield-icon",
              },
            ],
          }}
        />
        <div class="px-[4rem] border-b border-borderColor">
          <Payments
            supportHeading="Remember 3 simple steps: Stop. Check. Reject."
          >
            <div class="grid gap-[2rem]">
              {#each steps as step, index}
                <div class="grid grid-cols-6 md:grid-cols-10 items-start gap-4">
                  <div
                    class="w-8 h-8 rounded-full bg-black flex justify-center items-center text-white text-paraFont font-FifthHead col-span-1"
                  >
                    {step.id}
                  </div>
                  <div class="flex flex-col gap-4 col-span-5 md:col-span-9">
                    <h2 class="font-ThirdHead text-parafont">{step.title}</h2>
                    <p class="text-subParaFont font-Paragraph">{step.desc}</p>
                  </div>
                </div>
              {/each}
            </div>
          </Payments>
        </div>
      </div>

      <div id="protecting" data-section="protecting">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Protecting yourself from scams`,
            xlGridCol: 3,
            cards: [
              {
                heading: "Fraudulent SMS & Emails",
                subHeading: `Be cautious of fraudulent messages claiming to be from banks.<span class="font-FourthHead"> A legitimate bank will never send an SMS or email that: </span>`,
                para: `<ul class=" space-y-3 "> 
                    <li> 🚫 Asks for your <span class="font-FourthHead">bank account details </span> </li>
                     <li>  🚫 Requests your <span class="font-FourthHead">customer ID or password </span></li>
                      <li> 🚫 Asks you to <span class="font-FourthHead"> share an OTP  </span> </li>
                       <li> 🚫 Contains a <span class="font-FourthHead"> direct login link </span> </li>
                </ul> 
                <br>
                <p class="font-FourthHead">For secure banking, always visit the bank’s official website by typing the URL in your browser or using the bank’s verified mobile app </p>`,
              },
              {
                heading: "How to Spot a Scam",
                subHeading: `Scammers mimic banks with urgent requests, fake links, and unusual emails to steal information.`,
                para: `<ul class=" space-y-3 "> 
                    <li> ⚠️ Messages or emails with <span class="font-FourthHead"> spelling errors or poor grammar</span> </li>
                     <li>  ⚠️ Unusual email addresses or URLs that look similar but aren’t quite right </li>
                      <li> ⚠️ Urgent requests, such as <span class="font-FourthHead">  "unlock your account" </span> or  <span class="font-FourthHead">"verify your identity" </span>   </li>
                       <li> ⚠️ Unexpected claims of <span class="font-FourthHead">winning prizes  </span>   or <span class="font-FourthHead">cash rewards </span>  </li>
                </ul> `,
              },
              {
                heading: "What to Do",
                para: `<ul class=" space-y-3 "> 
                 <li> ✅   Do not click on any links in suspicious messages </li>
                    <li > ✅ Avoid opening unexpected attachments, especially from unknown senders</li>
                     <li>  ✅ Inspect links carefully—hover over them on a computer or press and hold on mobile to check the actual URL</li>
                      <li> ✅ Report the scam to the respective bank’s fraud department  </li>
                       <li> ✅ Delete the suspicious message immediately  </li>
                </ul> `,
              },
            ],
          }}
        />
      </div>
      <div
        class="px-[4rem] border-b border-borderColor"
        id="information"
        data-section="information"
      >
        <ThingsYouShould
          thinkKnow={{
            heading: "More information ",
            subPara: [
              `We work closely with law enforcement agencies and regulatory authorities in India to swiftly take down fraudulent or malicious websites. Additionally, we support initiatives like the Cyber Crime Awareness Program to help protect users from financial scams.`,
              `To learn more about safeguarding your online security, visit the <a href="https://i4c.mha.gov.in/"> Indian Cyber Crime Coordination Centre (I4C)</a> .`,
              `In case of Cyber Frauds call <span class="text-miniHeadFont text-red-600">1930 </span> 
`,
            ],
          }}
        />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Types of scams", "Protecting yourself", "More information"] as list, index}
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
            <div class="bg-white text-black">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Common types of scams`,
                  subHeading: `Scams are deliberately designed to deceive you. Remember, if it sounds too good to be true, it probably is.`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "SMS & email scams",
                      para: `Messages might include a link to direct you to a fraudulent website or ask you for personal information`,
                      icon: "/icons/msg.svg",
                      altName: "icons-msg",
                    },
                    {
                      heading: "Online shopping scams​​",
                      para: `What might look like a genuine website selling goods at low prices could actually be a scam.`,
                      icon: "/icons/shoppingScam.svg",
                      altName: "shopping-icon",
                    },
                    {
                      heading: "Remote access scams​",
                      para: `Where a scammer calls you and attempts to obtain access to your accounts or device, pretending to be from a well-known company.`,
                      icon: "/icons/phoneConnection.svg",
                      altName: "phoneConnection-icon",
                    },
                    {
                      heading: "Investment scams",
                      para: `When a money making opportunity seem too good to be true.​​`,
                      icon: "/icons/investmentScam.svg",
                      altName: "investment-icon",
                    },
                    {
                      heading: "Romance & dating scams",
                      para: `Where someone you meet online may not be who they claim to be, and set out to steal your heart in order to defraud you.​`,
                      icon: "/icons/riskFactor.svg",
                      altName: "risk-icon",
                    },
                    {
                      heading: "Scams that target businesses​",
                      para: `Learn about the main types of scams your staff need to be able to recognise to protect your business.`,
                      icon: "/icons/expansion.svg",
                      altName: "business-icon",
                    },
                    {
                      heading: "Threat & penalty scams​",
                      para: `Where a scammer uses threats of penalty or harm to extort money from their victims.`,
                      icon: "/icons/processing.svg",
                      altName: "processing-icon",
                    },
                    {
                      heading: "Job scams​",
                      para: `Where a job opportunity appears to require little effort for a high financial reward and promises to make you money quickly.`,
                      icon: "/icons/apply.svg",
                      altName: "icons-apply",
                    },
                    {
                      heading: "Digital wallet scams​",
                      para: `When you are contacted, usually by SMS or email, and trick you into sharing your card details. Scammers will use this information to enter your card details into a digital wallet on another phone, so they can spend your money.`,
                      icon: "/icons/securityShield.svg",
                      altName: "shield-icon",
                    },
                  ],
                }}
              />
              <div class="border-b border-borderColor">
                <Payments
                  supportHeading="Remember 3 simple steps: Stop. Check. Reject."
                >
                  <div class="grid gap-[2rem]">
                    {#each steps as step, index}
                      <div
                        class="grid grid-cols-6 md:grid-cols-10 items-start gap-4"
                      >
                        <div
                          class="w-8 h-8 rounded-full bg-black flex justify-center items-center text-white text-paraFont font-FifthHead col-span-1"
                        >
                          {step.id}
                        </div>
                        <div
                          class="flex flex-col gap-4 col-span-5 md:col-span-9"
                        >
                          <h2 class="font-ThirdHead text-parafont">
                            {step.title}
                          </h2>
                          <p class="text-subParaFont font-Paragraph">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    {/each}
                  </div>
                </Payments>
              </div>
            </div>
          {:else if index == 1}
            <div class=" bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Protecting yourself from scams`,
                  xlGridCol: 3,
                  cards: [
                    {
                      heading: "Fraudulent SMS & Emails",
                      subHeading: `Be cautious of fraudulent messages claiming to be from banks.<span class="font-FourthHead"> A legitimate bank will never send an SMS or email that: </span>`,
                      para: `<ul class=" space-y-3 "> 
                        <li> 🚫 Asks for your <span class="font-FourthHead">bank account details </span> </li>
                         <li>  🚫 Requests your <span class="font-FourthHead">customer ID or password </span></li>
                          <li> 🚫 Asks you to <span class="font-FourthHead"> share an OTP  </span> </li>
                           <li> 🚫 Contains a <span class="font-FourthHead"> direct login link </span> </li>
                    </ul> 
                    <br>
                    <p class="font-FourthHead">For secure banking, always visit the bank’s official website by typing the URL in your browser or using the bank’s verified mobile app </p>`,
                    },
                    {
                      heading: "How to Spot a Scam",
                      subHeading: `Scammers mimic banks with urgent requests, fake links, and unusual emails to steal information.`,
                      para: `<ul class=" space-y-3 "> 
                        <li> ⚠️ Messages or emails with <span class="font-FourthHead"> spelling errors or poor grammar</span> </li>
                         <li>  ⚠️ Unusual email addresses or URLs that look similar but aren’t quite right </li>
                          <li> ⚠️ Urgent requests, such as <span class="font-FourthHead">  "unlock your account" </span> or  <span class="font-FourthHead">"verify your identity" </span>   </li>
                           <li> ⚠️ Unexpected claims of <span class="font-FourthHead">winning prizes  </span>   or <span class="font-FourthHead">cash rewards </span>  </li>
                    </ul> `,
                    },
                    {
                      heading: "What to Do",
                      para: `<ul class=" space-y-3 "> 
                     <li> ✅   Do not click on any links in suspicious messages </li>
                        <li > ✅ Avoid opening unexpected attachments, especially from unknown senders</li>
                         <li>  ✅ Inspect links carefully—hover over them on a computer or press and hold on mobile to check the actual URL</li>
                          <li> ✅ Report the scam to the respective bank’s fraud department  </li>
                           <li> ✅ Delete the suspicious message immediately  </li>
                    </ul> `,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div class="bg-white text-black" id="password">
              <ThingsYouShould
                thinkKnow={{
                  heading: "More information ",
                  subPara: [
                    `We work closely with law enforcement agencies and regulatory authorities in India to swiftly take down fraudulent or malicious websites. Additionally, we support initiatives like the Cyber Crime Awareness Program to help protect users from financial scams.`,
                    `To learn more about safeguarding your online security, visit the <a href="https://i4c.mha.gov.in/"> Indian Cyber Crime Coordination Centre (I4C)</a> .`,
                    `In case of Cyber Frauds call <span class="text-miniHeadFont text-red-600">1930 </span> 
    `,
                  ],
                }}
              />
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
          heading: "Things you should know",
          paraGraph: [
            `<span class="font-FourthHead">Independent Facilitator:</span> DigitalDSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-FourthHead">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. DigitalDSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-FourthHead">Liability:</span> DigitalDSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and DigitalDSA.`,
            `<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through DigitalDSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>


