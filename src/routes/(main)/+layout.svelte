<script>
  import Footer from "$lib/components/website/Footer.svelte";
  import ChatWrapper from "$lib/components/website/ChatWrapper.svelte";
  import Navbar from "$lib/components/website/Navbar.svelte";
  import "../../app.css";
  import "@fortawesome/fontawesome-free/css/all.min.css";
</script>

<section class="relative w-full">
  <Navbar />
  <div class="relative w-full mx-auto overflow-hidden bg-mainBg">
    <slot />
  </div>
  <Footer />
</section>
<div class="hidden md:block">
  <ChatWrapper />
</div>
