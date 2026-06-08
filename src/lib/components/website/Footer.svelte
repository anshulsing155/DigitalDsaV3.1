<script>
  const footerList = [
  {
    "Quick Access": [
      { list: "Stay Safe Online", link: "/cyber-security-against-scams" },
      { list: "Refer & Get Rewarded!", link: "/refer-&-earn" },
      { list: "Financial Help & Support", link: "/finance-support" },
      { list: "Share Your Feedback", link: "/complaint-compliment" },
      { list: "Knowledge", link: "/knowledge" },
    ],
  },
  {
    "About Us": [
      { list: "Who We Are", link: "/about-us" },
      { list: "Get In Touch With Us", link: "/contact" },
      { list: "Careers & Opportunities", link: "/career" },
      { list: "Get Expert Insight", link: "/appointment" },
    ],
  },
  {
    "Important Info": [
      { list: "Essential Documents", link: "/important-info" },
      { list: "Cookies & Preferences", link: "/cookies" },
      { list: "Privacy & Security", link: "/privacy-policy" },
      { list: "Terms of Service", link: "/terms-conditions" },
      { list: "Credits & Attributions", link: "/credits-attributions" },

    ],
  },
  {
    "Follow Us": [
      {
        list: "Twitter (X)",
        link: "https://x.com/DigitalDSA001",
        icon: "/icons/twitterIcon.svg",
        altIcon: "twitter-icon",
      },
      {
        list: "LinkedIn",
        link: "https://www.linkedin.com/company/digitaldsa",
        icon: "/icons/linkedinIcon.svg",
        altIcon: "linkedin-icon",
      },
      {
        list: "YouTube",
        link: "https://www.youtube.com/@DigitalDSA",
        icon: "/icons/youtubeIcon.svg",
        altIcon: "youtube-icon",
      },
      {
        list: "Facebook",
        link: "https://www.facebook.com/profile.php?id=61561179107296",
        icon: "/icons/fbIcon.svg",
        altIcon: "facebook-icon",
      },
      {
        list: "Instagram",
        link: "https://www.instagram.com/digitaldsa1/",
        icon: "/icons/instaIcon.svg",
        altIcon: "insta-icon",
      },
    ],
  },
];


  function goToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let currentYear = new Date().getFullYear();
</script>

<section class="relative z-20 w-full border-t border-dividerColor bg-white">
  <div class="relative">
    <div
      class="relative mx-auto flex w-full flex-col gap-4 lg:w-11/12 xl:w-10/12 2xl:w-[89.5%]"
    >
      <nav
        class="grid grid-cols-1 gap-[2rem] md:gap-[4rem] pt-[4rem] px-2 sm:grid-cols-2 lg:grid-cols-4 lg:px-[4rem]"
      >
        {#each footerList as section}
          {#each Object.entries(section) as [title, items]}
            <div>
              <h3 class="mb-4 font-FourthHead text-subParaFont lg:text-paraFont">{title}</h3>
              <ul>
                {#each items as item}
                  <a
                    href={item.link}
                    target={item.link.includes("http") ? "_blank" : "_self"}
                    class="text-black mb-2 font-Paragraph text-minParaFont md:text-subParaFont underline-offset-4 hover:underline flex gap-2 items-center"
                    >{#if item.icon}
                      <img
                        src={item.icon}
                        alt={item.altIcon}
                        class="h-[1.5rem]"
                      />
                    {/if}
                    {item.list}</a
                  >
                {/each}
              </ul>
            </div>
          {/each}
        {/each}
      </nav>
      <div class="h-[1px] w-full bg-dividerColor"></div>

      <div
        class="flex flex-col gap-2 py-4 text-center justify-center items-center px-[1rem] font-SubPara text-minParaFont lg:px-[4rem]"
      >
        <p>
          Digital DSA is a platform fully owned and operated by E YANTRIK, a
          proprietorship company.
        </p>
        <p>
          © 2018–{currentYear}. All rights reserved by E YANTRIK for Digital
          DSA.
        </p>
      </div>

      <button
        onclick={goToTop}
        type="button"
        class="absolute -top-[2.5rem] right-2 flex h-[4rem] w-[4rem] cursor-pointer items-center justify-center bg-btnBg hover:opacity-90"
      >
        <i class="fa-solid fa-angle-up"></i>
      </button>
    </div>
  </div>
</section>
