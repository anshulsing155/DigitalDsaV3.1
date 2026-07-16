<script>
  import { budgetData } from "$lib/stores/website/budgetStore";
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";
  import Select from "./Select.svelte";
  let durationData = [
    "Weekly",
    "Fortnightly",
    "Monthly",
    "Quarterly",
    "Annually",
  ];
 
  let selectedDuration = "Monthly";
  let incomeValue = false;
  let homeValue = false;
  let lifeValue = false;

  function calculateSum(data) {
    if (Array.isArray(data)) {
      return data.reduce((total, group) => {
        if (Array.isArray(group)) {
          const groupSum = group.reduce((groupTotal, item) => {
            let value = parseInt(item.value, 10);

            if (!isNaN(value)) {
              switch (item.duration) {
                case "Weekly":
                  value *= 4; // 4 weeks in a month
                  break;
                case "Fortnightly":
                  value *= 2; // 2 fortnights in a month
                  break;
                case "Quarterly":
                  value /= 3; // 3 months in a quarter
                  break;
                case "Annually":
                  value /= 12; // 12 months in a year
                  break;
                case "Monthly":
                  value *= 1;
                  break;
                default:
                  // No change needed for Monthly or unrecognized duration
                  break;
              }
            } else {
              value = 0; // Handle invalid values
            }

            return groupTotal + value;
          }, 0);
          return total + groupSum;
        }
        return total;
      }, 0);
    }
    return 0;
  }
  function calculateSingleData(data, timing) {
    // console.log(data, timing , "mkkkkkk");
    return data.reduce((total, item) => {
      let value = parseInt(item.value, 10);
      if (!isNaN(value)) {
        // Adjust value based on the timing argument
        switch (timing) {
          case "Weekly":
            // If timing is weekly, calculate as per weekly
            switch (item.duration) {
              case "Weekly":
                // No change for Weekly, already in weekly units
                break;
              case "Fortnightly":
                value /= 2; // Convert fortnightly to weekly (dividing by 2)
                break;
              case "Monthly":
                value /= 4; // Convert monthly to weekly (assuming 4 weeks per month)
                break;
              case "Quarterly":
                value /= 12; // Convert quarterly to weekly (assuming 12 weeks in a quarter)
                break;
              case "Annually":
                value /= 52; // Convert annually to weekly (assuming 52 weeks in a year)
                break;
              default:
                value = 0; // Default case to handle invalid timing
                break;
            }
            break;

          case "Fortnightly":
            // If timing is fortnightly, calculate as per fortnightly
            switch (item.duration) {
              case "Weekly":
                value *= 2; // Convert weekly to fortnightly (multiplying by 2)
                break;
              case "Fortnightly":
                // No change for Fortnightly, already in fortnightly units
                break;
              case "Monthly":
                value /= 2; // Convert monthly to fortnightly (dividing by 2)
                break;
              case "Quarterly":
                value /= 6; // Convert quarterly to fortnightly (assuming 6 fortnights in a quarter)
                break;
              case "Annually":
                value /= 26; // Convert annually to fortnightly (assuming 26 fortnights in a year)
                break;
              default:
                value = 0; // Default case to handle invalid timing
                break;
            }
            break;

          case "Monthly":
            switch (item.duration) {
                case "Weekly":
                  value *= 4; // Convert weekly to annually (assuming 52 weeks in a year)
                  break;
                case "Fortnightly":
                  value *= 2; // Convert fortnightly to annually (assuming 26 fortnights in a year)
                  break;
                case "Monthly":
                  // value /= 1;  Convert monthly to annually (assuming 12 months in a year)
                  break;
                case "Quarterly":
                  value /= 3; // Convert quarterly to annually (assuming 4 quarters in a year)
                  break;
                case "Annually":
                  value /= 12;
                  // No change for Annually, already in annual units
                  break;
                default:
                  value = 0; // Default case to handle invalid timing
                  break;
              }
          
          break;  

          case "Quarterly":
            // If timing is quarterly, calculate as per quarterly
            switch (item.duration) {
              case "Weekly":
                value *= 12; // Convert weekly to quarterly (assuming 12 weeks in a quarter)
                break;
              case "Fortnightly":
                value *= 6; // Convert fortnightly to quarterly (assuming 6 fortnights in a quarter)
                break;
              case "Monthly":
                value *= 3; // Convert monthly to quarterly (assuming 3 months in a quarter)
                break;
              case "Quarterly":
                // No change for Quarterly, already in quarterly units
                break;
              case "Annually":
                value /= 4; // Convert annually to quarterly (assuming 4 quarters in a year)
                break;
              default:
                value = 0; // Default case to handle invalid timing
                break;
            }
            break;

          case "Annually":
            // If timing is annually, calculate as per annually
            switch (item.duration) {
              case "Weekly":
                value *= 52; // Convert weekly to annually (assuming 52 weeks in a year)
                break;
              case "Fortnightly":
                value *= 26; // Convert fortnightly to annually (assuming 26 fortnights in a year)
                break;
              case "Monthly":
                value *= 12; // Convert monthly to annually (assuming 12 months in a year)
                break;
              case "Quarterly":
                value *= 4; // Convert quarterly to annually (assuming 4 quarters in a year)
                break;
              case "Annually":
                // console.log()
                // No change for Annually, already in annual units
                break;
              default:
                value = 0; // Default case to handle invalid timing
                break;
            }
            break;

          
          default:
            // Default to Monthly, no change needed for Monthly duration or unrecognized timing
            break;
        }
      } else {
        value = 0; // Handle invalid values
      }
      return total + (isNaN(value) ? 0 : value); // Add to total if valid number
    }, 0);
  }

  const sumValues = (data) => {
    return data.reduce((sum, item) => {
      return sum + Object.values(item)[0]; // Access the value of each object
    }, 0);
  };

  let sumAllIncome = 0;

  let sumAllHomeExpenses = 0;
  let sumOfIndividualHome = [];
  let sumAllLifeStyleExpenses = 0;
  let sumOfIndividualLifeStyle = [];
  let disposableIncome = 0;
  function sumAllValue(data) {
    let arrayData = [];
    Object.keys(data[0]).forEach((category) => {
      let Name = category;
      let sum = 0;
      data.forEach((item) => {
        const categoryData = item[category];

        sum = calculateSingleData(categoryData, selectedDuration);
      });
      arrayData.push({ [Name]: Math.round(sum) });
    });

    return arrayData;
  }
  //////all data sum/////
  function calculateAllData() {
    if ($budgetData) {
   
      
      sumAllIncome = $budgetData.incomeDataArray
          .map(item => calculateSingleData(item, selectedDuration))
          .reduce((acc, val) => acc + val, 0);
    
      
    }
    if ($budgetData.lifeStyleDataArray?.length > 0) {
      sumOfIndividualLifeStyle = sumAllValue($budgetData.lifeStyleDataArray);

      sumAllLifeStyleExpenses = sumValues(sumOfIndividualLifeStyle);
    }
    if ($budgetData.homeExpensesData?.length > 0) {
      sumOfIndividualHome = sumAllValue($budgetData.homeExpensesData);

      sumAllHomeExpenses = sumValues(sumOfIndividualHome);
    }

    disposableIncome =
      sumAllIncome - sumAllHomeExpenses - sumAllLifeStyleExpenses;
    // console.log(disposableIncome,"mkkdpdpdp")  
    if (disposableIncome < 0) {
      disposableIncome = 0;
    }
  }

  let chartContainer; // Reference to the canvas element
  let chartInstance = null;
  let sumAllHomeExpensesColorCode = "#515251";
  let internalColorCodeOfHome = [
    "#3F908A",
    "#4E9994",
    "#62A4A0",
    "#7AB2AF",
    "#9AC4C2",
    "#C2DCD9",
  ];
  let sumAllLifeStyleExpensesColorCode = "#EFEBEF";
  let internalColorCodeOfLife = [
    "#D5BEC8",
    "#BA8FA2",
    "#C22E59",
    "#7D1A42",
    "#75002F",
  ];
  let disposableIncomeColorCode = "#FFD318";

  let dataOfGraph = [];
  let colorOfGraph = [];
  function charFuncion(dataValue, color) {
    const data = {
      datasets: [
        {
          data: dataValue, // Values for each section
          backgroundColor: color, // Colors for each section
          hoverBackgroundColor: color, // Hover colors
        },
      ],
    };

    const config = {
      type: "pie",
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.raw}`; // Show only the percentage value
              },
            },
          },
        },
      },
    };

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(chartContainer, config);
  }
  function UpdateGraph() {
    if (!homeValue && !lifeValue) {
      dataOfGraph = [
        disposableIncome,
        sumAllHomeExpenses,
        sumAllLifeStyleExpenses,
      ];
      colorOfGraph = [
        disposableIncomeColorCode,
        sumAllHomeExpensesColorCode,
        sumAllLifeStyleExpensesColorCode,
      ];

      if (disposableIncome > 0) {
        charFuncion(dataOfGraph, colorOfGraph);
      }
    } else if (!homeValue && lifeValue) {
      dataOfGraph = [];
      colorOfGraph = [];
      let filteredArray = [];
      if (sumOfIndividualLifeStyle.length > 0) {
        filteredArray = sumOfIndividualLifeStyle.map(
          (item) => Object.values(item)[0]
        );
      }

      dataOfGraph = [
        ...dataOfGraph,
        disposableIncome,
        sumAllHomeExpenses,
        ...filteredArray,
      ];

      colorOfGraph = [
        ...colorOfGraph,
        disposableIncomeColorCode,
        sumAllHomeExpensesColorCode,
        ...internalColorCodeOfLife,
      ];
      if (disposableIncome > 0) {
        charFuncion(dataOfGraph, colorOfGraph);
      }
    } else if (homeValue && !lifeValue) {
      dataOfGraph = [];
      colorOfGraph = [];
      let filteredArray = [];
      if (sumOfIndividualHome.length > 0) {
        filteredArray = sumOfIndividualHome.map(
          (item) => Object.values(item)[0]
        );
      }

      dataOfGraph = [
        ...dataOfGraph,
        disposableIncome,
        ...filteredArray,
        sumAllLifeStyleExpenses,
      ];
      colorOfGraph = [
        ...colorOfGraph,
        disposableIncomeColorCode,
        ...internalColorCodeOfHome,
        sumAllLifeStyleExpensesColorCode,
      ];
      if (disposableIncome > 0) {
        charFuncion(dataOfGraph, colorOfGraph);
      }
    } else if (homeValue && lifeValue) {
      dataOfGraph = [];
      colorOfGraph = [];
      let filteredHome = [];
      let filteredLife = [];
      if (sumOfIndividualHome.length > 0) {
        filteredHome = sumOfIndividualHome.map(
          (item) => Object.values(item)[0]
        );
      }

      if (sumOfIndividualLifeStyle.length > 0) {
        filteredLife = sumOfIndividualLifeStyle.map(
          (item) => Object.values(item)[0]
        );
      }

      dataOfGraph = [
        ...dataOfGraph,
        disposableIncome,
        ...filteredHome,
        ...filteredLife,
      ];
      colorOfGraph = [
        ...colorOfGraph,
        disposableIncomeColorCode,
        ...internalColorCodeOfHome,
        ...internalColorCodeOfLife,
      ];
      if (disposableIncome > 0) {
        charFuncion(dataOfGraph, colorOfGraph);
      }
    }
  }

  onMount(() => {
    calculateAllData();
    UpdateGraph();
  });
</script>

<div class="px-3 pb-5 pt-2">
  <div
    class="font-FourthHead text-miniSubHead py-2"
  >
    Budget Period
  </div>
  <div class="grid md:grid-cols-2 items-start gap-[3rem] py-[1rem]">
    <div class="grid gap-4">
      <div class=" cursor-pointer grid">
        <div class="bg-white p-2 border border-black">
          <div
            on:click={() => {
              incomeValue = !incomeValue;
            }}
            class="flex justify-between items-center font-Paragraph text-minParaFont md:text-paraFont"
          >
            <div class="flex gap-4 items-center">
              <i
                class={`fa-solid fa-angle-right text-btnBg transition-transform duration-300 ${
                  incomeValue ? "rotate-90" : ""
                }`}
              ></i>
              <span class="">Income</span>
            </div>
            <div class="my-auto">
              ₹: {sumAllIncome.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        {#if incomeValue}
          {#each $budgetData.incomeDataArray as item, index}
            <div
              class="bg-white border border-gray-300 p-2 font-Paragraph text-minParaFont md:text-paraFont"
            >
              <div class=" flex justify-between pl-2">
                {#if $budgetData.incomeDataArray.length == 1}
                  <span>Individual</span>

                  <span
                    >₹: {calculateSingleData(
                      item,
                      selectedDuration
                    ).toLocaleString("en-IN")}</span
                  >
                {:else if $budgetData.incomeDataArray.length == 2}
                  {#if index == 0}
                    <span>First</span>
                  {:else if index == 1}
                    <span>Second</span>
                  {/if}
                  <span
                    >₹: {calculateSingleData(
                      item,
                      selectedDuration
                    ).toLocaleString("en-IN")}</span
                  >
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
      <div class=" cursor-pointer grid">
        <div class="bg-white p-2 border border-black">
          <div
            on:click={() => {
              homeValue = !homeValue;
              UpdateGraph();
            }}
            class="flex justify-between items-center font-Paragraph text-minParaFont md:text-paraFont"
          >
            <div class="flex gap-4 items-center">
              <i
                class={`fa-solid fa-angle-right text-btnBg transition-transform duration-300 ${
                  homeValue ? "rotate-90" : ""
                }`}
              ></i>
              <span
                class="my-auto h-3 w-3"
                style="background-color: {sumAllHomeExpensesColorCode};"
              ></span>

              <span class="">Home Expenses</span>
            </div>
            <div class="">
              ₹: {sumAllHomeExpenses.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        {#if homeValue && sumOfIndividualHome.length > 0}
          <div
            class="font-Paragraph text-minParaFont md:text-paraFont border-b border-x border-gray-200"
          >
            {#each sumOfIndividualHome as item, index}
              {#each Object.entries(item) as [key, value]}
                <div
                  class="bg-white border border-gray-300 p-2 flex justify-between pl-4"
                >
                  <div class="flex gap-4 items-center">
                    <span
                      class="my-auto h-3 w-3"
                      style="background-color: {internalColorCodeOfHome[
                        index
                      ]};"
                    ></span>
                    <span>{key}</span>
                  </div>

                  <span>₹: {value.toLocaleString("en-IN")}</span>
                </div>
              {/each}
            {/each}
          </div>
        {/if}
      </div>
      <div class=" cursor-pointer grid">
        <div class="bg-white p-2 border border-black">
          <div
            on:click={() => {
              lifeValue = !lifeValue;
              UpdateGraph();
            }}
            class="flex justify-between items-center font-Paragraph text-minParaFont md:text-paraFont"
          >
            <div class="flex gap-4 items-center">
              <i
                class={`fa-solid fa-angle-right text-btnBg transition-transform duration-300 ${
                  lifeValue ? "rotate-90" : ""
                }`}
              ></i>
              <span
                class="my-auto h-3 w-3"
                style="background-color: {sumAllLifeStyleExpensesColorCode};"
              ></span>

              <span class="">Lifestyle Expenses</span>
            </div>
            <div class="">
              ₹: {sumAllLifeStyleExpenses.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        {#if lifeValue && sumOfIndividualLifeStyle.length > 0}
          <div
            class="font-Paragraph text-minParaFont md:text-paraFont border-b border-x border-gray-200"
          >
            {#each sumOfIndividualLifeStyle as item, index}
              {#each Object.entries(item) as [key, value]}
                <div
                  class=" bg-white border border-gray-300 p-2 flex justify-between pl-4"
                >
                  <div class="flex gap-4 items-center">
                    <span
                      class="my-auto h-3 w-3"
                      style="background-color: {internalColorCodeOfLife[
                        index
                      ]};"
                    ></span>
                    <span>{key}</span>
                  </div>

                  <span>₹: {value.toLocaleString("en-IN")}</span>
                </div>
              {/each}
            {/each}
          </div>
        {/if}
      </div>
      <div class=" cursor-pointer">
        <div class="bg-white p-2 border border-black">
          <div
            class="flex justify-between items-center font-Paragraph text-minParaFont md:text-paraFont"
          >
            <div class="flex gap-4 items-center">
              <!-- <i class="fa-solid fa-angle-down text-white"></i> -->
              <span
                class="my-auto h-3 w-3"
                style="background-color: {disposableIncomeColorCode};"
              ></span>
              <span class="">Disposable income</span>
            </div>
            <div class="">
              ₹: {disposableIncome.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="grid  gap-4">
      <Select
        selectId="itemDuration"
        classFont="font-Paragraph text-minParaFont md:text-paraFont pl-2 bg-black text-white rounded-none py-2"
        optionClass="font-Paragraph text-minParaFont md:text-paraFont  bg-black text-white"
        chevronColor="text-white "
        options={durationData}
        bind:selectedValue={selectedDuration}
        on:change={() => {
          calculateAllData();
          UpdateGraph();
        }}
      />
      <div class="lg:w-full xs:max-w-[20rem] max-w-[15rem] justify-self-center">
        <canvas bind:this={chartContainer}></canvas>
      </div>
    </div>
  </div>
</div>
