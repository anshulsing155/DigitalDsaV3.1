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
	const dsaName = $derived(($page.data as any).user?.name || 'DSA');
</script>

{#if adminActingAs}
	<AdminImpersonationBanner adminName={adminActingAs.name} targetName={dsaName} targetRole="dsa" />
{/if}

<!--
  DsaQuotaIndicator (sidebar / chip / banner) is mounted in the SHARED
  parent dashboard layout (src/routes/dashboard/+layout.svelte) so the
  sidebar block + top-bar chip + mobile banner all share one mounting
  surface. quotaState is loaded in dashboard/dsa/+layout.server.ts and
  inherited via $page.data — the parent layout reads it conditionally
  on role === 'dsa', so admin/RM dashboards stay clean.
-->

{@render children()}

<WalkthroughDriver {serverWalkthroughState} {isDemo} role="dsa" />
<IntroGuideHint />
