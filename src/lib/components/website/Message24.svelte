<script>
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import Seo from "./Seo.svelte";
  import HelpList from "./HelpList.svelte";

  let benefits = {
    heading: "What are the benefits with us?",
    items: [
      {
        id: 1,
        title: "Get Instant Help Anytime",
        desc: `No need to wait — our assistant answers your queries instantly (most of the time) or connects you with a specialist during working time Monday to Saturday between 10:00 AM to 06:00 PM.`,
        icon: "/icons/businessInsights.svg",
        altName: "invest-icon",
      },
      {
        id: 2,
        title: "Our whole webapp is a convenient hub for support​",
        desc: "Find solutions for loan applications, repayments, financial hardship, and property-related queries—all in one place.",
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
      {
        id: 3,
        title: "Secure & Private",
        desc: "Your chats, messages, emails and applications are encrypted for security, and we never ask for sensitive information like OTP, PIN or passwords.",
        icon: "/icons/msg.svg",
        altName: "msg-icon",
      },
      {
        id: 4,
        title: "Smart Financial Assistance",
        desc: "Discover tools, planners, and calculators you might be looking for, or get budgeting advice to manage your finances better.",
        icon: "/icons/securityShield.svg",
        altName: "reset-icon",
      },
    ],
  };

  let instantSupport = {
    heading: "How to Get Instant Support?",
    items: [
      {
        id: 1,
        title: "Visit Our Contact Page",
        desc: `<a href="/contact" class="text-linkColor underline underline-offset-4">Tap here </a> to get our all the contact details i.e. phone numbers, email ids and physical addresses. you can opt any to get hep from us`,
        icon: "/icons/businessInsights.svg",
        altName: "invest-icon",
      },
      {
        id: 2,
        title: "Ask Your Question",
        desc: "Select your query from the given options. After recieving your request, our assistant will provide a response or connect you to a specialist.",
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
      {
        id: 3,
        title: "Enable Notifications",
        desc: "If you’re connected to a specialist, get notified when they reply, so you can respond at your convenience.",
        icon: "/icons/msg.svg",
        altName: "msg-icon",
      },
      {
        id: 4,
        title: "Secure Messaging Anytime",
        desc: "Get 24/7 assistance without the hassle of phone calls or long wait times.",
        icon: "/icons/securityShield.svg",
        altName: "reset-icon",
      },
    ],
  };

  let pageData = {
    coverImage: "/images/message.jpg",
    coverAlt: "images-message",
    sourceName: "DigitalDSA",
    originalSource: "www.DigitalDSA.com",
    heading: "Message 24*7",
    para: `Need help? We are here for you 24/7. Whether you need quick guidance, financial assistance, or expert advice, we’ve got you covered.`,
  };

  let cardImg1 = "/images/mother-help-kid-to-learn-skate-roller-board.jpg";
  let cardAlt1 =
    "photo of a mother helping her kid to learn the roller skates represeting DigitalDSA helping its users in the same way";
  let cardHead1 = "How Can We Help You?";
</script>

<Seo
  type="WebPage"
  title="24/7 Secure Loan Assistance | Instant Support & Guidance"
  image="/images/message.jpg"
  description="Get 24/7 secure loan assistance with instant support, expert guidance, and financial tools. Chat with our virtual assistant anytime!"
  keywords="24/7 loan assistance, Instant loan support, Secure financial help, Virtual loan assistant, Loan status tracking, EMI planner tool, Home loan comparison, Loan repayment support, Financial hardship assistance, Secure messaging for loans"
/>

<section class="mx-auto w-full">
  <NewPageLayout {pageData}>
    <div class="px-[0.5rem] lg:px-[4rem]">
      <div class="border-b border-borderColor">
        <WhyChoose facilities={benefits} gridCol={4} />
      </div>
      <TwoColumn
        cardImage={cardImg1}
        cardAltName={cardAlt1}
        cardHeading={cardHead1}
        sourceName="Freepik"
        originalSource="https://www.freepik.com/free-photo/mother-daughter-kick-scooter-park-kids-learn-skate-roller-board-little-girl-skating-sunny-summer-day_10064062.htm"
        reverse={true}
      >
        <ul
          class="grid gap-6 typography-body-md text-text-light list-disc pl-5"
          slot="list"
        >
          <li>
            <span class="font-semibold"
              >Stuck with your loan application? –</span
            >
            <br /> Get
            <a href="/contact" class="text-linkColor underline underline-offset-4"
              >real-time support</a
            > for document uploads, status tracking, and eligibility checks.
          </li>

          <li>
            <span class="font-semibold">Feeling your EMI is too high? –</span>
            <br /> Our
            <a
              href="/planners/flexible-emi-planner"
              class="text-linkColor underline underline-offset-4">Flexible EMI Planner</a
            > might just shrink it (without shrinking your wallet).
          </li>

          <li>
            <span class="font-semibold"
              >Curious if you’re getting the best home loan deal? –</span
            >
            <br /> Compare real,
            <a
              href="/get-started/how-can-we-help"
              class="text-linkColor underline underline-offset-4">personalized offers</a
            > instead of guessing what banks might give you.
          </li>

          <li>
            <span class="font-semibold"
              >Financial stress keeping you up at night? –</span
            >
            <br /> Explore
            <a
              href="/finance-support/financial-hardship"
              class="text-linkColor underline underline-offset-4"
              >relief plans, moratorium options</a
            >, and expert advice to breathe easy.
          </li>

          <li>
            <span class="font-semibold"
              >Thinking about prepaying your loan? –</span
            >
            <br /> See
            <a href="/planners/both" class="text-linkColor underline underline-offset-4"
              >how much you’ll save</a
            > (and how fast you’ll be debt-free).
          </li>
        </ul>
      </TwoColumn>

      <div class="border-y border-borderColor">
        <WhyChoose facilities={instantSupport} gridCol={4} />
      </div>

      <TwoColumn
        cardImage="/images/medium-shot-woman-cute-dog-home.jpg"
        sourceName="Freepik"
        originalSource="https://www.freepik.com/free-photo/medium-shot-woman-cute-dog-home_16604223.htm"
        cardAltName="photo of a woman exploring DigitalDSA web app with her dog representing as security check"
        cardHeading="Your Security Comes First"
      >
        <div class="flex flex-col gap-5" slot="list">
          <ul class="grid gap-4 typography-body-md text-text-light list-disc pl-5">
            <li>
              <span class="font-semibold">Your Data Stays Private –</span> We
              use <strong>ISO 27001-grade security</strong> to protect your information.
              No leaks, no unwanted calls—just secure access.
            </li>
            <li>
              <span class="font-semibold">No Fishy Requests –</span> We never ask
              for OTPs, PINs, or passwords. If someone does, they are not from DigitalDSA.
            </li>
            <li>
              <span class="font-semibold">Safe Loan Applications –</span> Your
              documents are encrypted and stored securely, following
              <strong>ISO 27001 </strong>
              and <strong> DPDP Act compliance</strong>.
            </li>
            <li>
              <span class="font-semibold">Beware of Fake Agents –</span>
              DigitalDSA never asks for payments outside our platform. We follow
              <strong>RBI’s digital lending guidelines</strong> to ensure secure
              transactions.
            </li>
            <li>
              <span class="font-semibold">Honest Loan Comparison –</span> No
              hidden fees, no misleading rates—just clear, transparent offers
              aligned with the <strong> Fair Practices Code (FPC)</strong>.
            </li>
          </ul>
          <p class="mt-4">
            Stay informed, compare confidently, and secure your loan with peace
            of mind.
          </p>
        </div>
      </TwoColumn>
    </div>

    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 3,
          cards: [
            {
              heading: "Contact Us",
              para: `Connect with us for any support, inquiries, or information. We're just a message away!`,
              icon: "icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              iconAltName: "Alert Icon",
              url: "/get-started/how-can-we-help",
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
    </div>
  </NewPageLayout>
</section>
