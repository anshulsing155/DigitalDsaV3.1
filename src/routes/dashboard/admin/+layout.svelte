<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import WalkthroughDriver from '$lib/components/walkthrough/WalkthroughDriver.svelte';
	import IntroGuideHint from '$lib/components/walkthrough/IntroGuideHint.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const serverWalkthroughState = $derived(($page.data as any).walkthroughState);
	const isDemo = $derived(($page.data as any).isDemo === true);
</script>

{@render children()}

<WalkthroughDriver {serverWalkthroughState} {isDemo} role="admin" />
<IntroGuideHint />
