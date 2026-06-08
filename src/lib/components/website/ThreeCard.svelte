<script>
	let {
		title = "",
		cardData = {
    heading: "",
    para: "",
    secPara: "",
    iconAltName: "",
    link: "",
    btnName: "",
    btnLink: "",
    linkName: "",
    btnColor: "",
    btnBorder: "",
    list: [],
  }
	} = $props();


  import Button from "./Button.svelte";
  //
;
</script>

<div class="flex flex-col gap-4">
  <!-- {#if title}
    <h2
      class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
    >
      {title}
    </h2>
  {/if} -->
  <!-- {#each cardData as card} -->
  <div class="flex flex-col gap-4 py-[1.5rem] lg:py-[3rem]">
    <h2 class="font-ThirdHead text-minSubHead">{cardData.heading}</h2>
    {#if cardData.para}
      <p class="font-Paragraph text-minParaFont">{@html cardData.para}</p>
    {/if}
    {#if cardData.secPara}
      <p class="font-Paragraph text-minParaFont">{@html cardData.secPara}</p>
    {/if}
    {#if cardData.list}
      <ul class="font-Paragraph text-subParaFont list-disc ml-5 space-y-2">
        {#each cardData.list as item}
          <li>{@html item}</li>
        {/each}
      </ul>
    {/if}
    {#if cardData.linkName}
      <a
        href={cardData.link}
        class:text-linkColor={cardData.link !== ""}
        class:text-deActiveLinkColor={cardData.link == ""}
        class="text-linkColor underline font-Paragraph text-subParaFont hover:no-underline"
      >
        {cardData.linkName}
      </a>
    {/if}
    <div>
      {#if cardData.btnName}
        <Button
          btnName={cardData.btnName}
          link={cardData.btnLink}
          btnColor={cardData.btnColor}
          btnBorder={cardData.btnBorder}
        />
      {/if}
    </div>
  </div>

  <!-- {/each} -->
</div>
