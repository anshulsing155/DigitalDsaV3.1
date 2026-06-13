<script lang="ts">
	interface Props {
		contents?: {
    heading?: string;
    para?: string;
    accordions?: { question: string; answer: string }[];
  };
	}

	let {
		contents = {}
	}: Props = $props();



</script>

<div
  class="grid lg:grid-cols-12 gap-[2rem] lg:gap-[4rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] lg:border-b lg:border-[var(--form-border)] text-[var(--form-text)]"
>
  <!-- Left Column (Heading & Description) -->
  <div class="lg:col-span-4 flex flex-col gap-4">
    {#if contents.heading}
      <p
        class="typography-h2-md text-[var(--form-text)]"
      >
        {@html contents.heading}
      </p>
    {/if}

    {#if contents.para}
      <p class="typography-body-md text-[var(--form-text-secondary)]">
        {@html contents.para}
      </p>
    {/if}
  </div>

  <!-- Right Column (Accordions - Multiple Q&A) -->
  {#if contents.accordions && contents.accordions.length > 0}
    <div class="lg:col-span-8 flex flex-col gap-[1.5rem]">
      {#each contents.accordions as accordion, index}
        <details
          class="border-b border-[var(--form-border)] py-[1rem]"
          open={index === 0}
        >
          <summary
            class="flex items-center justify-between gap-4 cursor-pointer"
          >
            <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
              {accordion.question}
            </h2>
            <div class="icon-container">
              <i
                class="fa-solid fa-angle-down transition-transform duration-300"
              ></i>
            </div>
          </summary>
          <div class="grid gap-4 pt-[1rem] typography-body-md text-[var(--form-text-secondary)]">
            <p>{@html accordion.answer}</p>
          </div>
        </details>
      {/each}
    </div>
  {/if}
</div>

<style>
  details summary {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .icon-container {
    display: flex;
    align-items: center;
  }

  details[open] .icon-container i {
    transform: rotate(180deg);
  }
</style>
