<script lang="ts">
    import { onMount } from "svelte";
    import { ToWords } from "to-words";
    import Select from "$lib/components/website/Select.svelte";
    import CurrencyFormateInput from "$lib/components/website/CurrencyFormateInput.svelte";
    import config from "$lib/data/website/moneyMapCalculators.json";

    const { common, fdWithSavingGoal: calcConfig } = config;
    const toWords = new ToWords();

    let { toolType = calcConfig.defaults.toolType } = $props();

    let savingGoal = $state(calcConfig.defaults.savingGoal);
    let rate = $state(calcConfig.defaults.rate);
    let years = $state(calcConfig.defaults.years);

    let frequency = $state(calcConfig.defaults.frequency);
    let occupationArray = common.occupations;
    let ageValue = $state(calcConfig.defaults.ageValue);
    let selectedOccupations = $state(calcConfig.defaults.selectedOccupation);

    let specifySelection = $state(calcConfig.defaults.specifySelection);
    let totalInvestmentAmount = $state(calcConfig.defaults.totalInvestmentAmount);

    function getCompoundingPeriods() {
        return frequency === "Monthly"
            ? 12
            : frequency === "Quarterly"
              ? 4
              : frequency === "Half-Yearly"
                ? 2
                : 1;
    }
    let savingGoalError = $state("");
    let rateError = $state("");
    let yearError = $state("");
    let ageError = $state("");
    let requiredInvestment = $state(0);
    let totalInterest = $state(0);
    let tenureMonths = $state(0);
    let investmentError = $state("");

    function convertMonths(totalMonths: number) {
        let yearsNum = Math.floor(totalMonths / 12);
        let monthsNum = totalMonths % 12;
        let yearTitle = yearsNum > 1 ? "Years" : "Year";
        let monthTitle = monthsNum > 1 ? "Months" : "Month";
        return `${yearsNum} ${yearTitle} and ${monthsNum} ${monthTitle}`;
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

    function validation() {
        if (savingGoal < 100) {
            savingGoalError = "Investment should be greater than or equal to 100";
        } else if (savingGoal > 1000000000000) {
            savingGoalError = "Investment should be less than or equal to 10 thousand crore";
        } else {
            savingGoalError = "";
        }

        if (rate < 0) {
            rateError = "Interest rate should be greater than or equal to 0";
        } else if (rate > 100) {
            rateError = "Interest rate should be less than or equal to 100";
        } else {
            rateError = "";
        }

        if (years < 1) {
            yearError = "Year should be greater than or equal to 1";
        } else if (years > 100) {
            yearError = "Year should be less than or equal to 100";
        } else {
            yearError = "";
        }

        if (ageValue < 18 || ageValue === undefined) {
            ageError = "Age should be greater than or equal to 18 years";
        } else if (ageValue > 120) {
            ageError = "Enter the valid age ";
        } else {
            ageError = "";
        }

        if (specifySelection === "Investment Amount") {
            if (totalInvestmentAmount > savingGoal) {
                investmentError = "Investment Amount should be less than saving goal amount";
            } else if (totalInvestmentAmount < 100 || totalInvestmentAmount === undefined) {
                investmentError = "Investment Amount should be greater than or equal to 500";
            } else {
                investmentError = "";
            }
        } else {
            investmentError = "";
        }

        return !(savingGoalError || rateError || yearError || ageError || investmentError);
    }

    function calculate() {
        if (validation()) {
            if (specifySelection === "Tenure") {
                const compoundingPeriods = getCompoundingPeriods();
                const factor = Math.pow(
                    1 + rate / 100 / compoundingPeriods,
                    compoundingPeriods * years
                );
                requiredInvestment = savingGoal / factor;
                totalInterest = savingGoal - requiredInvestment;
            } else {
                let n = getCompoundingPeriods();
                let ratePerPeriod = rate / 100 / n;
                let tenureYears =
                    Math.log(savingGoal / totalInvestmentAmount) /
                    (n * Math.log(1 + ratePerPeriod));
                tenureMonths = Math.round(tenureYears * 12);
                totalInterest = Math.round(savingGoal - totalInvestmentAmount);
                if (totalInterest < 0) {
                    totalInterest = 0;
                }
            }
            scrollFunction();
        }
    }

    onMount(() => {
        calculate();
    });
</script>

<section class="w-full mx-auto">
    <div class="grid justify-center px-1 md:px-2 lg:px-0 grid-cols-12 gap-4 lg:gap-[2rem]">
        <div class="relative grid gap-4 md:gap-8 bg-mainBg py-4 lg:py-6 px-3 shadow-md w-full col-span-12 md:col-span-6">
            <div class="grid grid-cols-2 gap-4 pb-4">
                <div>
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">Occupation</p>
                        <Select
                            selectId="frequency"
                            classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                            optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                            chevronColor="text-black pr-2"
                            options={["Government", "Private", "Business", "Other"]}
                            bind:selectedValue={selectedOccupations}
                        />
                    </div>
                </div>

                <div>
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">Current age</p>
                        <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                            <input
                                onwheel={(event) => event.currentTarget.blur()}
                                bind:value={ageValue}
                                class="w-full ml-2 pt-2 pb-1 pl-0 pr-2 outline-none"
                                type="number"
                            />
                            <p class="p-2">Years</p>
                        </div>
                    </div>
                    {#if ageError}
                        <p class="text-dangerColor text-xs">{ageError}</p>
                    {/if}
                </div>
            </div>

            <div class="pb-4">
                <div class="flex flex-col gap-2 mt-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">Tools</p>
                    <Select
                        selectId="frequency"
                        classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                        optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                        chevronColor="text-black pr-2"
                        options={[
                            "Systematic Investment Plan(SIP)",
                            "Recurring Deposit(RD)",
                            "Fixed Deposit(FD)",
                            "Other",
                        ]}
                        bind:selectedValue={toolType}
                    />
                </div>
            </div>

            <div class="">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">
                        Saving Goal <span class="font-Paragraph text-minParaFont">(Target Amount)</span>
                    </p>
                    <CurrencyFormateInput
                        bind:inputsValue={savingGoal}
                        placeHolder="Enter value"
                        onInput={() => { savingGoalError = ""; }}
                    />
                </div>
                {#if savingGoalError}
                    <p class="text-xs text-dangerColor">{savingGoalError}</p>
                {:else if savingGoal > 0}
                    <p class="text-xs text-black">{toWords.convert(savingGoal)}</p>
                {/if}
            </div>

            <div class="pb-4">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">
                        Expected annual return <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(Rate of Interest)</span>
                    </p>
                    <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                        <p class="p-2 font-FourthHead">%</p>
                        <input
                            onwheel={(event) => event.currentTarget.blur()}
                            bind:value={rate}
                            oninput={() => { rateError = ""; }}
                            class="w-full pt-2 pb-2 pl-0 pr-2 outline-none"
                            type="number"
                        />
                    </div>
                </div>
                {#if rateError}
                    <p class="text-xs text-dangerColor">{rateError}</p>
                {/if}
            </div>

            <div class="pb-4">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">Compound Interest Frequency</p>
                    <Select
                        selectId="frequency"
                        classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                        optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                        chevronColor="text-black pr-2"
                        options={["Monthly", "Quarterly", "Half-Yearly", "Yearly"]}
                        bind:selectedValue={frequency}
                    />
                </div>
            </div>

            <div class="pb-4">
                <div class="flex flex-col gap-2">
                    <p class="font-FourthHead text-minParaFont lg:text-paraFont">Which one would you like to specify?</p>
                    <Select
                        selectId="frequency"
                        classFont="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-white text-black border border-black rounded-none py-2"
                        optionClass="font-Paragraph text-minParaFont lg:text-paraFont pl-2 bg-black text-white"
                        chevronColor="text-black pr-2"
                        options={["Tenure", "Investment Amount"]}
                        bind:selectedValue={specifySelection}
                    />
                </div>
            </div>

            {#if specifySelection == "Tenure"}
                <div class="">
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">I'll invest for</p>
                        <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                            <input
                                onwheel={(event) => event.currentTarget.blur()}
                                bind:value={years}
                                oninput={() => { yearError = ""; }}
                                class="w-full ml-2 pt-2 pb-2 pl-0 pr-2 outline-none"
                                type="number"
                            />
                            <p class="p-2">Years</p>
                        </div>
                    </div>
                    {#if yearError}
                        <p class="text-dangerColor text-xs">{yearError}</p>
                    {/if}
                </div>
            {:else}
                <div class="">
                    <div class="flex flex-col gap-2">
                        <p class="font-FourthHead text-minParaFont lg:text-paraFont">Total Investment <span class="font-Paragraph text-minParaFont lg:text-subParaFont">(₹)</span></p>
                        <div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont lg:text-paraFont">
                            <p class="p-2">₹</p>
                            <input
                                onwheel={(event) => event.currentTarget.blur()}
                                bind:value={totalInvestmentAmount}
                                oninput={() => { investmentError = ""; }}
                                class="w-full pt-2 pb-2 pl-0 pr-2 outline-none"
                                type="number"
                            />
                        </div>
                    </div>
                    {#if investmentError}
                        <p class="text-xs text-dangerColor">{investmentError}</p>
                    {:else if totalInvestmentAmount > 0}
                        <p class="text-xs text-black">{toWords.convert(totalInvestmentAmount)}</p>
                    {/if}
                </div>
            {/if}

            <div class="text-center pt-[1rem]">
                <button
                    class="w-full rounded-full bg-btnBg border px-[3rem] py-3 font-Paragraph text-minParaFont lg:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
                    onclick={calculate}>Calculate</button
                >
            </div>
        </div>

        <div id="resultView" class="flex flex-col py-[2rem] lg:py-[4rem] gap-[2rem] lg:gap-[4rem] bg-darkColor col-span-12 md:col-span-6">
            {#if specifySelection == "Tenure"}
                <div class="mt-[1rem] flex flex-col items-center justify-center gap-2 text-center text-white md:mt-0">
                    <div class="flex flex-wrap items-center justify-center gap-2 text-center text-black p-[2rem] bg-mainBg border-x border-darkColor border-dotted lg:border-none w-full mx-auto animate-fade">
                        <p class="w-full font-FifthHead text-miniHeadFont md:text-mobHeadFont">{years} years</p>
                        <p>
                            You need to invest <span class="px-2 font-FourthHead">₹ {Math.round(requiredInvestment).toLocaleString("en-IN")}</span> to reach your goal of <br>
                            <span class="bg-btnBg px-2 font-FourthHead">₹ {savingGoal}</span>
                        </p>
                    </div>
                </div>
                <div class="flex flex-col gap-4 bg-black p-6 w-auto mx-4">
                    <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                        <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total durations</p>
                        <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">{years} years</p>
                    </div>
                    <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                        <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Saving Goal</p>
                        <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                            ₹ {Math.round(savingGoal).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div class="flex justify-between text-center py-2">
                        <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total Interest Amount</p>
                        <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                            ₹ {Math.round(totalInterest).toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>
            {:else}
                <div class="flex flex-col gap-4 bg-black p-6 w-auto mx-4 rounded-lg">
                    <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                        <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total durations</p>
                        <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">{tenureMonths} months</p>
                    </div>
                    <div class="flex justify-between text-center border-b border-gray-700 pb-5 py-2">
                        <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total Investment</p>
                        <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                            ₹ {Math.round(totalInvestmentAmount).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div class="flex justify-between text-center py-2">
                        <p class="font-FifthHead text-minParaFont lg:text-paraFont text-white">Total Interest Amount</p>
                        <p class="font-FourthHead text-paraFont md:text-miniSubHead lg:text-minSubHead text-white">
                            ₹ {Math.round(totalInterest).toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>

                <div class="mt-[1rem] flex flex-col items-center justify-center gap-2 text-center text-white md:mt-0 animate-fade">
                    <div class="result text-black p-[2rem] bg-mainBg border-x border-darkColor border-dotted lg:border-none w-full mx-auto">
                        To achieve your goal amount of <span class="text-btnBg font-FifthHead">₹ {savingGoal}</span> in <br />
                        <span class="text-btnBg font-FifthHead text-minSubHead">{convertMonths(tenureMonths)}</span>
                    </div>
                </div>
            {/if}
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
