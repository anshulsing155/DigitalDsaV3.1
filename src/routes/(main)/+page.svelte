<script lang="ts">
	import Land from '$lib/components/sections/Land.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import content from '$lib/data/website/landing.json';
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section>
	<Land {content} />
</section>
