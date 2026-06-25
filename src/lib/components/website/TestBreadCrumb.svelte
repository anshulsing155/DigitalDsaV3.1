<script>
	import { page } from '$app/stores'; // ✅ Correct import
	import { derived } from 'svelte/store';

	// Custom mapping for slug names
	const slugMappings = {
		dashboard: 'Dashboard',
		settings: 'Settings & Preferences',
		profile: 'User Profile',
		orders: 'My Orders',
		'order-details': 'Order Details',
		secureRetirement: 'Secure Retirement',
		fixDeposit: 'Fixed Deposit',
		govSchemes: 'Government Schemes',
		lowRisk: 'Low Risk',
		pension: 'Pension',
		fd: 'FD',
		'fd-laddering': 'FD Laddering',
		'fd-ladering': 'FD Laddering',
		'fix-income': 'Fixed Income',
		nps: 'NPS',
		pomis: 'POMIS',
		'rbi-floating': 'RBI Floating Bonds',
		scss: 'SCSS',
		'index-funds': 'Index Funds',
		stocks: 'Stocks & REITs',
		swp: 'SWP',
		'annuity-plans': 'Annuity Plans',
		'immediate-annuities': 'Immediate Annuities'
	};

	// Function to format segment names
	function formatSegment(segment) {
		return (
			slugMappings[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
		);
	}

	// Compute breadcrumbs dynamically from pathname
	const breadcrumbs = derived(page, ($page) => {
		const pathSegments = $page.url.pathname.split('/').filter(Boolean);

		// If there's only one segment, hide breadcrumbs
		if (pathSegments.length <= 1) return [];

		// Non-linkable routing folder categories that do not have pages
		const nonLinkableSegments = new Set(['fixDeposit', 'govSchemes', 'lowRisk', 'pension']);

		return pathSegments.map((segment, index) => {
			const path = '/' + pathSegments.slice(0, index + 1).join('/');
			const isLast = index === pathSegments.length - 1;
			const isLinkable = !isLast && !nonLinkableSegments.has(segment);

			return {
				name: formatSegment(segment),
				path,
				isLinkable
			};
		});
	});
</script>

{#if $breadcrumbs.length > 0}
	<nav class="breadcrumb">
		<ul class="typography-body-sm flex items-center gap-2 text-[var(--form-text-secondary)]">
			{#each $breadcrumbs as crumb, i}
				<li class="flex items-center">
					{#if i > 0}
						<span class="mx-1">/</span>
					{/if}
					{#if i === $breadcrumbs.length - 1}
						<!-- Last breadcrumb (active page) -->
						<span class="text-primary font-semibold">{crumb.name}</span>
					{:else}
						<!-- Previous breadcrumbs -->
						{#if crumb.isLinkable}
							<a href={crumb.path} class="hover:underline transition-colors">
								{crumb.name}
							</a>
						{:else}
							<span>{crumb.name}</span>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
{/if}


