<script>
	let {
		contents = {},
		children = undefined
	} = $props();


  
  import CardWithoutIcon from "./CardWithoutIcon.svelte";

;
</script>

<section
  class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)] text-black dark:text-white"
>
  <div class="flex flex-col gap-[2rem] w-full">
    <div class="flex flex-col gap-2">
      {#if contents.heading}
        <h2
          class="typography-h2 text-black dark:text-white"
        >
          {@html contents.heading}
        </h2>
      {/if}
      {#if contents.para}
        <p class="typography-body-md text-[var(--form-text-secondary)]">{@html contents.para}</p>
      {/if}
    </div>

    {#if contents.cards}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4"
      >
        {#each contents.cards as card, index}
          <div
            class={index < contents.cards.length - 1
              ? "border-b md:border-b-0 pb-[4rem] md:pb-0 border-[var(--form-border)]"
              : ""}
          >
            <CardWithoutIcon cardData={card} />
          </div>
        {/each}
      </div>
    {/if}

    {#if contents.list}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4"
      >
        {#each contents.list as listItem}
          <div class="flex flex-col gap-4 items-start mt-4 pr-4 my-[4rem] group text-black dark:text-white">
            {#if listItem.heading}
              <h2 class="typography-body-lg !font-semibold text-black dark:text-white">
                {@html listItem.heading}
              </h2>
            {/if}
            {#if listItem.topPara}
              <p class="typography-body-md text-[var(--form-text-secondary)]">
                {@html listItem.topPara}
              </p>
            {/if}
            {#if listItem.desc}
              <ul class="space-y-2 list-disc ml-5">
                {#each listItem.desc as desc}
                  <li class="typography-body-md text-[var(--form-text-secondary)]">
                    {@html desc}
                  </li>
                {/each}
              </ul>
            {/if}
            {#if listItem.para}
              <p class="typography-body-md text-[var(--form-text-secondary)]">
                {@html listItem.para}
              </p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    {@render children?.()}
  </div>
</section>
