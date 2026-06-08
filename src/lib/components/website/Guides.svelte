<script>
	let {
		guide = {}
	} = $props();


  import Button from "./Button.svelte";
;
</script>

<section
  class="grid gap-4 md:gap-[2rem] border-b border-borderColor  lg:grid-cols-7 lg:gap-4 pt-[4rem] pb-[4rem] lg:pb-[8rem]"
>
  <div
    class="grid font-ThirdHead text-mobSubHead md:text-start md:text-miniHeadFont lg:col-span-3 lg:text-minHeadFont"
  >
    {@html guide.heading}
  </div>
  <div class="grid gap-[2rem] lg:col-span-4">
    {#if guide.number}
      <p
        class="font-ThirdHead text-mobSubHead md:text-minHeadFont lg:col-span-3 lg:text-mobHeadFont"
      >
        {@html guide.number}
      </p>
    {/if}

    {#if guide.para}
      <p class="font-Paragraph text-minParaFont">
        {@html guide.para}
      </p>
    {/if}

    {#if guide.list}
      <ul class="grid gap-4">
        {#each guide.list as item}
          <li class="font-Paragraph text-minParaFont">{@html item}</li>
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
          class="text-linkColor underline underline-offset-4 hover:no-underline "
          >{guide.linkText}</a
        >
      {/if}
    </div>
  </div>
</section>
