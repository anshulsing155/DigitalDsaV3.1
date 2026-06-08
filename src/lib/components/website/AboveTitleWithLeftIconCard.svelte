<script>
	let {
		borderBottom = false,
		contents = {}
	} = $props();


  import LeftIconCard from "./LeftIconCard.svelte";
  //
;
</script>

<section
  class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full {contents.borderBottom
    ? 'lg:border-b'
    : 'border-b-0'} border-borderColor"
>
  <div class="flex flex-col gap-[2rem] w-full">
    <h2
      class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
    >
      {@html contents.heading}
    </h2>

    {#if contents.cards}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4 *:"
      >
        {#each contents.cards as card, index}
          <div
            class={index < contents.cards.length - 1
              ? "border-b md:border-b-0 pb-[4rem] md:pb-0"
              : ""}
          >
            <LeftIconCard cardData={card} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
