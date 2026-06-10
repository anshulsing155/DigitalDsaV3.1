<script lang="ts">
	interface Props {
		premiumBtnName?: string;
		premiumBtnLink?: string;
		onClick?: () => void;
	}

	let {
		premiumBtnName = "",
		premiumBtnLink = "",
		onClick = () => {}
	}: Props = $props();





 
</script>
<!-- px-[4rem] py-4 ml-4 overflow-hidden rounded-full bg-btnBg border -->
{#if premiumBtnName}
  <a class="text-black" href={`${premiumBtnLink}`}>
    <button
      type="button"
      onclick={onClick}
      class="relative w-full rounded-full bg-btnBg border px-[3rem] py-3 typography-body-md text-text-light hover:opacity-90 md:w-auto"
    >
      {premiumBtnName}
      <span
        class="absolute top-0 right-0 px-5 py-1 text-xs text-center uppercase whitespace-no-wrap origin-bottom-left transform rotate-45 -translate-y-full translate-x-1/3 bg-white"
      >
        Premium
      </span>
    </button>
  </a>
{/if}
