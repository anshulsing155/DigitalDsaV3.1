<!-- src/lib/components/website/FeatureCardCover.svelte -->
<script lang="ts">
  let { icon, title, link } = $props<{
    icon: any;
    title: string;
    link: string;
  }>();
</script>

<a
  href={link}
  class="bg-[var(--landing-bg-card)] text-[var(--form-text)] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex justify-center flex-col items-center gap-2 p-2 min-h-[6rem]"
>
  <div class="w-10 h-10 flex items-center justify-center">
    <svelte:component this={icon} class="w-6 h-6 text-[var(--form-text)]" />
  </div>
  <h3 class="font-Paragraph text-leastPara text-center">{title}</h3>
</a>
