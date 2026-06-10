<script>
	let {
		homeLoanCalculator = {},
		gridCol
	} = $props();


  import { goto } from "$app/navigation";
  import Button from "./Button.svelte";



</script>

<section
  class="flex flex-col gap-4 border-b border-borderColor py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] xl:gap-[2rem]"
>
  <div class="flex flex-col gap-10">
    <h2
      class="typography-h2 text-text-main"
    >
      {homeLoanCalculator.heading}
    </h2>
    {#if homeLoanCalculator.subHeading}
      <p class="typography-body-sm text-text-light">
        {@html homeLoanCalculator.subHeading}
      </p>
    {/if}
  </div>
  <div
    class="flex flex-col gap-[1rem] bg-white sm:grid sm:grid-cols-2 md:gap-[1rem] lg:grid-cols-{gridCol}"
  >
    <!-- justify-between -->
    {#each homeLoanCalculator.data as item, index}
      <div class="flex flex-col gap-4 items-start pb-[3rem] md:pb-0 w-11/12 {index < homeLoanCalculator.data.length - 1 ? 'border-b md:border-b-0' : ''}">
        <div class="space-y-5">
          <h3 class="typography-h3 font-semibold text-miniSubHead">{@html item.Heading}</h3>
          {#if item.paragraph}
            <p class="typography-body-sm text-text-light">
              {@html item.paragraph}
            </p>
          {/if}
          {#if item.paragraphAfterChange}
            <p class="typography-body-sm text-text-light">
              {@html item.paragraphAfterChange}
            </p>
          {/if}
        </div>

        {#if item.btnBorder}
          <div class="w-full">
            <button
              class="w-full rounded-full border px-[3rem] py-3 typography-body-md text-text-light hover:opacity-90 md:w-auto"
              style={`border-color: ${item.btnBorder};`}
            >
              <a href={item.url}>{item.btnText}</a>
            </button>
          </div>
        {:else if item.btnText}
          <a
            href={item.url}
            class:text-linkColor={item.url !== ""}
            class:text-dangerColor={!item.url}
            class="typography-body-md text-text-light underline underline-offset-4 hover:no-underline"
            >{item.btnText}</a
          >
        {:else if item.btnChangeAfter}
          <span
            class="typography-body-md text-text-light text-underline underline-black underline-offset-4"
            >{item.btnChangeAfter}</span
          >
        {:else if item.btn}
          <Button
            btnName={item.btn}
            btnBorder={item.border}
            link={item.btnLink}
          />
        {/if}

        {#if item.list}
          <div class="flex flex-col justify-start gap-2">
            {#each item.list as list}
              <li class="typography-body-sm text-text-light">
                <a
                  class="text-linkColor underline underline-offset-4 hover:no-underline"
                  href={list.link}>{@html list.btnText}</a
                >
              </li>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</section>
