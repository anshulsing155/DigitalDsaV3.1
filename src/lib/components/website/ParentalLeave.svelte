<script>
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import PageDesign from "./PageDesign.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import Button from "./Button.svelte";
  import WhyChoose from "./WhyChoose.svelte";
  let pageData = {
    coverImage: "/images/babyGirl.jpg",
    altName: "images-babyGirl",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "Planning for parental leave",
    heroParagraph: `Your home loan can help support you for a very important next stage of your life. `,
  };
 
  let newBaby = {
    heading: "New baby on the way?",
    subPara: [
      `Preparing for and welcoming a new child into your life is exciting! But there’s a lot to think about, from understanding and planning what you need to buy or borrow (such as a pram or car seat) to planning and budgeting for parental leave.`,

      `Taking time off work to care for children will likely reduce your income and you could face increased living costs. Creating room in your budget and preparing for the financial changes that come with welcoming a child into your family can help you navigate this important time. Your undefined home loan comes with a range of features that can also help you along the way.`,
    ],
  };
  let manageHomeLoan = [
    {
      id: 1,
      subHeading: `1. Redraw additional repayments`,
      subPara: [
        `Redraw gives you access to additional payments that you’ve made over and above the minimum required repayment. Redraw is available on most variable rate undefined home loans, and there are no fees to redraw.`,
      ],
      linkName: `Tell me more about redraw`,
    },
    {
      id: 2,
      subHeading: `2. Change your repayments`,
      subPara: [
        `We understand going on parental leave may mean you need to change how you repay your loan. Reducing your repayments to the minimum monthly amount or changing your repayment frequency could be an option for you.`,
      ],
      linkName: `See your repayment options`,
    },
    {
      id: 3,
      subHeading: `3. Increase your home loan (top-up)`,
      subPara: [
        `Increasing – topping up – your home loan can be an effective way to get additional money. If your loan type lets you do top-ups, the amount by which you can increase it will depend on how much equity is in your property as well as your current financial situation. If this option is right for you, you can apply in NetBank or the undefined app.`,
      ],
      linkName: `Read more about top-ups`,
    },
    {
      id: 4,
      subHeading: `4. Fix your rate`,
      subPara: [
        `With a <a class="underline text-linkColor underline-offset-4"> Fixed Rate home loan </a> you’ll know exactly what your repayments will be, giving you confidence to budget and plan ahead with certainty. If you’re not sure a fixed rate is right for you, you can <a class="underline text-linkColor underline-offset-4"> find out more about the benefits and things to consider</a>  before making the switch.`,
        `To change your home loan to a fixed rate, simply log on to NetBank or the undefined app and choose the loan you’d like to fix. You can also    <a class="underline text-linkColor underline-offset-4">split your home loan </a>  and enjoy the best of fixed and variable. <a class="underline text-linkColor underline-offset-4"> Contact us</a>  to chat through your options.
`,
      ],
      linkName: `Tell me more about redraw`,
    },
    {
      id: 5,
      subHeading: `5. Take a repayment holiday`,
      subPara: [
        `A <a class="underline text-linkColor underline-offset-4">repayment holiday </a>  lets you take a break from your home loan direct debit request (DDR) repayments for a set period of between three to 12 months if you've made additional repayments on your loan. Eligibility conditions apply.`,
      ],
    },
    {
      id: 6,
      subHeading: `6. Switch your accounts to offset`,
      subPara: [
        `An <a class="underline text-linkColor underline-offset-4"> Everyday Offset </a> account is a transaction account linked to your eligible Standard Variable Rate home loan. It’s a great way to pay less interest while also having the flexibility to access your funds easily.`,

        `Any money you put into your offset account (e.g. your salary or savings) reduces the balance on which we charge interest, which means you’ll only be charged interest on the difference. The more money you have in your offset account, the less interest you’ll pay on your home loan.`,

        `You can also have multiple <a class="underline text-linkColor underline-offset-4"> Everyday Offset </a> accounts linked to your home loan, so as well as saving even more interest over time, you can manage your money your way.`,
      ],
    },
  ];
  
  let additionalSupport = {
    heading: "Additional support",
    subPara: [
      `We’re here to support you if you would like to discuss what other options may be available.`,

      `We may be able to help you with tailored payment solutions or consolidating your existing undefined debts.`,

      `The best way to get help is to <a class="underline text-linkColor underline-offset-4">request support online </a> , and we’ll get in touch with you.`,

      `Alternatively, call our Financial Assistance Solutions team on <a class="underline text-linkColor underline-offset-4"> 13 3095 </a> between 8am - 9pm Monday to Friday and 9am - 2pm on Saturday (Sydney/Melbourne time).`,
    ],
    btnName: "Request support online",
    btnBorder: "#4F4C4D",
  };
  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
      `Applications are subject to credit approval, satisfactory security and minimum deposit requirements. Conditions apply to all loan options. Full terms and conditions will be set out in our loan offer, if an offer is made. Fees and charges are payable. Interest rates are subject to change. As this advice has been prepared without considering your objectives, financial situation or needs, you should consider its appropriateness to your circumstances before acting on the advice. You should also read our Financial Services Guide.`,

      `The target market for this product will be found within the product’s Target Market Determination.`,
    ],
  };
  let tools = {
    heading: "Tools, rebates & benefits",
    items: [
      {
        id: 1,
        title: "Find benefits & rebates​",
        desc: `Our Benefits finder tool in the undefined app can help connect you to benefits you may be eligible for.`,
       btnName: "Benefits finder",
       link : '/'
      },
      {
        id: 2,
        title: "Check your leave entitlements​",
        desc: `If you’re an employee, you may be entitled to paid parental leave from your employer and/or the government.`,
        linkText : "Find out more about paid parental leave",
      },
      {
        id: 3,
        title: "Returning to work​​",
        desc: `You may be entitled to <a class="underline text-linkColor"> government subsidies </a> to help you with the cost of childcare. Visit the ASIC MoneySmart website for some hints and tips to help you transition back to work.`,
       linkText : "Visit MoneySmart",
      },
      
    ],
  };
  let guidance = {
    heading: "Further guidance",
    items: [
      {
        id: 1,
        title: "New Parents​",
        desc: `Financial wellbeing guide.`,
        linkText : "Read the guide (PDF)",
       link : '/'
      },
      {
        id: 2,
        title: "Financial wellbeing for parents",
        desc: `Get equipped to make well-informed financial decisions around planning for and raising children.`,
        linkText : "Read more about financial wellbeing for parents",
        link : '/'
      },
      {
        id: 3,
        title: "Where to start with debt​​",
        desc: `How to manage your debt & pay it off faster.`,
       linkText : "Find out where to start with debt",
       link: '/'
      },
      {
        id: 4,
        title: "Starting a family​",
        desc: `You may not be able to prepare for some of the fun and challenging things that come with having a baby. But you can get your money in line to reduce any financial stress.`,
       linkText : "Read more about starting a family",
       link: '/'
      },
      
    ],
  };
  //ends here...
</script>

<section>
  <PageDesign {pageData}>
    <div class="px-[2rem] lg:px-[4rem]">
      <div id="glance" data-section="glance">
        <div class="border-b border-[var(--form-border)]">
          <ThingsYouShould thinkKnow={newBaby} />
        </div>

        <div class="grid lg:grid-cols-5 border-b">
          <h2
            class="col-span-full lg:col-span-2 pt-[2rem] typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2"
          >
            Tips for managing your home loan while you’re on parental leave
          </h2>

          <div class="col-span-full lg:col-span-3">
            {#each manageHomeLoan as item, i (item.id)}
              <div
                class="{manageHomeLoan.length - 1 > i ? 'border-b border-[var(--form-border)]' : ''}"
              >
                <ThingsYouShould thinkKnow={item} colSpan={5} />
              </div>
            {/each}
          </div>
        </div>
        <div class="border-b border-[var(--form-border)]">
            <WhyChoose facilities={guidance} gridCol=4/>
        
        </div>

<div class="border-b border-[var(--form-border)]">
    <WhyChoose facilities={tools} />

</div>

        <div class="border-b border-[var(--form-border)]">
          <TwoColumn
            cardImage="/images/message.jpg"
            cardAltName="housing-figure"
            cardHeading="Message us 24/7"
          >
            <div
              class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
              slot="list"
            >
              <p>
                Get help from  the undefined app or connect with a
                specialist who can message you back. You’ll need <span
                  class="text-linkColor underline underline-offset-4">undefined app</span
                > notifications turned on so you know when you’ve received a reply.
              </p>

              <div class="w-auto">
                <Button
                  link="/contact"
                  btnBorder="#4F4C4D"
                  btnName="Message us"
                />
              </div>
            </div>
          </TwoColumn>
        </div>

        <ThingsYouShould thinkKnow={additionalSupport} />
      </div>
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>


