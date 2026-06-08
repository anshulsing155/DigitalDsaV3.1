<script>
	let {
		cardData = {
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
    color:""
  }
	} = $props();



</script>

<a href={cardData.url}>
  <div
    class="h-[15rem] lg:h-[30rem] lg:max-h-[30rem] flex flex-col justify-center items-center gap-4 {cardData.color ? 'bg-darkColor/50' : 'bg-darkColor'} group"
  >
    {#if cardData.icon}
      <img
        src={cardData.icon}
        alt={cardData.iconAltName || "icon"}
        class="h-10 transition-transform duration-300 group-hover:scale-125"
      />
    {/if}
    <h2 class="text-center font-Paragraph text-subParaFont text-btnBg">
      {@html cardData.heading}
    </h2>
  </div>
</a>
<!-- font-ThirdHead text-minSubHead -->