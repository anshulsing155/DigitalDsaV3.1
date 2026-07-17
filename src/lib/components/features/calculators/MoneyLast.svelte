<script lang="ts">
  import { onMount } from "svelte";
  import { ToWords } from "to-words";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import DatePickerYearAndMonth from "$lib/components/DatePickerYearAndMonth.svelte";
  import Select from '$lib/components/ui/Select.svelte';
  import CurrencyFormateInput from '$lib/components/sections/CurrencyFormateInput.svelte';
  import config from "$lib/data/website/moneyMapCalculators.json";

  const { common, moneyLast: calcConfig } = config;
  let { toolType = calcConfig.defaults.toolType } = $props();

  const currentDate = new Date();
  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth() + 1;
  let loanStartMinValue = $state(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`);
  let loanEndMaxValue = $state("2064-12");
  let selectedDate = $state(String(currentYear + "-" + currentMonth));

  let isOpen = $state(false);

  function closeDropdown() {
    isOpen = false;
  }

  onMount(() => {
    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  });

  let tableHeadLargeScreen = calcConfig.tableHeaders;
  let ageValue = $state(calcConfig.defaults.ageValue);
  let selectedOccupations = $state(calcConfig.defaults.selectedOccupation);
  let riskLevel = $state(calcConfig.defaults.riskLevel);

  const toWords = new ToWords();

  let initialBalance = $state(calcConfig.defaults.initialBalance);
  let monthlyWithdrawal = $state(calcConfig.defaults.monthlyWithdrawal);
  let annualInterestRate = $state<number | undefined>(calcConfig.defaults.annualInterestRate);
  let useAER = $state(false);
  let startDate = $state(new Date().toISOString().slice(0, 10));
  let tenureMonths = $state(calcConfig.defaults.tenureMonths);
  let result = $state<any>({});
  let finalBalance = $state("0");
  let breakdown = $state<any[]>([]);
  let frequencyValue = $state("Monthly");
  let percentageValue = $state(10);
  let percentageFrequency = $state("% every year");

  function toolFunction() {
    if (toolType == common.tools[0]) {
      if (riskLevel == "Low") {
        annualInterestRate = common.interestRates.SIP.Low;
      } else if (riskLevel == "Medium") {
        annualInterestRate = common.interestRates.SIP.Medium;
      } else {
        annualInterestRate = common.interestRates.SIP.High;
      }
    } else if (toolType == common.tools[1]) {
      annualInterestRate = common.interestRates.RD;
    } else if (toolType == common.tools[2]) {
      annualInterestRate = common.interestRates.RD;
    } else if (toolType == "SWP") {
      annualInterestRate = common.interestRates.RD;
    } else if (toolType == common.tools[3]) {
      annualInterestRate = undefined;
    }
  }

  let count = tweened(0, {
    duration: 500,
    easing: cubicOut,
  });
  function animateTo(newValue: number) {
    count.set(newValue);
  }

  let totalWithdrawalAmount = $state(0);
  let totalInterestAmount = $state(0);
  let initialBalanceError = $state("");
  let annualInterestError = $state("");
  let incrementPercentageError = $state("");
  let exceptedError = $state("");
  let compoundFrequency = $state("Quarterly");
  let ageError = $state("");
  let monthlyWithdrawalError = $state("");

  function changeFrequency() {
    if (monthlyWithdrawal < 0 || monthlyWithdrawal == undefined) {
      monthlyWithdrawalError = "Withdrawal cannot be less than 0";
    }
    if (
      frequencyValue == "% of closing balance, each month" ||
      frequencyValue == "% of closing balance, each year" ||
      frequencyValue == "% of interest earned, monthly" ||
      frequencyValue == "% of earnings monthly"
    ) {
      if (monthlyWithdrawal > 100) {
        monthlyWithdrawalError =
          "Withdrawal percentage cannot be more than 100%";
      }
    } else {
      if (monthlyWithdrawal < 500) {
        monthlyWithdrawalError = "Withdrawal amount must be at least ₹500";
      } else if (monthlyWithdrawal > initialBalance) {
        monthlyWithdrawalError =
          "Withdrawal amount cannot be more than your saving";
      }
    }

    if (
      frequencyValue == "Monthly" ||
      frequencyValue == "Half-yearly" ||
      frequencyValue == "Quarterly" ||
      frequencyValue == "Yearly"
    ) {
      if (percentageFrequency == "") {
        percentageValue = 10;
        percentageFrequency = "% every year";
      } else {
        if (percentageValue > 100) {
          incrementPercentageError = "Interest rate cannot be more than 100%";
        } else if (percentageValue < 0 || percentageValue == undefined) {
          incrementPercentageError = "Interest rate cannot be less than 0%";
        }
      }
    } else {
      percentageValue = 0;
      percentageFrequency = "";
    }
  }

  function convertMonths(totalMonths: number) {
    let years = Math.floor(totalMonths / 12);
    let months = totalMonths % 12;
    let yearTittle = years > 1 ? "Years" : "Year";
    let monthTittle = months > 1 ? "Months" : "Month";
    return `${years} ${yearTittle} and ${months} ${monthTittle}`;
  }

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

  function validate() {
    if (initialBalance < 10000) {
      initialBalanceError = "Amount must be at least 10 thousand";
    } else if (initialBalance > 100000000000) {
      initialBalanceError = "Amount cannot be more than 10 thousand crore.";
    }
    if (annualInterestRate === undefined || annualInterestRate < 0) {
      annualInterestError = "Interest rate cannot be less than 0";
    } else if (annualInterestRate > 500) {
      annualInterestError = "Interest rate must be between 2 and 500";
    }
    if (ageValue < 18 || ageValue == undefined) {
      ageError = "Age should be greater than or equal to 18 years";
    } else if (ageValue > 120) {
      ageError = "Enter the valid age ";
    }
    changeFrequency();
    if (tenureMonths < 1) {
      exceptedError = "Expected years must be at least one.";
    } else if (tenureMonths > 80 * 12) {
      exceptedError = `Expected years cannot be more than ${80 * 12}`;
    }

    return !(
      initialBalanceError ||
      annualInterestError ||
      monthlyWithdrawalError ||
      incrementPercentageError ||
      exceptedError
    );
  }

  function formatDate(input: string) {
    const parts = input.split("-");
    if (parts.length === 2) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = 10;
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  function calculate() {
    const formatted = formatDate(selectedDate);
    if (formatted) startDate = formatted;

    if (validate()) {
      totalWithdrawalAmount = 0;
      totalInterestAmount = 0;
      let balance = initialBalance;
      let totalMonths = tenureMonths;
      let rate = 0;

      if (annualInterestRate !== undefined) {
        if (useAER) {
          rate = (Math.pow(1 + annualInterestRate / 100 / 12, 12) - 1) / 12;
        } else {
          rate = annualInterestRate / 100;
        }
      }

      let start = new Date(startDate);
      breakdown = [];
      let intervalDuration = 0;
      let percentageInterval = 0;
      let tempBalance = monthlyWithdrawal;
      let driveWithdrawal = 0;
      let effectiveRate = 0;

      switch (compoundFrequency) {
        case "Monthly":
          effectiveRate = rate / 12;
          break;
        case "Quarterly":
          effectiveRate = Math.pow(1 + rate / 4, 1 / 3) - 1;
          break;
        case "Half-Yearly":
          effectiveRate = Math.pow(1 + rate / 2, 1 / 6) - 1;
          break;
        case "Yearly":
          effectiveRate = Math.pow(1 + rate, 1 / 12) - 1;
          break;
        default:
          effectiveRate = rate / 12;
      }

      for (let i = 0; i < totalMonths; i++) {
        let openingBalance = balance;
        let interest = openingBalance * effectiveRate;
        totalInterestAmount += interest;
        balance += interest;

        if (intervalDuration == i) {
          intervalDuration += 1;
        } else if (
          (frequencyValue == "% of closing balance, each year" ||
            frequencyValue == "% of interest earned, yearly") &&
          intervalDuration == i
        ) {
          intervalDuration += 12;
        }

        if (percentageFrequency == "% every year" && percentageInterval == i) {
          percentageInterval = i + 12;
        } else if (
          percentageFrequency == "% every two years" &&
          percentageInterval == i
        ) {
          percentageInterval = i + 24;
        }
        totalWithdrawalAmount += tempBalance;

        breakdown.push({
          month: new Date(start),
          openingBalance: openingBalance,
          interestEarned: interest,
          withdrawal: driveWithdrawal,
          closingBalance: balance,
        });

        start.setMonth(start.getMonth() + 1);

        if (balance <= 1) {
          balance = 0;
          break;
        }
      }
      animateTo(totalWithdrawalAmount);

      finalBalance = Math.round(balance).toLocaleString("en-IN");
      if (balance > 0) {
        result = {
          remainingBalance: "Yes",
          tenureMonths,
          finalBalance,
        };
      } else {
        result = {
          remainingBalance: "No",
          tenureMonths,
        };
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
  <div class="grid justify-center px-1 md:px-2 lg:px-0 grid-cols-12 gap-4 lg:gap-[2rem]">
    <div class="relative grid gap-4 md:gap-8 bg-[var(--landing-bg-alt)] text-[var(--form-text)] py-4 lg:py-6 px-3 shadow-md w-full col-span-12 md:col-span-6">
      <div class="grid xl:grid-cols-2 grid-cols-1 gap-4 md:gap-8">
        <div>
          <div class="flex flex-col gap-2 pb-4">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Occupation</p>
            <Select
              selectId="frequency"
              classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--form-bg)] text-[var(--form-text)] border border-[var(--form-border)] rounded-none py-2 w-full"
              optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--landing-bg-card)] text-[var(--form-text)]"
              chevronColor="text-[var(--form-text-muted)] pr-2"
              options={["Government", "Private", "Business", "Other"]}
              bind:selectedValue={selectedOccupations}
            />
          </div>
        </div>

        <div>
          <div class="flex flex-col gap-2 pb-4">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Current age</p>
            <div class="flex items-center border border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text)] font-Paragraph text-minParaFont lg:text-paraFont">
              <input
                onwheel={(event) => event.currentTarget.blur()}
                class="w-full ml-2 pt-2 pb-1 pl-0 pr-2 outline-none bg-transparent text-[var(--form-text)]"
                type="number"
                bind:value={ageValue}
              />
              <p class="p-2">Years</p>
            </div>
          </div>
          {#if ageError}
            <p class="text-dangerColor text-xs">{ageError}</p>
          {/if}
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col">
          <p class="font-FourthHead text-minParaFont lg:text-paraFont">
            What is your current or expected retirement savings
          </p>
          <CurrencyFormateInput
            bind:inputsValue={initialBalance}
            placeHolder="Enter Current value"
            onInput={() => {
              initialBalanceError = "";
              monthlyWithdrawalError = "";
            }}
          />
          {#if initialBalanceError}
            <p class="text-dangerColor text-xs">{initialBalanceError}</p>
          {:else if initialBalance > 0}
            <p class="text-xs text-[var(--form-text-secondary)]">{toWords.convert(initialBalance)}</p>
          {/if}
        </div>
      </div>

      <div class="grid xl:grid-cols-2 grid-cols-1 gap-4 md:gap-8">
        <div class="pb-4">
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">
              Expected tenure <span class="font-Paragraph lg:text-subParaFont text-minParaFont">(savings will support you)</span>
            </p>
            <div class="flex items-center border border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text)] font-Paragraph text-minParaFont lg:text-paraFont">
              <input
                onwheel={(event) => event.currentTarget.blur()}
                bind:value={tenureMonths}
                oninput={() => { exceptedError = ""; }}
                class="w-full pt-2 pb-2 pl-2 pr-0 outline-none bg-transparent text-[var(--form-text)]"
                type="number"
              />
              <p class="p-2">Months</p>
            </div>
          </div>
          {#if exceptedError}
            <p class="text-dangerColor text-xs">{exceptedError}</p>
          {/if}
        </div>

        <div class="pb-4">
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">
              Start Date <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(from when withdrawal starts)</span>
            </p>
            <div>
              <DatePickerYearAndMonth
                bind:startDate={loanStartMinValue}
                bind:endDate={loanEndMaxValue}
                bind:dateValue={selectedDate}
                typeOfStartDate="startDate"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:gap-8">
        <div class="pb-4">
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Tools</p>
            <Select
              selectId="frequency"
              classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--form-bg)] text-[var(--form-text)] border border-[var(--form-border)] rounded-none py-2 w-full"
              optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--landing-bg-card)] text-[var(--form-text)]"
              chevronColor="text-[var(--form-text-muted)] pr-2"
              options={[
                "Systematic Investment Plan(SIP)",
                "Recurring Deposit(RD)",
                "Fixed Deposit(FD)",
                "Other",
              ]}
              bind:selectedValue={toolType}
              onChange={() => { toolFunction(); }}
            />
          </div>
        </div>

        {#if toolType == "Systematic Investment Plan(SIP)"}
          <div class="pb-4">
            <div class="flex flex-col gap-2">
              <p class="font-FourthHead text-minParaFont lg:text-paraFont">
                Your risk appetite <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(risk level)</span>
              </p>
              <Select
                selectId="frequency"
                classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--form-bg)] text-[var(--form-text)] border border-[var(--form-border)] rounded-none py-2 w-full"
                optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--landing-bg-card)] text-[var(--form-text)]"
                chevronColor="text-[var(--form-text-muted)] pr-2"
                options={["Low", "Medium", "High"]}
                bind:selectedValue={riskLevel}
                onChange={() => { toolFunction(); }}
              />
            </div>
          </div>
        {:else}
          <div class="pb-4">
            <div class="flex flex-col gap-2">
              <p class="font-FourthHead text-minParaFont lg:text-paraFont">
                Expected annual return <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(Rate of Interest)</span>
              </p>
              <div class="flex items-center border border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text)] font-Paragraph text-minParaFont lg:text-paraFont">
                <p class="p-2 font-FourthHead">%</p>
                <input
                  onwheel={(event) => event.currentTarget.blur()}
                  bind:value={annualInterestRate}
                  oninput={() => { annualInterestError = ""; }}
                  class="w-full pt-2 pb-2 pl-0 pr-2 outline-none bg-transparent text-[var(--form-text)]"
                  type="number"
                />
              </div>
            </div>
            {#if annualInterestError}
              <p class="text-dangerColor text-xs">{annualInterestError}</p>
            {/if}
          </div>
        {/if}
      </div>

      {#if toolType == "Systematic Investment Plan(SIP)"}
        <div class="pb-4">
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">
              Expected annual return <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(Rate of Interest)</span>
            </p>
            <div class="flex items-center border border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text)] font-Paragraph text-minParaFont lg:text-paraFont">
              <p class="p-2 font-FourthHead">%</p>
              <input
                onwheel={(event) => event.currentTarget.blur()}
                bind:value={annualInterestRate}
                oninput={() => { annualInterestError = ""; }}
                class="w-full pt-2 pb-2 pl-0 pr-2 outline-none bg-transparent text-[var(--form-text)]"
                type="number"
              />
            </div>
          </div>
          {#if annualInterestError}
            <p class="text-dangerColor text-xs">{annualInterestError}</p>
          {/if}
        </div>
      {/if}

      <div class="pb-4">
        <div class="flex flex-col gap-2">
          <p class="font-FourthHead text-minParaFont lg:text-paraFont">Compound Interest Frequency</p>
          <Select
            selectId="frequency"
            classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--form-bg)] text-[var(--form-text)] border border-[var(--form-border)] rounded-none py-2 w-full"
            optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--landing-bg-card)] text-[var(--form-text)]"
            chevronColor="text-[var(--form-text-muted)] pr-2"
            options={["Monthly", "Quarterly", "Half-Yearly", "Yearly"]}
            bind:selectedValue={compoundFrequency}
          />
        </div>
        {#if compoundFrequency != "Quarterly"}
          <p class="mt-2 font-Paragraph text-subParaFont text-[var(--form-text)]">
            * Most Indian banks calculate interest on a quarterly basis
          </p>
        {/if}
      </div>

      <div class="grid grid-cols-1 gap-4 md:gap-8">
        <div class="">
          <div class="flex flex-col gap-2">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont">
              Withdrawal Amount <span class="font-FourthHead text-minParaFont lg:text-paraFont">
                {#if frequencyValue == "Monthly" || frequencyValue == "Half-yearly" || frequencyValue == "Quarterly" || frequencyValue == "Yearly"}
                  (₹)
                {:else}
                  (%)
                {/if}
              </span>
            </p>
            <div class="flex items-center border border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text)] font-Paragraph text-minParaFont lg:text-paraFont">
              {#if frequencyValue == "Monthly" || frequencyValue == "Half-yearly" || frequencyValue == "Quarterly" || frequencyValue == "Yearly"}
                <p class="p-2 font-FourthHead">₹</p>
              {:else}
                <p class="p-2 font-FourthHead">%</p>
              {/if}
              <input
                onwheel={(event) => event.currentTarget.blur()}
                bind:value={monthlyWithdrawal}
                oninput={() => { monthlyWithdrawalError = ""; }}
                class="w-full pt-2 pb-2 pl-0 pr-2 outline-none bg-transparent text-[var(--form-text)]"
                type="number"
              />
            </div>
          </div>
          {#if monthlyWithdrawalError}
            <p class="text-dangerColor text-xs">{monthlyWithdrawalError}</p>
          {:else if monthlyWithdrawal > 0}
            <p class="text-xs text-[var(--form-text-secondary)]">{toWords.convert(monthlyWithdrawal)}</p>
          {/if}
        </div>

        <div class="pb-4">
          <div class="input-group">
            <p class="font-FourthHead text-minParaFont lg:text-paraFont mb-2">Withdrawal Frequency</p>
            <Select
              selectId="frequency"
              classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--form-bg)] text-[var(--form-text)] border border-[var(--form-border)] rounded-none py-2 w-full"
              optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--landing-bg-card)] text-[var(--form-text)]"
              chevronColor="text-[var(--form-text-muted)] pr-2"
              options={[
                {
                  heading: "Money withdrawals",
                  items: ["Monthly", "Quarterly", "Half-Yearly", "Yearly"],
                },
                {
                  heading: "Percentage of closing balance",
                  items: [
                    "% of closing balance, each month",
                    "% of closing balance, each year",
                  ],
                },
                {
                  heading: "Percentage of interest earned ",
                  items: [
                    "% of interest earned, monthly",
                    "% of interest earned, yearly",
                  ],
                },
              ]}
              bind:selectedValue={frequencyValue}
              onChange={() => { changeFrequency(); }}
            />
          </div>
        </div>
      </div>

      {#if frequencyValue == "Monthly" || frequencyValue == "Half-yearly" || frequencyValue == "Quarterly" || frequencyValue == "Yearly"}
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2 pb-4">
              <p class="font-FourthHead text-minParaFont lg:text-paraFont">Increment In Withdrawal</p>
              <div class="flex items-center border border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text)] font-FourthHead text-minParaFont lg:text-paraFont">
                <p class="p-2 font-FourthHead">%</p>
                <input
                  onwheel={(event) => event.currentTarget.blur()}
                  bind:value={percentageValue}
                  oninput={() => { incrementPercentageError = ""; }}
                  class="w-full pt-2 pb-2 pl-0 pr-2 outline-none font-Paragraph text-minParaFont lg:text-paraFont bg-transparent text-[var(--form-text)]"
                  type="number"
                />
              </div>
              {#if incrementPercentageError}
                <p class="text-xs text-dangerColor">{incrementPercentageError}</p>
              {/if}
            </div>
          </div>
          <div>
            <div class="input-group">
              <p class="font-FourthHead text-minParaFont lg:text-paraFont mb-2">Increment Frequency</p>
              <Select
                selectId="frequency"
                classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--form-bg)] text-[var(--form-text)] border border-[var(--form-border)] rounded-none py-2 w-full"
                optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-[var(--landing-bg-card)] text-[var(--form-text)]"
                chevronColor="text-[var(--form-text-muted)] pr-2"
                options={[
                  {
                    heading: "Increase the withdrawal, by %",
                    items: ["% every year", "% every two years"],
                  },
                ]}
                bind:selectedValue={percentageFrequency}
              />
            </div>
          </div>
        </div>
      {/if}

      <div class="text-center">
        <button
          class="w-full rounded-full bg-btnBg border px-[3rem] py-3 font-Paragraph text-minParaFont lg:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
          onclick={calculate}>Calculate</button
        >
      </div>
    </div>

    {#if breakdown.length > 0}
      <div id="resultView" class="flex flex-col py-[2rem] lg:py-[4rem] gap-[2rem] lg:gap-[4rem] bg-darkColor col-span-12 md:col-span-6">
        <div class="flex flex-col items-center justify-center gap-2 text-center text-[var(--form-text)] p-[2rem] bg-[var(--landing-bg-alt)] border-x border-[var(--form-border)] border-dotted lg:border-none w-full mx-auto">
          {#if result}
            {#if result.remainingBalance == "Yes"}
              <p class="w-full font-FifthHead text-miniHeadFont md:text-mobHeadFont">
                {result.tenureMonths} months<br />
                <span class="font-Paragraph text-minParaFont lg:text-paraFont">That's how long your savings will support you.</span>
              </p>
            {:else}
              <p class="w-full font-FifthHead text-miniHeadFont md:text-mobHeadFont">
                {convertMonths(breakdown.length)}<br>
                <span class="font-Paragraph text-minParaFont lg:text-paraFont">Your money will run out before your expected duration.</span>
              </p>
            {/if}
          {/if}

          <div class="h-[2px] w-full mt-3 bg-gradient-to-r from-transparent via-darkColor to-transparent"></div>

          <p class="font-FifthHead text-miniHeadFont md:text-mobHeadFont"></p>
          <p class="font-Paragraph text-minParaFont lg:text-paraFont">
            Total Withdrawal Amount : <span class="bg-btnBg px-2 font-FourthHead">
              ₹ {Math.round($count).toLocaleString("en-IN")}
            </span>
          </p>
          {#if result}
            {#if result.remainingBalance == "Yes"}
              <p class="font-Paragraph text-minParaFont lg:text-paraFont">
                Remaining Balance After 120 Months: <span class="bg-btnBg px-2 font-FourthHead">
                  ₹ {result.finalBalance}
                </span>
              </p>
            {/if}
          {/if}
        </div>

        <div class="flex flex-col text-center gap-4 bg-black p-6 text-white w-auto mx-4">
          <div class="flex justify-between border-b border-gray-700 pb-5 py-2">
            <p class="font-FifthHead text-minParaFont lg:text-paraFont">Initial balance</p>
            <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead">
              ₹ {Math.round(initialBalance).toLocaleString("en-IN")}
            </p>
          </div>
          <div class="flex justify-between border-b border-gray-700 pb-5 py-2">
            <p class="font-FifthHead text-minParaFont lg:text-paraFont">Total Interest</p>
            <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead">
              ₹ {Math.round(totalInterestAmount).toLocaleString("en-IN")}
            </p>
          </div>
          <div class="flex justify-between py-2">
            <p class="font-FifthHead text-minParaFont lg:text-paraFont">End Date</p>
            <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead">
              {breakdown[breakdown.length - 1].month.toLocaleDateString("en-US", { year: "numeric", month: "short" })}
            </p>
          </div>
        </div>
      </div>
    {/if}

    <div class="relative mx-auto flex w-full flex-col gap-4 overflow-hidden mb-8 col-span-12 px-4">
      <div class="w-full flex-col gap-2 text-black">
        <div class="mx-auto space-y-0 xs:space-y-6">
          <div class="relative mx-auto flex w-full flex-col gap-4">
            <div class="w-full flex-col gap-2 text-darkColor">
              <div class="mx-auto w-full">
                <div class="mx-auto h-[26rem] w-full border border-black overflow-x-auto md:h-[32rem]">
                  <div class="w-full">
                    <div class="w-full sticky min-w-[600px] top-0 z-10 grid overflow-x-auto grid-cols-5 bg-darkColor text-center text-white">
                      {#each tableHeadLargeScreen as item}
                        <div class="w-full p-2 font-FifthHead text-minParaFont lg:text-subParaFont">{item}</div>
                      {/each}
                    </div>
                    <div class="grid min-w-[600px] overflow-x-auto grid-cols-5 border-b border-white text-center">
                      {#each breakdown as entry}
                        <div class="p-2 border-b border-black font-Paragraph text-minParaFont">
                          {entry.month.toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                        </div>
                        <div class="p-2 border-b border-black font-Paragraph text-minParaFont">
                          {Number(entry.openingBalance).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </div>
                        <div class="p-2 border-b border-black font-Paragraph text-minParaFont">
                          {Number(entry.interestEarned).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </div>
                        <div class="p-2 border-b border-black font-Paragraph text-minParaFont">
                          {Number(entry.withdrawal).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </div>
                        <div class="p-2 border-b border-black font-Paragraph text-minParaFont">
                          {Number(entry.closingBalance).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
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
