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

<div class="flex flex-col gap-4 text-[var(--form-text)]">
  <!-- {#if title}
    <h2
      class="md:text-start typography-h2 text-[var(--form-text)]"
    >
      {title}
    </h2>
  {/if} -->
  <!-- {#each cardData as card} -->
  <div class="flex flex-col gap-4 py-[1.5rem] lg:py-[3rem]">
    <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">{cardData.heading}</h2>
    {#if cardData.para}
      <p class="typography-body-md text-[var(--form-text-secondary)]">{@html cardData.para}</p>
    {/if}
    {#if cardData.secPara}
      <p class="typography-body-md text-[var(--form-text-secondary)]">{@html cardData.secPara}</p>
    {/if}
    {#if cardData.list}
      <ul class="typography-body-md text-[var(--form-text-secondary)] list-disc ml-5 space-y-2">
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
        class="text-linkColor underline typography-body-md text-[var(--form-text-secondary)] hover:no-underline"
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
