<script lang="ts">
	interface Props {
		btnName?: string;
		onclick?: () => void;
	}

	let { btnName = 'Submit', onclick = () => {} }: Props = $props();
</script>

<button class="rounded-md bg-[#006FFD] py-2 text-white" onclick={() => onclick()}>{btnName}</button>
