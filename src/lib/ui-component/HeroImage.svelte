<script lang="ts">
	import Tooltip from './Tooltip.svelte';

	export let coverImage: string;
	export let coverAlt: string;
	export let sourceName: string;
	export let originalSource: string;
</script>

<div
	id="image"
	class="absolute top-0 z-0 w-full overflow-hidden lg:-right-20 lg:w-[calc(50%+12.5rem)]"
>
	<div class="bg-opacity-50 absolute top-0 right-0 text-center text-white">
		<Tooltip
			linkName={`image source: <span class="underline">${sourceName}</span>`}
			hoverLink={originalSource}
		/>
	</div>

	<img
		src={coverImage}
		alt={coverAlt}
		class="h-full w-full object-cover object-top"
		loading="lazy"
	/>
</div>

<style>
	@media (min-width: 1401px) and (max-width: 2560px) {
		#image {
			height: calc(100% + 10%);
		}
	}

	@media (min-width: 2560px) and (max-width: 3860px) {
		#image {
			height: calc(100% + 10%);
		}
	}

	@media (min-width: 3861px) {
		#image {
			height: calc(100% + 10%);
		}
	}

	@media (min-width: 1024px) {
		#image {
			height: calc(100% + 180px);
		}
	}

	@media (max-width: 1023px) {
		#image {
			height: 60%;
		}
	}

	@media (max-width: 640px) {
		#image {
			height: 250px;
		}
	}
</style>
