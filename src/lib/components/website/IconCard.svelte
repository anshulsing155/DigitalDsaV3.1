<script>
	let {
		cardData = {
    heading: "",
    para: "",
    icon: "",
    iconAltName: "",
    link: "",
    btnName: "",
    btnColor: "",
    btnBorder: "",
  }
	} = $props();


  import Button from "./Button.svelte";


</script>

  
<div class="flex gap-6 items-start py-[4rem] text-black dark:text-white">
  {#if cardData.icon}
    <img
      src={cardData.icon}
      alt={cardData.iconAltName || "icon"}
      class="h-8"
    />
  {/if}
 

  <div class="flex flex-col gap-4">
    <h2 class="typography-body-lg !font-semibold text-black dark:text-white">{cardData.heading}</h2>
    <p class="typography-body-md text-[var(--form-text-secondary)]">{@html cardData.para}</p>
    {#if cardData.link}
      <a href={cardData.link} class="text-linkColor underline font-Paragraph text-subParaFont">
        {cardData.btnName}
      </a>
    {/if}
    {#if cardData.btnColor}
      <Button
        btnName={cardData.btnName}
        link={cardData.link}
        btnColor={cardData.btnColor}
        btnBorder={cardData.btnBorder}
      />
    {/if}
  </div>
</div>
