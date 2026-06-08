<script>
	let {
		steps = {}
	} = $props();


  import Button from "./Button.svelte";
;
</script>

<section class="pt-[4rem] pb-[8rem]">
  <div class="grid grid-cols-3 gap-[2rem]">
    <div
      class="col-span-3 font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:col-span-1 lg:text-minHeadFont"
    >
      {#if steps.heading}
        {steps.heading}
      {/if}

      {#if steps.paraGraph}
        <p class="mt-4 font-Paragraph text-subParaFont">{steps.paraGraph}</p>
      {/if}
    </div>
    <div class="col-span-3 grid grid-cols-2 gap-[4rem] lg:col-span-2">
      {#each steps.data as step}
        <div class="col-span-2 grid gap-[2rem] md:col-span-1">
          {#if step.icon}
            <img src={step.icon} alt={step.altTitle} class="h-10" />
          {/if}
          <div class="flex flex-col gap-4">
            <p class="font-ThirdHead text-minSubHead">{step.title}</p>
            
            <p class="font-Paragraph text-minParaFont">{@html step.desc}</p>
          </div>
          {#if step.btnText}
            <div>
              <Button
                btnName={step.btnText}
                btnBorder = {step.btnBorder}
                btnColor={step.btnColor}
                link= {step.btnLink}
                onClick={() => (window.location.href = step.btnLink)}
              />
            </div>
          {/if}

          {#if step.link}
            <a
              href={step.url}
              class:text-linkColor={step.url !== ""}
              class:text-deActiveLinkColor={step.url == ""}
              class="font-Paragraph text-subParaFont text-linkColor underline hover:no-underline"
              >{step.link}</a
            >
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>

