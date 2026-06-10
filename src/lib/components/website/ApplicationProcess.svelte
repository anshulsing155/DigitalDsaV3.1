<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let thinkYouShouldKnow = {
    heading: "Things You Should Know",
    paraGraph: [
      `<span class="font-semibold">Timelines vary:</span> While we strive to move quickly, some roles may have longer processing times depending on the number of applicants and required background checks.`,
      `<span class="font-semibold">Stay connected:</span> Keep an eye on your  email and phone  for updates regarding your application status.`,
      `<span class="font-semibold">Multiple applications?</span> If you apply for multiple roles, each application will be assessed independently.`,
      `<span class="font-semibold">Need assistance?</span> If you require accessibility accommodations, don’t hesitate to reach out – we’re here to support you.`,
    ],
  };
</script>

<Seo
  type="WebPage"
  image="/images/career-process-blog.jpg"
  title="Join Our Team – Application Process & Hiring Steps"
  description="Explore our step-by-step hiring process, from search to offer. Learn how to apply, prepare, and join our team with confidence."
  keywords="application process, how to apply for a job, job application steps, resume tips, job interview process, career opportunities, hiring process, recruitment steps, job screening, employment background check, submit job application, join our team, job offer process, virtual interview tips,  career application guide"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/career-process-blog.jpg",
      altName: "hero-cover",
      heading: "Application process",
      para: `Are you ready to kick-start your career with us?`,
    }}
  >
    <AboveTitleWithTopIconCard
      contents={{
        xlGridCol: 3,
        borderBottom: true,
        cards: [
          {
            heading: "1. Search",
            subHeading: `Find the right opportunity for you `,
            para: `<ul class="pl-4 list-disc">
   
    <li>Use filters to narrow your search by location, job type, full-time or part-time roles  .</li>
    <li>Click on the job posting that interests you and carefully read the job description to ensure it aligns with your skills and career aspirations.</li>
</ul>`,
            icon: "/icons/search.svg",
            altName: "icons-search",
          },
          {
            heading: "2. Get Your Resume Ready​​",
            para: `Your resume is the first step to making a great impression! Highlight your skills, experience, and achievements effectively. Need help? Check out our resume writing tips to craft a compelling application.`,
            icon: "/icons/apply.svg",
            altName: "icons-apply",
          },
          {
            heading: "3. Apply​",
            para: `<ul class="pl-4 list-disc">
    <li> New Applicant?  Create your profile to submit an application.</li>
    <li> Returning Applicant?  Sign in with your existing credentials.</li>
   
    <li>After completing your application, carefully review our  Employment Privacy Statement  before submission.</li>
    <li>Check all details in your application summary, then click Submit  .</li>
    <li>Once submitted, our team will assess your application against the job criteria.</li>
</ul>`,
            icon: "/icons/apply-pen.svg",
            altName: "icons-apply-pen",
          },
          {
            heading: "4. Phone Screening",
            para: `If your application moves forward, our Talent Acquisition Team   will reach out to discuss your alignment with the role. If you have any accessibility requirements due to a disability, you can inform us at this stage for accommodations during the application process.​​`,
            icon: "/icons/contact.svg",
            altName: "icons-contact",
          },
          {
            heading: "5. Interview(s)​",
            para: `<ul class="pl-4 list-disc">
    <li>Interviews may be conducted virtually or in person   with the hiring manager and relevant team members.</li>
    <li>Depending on the role, there may be multiple interview rounds  .</li>
</ul>
`,
            icon: "/icons/people.svg",
            altName: "icons-people",
          },
          {
            heading: "6. Offer & Background Checks​",
            para: `<ul class="pl-4 list-disc">
    <li>If you're selected, you'll receive a formal job offer.</li>
    <li>We conduct thorough background checks  , ensuring compliance with our standards as a responsible financial service institution.</li>
    <li>Background checks may take at least three weeks  , and we will keep you updated throughout the process.</li>
    <li>Once completed, we’ll confirm your start date   and welcome you to the team!</li>
</ul>
`,
            icon: "/icons/offers.svg",
            altName: "offers-icon",
          },
        ],
      }}
    />
    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 2,
          borderBottom: true,
          cards: [
            // {
            //   heading: "Book an </br> appointment",
            //   para: "Book instantly to speak to a home loan specialist at a time that suits you",
            //   icon: "/icons/appointment.svg",
            //   altName: "appointment Icon",
            //   url: "/appointment",
            // },
            // {
            //   heading: "Check loan offers",
            //   para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
            //   icon: "/icons/manageLoan2.svg",
            //   altName: "Alert Icon",
            //   url: "/get-started/how-can-we-help",
            // },
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

      <ThingsYouShould thinkKnow={thinkYouShouldKnow} disc="list-disc" />
    </div>
  </NewPageLayout>
</section>
