<script lang="ts">
	import CookieConsent from '$lib/components/modals/CookieConsent.svelte';
	import '../app.css';
	import '@fortawesome/fontawesome-free/css/all.min.css';

	let { children } = $props();
</script>

{@render children()}
<CookieConsent />

