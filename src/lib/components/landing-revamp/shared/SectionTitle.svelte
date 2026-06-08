<script lang="ts">
	interface Props {
		title: string;
		subtitle?: string;
		align?: 'center' | 'left';
		/** Use on dark backgrounds — white title, yellow subtitle */
		light?: boolean;
		/** Use on yellow backgrounds — black title, dark gray subtitle */
		onYellow?: boolean;
	}

	let { title, subtitle, align = 'center', light = false, onYellow = false }: Props = $props();
</script>

<div class="{align === 'center' ? 'text-center' : 'text-left'} mb-12 md:mb-16">
	<h2
		class="section-title text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
		class:light
		class:on-yellow={onYellow}
	>
		{title}
	</h2>
	{#if subtitle}
		<p class="section-subtitle mt-4 text-lg md:text-xl" class:light class:on-yellow={onYellow}>
			{subtitle}
		</p>
	{/if}
</div>

<style>
	.section-title {
		color: var(--dark-text);
	}
	/* White title on dark/black backgrounds */
	.section-title.light {
		color: #ffffff;
	}
	/* Black title on yellow backgrounds */
	.section-title.on-yellow {
		color: #1a1a1a;
	}
	.section-subtitle {
		color: var(--landing-text-muted);
	}
	/* Yellow subtitle on dark backgrounds */
	.section-subtitle.light {
		color: #ffcc00;
	}
	/* Dark gray subtitle on yellow backgrounds */
	.section-subtitle.on-yellow {
		color: #333333;
	}
</style>
