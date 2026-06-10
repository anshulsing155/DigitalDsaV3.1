<script>
	let {
		colSpan = 1,
		colSpanDesc = 2,
		gridColDesc = 2,
		journey = {}
	} = $props();


  import Button from "./Button.svelte";
  import PremiumButton from "./PremiumButton.svelte";



;
</script>

<section class="border-b border-borderColor py-[4rem]">
  <div class="grid lg:grid-cols-3 gap-[2rem]">
    <div
      class="col-span-3 lg:col-span-{colSpan} typography-h2 text-text-main"
    >
      {journey.heading}
    </div>
    <div class="col-span-{colSpanDesc} grid grid-cols-{gridColDesc} gap-[2rem]">
      {#each journey.items as step, index}
        <div class="col-span-2 grid gap-[2rem] pb-[3rem] md:pb-0 md:col-span-1 {index < journey.items.length - 1 ? 'border-b md:border-b-0 md:border-r' : ''}">
          <div class="flex flex-col gap-4">
            <p class="typography-h3 font-semibold text-text-main">{step.title}</p>
            <p class="typography-body-md text-text-light">{@html step.desc}</p>
          </div>

          {#if step.btnName}
            <Button
              btnName={step.btnName}
              btnBorder={step.btnBorder}
              btnColor={step.btnColor}
              link={step.btnLink}
            />
          {/if}

          {#if step.premiumBtnName}
            <PremiumButton
              premiumBtnName={step.premiumBtnName}
              premiumBtnLink={step.premiumBtnLink}
            />
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>
