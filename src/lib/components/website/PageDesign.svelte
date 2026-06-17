<script>
  import Breadcrumb from "./Breadcrumb.svelte";
  import { onMount } from "svelte";
  import Button from "./Button.svelte";

  import TestBreadCrumb from "./TestBreadCrumb.svelte";
  import Tooltip from "./Tooltip.svelte";
  import HeroImage from './HeroImage.svelte';

	let {
		subList = [],
		pageData = {},
		actionBtns = [],
		onClick = () => {}
	} = $props();

  let isBelow1024 = $state(false);

  function updateSize() {
    isBelow1024 = window.innerWidth < 1024;
  }

  onMount(() => {
    updateSize(); // Set initial value
    window.addEventListener("resize", updateSize);

    return () => {
window.removeEventListener("resize", updateSize); // Cleanup
    };
  });

  // Make it reactive
  $effect(() => {
		if (typeof window !== "undefined") {
    isBelow1024 = window.innerWidth < 1024;
  		}
	});
</script>

<!--xl:w-9/12  -->
<section class="mx-auto w-full bg-[var(--landing-bg)]">
  <div id="pageDesign" class="relative mx-auto h-full">
    <div class="relative z-20 pt-[15rem] sm:pt-[23rem] lg:pt-0 w-full h-full">
      <div class="hidden lg:flex pl-[4rem] py-4">
        <!-- <Breadcrumb />  -->
        <TestBreadCrumb />
      </div>

      <!-- image  -->
      <HeroImage
				coverImage={pageData.coverImage}
				coverAlt={pageData.coverAlt}
				sourceName={pageData.sourceName}
				originalSource={pageData.originalSource}
			/>
      <div class="mx-1 lg:mx-0 h-auto relative">
        <div
          id="sideCard"
          class="relative border border-[var(--landing-glass-border)] bg-[var(--landing-bg)] px-[.5rem] py-[3rem] lg:p-[3rem] 2xl:p-[4rem] w-full lg:w-[50%] h-auto"
        >
          <div class="flex flex-col gap-4 sm:gap-[2rem]">
            <h1
              class="typography-h1 text-(--form-text) dark:text-white"
            >
              {@html pageData.heroHeading}
            </h1>
            {#if pageData.subHeading}
              <p class="typography-body-md text-(--form-text-secondary)">
                {@html pageData.subHeading}
              </p>
            {/if}
            {#if pageData.heroParagraph}
              <p class="typography-body-md text-[var(--landing-text-secondary)]">
                {@html pageData.heroParagraph}
              </p>
            {/if}
            {#if pageData.heroList && pageData.heroList.length > 0}
              <ul class="flex flex-col gap-4">
                {#each pageData.heroList as item}
                  <li class="grid gap-4 typography-body-md text-[var(--form-text-secondary)]">
                    {#if typeof item.text === "object"}
                      {#if item.text.subText}
                        <span>{@html item.text.subText}</span>
                      {/if}

                      <ul class="ml-4 grid list-disc gap-2">
                        {#each item.text.points as subItem}
                          {#if subItem.tick}
                            <li class="flex gap-2 items-center">
                              <span
                                ><img
                                  src="/icons/circle-check.svg"
                                  alt="check icon"
                                  class="h-4"
                                /></span
                              >{@html subItem.list}
                            </li>
                          {:else}
                            <li>{subItem.list}</li>
                          {/if}
                        {/each}
                      </ul>
                    {:else}
                      {@html item.text}
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
            <!-- button for below 1024px screen -->
            {#if isBelow1024}
              <div class="flex gap-[1rem] flex-col md:flex-row">
                {#if actionBtns?.length}
                  {#each actionBtns as btn}
                    <Button
                      btnName={btn.btnName}
                      btnColor={btn.btnColor}
                      link={btn.btnLink}
                    />
                  {/each}
                {/if}
              </div>
            {/if}
            {#if pageData.actionBtn}
              <div
                class="flex flex-col gap-4 typography-body-sm text-[var(--form-text-secondary)] sm:flex-row md:typography-body-md"
              >
                {#each pageData.actionBtn as actionBtn}
                  <a href={actionBtn.link} class="text-black">
                    <button
                      type="button"
                      onclick={onClick}
                      class="w-full rounded-full border px-[2rem] py-3 md:w-auto {actionBtn.animation ? 'animate-scaleLoop' : ''}"
                      style={`background-color: ${actionBtn.btnColor}; border-color: #4F4C4D;`}
                    >
                      {actionBtn.firstBtn}
                    </button>
                  </a>
                {/each}
              </div>
            {/if}
            {#if pageData.linkName}
              <a
                href={pageData.url}
                class="text-linkColor no-underline hover:underline underline-offset-4"
                >{pageData.linkName}</a
              >
            {/if}
          </div>
          <div
            class="absolute left-0 top-0 h-2 w-full -translate-y-1/2 transform bg-primary sm:h-3 lg:top-1/2 lg:h-[13rem] lg:w-4"
          ></div>
        </div>

        {#if subList.length > 0}
          <div
            class="{subList ? 'lg:flex grid' : 'hidden'} grid-cols-2 md:grid-cols-3 lg:justify-between place-items-center gap-[3rem] border border-[var(--landing-border)] bg-[var(--landing-bg-card)] p-[3rem] lg:gap-4"
          >
            {#each subList as item, index}
              <a
                href={item.url}
                class="flex flex-col items-center justify-center border-dividerColor px-2 text-[var(--form-text)]"
              >
                <img src={item.icon} alt={item.altName} class="h-8" />

                <p class="mt-2 text-center typography-body-sm text-[var(--landing-text-secondary)]">
                  {item.name}
                </p>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    <div class="relative flex flex-col border border-[var(--form-border)] bg-[var(--landing-bg)]  z-20 mx-1 lg:mx-0">
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
    #image {
      height: calc(100% + 10%);
    }
  }
  @media (min-width: 2560px) and (max-width: 3860px) {
    #pageDesign {
      width: 2000px;
    }
    #image {
      height: calc(100% + 10%);
    }
    #sideCard {
      min-height: 25rem;
    }
  }
  @media (min-width: 3861px) {
    #pageDesign {
      width: 3000px;
    }
    #image {
      height: calc(100% + 10%);
    }
    #sideCard {
      min-height: 40rem;
    }
  }
  @media (min-width: 1024px) {
    #image {
      height: calc(100% + 180px);
    }
  }

  @media (min-width: 1024px) and (max-width: 1400px) {
    #pageDesign {
      width: 95%; /* Shrinks to 90% of its original size */
    }
  }

  @media (max-width: 1024px) {
    #image {
      height: calc(70%);
    }
  }

  @media (max-width: 640px) {
    #image {
      height: 50%;
    }
  }
</style>
