<script>
  import { onMount } from "svelte";
  import { fade, fly, slide } from "svelte/transition";
  import { spring } from "svelte/motion";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import WeAreHereHelp from "./WeAreHereHelp.svelte";
  import { hostName } from "$lib/stores/stores";
  import { afterNavigate } from "$app/navigation";
  import { FileUser, CircleUserRound, LogOut } from "lucide-svelte";

  let firstPart, finalValue;

  let goToCalculators = false;

  let profileIsOpen = false;
  let mobileProfileIsOpen = false;
  let userName = page.data.user?.name?.split(" ")[0] || "";
  let formattedName =
    userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();

  let profileDropDown = [
    {
      title: "My Profile",
      url: "/my-profile",
      icon: CircleUserRound,
      iconProps: { strokeWidth: 1, size: 20, color:"#000000", },
      alt: "icons-userBg",
    },
    {
      title: "My Assessment",
      url: "/my-assessment",
      icon: FileUser,
      iconProps: { strokeWidth: 1, size: 20, color:"#000000" },
      alt: "icons-financialProfile",
    },
    {
      title: "Log Out",
      action: signOut,
      icon: LogOut,
      iconProps: { strokeWidth: 1, size: 20, color:"#000000" },
      alt: "icons-logout",
    },
  ];
  function updateGoToCalculators() {
    goToCalculators = window.innerWidth >= 768;

    if (goToCalculators) {
      navList[1].link = "/calculators/emi-calculator";
      navList[2].link = "/planners/part-payment-planner";
      navList[3].link = "/money-map/how-long-will-your-savings-support-you";
    } else {
      navList[1].link = "/calculators";
      navList[2].link = "/planners";
      navList[3].link = "/money-map";
    }
  }

  $effect(() => {
    if (goToCalculators && page.url.pathname === "/calculators") {
      goto("/calculators/emi-calculator");
    } else if (goToCalculators && page.url.pathname === "/planners") {
      goto("/planners/part-payment-planner");
    } else if (goToCalculators && page.url.pathname === "/money-map") {
      goto("/money-map/how-long-will-your-savings-support-you");
    }
  });

  onMount(() => {
    updateGoToCalculators(); // Set initial state
    window.addEventListener("resize", updateGoToCalculators);

    return () => {
      window.removeEventListener("resize", updateGoToCalculators);
    };
  });

  afterNavigate(() => {
    active = page.url.pathname;
    firstPart = active.split("/").filter(Boolean)[0]; // Extract first part

    const matched = navList.some(
      (item) => item.id.toLowerCase() === firstPart?.toLowerCase()
    );
    finalValue = matched ? firstPart : "/"; // not received any url is will on the Loans navbar
    active = finalValue;
  });
  let active = "/";
  let overlayOpen = false; // For managing overlay visibility

  let width = spring(0, { stiffness: 0.04, damping: 0.8 });

  // think to remember id and link;s first part(between the  start and end slash(/) must be same )
  const navList = [
    {
      list: `Loan services`,
      offer: "",
      scrollingId: "loans",
      id: "/",
      link: "/check-offers",
      mobId: "mobLoans",
      icon: "/icons/personalLoan.svg",
    },
    {
      list: "Calculators",
      id: "calculators",
      link: "/calculators",
      icon: "/icons/calc.svg",
    },
    {
      list: "Loan planners",

      id: "planners",
      link: "/planners",
      icon: "/icons/lap.svg",
    },
    {
      list: "Money map",
      star: "",
      id: "money-map",
      link: "/money-map",
      icon: "/icons/coins.svg",
    },

    {
      list: "About us",
      id: "about-us",
      link: "/about-us",
      icon: "/icons/people.svg",
    },
    {
      list: "Refer & earn",
      id: "refer-&-earn",
      link: "/refer-&-earn",
      icon: "/icons/offers.svg",
    },
  ];

  function scrollToElement(id) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  let searches = [
    {
      id: 1,
      title: "Home Loan Calculator",
      link: "/calculators/emi-calculator",
    },
    { id: 2, title: "Planner Guides", link: "/planners/part-payment-planner" },
    { id: 3, title: "About Digital DSA", link: "/about-us" },
    { id: 4, title: "Interest Rates", link: "" },
    { id: 5, title: "FAQs and Support", link: "" },
    { id: 6, title: "Blogs", link: "" },
  ];

  let navOpen = false;
  let searchOpen = false;
  let searchInput;

  function toggleNav() {
    navOpen = !navOpen;
    mobileProfileIsOpen = false;
    document.body.style.overflow = navOpen ? "hidden" : "auto";
  }

  const handleNavigation = (link, id) => {
    navOpen = false;
    document.body.style.overflow = "auto"; // Always ensure body scroll is restored
    active = link;

    if (active === "/") {
      setTimeout(() => scrollToElement(id), 500);
    }
  };
  async function signOut() {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.success) {
        navOpen = false; // Close mobile menu if open
        document.body.style.overflow = "auto"; // Restore body scroll
        location.reload();
      } else {
        console.error("Logout failed:", result.message);
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      alert("An error occurred. Please try again later.");
    }
  }

  let help = [
    {
      Heading: "Help Support",
      icon: "/icons/support.svg",
      altTitle: "Help Support",
    },
    {
      Heading: "Locate Us",
      icon: "/icons/branch.svg",
      altTitle: "Locate Us",
    },
    {
      Heading: "Contact Us",
      icon: "/icons/contact.svg",
      altTitle: "Contact Us",
    },
  ];

  function toggleSearch() {
    searchOpen = !searchOpen;
    width.set(searchOpen ? 100 : 0);
    overlayOpen = !overlayOpen;
    if (!searchOpen) {
      document.body.style.overflow = "auto";
    } else {
      document.body.style.overflow = "hidden";
      // Focus the search input when opened for better accessibility
      setTimeout(() => {
        const inputElement = document.querySelector(".inputBox");
        if (inputElement) inputElement.focus();
      }, 100);
    }
  }
</script>

<section
  class="relative z-50 mx-auto w-full bg-white border-b border-borderColor"
>
  <div class="mx-auto flex items-center justify-between">
    <div class="flex items-center gap-[4rem]">
      <!-- logo -->
      <div class="relative flex gap-[1rem] sm:gap-[2rem] pl-4 md:pl-[3rem]">
        <button
          type="button"
          class="logoBtn flex flex-col items-center justify-center pt-2"
          onclick={() => {
            goto("/");
            active = "/";}}
        >
          <img
            src="/logo/logoBlack.svg"
            alt="digital-dsa-logo"
            class=" h-[2rem] lg:h-[3rem]"
          />
          <div class="block">
            <p class="text-center font-FifthHead text-xs sm:text-subParaFont">
              {$hostName}
            </p>
            <p class="font-SubPara sm:text-minParaFont 2xl:flex hidden">
              powered by EYantrik
            </p>
          </div>
        </button>
      </div>

      <ul class="flex gap-[3rem] navbarCloseCustomClass cursor-pointer">
        {#each navList as nav, index}
          <li class="text-center">
            <a
              href={nav.link}
              class="group relative font-FourthHead text-subParaFont lg:py-10 text-black"
            >
              {nav.list}
              {#if nav.hasOwnProperty("star")}
                <sup class="absolute top-4 -right-7 h-full">
                  <img
                    src="/gif/moneyMapStar.gif"
                    alt="money-map"
                    class="h-[2rem]"
                  />
                </sup>
              {:else if nav.hasOwnProperty("offer")}
                <sup class="absolute top-3 -right-7 h-full">
                  <img src="/gif/sale.gif" alt="sale" class="h-[2.5rem]" />
                </sup>
              {/if}

              <span
                class="absolute bottom-0 left-0 h-1 w-full bg-btnBg group-hover:scale-x-100 {finalValue ===
                nav.id
                  ? 'scale-x-100'
                  : 'scale-x-0'}"
              ></span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
    <div class="pr-4 toggleBtnCloseCustomClass">
      <button
        type="button"
        onclick={toggleNav}
        class="flex text-minHeadFont faBarCloseCustomClass items-center"
      >
        <span>
          <svg
            class="w-8 h-8"
            aria-hidden="true"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clip-rule="evenodd"
              fill-rule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
            ></path>
          </svg></span
        >
      </button>
    </div>
    <!-- search & login grid-cols-2-->
    <!-- svelte-ignore a11y-no-static-element-interactions -->

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="loginBtnCloseCustomClass group"
      onmouseleave={() => (profileIsOpen = false)}
      onclick={() => (profileIsOpen = !profileIsOpen)}
    >
      {#if page.data.user?.name}
        <!-- <button
          type="button"
          class="font-FifthHead text-navFont bg-btnBg p-5 sm:py-11"
          onclick={signOut}>Logout</button
        > -->

        <div
          class="flex justify-center items-center gap-2 lg:py-[34px] cursor-pointer bg-btnBg w-[182px]"
        >
          <div class="flex items-center gap-2">
            {#if page.data.user?.image}
              <img
                src={page.data.user.image}
                alt="User Profile"
                class="w-8 h-8 border border-black rounded-full object-cover bg-white"
              />
            {:else}
              <div
                class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black font-bold uppercase"
              >
                {page.data.user?.name ? page.data.user.name.charAt(0) : "U"}
              </div>
            {/if}
            <span
              class="font-Paragraph text-paraFont text-black group-hover:underline"
              >{(formattedName =
                formattedName.length > 10
                  ? formattedName.slice(0, 10) + "..."
                  : formattedName)}</span
            >
          </div>
          <i
            class="fa-solid fa-angle-down text-black {profileIsOpen
              ? ' rotate-180'
              : '0'} transition transform"
          ></i>
        </div>

        <!-- Dropdown Menu -->
        {#if profileIsOpen}
          <div
            class="absolute py-2 w-[11.35rem] text-gray-700 hover:bg-gray-100 font-Paragraph text-minParaFont border shadow-lg bg-white"
          >
            <ul>
              {#each profileDropDown as item}
                {@const IconComponent = item.icon}
                <li
                  class="w-full flex gap-2 items-center px-2 py-2 hover:bg-btnBg hover:text-black"
                >
                  <div class="flex items-start justify-start">
                    {#if typeof item.icon === "string"}
                      <img src={item.icon} alt={item.alt} />
                    {:else}
                      <IconComponent {...item.iconProps || {}} />
                    {/if}
                  </div>

                  {#if item.url}
                    <div>
                      <button onclick={() => goto(item.url)}
                        >{item.title}</button
                      >
                    </div>
                  {:else}
                    <div>
                      <button onclick={item.action} class="text-dangerColor"
                        >{item.title}</button
                      >
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      {:else}
        <a
          href="/login"
          class="flex gap-4 items-center font-FifthHead text-navFont bg-btnBg p-5 sm:py-11 text-black"
        >
          <img src="/icons/lock.svg" alt="lock-svg" class="h-[.9rem]" />
          <p>Login</p>
        </a>
      {/if}
    </div>
  </div>

  <!-- Search Bar (Hidden/Visible based on toggleSearch) -->
  {#if searchOpen}
    <div
      class="fixed top-0 w-full h-[3.2rem] md:h-[6.2rem] bg-white"
      bind:this={searchInput}
      out:fade={{ duration: 200 }}
    >
      <div
        class="w-full md:w-10/12 lg:w-9/12 mx-auto flex items-center h-full p-1"
      >
        <button
          class="relative w-2/12 lg:w-1/12 h-full"
          onclick={toggleSearch}
        >
          <i class="fa-solid fa-arrow-left text-minSubHead lg:text-minHeadFont"
          ></i>
        </button>

        <!-- Slow expansion with right to left animation -->
        <div class="h-full w-full flex justify-end">
          <input
            class="text-minSubHead font-Paragraph h-full outline-none px-[2rem] inputBox"
            type="text"
            placeholder="Search..."
            style="width: {$width}%; transform-origin: right center; transition: ease;"
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- Overlay when search bar is active -->
  {#if overlayOpen}
    <div class="overlay bg-mainBg">
      <div class="w-11/12 md:w-10/12 lg:w-9/12 mx-auto h-screen">
        <div class="flex flex-col gap-[2rem] p-[2rem]">
          <h2 class="font-ThirdHead text-minSubHead text-black">
            Popular searches
          </h2>
          <div class="grid md:grid-cols-2 md:gap-[3rem]">
            <div class="col-span-1 grid">
              {#each searches.slice(0, 3) as search}
                <button
                  class="text-paraFont font-Paragraph flex justify-between items-center border-b border-borderColor hover:border-linkColor"
                  onclick={() => {
                    goto(search.link);
                    overlayOpen = false;
                    searchOpen = false;}}
                >
                  <p class="py-2 md:py-4">{search.title}</p>
                  <div class="px-4 h-full flex justify-center items-center">
                    <i class="fa-solid fa-angle-right"></i>
                  </div>
                </button>
              {/each}
            </div>
            <div class="col-span-1 grid">
              {#each searches.slice(3, 6) as search}
                <button
                  class="text-paraFont font-Paragraph flex justify-between items-center border-b border-borderColor hover:border-linkColor"
                  onclick={() => {
                    goto(search.link);
                    overlayOpen = false;
                    searchOpen = false;}}
                >
                  <p class="py-2 md:py-4">{search.title}</p>
                  <div class="px-4 h-full flex justify-center items-center">
                    <i class="fa-solid fa-angle-right"></i>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        </div>
        <div class="p-[2rem]">
          <WeAreHereHelp {help} gridCol={3} />
        </div>
      </div>
    </div>
  {/if}

  {#if navOpen}
    <div
      class="fixed top-0 h-full w-full bg-darkColor px-[1rem] text-white overflow-auto navbarForMobile"
      in:fly={{ x: -100, duration: 500 }}
      out:fly={{ x: -100, duration: 500 }}
    >
      <div
        class="flex justify-between items-center border-b border-btnBg/60 py-[.8rem] px-2 mb-[2rem]"
      >
        <div class="flex flex-col">
          <button
            type="button"
            onclick={() => {
              goto("/");
              toggleNav();}}
            class="flex flex-col items-center space-y-1"
          >
            <img
              src="/logo/logoWhite.svg"
              alt="Digital DSA Logo"
              class="h-[2rem] lg:h-[3rem] object-contain"
              loading="lazy"
            />
            <p
              class="text-center text-white font-FifthHead text-xs sm:text-subParaFont"
            >
              {$hostName}
            </p>
          </button>
        </div>

        <button type="button" onclick={toggleNav}
          ><i class="fa-solid fa-xmark text-2xl"></i></button
        >
      </div>

      <ul
        class="flex flex-col font-FifthHead text-subParaFont relative pb-[1rem] h-[calc(100vh-4rem)]"
      >
        {#each navList as nav, i}
          <li class="hover:text-btnBg py-1">
            <a
              href={nav.link}
              class="block text-white {i < navList.length - 1
                ? ' border-b border-borderColor/50'
                : '  border-b border-btnBg/60'} py-[0.75rem]"
              onclick={(e) => {
                handleNavigation(nav.link, nav.mobId);}}
            >
              <div class="flex gap-[1.5rem] items-center px-2">
                <div class="h-[1.8rem]">
                  <img src={nav.icon} alt="nav-icon" class="h-full" />
                </div>
                <div class="relative flex">
                  {nav.list}
                  {#if nav.hasOwnProperty("star")}
                    <sup class=" -top-4 -right-1 h-full">
                      <img
                        src="/gif/moneyMapStar.gif"
                        alt="money-map-star-icon"
                        class="h-[2rem]"
                      />
                    </sup>
                  {:else if nav.hasOwnProperty("offer")}
                    <sup class=" -top-4 -right-1 h-full">
                      <img
                        src="/gif/sale.gif"
                        alt="sale-icon"
                        class="h-[2.2rem]"
                      />
                    </sup>
                  {/if}
                </div>
              </div>
            </a>
          </li>
        {/each}

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class=" w-full pt-3"
          onclick={() => (mobileProfileIsOpen = !mobileProfileIsOpen)}
        >
          {#if page.data.user?.name}
            {#each profileDropDown as item}
              <li
                class="w-full flex items-end text-btnBg gap-[1.5rem] px-2 font-Paragraph text-[0.75rem] hover:bg-btnBg hover:text-black border-b border-borderColor/60
                py-[.6rem]"
              >
                {#if item.url}
                  <img src={item.icon} alt={item.alt} class="h-5" />
                  <button onclick={() => goto(item.url)}>{item.title}</button>
                {/if}
              </li>
            {/each}

            <button
              type="button"
              class="font-FifthHead text-subParaFont py-[.4rem] bg-btnBg text-black w-full"
              onclick={() => {
                signOut();}}
            >
              <div class="flex gap-[1rem] items-center px-2">
                <img
                  src="/icons/logoutBlack.svg"
                  alt="icon-logout"
                  class="h-10"
                />
                <p>Logout</p>
              </div>
            </button>
          {:else}
            <button
              type="button"
              class="font-FifthHead text-subParaFont py-[.4rem] bg-btnBg text-black w-full"
              onclick={() => goto("/login")}
            >
              <div class="flex gap-[1rem] items-center px-2">
                <img src="/icons/breakLock.svg" alt="lock-svg" class="h-10" />
                <p>Login</p>
              </div></button
            >
          {/if}
        </div>
      </ul>
    </div>
  {/if}
</section>

<style>
  @media screen and (max-width: 1270px) {
    .navbarCloseCustomClass {
      display: none;
    }

    .loginBtnCloseCustomClass {
      display: none;
    }
  }
  @media screen and (min-width: 1270px) {
    .faBarCloseCustomClass {
      display: none;
    }
    .navbarForMobile {
      display: none;
    }
    .toggleBtnCloseCustomClass {
      display: none;
    }
    .logoCloseCustomClass {
      height: 64px;
    }
  }
  @media screen and (min-width: 1028px) {
    .logoCloseCustomClass {
      height: 64px;
    }
  }

  .overlay {
    position: fixed;
    top: 10;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99;
  }

  .inputBox {
    box-shadow: 0 1px 4px 0 rgba(35, 31, 32, 0.2);
  }
</style>
