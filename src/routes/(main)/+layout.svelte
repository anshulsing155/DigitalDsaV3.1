<script>
  import Footer from '$lib/components/layout/Footer.svelte';
  import ChatWrapper from '$lib/components/modals/ChatWrapper.svelte';
  import Navbar from '$lib/components/layout/Navbar.svelte';
  import "../../app.css";
  import "@fortawesome/fontawesome-free/css/all.min.css";
</script>

<section class="relative w-full">
  <Navbar />
  <div class="relative w-full mx-auto overflow-hidden bg-[var(--landing-bg)]">
    <slot />
  </div>
  <Footer />
</section>
<div class="hidden md:block">
  <ChatWrapper />
</div>
