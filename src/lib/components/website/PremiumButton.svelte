<script lang="ts">
	interface Props {
		premiumBtnName?: string;
		premiumBtnLink?: string;
		onClick?: () => void;
		premiumBtnClass?: string;
		btnBorder?: string;
		btnColor?: string;
	}

	let {
		premiumBtnName = '',
		premiumBtnLink = '',
		premiumBtnClass = '',
		btnBorder = '',
		btnColor = '',
		onClick = () => {}
	}: Props = $props();
</script>

<!-- px-[4rem] py-4 ml-4 overflow-hidden rounded-full bg-btnBg border -->
{#if premiumBtnName}
	<a class="text-black" href={`${premiumBtnLink}`}>
		<button
			type="button"
			onclick={onClick}
			style={`${btnColor ? `background-color: ${btnColor};` : ''}${btnBorder ? `border-color: ${btnBorder}; border-width: 1px; border-style: solid;` : ''}`}
			class={`typography-button relative w-full cursor-pointer rounded-full
				px-8 py-3 transition-all
				duration-300 hover:opacity-90 md:w-auto
				${premiumBtnClass}`}
		>
			{premiumBtnName}
			<span
				class="whitespace-no-wrap absolute top-0 right-0 origin-bottom-left translate-x-1/3 -translate-y-full rotate-45 transform bg-white text-black px-5 py-1 text-center typography-caption font-semibold uppercase"
			>
				Premium
			</span>
		</button>
	</a>
{/if}
