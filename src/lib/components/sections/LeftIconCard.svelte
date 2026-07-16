<script>
  import Anchor from '../ui/Anchor.svelte';
  import Button from '../ui/Button.svelte';

  export let cardData = {
    heading: "",
    para: "",
    icon: "",
    iconAltName: "",
    linkName: "",
    url: "",
    btnLink: "",
    btnName: "",
    btnColor: "",
    btnBorder: "",
  };
</script>

<div class="flex gap-4 items-start mt-4 pr-4">
  {#if cardData.icon}
    <img src={cardData.icon} alt={cardData.iconAltName || "icon"} class="h-8" />
  {/if}

  <div class="flex flex-col gap-4">
    {#if cardData.heading}
      <h2 class="font-FourthHead text-cardHeading">{@html cardData.heading}</h2>
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
