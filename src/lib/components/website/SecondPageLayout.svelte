<script>
	let {
		pageData = {}
	} = $props();


  import { page } from "$app/state";
  import TestBreadCrumb from "./TestBreadCrumb.svelte";
  import Tooltip from "./Tooltip.svelte";

;

  let shouldShowBreadcrumbs = $derived((() => {
    const pathSegments = page.url.pathname.split("/").filter(Boolean);
    return pathSegments.length > 1; // Show breadcrumbs only if there's more than one segment
  })());</script>

<section class="w-full bg-[var(--landing-bg)] text-black dark:text-white">
  <div id="parentDiv" class="mx-1 lg:mx-auto relative">
    {#if shouldShowBreadcrumbs}
      <div class="hidden lg:flex pl-[4rem] py-4">
        <TestBreadCrumb />
      </div>
    {/if}
    <!-- Image -->
    <div class="relative mx-auto">
      <img
        src={pageData.coverImage}
        alt={pageData.coverAlt}
        class="w-full h-[30svh] md:h-[50svh] lg:h-[70svh] object-cover object-top border-b-[1.5rem] border-btnBg"
      />
      <div class="absolute top-0 right-0 bg-opacity-50 text-white text-center">
        <Tooltip
          linkName={`image source: <span class="underline">${pageData.sourceName}</span>`}
          hoverLink={pageData.originalSource}
        />
      </div>
    </div>

    <div
      id="pageDesign"
      class="w-full relative -top-[3rem] md:-top-[5rem] lg:-top-[13rem] lg:px-0 mx-auto"
    >
      <div
        class="bg-[var(--landing-bg)] text-black dark:text-white lg:w-[80%] mx-auto border border-[var(--landing-glass-border)] border-b p-6 sm:p-8 text-center flex justify-center items-center relative z-40"
      >
        <div class="flex flex-col gap-4">
          <h1
            class="typography-h1 text-black dark:text-white"
          >
            {pageData.heading}
          </h1>
          {#if pageData.para}
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              {@html pageData.para}
            </p>
          {/if}
        </div>
      </div>
      <div class="bg-[var(--landing-bg)] text-black dark:text-white h-full right-0 mx-auto">
        <!-- svelte-ignore slot_element_deprecated -->
        <slot />
      </div>
    </div>

    <div
      class="lg:p-[4rem] relative -top-[3rem] md:-top-[5rem] lg:-top-[13rem]"
    >
      <!-- svelte-ignore slot_element_deprecated -->
      <slot name="secondary" />
    </div>
  </div>
</section>

<style>
  @media (min-width: 1024px) and (max-width: 1456px) {
    #pageDesign {
      width: 95%; /* Shrinks to 90% of its original size */
    }
  }
  @media (min-width: 1456px) and (max-width: 2560px) {
    #pageDesign {
      width: 1360px;
      
    }
    #parentDiv {
      width: 1450px;
    }
  }
  @media (min-width: 2560px) and (max-width: 3860px) {
    #pageDesign {
      width: 2000px;
    }
    #parentDiv {
      width: 2200px;
    }
  }
  @media (min-width: 3861px) {
    #pageDesign {
      width: 3000px;
    }
  }
</style>
