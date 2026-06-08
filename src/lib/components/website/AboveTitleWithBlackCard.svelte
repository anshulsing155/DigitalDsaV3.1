<script>
	let {
		contents = {},
		paddingX = 4,
		mobPaddingX = 1
	} = $props();


  import BlackCard from "./BlackCard.svelte";
;


</script>

<section
  class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[{paddingX}rem] w-full {contents.borderBottom
    ? 'border-b border-[var(--form-border)]'
    : ''}"
>
  <div class="flex flex-col gap-[3rem] w-full">
    <h2
      class="typography-h2-md text-black dark:text-white"
    >
      {@html contents.heading}
    </h2>

    {#if contents.cards}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-[2rem]"
      >
        {#each contents.cards as card, index}
          <div
            class={index < contents.cards.length - 1
              ? "border-b border-[var(--form-border)] md:border-b-0 pb-[4rem] md:pb-0 md:border-r"
              : ""}
          >
            <BlackCard cardData={card} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
