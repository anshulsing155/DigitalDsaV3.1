<script lang="ts">
  import { MessageCircle } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  let isHovered = false;

  function handleClick() {
    dispatch("openChat");
  }
</script>

<div class="fixed bottom-6 right-6 z-50">
  <button
    class="group relative flex items-center gap-3 bg-black text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 ease-in-out transform hover:scale-105 border border-white/20 backdrop-blur-sm chat-glow"
    onclick={handleClick}
    onmouseenter={() => (isHovered = true)}
    onmouseleave={() => (isHovered = false)}
  >
    <!-- Icon with animation -->
    <div
      class="relative transition-transform duration-300 ease-in-out transform"
      class:rotate-[12deg]={isHovered}
      class:scale-110={isHovered}
    >
      <MessageCircle color="#ffcc00" class="w-6 h-6" />
      <div class="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75"></div>
    </div>

    <!-- Sliding text -->
    <span
      class="typography-body-md font-semibold whitespace-nowrap transform transition-all duration-300 ease-in-out"
      class:opacity-100={isHovered}
      class:translate-x-0={isHovered}
      class:opacity-0={!isHovered}
      class:translate-x-2={!isHovered}
      class:w-0={!isHovered}
      class:overflow-hidden={!isHovered}
    >
      Chat with us
    </span>

    <!-- Notification dot -->
    <div
      class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse opacity-90"
    ></div>

    <!-- Floating particle -->
    <div
      class="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full animate-bounce opacity-60"
    ></div>
  </button>

  <!-- Tooltip -->
  <div
    class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black/80 backdrop-blur-sm text-white rounded-lg border border-white/20 whitespace-nowrap transform transition-all duration-300 ease-in-out typography-caption"
    class:opacity-100={isHovered}
    class:translate-y-0={isHovered}
    class:opacity-0={!isHovered}
    class:translate-y-2={!isHovered}
    class:pointer-events-none={!isHovered}
  >
    Need help? Chat with us!
    <div
      class="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"
    ></div>
  </div>
</div>

<style>
  .chat-glow::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: linear-gradient(to right, #10b981, #3b82f6);
    filter: blur(16px);
    opacity: 0.5;
    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
    z-index: -1;
  }

  .chat-glow:hover::before {
    opacity: 0.75;
    transform: scale(1.05);
  }
</style>
