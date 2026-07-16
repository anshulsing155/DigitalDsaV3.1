<script lang="ts">
	import { ROUTES } from '$lib/config/routes.js';

	interface Props {
		topBar?: boolean;
	}

	let { topBar = $bindable(true) }: Props = $props();
</script>

{#if topBar}
	<div
		class="relative isolate flex items-center gap-x-6 overflow-hidden px-6 py-2.5 sm:px-3.5 sm:before:flex-1"
		style="background: color-mix(in srgb, var(--landing-accent) 15%, var(--landing-bg));"
	>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<p class="text-sm leading-6" style="color: var(--landing-text);">
				<span class="inline-flex items-center gap-1.5">
					<span class="relative flex h-2 w-2">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
							style="background: var(--landing-accent);"
						></span>
						<span
							class="relative inline-flex h-2 w-2 rounded-full"
							style="background: var(--landing-accent);"
						></span>
					</span>
					<strong class="font-semibold">NEW ON THE PLATFORM</strong>
				</span>
				<svg viewBox="0 0 2 2" aria-hidden="true" class="mx-2 inline size-0.5 fill-current"
					><circle r="1" cx="1" cy="1" /></svg
				>
				52 lenders. 15 loan types. Real-time policy matching now live for all DSAs.
			</p>
			<a
				href="/contact"
				class="flex-none rounded-full px-3.5 py-1 text-sm font-semibold shadow-sm transition duration-150"
				style="background: var(--landing-accent); color: #1a1a1a;"
			>
				Explore Free <span aria-hidden="true">&rarr;</span>
			</a>
		</div>

		<div class="flex flex-1 justify-end">
			<button
				type="button"
				class="-m-3 cursor-pointer p-3 focus-visible:-outline-offset-4"
				onclick={() => (topBar = false)}
			>
				<span class="sr-only">Dismiss</span>
				<svg
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
					class="size-5"
					style="color: var(--landing-text-secondary);"
				>
					<path
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
					/>
				</svg>
			</button>
		</div>
	</div>
{/if}
