<script>
	let {
		contents = {}
	} = $props();


  import LeftIconCard from "./LeftIconCard.svelte";

;
</script>

<section
  class="py-[4rem] px-[0.5rem] lg:px-0 w-full {contents.borderBottom
    ? 'border-b border-[var(--form-border)]'
    : ''}"
>
  <div class="flex flex-col gap-4 w-full">
    <h2
      class="typography-h2-md text-black dark:text-white"
    >
      {@html contents.heading}
    </h2>

    {#if contents.cards}
      <div
        class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4"
      >
        {#each contents.cards as card, index}
          <a href={card.url} class="group">
            <div
              class={index < contents.cards.length - 1
                ? "border-b border-[var(--form-border)] md:border-b-0 pb-[4rem] md:pb-0 md:border-r"
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
