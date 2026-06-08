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
  class="grid lg:grid-cols-12 gap-[2rem] lg:gap-[4rem]  py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] lg:border-b lg:border-borderColor"
>
  <!-- Left Column (Heading & Description) -->
  <div class="lg:col-span-4 flex flex-col gap-4">
    {#if contents.heading}
      <p
        class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
      >
        {@html contents.heading}
      </p>
    {/if}

    {#if contents.para}
      <p class="font-para text-subParaFont">
        {@html contents.para}
      </p>
    {/if}
  </div>

  <!-- Right Column (Accordions - Multiple Q&A) -->
  {#if contents.accordions.length > 0}
    <div class="lg:col-span-8 flex flex-col gap-[1.5rem]">
      {#each contents.accordions as accordion, index}
        <details
          class="border-b border-borderColor py-[1rem]"
          open={index === 0}
        >
          <summary
            class="flex items-center justify-between gap-4 cursor-pointer"
          >
            <h2 class="text-subParaFont font-ThirdHead">
              {accordion.question}
            </h2>
            <div class="icon-container">
              <i
                class="fa-solid fa-angle-down transition-transform duration-300"
              ></i>
            </div>
          </summary>
          <div class="grid gap-4 pt-[1rem] font-Paragraph text-subParaFont">
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
