<script>
  import content from "$lib/data/website/footer.json";

  const { footerList, ownershipText, copyrightPrefix, copyrightSuffix } = content;

  function goToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let currentYear = new Date().getFullYear();
</script>

<section class="relative z-20 w-full border-t border-dividerColor bg-[var(--landing-bg)]">
  <div class="relative">
    <div
      class="relative mx-auto flex w-full flex-col gap-4 lg:w-11/12 xl:w-10/12 2xl:w-[89.5%]"
    >
      <nav
        class="grid grid-cols-1 gap-[2rem] md:gap-[4rem] pt-[4rem] px-2 sm:grid-cols-2 lg:grid-cols-4 lg:px-[4rem]"
      >
        {#each footerList as section}
          {#each Object.entries(section) as [title, items]}
            <div>
              <h3 class="mb-4 font-semibold typography-body-md lg:typography-body-md text-black dark:text-white">{title}</h3>
              <ul>
                {#each items as item}
                    <a
                    href={item.link}
                    target={item.link.includes("http") ? "_blank" : "_self"}
                    class="text-black dark:text-white mb-2 typography-body-sm text-text-light md:typography-body-md underline-offset-4 hover:underline flex gap-2 items-center"
                    >{#if item.icon}
                      <img
                        src={item.icon}
                        alt={item.altIcon}
                        class="h-[1.5rem]"
                      />
                    {/if}
                    {item.list}</a
                  >
                {/each}
              </ul>
            </div>
          {/each}
        {/each}
      </nav>
      <div class="h-[1px] w-full bg-dividerColor"></div>

      <div
        class="flex flex-col gap-2 py-4 text-center justify-center items-center px-[1rem] typography-body-sm lg:px-[4rem] text-[var(--form-text-secondary)]"
      >
        <p>
          {ownershipText}
        </p>
        <p>
          {copyrightPrefix}{currentYear}{copyrightSuffix}
        </p>
      </div>

      <button
        onclick={goToTop}
        type="button"
        aria-label="Go to Top"
        class="absolute -top-[2.5rem] right-2 flex h-[4rem] w-[4rem] cursor-pointer items-center justify-center btn-primary hover:opacity-90"
      >
        <i class="fa-solid fa-angle-up"></i>
      </button>
    </div>
  </div>
</section>

