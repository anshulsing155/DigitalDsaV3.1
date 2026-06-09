<script>
	let {
		data = $bindable()
	} = $props();


  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Payments from "$lib/components/website/Payments.svelte";
  import { page } from "$app/state";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import AboveTitleWithLeftIconCard from "$lib/components/website/AboveTitleWithLeftIconCard.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import { goto } from "$app/navigation";


  let showModal = $state(false);
  let dialogBox;

  function handleModal() {
    showModal = !showModal;
    dialogBox.close();
  }

  let pageData = {
    coverImage: "/images/refer-and-earn-with-DigitalDSA.jpg",
    coverAlt: "Photo of friends promoting refer and earn with DigitalDSA",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heading: "Refer & Get Rewarded!",
    para: `Join our exciting Refer and Earn program and get rewarded for sharing the benefits of our financial services! Simply invite your friends and family using your unique referral link, and earn exclusive rewards.`,
  };

  // ----------generate-=link-------------------
  let referralLink = $state(page.data.user?.referralLink || "");
  let copied = $state(false);
  let errorMessage = $state("");

  const generateReferralLink = async () => {
    if (!data.user) {
const originalUrl = page.url.pathname + page.url.search;
goto(`/login?redirect=${encodeURIComponent(originalUrl)}`);
    } else {
errorMessage = "";

try {
const response = await fetch("/api/generate-referral", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
mobileNumber: page.data.user?.mobileNumber,
url: page.url.origin,
}),
});

const data = await response.json();

if (response.ok) {
// successMessage = data.message;

referralLink = data.referralLink; // Update user object with the new referral link
} else {
errorMessage = data.error || "Something went wrong.";
}
} catch (error) {
console.error(error);
errorMessage = "An unexpected error occurred. Please try again.";
}
    }
  };

  async function copyToClipboard() {
    try {
await navigator.clipboard.writeText(referralLink);
alert("Link copied to clipboard!");
    } catch (err) {
console.error("Failed to copy:", err);
    }
  }
</script>

<!-- px-[2rem] lg:px-[4rem] -->
<Seo
  type="WebPage"
  title="Refer & Earn ₹5000 | Invite Friends & Get Rewards!"
  image="/images/refer-and-earn-with-DigitalDSA.jpg"
  description="Refer friends to Digital DSA & earn ₹5000! Help them get the best loan deals while you enjoy exclusive rewards. Start referring now!"
  keywords="Refer & Earn ₹5000, Loan referral program, Invite & get rewarded, Best referral rewards India, Earn money by referring, Digital DSA referral program, Loan comparison rewards, Home loan referral benefits, Easy loan referral earnings, Financial services referral"
/>

<section class="xl:contianer mx-auto w-full bg-mainBg">
  <NewPageLayout {pageData} onClick={handleModal}>
    <div class="">
      <div class="px-[1rem] pt-[1rem] lg:p-[4rem] border-b border-[var(--form-border)] text-black dark:text-white">
        <div
          class="flex md:flex-row flex-col gap-[2rem] md:gap-[4rem] justify-between mx-auto"
        >
          <h2
            class="typography-h2 text-black dark:text-white"
          >
            Refer to your friend & get ₹5000
          </h2>

          {#if !referralLink}
            <button
              onclick={(e) => { e.preventDefault(); generateReferralLink(); }}
              class="bg-btnBg p-4"
            >
              Generate Referral Link
            </button>
          {:else}
            <div class="flex gap-4 items-center">
              <div class="">
                <a href={referralLink} target="_blank" rel="noopener noreferrer">{referralLink}</a>
              </div>
              <button
                type="button"
                onclick={copyToClipboard}
                class="bg-[var(--landing-bg-card)] border border-[var(--form-border)] text-black dark:text-white px-3 py-2 flex items-center justify-center hover:bg-[var(--landing-bg)] transition-colors"
                disabled={!referralLink}
              >
                {#if copied}
                  <i class="fa-solid fa-copy text-btnBg"></i>
                {:else}
                  <i class="fa-regular fa-copy text-btnBg"></i>
                {/if}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <div>
        <AboveTitleWithLeftIconCard
          contents={{
            heading: `How It Works`,
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Get Your Unique Referral Link",
                para: "Sign up for our Refer & Earn program and receive a personalized referral link to share.",
                icon: "/icons/uniqueLink.svg",
                altName: "link-icon",
              },
              {
                heading: "Share with Your Network",
                para: "Invite friends and family by sharing your link via WhatsApp, social media, or email.",
                icon: "/icons/refferLink.svg",
                altName: "network-icon",
              },
              {
                heading: "Friend’s Loan Gets Approved",
                para: "When your referred friend applies for a loan and it gets successfully disbursed, your referral is confirmed.",
                icon: "/icons/negotiate.svg",
                altName: "negotiate-icon",
              },
              {
                heading: "Earn ₹5000 Reward",
                para: "For every successful referral, you receive ₹5000 directly in your account—no limits, no hassle! 🚀",
                icon: "/icons/offers.svg",
                altName: "offers-icon",
              },
            ],
          }}
        />
      </div>

      <div class="border-y border-[var(--form-border)] px-[0.5rem] pt-[1rem] lg:p-[4rem] text-black dark:text-white">
        <Payments supportHeading="Key Benefits">
          <div class="grid md:grid-cols-2 gap-[2rem]">
            <div class="col-span-1 grid gap-4">
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
            <div class="col-span-1 grid gap-4">
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
      <div class="px-[0.5rem] pt-[1rem] lg:p-[4rem] border-b border-[var(--form-border)] text-black dark:text-white">
        <Payments
          supportHeading="The Digital DSA Advantage"
          colSpan={3}
          colSpanText={3}
        >
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
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

      <TwoColumnWithImage
        contents={{
          cardImage: `/images/message.jpg`,
          cardAltName: `CardCover`,
          cardHeading: `Message us 24/7`,
          sourceName: "DigitalDSA",
          originalSource: "www.digitaldsa.com",
          reverse: false
        }}
      >
        <p >
          Feel free to message us anytime for expert assistance with your loan
          needs. Our team is here to provide professional advice, guide you
          through the loan process, and help you find the best options. No
          matter the time, we’ve got you covered! Message us anytime, and we’ll
          respond promptly.
        </p>
        <div class="w-full lg:w-auto">
          <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
        </div>
      </TwoColumnWithImage>
    </div>

    <div slot="secondary" class="">
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
          heading: `Things you should know`,
          subPara: [
            `<span class="font-semibold text-black dark:text-white">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-semibold text-black dark:text-white">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-semibold text-black dark:text-white">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
            `<span class="font-semibold text-black dark:text-white">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
