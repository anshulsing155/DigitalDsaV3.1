<script>
	let {
		pageData = {
    coverImage: "/images/renovate-or-move-blog.jpg",
    coverAlt: "hero-cover",
    heading: "Should You Renovate Your Home or Move to a New One?",
    para: `<p>As a second-time homebuyer, you might be thinking about whether it’s time to upgrade to a new home that offers better features and amenities. But before you make the decision to sell and move, consider this: Renovating your existing home could be a smarter, more cost-effective alternative.
                    <br>Let’s explore both options — <strong> Home Renovation vs. Buying a New Home </strong>and see what might be best for you in terms of cost, emotional value, and long-term impact.
                    </p>`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare all offers",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
      },
    ],
  }
	} = $props();


  import NewPageLayout from "./NewPageLayout.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import HelpList from "./HelpList.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Button from "./Button.svelte";
  import { onMount } from "svelte";
  import Seo from "./Seo.svelte";
  let activeSection = "";
  let firstTableData = [
    {
columnName: [
"<div class='flex gap-2 items-center justify-center'> Feature </div>",
"<div class='flex gap-2 items-center justify-center'> Home Renovation </div>",
"<div class='flex gap-2 items-center justify-center'>  New Home Purchase </div>",
],
rowData: [
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Cost </span>":
[
"<div class='md:pl-24'>Lower, ₹5-15 lakh for major work.</div>",
"<div class='md:pl-24'>Higher, ₹30 lakh to ₹1 crore+.</div>",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Time </span>":
[
"<div class='md:pl-24'>Longer, several months.</div>",
"<div class='md:pl-24'>Faster, move-in ready.</div>",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Emotional Value </span>":
[
"<div class='md:pl-24'>Retain attachment to your home/neighborhood.</div>",
"<div class='md:pl-24'>Fresh start, but leaving old memories.</div>",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Customization </span>":
[
"<div class='md:pl-24'>Fully tailored to your needs.</div>",
"<div class='md:pl-24'>Limited, unless it’s a new build.</div>",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Resale Value </span>":
[
"<div class='md:pl-24'>Boosts value if done well.</div>",
"<div class='md:pl-24'>Higher resale, but costly to sell later.</div>",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Stress Level </span>":
[
"<div class='md:pl-24'>High—living through disruptions.</div>",
"<div class='md:pl-24'>Lower—ready to move in.</div>",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Location </span>":
[
"<div class='md:pl-24'>Stay in your current community.</div>",
"<div class='md:pl-24'>Freedom to choose a new, ideal location.</div>",
],
},
{
"<span class='font-FourthHead flex gap-4 items-center md:pl-20'> Energy Efficiency </span>":
[
"<div class='md:pl-24'>Upgrade as needed.</div>",
"<div class='md:pl-24'>Likely pre-equipped with modern systems.</div>",
],
},
],
    },
  ];

  // mobile-accordion
  let navBarMedium = [
    "Home Renovation",
    "Buying a New Home",
    "The Ultimate Comparison",
    "Best Option for You",
  ];
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
detailsElement.scrollIntoView({
behavior: "smooth",
block: "start",
});
    }, 100);
  };

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
if (rect.top <= 100 && rect.bottom >= 200) {
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

;
</script>

<Seo
  type="WebPage"
  title="Home Renovation vs. Buying New – Find the Best Option"
  image={pageData.coverImage}
  description="Should you renovate or buy a new home? Compare costs, benefits, and long-term value to make the right choice. Get expert advice today!"
  keywords="Home renovation vs buying a new home, Should I renovate or move, Home upgrade options, Cost of home renovation vs buying new, Home renovation benefits, Buying a new home advantages, Home improvement vs moving, Renovate or relocate, Home renovation cost vs moving, Best home loan options for renovation and buying"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- desktop view -->

    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Home Renovation",
              targetId: "renovation",
            },
            {
              name: "Buying a New Home",
              targetId: "buying",
            },
            {
              name: "The Ultimate Comparison",
              targetId: "comparision",
            },
            {
              name: "Best Option for You",
              targetId: `option`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare all offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div id="renovation" data-section="renovation">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Home Renovation:<br> <span class="underline decoration-btnBg underline-offset-4">The Smart Upgrade</span>`,
            listTopPara: `<p>Renovating your existing home can give it a fresh new feel without the hassle of moving. You can add new features, modernize spaces, and create the dream home you’ve always wanted right where you are. <br><br>Here are some benefits of home renovation:</p>`,
            list: [
              {
                heading: `<span class="font-Paragraph">Cost-Effective</span>`,
              },
              {
                heading: `<span class="font-Paragraph">Personalized Upgrades</span>`,
              },
              {
                heading: `<span class="font-Paragraph">Save on Moving Costs</span>`,
              },
              {
                heading: `<span class="font-Paragraph">Increased Property Value</span>`,
              },
              {
                heading: `<span class="font-Paragraph">Stay in a Familiar Environment</span>`,
              },
            ],
          }}
        />
      </div>

      <div id="buying" data-section="buying">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Buying a New Home: <br><span class="underline decoration-btnBg underline-offset-4">The Fresh Start</span>`,
            listTopPara: `<p>On the other hand, buying a new home allows you to start afresh, with the amenities and features you’ve always dreamed of. Whether it’s more space, better location, or modern designs, moving can provide a whole new lifestyle.<br><br> Here’s why buying a new home could be the better option for some:</p>`,
            list: [
              {
                heading: `<span class="font-Paragraph">Modern Features and Amenities</span>`,
              },
              {
                heading: `<span class="font-Paragraph">No Renovation Hassles</span>`,
              },
              {
                heading: `<span class="font-Paragraph">Better Location or Neighborhood</span>`,
              },
              {
                heading: `<span class="font-Paragraph">Increased Energy Efficiency</span>`,
              },
              {
                heading: `<span class="font-Paragraph">No Need for Future Renovations</span>`,
              },
            ],
          }}
        />
      </div>

      <div id="comparision" data-section="comparision">
        <div class="pb-[8rem] border-b border-[#E5E5E5]">
          <div class="mt-[4rem]">
            <h2
              class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
            >
              <p class="mb-[1rem]">The Ultimate Comparison</p>
              <span class="font-Paragraph text-minParaFont"
                >Here’s a detailed comparison of the <span
                  class="underline underline-offset-4 decoration-btnBg"
                  >Home Renovation</span
                >
                and
                <span class="underline underline-offset-4 decoration-btnBg"
                  >New Home Purchase</span
                > options, including financial, emotional, and practical considerations:</span
              >
            </h2>
          </div>
          <div class="px-[4rem]">
            {#each firstTableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>

        <ButtonBanner
          contents={{
            heading: `Compare all bank offers <span class="underline decoration-btnBg underline-offset-4">instantly</span>`,
            btnName: `Compare Here`,
            btnBorder: `#4F4C4D`,
            btnLink: "/get-started/how-can-we-help",
          }}
        />
      </div>

      <div id="option" data-section="option">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Best Option for You`,
            listTopPara: `<p>Choosing between Home Renovation and Buying a New Home depends on:</p>`,
            list: [
              {
                heading: `<span class="font-Paragraph"><strong>Budget :</strong> Renovating is cost-effective, while buying offers modern features with less effort.</span>`,
              },
              {
                heading: `<span class="font-Paragraph"><strong>Preferences :</strong> Renovate if you love your current home and neighborhood; buy if you want a fresh start.</span>`,
              },
              {
                heading: `<span class="font-Paragraph"><strong>Long-Term Goals :</strong> Stay longer? Renovate to add value. Relocating soon? Buying might be better.</span>`,
              },
            ],
          }}
        />

        <TwoColumnWithLeftHeading
          contents={{
            heading: `Which One Suits Your <span class="underline decoration-btnBg underline-offset-4">Goals?</span>`,
            listTopPara: `<p>The choice ultimately comes down to your budget, personal priorities, and long-term plans.</p>`,
            list: [
              {
                heading: `<span class="font-Paragraph"><strong>Renovation:</strong> Keeps the comfort of your current home and community intact, while allowing you to customize and upgrade. It’s ideal if you value familiarity and have a limited budget.</span>`,
              },
              {
                heading: `<span class="font-Paragraph"><strong>Buying a New Home:</strong> Offers fresh opportunities with modern amenities, better energy efficiency, and a potential lifestyle shift. It’s the way to go if you’re ready for change and can manage higher upfront costs.</span>`,
              },
            ],
          }}
        />
      </div>
    </div>

    <!-- mobile view -->

    <div class="block lg:hidden">
      {#each navBarMedium as list, index}
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

          {#if index === 0}
            <div id="renovation" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Home Renovation:<br> <span class="underline decoration-btnBg underline-offset-4">The Smart Upgrade</span>`,
                  listTopPara: `<p>Renovating your existing home can give it a fresh new feel without the hassle of moving. You can add new features, modernize spaces, and create the dream home you’ve always wanted right where you are. <br><br>Here are some benefits of home renovation:</p>`,
                  list: [
                    {
                      heading: `<span class="font-Paragraph">Cost-Effective</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">Personalized Upgrades</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">Save on Moving Costs</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">Increased Property Value</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">Stay in a Familiar Environment</span>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 1}
            <div id="buying" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Buying a New Home: <br><span class="underline decoration-btnBg underline-offset-4">The Fresh Start</span>`,
                  listTopPara: `<p>On the other hand, buying a new home allows you to start afresh, with the amenities and features you’ve always dreamed of. Whether it’s more space, better location, or modern designs, moving can provide a whole new lifestyle.<br><br> Here’s why buying a new home could be the better option for some:</p>`,
                  list: [
                    {
                      heading: `<span class="font-Paragraph">Modern Features and Amenities</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">No Renovation Hassles</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">Better Location or Neighborhood</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">Increased Energy Efficiency</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph">No Need for Future Renovations</span>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 2}
            <div id="comparision" class="bg-white text-black overflow-x-auto">
              <div class="">
                <div class="mt-[4rem]">
                  <h2
                    class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
                  >
                    <p class="mb-[1rem]">The Ultimate Comparison</p>
                    <span class="font-Paragraph text-minParaFont"
                      >Here’s a detailed comparison of the <span
                        class="underline underline-offset-4 decoration-btnBg"
                        >Home Renovation</span
                      >
                      and
                      <span
                        class="underline underline-offset-4 decoration-btnBg"
                        >New Home Purchase</span
                      > options, including financial, emotional, and practical considerations:</span
                    >
                  </h2>
                </div>
                <div class="px-1">
                  {#each firstTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>
              <ButtonBanner
                contents={{
                  heading: `Compare all bank offers <span class="underline decoration-btnBg underline-offset-4">instantly</span>`,
                  btnName: `Compare Here`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/get-started/how-can-we-help",
                }}
              />
            </div>
          {:else if index === 3}
            <div id="option" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Best Option for You`,
                  listTopPara: `<p>Choosing between Home Renovation and Buying a New Home depends on:</p>`,
                  list: [
                    {
                      heading: `<span class="font-Paragraph"><strong>Budget :</strong> Renovating is cost-effective, while buying offers modern features with less effort.</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph"><strong>Preferences :</strong> Renovate if you love your current home and neighborhood; buy if you want a fresh start.</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph"><strong>Long-Term Goals :</strong> Stay longer? Renovate to add value. Relocating soon? Buying might be better.</span>`,
                    },
                  ],
                }}
              />

              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Which One Suits Your <span class="underline decoration-btnBg underline-offset-4">Goals?</span>`,
                  listTopPara: `<p>The choice ultimately comes down to your budget, personal priorities, and long-term plans.</p>`,
                  list: [
                    {
                      heading: `<span class="font-Paragraph"><strong>Renovation:</strong> Keeps the comfort of your current home and community intact, while allowing you to customize and upgrade. It’s ideal if you value familiarity and have a limited budget.</span>`,
                    },
                    {
                      heading: `<span class="font-Paragraph"><strong>Buying a New Home:</strong> Offers fresh opportunities with modern amenities, better energy efficiency, and a potential lifestyle shift. It’s the way to go if you’re ready for change and can manage higher upfront costs.</span>`,
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
        cardImage: "/images/message.jpg",
        cardAltName: "housing-figure",
        cardHeading: "Message us 24/7",
        reverse: true,
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
    </TwoColumnWithImage>
    <div slot="secondary" class="px-2">
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
              para: "Fast-track your call and connect with a specialist in the DigitalDSA.",
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

      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-decimal pl-4 flex flex-col gap-4 px-2">
          <li>
            Renovating can be more cost-effective but may involve living through
            disruptions.
          </li>
          <li>
            Buying a new home offers modern amenities but comes with higher
            upfront costs.
          </li>
          <li>
            Consider your budget, emotional attachment to your current home, and
            long-term goals when deciding.
          </li>
          <li>
            Use our comparison tools to weigh the pros and cons of each option.
          </li>
          <li>
            Consult with our specialists for personalized advice tailored to
            your situation.
          </li>
          <li>
            Explore our detailed guides to make an informed decision about
            renovating or buying.
          </li>
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>
