<script>
	let {
		pageData = {
    coverImage: "/images/woman-offering-food-neighbor.jpg",
    coverAlt: "a young woman offering food to elderly neighbor",
    sourceName: "Freepik",
    originalSource:
      "https://www.freepik.com/free-photo/woman-offering-food-neighbor_27645466.htm",
    heading: "How to Choose the Perfect Neighborhood",
    para: `<p class="p-[1rem] bg-gray-100">Finding the right neighborhood is just as important as finding the right home. It involves considering various factors that contribute to your overall quality of life and future growth.</p>`,
  }
	} = $props();


  import HelpList from "./HelpList.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import Seo from "./Seo.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import VerticalBlog from "./VerticalBlog.svelte";

;
</script>

<Seo
  type="WebPage"
  title="How to Choose the Perfect Neighborhood for Your Dream Home"
  image={pageData.coverImage}
  description="Find the best neighborhood with safety, amenities, and future growth in mind. Discover key factors to make the right choice for your new home."
  keywords="Choosing the right neighborhood, Best neighborhood for home, Safe neighborhoods to live in, Neighborhood amenities checklist, Home buying guide, Future-proof neighborhoods, Best areas to live, Property investment tips, Neighborhood safety tips, Real estate location guide"
/>

<section>
  <NewPageLayout {pageData}>
    <div
      class="lg:mx-[13rem] md:mx-[2rem] items-center pb-10 md:pb-16 lg:pb-20 py-7 md:p-12 px-[0.5rem]"
    >
      <div class="mb-12">
        <div class="flex items-center my-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-icon lucide lucide-book-open text-btnBg mr-3"
            ><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path
              d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
            ></path></svg
          >

          <h2
            class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
          >
            Imagine Your Future Here
          </h2>
        </div>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          When you step into a new neighborhood, think about this : <strong
            >Can I truly call this place home?</strong
          >
        </p>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          From schools to shops, parks to public transport every detail matters
          when building the life you dream of.
        </p>
      </div>
      <div class="mb-12">
        <div class="flex items-center my-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-icon lucide lucide-map-pin text-btnBg mr-3"
            ><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
            ></path><circle cx="12" cy="10" r="3"></circle></svg
          >
          <h2
            class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
          >
            Define What Matters to You
          </h2>
        </div>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          Your priorities are unique focus on what makes your life easier and
          happier.
        </p>
        <ul
          class="list-disc pl-5 space-y-3 text-subParaFont font-Paragraph text-gray-700 mt-3 ml-10"
        >
          <li>
            <strong class="mr-1">Proximity to Essentials :</strong> Schools, offices,
            hospitals, and markets should be easily accessible.
          </li>
          <li>
            <strong class="mr-1">Safety and Security :</strong> Well-lit streets
            and secure communities are a must.
          </li>
          <li>
            <strong class="mr-1">Lifestyle and Convenience :</strong> Parks, gyms,
            and entertainment hubs add to your quality of life.
          </li>
        </ul>
      </div>
      <div class="mb-12">
        <div class="flex items-center my-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-icon lucide lucide-compass text-btnBg mr-3"
            ><circle cx="12" cy="12" r="10"></circle><polygon
              points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
            ></polygon></svg
          >
          <h2
            class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
          >
            Test the Neighborhood
          </h2>
        </div>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          Sometimes, you need to experience the area before making a decision.
        </p>
        <ul
          class="list-disc pl-5 space-y-3 text-subParaFont font-Paragraph text-gray-700 mt-3 ml-10"
        >
          <li>
            <strong class="mr-1">Visit at Different Times :</strong> A calm morning
            might turn into a noisy evening.
          </li>
          <li>
            <strong class="mr-1">Talk to the Locals :</strong> Get firsthand stories
            from residents about their experiences.
          </li>
        </ul>
      </div>
      <div class="mb-12">
        <div class="flex items-center my-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-icon lucide lucide-shield text-btnBg mr-3"
            ><path
              d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
            ></path></svg
          >
          <h2
            class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
          >
            Keep Future Growth in Mind
          </h2>
        </div>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          Neighborhoods evolve—make sure you’re investing in one that grows with
          you.
        </p>
        <ul
          class="list-disc pl-5 space-y-3 text-subParaFont font-Paragraph text-gray-700 mt-3 ml-10"
        >
          <li>
            <strong class="mr-1">Upcoming Infrastructure :</strong> Metro stations,
            malls, and highways can boost future value.
          </li>
          <li>
            <strong class="mr-1">Resale Value :</strong> Growing areas ensure higher
            property appreciation.
          </li>
        </ul>
      </div>
      <div class="mb-12">
        <div class="flex items-center my-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-icon lucide lucide-dollar-sign text-btnBg mr-3"
            ><line x1="12" x2="12" y1="2" y2="22"></line><path
              d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
            ></path></svg
          >
          <h2
            class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
          >
            Know Your Budget, Know Your Area
          </h2>
        </div>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          What’s affordable now may not be the best long-term choice.
        </p>
        <ul
          class="list-disc pl-5 space-y-3 text-subParaFont font-Paragraph text-gray-700 mt-3 ml-10"
        >
          <li>
            <strong class="mr-1">Affordability Zone :</strong> Match your budget
            with the cost of living in the area.
          </li>
          <li>
            <strong class="mr-1">Hidden Costs :</strong> Parking fees, maintenance
            charges, and commute expenses add up.
          </li>
        </ul>
      </div>
      <div class="mb-12">
        <div class="flex items-center my-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-icon lucide lucide-heart text-btnBg mr-3"
            ><path
              d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
            ></path></svg
          >
          <h2
            class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
          >
            The Emotional Test
          </h2>
        </div>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          Beyond logic, listen to your heart. Does the neighborhood feel like
          home?
        </p>
        <ul
          class="list-disc pl-5 space-y-3 text-subParaFont font-Paragraph text-gray-700 mt-3 ml-10"
        >
          <li>Can you imagine celebrating festivals here?</li>
          <li>Does the view from your future home bring you peace?</li>
        </ul>
      </div>
      <div class="mb-12">
        <div class="flex items-center my-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-icon lucide lucide-book-open text-btnBg mr-3"
            ><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path
              d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
            ></path></svg
          >
          <h2
            class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
          >
            Take the Leap
          </h2>
        </div>
        <p
          class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
        >
          Choosing a neighborhood isn’t just a financial decision it’s about
          finding where you truly belong.
        </p>
        <p
          class="text-paraFont font-Paragraph text-gray-700 bg-gray-100 p-5 border-l-4 border-btnBg mt-3 leading-relaxed ml-10"
        >
          🎯 Start with your property consultant to explore neighborhoods that
          match your preferences.
        </p>
      </div>
    </div>

    <div slot="secondary" class="">
      <div class="px-[0.5rem] py-[3rem] lg:py-0">
        <h2 class="text-minSubHead font-FourthHead mb-2">
          Did this resonate with you?
        </h2>
        <p
          class="mb-8 text-paraFont font-Paragraph text-gray-700 leading-relaxed"
        >
          If so, you may also want to explore:
        </p>
        <div class="md:flex gap-2">
          <VerticalBlog
            blogLists={[
              {
                icon: "/images/diversity.jpg",
                altName: "images-diversity",
                heading: "Smart Ways to Close Your Loan Early",
                url: "/home-loan/close-your-loan-early",
              },

              {
                icon: "/images/employees.jpg",
                altName: "images-employees",
                heading: "How to Choose the Perfect Neighborhood",
                url: "/home-loan/choose-perfect-neighbourhood",
              },
              {
                icon: "/images/family.jpg",
                altName: "images-family",
                heading: "Understanding the Costs of Buying a Home",
                url: "/home-loan/understand-cost-of-buying-home",
              },
            ]}
          />
        </div>
      </div>

      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: false,
          cards: [
            {
              heading: "Know your borrowing power",
              para: "Book instantly to speak to a home loan specialist at a time that suits you",
              icon: "/icons/appointment.svg",
              coverAlt: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              coverAlt: "Alert Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Fast-track your call and connect with a specialist in the DigitalDSA.",
              icon: "/icons/contact.svg",
              coverAlt: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Get instant help from our online assistants  or chat to a specialist.`,
              icon: "/icons/msg.svg",
              coverAlt: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />

      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-disc pl-4 flex flex-col gap-4 px-2">
          <li>
            <span class="font-FourthHead">Accessibility & Safety: </span>
            Ensure essentials like schools, hospitals, and markets are nearby, with
            well-lit and secure surroundings.
          </li>
          <li>
            <span class="font-FourthHead">Lifestyle & Convenience: </span>
            Parks, gyms, and entertainment hubs contribute to a better quality of
            life.
          </li>
          <li>
            <span class="font-FourthHead">Experience Before Deciding: </span>
            Visit at different times and talk to locals for real-life insights.
          </li>
          <li>
            <span class="font-FourthHead">Future Growth & Resale Value: </span>
            Upcoming infrastructure can boost property value and ensure better returns.
          </li>
          <li>
            <span class="font-FourthHead">Budget & Emotional Fit: </span>
            Consider hidden costs and choose a neighborhood that feels like home.
          </li>
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>
