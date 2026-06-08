<script>
  import { onMount } from "svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import SecondPageLayout from "$lib/components/website/SecondPageLayout.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import { blogs } from "$lib/data/allBlogs";
  import { goto } from "$app/navigation";
  import Loader from "$lib/components/website/Loader.svelte";
  import Seo from "$lib/components/Seo.svelte";

  // Blog categories from Code 1 structure
  const blogCategory = [
    "All",
    "Home Loan",
    "Plot Loan",
    "Personal Loan",
    "Business Loan",
    "Professional Loan",
    "LAP",
    "Finance Support",
    "Cyber Security",
    "Retirement Planning",
    "Others",
  ];

  // State variables - using Code 2's simpler approach
  let searchQuery = "";
  let selectedCategories = []; // Code 2's approach - empty array means "All"
  let itemsPerPage = 20;
  let currentPage = 1;
  let mobileCategoryBar = false;
  let handleImageLoad = false;
  let isLoading = false;

  onMount(() => {
    // Simple image loading delay
    setTimeout(() => {
      handleImageLoad = true;
    }, 1000);
  });

  // Code 2's cleaner category toggle logic
  function toggleCategory(category) {
    if (category === "All") {
      selectedCategories = [];
    } else {
      selectedCategories = selectedCategories.filter((c) => c !== "All");
      if (selectedCategories.includes(category)) {
        selectedCategories = selectedCategories.filter((c) => c !== category);
      } else {
        selectedCategories = [...selectedCategories, category];
      }
    }
    currentPage = 1; // Reset to first page when filter changes
  }

  // Count blogs per category
  function countBlogs(category) {
    if (category === "All") {
      return blogs.length;
    }
    return blogs.filter(
      (blog) => blog.categoryType.toLowerCase() === category.toLowerCase()
    ).length;
  }

  // Generate dropdown options for items per page
  function selectDropdownOptions(max) {
    let options = [];
    if (max <= 5) return [max];
    if (max <= 10) return [5, max];
    if (max <= 20) return [5, 10, max];
    return [5, 10, 20, max];
  }

  // Code 2's filtering logic - much cleaner
  let filteredBlogs = $derived(blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some(
        (category) => category.toLowerCase() === blog.categoryType.toLowerCase()
      );

    return matchesSearch && matchesCategory;
  }));

  let selectOptions = $derived(selectDropdownOptions(filteredBlogs.length));

  // Adjust itemsPerPage if current value is not available
  $effect(() => {
    if (!selectOptions.includes(itemsPerPage)) {
      itemsPerPage = selectOptions[selectOptions.length - 1];
    }
  });

  // Pagination logic
  let totalPages = $derived(Math.ceil(filteredBlogs.length / itemsPerPage));
  let paginatedBlogs = $derived(filteredBlogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ));

  // Reset to first page if current page exceeds total pages
  $effect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
    }
  });

  function goToPreviousPage() {
    if (currentPage > 1) {
      currentPage--;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function resetFilters() {
    selectedCategories = [];
    searchQuery = "";
    currentPage = 1;
  }

  // Navigation handler
  async function handleNavigate(path) {
    if (!path) return;
    isLoading = true;
    try {
      // Simulate navigation
      window.location.href = path;
    } finally {
      isLoading = false;
    }
  }
</script>

<Seo
  type="WebPage"
  title="Smart Finance & Loan Tips | Digital DSA Blog Hub"
  image="/images/pexels-elevate-1267697.jpg"
  description="Explore 75+ expert blogs on loans, budgeting, cybersecurity & more. Save money, stay secure & plan smarter with Digital DSA insights."
  keywords="home loan tips, budgeting strategies, cyber security for business, plot loan guide, loan against property India, debt consolidation, retirement planning tips, financial planning India, EMI reduction tips, property loan checklist, Digital DSA blogs, balance transfer guide, rent vs buy India, cost of living India, business loan insights"
/>

{#if isLoading}
  <div class="fixed inset-0 bg-[var(--landing-bg)] z-50 flex items-center justify-center">
    <Loader />
  </div>
{/if}

<SecondPageLayout
  pageData={{
    coverImage: "/images/pexels-elevate-1267697.jpg",
    coverAlt: "hero-cover",
    heading: "Knowledge",
  }}
>
  <div class="relative">
    <div class="grid sm:grid-cols-[20%_80%] gap-2">
      <!-- Category sidebar -->
      <div class="py-[0.5rem] lg:py-[4rem] pl-[1rem] lg:pl-[2rem] sticky top-0">
        <h3
          class="hidden sm:block typography-body-lg !font-semibold text-black dark:text-white border-b border-btnBg pb-2 sm:pb-4"
        >
          Categories
        </h3>

        <!-- Desktop search -->
        <div class="sm:block hidden mt-4 relative overflow-hidden">
          <input
            class="w-full pl-2 pr-12 h-10 typography-body-md rounded-sm border border-[var(--landing-border)] bg-[var(--landing-bg-card)] text-black dark:text-white focus:ring-btnBg"
            type="text"
            placeholder="Search blog titles..."
            bind:value={searchQuery}
          />
          <button
            class="absolute top-1/2 right-0 transform -translate-y-1/2 typography-button p-3 bg-black text-white"
            onclick={resetFilters}
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>

        <!-- Desktop category list -->
        <ul class="hidden sm:flex flex-col gap-4 pt-4">
          {#each blogCategory as category}
            <li class="flex items-center gap-4 select-none">
              <label class="flex gap-2 cursor-pointer">
                <input
                  class="sr-only"
                  type="checkbox"
                  checked={category === "All"
                    ? selectedCategories.length === 0
                    : selectedCategories.includes(category)}
                  onchange={() => toggleCategory(category)}
                />

                {#if category === "All" ? selectedCategories.length === 0 : selectedCategories.includes(category)}
                  <span
                    ><i class="fa-solid fa-check-square text-btnBg"></i></span
                  >
                {:else}
                  <span
                    ><i class="fa-regular fa-square border-iconColor"></i></span
                  >
                {/if}

                <span
                  class="md:ml-2 typography-body-sm text-[var(--landing-text-secondary)]"
                >
                  {category} ({countBlogs(category)})
                </span>
              </label>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Main content -->
      <div class="py-[0.5rem] lg:py-[4rem] px-[1rem] lg:px-[4rem]">
        <!-- Items per page selector -->
        <div
          class="flex flex-row gap-2 md:gap-4 items-center py-0 sm:py-4 justify-end"
        >
          <span class="typography-body-sm text-[var(--landing-text-secondary)]"
            >Show blogs:</span
          >
          <select
            class="cursor-pointer border border-[var(--landing-border)] rounded-md bg-[var(--landing-bg-card)] text-black dark:text-white outline-none focus:ring-2 ring-btnBg typography-body-sm px-2"
            bind:value={itemsPerPage}
            onchange={() => (currentPage = 1)}
          >
            {#each selectOptions as option}
              <option value={option}>
                {option === filteredBlogs.length
                  ? `All (${filteredBlogs.length})`
                  : option}
              </option>
            {/each}
          </select>
        </div>

        <div class="flex items-center gap-2">
          <!-- Mobile filter toggle -->
          <div class="block sm:hidden font-Paragraph text-subParaFont">
            <button
              type="button"
              class="text-white bg-btnBg w-8 h-8"
              onclick={() => (mobileCategoryBar = true)}
              class:hidden={mobileCategoryBar}
            >
              <i class="fa-solid fa-filter"></i>
            </button>
          </div>

          <!-- Mobile search -->
          <div class="block sm:hidden my-4 relative overflow-hidden w-full">
            <input
              class="w-full pl-2 pr-12 h-8 sm:h-10 typography-body-md rounded-sm border border-[var(--landing-border)] bg-[var(--landing-bg-card)] text-black dark:text-white focus:ring-btnBg"
              type="text"
              placeholder="Search blog titles..."
              bind:value={searchQuery}
            />
            <button
              class="absolute top-1/2 right-0 transform -translate-y-1/2 typography-button p-3 bg-black text-white"
              onclick={resetFilters}
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- Blog grid -->
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-[1rem]">
          {#each paginatedBlogs as blog}
            <a
              href={blog.path}
              onclick={(e) => { e.preventDefault(); (() => handleNavigate(blog.path))(e); }}
              class="border rounded overflow-hidden cursor-pointer shadow-leftBottomShadow hover:shadow-cardShadow group max-h-[15rem] sm:max-h-[20rem] md:max-h-[23rem] h-[23rem]"
            >
              <div class="relative z-30">
                {#if !handleImageLoad}
                  <div
                    class="w-full h-[15rem] sm:max-h-[10rem] max-h-[7rem] bg-[var(--landing-bg-card)] animate-pulse"
                  ></div>
                {:else}
                  <img
                    src={blog.coverImage}
                    alt={blog.coverAlt}
                    class="w-full h-[15rem] sm:max-h-[10rem] max-h-[7rem] object-top object-cover aspect-square group-hover:scale-105 transition-transform duration-300 overflow-hidden z-30"
                  />
                {/if}
                <span
                  class="absolute bottom-0 right-0 font-SubPara text-leastMiniFont text-white bg-black p-1"
                >
                  {blog.categoryType}
                </span>
              </div>
              <div class="flex flex-col gap-1 sm:gap-2 p-2 text-black dark:text-white">
                <h3
                  class="typography-body-lg !font-semibold text-black dark:text-white line-clamp-1 sm:line-clamp-2"
                >
                  {blog.title}
                </h3>
                <p
                  class="typography-body-md text-[var(--landing-text-secondary)] line-clamp-3 sm:line-clamp-4"
                >
                  {#if blog.issue}<span class="text-dangerColor"
                      >[{blog.issue}]</span
                    >{/if}
                  {blog.description}
                </p>
                <span
                  class="{blog.path
                    ? 'text-linkColor'
                    : 'text-dangerColor'} typography-body-sm underline group-hover:no-underline group-hover:opacity-90"
                >
                  Know more
                </span>
              </div>
            </a>
          {/each}
        </div>

        {#if paginatedBlogs.length === 0}
          <div class="text-center text-[var(--form-text-secondary)] text-lg mt-10">
            No blogs found matching your search 🔍
          </div>
        {/if}

        <!-- Pagination -->
        <div
          class="items-center justify-center gap-4 mt-4 font-FourthHead text-subParaFont {paginatedBlogs.length ===
          0
            ? 'hidden'
            : 'flex'}"
        >
          <span
            class="cursor-pointer bg-btnBg rounded-full px-2"
            onclick={goToPreviousPage}
            class:opacity-50={currentPage === 1}
          >
            <i class="fa-solid fa-chevron-left text-black"></i>
          </span>

          <div class="flex items-center">
            <span>{currentPage}</span>
            <span
              ><i class="fa-solid fa-slash fa-rotate-90 text-black"></i></span
            >
            <span>{totalPages}</span>
          </div>

          <span
            class="cursor-pointer bg-btnBg rounded-full px-2"
            onclick={goToNextPage}
            class:opacity-50={currentPage === totalPages}
          >
            <i class="fa-solid fa-chevron-right text-black"></i>
          </span>
        </div>
      </div>
    </div>

    <TwoColumnWithImage
      contents={{
        cardImage: `/images/message.jpg`,
        cardAltName: `CardCover`,
        cardHeading: `Message us 24/7`,
        reverse: false
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>
  </div>

  <div slot="secondary">
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
        paraGraph: [
          `<span class="font-semibold text-black dark:text-white">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
          `<span class="font-semibold text-black dark:text-white">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
          `<span class="font-semibold text-black dark:text-white">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
          `<span class="font-semibold text-black dark:text-white">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
        ],
      }}
      disc="list-decimal"
    ></ThingsYouShould>
  </div>

  <!-- Mobile category sidebar -->
  <div class="sm:hidden block w-full">
    <div
      class="fixed top-0 left-0 w-full h-full z-50 bg-[var(--landing-bg)] text-black dark:text-white transition-transform duration-300 ease-in-out {mobileCategoryBar
        ? 'translate-x-0'
        : '-translate-x-full'}"
    >
      <!-- Close button -->
      <div
        class="sticky top-0 typography-body-sm bg-btnBg text-end"
      >
        <button
          type="button"
          class="text-white w-10 h-10"
          onclick={() => (mobileCategoryBar = false)}
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <ul class="flex flex-col gap-4 p-4 text-black dark:text-white">
        {#each blogCategory as category}
          <li class="flex items-center gap-4 select-none">
            <label class="flex gap-2 cursor-pointer">
              <input
                class="sr-only"
                type="checkbox"
                checked={category === "All"
                  ? selectedCategories.length === 0
                  : selectedCategories.includes(category)}
                onchange={() => toggleCategory(category)}
              />

              {#if category === "All" ? selectedCategories.length === 0 : selectedCategories.includes(category)}
                <span><i class="fa-solid fa-check-square text-btnBg"></i></span>
              {:else}
                <span
                  ><i class="fa-regular fa-square border-iconColor"></i></span
                >
              {/if}

              <span
                class="md:ml-2 typography-body-sm text-[var(--landing-text-secondary)]"
              >
                {category} ({countBlogs(category)})
              </span>
            </label>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</SecondPageLayout>
