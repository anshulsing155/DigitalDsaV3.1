<script>
	let {
		guide = {}
	} = $props();


  import Button from "./Button.svelte";
;
</script>

<section
  class="grid gap-4 md:gap-[2rem] border-b border-[var(--form-border)] lg:grid-cols-7 lg:gap-4 pt-[4rem] pb-[4rem] lg:pb-[8rem] text-black dark:text-white"
>
  <div
    class="grid typography-h3 font-semibold md:text-start md:typography-h2-md lg:col-span-3 lg:typography-h2"
  >
    {@html guide.heading}
  </div>
  <div class="grid gap-[2rem] lg:col-span-4">
    {#if guide.number}
      <p
        class="typography-h3 font-semibold md:typography-h2 lg:col-span-3 lg:text-mobHeadFont"
      >
        {@html guide.number}
      </p>
    {/if}

    {#if guide.para}
      <p class="typography-body-sm text-text-light">
        {@html guide.para}
      </p>
    {/if}

    {#if guide.list}
      <ul class="grid gap-4">
        {#each guide.list as item}
          <li class="typography-body-sm text-text-light">{@html item}</li>
        {/each}
      </ul>
    {/if}

    <div>
      {#if guide.btnName}
        <Button
          btnName={guide.btnName}
          btnBorder={guide.btnBorder}
          btnColor={guide.btnColor}
          link={guide.btnLink}
        />
      {:else if guide.linkText}
        <a
          href={guide.linkUrl}
          class="text-linkColor underline underline-offset-4 hover:no-underline"
          >{guide.linkText}</a
        >
      {/if}
    </div>
  </div>
</section>
