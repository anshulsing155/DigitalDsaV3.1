<script>
	let {
		cardData = {
    heading: "",
    para: "",
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

<div class="flex gap-4 items-start mt-4 pr-4 text-black dark:text-white">
  <div class="flex flex-col gap-4">
    {#if cardData.heading}
      <h2 class="typography-body-lg !font-semibold text-black dark:text-white">{cardData.heading}</h2>
    {/if}
    {#if cardData.subHeading}
      <h2 class="typography-body-md text-[var(--form-text-secondary)]">{@html cardData.subHeading}</h2>
    {/if}
    {#if cardData.para}
      <p class="typography-body-md text-[var(--form-text-secondary)]">{@html cardData.para}</p>
    {/if}
    {#if cardData.linkName}
      <Anchor link={cardData.url} linkName={cardData.linkName} />
    {/if}
    {#if cardData.btnName}
      <Button
        btnName={cardData.btnName}
        link={cardData.btnLink}
        btnClass={cardData.btnClass}
        btnBorder={cardData.btnBorder}
      />
    {/if}

    {#if cardData.links}
      <div class="flex flex-col gap-2">
        {#each cardData.links as link}
          <ul class="grid list-disc pl-5 marker:text-black dark:marker:text-white">
            <li>
              <Anchor link={link.secUrl} linkName={link.secLinkName} />
            </li>
          </ul>
        {/each}
      </div>
    {/if}
  </div>
</div>
