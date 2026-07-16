<!-- src/lib/components/website/Land.svelte -->
<script lang="ts">
  import BlogCard from './BlogCard.svelte';
  import Button from './Button.svelte';
  import { slide } from 'svelte/transition';
  import CounterBanner from './CounterBanner.svelte';
  import CompaniesBanner from './CompaniesBanner.svelte';
  import MobileBanksCarousel from './MobileBanksCarousel.svelte';
  import { onMount } from 'svelte';
  import Tooltip from './Tooltip.svelte';
  import VerticalBlog from './VerticalBlog.svelte';
  import ButtonBanner from './ButtonBanner.svelte';
  import Testimonials from './Testimonials.svelte';
  import { goto } from '$app/navigation';
  import CategoryCard from './CategoryCard.svelte';
  import HeroCard from './HeroCard.svelte';

  let { content } = $props<{ content: any }>();

  let mobileSubList = $state(false);
  let isVisible = $state(false);
  let showBankList = $state(false);
  let isMobile = $state(false);

  // Derived data from JSON
  const bankingCard = content.bankingCard ?? [];
  const listItem = content.listItem ?? [];
  const blogList = content.blogList ?? [];
  const helpList = content.helpList ?? [];
  const judgmentBanner = content.judgmentBanner ?? {};
  const heroImage = content.heroImage ?? {};
  const backedBy = content.backedBy ?? {};
  const lendersSection = content.lendersSection ?? {};
  const financialDifficulty = content.financialDifficulty ?? {};
  const moreFromDsa = content.moreFromDsa ?? {};
  const happyClients = content.happyClients ?? {};
  const thingsYouShouldKnow = content.thingsYouShouldKnow ?? [];

  const toggleDropdown = (event: Event, index: number) => {
    event.preventDefault();
    const summaryElement = event.currentTarget as HTMLElement;
    const icon = summaryElement.querySelector('.faq-icon') as HTMLElement;
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

    document.querySelectorAll('.dropdown').forEach((otherDetails, idx) => {
      const otherIcon = otherDetails.querySelector('.faq-icon') as HTMLElement;
      if (idx !== index) {
        (otherDetails as HTMLDetailsElement).removeAttribute('open');
        if (otherIcon) {
          otherIcon.classList.remove('fa-angle-up');
          otherIcon.classList.add('fa-angle-down');
        }
      }
    });

    const isOpen = detailsElement.hasAttribute('open');
    if (isOpen) {
      detailsElement.removeAttribute('open');
      icon?.classList.remove('fa-angle-up');
      icon?.classList.add('fa-angle-down');
    } else {
      detailsElement.setAttribute('open', 'true');
      icon?.classList.remove('fa-angle-down');
      icon?.classList.add('fa-angle-up');
    }
    setTimeout(() => {
      detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const updateIsMobile = () => {
    isMobile = window.innerWidth < 640;
  };

  onMount(() => {
    showBankList = true;
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  });
</script>

<section class="w-full relative h-full">
  <!-- Mobile judgment banner -->
  <div class="w-full h-[3rem] bg-[var(--landing-bg-card)] justify-center items-center overflow-hidden z-40 md:hidden flex">
    <div class="grid grid-cols-3 justify-center items-center bg-[var(--landing-section-dark-bg)] text-[var(--landing-bg)] py-2 w-full">
      <div class="col-span-2">
        <p class="font-Paragraph text-para custom-pulse text-center text-xs px-1">
          {judgmentBanner.text}
        </p>
      </div>
      <div class="justify-self-end pr-2">
        <button
          class="border rounded-full border-btnBg p-2 font-Paragraph text-leastPara"
          onclick={() => goto(judgmentBanner.link ?? '/assessment')}
          aria-label={judgmentBanner.btnText}
        >
          {judgmentBanner.btnText}
        </button>
      </div>
    </div>
  </div>

  <div id="pageDesign" class="relative mx-auto">
    <!-- Desktop judgment banner -->
    <div class="w-full h-[3rem] bg-[var(--landing-section-dark-bg)] text-[var(--landing-bg)] justify-center items-center overflow-hidden absolute top-0 z-40 my-2 hidden md:flex">
      <div class="flex gap-2 items-center">
        <p class="font-Paragraph text-para custom-pulse">{judgmentBanner.text}</p>
        <button
          class="border rounded-full border-btnBg px-4 py-2 font-Paragraph text-leastPara"
          onclick={() => goto(judgmentBanner.link ?? '/assessment')}
          aria-label={judgmentBanner.btnTextDesktop}
        >
          {judgmentBanner.btnTextDesktop}
        </button>
      </div>
    </div>

    <div class="relative mx-auto pt-[8rem] sm:pt-[18rem] md:pt-[20rem] lg:pt-0 w-full">
      {#if !isMobile}
        <div id="image" class="absolute top-0 left-1/2 transform -translate-x-1/2 w-full">
          <img
            src={heroImage.desktop}
            alt={heroImage.alt}
            class="object-cover mx-auto"
            width="1600px"
            height="849px"
            loading="eager"
          />
          <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
            <Tooltip hoverLink={heroImage.hoverLink} />
          </div>
        </div>
      {:else}
        <div id="image" class="absolute top-0 left-1/2 transform -translate-x-1/2 w-full">
          <img
            src={heroImage.mobile}
            alt={heroImage.alt}
            class="object-cover mx-auto"
            width="600px"
            loading="eager"
          />
          <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
            <Tooltip hoverLink={heroImage.hoverLink} />
          </div>
        </div>
      {/if}

      <div class="z-20 relative flex flex-col gap-[2rem] pt-[6svh] w-full">
        <!-- Desktop hero card panel -->
        <div class="hidden lg:flex bg-[var(--landing-bg)] text-[var(--landing-text)] border border-[var(--landing-glass-border)] relative p-12 flex-col gap-[2rem] lg:w-[60%] xl:w-[50%] mt-2">
          <HeroCard />
          <div class="bg-ddsa-gradient-primary absolute top-0 left-0 h-2 w-full -translate-y-1/2 sm:h-3 lg:top-1/2 lg:h-[13rem] lg:w-4"></div>
        </div>

        <!-- Desktop lenders banner -->
        <div class="bg-[var(--landing-bg-card)] text-[var(--landing-text)] border-y border-[var(--landing-glass-border)] hidden lg:block text-center py-4">
          <h2 class="typography-h2 text-center">
            We're backed by <span class="bg-btnBg px-[.5rem]">{backedBy.count}<sup class="text-lg">+</sup></span> lenders
          </h2>
          <span class="text-center typography-body-sm text-[var(--landing-text-muted)]">
            {backedBy.disclaimer}
          </span>
          <div><CompaniesBanner /></div>
        </div>

        <!-- Desktop category cards -->
        <div class="hidden lg:flex flex-col gap-4 lg:gap-[3rem] bg-[var(--landing-bg-card)] text-[var(--landing-text)] rounded-xl pt-[4rem]" id="loans">
          <div class="text-center space-y-3">
            <h2 class="typography-h2 text-center font-bold">
              {lendersSection.title}
            </h2>
            <p class="typography-body-md text-[var(--landing-text-secondary)]">
              {lendersSection.subtitle}
            </p>
          </div>
          <div class="gap-4 lg:gap-[3rem] px-[0.5rem] py-[2rem] md:p-[4rem]">
            <CategoryCard card={bankingCard} />
          </div>
        </div>

        <div class="mx-2 lg:mx-0 relative z-10">
          <div class="w-full bg-[var(--landing-bg)] text-[var(--landing-text)] border border-[var(--form-border)] divide-y-[1px] divide-[var(--form-border)] relative" id="secSection">

            <!-- Mobile: loan support heading -->
            <div class="px-6 flex lg:hidden flex-col gap-[2rem] py-[3rem] md:p-[2rem]">
              <div class="flex flex-col gap-4">
                <div class="flex gap-2">
                  <h2 class="typography-h2">
                    Not Just a Lead Portal Get <span class="underline decoration-4 underline-offset-4 decoration-btnBg">Complete DSA Toolkit</span> for Growth.
                  </h2>
                </div>
                <p class="typography-body-md text-[var(--landing-text-secondary)]">
                  From client assessment to bank login, DigitalDSA Pro equips you with the tools to close faster.
                </p>
              </div>

              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-4 w-full lg:justify-center items-center mx-auto sm:flex-row">
                  <div class="w-[85%] sm:w-auto">
                    <Button
                      btnName="Explore DSA Tools"
                      btnBorder="black"
                      btnColor="#ffcc00"
                      link="/get-started/how-can-we-help"
                    />
                  </div>
                  <div class="w-[85%] sm:w-auto">
                    <Button
                      btnName="Request a Demo"
                      btnBorder="black"
                      btnColor=""
                      link="/appointment"
                    />
                  </div>
                </div>
              </div>

              <div class="absolute top-0 h-2 left-0 w-full bg-underlineBg lg:hidden"></div>
            </div>

            <!-- Mobile: Statistics -->
            <div class="lg:hidden flex flex-col gap-[4rem] bg-[var(--landing-bg-alt)] text-[var(--landing-text)] border-y border-[var(--landing-glass-border)] py-[4rem] px-4">
              <div class="flex flex-col gap-2">
                <p class="typography-h2 underline decoration-2 underline-offset-[4px] decoration-btnBg">
                  Platform Statistics
                </p>
                <div class="flex flex-col sm:flex-row gap-4 items-start">
                  <div class="typography-body-sm text-[var(--landing-text-secondary)]">
                    <p>ISO 9001-2018 Certified.</p>
                  </div>
                  <div class="flex flex-col sm:flex-row gap-2">
                    <div>
                      <i class="fa-solid text-black fa-star"></i>
                      <i class="fa-solid text-black fa-star"></i>
                      <i class="fa-solid text-black fa-star"></i>
                      <i class="fa-solid text-black fa-star"></i>
                      <i class="fa-solid text-black fa-star-half-stroke"></i>
                    </div>
                    <p class="typography-body-md font-semibold text-[var(--landing-text)]">
                      4.9 <span class="typography-body-sm text-[var(--landing-text-muted)]">(18,767 agents)</span>
                    </p>
                  </div>
                </div>
              </div>
              <div><CounterBanner /></div>
            </div>

            <!-- Mobile: lenders heading -->
            <div class="text-center space-y-4 py-[2rem] px-6 lg:hidden">
              <h2 class="typography-h2 text-center">
                {lendersSection.title}
              </h2>
              <p class="typography-body-sm text-[var(--landing-text-secondary)]">{lendersSection.subtitle}</p>
            </div>

            <!-- Mobile: loan list accordion -->
            <div class="lg:hidden border-b border-[var(--landing-border)]">
              <div class="px-[2rem] md:hidden" id="mobLoans">
                {#each listItem as list, index}
                  <details
                    ontoggle={() => (mobileSubList = !mobileSubList)}
                    class="border-[var(--landing-border)] dropdown col-span-3 {index < listItem.length - 1 ? 'border-b' : ''} py-[1.5rem]"
                  >
                    <summary class="col-span-3 list-none" onclick={(e) => toggleDropdown(e, index)}>
                      <div class="w-full">
                        <div class="col-span-3 flex items-center justify-between gap-4 py-2">
                          <div class="justify-self-start">
                            <img src={list.icon} alt={list.altName} />
                          </div>
                          <div class="mx-auto flex w-full items-center justify-between gap-4">
                            <h2 class="typography-h3 text-[var(--landing-text)]">{list.title}</h2>
                            <div class="icon-container justify-self-end text-mobSubHead">
                              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </summary>

                    {#if mobileSubList}
                      <ul class="grid gap-[2rem] py-4" in:slide={{ duration: 600 }} out:slide={{ duration: 400 }}>
                        {#each list.subList as item, i}
                          <div class="flex cursor-pointer items-center justify-between {i === list.subList.length - 1 ? 'border-none pb-2' : 'border-b pb-4'} border-[var(--landing-border)] font-SubPara text-subParaFont hover:border-underlineBg">
                            <a href={item.link} class="text-linkColor">{item.name}</a>
                          </div>
                        {/each}
                      </ul>
                    {/if}
                  </details>
                {/each}
              </div>
            </div>

            <!-- Blog cards grid -->
            <div id="PageHit" class="grid py-[2rem] md:gap-[4rem] px-6 md:p-[2rem] lg:p-[4rem] md:grid-cols-2 lg:grid-cols-3 lg:gap-[3rem] divide-y md:divide-y-0 divide-[var(--landing-border)]">
              {#each blogList as blog}
                <div class="py-[4rem] md:py-0">
                  <BlogCard
                    icon={blog.coverImg}
                    altName={blog.altName}
                    title={blog.title}
                    paragraph={blog.paragraph}
                    linkName={blog.linkName}
                    url={blog.link}
                    sourceName={blog.sourceName}
                    originalSource={blog.originalSource}
                  />
                </div>
              {/each}
            </div>

            <!-- Financial hardship banner -->
            <ButtonBanner
              contents={{
                heading: financialDifficulty.heading,
                btnName: financialDifficulty.btnName,
                BtnBorder: financialDifficulty.btnBorder,
                btnColor: financialDifficulty.btnColor,
                btnLink: financialDifficulty.btnLink,
              }}
            />

            <!-- More from Digital DSA -->
            <div class="w-full px-6 md:p-[2rem] lg:p-[4rem] py-[6rem]">
              <div class="flex flex-col gap-[2rem]">
                <h2 class="typography-h2">
                  {moreFromDsa.title}
                </h2>
                <div class="grid gap-10 md:gap-[3rem] lg:grid-cols-3">
                  <VerticalBlog blogLists={moreFromDsa.blogs} />
                </div>
              </div>
            </div>

            <!-- Testimonials -->
            <div class="w-full px-6 md:p-[2rem] lg:p-[4rem] py-[6rem]">
              <div class="flex flex-col gap-[1rem] md:gap-[2rem]">
                <h2 class="typography-h2">
                  {happyClients.heading}
                </h2>
                <div><Testimonials /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Mobile: lenders marquee -->
  <div class="bg-[var(--landing-section-dark-bg)] text-[var(--landing-bg)] text-center pt-4 lg:hidden">
    <h2 class="typography-h2 text-center">
      We're backed by <span class="bg-btnBg p-1 text-black">{backedBy.count}<sup class="text-lg">+</sup></span> lenders
    </h2>
    <span class="text-center typography-body-sm text-[var(--landing-text-muted)]">
      {backedBy.disclaimer}
    </span>
    <div><MobileBanksCarousel /></div>
  </div>

  <!-- Help section (dark background) -->
  <div class="relative z-20 bg-[var(--landing-section-dark-bg)] text-[var(--landing-bg)] border-t border-[var(--landing-glass-border)]">
    <div class="mx-auto w-full xl:w-full 2xl:w-[87%]">
      <div class="divide-y divide-[var(--landing-border)] py-[3rem] px-6 md:p-[2rem] lg:p-[4rem]">
        <div class="flex flex-col gap-4">
          <h2 class="typography-h2 text-white mb-5">
            We're here to help
          </h2>
          <div class="grid w-full gap-2 divide-y divide-[var(--landing-border)] md:grid-cols-4 md:divide-x md:divide-y-0">
            <!-- Col 1: Support & FAQs -->
            <div class="md:col-span-2 hidden flex-col py-5 md:py-0 md:flex">
              {#each helpList.slice(0, 1) as help}
                <div class="flex items-center gap-4">
                  <img src={help.titleIcon} alt={help.titleAlt} class="h-4 md:h-[2rem]" />
                  <div class="flex items-center gap-4">
                    <h2 class="typography-h3 text-white">{help.title}</h2>
                    <span><i class="fa-solid fa-angle-down md:hidden"></i></span>
                  </div>
                </div>
                <ul class="space-y-4 gap-x-[2rem] pl-[2rem] pr-4 pt-4">
                  {#each (help.listItem ?? []) as item}
                    <a
                      href={item.link}
                      class="flex justify-between w-full cursor-pointer items-center border-b border-[var(--landing-border)] pb-4 typography-body-sm hover:border-underlineBg text-white"
                    >
                      {item.name}
                      <span><i class="fa-solid fa-angle-right"></i></span>
                    </a>
                  {/each}
                </ul>
              {/each}
            </div>

            <!-- Mobile support accordion -->
            <details
              ontoggle={() => (isVisible = !isVisible)}
              class="border-[var(--landing-border)] col-span-4 border-b py-3 md:hidden"
            >
              <summary class="col-span-3 list-none">
                <div class="w-full">
                  {#each helpList.slice(0, 1) as help}
                    <div class="col-span-3 flex items-center gap-4 justify-between py-2">
                      <div class="justify-self-start">
                        <img src={help.titleIcon} alt={help.titleAlt} />
                      </div>
                      <div class="pr-4 mx-auto flex w-full items-center justify-between gap-4">
                        <h2 class="typography-h3 text-[var(--landing-text)]">{help.title}</h2>
                        <div class="icon-container justify-self-end">
                          <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </summary>

              {#if isVisible}
                <ul class="grid sm:grid-cols-2 gap-y-4 gap-x-[2rem] p-4" in:slide={{ duration: 600 }} out:slide={{ duration: 600 }}>
                  {#each helpList as help}
                    {#if help.listItem}
                      {#each help.listItem as item}
                        <a
                          href={item.link}
                          class="flex cursor-pointer items-center text-white justify-between border-b border-[var(--landing-border)] pb-4 typography-body-sm hover:border-underlineBg"
                        >
                          {item.name}
                          <span><i class="fa-solid fa-angle-right"></i></span>
                        </a>
                      {/each}
                    {/if}
                  {/each}
                </ul>
              {/if}
            </details>

            <!-- Col 2: Contact & Partner links -->
            <div class="col-span-4 md:col-span-2 grid md:px-6 sm:divide-x md:divide-x-0 md:divide-y divide-y divide-[var(--landing-border)]">
              {#each helpList.slice(1, 3) as help}
                <div class="flex flex-col gap-4 py-5 md:py-0">
                  <div class="flex items-center gap-4">
                    <img src={help.titleIcon} alt={help.titleAlt} class="h-[3rem]" />
                    <div class="flex items-center gap-4 w-full justify-between md:justify-start">
                      <a
                        href={help.url}
                        class="typography-h3 decoration-btnBg underline-offset-8 hover:underline text-white"
                      >
                        {help.title}
                      </a>
                      <div><i class="fa-solid fa-angle-right"></i></div>
                    </div>
                  </div>
                  <div class="pl-[2.2rem] flex flex-col gap-2">
                    <p class="flex gap-2 typography-body-sm text-gray-300 items-center">
                      <img src="/icons/circle-check.svg" alt="circle-check" class="h-[1rem]" />Submit Your Inquiries with Ease
                    </p>
                    <p class="flex gap-2 typography-body-sm text-gray-300 items-center">
                      <img src="/icons/circle-check.svg" alt="circle-check" class="h-[1rem]" />Discover Collaboration Opportunities
                    </p>
                    <p class="flex gap-2 typography-body-sm text-gray-300 items-center">
                      <img src="/icons/circle-check.svg" alt="circle-check" class="h-[1rem]" />Access Dedicated Customer Support
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Things You Should Know -->
        <div class="grid items-start gap-4 py-[3rem] lg:mt-[4rem] lg:grid-cols-3 xl:gap-[10rem]">
          <h2 class="typography-h2 text-white w-max">
            Things You Should <br /> Know
          </h2>
          <div class="lg:col-span-2">
            <ul class="list-disc pl-6 typography-body-sm text-gray-300 space-y-2">
              {#each thingsYouShouldKnow as item, i}
                <li>
                  {#if i === 5}
                    Our <a href="/terms-conditions" class="underline hover:no-underline underline-offset-4 text-white">Terms and Conditions</a> for detailed information on eligibility, processing, and policies.
                  {:else}
                    {item}
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  details summary .icon-container .faq-icon {
    transition: transform 0.3s ease;
  }

  details[open] summary .icon-container .faq-icon {
    transform: rotate(180deg);
  }

  @keyframes pulseColor {
    0% { color: white; }
    50% { color: #ffcc00; }
    100% { color: white; }
  }

  .custom-pulse {
    animation: pulseColor 7s infinite;
  }

  @media (min-width: 1401px) and (max-width: 2560px) {
    #pageDesign { width: 1360px; }
    #image { height: calc(100% + 10%); }
  }
  @media (min-width: 2560px) and (max-width: 3860px) {
    #pageDesign { width: 2000px; }
  }
  @media (min-width: 3861px) {
    #pageDesign { width: 3000px; }
  }
  @media (min-width: 1024px) {
    #image { width: calc(100% + 180px); }
  }
  @media (min-width: 1024px) and (max-width: 1400px) {
    #pageDesign { width: 95%; }
  }
  @media (max-width: 1023px) {
    #image { height: calc(60%); }
  }
  @media (max-width: 640px) {
    #image { height: calc(50% + 180px); }
    #secSection { margin-top: 8rem; }
  }
  @media (max-width: 600px) { #secSection { margin-top: 7rem; } }
  @media (max-width: 570px) { #secSection { margin-top: 6rem; } }
  @media (max-width: 530px) { #secSection { margin-top: 5rem; } }
  @media (max-width: 520px) { #secSection { margin-top: 4rem; } }
  @media (max-width: 480px) { #secSection { margin-top: 3rem; } }
  @media (max-width: 460px) { #secSection { margin-top: 2rem; } }
  @media (max-width: 420px) { #secSection { margin-top: 0; } }
</style>
