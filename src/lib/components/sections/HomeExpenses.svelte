<script lang="ts">
  import { budgetData } from "$lib/stores/website/budgetStore";
  import { onMount } from "svelte";
  import Select from '$lib/components/ui/Select.svelte';
  import budgetConfig from "$lib/data/website/budgetPlanner.json";

  let dropdownData = budgetConfig.dropdownData;

  // Create deep copies to avoid modifying the imported JSON reference directly
  let home = JSON.parse(JSON.stringify(budgetConfig.homeExpenses.home));
  let bill = JSON.parse(JSON.stringify(budgetConfig.homeExpenses.bill));
  let food = JSON.parse(JSON.stringify(budgetConfig.homeExpenses.food));
  let transport = JSON.parse(JSON.stringify(budgetConfig.homeExpenses.transport));
  let children = JSON.parse(JSON.stringify(budgetConfig.homeExpenses.children));
  let pet = JSON.parse(JSON.stringify(budgetConfig.homeExpenses.pet));

  $effect(() => {
    if ($budgetData) {
      if (!$budgetData.homeExpensesData || $budgetData.homeExpensesData.length === 0) {
        $budgetData.homeExpensesData = [{
          Home: home,
          Bill: bill,
          Food: food,
          Transport: transport,
          Children: children,
          Pet: pet,
        }];
      }
    }
  });

  const regex = /^[1-9][0-9]*$/;

  const updateFaqIcons = () => {
    document.querySelectorAll("details").forEach((details) => {
      const icon = details.querySelector(".faq-icon");
      if (icon) {
        if (details.hasAttribute("open")) {
          icon.classList.remove("fa-angle-down");
          icon.classList.add("fa-angle-up");
        } else {
          icon.classList.remove("fa-angle-up");
          icon.classList.add("fa-angle-down");
        }
      }
    });
  };

  onMount(() => {
    const detailsElements = document.querySelectorAll("details");
    if (detailsElements.length > 0) {
      detailsElements[0].setAttribute("open", "true");
    }

    detailsElements.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) {
          detailsElements.forEach((el) => {
            if (el !== details) {
              el.removeAttribute("open");
            }
          });
        }
        updateFaqIcons();
      });
    });

    updateFaqIcons();
  });
</script>

<div class="pb-5 grid gap-1">
  {#if $budgetData.homeExpensesData?.length > 0}
    {#each $budgetData.homeExpensesData as categoryGroup}
      {#each Object.entries(categoryGroup) as [categoryName, items]}
        <div class="px-3 pt-[2rem]">
          <p class="font-FourthHead text-subParaFont md:text-miniSubHead py-2 bg-white px-3 mb-[1rem]">
            {categoryName}
          </p>
          <div class="grid lg:grid-cols-2 lg:gap-x-[3rem] xl:gap-x-[6rem] gap-y-4 items-center py-[1rem]">
            {#each items as item}
              <div class="grid xs:grid-cols-2 sm:justify-center items-center gap-4 border-b pb-6 border-gray-300">
                <div class="font-FourthHead text-minParaFont md:text-paraFont">
                  <span>{item.name}</span>
                </div>
                <div class="grid grid-cols-2 gap-4 font-Paragraph text-minParaFont md:text-paraFont">
                  <div class="flex items-center justify-center gap-2 bg-white border-black pl-2 font-Paragraph text-minParaFont md:text-paraFont">
                    <span>₹</span>
                    <input
                      bind:value={item.value}
                      oninput={() => {
                        if (!regex.test(item.value)) {
                          item.value = item.value.slice(0, -1);
                        }
                      }}
                      class="w-full bg-white p-2 outline-none"
                    />
                  </div>
                  <Select
                    selectId="itemDuration"
                    classFont="font-Paragraph text-minParaFont md:text-paraFont pl-2 bg-black text-white rounded-none py-2"
                    optionClass="font-Paragraph text-minParaFont md:text-paraFont bg-black text-white"
                    chevronColor="text-white"
                    options={dropdownData}
                    bind:selectedValue={item.duration}
                    onChange={() => {
                      $budgetData.homeExpensesData = [...$budgetData.homeExpensesData];
                    }}
                  />
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/each}
  {/if}
</div>
