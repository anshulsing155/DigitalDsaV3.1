<script>
	let {
		pageData = {
    coverImage: "/images/selling-your-property-blog.jpg",
    // sourceName: "Freepik",
    // originalSource:
    //   "https://www.freepik.com/search?format=search&img=1&last_filter=query&last_value=story+of+loan+cpmplette+early+girl&query=story+of+loan+cpmplette+early+girl",
    coverAlt: "hero-cover",
    heading: "Selling Your Property: <br> A Complete Guide to a Smooth Sale",
    para: `<p class="p-[1rem] bg-gray-100">Selling a property is more than just finding a buyer it’s about getting the right price, handling legal formalities, and ensuring a hassle-free transaction. Whether you're selling to upgrade, relocate, or liquidate an investment, this guide will help you <strong>maximize your property's value and minimize potential risks.</strong>`,
  }
	} = $props();


  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";

;
</script>

<Seo
  type="WebPage"
  title="Selling Your Property: Get the Best Price & Smooth Process"
  image={pageData.coverImage}
  description="Maximize your property's value with expert tips on pricing, marketing, legal work & closing. Sell smart & stress-free with our complete guide!"
  keywords="Selling property guide, How to sell a house fast, Property selling tips, Real estate selling process, House selling checklist, Legal steps to sell property, Property valuation services, Best way to sell a house, Sell property online, Real estate marketing strategies"
/>

<section>
  <NewPageLayout {pageData}>
    <TwoColumnWithLeftHeading
      contents={{
        heading: "Preparing Your Property for Sale 🏡",
        listTopPara: `First impressions matter! Here’s how to make your property more appealing:`,
        list: [
          {
            heading: `✅ Declutter & Clean – <span class="font-Paragraph">A well-maintained house sells faster. Deep cleaning, repainting, and fixing minor issues can boost your property's value.</span>`,
          },
          {
            heading: `✅ Renovation vs. Quick Sale – <span class="font-Paragraph">If your property is in poor condition, should you renovate or sell as-is? Minor upgrades (paint, lighting, and plumbing fixes) can increase value without a huge cost.</span>`,
          },
          {
            heading: `✅ Set the Right Price – <span class="font-Paragraph">Research recent sales in your area. If the price is too high, it may sit on the market; too low, and you lose money.</span>`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">💡 Where We Can Help:</span> If you need valuation tools or real estate agents to assess your property, we can connect you with experts.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Marketing Your Property 📢",
        listTopPara: `Attracting the right buyers requires a strong marketing strategy:`,
        list: [
          {
            heading: `📸 Professional Photos & Videos – <span class="font-Paragraph">High-quality visuals can make a difference in online listings.</span>`,
          },
          {
            heading: `📢 Online Listings & Social Media – <span class="font-Paragraph">Platforms like 99acres, MagicBricks, and Facebook groups help reach potential buyers.</span>`,
          },
          {
            heading: `🏡 Hosting Open Houses – <span class="font-Paragraph">Arrange visits for interested buyers. Staging your home well can leave a lasting impression.</span>`,
          },
          {
            heading: `📑 Highlight Unique Features – <span class="font-Paragraph">If your property has great views, extra amenities, or recent renovations, emphasize these!</span>`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">💡 Where We Can Help:</span> We can guide you on how to market your property effectively and list it on popular platforms.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Finding the Right Buyer & Negotiating Smartly 🤝",
        listTopPara: `Once you get inquiries, filtering serious buyers is key:`,
        list: [
          {
            heading: `🔍 Verify Buyer’s Financial Readiness – <span class="font-Paragraph">Check if they have loan approval or sufficient funds.</span>`,
          },
          {
            heading: `📜 Understand Buyer Psychology – <span class="font-Paragraph">Are they looking for a deal, or do they want a move-in-ready property? Adjust your pitch accordingly.</span>`,
          },
          {
            heading: `💬 Negotiate Smartly – <span class="font-Paragraph">Have a minimum price in mind and be ready to justify it. Don't rush—multiple offers may come in!</span>`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">💡 Where We Can Help:</span> We can provide negotiation tips and connect you with legal advisors for safe dealings.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Handling Legal & Documentation Work 📑",
        listTopPara: `A property sale is incomplete without proper legal formalities:`,
        list: [
          {
            heading: `✅ Title Deed Verification – <span class="font-Paragraph">Ensure you have a clear title and all ownership documents.</span>`,
          },
          {
            heading: `✅ Encumbrance Certificate (EC) – <span class="font-Paragraph">Confirms there are no legal disputes or outstanding loans on the property.</span>`,
          },
          {
            heading: `✅ Sale Agreement – <span class="font-Paragraph">Draft a clear contract covering price, payment schedule, and transfer date.</span>`,
          },
          {
            heading: `✅ Property Tax Clearance – <span class="font-Paragraph">Ensure all past dues are cleared.</span>`,
          },
          {
            heading: `✅ Registration & Stamp Duty – <span class="font-Paragraph">Both buyer and seller must comply with local registration rules.</span>`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">💡 Where We Can Help:</span> We can guide you on necessary paperwork, legal checks, and expert contacts for smooth processing.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Closing the Deal & Handover 🔑",
        listTopPara: `Once everything is finalized:`,
        list: [
          {
            heading: `<span class="font-Paragraph">Collect the payment securely (preferably through a bank transaction).</span>`,
          },
          {
            heading: `<span class="font-Paragraph">Complete final handover, including keys, documents, and utilities transfer.</span>`,
          },
          {
            heading: `<span class="font-Paragraph">Ensure proper tax filing for capital gains from the sale.</span>`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">💡 Where We Can Help:</span> We can provide tax-saving tips and investment strategies for your proceeds.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Final Thought: Selling Smart & Stress-Free 🪙",
        listTopPara: `Selling property is a major financial decision, and a structured approach ensures better results.<p class="font-Paragraph pt-2"> With the right pricing, marketing, negotiation, and legal support, you can achieve a smooth and profitable sale.</p>`,
        list: [],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">👉 Need help in the selling process?</span> Whether it’s valuation, legal guidance, or marketing tips, we're here to assist you!</p>`,
      }}
    />

    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a home loan specialist at a time that suits you",
              icon: "/icons/appointment.svg",
              iconAltName: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              iconAltName: "Alert Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Fast-track your call and connect with a specialist in the Digital DSA.",
              icon: "/icons/contact.svg",
              iconAltName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Get instant help from our online assistants  or chat to a specialist.`,
              icon: "/icons/msg.svg",
              iconAltName: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />
      <ThingsYouShould
        thinkKnow={{
          heading: `Things you should know`,
          paraGraph: [
            `<span class="font-FourthHead">First Impressions Matter:</span> Decluttering, deep cleaning, and minor renovations can significantly boost your property's appeal and market value.`,
            `<span class="font-FourthHead">Pricing is Key:</span> Setting the right price based on market research ensures your property doesn't linger on the market or sell for less than it's worth.`,
            `<span class="font-FourthHead">Marketing Drives Interest:</span> High-quality photos, online listings, and hosting open houses can attract more potential buyers.`,
            `<span class="font-FourthHead">Smart Negotiation:</span> Verifying buyer readiness and being strategic with negotiations help you secure the best possible deal.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>
