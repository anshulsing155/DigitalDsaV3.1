<script lang="ts">
  import { budgetData } from "$lib/stores/website/budgetStore";
  import { onMount } from "svelte";
  import Select from "$lib/components/website/Select.svelte";
  import budgetConfig from "$lib/data/website/budgetPlanner.json";

  let { selectedOption = $bindable("no") } = $props();

  let dropdownData = budgetConfig.dropdownData;

  // Create deep copies to avoid modifying the imported JSON reference directly
  let IncomeArrayFirst = JSON.parse(JSON.stringify(budgetConfig.income.IncomeArrayFirst));
  let IncomeArraySecond = JSON.parse(JSON.stringify(budgetConfig.income.IncomeArraySecond));

  $effect(() => {
    if ($budgetData) {
      if (!$budgetData.incomeDataArray || $budgetData.incomeDataArray.length === 0) {
        $budgetData.incomeDataArray = [IncomeArrayFirst];
      }

      if (selectedOption == "yes") {
        if ($budgetData.incomeDataArray.length === 1) {
          $budgetData.incomeDataArray = [
            ...$budgetData.incomeDataArray,
            IncomeArraySecond,
          ];
        }
      } else if (selectedOption == "no") {
        if ($budgetData.incomeDataArray.length > 1) {
          $budgetData.incomeDataArray = [$budgetData.incomeDataArray[0]];
        }
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

<section>
  <div class="border-b border-gray-300 font-FourthHead text-paraFont flex justify-between gap-4 pb-4 pt-6 px-3">
    <p class="">
      <span class="text-sm text-dangerColor">*</span> Joint Income
    </p>
    <div>
      <div class="flex items-center space-x-4 justify-center">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="option"
            value="yes"
            bind:group={selectedOption}
            class="peer hidden form-radio h-4 w-4 border-gray-300 text-btnBg focus:ring-btnBg"
          />
          <div class="h-4 w-4 border bg-white border-black rounded-full flex items-center justify-center peer-checked:bg-btnBg">
            <div class="bg-white rounded-full"></div>
          </div>
          <span class="">Yes</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="option"
            value="no"
            bind:group={selectedOption}
            class="peer hidden form-radio h-4 w-4 border-gray-300 text-btnBg focus:ring-btnBg"
          />
          <div class="h-4 w-4 border bg-white border-black rounded-full flex items-center justify-center peer-checked:bg-btnBg">
            <div class="bg-white rounded-full"></div>
          </div>
          <span class="">No</span>
        </label>
      </div>
    </div>
  </div>

  <div class="px-3 py-5 grid gap-1">
    {#if $budgetData.incomeDataArray?.length > 0}
      {#each $budgetData.incomeDataArray as incomeArray, indexValue}
        <div class="font-FourthHead text-subParaFont md:text-miniSubHead py-2 bg-white px-3">
          {#if indexValue === 0}
            <p class="">{selectedOption === "yes" ? "First" : "Individual"}</p>
          {:else}
            <p class="">Second</p>
          {/if}
        </div>
        <div class="grid lg:grid-cols-2 lg:gap-x-[3rem] xl:gap-x-[6rem] gap-y-4 items-center py-[2rem]">
          {#each incomeArray as item, index}
            <div class="grid xs:grid-cols-2 sm:justify-center items-center gap-4 border-b pb-6 border-gray-300">
              <div class="font-FourthHead text-minParaFont md:text-paraFont">
                {#if index === 0}
                  <div class="flex gap-4">
                    <div>
                      <span class="text-dangerColor">*</span> {item.name}
                    </div>
                  </div>
                {:else if index >= 2 && index <= 5}
                  <div class="flex gap-4">
                    <div>{item.name}</div>
                  </div>
                {:else}
                  {item.name}
                {/if}
              </div>
              <div class="grid grid-cols-2 font-Paragraph text-minParaFont md:text-paraFont">
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
                />
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  </div>
</section>
