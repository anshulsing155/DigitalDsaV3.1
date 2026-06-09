<script lang="ts">
	import { page } from '$app/state';

	const slugMappings: Record<string, string> = {
		dashboard: 'Dashboard',
		settings: 'Settings & Preferences',
		profile: 'User Profile',
		orders: 'My Orders',
		'order-details': 'Order Details'
	};

	function formatSegment(segment: string) {
		return (
			slugMappings[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
		);
	}

	const breadcrumbs = $derived.by(() => {
		const pathSegments = page.url.pathname.split('/').filter(Boolean);

		if (pathSegments.length <= 1) return [];

		return pathSegments.map((segment, index) => ({
			name: formatSegment(segment),
			path: '/' + pathSegments.slice(0, index + 1).join('/')
		}));
	});
</script>

{#if breadcrumbs.length > 0}
	<nav>
		<ul
			class="typography-caption flex items-center gap-2 text-[var(--form-text-secondary)] dark:text-white"
		>
			{#each breadcrumbs as crumb, i}
				<li class="flex items-center">
					{#if i > 0}
						<span class="mx-1">/</span>
					{/if}

					{#if i === breadcrumbs.length - 1}
						<span>
							{crumb.name}
						</span>
					{:else}
						<a
							href={crumb.path}
							class="font-semibold underline underline-offset-4 hover:no-underline"
						>
							{crumb.name}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
{/if}
