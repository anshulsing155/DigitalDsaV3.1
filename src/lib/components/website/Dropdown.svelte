<script>
	let {
		heading = "",
		children = undefined
	} = $props();



</script>

<div>
  <details class="border-y border-borderColor py-[1.5rem] cursor-pointer">
    <summary class="list-none">
      <div class="flex items-center justify-between gap-4">
        <h2 class="typography-body-md typography-h3 font-semibold">{heading}</h2>
        <div class="icon-container typography-h3">
          <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
        </div>
      </div>
    </summary>
    <div class="grid gap-4 pt-[2rem] typography-body-md text-text-light">
      {@render children?.()}
    </div>
  </details>
</div>

<style>
  details summary .icon-container .faq-icon {
    transition: transform 0.3s ease;
  }

  details[open] summary .icon-container .faq-icon {
    transform: rotate(180deg);
  }
</style>
