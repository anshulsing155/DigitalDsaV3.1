<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let originalOffsetTop = 0;
  let isFixed = false;

  const topHandleScroll = () => {
    const scrollPosition = window.scrollY; // Get the current scroll position
    if (scrollPosition >= originalOffsetTop) {
      isFixed = true; // Fix the navbar when it touches the top
    } else {
      isFixed = false; // Restore the navbar to its original position
    }
  };

  onMount(() => {
    const calcNav = document.getElementById("stickyNav");

    const mobNav = document.getElementById("calculator");
    if (calcNav) {
      const navbarRect = calcNav.getBoundingClientRect();

      originalOffsetTop = navbarRect.top + window.scrollY;

      window.addEventListener("scroll", topHandleScroll);
    }
    return () => {
      window.removeEventListener("scroll", topHandleScroll);
    };
  });
  const Calculators = [
    {
      id: 1,
      calc: "Part-Payment Planner",
      link: "/planners/part-payment-planner",
    },
    {
      id: 2,
      calc: "Flexible EMI Planner",
      link: "/planners/flexible-emi-planner",
    },
    {
      id: 3,
      calc: "Both (Part-Payments & EMI Planners)",
      link: "/planners/both",
    },
     {
      id: 4,
      calc: "Budget Planner",
      link: "/planners/budget-planner",
    },
  ];

  // Store the active button's ID
  export let activeId;

  // Function to handle navigation and update active state
  const navigateTo = (id, link) => {
    activeId = id; // Set clicked button as active
    goto(link);
  };
</script>

<div
  id="stickyNav"
  class="{isFixed
    ? 'fixed top-0  shadow-md bg-white pb-2 z-50'
    : ''}  hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
>
  {#each Calculators as calculator}
    <button
      class={`col-span-1 grid items-center justify-center p-1 lg:p-[1rem] transition-colors
                ${activeId === calculator.id ? "bg-black text-white" : "border border-darkColor"}`}
      on:click={() => navigateTo(calculator.id, calculator.link)}
      aria-label={`Navigate to ${calculator.calc}`}
    >
      <p class="font-FourthHead text-minParaFont md:text-subParaFont">
        {calculator.calc}
      </p>
    </button>
  {/each}
</div>
<div
  class={`${
    isFixed
      ? "py-10 xl:py-8  w-full  text-center font-FourthHead text-subParaFont    "
      : " "
  }  `}
></div>

<style>
  @media (min-width: 1401px) and (max-width: 2560px) {
    #stickyNav {
      width: 1360px;
    }
  }
  @media (min-width: 2560px) and (max-width: 3860px) {
    #stickyNav {
      width: 2000px;
    }
  }
  @media (min-width: 3861px) {
    #stickyNav {
      width: 3000px;
    }
  }

  @media (min-width: 1024px) and (max-width: 1400px) {
    /* #stickyNav {
      width: 95%;
    } */
     .fixed{
      width: 95vw;
     }
  }
</style>
