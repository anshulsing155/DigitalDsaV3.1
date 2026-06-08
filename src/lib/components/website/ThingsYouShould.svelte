<script>
	let {
		thinkKnow = {},
		disc,
		isBorder = false,
		colSpan = 8
	} = $props();


  import Button from "./Button.svelte";
;
//for bulletin and numeric



  // Default to 'list-disc' if an invalid style is passed
</script>

<div
  class="grid px-[0.5rem] lg:px-0 gap-4 py-[2rem] lg:pt-[4rem] lg:pb-[8rem] grid-cols-12"
>
  {#if thinkKnow.heading}
    <div class="col-span-12 lg:col-span-4">
      <h2 class="font-ThirdHead text-sectionHeading">
        {@html thinkKnow.heading}
      </h2>
    </div>
  {/if}

  <ul
    class="{disc} grid gap-5 overflow-hidden font-SubPara text-subPara col-span-12 lg:col-span-8 md:col-span-{colSpan}"
  >
    {#if thinkKnow.subHeading}
      <h3 class="font-FifthHead text-subPara">
        {@html thinkKnow.subHeading}
      </h3>
    {/if}

    {#if thinkKnow.subPara}
      {#each thinkKnow.subPara as para}
        <p class="">{@html para}</p>
      {/each}
    {/if}

    {#if isBorder}
      <div class="border-[1px] border-borderColor"></div>
    {/if}
    {#if thinkKnow.paraGraph}
      <ul class="grid gap-3 {disc}">
        {#each thinkKnow.paraGraph as para}
          <li class=" ml-5">{@html para}</li>
        {/each}
      </ul>
    {/if}

    {#if thinkKnow.bottomHeading}
      <h3 class="font-ThirdHead text-miniSubHead">
        {thinkKnow.bottomHeading}
      </h3>
    {/if}

    {#if thinkKnow.bottomList}
      <div class="grid gap-3 list-disc">
        {#each thinkKnow.bottomList as para}
          <li class=" ml-5">{@html para}</li>
        {/each}
      </div>
    {/if}

    {#if thinkKnow.bottomPara}
      <div class="grid gap-3">
        {#each thinkKnow.bottomPara as para}
          <p class="">{@html para}</p>
        {/each}
      </div>
    {/if}
    <div>
      {#if thinkKnow.btnName}
        <Button
          btnName={thinkKnow.btnName}
          btnBorder={thinkKnow.btnBorder}
          btnColor={thinkKnow.btnColor}
          link={thinkKnow.btnLink}
        />
      {/if}
    </div>
    {#if thinkKnow.linkName}
      <a
        href={thinkKnow.url}
        class:text-linkColor={thinkKnow.url !== ""}
        class:text-deActiveLinkColor={thinkKnow.url == ""}
        class="text-linkColor hover:no-underline underline underline-offset-4 cursor-pointer"
        >{thinkKnow.linkName}</a
      >
    {/if}
    <slot name="list" />
  </ul>
</div>
