<script>
	let {
		subList = [],
		navLists = [],
		pageData = {},
		onClick = () => {}
	} = $props();



  //
;
;
</script>

<!--  -->
<section class="mx-auto w-full">
  <div id="pageDesign" class="relative mx-1 lg:mx-auto">
    <div class="relative z-20 lg:mx-0">
      <div class="relative w-full bg-[var(--landing-bg)] text-[var(--form-text)] px-[2rem] py-[3rem] lg:p-[4rem]">
        <div class="flex flex-col gap-4 sm:gap-[2rem] lg:w-2/3">
          <h1
            class="typography-h3 font-semibold typography-h2 sm:text-mobHeadFont lg:text-headFont"
          >
            {pageData.heroHeading}
          </h1>
          {#if pageData.heroParagraph}
            <p class="typography-body-sm md:typography-body-md">
              {@html pageData.heroParagraph}
            </p>
          {/if}
        </div>
        <div
          class="absolute left-0 top-1/2 h-1/2 w-2 -translate-y-1/2 transform bg-primary"
        ></div>
      </div>
    </div>
    <div class="relative flex flex-col bg-[var(--landing-bg)]">
      <!-- svelte-ignore slot_element_deprecated -->
      <slot />
    </div>

    <div class="lg:p-[4rem]">
      <!-- svelte-ignore slot_element_deprecated -->
      <slot name="secondary" />
    </div>
  </div>
</section>

<style>
  @media (min-width: 1401px) and (max-width: 2560px) {
    #pageDesign {
      width: 1360px;
    }
  }
  @media (min-width: 2560px) and (max-width: 3860px) {
    #pageDesign {
      width: 2000px;
    }
  }
  @media (min-width: 3861px) {
    #pageDesign {
      width: 3000px;
    }
  }

  @media (min-width: 1024px) and (max-width: 1400px) {
    #pageDesign {
      width: 95%; /* Shrinks to 90% of its original size */
    }
  }
</style>
