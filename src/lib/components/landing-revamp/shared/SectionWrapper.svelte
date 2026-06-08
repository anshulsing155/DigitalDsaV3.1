<script lang="ts">
	interface Props {
		id?: string;
		background?: 'default' | 'alt' | 'dark' | 'card' | 'yellow';
		padding?: 'normal' | 'large' | 'none';
		children: import('svelte').Snippet;
	}

	let { id, background = 'default', padding = 'normal', children }: Props = $props();

	const paddingClasses: Record<string, string> = {
		normal: 'py-16 md:py-24',
		large: 'py-20 md:py-32',
		none: ''
	};
</script>

<section {id} class="{paddingClasses[padding]} section-bg-{background}">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		{@render children()}
	</div>
</section>

<style>
	.section-bg-default {
		background-color: var(--landing-bg);
	}
	.section-bg-alt {
		background-color: var(--landing-bg-alt);
	}
	.section-bg-dark {
		background-color: var(--landing-section-dark-bg);
		color: #f0f0f0;
	}
	.section-bg-card {
		background-color: var(--landing-bg-card);
	}
	/* Yellow section — yellow bg with black text */
	.section-bg-yellow {
		background-color: var(--landing-bg-yellow);
		color: #1a1a1a;
	}
</style>
