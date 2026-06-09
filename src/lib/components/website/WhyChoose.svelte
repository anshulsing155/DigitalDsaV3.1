<script>
	let {
		facilities = {},
		gridCol = 3
	} = $props();


  import Button from "./Button.svelte";

;

</script>

<section class="grid py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] gap-[2rem] text-black dark:text-white">
  <div class="space-y-5">
    {#if facilities.heading}
      <h2
        class="typography-h2-md text-black dark:text-white md:col-span-2"
      >
        {@html facilities.heading}
      </h2>
    {/if}
    {#if facilities.subHeading}
      <p class="typography-body-lg !font-semibold text-[var(--form-text-secondary)]">
        {@html facilities.subHeading}
      </p>
    {/if}
  </div>
  <div
    class="grid gap-4 md:grid-cols-2 lg:grid-cols-{gridCol}"
  >
    {#each facilities.items as facility, index}
      <div class="col-span-1 flex flex-col gap-4 items-start mt-4 pr-4 my-[4rem] group">
        {#if facility.icon}
          <div>
            <img class="h-10 transition-transform duration-300 group-hover:scale-125" src={facility.icon} alt={facility.altName} />
          </div>
        {/if}
        {#if facility.title}
          <p class="typography-body-lg !font-semibold text-black dark:text-white">{facility.title}</p>
        {/if}
        {#if facility.desc}
          <p class="typography-body-md text-[var(--form-text-secondary)]">{@html facility.desc}</p>
        {/if}

        {#if facility.linkText}
          <a
            class:text-linkColor={facility.link !== ""}
            class:text-dangerColor={facility.link == ""}
            class="font-Paragraph text-subParaFont underline underline-offset-4 hover:no-underline text-linkColor"
            href={facility.link}>{facility.linkText}</a
          >
        {/if}

        {#if facility.subitems}
          <ul class="list-disc pl-5 grid gap-2">
            {#each facility.subitems as item}
              {#if item.linkName}
                <li>
                  <a
                    href={item.url}
                    class:text-linkColor={item.url !== ""}
                    class:text-dangerColor={item.url == ""}
                    class="font-Paragraph text-subParaFont underline underline-offset-4 hover:no-underline text-linkColor"
                    >{item.linkName}</a
                  >
                </li>
              {:else}
                <li class="typography-body-sm text-[var(--form-text-secondary)]">
                  {@html item.points}
                </li>
              {/if}
            {/each}
          </ul>
        {/if}

        {#if facility.subTick}
          {#each facility.subTick as item}
            <ul class=" space-y-4">
              <li class="flex items-start gap-2">
                <svg
                  class="w-5 h-5 text-black flex-shrink-0 dark:text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{item.points}</span>
              </li>
            </ul>
          {/each}
        {/if}
        {#if facility.btnName}
          <Button
            btnBorder={facility.btnBorder}
            btnName={facility.btnName}
            btnColor={facility.btnColor}
            link={facility.link}
          />
        {/if}
      </div>
      {#if index < facilities.items.length - 1}
        <div class="w-full h-[1px] bg-[var(--form-border)] md:hidden"></div>
      {/if}
    {/each}
  </div>
</section>
