<script>
	let {
		navList = {},
		activeSection = ""
	} = $props();


  import { onMount } from "svelte";
  import Button from "./Button.svelte";

;
// Currently active section

  let isFixed = false; // Tracks if the navbar is fixed
  let originalOffsetTop = 0; // Stores the navbar's original position

  const handleScroll = () => {
    const scrollPosition = window.scrollY; // Get the current scroll position
    if (scrollPosition >= originalOffsetTop) {
isFixed = true; // Fix the navbar when it touches the top
    } else {
isFixed = false; // Restore the navbar to its original position
    }
  };
  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (target) {
const yOffset = -80; // Offset of 80px from the top
const y = target.getBoundingClientRect().top + window.scrollY + yOffset;
window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }
  onMount(() => {
    const navbar = document.getElementById("navbar");
    // console.log(navbar, "navbar");
    if (navbar) {
const navbarRect = navbar.getBoundingClientRect(); // Get the bounding rectangle of the navbar
originalOffsetTop = navbarRect.top + window.scrollY; // Calculate the actual position relative to the document
window.addEventListener("scroll", handleScroll);

return () => {
window.removeEventListener("scroll", handleScroll); // Cleanup listener
};
    }
  });
</script>


<div>
<nav
  id="navbar"
  class={`${
    isFixed ? "fixedNavbar  shadow-xl " : " "
  }  bg-[var(--landing-bg)] mx-auto text-center font-FourthHead text-subParaFont lg:px-[.5rem] xl:px-[2rem]  border-b border-[var(--form-border)] transition-all duration-300 `}
>
  <!-- flex justify-between items-center w-full -->
  {#if navList.items && navList.items.length > 0}
    <div class="flex justify-between w-full mx-auto">
      <div class="flex">
        {#each navList.items as nav}
          <div class="flex flex-col">
            <a
              href={`#${nav.targetId}`}
              onclick={(e) => { e.preventDefault(); (() => scrollToSection(nav.targetId))(e); }}
              class="mx-4 py-8 font-FourthHead text-subParaFontfont-FourthHead text-subParaFont text-black dark:text-white flex items-center gap-2"
              >{@html nav.name}</a
            >
            {#if activeSection === nav.targetId}
              <div
                class={`${
                  activeSection === nav.targetId
                    ? "h-1 w-full bg-btnBg section"
                    : ""
                } `}
              ></div>
            {/if}
          </div>
        {/each}
      </div>

      {#if navList.actionBtns}
        <div
          class="gap-[2rem] items-center
        {navList.items.length > 6 ? 'hidden  xl:flex' : 'flex lg:flex'}"
        >
          {#each navList.actionBtns as btn}
            <Button
              btnName={btn.btnName}
              link={btn.btnLink}
              onClick={btn.btnClick}
              btnColor={btn.btnColor}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  
</nav>




<div
    class={`${
      isFixed
        ? "py-8 bg-[var(--landing-bg)] mx-auto text-center font-FourthHead text-subParaFont lg:px-[.5rem] xl:px-[2rem]  border-b border-[var(--form-border)] "
        : " "
    } `}
  >
</div>
</div>

<style>
  .fixedNavbar {
    position: fixed;
    top: 0;
    z-index: 20;
    width: 95%;
  }

  @media (min-width: 1401px) {
    .fixedNavbar  {
      width: 1360px;
    }
  }
   
  @media (min-width: 2560px) and (max-width: 3860px) {
    .fixedNavbar {
      width: 2000px;
    }
  }
  @media (min-width: 3861px) {
    .fixedNavbar {
      width: 3000px;
    }
  }

  @media (min-width: 1024px) and (max-width: 1400px) {
    .fixedNavbar {
      width: 95%; /* Shrinks to 90% of its original size */
    }
  }
</style>
