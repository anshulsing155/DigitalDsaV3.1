<script lang="ts">
    import { onMount } from "svelte";
    import { ToWords } from "to-words";
    import Select from "$lib/components/website/Select.svelte";
    import CurrencyFormateInput from "$lib/components/website/CurrencyFormateInput.svelte";
    import config from "$lib/data/website/moneyMapCalculators.json";

    const { common, findDeposit } = config;
    const toWords = new ToWords();

    let goalAmount = $state(findDeposit.defaults.goalAmount);
    let annualRate = $state(findDeposit.defaults.annualRate);
    let tenure = $state(findDeposit.defaults.tenure);
    let compoundingFrequency = $state(findDeposit.defaults.compoundingFrequency);
    let monthlyDeposit = $state(0);
    let totalDeposit = $state(0);
    let totalInterestEarned = $state(0);
    let resultGoalAmount = $state(0);
    let resultInTenure = $state(0);
    let occupationArray = common.occupations;
    let ageValue = $state(findDeposit.defaults.ageValue);
    let maxAge = $state(findDeposit.defaults.maxAge);
    let selectedOccupations = $state(findDeposit.defaults.selectedOccupation);
    let tempSelectedValue = $state(findDeposit.defaults.selectedFrequency);

    function findMaxAge() {
        const retAge = common.retirementAges[selectedOccupations as keyof typeof common.retirementAges];
        if (retAge) {
            maxAge = retAge;
        }
        if (ageValue > maxAge) {
            ageValue = maxAge;
        }
        if (tenure > maxAge - ageValue) {
            tenure = maxAge - ageValue;
        }
    }

    let compoundInterestFrequency = common.compoundFrequencies;

    let { toolsValue = findDeposit.defaults.toolsValue } = $props();
    let riskLevel = $state(findDeposit.defaults.riskLevel);

    let goalAmountError = $state("");
    let interestError = $state("");
    let tenureError = $state("");
    let ageError = $state("");

    function toolFunction() {
        interestError = "";
        if (toolsValue == common.tools[0]) {
            if (riskLevel == "Low") {
                annualRate = common.interestRates.SIP.Low;
            } else if (riskLevel == "Medium") {
                annualRate = common.interestRates.SIP.Medium;
            } else {
                annualRate = common.interestRates.SIP.High;
            }
        } else if (toolsValue == common.tools[1]) {
            annualRate = common.interestRates.RD;
        } else if (toolsValue == common.tools[2]) {
            annualRate = common.interestRates.FD;
        } else if (toolsValue == common.tools[3]) {
            annualRate = common.interestRates.Other;
        }
    }

    function validate() {
        toolFunction();
        const v = findDeposit.validation;
        if (goalAmount < v.goalAmountMin.value) {
            goalAmountError = v.goalAmountMin.message;
        } else if (goalAmount > v.goalAmountMax.value) {
            goalAmountError = v.goalAmountMax.message;
        } else {
            goalAmountError = "";
        }

        if (annualRate < v.interestMin.value || annualRate === undefined) {
            interestError = v.interestMin.message;
        } else if (annualRate > v.interestMax.value) {
            interestError = v.interestMax.message;
        } else {
            interestError = "";
        }

        if (tenure <= v.tenureMin.value) {
            tenureError = v.tenureMin.message;
        } else if (tenure > v.tenureMax.value) {
            tenureError = v.tenureMax.message;
        } else {
            tenureError = "";
        }

        if (ageValue < v.ageMin.value) {
            ageError = v.ageMin.message;
        } else if (ageValue > v.ageMax.value) {
            ageError = v.ageMax.message;
        } else {
            ageError = "";
        }

        return !(goalAmountError || interestError || tenureError || ageError);
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

    function calculateMonthlyDeposit() {
        if (validate()) {
            resultGoalAmount = goalAmount;
            resultInTenure = tenure;
            let monthlyInterest = annualRate / 100;
            let frequency = Number(compoundingFrequency);
            let t = tenure;

            let numerator = Math.round(goalAmount * (monthlyInterest / frequency));
            let denominator = Math.pow(1 + monthlyInterest / frequency, frequency * t) - 1;
            denominator = parseFloat(denominator.toFixed(2));

            if (denominator > 0) {
                monthlyDeposit = numerator / denominator;
                monthlyDeposit = (monthlyDeposit * frequency) / 12;
                totalDeposit = monthlyDeposit * (tenure * 12);
                totalInterestEarned = goalAmount - totalDeposit;
            } else {
                monthlyDeposit = 0;
                totalDeposit = 0;
            }
            scrollFunction();
        }
    }

    onMount(() => {
        calculateMonthlyDeposit();
    });
</script>

<section class="w-full mx-auto">
    <div class="grid justify-center md:px-2 lg:px-0 grid-cols-12 gap-4 lg:gap-[2rem]">
        <div class="relative grid gap-4 md:gap-8 bg-mainBg py-4 lg:py-6 px-3 shadow-md w-full col-span-12 md:col-span-6">
            <div class="grid xl:grid-cols-2 grid-cols-1 gap-4 pb-4">
                <div>
                    <div class="flex flex-col gap-2 pb-2 lg:pb-0">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.occupation}</p>
                        <Select
                            selectId="frequency"
                            classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                            optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                            chevronColor="text-black pr-2"
                            options={common.occupations}
                            bind:selectedValue={selectedOccupations}
                            onChange={() => { findMaxAge(); }}
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
                                oninput={() => { findMaxAge(); ageError = ""; }}
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

            <div class="grid grid-cols-1 gap-4">
                <div class="pb-4">
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">
                            {common.labels.savingGoal} <span class="font-Paragraph text-minParaFont lg:text-paraFont">{common.labels.savingGoalSubLabel}</span>
                        </p>
                        <CurrencyFormateInput
                            bind:inputsValue={goalAmount}
                            placeHolder="Enter value"
                            onInput={() => { goalAmountError = ""; }}
                        />
                    </div>
                    {#if goalAmountError}
                        <p class="text-xs text-dangerColor">{goalAmountError}</p>
                    {:else if goalAmount > 0}
                        <p class="text-xs text-black">{toWords.convert(goalAmount)}</p>
                    {/if}
                </div>

                <div class="pb-4">
                    <div class="flex flex-col gap-2">
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
            {/if}

            <div class="pb-4">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.annualInterestRate}</p>
                    <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                        <p class="p-2 font-FourthHead">%</p>
                        <input
                            onwheel={(event) => event.currentTarget.blur()}
                            bind:value={annualRate}
                            oninput={() => { interestError = ""; }}
                            class="w-full pt-2 pb-2 pl-0 pr-2 outline-none"
                            type="number"
                        />
                    </div>
                </div>
                {#if interestError}
                    <p class="text-xs text-dangerColor">{interestError}</p>
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
                        options={common.frequencyOptions}
                        bind:selectedValue={tempSelectedValue}
                        onChange={() => {
                            let tempData = compoundInterestFrequency.find(
                                (item) => item.label == tempSelectedValue
                            );
                            if (tempData) compoundingFrequency = tempData.value;
                        }}
                    />
                </div>
            </div>

            <div class="">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">{common.labels.tenure}</p>
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
                    <p class="text-xs text-dangerColor">{tenureError}</p>
                {/if}
            </div>

            <div class="text-center pt-[1rem]">
                <button
                    class="w-full rounded-full bg-btnBg border px-[3rem] py-3 font-Paragraph text-minParaFont lg:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
                    onclick={calculateMonthlyDeposit}>{common.labels.calculate}</button
                >
            </div>
        </div>

        <div id="resultView" class="flex flex-col py-[2rem] lg:py-[4rem] gap-[2rem] lg:gap-[4rem] bg-darkColor col-span-12 md:col-span-6 animate-fade">
            <div class="flex flex-wrap items-center justify-center gap-2 text-center text-black p-[2rem] bg-mainBg border-x border-darkColor border-dotted lg:border-none w-full mx-auto">
                <p class="w-full font-FifthHead text-miniHeadFont md:text-mobHeadFont">
                    ₹ {Math.round(monthlyDeposit).toLocaleString("en-IN")}
                </p>
                <p class="max-w-[20rem] font-Paragraph text-minParaFont lg:text-paraFont">
                    {findDeposit.resultLabels.resultText}
                    <span class="bg-btnBg px-2 font-FourthHead">
                        {Math.round(resultInTenure).toLocaleString("en-IN")} years
                    </span>
                </p>
            </div>

            <div class="flex flex-col gap-4 bg-black p-6 w-auto mx-4">
                <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                    <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">{findDeposit.resultLabels.monthlyDeposit}</p>
                    <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                        ₹ {Math.round(monthlyDeposit).toLocaleString("en-IN")}
                    </p>
                </div>
                <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                    <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">{findDeposit.resultLabels.interestEarned}</p>
                    <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                        ₹ {Math.round(totalInterestEarned).toLocaleString("en-IN")}
                    </p>
                </div>
                <div class="flex justify-between text-center py-2">
                    <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">{findDeposit.resultLabels.totalDeposit}</p>
                    <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                        ₹ {Math.round(totalDeposit).toLocaleString("en-IN")}
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
