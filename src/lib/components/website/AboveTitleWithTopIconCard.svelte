<script>
	let {
		contents = {},
		listGridAboveLg = "3"
	} = $props();


  // import { content } from "./Def.svelte";
 
  import TopIconCard from "./TopIconCard.svelte";
;

</script>

<!-- class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full {contents.borderBottom ? 'lg:border-b' : 'border-b-0'} border-[var(--form-border)]" -->
<section
  class="w-full last:border-b-0 border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
>
  <div class="flex flex-col gap-[2rem] w-full">
    <div class="flex flex-col gap-2">
      {#if contents.heading}
        <h2 class="typography-h2-md text-[var(--form-text)]">
          {@html contents.heading}
        </h2>
      {/if}
      {#if contents.subHeading}
        <h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
          {@html contents.subHeading}
        </h3>
      {/if}
    </div>
    {#if contents.cards}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4"
      >
        {#each contents.cards as card, index}
          <div
            class={index < contents.cards.length - 1
              ? "border-b border-[var(--form-border)] pb-[4rem] md:border-b-0 md:pb-0"
              : ""}
          >
            <TopIconCard cardData={card} />
          </div>
        {/each}
      </div>
    {/if}

    {#if contents.list}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-{listGridAboveLg} xl:grid-cols-{contents.xlGridCol} gap-4 "
      >
        {#each contents.list as listItem}
          <div
            class="flex flex-col gap-4 items-start mt-4 pr-4 my-[4rem] group text-[var(--form-text)]"
          >
            {#if listItem.icon}
              <img
                src={listItem.icon}
                alt={listItem.iconAltName || "icon"}
                class="h-10 transition-transform duration-300 group-hover:scale-125"
              />
            {/if}
            <div class="flex flex-col gap-4">
              {#if listItem.heading}
                <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                  {@html listItem.heading}
                </h2>
              {/if}
              {#if listItem.topPara}
                <p class="typography-body-md text-[var(--form-text-secondary)]">
                  {@html listItem.topPara}
                </p>
              {/if}
              {#if listItem.desc}
                <ul class="space-y-1 list-disc ml-5">
                  {#each listItem.desc as desc}
                    <li
                      class="typography-body-md text-[var(--form-text-secondary)]"
                    >
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
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
