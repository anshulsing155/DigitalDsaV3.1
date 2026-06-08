<script>
	let {
		contents = {}
	} = $props();


  import LeftIconCard from "./LeftIconCard.svelte";

;
</script>

<section
  class="py-[4rem] px-[0.5rem] lg:px-0 w-full {contents.borderBottom
    ? 'border-b'
    : 'border-b-0'} border-borderColor"
>
  <div class="flex flex-col gap-4 w-full">
    <h2
      class="font-ThirdHead text-sectionHeading"
    >
      {@html contents.heading}
    </h2>

    {#if contents.cards}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4"
      >
        {#each contents.cards as card, index}
          <a href={card.url} class="text-black">
            <div
              class={index < contents.cards.length - 1
                ? "border-b md:border-b-0 pb-[4rem] md:pb-0 md:border-r"
                : ""}
            >
              <LeftIconCard cardData={card} />
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</section>
