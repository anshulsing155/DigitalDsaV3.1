<script>
	let {
		subList = []
	} = $props();



</script>

<div
  class="{subList ? 'lg:flex grid' : 'hidden'} grid-cols-2 md:grid-cols-3 lg:justify-between place-items-center gap-[2rem] py-[3rem] bg-white md:p-[3rem] lg:gap-4"
>
  {#each subList as list}
    <a
      href={list.url}
      class="flex flex-col items-center justify-center border-dividerColor px-2 text-black group"
    >
      <img
        src={list.icon}
        alt={list.altName}
        class="h-10 transition-transform duration-300 group-hover:scale-110"
      />

      <p class="mt-2 text-center typography-body-md text-text-light {list.linkNameClass}">
        {list.linkName}
      </p>
    </a>
  {/each}
</div>
