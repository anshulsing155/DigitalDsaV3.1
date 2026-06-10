<script>
	let {
		contents = [],
		supportHeading = "",
		gridCol = 3,
		children = undefined
	} = $props();


  import Button from "./Button.svelte";




</script>

<section class="flex flex-col gap-[2rem] lg:pt-[4rem] lg:pb-[8rem] text-black dark:text-white">
  {#if supportHeading}
    <p
      class="typography-h2 text-black dark:text-white"
    >
      {supportHeading}
    </p>
  {/if}

  <div class="grid md:grid-cols-2 md:gap-[2rem] lg:grid-cols-{gridCol}">
    {#each contents as content}
      <div
        class="col-span-1 flex flex-col gap-[1rem] border-b md:border-b-0 py-[1rem]"
      >
        {#if content.title}
          <p class="typography-body-lg !font-semibold text-black dark:text-white md:w-3/4">{content.title}</p>
        {/if}

        {#if content.lists}
          <ul class="typography-body-md text-[var(--form-text-secondary)] flex flex-col gap-4">
            {#each content.lists as list}
              <li>{@html list.name}</li>
            {/each}
          </ul>
        {/if}

        {#if content.links}
          <ul class="grid list-disc gap-2 pl-5 marker:text-black dark:marker:text-white">
            {#each content.links as link}
              <li
                class="typography-body-md text-[var(--form-text-secondary)]"
                class:text-linkColor={link.url !== ""}
                class:text-deActiveLinkColor={!link.url}
              >
                <a
                  href={link.url}
                  class="underline underline-offset-4 hover:no-underline"
                  >{link.name}</a
                >
              </li>
            {/each}
          </ul>
        {/if}
        <div>
          {@render children?.()}
        </div>
        {#if content.btn}
          <Button
            btnBorder="black"
            btnName={content.btn}
            link={content.btnLink}
          />
        {/if}
      </div>
    {/each}
  </div>
</section>
