<script>
	let {
		data
	} = $props();



  import Button from "./Button.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
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

  let activeSection = $state('');
  let pageData = {
    coverImage: "/images/ways-safeguard-blog.jpg",
    coverAlt: "hero-cover",
    heading: "Ways to safe your business",
    para: "Enhancing security is crucial—use multi-factor authentication, verify callers, create strong passwords, and stay cautious with links and attachments.",
    actionBtns: [
{
btnName: "Book appointment",
btnLink: "/appointment",
btnColor: "#ffcc00",
},
{
btnName: "Compare rates",
btnLink: "/get-started/how-can-we-help",
},
    ],
  };
  let callerIdServices = [
    {
heading: "Jio Truecaller Integration & JioCall App",
Service:
"Reliance Jio collaborates with Truecaller for spam call identification.",
Features:
"JioCall app offers caller ID, call blocking, and spam reporting.",
"How to use":
"Truecaller integration is available for Jio users, and JioCall can be downloaded from app stores.",
    },
    {
heading: "Airtel Call Manager & Smart Missed Call Alert",
Service:
"Airtel provides caller ID and spam call alerts through Smart Missed Call Alerts.",
Features:
" Call blocking, spam detection, and filtering of unwanted calls.",
"How to use":
"Airtel Thanks App offers settings for managing call preferences.",
    },
    {
heading: "Vi (Vodafone Idea) Call Filter",
Service:
"Vodafone Idea (Vi) provides a Call Filter feature to detect spam and fraud calls.",
Features:
" Identifies spam numbers, blocks robocalls, and provides caller insights.",
"How to use": "Available via the Vi App and Truecaller integration.",
    },
    {
heading: "BSNL Do Not Disturb (DND) Service & Truecaller Integration",
Service:
"BSNL allows users to activate DND to avoid promotional calls and SMS spam.",
Features: "Blocks telemarketing calls and filters fraud numbers.",
"How to use":
"Activate DND via BSNL customer service or mobile settings.",
    },
    {
heading: "Truecaller and Google Dialer (Third-Party Services)",
Service:
"Though not provided directly by telecom operators, Truecaller and Google Dialer help identify spam calls.",
Features:
"Spam detection, caller identification, and community-based fraud reporting.",
"How to use":
"Install Truecaller or use Google Dialer’s built-in spam protection.",
    },
    {
heading: "Additional Measures to Prevent Spam Calls in India:",
"Enable DND (Do Not Disturb)":
"service by dialing 1909 or using your service provider’s app.",
"Use spam call detection apps":
" like Truecaller, Hiya, and Google Dialer for additional protection",
"Report fraud calls and spam numbers ":
" via the National Cybercrime Helpline 1930 or TRAI’s complaint portal.",
    },
  ];

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
  title="Secure Your Business: MFA, Caller ID & Password Protection"
  image="/images/ways-safeguard-blog.jpg"
  description="Protect your business with MFA, caller ID checks, telecom security, and strong passwords. Learn how to prevent fraud and secure your accounts."
  keywords="Business security, Multi-Factor Authentication (MFA), Caller ID verification, Spam call protection, Telecom security options, Strong password tips, Cyber fraud prevention, Secure online banking, OTP authentication, Phishing protection, SIM swap fraud, Password manager, Digital security measures, Secure UPI transactions, Fraud prevention India"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Multi-Factor authentication",
              targetId: `MFA`,
            },
            {
              name: "Caller ID check",
              targetId: `caller`,
            },
            {
              name: "Options with telecom companies",
              targetId: `telecomCompanies`,
            },
            {
              name: "Password securing",
              targetId: `password`,
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>
      <!-- <AnchorCounter /> -->
      <div
        id="MFA"
        data-section="MFA"
        class="lg:px-[4rem] border-b border-borderColor"
      >
        <ThingsYouShould
          thinkKnow={{
            heading: "Multi-Factor Authentication (MFA)",
            subPara: [
              `Multi-Factor Authentication (MFA) is a security feature that adds an extra layer of protection to your online accounts, including banking, UPI apps, and email. Instead of just using a password, MFA requires at least one more verification step, such as an OTP, biometric scan, or security token.`,
              `With the rise of cyber fraud in India, including phishing and SIM swap scams, relying only on passwords is risky. MFA makes it significantly harder for hackers to access your accounts, even if they steal your password. Indian banks, UPI apps like PhonePe, Google Pay, and Paytm, and Aadhaar services use MFA to verify users before granting access.`,
              `To stay secure, enable 2-Step Verification on your banking and financial apps. Instead of relying only on SMS OTPs, consider using an authenticator app for better security. Also, activate biometric authentication on your devices where possible.`,
            ],
          }}
        />
      </div>
      <div id="caller" data-section="caller" class="">
        <div class="border-b border-borderColor px-[4rem]">
          <ThingsYouShould
            thinkKnow={{
              heading: "Caller ID and spam protection",
              subPara: [
                `To verify if a caller claiming to be from your bank (e.g., SBI, HDFC, ICICI) is genuine, always use official security features provided by your bank’s mobile app. Some banks offer in-app verification methods to confirm the legitimacy of the caller, ensuring a safer authentication process.`,
                `Banks like SBI, HDFC, ICICI, and others may occasionally call you regarding your account or banking services. To ensure security, it’s crucial that both you and the bank confirm each other's identity. Keeping your contact details updated helps protect your account from fraud.`,
                `With the rise in scam and fraudulent calls, it can be difficult to verify if a caller is genuine. Some banks provide in-app verification methods to confirm their identity before discussing account details.`,
              ],
            }}
          ></ThingsYouShould>
        </div>
      </div>

      <div
        id="telecomCompanies"
        data-section="telecomCompanies"
        class="border-b border-borderColor px-[4rem]"
      >
        <ThingsYouShould
          thinkKnow={{
            heading: "Options with telecom companies",
          }}
        >
          <div slot="list">
            <ul class="list-decimal pl-5 space-y-5">
              {#each callerIdServices as item}
                <li class="font-FourthHead text-miniSubHead space-y-2">
                  <h3>{item.heading}</h3>
                  {#each Object.entries(item) as [key, value], i}
                    {#if key != "heading"}
                      <ul
                        class="list-disc pl-4 font-Paragraph text-subParaFont space-y-3"
                      >
                        <li>
                          <span class="font-FourthHead">
                            {key} :
                          </span>{value}
                        </li>
                      </ul>
                    {/if}
                  {/each}
                </li>
              {/each}
            </ul>
          </div>
        </ThingsYouShould>
      </div>

      <div id="password" data-section="password" class="">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Creating and securing passwords",
            cardData: [
              {
                title:
                  "Tips for Creating a Strong Password for Online Banking & Digital Accounts ",
                para: `<ul class="list-disc pl-4">
  <li><span class="font-FourthHead"> Use a mix</span> of letters, numbers, and symbols to increase security. </li>
  <li> <span class="font-FourthHead">Make it as long as possible</span>—longer passwords are harder to crack. </li>
  <li> <span class="font-FourthHead">Avoid easily guessable details</span>, such as your name, birthdate, or common phrases. </li>
  <li>  <span class="font-FourthHead">Consider using a passphrase</span>—instead of a random string, create a memorable phrase that tells a story.</li>
   </ul>
  
<span class="font-FourthHead">For example: </span> 
"MyD0gL0v3sCh@seC@ts!" (It’s fun, unique, and hard to guess!)
`,
              },
              {
                title: "Password Security: Keep Your Accounts Safe",
                para: `<ul class="list-disc pl-5">
<li><span class="font-FourthHead">Never share your passwords</span> with anyone, including bank representatives.</li>
<li><span class="font-FourthHead">Avoid writing passwords down</span>—store them securely using a password manager if needed.</li>
<li><span class="font-FourthHead">Use unique passwords</span> for each account; reusing passwords increases the risk of multiple accounts being compromised in a data breach.</li>
<li><span class="font-FourthHead">Consider passphrases</span> if managing complex passwords becomes difficult. A memorable phrase with numbers and symbols is both secure and easy to recall.</li>
<li><span class="font-FourthHead">Enable multi-factor authentication (MFA)</span> wherever possible. This adds an extra layer of security, such as an OTP from an authenticator app on your phone.</li>
</ul>
`,
              },
            ],
          }}
        />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Multi-Factor authentication", " Caller ID check", "Options with telecom companies", "Password securing"] as list, index}
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
            <div class="bg-white text-black" id="MFA">
              <ThingsYouShould
                thinkKnow={{
                  heading: "Multi-Factor Authentication (MFA)",
                  subPara: [
                    `Multi-Factor Authentication (MFA) is a security feature that adds an extra layer of protection to your online accounts, including banking, UPI apps, and email. Instead of just using a password, MFA requires at least one more verification step, such as an OTP, biometric scan, or security token.`,
                    `With the rise of cyber fraud in India, including phishing and SIM swap scams, relying only on passwords is risky. MFA makes it significantly harder for hackers to access your accounts, even if they steal your password. Indian banks, UPI apps like PhonePe, Google Pay, and Paytm, and Aadhaar services use MFA to verify users before granting access.`,
                    `To stay secure, enable 2-Step Verification on your banking and financial apps. Instead of relying only on SMS OTPs, consider using an authenticator app for better security. Also, activate biometric authentication on your devices where possible.`,
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div class=" bg-white text-black" id="caller">
              <ThingsYouShould
                thinkKnow={{
                  heading: "Caller ID and spam protection",
                  subPara: [
                    `To verify if a caller claiming to be from your bank (e.g., SBI, HDFC, ICICI) is genuine, always use official security features provided by your bank’s mobile app. Some banks offer in-app verification methods to confirm the legitimacy of the caller, ensuring a safer authentication process.`,
                    `Banks like SBI, HDFC, ICICI, and others may occasionally call you regarding your account or banking services. To ensure security, it’s crucial that both you and the bank confirm each other's identity. Keeping your contact details updated helps protect your account from fraud.`,
                    `With the rise in scam and fraudulent calls, it can be difficult to verify if a caller is genuine. Some banks provide in-app verification methods to confirm their identity before discussing account details.`,
                  ],
                }}
              ></ThingsYouShould>
            </div>
          {:else if index == 2}
            <div class="bg-white text-black" id="telecomCompanies">
              <ThingsYouShould
                thinkKnow={{
                  heading: "Options with telecom companies",
                }}
              >
                <div slot="list">
                  <ul class="list-decimal pl-5 space-y-5">
                    {#each callerIdServices as item}
                      <li class="font-FourthHead text-miniSubHead space-y-2">
                        <h3>{item.heading}</h3>
                        {#each Object.entries(item) as [key, value], i}
                          {#if key != "heading"}
                            <ul
                              class="list-disc pl-4 font-Paragraph text-subParaFont space-y-3"
                            >
                              <li>
                                <span class="font-FourthHead">
                                  {key} :
                                </span>{value}
                              </li>
                            </ul>
                          {/if}
                        {/each}
                      </li>
                    {/each}
                  </ul>
                </div>
              </ThingsYouShould>
            </div>
          {:else if index == 3}
            <div class="bg-white text-black" id="telecomCompanies">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Creating and securing passwords",
                  cardData: [
                    {
                      title:
                        "Tips for Creating a Strong Password for Online Banking & Digital Accounts ",
                      para: `<ul class="list-disc pl-4">
  <li><span class="font-FourthHead"> Use a mix</span> of letters, numbers, and symbols to increase security. </li>
  <li> <span class="font-FourthHead">Make it as long as possible</span>—longer passwords are harder to crack. </li>
  <li> <span class="font-FourthHead">Avoid easily guessable details</span>, such as your name, birthdate, or common phrases. </li>
  <li>  <span class="font-FourthHead">Consider using a passphrase</span>—instead of a random string, create a memorable phrase that tells a story.</li>
   </ul>
        
      <span class="font-FourthHead">For example: </span> 
      "MyD0gL0v3sCh@seC@ts!" (It’s fun, unique, and hard to guess!)
      `,
                    },
                    {
                      title: "Password Security: Keep Your Accounts Safe",
                      para: `<ul class="list-disc pl-5">
      <li><span class="font-FourthHead">Never share your passwords</span> with anyone, including bank representatives.</li>
      <li><span class="font-FourthHead">Avoid writing passwords down</span>—store them securely using a password manager if needed.</li>
      <li><span class="font-FourthHead">Use unique passwords</span> for each account; reusing passwords increases the risk of multiple accounts being compromised in a data breach.</li>
      <li><span class="font-FourthHead">Consider passphrases</span> if managing complex passwords becomes difficult. A memorable phrase with numbers and symbols is both secure and easy to recall.</li>
      <li><span class="font-FourthHead">Enable multi-factor authentication (MFA)</span> wherever possible. This adds an extra layer of security, such as an OTP from an authenticator app on your phone.</li>
      </ul>
      `,
                    },
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

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
