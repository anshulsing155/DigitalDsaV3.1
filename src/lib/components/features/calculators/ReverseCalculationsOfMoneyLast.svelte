<script lang="ts">
  import { onMount } from "svelte";
  import { ToWords } from "to-words";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import Select from '$lib/components/ui/Select.svelte';
  import CurrencyFormateInput from '$lib/components/sections/CurrencyFormateInput.svelte';
  import config from "$lib/data/website/moneyMapCalculators.json";

  const { common, reverseCalculationsOfMoneyLast: calcConfig } = config;
  let { toolType = calcConfig.defaults.toolType } = $props();

  let tableHeadLargeScreen = calcConfig.tableHeaders;
  let retirementAge = $state(calcConfig.defaults.retirementAge);

  const toWords = new ToWords();
  let closingBalance = $state(calcConfig.defaults.closingBalance);
  let monthlyWithdrawal = $state(calcConfig.defaults.monthlyWithdrawal);
  let annualInterestRate = $state(calcConfig.defaults.annualInterestRate);
  let useAER = $state(false);
  let startDate = $state(new Date().toISOString().slice(0, 10));
  let tenureMonths = $state(calcConfig.defaults.tenureMonths);
  let result = $state<any>({});
  let finalBalance = $state(0);

  let typeOfFrequency = $state("Money withdrawals");
  let monthlyWithdrawalError = $state("");
  let frequencyValue = $state("Monthly");
  let expectedSavingValue = $state("Months"); // Default to Months
  let lastValidValue = $state(calcConfig.defaults.tenureMonths); // Store last valid value
  let initialBalance = $state(0);
  let percentageFrequency = $state("Every year");
  let percentageValue = $state(10);
  let riskLevel = $state("High");
  let monthlyDeposit = $state(0);
  let totalInterestEarned = $state(0);
  let totalDeposit = $state(0);
  let tenure = $state(20); // Default to 20 months
  let maximumYear = $state(70);

  let count = tweened(0, {
    duration: 500,
    easing: cubicOut,
  });
  function animateTo(newValue: number) {
    count.set(newValue);
  }

  let compoundFrequency = $state("Quarterly");
  let ageValue = $state(calcConfig.defaults.ageValue);
  let selectedOccupations = $state(calcConfig.defaults.selectedOccupation);

  let totalWithdrawalAmount = $state(0);
  let totalInterestAmount = $state(0);

  let interestRateError = $state("");
  let exceptedError = $state("");
  let percentageOfWithdrawalError = $state("");
  let ageError = $state("");
  let retirementAgeError = $state("");

  function toolFunction() {
    switch (toolType) {
      case "SWP-High Return":
        annualInterestRate = 20;
        break;
      case "SWP-Medium Return":
        annualInterestRate = 15;
        break;
      case "SWP-Low Return":
        annualInterestRate = 10;
        break;
      case "Fixed Deposit":
        annualInterestRate = 8;
        break;
      case "SSS Scheme":
        annualInterestRate = 7.5;
        break;
      case "PPF":
        annualInterestRate = 7.1;
        break;
      case "NPS":
        annualInterestRate = 9;
        break;
      case "Post-Office MIS":
        annualInterestRate = 7.4;
        break;
      case "Saving":
        annualInterestRate = 3;
        break;
      case "Other":
        annualInterestRate = 7;
        break;
      default:
        annualInterestRate = 20;
    }
  }

  function validate() {
    let isMonthly = expectedSavingValue === "Months";
    let minValue = isMonthly ? 12 : 1;
    let maxValue = isMonthly ? 70 * 12 : 70;
    maximumYear = retirementAge - ageValue;

    if (isMonthly) {
      tenureMonths = tenure;
      if (tenureMonths < 12) {
        exceptedError = "Expected months should be more than 11 months.";
        tenureMonths = 0;
      } else if (tenureMonths > maximumYear * 12) {
        exceptedError = `Expected months cannot be more than ${12 * maximumYear} months.`;
        tenureMonths = 0;
      } else {
        exceptedError = "";
      }
    } else {
      tenureMonths = tenure * 12;
      if (tenure < 1) {
        exceptedError = "Expected years should be at least 1 year.";
        tenureMonths = 0;
      } else if (tenureMonths > maximumYear * 12) {
        exceptedError = `Expected years cannot be more than ${maximumYear} years.`;
        tenureMonths = 0;
      } else {
        exceptedError = "";
      }
    }

    if (isNaN(monthlyWithdrawal) || monthlyWithdrawal === null) {
      monthlyWithdrawalError = "Please enter a valid withdrawal amount.";
    } else if (monthlyWithdrawal < 10000) {
      monthlyWithdrawalError = "Withdrawal amount must be greater than or equal to ₹ 10,000.";
    } else if (monthlyWithdrawal > 10000000) {
      monthlyWithdrawalError = "Withdrawal amount cannot exceed ₹1 crore.";
    } else if (!frequencyValue) {
      monthlyWithdrawalError = "Please select a withdrawal frequency.";
    } else if (monthlyWithdrawal < 10000 && frequencyValue !== "Monthly") {
      monthlyWithdrawalError = `Minimum withdrawal amount for ${frequencyValue.toLowerCase()} is ₹ 10,000.`;
    } else {
      monthlyWithdrawalError = "";
    }

    if (
      isNaN(percentageValue) ||
      percentageValue === null ||
      percentageValue < 0 ||
      percentageValue === undefined
    ) {
      percentageOfWithdrawalError = "Increment cannot be less than 0 %";
    } else if (percentageValue > 200) {
      percentageOfWithdrawalError = "Increment rate is not reasonable if it's more than 200 %";
    } else {
      percentageOfWithdrawalError = "";
    }

    if (annualInterestRate < 0 || annualInterestRate === undefined) {
      interestRateError = "Interest rate cannot be less than 0";
    } else if (annualInterestRate > 500) {
      interestRateError = "Interest rate cannot be more than 500";
    } else {
      interestRateError = "";
    }

    if (isNaN(ageValue) || ageValue === null) {
      ageError = "Please enter a valid number for age.";
    } else if (ageValue <= 0 || ageValue < 18) {
      ageError = "Age must be a positive number and greater than or equal to 18 years.";
    } else if (ageValue > 120) {
      ageError = "Enter a valid age.";
    } else if (isNaN(retirementAge) || retirementAge === null) {
      ageError = "Please enter a valid number for retirement age.";
    } else if (retirementAge <= 0) {
      ageError = "Retirement age must be a positive number.";
    } else if (retirementAge < 40) {
      ageError = "Retirement age should be at least 40 years.";
    } else if (retirementAge > 70) {
      ageError = "Retirement age should not exceed 70 years.";
    } else if (ageValue === retirementAge) {
      ageError = "Current age and retirement age cannot be the same.";
    } else if (ageValue >= retirementAge) {
      ageError = "Current age should be less than expected retirement age.";
    } else {
      ageError = "";
    }

    return !(
      monthlyWithdrawalError ||
      percentageOfWithdrawalError ||
      interestRateError ||
      exceptedError ||
      retirementAgeError ||
      ageError
    );
  }

  let remainingAge = $state(0);
  let monthlyData = $state<any[]>([]);
  let requiredSavings = $state(0);

  function scrollFunction() {
    let index = "resultView";
    const element = document.getElementById(index);
    if (!element) return;
    const offset = 55;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: elementPosition - offset,
      behavior: "smooth",
    });
  }

  function handleFrequencyChange(event: any) {
    let newValue = event;
    let isSwitchingToYearly = newValue === "Years";
    let isSwitchingToMonthly = newValue === "Months";

    if (isSwitchingToYearly && expectedSavingValue === "Months") {
      tenure = Math.max(1, Math.round(tenure / 12));
    } else if (isSwitchingToMonthly && expectedSavingValue === "Years") {
      tenure = Math.max(12, tenure * 12);
    }

    expectedSavingValue = newValue;
    validate();

    if (percentageFrequency === "No increment needed") {
      percentageValue = 0;
      percentageOfWithdrawalError = "";
    } else {
      percentageOfWithdrawalError = "";
    }
  }

  function handleInputChange() {
    if (
      percentageFrequency === "No increment needed" &&
      percentageValue !== 0
    ) {
      percentageOfWithdrawalError = "Change the frequency — 'No increment needed' can't have a non-zero value.";
    } else {
      percentageOfWithdrawalError = "";
    }
  }

  function calculate() {
    monthlyData = [];

    if (validate()) {
      totalWithdrawalAmount = 0;
      totalInterestAmount = 0;
      let rate = annualInterestRate / 100;
      let effectiveRate = 0;

      switch (compoundFrequency) {
        case "Monthly":
          effectiveRate = 12;
          break;
        case "Quarterly":
          effectiveRate = 4;
          break;
        case "Half-Yearly":
          effectiveRate = 2;
          break;
        case "Yearly":
          effectiveRate = 1;
          break;
        default:
          effectiveRate = 0;
      }

      let withdrawalFrequencyValue = 0;
      switch (frequencyValue) {
        case "Monthly":
          withdrawalFrequencyValue = 1;
          break;
        case "Quarterly":
          withdrawalFrequencyValue = 3;
          break;
        case "Half-yearly":
          withdrawalFrequencyValue = 6;
          break;
        case "Yearly":
          withdrawalFrequencyValue = 12;
          break;
        default:
          withdrawalFrequencyValue = 0;
      }

      let table = [];
      let requiredAmount = closingBalance;
      let withdraw = monthlyWithdrawal;
      let actualWithdraw = 0;

      for (let i = tenureMonths - 1; i >= 0; i--) {
        let monthlyRate = Math.pow(1 + rate / effectiveRate, effectiveRate / 12) - 1;
        let yearsPassed = 0;

        if (percentageFrequency == "Every year") {
          yearsPassed = Math.floor(i / 12);
          if (i % withdrawalFrequencyValue === 0 || i === tenureMonths - 1) {
            withdraw = monthlyWithdrawal * Math.pow(1 + percentageValue / 100, yearsPassed);
            actualWithdraw = withdraw;
          } else {
            withdraw = 0;
            actualWithdraw = 0;
          }
        } else if (percentageFrequency == "Every two years") {
          yearsPassed = Math.floor(i / 24);
          withdraw = monthlyWithdrawal * Math.pow(1 + percentageValue / 100, yearsPassed);
          actualWithdraw = withdraw;
        }

        let interestEarned = requiredAmount * monthlyRate;
        totalInterestAmount += interestEarned;
        totalWithdrawalAmount += actualWithdraw;
        requiredAmount = (requiredAmount + actualWithdraw) / (1 + monthlyRate);

        table.unshift({
          month: i + 1,
          withdrawal: actualWithdraw.toFixed(2),
          requiredSavings: requiredAmount.toFixed(2),
        });
      }

      requiredSavings = Number(requiredAmount.toFixed(2));
      monthlyData = table;
      initialBalance = requiredSavings;
      remainingAge = retirementAge - ageValue;

      let r = annualInterestRate / 100;
      let n = 12;
      let numerator = Math.round(initialBalance * (r / n));
      let denominator = Math.pow(1 + r / n, n * remainingAge) - 1;
      denominator = parseFloat(denominator.toFixed(2));

      if (denominator > 0) {
        monthlyDeposit = numerator / denominator;
        totalDeposit = monthlyDeposit * n * remainingAge;
        totalInterestEarned = initialBalance - totalDeposit;
      } else {
        monthlyDeposit = 0;
        totalDeposit = 0;
      }

      scrollFunction();
    }
  }

  onMount(() => {
    toolFunction();
    calculate();
  });
</script>

<section class="w-full mx-auto">
  <div class="grid justify-center md:px-2 lg:px-0 grid-cols-12 gap-4 lg:gap-[2rem]">
    <div class="relative grid gap-4 md:gap-8 bg-mainBg py-4 lg:py-6 px-3 shadow-md w-full col-span-12 md:col-span-6">
      <div class="flex flex-col gap-2 md:gap-4">
        <div class="grid grid-cols-2 gap-2 md:gap-4">
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Current age</p>
            <div class="flex items-center border border-black bg-white font-SubPara text-minParaFont lg:text-paraFont">
              <input
                onwheel={(event) => event.currentTarget.blur()}
                onfocusout={validate}
                bind:value={ageValue}
                class="w-full outline-none p-1"
                type="number"
              />
              <p class="p-2">Years</p>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Expected Retirement</p>
            <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
              <input
                onwheel={(event) => event.currentTarget.blur()}
                onfocusout={validate}
                bind:value={retirementAge}
                oninput={() => { retirementAgeError = ""; }}
                class="w-full p-2 outline-none"
                type="number"
              />
              <p class="p-2">Years</p>
            </div>
          </div>
        </div>
        {#if ageError}
          <p class="text-dangerColor text-xs pb-2">{ageError}</p>
        {/if}
      </div>

      <div class="grid gap-8">
        <div class="">
          <p class="font-FourthHead text-minParaFont lg:text-paraFont">How and what will you withdraw after retirement?</p>
          <div class="flex gap-2 items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont relative">
            <div class="absolute w-[50%] left-0">
              <Select
                selectId="frequency"
                classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white border border-black rounded-none py-2"
                optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                chevronColor="text-white pr-2"
                options={["Monthly", "Quarterly", "Half-Yearly", "Yearly"]}
                bind:selectedValue={frequencyValue}
                onChange={validate}
              />
            </div>
            <div class="flex flex-end items-center justify-end gap-2 w-full">
              <input
                onwheel={(event) => event.currentTarget.blur()}
                bind:value={monthlyWithdrawal}
                oninput={validate}
                onfocusout={validate}
                class="w-[45%] outline-none pl-2 py-2 text-end"
                type="number"
              />
              <p class="pr-2 font-FourthHead">₹</p>
            </div>
          </div>
          {#if monthlyWithdrawalError}
            <p class="text-dangerColor text-xs text-end">{monthlyWithdrawalError}</p>
          {:else if monthlyWithdrawal > 0}
            <p class="text-xs text-black text-end">{toWords.convert(monthlyWithdrawal)}</p>
          {/if}
        </div>
      </div>

      <div class="grid gap-8">
        <div class="flex flex-col gap-2 pb-4">
          <p class="font-FourthHead text-minParaFont lg:text-paraFont">
            Any increment in withdrawal amount? <br />
            <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(To mitigate the inflation effect over time)</span>
          </p>
          <div class="grid gap-2 items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont relative">
            <div class="absolute w-[50%] left-0">
              <Select
                selectId="frequency"
                classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white border border-black rounded-none py-2 w-full"
                optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                chevronColor="text-white pr-2"
                options={["Every year", "Every two years", "No increment needed"]}
                bind:selectedValue={percentageFrequency}
                onChange={handleFrequencyChange}
              />
            </div>
            <div class="flex flex-end items-center justify-end gap-2 w-full">
              <input
                onwheel={(event) => event.currentTarget.blur()}
                onfocusout={validate}
                bind:value={percentageValue}
                oninput={() => { handleInputChange(); validate(); }}
                class="w-[45%] outline-none pl-2 py-2 text-end"
                type="number"
              />
              <p class="pr-2 font-FourthHead">%</p>
            </div>
          </div>
          {#if percentageOfWithdrawalError}
            <p class="text-xs text-dangerColor px-2">{percentageOfWithdrawalError}</p>
          {/if}
        </div>
      </div>

      <div class="pb-4">
        <p class="font-FourthHead text-minParaFont lg:text-paraFont pb-2">
          You will invest that amount somewhere to get returns. <br />
          <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(i.e. FD, PPF, NPS, etc.)</span>
        </p>
        <div class="grid grid-cols-2 gap-2 md:gap-4">
          <div class="grid gap-8">
            <div class="flex flex-col gap-2">
              <p class="font-FourthHead text-minParaFont lg:text-paraFont">Expected annual return</p>
              <div class="flex gap-2 items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont relative">
                <div class="flex flex-end items-center justify-end gap-2 w-full">
                  <p class="font-FourthHead p-2">%</p>
                  <input
                    onwheel={(event) => event.currentTarget.blur()}
                    bind:value={annualInterestRate}
                    oninput={() => { interestRateError = ""; }}
                    class="w-full outline-none py-2 text-start"
                    type="number"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Interest Compounding</p>
            <Select
              selectId="frequency"
              classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
              optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
              chevronColor="text-black pr-2"
              options={["Monthly", "Quarterly", "Half-Yearly", "Yearly"]}
              bind:selectedValue={compoundFrequency}
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-8">
        <div class="flex flex-col gap-2 pb-4">
          <p class="font-FourthHead text-minParaFont lg:text-paraFont">Expected tenure your savings should support you?</p>
          <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont relative">
            <div class="absolute w-[50%] left-0">
              <Select
                selectId="frequency"
                classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white border border-black rounded-none py-2 w-full"
                optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                chevronColor="text-white pr-2"
                options={["Months", "Years"]}
                bind:selectedValue={expectedSavingValue}
                onChange={handleFrequencyChange}
              />
            </div>
            <div class="flex flex-end items-center justify-end gap-2 w-full">
              <input
                onwheel={(event) => event.currentTarget.blur()}
                bind:value={tenure}
                oninput={() => { exceptedError = ""; }}
                onfocusout={validate}
                class="w-[45%] outline-none pr-2 py-2 text-end"
                type="number"
              />
            </div>
          </div>
          {#if exceptedError}
            <p class="text-dangerColor text-xs">{exceptedError}</p>
          {/if}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="font-FourthHead text-minParaFont lg:text-paraFont">
          How much have you saved so far?<br />
          <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(Select 0 if you have no savings yet.)</span>
        </p>
        <CurrencyFormateInput
          bind:inputsValue={closingBalance}
          onChange={() => { validate(); }}
        />
        {#if closingBalance}
          <p class="text-xs text-black">{toWords.convert(closingBalance)}</p>
        {/if}
      </div>

      <div class="text-center pt-[1rem]">
        <button
          class="w-full rounded-full bg-btnBg border px-[3rem] py-3 font-Paragraph text-minParaFont lg:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
          onclick={calculate}
        >
          Calculate
        </button>
      </div>
    </div>

    {#if monthlyData.length > 0}
      <div id="resultView" class="flex flex-col py-[2rem] lg:py-[4rem] gap-[2rem] lg:gap-[4rem] bg-darkColor col-span-12 md:col-span-6">
        <div class="flex flex-col items-center justify-center gap-2 text-center text-black p-[2rem] bg-mainBg border-x border-darkColor border-dotted lg:border-none w-full mx-auto animate-fade">
          <p class="font-FifthHead text-miniHeadFont md:text-mobHeadFont">
            ₹ {Math.round(initialBalance).toLocaleString("en-IN")}
          </p>
          <div class="flex flex-col gap-2">
            <p class="font-Paragraph text-minParaFont lg:text-paraFont">Save this amount to retire stress-free!</p>
          </div>
          <div class="h-[2px] w-full mt-3 bg-gradient-to-r from-transparent via-darkColor to-transparent"></div>
          {#if remainingAge > 0}
            <div class="result pt-2 md:pt-4 font-Paragraph text-minParaFont lg:text-paraFont w-full lg:w-[60%]">
              Kickstart your journey with a monthly deposit of
              <br>
              <span class="text-btnBg font-FourthHead text-minSubHead md:text-mobSubHead mt-3">
                ₹{Math.round(monthlyDeposit).toLocaleString("en-IN")}
              </span>
              <br>
              to stay on track for {remainingAge} years
            </div>
          {/if}
        </div>

        <div class="flex flex-col gap-4 bg-black p-2 md:p-6 w-full mx-auto px-4">
          <div class="flex justify-between items-center text-center border-b border-iconColor py-4">
            <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total durations</p>
            <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">{tenureMonths} Months</p>
          </div>
          <div class="flex justify-between items-center text-center border-b border-iconColor pb-4">
            <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total Interest Amount</p>
            <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
              ₹ {Math.round(totalInterestAmount).toLocaleString("en-IN")}
            </p>
          </div>
          <div class="flex justify-between items-center text-center pb-4">
            <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total Withdrawal Amount</p>
            <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
              ₹ {Math.round(totalWithdrawalAmount).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  ::-webkit-scrollbar-thumb {
    background: black;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
