<script lang="ts">
	import Footer from '$lib/components/website/Footer.svelte';
	import ChatWrapper from '$lib/components/website/ChatWrapper.svelte';
	import Navbar from '$lib/components/website/Navbar.svelte';
	import CookieConsent from '$lib/components/website/CookieConsent.svelte';
	import '../app.css';
	import '@fortawesome/fontawesome-free/css/all.min.css';

	let { children } = $props();
</script>

<section class="relative w-full">
	<Navbar />
	<div class="relative mx-auto w-full overflow-hidden bg-mainBg">
		{@render children()}
	</div>
	<Footer />
</section>
<div class="hidden md:block">
	<ChatWrapper />
</div>
<CookieConsent />
