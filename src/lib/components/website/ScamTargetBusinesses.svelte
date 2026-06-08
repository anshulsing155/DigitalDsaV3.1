<script>
	let {
		data
	} = $props();



  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  
  import AboveTitleWithLeftIconCard from "./AboveTitleWithLeftIconCard.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import Seo from "./Seo.svelte";

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

  let activeSection = "";
  let pageData = {
    coverImage: "/images/protect-business-from-scam-blog.jpg",
    coverAlt: "descriptive photo of a person trying to scam a young lady",
    heading: "Scams that target businesses",
    para: "Learn the main types of scams your staff should be able to recognise in order to protect your business.",
    actionBtns: [
{
btnName: "Book appointment",
btnLink: "/appointment",
btnColor: "#ffcc00",
},
{
btnName: "Compare offers ",
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
  title="Protect Your Business from Scams | Fraud Prevention Tips"
  image="/images/protect-business-from-scam-blog.jpg"
  description="Learn how to prevent scams like BEC & remote access fraud. Protect your business with strong security measures & report scams at 1930."
  keywords="Business scams, Fraud prevention, Business email compromise (BEC), Remote access scams, Digital arrest fraud, Cybercrime helpline India, Protect business from scams, Cyber fraud prevention, Avoid financial fraud, Scam warning signs, Cybersecurity for businesses, Payment fraud detection, Secure business transactions, How to report scams, Government helpline for cybercrime"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Prevent scams",
              targetId: `prevent`,
            },
            {
              name: " Email compromises",
              targetId: `email`,
            },

            {
              name: "Remote access scams",
              targetId: `remote`,
            },

            {
              name: "Help-line",
              targetId: `helpline`,
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>
      <!-- <AnchorCounter /> -->

      <div id="prevent" data-section="prevent">
        <AboveTitleWithLeftIconCard
          contents={{
            heading: `How to prevent scams`,
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Call first",
                para: "Before you make a first-time payment for any amount you're not prepared to lose, call the payee using a verified phone number to check it’s really them requesting payment.",
                icon: "/icons/contact.svg",
                altName: "icons-contact",
              },
              {
                heading: "Set strong, unique passwords",
                para: "Ensure all of your accounts, especially email accounts, have strong, unique passwords and are setup with second-factor authentication (e.g. SMS).",
                icon: "/icons/lock&key.svg",
                altName: "icons-lock",
              },
              {
                heading: "Use an approval process",
                para: "Setup a payments approval process for your business, preferably requiring multiple approvers, with no exceptions.",
                icon: "/icons/apply-pen.svg",
                altName: "icons-apply-pen",
              },
              {
                heading: "A culture of questioning",
                para: "Encourage a culture where staff are comfortable to question a payment instruction even if it’s from a senior executive.    ",
                icon: "/icons/search.svg",
                altName: "icons-search",
              },
            ],
          }}
        />
      </div>

      <div id="email" data-section="email">
        <TwoColumnWithImage
          contents={{
            reverse: false,
            cardImage: "/images/businessman-holding-his-head-while-working-desktop-pc-office.jpg",
            cardAltName: "photo of a businessman holding his head as his email has been hacked due to negligence",
            cardHeading: "Business email compromise (BEC)",
            sourceName:"Freepik",
            originalSource:"https://www.freepik.com/free-photo/exhausted-businessman-holding-his-head-pain-while-working-desktop-pc-office_26346604.htm"
          }}
        >
          <p class="font-Paragraph text-minParaFont">
            Business email compromise scams target businesses of all sizes. They
            involve emails from a compromised email address, or emails made to
            look like they are from someone you know, such as:
          </p>
          <ul class="font-Paragraph text-subParaFont list-disc pl-5">
            <li>Your boss</li>
            <li>Your supplier</li>
            <li>Your customer</li>
            <li>Your lawyer</li>
          </ul>
          <p class="font-Paragraph text-minParaFont">
            These scams involve emails sent to you or your business with a
            request to make payment to a new account. This new account may be
            under the scammer's control, and your money could be lost. If you
            get an email with a request to pay a new account, or an invoice with
            different account details to those usually used - pause, review,
            reflect. Before making a payment, consider calling the sender of the
            email using a verified phone number.
          </p>
        </TwoColumnWithImage>
      </div>

      <div data-section="remote" id="remote" class="section">
        <div class="px-[4rem]">
          <TwoColumn
          reverse
           
            cardImage="/images/digital-arrest-scam.jpg"
            cardAltName="photo of a digitally scammed girl who is in panic mood"
            cardHeading="Remote access / Digital arrest scams"
            sourceName="Freepik"
            originalSource="https://www.freepik.com/free-photo/young-woman-sitting-cafe-with-her-laptop-stressful-wor_1025751.htm"
          >
            <p class="font-Paragraph text-minParaFont">
              Remote access scams begin as a phone impersonation scam, then the
              scammer gains access to your all Bank account using your own
              computer, through the use of remote access software.
              <br />
              <br />

              Digital arrest scammers impersonate law enforcement officers,
              falsely accusing victims of crimes and demanding payments to avoid
              arrest.
            </p>

            <div class="space-y-3">
              <h2 class="font-FourthHead">How It Works</h2>
              <ul class=" space-y-3 font-Paragraph text-subParaFont">
                <li>
                  🚫 Scammers contact victims via <span class="font-FourthHead">
                    video calls, emails, or phone calls
                  </span> , claiming to be from the police or government.
                </li>
                <li>
                  🚫They use <span class="font-FourthHead">
                    fake ID cards, badges, and office backgrounds
                  </span> to appear legitimate.
                </li>
                <li>
                  🚫 Victims are falsely accused of <span
                    class="font-FourthHead"
                  >
                    money laundering, cybercrimes, or tax fraud
                  </span> .
                </li>
                <li>
                  🚫Scammers demand <span class="font-FourthHead">
                    immediate payment
                  </span> to "clear the charges" and avoid arrest.
                </li>
              </ul>
            </div>
          </TwoColumn>
        </div>

        <AboveTitleWithoutIconCard
          contents={{
            xlGridCol: 2,
            cards: [
              {
                heading: " Warning Signs",

                para: `<ul class=" space-y-6 "> 
                  <li> ⚠️ Unexpected calls claiming you're under investigation.</li>
                   <li>  ⚠️Threats of <span class="font-FourthHead"> immediate arrest or legal action </span> . </li>
                    <li> ⚠️ Requests for <span class="font-FourthHead"> payments via cryptocurrency, gift cards, or wire transfers </span> .  </li>
                     <li> ⚠️ Pressure to keep the conversation <span class="font-FourthHead"> secret</span>  from family or the bank.  </li>
              </ul> `,
              },
              {
                heading: "What to Do",
                para: `<ul class=" space-y-6 "> 
               <li> ✅   <span class="font-FourthHead"> Stay Calm</span>  – Real police don’t demand instant payments.</li>
                  <li > ✅ <span class="font-FourthHead"> Hang Up & Verify</span>  – Call official government or law enforcement numbers.</li>
                   <li>  ✅ <span class="font-FourthHead"> Never Pay</span>  – Authorities never ask for money over the phone.</li>
                    <li> ✅ <span class="font-FourthHead"> Report the Scam</span>  – Notify law enforcement or cybersecurity agencies. </li>
                    
              </ul> `,
              },
            ],
          }}
        />
      </div>
      <div id="helpline" data-section="helpline">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/call1930.png",
            cardAltName: "housing-figure",
            cardHeading: "Cyber crime help-line",
            reverse: false,
          }}
        >
          <p class="font-Paragraph text-minParaFont">
            The Government of India has set up a dedicated National Cybercrime
            Helpline at 1930, where victims can seek assistance and take action
            against cybercriminals. Reporting fraud promptly increases the
            chances of recovering lost funds and helps prevent further scams
          </p>
          <Button link="tel: 1930" btnName="Call 1930" />
        </TwoColumnWithImage>
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Prevent scams", "Email scams", "Remote access scams", "Help-line"] as list, index}
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
              <AboveTitleWithLeftIconCard
                contents={{
                  heading: `How to prevent scams`,
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Call first",
                      para: "Before you make a first-time payment for any amount you're not prepared to lose, call the payee using a verified phone number to check it’s really them requesting payment.",
                      icon: "/icons/contact.svg",
                      altName: "icons-contact",
                    },
                    {
                      heading: "Set strong, unique passwords",
                      para: "Ensure all of your accounts, especially email accounts, have strong, unique passwords and are setup with second-factor authentication (e.g. SMS).",
                      icon: "/icons/lock&key.svg",
                      altName: "icons-lock",
                    },
                    {
                      heading: "Use an approval process",
                      para: "Setup a payments approval process for your business, preferably requiring multiple approvers, with no exceptions.",
                      icon: "/icons/apply-pen.svg",
                      altName: "icons-apply-pen",
                    },
                    {
                      heading: "A culture of questioning",
                      para: "Encourage a culture where staff are comfortable to question a payment instruction even if it’s from a senior executive.    ",
                      icon: "/icons/search.svg",
                      altName: "icons-search",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div class=" bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  reverse: false,
                  cardImage: "/images/businessman-holding-his-head-while-working-desktop-pc-office.jpg",
                  cardAltName: "photo of a businessman holding his head as his email has been hacked due to negligence",
                  cardHeading: "Business email compromise (BEC)",
                  sourceName:"Freepik",
                  originalSource:"https://www.freepik.com/free-photo/exhausted-businessman-holding-his-head-pain-while-working-desktop-pc-office_26346604.htm"
                }}
              >
                <p class="font-Paragraph text-minParaFont">
                  Business email compromise scams target businesses of all
                  sizes. They involve emails from a compromised email address,
                  or emails made to look like they are from someone you know,
                  such as:
                </p>
                <ul class="font-Paragraph text-subParaFont list-disc pl-5">
                  <li>Your boss</li>
                  <li>Your supplier</li>
                  <li>Your customer</li>
                  <li>Your lawyer</li>
                </ul>
                <p class="font-Paragraph text-minParaFont">
                  These scams involve emails sent to you or your business with a
                  request to make payment to a new account. This new account may
                  be under the scammer's control, and your money could be lost.
                  If you get an email with a request to pay a new account, or an
                  invoice with different account details to those usually used -
                  pause, review, reflect. Before making a payment, consider
                  calling the sender of the email using a verified phone number.
                </p>
              </TwoColumnWithImage>
            </div>
          {:else if index == 2}
            <div class="bg-white text-black px-[0.5rem]">
              <div>
                <TwoColumn
                  reverse           
                  cardImage="/images/digital-arrest-scam.jpg"
                  cardAltName="photo of a digitally scammed girl who is in panic mood"
                  cardHeading="Remote access / Digital arrest scams"
                  sourceName="Freepik"
                  originalSource="https://www.freepik.com/free-photo/young-woman-sitting-cafe-with-her-laptop-stressful-wor_1025751.htm"
                >
                  <p class="font-Paragraph text-minParaFont">
                    Remote access scams begin as a phone impersonation scam,
                    then the scammer gains access to your all Bank account using
                    your own computer, through the use of remote access
                    software.
                    <br />
                    <br />

                    Digital arrest scammers impersonate law enforcement
                    officers, falsely accusing victims of crimes and demanding
                    payments to avoid arrest.
                  </p>

                  <div class="space-y-3">
                    <h2 class="font-FourthHead">How It Works</h2>
                    <ul class=" space-y-3 font-Paragraph text-subParaFont">
                      <li>
                        🚫 Scammers contact victims via <span
                          class="font-FourthHead"
                        >
                          video calls, emails, or phone calls
                        </span> , claiming to be from the police or government.
                      </li>
                      <li>
                        🚫They use <span class="font-FourthHead">
                          fake ID cards, badges, and office backgrounds
                        </span> to appear legitimate.
                      </li>
                      <li>
                        🚫 Victims are falsely accused of <span
                          class="font-FourthHead"
                        >
                          money laundering, cybercrimes, or tax fraud
                        </span> .
                      </li>
                      <li>
                        🚫Scammers demand <span class="font-FourthHead">
                          immediate payment
                        </span> to "clear the charges" and avoid arrest.
                      </li>
                    </ul>
                  </div>
                </TwoColumn>
              </div>

              <AboveTitleWithoutIconCard
                contents={{
                  xlGridCol: 2,
                  cards: [
                    {
                      heading: " Warning Signs",

                      para: `<ul class=" space-y-6 "> 
                        <li> ⚠️ Unexpected calls claiming you're under investigation.</li>
                         <li>  ⚠️Threats of <span class="font-FourthHead"> immediate arrest or legal action </span> . </li>
                          <li> ⚠️ Requests for <span class="font-FourthHead"> payments via cryptocurrency, gift cards, or wire transfers </span> .  </li>
                           <li> ⚠️ Pressure to keep the conversation <span class="font-FourthHead"> secret</span>  from family or the bank.  </li>
                    </ul> `,
                    },
                    {
                      heading: "What to Do",
                      para: `<ul class=" space-y-6 "> 
                     <li> ✅   <span class="font-FourthHead"> Stay Calm</span>  – Real police don’t demand instant payments.</li>
                        <li > ✅ <span class="font-FourthHead"> Hang Up & Verify</span>  – Call official government or law enforcement numbers.</li>
                         <li>  ✅ <span class="font-FourthHead"> Never Pay</span>  – Authorities never ask for money over the phone.</li>
                          <li> ✅ <span class="font-FourthHead"> Report the Scam</span>  – Notify law enforcement or cybersecurity agencies. </li>
                          
                    </ul> `,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/call1930.png",
                  cardAltName: "housing-figure",
                  cardHeading: "Cyber crime help-line",
                  reverse: false,
                }}
              >
                <p class="font-Paragraph text-minParaFont">
                  The Government of India has set up a dedicated National
                  Cybercrime Helpline at 1930, where victims can seek assistance
                  and take action against cybercriminals. Reporting fraud
                  promptly increases the chances of recovering lost funds and
                  helps prevent further scams
                </p>
                <Button link="tel: 1930" btnName="Call 1930" />
              </TwoColumnWithImage>
            </div>
          {/if}
        </details>
      {/each}
    </div>

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
            `<span class="font-FourthHead">DigitalDSA’s Role:</span> DigitalDSA is an independent loan facilitator and web aggregator, connecting users with licensed banks and NBFCs. We do not provide loans directly and do not guarantee approval. All loan terms, conditions, and decisions are solely at the discretion of the respective lender.`,

            `<span class="font-FourthHead">Beware of Fraud & Scams:</span> DigitalDSA does not ask for payments, OTPs, or banking credentials at any stage. If you receive such requests claiming to be from DigitalDSA, do not respond and report them immediately.`,

            `<span class="font-FourthHead">Fake Loan Offers & Business Email Scams:</span> Scammers may impersonate banks, financial institutions, or DigitalDSA representatives to trick users into making payments or sharing confidential details. Always verify loan offers directly with the lender through official contact details. DigitalDSA is not responsible for financial losses due to third-party fraud.`,

            `<span class="font-FourthHead">Remote Access & Digital Arrest Scams:</span> Fraudsters may pretend to be law enforcement or financial regulators, falsely accusing users of financial crimes and demanding payments. DigitalDSA or its partners will never ask for payments through cryptocurrency, gift cards, or wire transfers. If you receive such threats, **hang up and verify through official channels.**`,

            `<span class="font-FourthHead">User Responsibility & Security:</span> Users are responsible for verifying the authenticity of any loan-related communication. Protect your personal and financial information by using strong passwords, enabling two-factor authentication, and verifying any payment requests before proceeding. DigitalDSA is not liable for losses due to phishing, scams, or user negligence.`,

            `<span class="font-FourthHead">Report Fraud:</span> If you suspect a scam, report it immediately. The Government of India’s **National Cybercrime Helpline (1930)** provides assistance to victims of cyber fraud. Reporting scams early improves the chances of recovery and prevents further fraud.`,
          ],
        }}
        disc="list-decimal"
></ThingsYouShould>

    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
