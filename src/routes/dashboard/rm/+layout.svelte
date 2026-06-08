<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import WalkthroughDriver from '$lib/components/walkthrough/WalkthroughDriver.svelte';
	import IntroGuideHint from '$lib/components/walkthrough/IntroGuideHint.svelte';
	import AdminImpersonationBanner from '$lib/components/AdminImpersonationBanner.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const serverWalkthroughState = $derived(($page.data as any).walkthroughState);
	const isDemo = $derived(($page.data as any).isDemo === true);
	const adminActingAs = $derived(($page.data as any).adminActingAs as { id: string; name: string } | null);
	const rmName = $derived(($page.data as any).user?.name || 'RM');
</script>

{#if adminActingAs}
	<AdminImpersonationBanner adminName={adminActingAs.name} targetName={rmName} targetRole="rm" />
{/if}

{@render children()}

<WalkthroughDriver {serverWalkthroughState} {isDemo} role="rm" />
<IntroGuideHint />
