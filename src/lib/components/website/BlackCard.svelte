<script>
  let { cardData = {
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
    color: ""
  } } = $props();
</script>

<a href={cardData.url}>
  <div
    class="h-[15rem] lg:h-[30rem] lg:max-h-[30rem] flex flex-col justify-center items-center gap-6 group transition-all duration-300 {cardData.color ? 'bg-[#222222]/80' : 'bg-[#222222]'}"
  >
    {#if cardData.icon}
      <img
        src={cardData.icon}
        alt={cardData.iconAltName || 'icon'}
        class="h-12 transition-transform duration-300 group-hover:scale-125"
      />
    {/if}

    <h2
      class="text-center typography-h3 text-primary text-wrap"
    >
      {@html cardData.heading}
    </h2>
  </div>
</a>