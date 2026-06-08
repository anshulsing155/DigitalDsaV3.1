<script>
	let {
		data
	} = $props();


  import { page } from "$app/state";
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Payments from "$lib/components/website/Payments.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";



  let pageData = {
    coverImage: "/images/pexels-pixabay-207983.jpg",
    coverAlt: "photo of two friends represeting refferal of DigitalDSA web app",
    sourceName: "Pexel",
    originalSource: "www.pexel.com",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: `You're referred by ${data.data.name}`,
    heroParagraph: `Join our exciting Refer and Earn program and get rewarded for sharing the benefits of our financial services! Simply invite your friends and family using your unique referral link, and earn exclusive rewards.`,
    actionBtn: [
{
firstBtn: "Check latest offers ",
btnColor: "#ffcc00",
link: "/get-started/how-can-we-help",
},
    ],
  };
  let help = [
    {
Heading: "Book an </br> appointment",
paragraph:
"Book instantly to speak to a home loan specialist at a time that suits you",
icon: "/icons/appointment.svg",
altTitle: "icons",
link: "/appointment",
    },
    {
Heading: "Check loan offers",
paragraph:
"In as little as 10 minutes and tailored exactly as per your financial profile.",
icon: "/icons/manageLoan2.svg",
altTitle: "icons",
link: "/get-started/how-can-we-help",
    },
    {
Heading: "Contact us",
paragraph:
"Fast-track your call and connect with a specialist in the Digital DSA.",
icon: "/icons/contact.svg",
altTitle: "icons",
link: "/contact",
    },
    {
Heading: "Message us",
paragraph:
"Get instant help from our online assistants  or chat to a specialist.",
icon: "/icons/msg.svg",
altTitle: "icons",
link: "/message24",
    },
  ];
  let thinkKnow = {
    heading: "Things you should know",
    subPara: [
`
<p class="typography-body-lg !font-semibold text-black dark:text-white">1. Who Can Refer? (Hint: That’s YOU!)</p>
<ul class="list-none list-inside space-y-2 mb-[2rem] mt-4 text-[var(--landing-text-secondary)]">
<li>Anyone with a DigitalDSA account – whether you're a loan agent, financial consultant, or just someone who loves helping others (and making extra cash while at it).</li>
<li>No need to be a finance wizard; just share your referral link and let us do the magic.</li>
</ul>

<p class="typography-body-lg !font-semibold text-black dark:text-white">2. What Counts as a “Successful Referral”?</p>
<ul class="list-none list-inside space-y-2 mb-[2rem] mt-4 text-[var(--landing-text-secondary)]">
<li>Your friend (or customer) must <strong>apply for a loan</strong> through your unique referral link.</li>
<li>The loan must be <strong>sanctioned and disbursed</strong> – no ghost applications, no “just checking” clicks.</li>
<li>Once that sweet, sweet loan amount lands in their account, your reward is locked in.</li>
</ul>

<p class="typography-body-lg !font-semibold text-black dark:text-white">3. How Do You Get Paid? (The Juicy Part!)</p>
<ul class="list-none list-inside space-y-2 mb-[2rem] mt-4 text-[var(--landing-text-secondary)]">
<li>You’ll receive your reward <strong>after the lender confirms the loan disbursement</strong> (typically within 30–60 days).</li>
<li>Payments will be <strong>directly transferred</strong> to your bank or UPI wallet – no complicated redemptions or shady points system.</li>
<li>The more referrals, the fatter your payout – <strong>no limits!</strong></li>
</ul>

<p class="typography-body-lg !font-semibold text-black dark:text-white">4. Things That Won’t Fly (No Funny Business!)</p>
<ul class="list-none list-inside space-y-2 mb-[2rem] mt-4 text-[var(--landing-text-secondary)]">
<li><strong>No fake referrals</strong> – we check! Misusing the program (spam referrals, self-referrals, or shady practices) will get you banned.</li>
<li><strong>No cold-calling random strangers.</strong> Your referrals should be people genuinely looking for a loan. (Uncles, colleagues, besties – all fair game! 🙌)</li>
<li><strong>No shortcuts.</strong> Only referrals made through your unique link will count.</li>
</ul>

<p class="typography-body-lg !font-semibold text-black dark:text-white">5. Why Should You Care? (Because Money!)</p>
<ul class="list-none list-inside space-y-2 mb-[2rem] mt-4 text-[var(--landing-text-secondary)]">
<li>You’re <strong>helping people</strong> find the best loan options – and getting rewarded for it. Win-win!</li>
<li>No need to <strong>sell</strong> anything – just share your link and let us handle the rest.</li>
<li><strong>Unlimited earning potential</strong> – bring in 10 referrals? 50? 100? You get paid for <strong>every single</strong> successful one.</li>
</ul>

    <div class="my-[3rem] text-center">
<a href="/refer-&-earn" class="typography-button inline-block rounded-full border px-[2rem] py-3 border-[#4F4C4D] bg-btnBg text-black hover:bg-opacity-80">Start Referring & Earning Now!</a>
    </div>`,
    ],
  };
</script>

<Seo
  type="WebPage"
  title="Refer & Earn: Get Rewards for Loan Referrals | Digital DSA"
  image="/images/pexels-pixabay-207983.jpg"
  description="Join Digital DSA's Refer & Earn program! Refer friends & family for loans, earn rewards, and help them find the best financial solutions."
  keywords="Refer and Earn Program, Loan Referral Rewards, Financial Services Referral, Digital DSA Referral Program, Best Loan Comparison India, Home Loan Referral Bonus, Property Loan Referral, Earn Money by Referring Loans, Loan Partner Program India, Trusted Loan Comparison Platform"
/>

<div>
  <PageDesign {pageData}>
    <div class="px-[0.5rem] lg:px-[4rem]">
      <div class="py-[4rem] border-y border-[var(--landing-border)]">
        <Payments supportHeading="Key Benefits">
          <div class="grid md:grid-cols-2 gap-[2rem]">
            <div class="col-span-1 grid gap-4 text-black dark:text-white">
              <h2 class="typography-body-lg !font-semibold text-black dark:text-white">
                What are the key benefits for you?
              </h2>
              <ul class="grid gap-4 list-disc pl-4">
                <li>
                  Offer greater value to your customers by connecting them with
                  trusted loan options.
                </li>
                <li>
                  Refer your customers to India’s most comprehensive loan
                  comparison platform, trusted by over 50 financial
                  institutions.
                </li>
                <li>
                  Receive payment for successfully funded and eligible
                  referrals.
                </li>
              </ul>
            </div>
            <div class="col-span-1 grid gap-4 text-black dark:text-white">
              <h2 class="typography-body-lg !font-semibold text-black dark:text-white">
                What are the key benefits for your Referee?
              </h2>
              <ul class="grid gap-4 list-disc pl-4">
                <li>
                  We understand customer needs, ensuring tailored loan solutions
                  for every situation.
                </li>
                <li>
                  Empower customers to make informed choices with expert
                  guidance throughout their home buying and loan journey.
                </li>
                <li>
                  Specialists partner with customers at every step, offering
                  clarity and confidence in every decision.
                </li>
              </ul>
            </div>
          </div>
        </Payments>
      </div>
      <div class="py-[4rem] border-y border-[var(--landing-border)]">
        <Payments
          supportHeading="The Digital DSA Advantage"
          colSpan={3}
          colSpanText={3}
        >
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem] text-black dark:text-white">
            <div class="col-span-1 flex flex-col gap-4">
              <h2 class="typography-body-lg !font-semibold text-black dark:text-white">Expertise</h2>
              <ul class="list-disc pl-4 grid gap-4 text-[var(--landing-text-secondary)]">
                <li>
                  <span class="font-semibold text-black dark:text-white">Simplified Property Buying</span
                  >: We guide customers seamlessly through finding, purchasing,
                  and managing their home or investment property.
                </li>
                <li>
                  <span class="font-semibold text-black dark:text-white">Tailored Insights</span>:
                  Receive complimentary, customized property reports aligned to
                  specific market preferences.
                </li>
                <li>
                  <span class="font-semibold text-black dark:text-white">Smart Tools</span>: Leverage the
                  Home Hub and user-friendly calculators to explore market
                  trends and make well-informed purchasing decisions.
                </li>
              </ul>
            </div>
            <div class="col-span-1 flex flex-col gap-4">
              <h2 class="typography-body-lg !font-semibold text-black dark:text-white">Convenience</h2>
              <ul class="list-disc pl-4 grid gap-4 text-[var(--landing-text-secondary)]">
                <li>
                  <span class="font-semibold text-black dark:text-white">Flexible Support</span>: Get
                  your questions answered in person, via video conferencing,
                  phone calls, or at a location that fits your schedule.
                </li>
                <li>
                  <span class="font-semibold text-black dark:text-white">24/7 Loan Management</span>:
                  Manage loans anytime through our websupport services.
                </li>
              </ul>
            </div>
            <div class="col-span-1 flex flex-col gap-4">
              <h2 class="typography-body-lg !font-semibold text-black dark:text-white">Value</h2>
              <ul class="list-disc pl-4 grid gap-4 text-[var(--landing-text-secondary)]">
                <li>
                  <span class="font-semibold text-black dark:text-white">Tailored Loan Choices</span>:
                  Compare a wide range of products and rates to find solutions
                  that best suit your financial needs.
                </li>
              </ul>
            </div>
          </div>
        </Payments>
      </div>
    </div>

    <div slot="secondary" class="">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} />
    </div>
  </PageDesign>
</div>
