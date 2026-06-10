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
      class="col-span-3 typography-h2 text-black dark:text-white lg:col-span-1"
    >
      {#if steps.heading}
        {steps.heading}
      {/if}

      {#if steps.paraGraph}
        <p class="mt-4 typography-body-md text-[var(--form-text-secondary)]">{steps.paraGraph}</p>
      {/if}
    </div>
    <div class="col-span-3 grid grid-cols-2 gap-[4rem] lg:col-span-2">
      {#each steps.data as step}
        <div class="col-span-2 grid gap-[2rem] md:col-span-1">
          {#if step.icon}
            <img src={step.icon} alt={step.altTitle} class="h-10" />
          {/if}
          <div class="flex flex-col gap-4">
            <p class="typography-body-lg !font-semibold text-black dark:text-white">{step.title}</p>
            
            <p class="typography-body-md text-[var(--form-text-secondary)]">{@html step.desc}</p>
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
              class="typography-body-md text-text-light text-linkColor underline hover:no-underline"
              >{step.link}</a
            >
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>

