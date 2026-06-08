<script>
	let {
		cardData = {
    heading: "",
    subHeading:"",
    para: "",
    icon: "",
    iconAltName: "",
    linkName: "",
    url: "",
    btnLink: "",
    btnName: "",
    btnColor: "",
    btnBorder: "",
  }
	} = $props();


  import Anchor from "./Anchor.svelte";
  import Button from "./Button.svelte";


</script>

<div class="flex flex-col gap-4 items-start mt-4 pr-4 my-[4rem] group">
  {#if cardData.icon}
    <img
      src={cardData.icon}
      alt={cardData.iconAltName || "icon"}
      class="h-10 transition-transform duration-300 group-hover:scale-125"
    />
  {/if}

  <div class="flex flex-col gap-4">
    {#if cardData.heading}
      <h2 class="font-FourthHead text-cardHeading">{cardData.heading}</h2>
    {/if}
    {#if cardData.subHeading}
      <h2 class="font-SubPara text-subPara">{cardData.subHeading}</h2>
    {/if}
    {#if cardData.para}
      <p class="font-SubPara text-subPara">{@html cardData.para}</p>
    {/if}
    {#if cardData.linkName}
      <Anchor link={cardData.url} linkName={cardData.linkName} />
    {/if}
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
