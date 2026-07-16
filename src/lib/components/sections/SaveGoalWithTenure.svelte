<script lang="ts">
    import { onMount } from "svelte";
    import { ToWords } from "to-words";
    import Select from '$lib/components/ui/Select.svelte';
    import CurrencyFormateInput from '$lib/components/sections/CurrencyFormateInput.svelte';
    import config from "$lib/data/website/moneyMapCalculators.json";

    const { common, saveGoalWithTenure: calcConfig } = config;
    const toWords = new ToWords();

    let { toolsValue = calcConfig.defaults.toolsValue } = $props();

    let initialSavings = $state(calcConfig.defaults.initialSavings);
    let monthlyContribution = $state(calcConfig.defaults.monthlyContribution);
    let annualInterestRate = $state<number | undefined>(calcConfig.defaults.annualInterestRate);
    let savingsGoal = $state(calcConfig.defaults.savingsGoal);
    let riskLevel = $state(calcConfig.defaults.riskLevel);

    let compoundFrequency = $state(calcConfig.defaults.compoundFrequency);
    let investmentFrequency = $state(calcConfig.defaults.investmentFrequency);
    let tenure = $state(calcConfig.defaults.tenure);

    function toolFunction() {
        annualInterestRateError = "";
        investmentFrequency = "Monthly";
        if (toolsValue == common.tools[0]) {
            if (riskLevel == "Low") {
                annualInterestRate = common.interestRates.SIP.Low;
            } else if (riskLevel == "Medium") {
                annualInterestRate = common.interestRates.SIP.Medium;
            } else {
                annualInterestRate = common.interestRates.SIP.High;
            }
        } else if (toolsValue == common.tools[1]) {
            annualInterestRate = common.interestRates.RD;
        } else if (toolsValue == common.tools[2]) {
            annualInterestRate = common.interestRates.FD;
        } else if (toolsValue == common.tools[3]) {
            annualInterestRate = undefined;
        }
    }

    let occupationArray = common.occupations;
    let ageValue = $state(calcConfig.defaults.ageValue);
    let selectedOccupations = $state(calcConfig.defaults.selectedOccupation);

    function convertMonths(totalMonths: number) {
        let yearsNum = Math.floor(totalMonths / 12);
        let monthsNum = totalMonths % 12;
        let yearTitle = yearsNum > 1 ? "Years" : "Year";
        let monthTitle = monthsNum > 1 ? "Months" : "Month";
        return `${yearsNum} ${yearTitle} and ${monthsNum} ${monthTitle}`;
    }

    let monthlyContributionError = $state("");
    let annualInterestRateError = $state("");
    let tenureError = $state("");
    let initialSavingsError = $state("");
    let ageError = $state("");

    function validate() {
        const v = calcConfig.validation;
        if (tenure < v.tenureMin.value || tenure === undefined) {
            tenureError = v.tenureMin.message;
        } else if (tenure > v.tenureMax.value) {
            tenureError = v.tenureMax.message;
        } else {
            tenureError = "";
        }

        if (annualInterestRate === undefined || annualInterestRate < v.interestMin.value) {
            annualInterestRateError = v.interestMin.message;
        } else if (annualInterestRate > v.interestMax.value) {
            annualInterestRateError = v.interestMax.message;
        } else {
            annualInterestRateError = "";
        }

        if (monthlyContribution < v.contributionMin.value || monthlyContribution === undefined) {
            monthlyContributionError = v.contributionMin.message;
        } else if (monthlyContribution > savingsGoal) {
            monthlyContributionError = v.contributionMax.message;
        } else {
            monthlyContributionError = "";
        }

        if (initialSavings < v.savingsMin.value) {
            initialSavingsError = v.savingsMin.message;
        } else if (initialSavings > savingsGoal) {
            initialSavingsError = v.savingsMax.message;
        } else {
            initialSavingsError = "";
        }

        if (ageValue < v.ageMin.value || ageValue === undefined) {
            ageError = v.ageMin.message;
        } else if (ageValue > v.ageMax.value) {
            ageError = v.ageMax.message;
        } else {
            ageError = "";
        }

        return !(
            tenureError ||
            annualInterestRateError ||
            monthlyContributionError ||
            initialSavingsError ||
            ageError
        );
    }

    const freqMap: Record<string, number> = {
        Monthly: 12,
        Quarterly: 4,
        "Half-Yearly": 2,
        Yearly: 1,
    };
    let maturityAmount = $state(0);
    let totalInvestment = $state(0);
    let totalReturns = $state(0);

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

    function calculateMonthsToSave() {
        if (validate()) {
            const depositsPerYear = freqMap[investmentFrequency];
            const compoundPeriodsPerYear = freqMap[compoundFrequency];
            const totalDeposits = depositsPerYear * tenure;
            const r = (annualInterestRate || 0) / 100;

            let sum = 0;
            for (let i = 0; i < totalDeposits; i++) {
                const depositTime = i / depositsPerYear;
                const periodsToGrow = compoundPeriodsPerYear * (tenure - depositTime);
                sum += monthlyContribution * Math.pow(1 + r / compoundPeriodsPerYear, periodsToGrow);
            }
            maturityAmount = sum;
            totalInvestment = monthlyContribution * totalDeposits;
            totalReturns = maturityAmount - totalInvestment;
            scrollFunction();
        }
    }

    onMount(() => {
        toolFunction();
        calculateMonthsToSave();
    });
</script>

<section class="w-full mx-auto">
    <div class="grid justify-center md:px-2 lg:px-0 grid-cols-12 gap-4 lg:gap-[2rem]">
        <div class="relative grid gap-4 md:gap-8 bg-mainBg py-4 lg:py-6 px-3 shadow-md w-full col-span-12 md:col-span-6">
            <div class="grid md:grid-cols-2 gap-4 pb-4">
                <div>
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.occupation}</p>
                        <Select
                            selectId="frequency"
                            classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                            optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                            chevronColor="text-black pr-2"
                            options={common.occupations}
                            bind:selectedValue={selectedOccupations}
                        />
                    </div>
                </div>

                <div>
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.currentAge}</p>
                        <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                            <input
                                onwheel={(event) => event.currentTarget.blur()}
                                bind:value={ageValue}
                                class="w-full ml-2 pt-2 pb-1 pl-0 pr-2 outline-none"
                                type="number"
                            />
                            <p class="p-2">{common.labels.ageUnit}</p>
                        </div>
                    </div>
                    {#if ageError}
                        <p class="text-dangerColor text-xs">{ageError}</p>
                    {/if}
                </div>
            </div>

            <div class="pb-4">
                <div class="flex flex-col gap-2 mt-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.tools}</p>
                    <Select
                        selectId="frequency"
                        classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                        optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                        chevronColor="text-black pr-2"
                        options={common.tools}
                        bind:selectedValue={toolsValue}
                        onChange={() => toolFunction()}
                    />
                </div>
            </div>

            {#if toolsValue == common.tools[0]}
                <div class="pb-4">
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">
                            {common.labels.riskAppetite} <span class="font-Paragraph text-minParaFont lg:text-paraFont">{common.labels.riskSubLabel}</span>
                        </p>
                        <Select
                            selectId="frequency"
                            classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                            optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                            chevronColor="text-black pr-2"
                            options={common.riskLevels}
                            bind:selectedValue={riskLevel}
                            onChange={() => { toolFunction(); }}
                        />
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                    <div class="">
                        <div class="flex flex-col gap-2">
                            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Deposit <span class="font-Paragraph text-minParaFont lg:text-paraFont">(₹)</span></p>
                            <CurrencyFormateInput
                                bind:inputsValue={monthlyContribution}
                                placeHolder="Enter value"
                                onInput={() => { monthlyContributionError = ""; }}
                            />
                        </div>
                        {#if monthlyContributionError}
                            <p class="text-xs text-dangerColor">{monthlyContributionError}</p>
                        {:else if monthlyContribution > 0}
                            <p class="text-xs text-black">{toWords.convert(monthlyContribution)}</p>
                        {/if}
                    </div>
                    <div>
                        <div class="flex flex-col gap-2">
                            <p class="font-FourthHead text-minParaFont lg:text-paraFont">Deposit Frequency</p>
                            <Select
                                selectId="frequency"
                                classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                                optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                                chevronColor="text-black pr-2"
                                options={common.investmentFrequencyOptions}
                                bind:selectedValue={investmentFrequency}
                            />
                        </div>
                    </div>
                </div>
            {:else}
                <div class="pb-4">
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">Monthly contribution <span class="font-FourthHead text-minParaFont lg:text-paraFont">(₹)</span></p>
                        <CurrencyFormateInput
                            bind:inputsValue={monthlyContribution}
                            placeHolder="Enter value"
                            onInput={() => { monthlyContributionError = ""; }}
                        />
                    </div>
                    {#if monthlyContributionError}
                        <p class="text-xs text-dangerColor">{monthlyContributionError}</p>
                    {:else if monthlyContribution > 0}
                        <p class="text-xs text-black px-2">{toWords.convert(monthlyContribution)}</p>
                    {/if}
                </div>
            {/if}

            <div class="pb-4">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">
                        Expected annual return <span class="font-Paragraph text-minParaFont lg:text-paraFont">(Rate of Interest)</span>
                    </p>
                    <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                        <p class="p-2 font-FourthHead">%</p>
                        <input
                            onwheel={(event) => event.currentTarget.blur()}
                            bind:value={annualInterestRate}
                            oninput={() => { annualInterestRateError = ""; }}
                            class="w-full pt-2 pb-2 pl-0 pr-2 outline-none"
                            type="number"
                        />
                    </div>
                </div>
                {#if annualInterestRateError}
                    <p class="text-xs text-dangerColor">{annualInterestRateError}</p>
                {/if}
            </div>

            <div class="pb-4">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.compoundFrequency}</p>
                    <Select
                        selectId="frequency"
                        classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                        optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                        chevronColor="text-black pr-2"
                        options={common.investmentFrequencyOptions}
                        bind:selectedValue={compoundFrequency}
                    />
                </div>
                {#if compoundFrequency != "Quarterly"}
                    <p class="mt-2 font-Paragraph text-subParaFont text-black">
                        {common.compoundFrequencyNote}
                    </p>
                {/if}
            </div>

            <div class="">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.investFor}</p>
                    <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                        <input
                            onwheel={(event) => event.currentTarget.blur()}
                            bind:value={tenure}
                            oninput={() => { tenureError = ""; }}
                            class="w-full ml-2 pt-2 pb-2 pl-0 pr-2 outline-none"
                            type="number"
                        />
                        <p class="p-2">{common.labels.ageUnit}</p>
                    </div>
                </div>
                {#if tenureError}
                    <p class="text-dangerColor text-xs">{tenureError}</p>
                {/if}
            </div>

            <div class="text-center pt-[1rem]">
                <button
                    class="w-full rounded-full bg-btnBg border px-[3rem] py-3 font-Paragraph text-minParaFont lg:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
                    onclick={calculateMonthsToSave}>{common.labels.calculate}</button
                >
            </div>
        </div>

        <div id="resultView" class="flex flex-col py-[2rem] lg:py-[4rem] gap-[2rem] lg:gap-[4rem] bg-darkColor col-span-12 md:col-span-6">
            <div class="mt-[1rem] flex flex-col items-center justify-center gap-2 text-center text-white md:mt-0 animate-fade">
                <div class="flex flex-wrap items-center justify-center gap-2 text-center text-black p-[2rem] bg-mainBg border-x border-darkColor border-dotted lg:border-none w-full mx-auto">
                    <p class="w-full font-FifthHead text-miniHeadFont md:text-mobHeadFont">
                        ₹ {Math.round(maturityAmount).toLocaleString("en-IN")}
                    </p>
                    <span class="font-Paragraph text-minParaFont lg:text-paraFont">{calcConfig.resultLabels.resultText}</span>
                    <span class="bg-btnBg px-2 font-FourthHead">{tenure} years</span>
                </div>
            </div>
            <div class="flex flex-col gap-4 bg-black p-6 w-auto mx-4">
                <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                    <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">{calcConfig.resultLabels.totalDurations}</p>
                    <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">{tenure * 12} months</p>
                </div>
                <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                    <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">{calcConfig.resultLabels.totalDepositAmount}</p>
                    <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                        ₹ {Math.round(totalInvestment).toLocaleString("en-IN")}
                    </p>
                </div>
                <div class="flex justify-between text-center py-2">
                    <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">{calcConfig.resultLabels.totalInterestAmount}</p>
                    <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                        ₹ {Math.round(totalReturns).toLocaleString("en-IN")}
                    </p>
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
