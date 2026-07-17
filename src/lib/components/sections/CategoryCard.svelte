<!-- src/lib/components/website/CategoryCard.svelte -->
<script lang="ts">
  let { card = [] } = $props<{
    card: {
      icon: string;
      altName?: string;
      heading: string;
      subItems: { label: string; href: string }[];
    }[];
  }>();
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-12">
  {#each card as items}
    <div class="w-full">
      <div class="flex items-start gap-4">
        <!-- Icon on the left -->
        <img 
          src={items.icon} 
          alt={items.altName ?? 'icon'} 
          class="w-10 h-10 object-contain shrink-0" 
        />
        
        <!-- Header, arrow and items list -->
        <div class="flex-1">
          <div class="flex justify-between items-center pb-1">
            <p class="font-primary font-semibold text-[var(--landing-text)] text-[1.05rem] leading-tight">
              {items.heading}
            </p>
            <i class="fa-solid fa-angle-right text-[var(--landing-text-muted)] text-xs mr-2 transition-transform duration-250"></i>
          </div>
          
          <ul class="mt-2 space-y-1.5">
            {#each items.subItems as item}
              <li>
                <a 
                  href={item.href} 
                  class="font-primary font-normal text-linkColor hover:underline text-sm block"
                >
                  {item.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  {/each}
</div>
