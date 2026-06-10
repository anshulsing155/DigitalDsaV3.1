<script>
  import EnquiryContactPage from "./EnquiryContactPage.svelte";
  import PageFullTextDesign from "./PageFullTextDesign.svelte";
  import Seo from "./Seo.svelte";
  import TwoColumn from "./TwoColumn.svelte";

  let pageData = {
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "Contact us",
    heroParagraph: `Need help with your queries? <br> Get instant assistance from Digital DSA. Send your query if not urgent or connect with a specialist, immediately.`,
  };

  let enquiry = {
    "Home Loan": [
      "Apply for a new loan",
      "Balance Transfer",
      "Top-up Loan",
      "Manage your home loan",
      "Debt Consolidation",
      "Other",
    ],
    "Loan Against Property": [
      "Apply for a new loan",
      "Balance Transfer",
      "Top-up Loan",
      "Manage your LAP",
      "Debt Consolidation",
      "Dropline Overdraft (DOD)",
      "Other",
    ],
    "Plot Loans": [
      "Loan to purchase plot",
      "Plot+Construction Loan",
      "LAP on plot",
      "Plot+Equity loan",
      "Debt Consolidation",
      "Other",
    ],
    "Business Loans": [
      "New business loan",
      "Balance Transfer",
      "Working Capital",
      "Machinery Loan",
      "Overdraft & Limits",
      "Debt Consolidation",
      "CIBIL Improvement",
      "Low CIBIL",
      "General enquiries",
    ],
    "Personal Loans": [
      "Personal Loan",
      "Balance Transfer",
      "Small Loan for travel & marriage",
      "Debt Consolidation",
      "CIBIL Improvement",
      "Low CIBIL",
      "Other",
    ],
    "Professional Loans": [
      "Personal loan for CA",
      "Personal oan for Doctor",
      "Small Loan for travel & marriage",
      "Debt Consolidation",
      "CIBIL Improvement",
      "Low CIBIL",
      "Other",
    ],
    Insurance: [
      "Life Insurance",
      "Car Insurance",
      "Health Insurance",
      "Home & Contents Insurance",
    ],

    "Financial Assistance": [
      "Personal Financial hardship",
      "Business financial hardship",
    ],

    Investor: [
      "Residential Plot",
      "Residential Flat",
      "Residential Villa",
      "Commerical Property",
      "Industrial Property",
    ],
    Other: [],
  };
</script>

<Seo
  type="WebPage"
  title="Get 24/7 Loan Assistance | Contact Digital DSA Today"
  description="Need help with your loan queries? Contact Digital DSA 24/7 for instant assistance, book an appointment, or call us for expert loan support."
  keywords="loan assistance, loan enquiry, digital DSA support, loan specialist, book appointment, instant loan help, 24/7 loan support, FAQs, loan queries, personalized loan assistance"
/>

<section class="xl:contianer mx-auto w-full bg-mainBg">
  <PageFullTextDesign {pageData}>
    <div class="mx-1 lg:mx-0 lg:px-[4rem]">
      <div class="border-b border-dividerColor">
        <EnquiryContactPage {enquiry} heading="What is enquiry?" />
      </div>

      <div class="border-t border-borderColor py-[2rem] space-y-5">
        <TwoColumn
          cardImage="/images/mother-help-kid-to-learn-skate-roller-board.jpg"
          cardAltName="photo of a mother helping her kid to learn the roller skates representing DigitalDSA helping its users in the same way"
          cardHeading="Check These Out Before Reaching Us"
          sourceName="Freepik"
          originalSource="https://www.freepik.com/free-photo/mother-daughter-kick-scooter-park-kids-learn-skate-roller-board-little-girl-skating-sunny-summer-day_10064062.htm"
          reverse={true}
        >
          <ul
            class="grid gap-6 typography-body-sm text-text-light md:typography-body-md list-disc pl-5"
            slot="list"
          >
            <li>
              <span class="font-semibold"
                >Feeling your EMI is too high? –</span
              >
              <br /> Our
              <a
                href="/planners/flexible-emi-planner"
                class="text-linkColor underline underline-offset-4"
                >Flexible EMI Planner</a
              > might just shrink it (without shrinking your wallet).
            </li>

            <li>
              <span class="font-semibold"
                >Curious if you’re getting the best home loan deal? –</span
              >
              <br /> Compare real,
              <a
                href="/get-started/how-can-we-help"
                class="text-linkColor underline underline-offset-4"
                >personalized offers</a
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
              <a
                href="/planners/both"
                class="text-linkColor underline underline-offset-4"
                >how much you’ll save</a
              > (and how fast you’ll be debt-free).
            </li>
          </ul>
        </TwoColumn>
      </div>

      <div class="border-t border-borderColor py-[2rem] space-y-5">
        <TwoColumn
          cardImage="/images/medium-shot-woman-cute-dog-home.jpg"
          sourceName="Freepik"
          originalSource="https://www.freepik.com/free-photo/medium-shot-woman-cute-dog-home_16604223.htm"
          cardAltName="photo of a woman exploring DigitalDSA web app with her dog representing as security check"
          cardHeading={`Your Messages Stay Private, <br/> Your Deals Stay Sweet!`}
        >
          <div class="flex flex-col gap-5" slot="list">
            <ul
              class="grid gap-4 typography-body-sm text-text-light md:typography-body-md list-disc pl-5"
            >
              <li>
                <span class="font-semibold">Your Data Stays Private –</span>
                We use <strong>ISO 27001-grade security</strong> to protect your
                information. No leaks, no unwanted calls—just secure access.
              </li>
              <li>
                <span class="font-semibold">No Fishy Requests –</span> We never
                ask for OTPs, PINs, or passwords. If someone does, they are not from
                DigitalDSA.
              </li>
              <li>
                <span class="font-semibold">Safe Loan Applications –</span>
                Your documents are encrypted and stored securely, following
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
            <p class="mt-4 typography-body-sm text-text-light md:typography-body-md">
              Stay informed, compare confidently, and secure your loan with
              peace of mind.
            </p>
          </div>
        </TwoColumn>
      </div>

      <div class="border-t border-borderColor py-[6rem] space-y-5">
        <div class="flex flex-col gap-[3rem] w-full">
          <!-- first div  -->
          <div class="grid grid-cols-12 gap-4">
            <h2
              class="col-span-12 first-letter:lg:col-span-5 typography-h3 font-semibold md:typography-h2-md"
            >
              Got a question?
            </h2>
            <div
              class="col-span-12 first-letter: lg:col-span-7 typography-body-sm text-text-light md:typography-body-md"
            >
              <p>
                Your query might already have an answer – check our FAQs or use
                our loan assistant for instant help.
              </p>
            </div>
          </div>
          <!-- sec div  -->
          <div
            class="grid grid-cols-3 justify-between gap-4 typography-body-sm text-text-light md:typography-body-md"
          >
            <div class="col-span-3 lg:col-span-2">
              <div
                class="w-full flex justify-center items-center mx-auto h-[20rem]"
              >
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3497.582360012033!2d77.37939727539632!3d28.62274547572295!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfba6614b50fd%3A0xf5f0a2f5d5b8a29b!2s202%2C%20G%20Block%2C%20Sector%2063%2C%20Noida%2C%20Chotpur%2C%20Uttar%20Pradesh%20201307!5e0!3m2!1sen!2sin!4v1710516891085!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  title=""
                  style="border:0; border-radius: 8px;"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                >
                </iframe>
              </div>
              <div class="pt-4 h-[5rem]">
                <p>
                  <span class="font-semibold">Visit Our Office At:</span>
                  <br /> 202, G Block, Sector 63, Noida, Chotpur, <br /> Uttar Pradesh
                  201307
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-4 col-span-3 lg:col-span-1">
              <div
                class="border border-borderColor py-4 divide-x grid grid-cols-12"
              >
                <div
                  class="h-[3rem] flex justify-center col-span-2 lg:col-span-3"
                >
                  <img
                    src="/icons/contact.svg"
                    alt="contact-icon"
                    class="h-full"
                  />
                </div>
                <div class="col-span-10 lg:col-span-9 pl-4">
                  <p>
                    <span class="font-semibold">Call us at:</span> <br /> (+91)
                    120-4994466
                  </p>
                </div>
              </div>

              <div
                class="border border-borderColor py-4 divide-x grid grid-cols-12"
              >
                <div
                  class="h-[1.5rem] md:h-[2rem] lg:h-[2.4rem] flex justify-center col-span-2 lg:col-span-3"
                >
                  <img
                    src="/icons/mail-icon.png"
                    alt="mail-icon"
                    class="h-full justify-self-center"
                  />
                </div>
                <div class="col-span-10 lg:col-span-9 pl-4">
                  <p>
                    <span class="font-semibold">Write to Us At:</span> <br /> support@digitaldsa.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageFullTextDesign>
</section>
