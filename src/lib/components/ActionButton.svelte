<script lang="ts">
	interface Props {
		btnName?: string;
		onClick?: () => void;
		disabled?: boolean;
	}

	let { btnName = '', onClick = () => {}, disabled = false }: Props = $props();
</script>

<button
	class="buttonText cursor-pointer rounded bg-black px-4 py-2 text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
	onclick={() => onClick?.()}
	{disabled}
>
	{btnName}
</button>
