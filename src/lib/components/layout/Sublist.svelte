<script>
	let {
		subList = []
	} = $props();



</script>

<div
  class="{subList ? 'lg:flex grid' : 'hidden'} grid-cols-2 md:grid-cols-3 lg:justify-between place-items-center gap-[2rem] py-[3rem] border-b border-[var(--form-border)] bg-[var(--landing-bg)] md:p-[3rem] lg:gap-4"
>
  {#each subList as list}
    <a
      href={list.url}
      class="flex flex-col items-center justify-center border-[var(--form-border)] px-2 group"
    >
      <img
        src={list.icon}
        alt={list.altName}
        class="h-10 transition-transform duration-300 group-hover:scale-110"
      />

      <p class="mt-2 text-center text-[var(--form-text)] typography-body-md {list.linkNameClass}">
        {list.linkName}
      </p>
    </a>
  {/each}
</div>
