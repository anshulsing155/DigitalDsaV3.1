<script lang="ts">
  import { goto } from "$app/navigation";
  import Loader from "$lib/components/website/Loader.svelte";
  import { appointmentData } from "$lib/stores/stores";
  import { onMount } from "svelte";
  import FormLogo from "$lib/components/FormLogo.svelte";

  let checkedNext = $state(false);
  let checkBack = $state(false);
  let mobile = $state(false);
  let loaderValue = $state(false);

  function toggleBack() {
    checkBack = !checkBack;
    if (checkBack) {
      checkedNext = false;
      setTimeout(() => {
        setTimeout(() => {
          let backBtn = document.getElementById("backBtn");
        }, 250);

        setTimeout(() => {
          goto("./");
        }, 500);
      }, 0);
    }
  }

  function toggleNext() {
    checkedNext = !checkedNext;

    if (checkedNext) {
      checkBack = false;

      setTimeout(() => {
        setTimeout(() => {
          let nextBtn = document.getElementById("nextBtn");
          nextBtn?.classList.add("bg-[#FCB650]");
        }, 250);

        setTimeout(() => {
          if ($appointmentData.ServiceType) {
            goto("pick-a-slot");
          }
        }, 500);
      }, 0);
    }
  }

  function selectService(type: string) {
    $appointmentData = { ServiceType: type };
  }

  function selectLoanName(name: string) {
    $appointmentData = {
      ServiceType: "Loan",
      LoanName: name
    };
  }

  function setAppointmentValue(field: string, value: string | boolean) {
    $appointmentData = {
      ...$appointmentData,
      [field]: value
    };
  }

  function backbutton() {
    const data = { ...$appointmentData };

    // If we have a Plot Loan
    if (data.LoanName === "Plot Loan") {
      if (data.runningLoan) {
        delete data.runningLoan;
        $appointmentData = data;
        return;
      }
      if (data.anyLoanIsActive) {
        delete data.anyLoanIsActive;
        $appointmentData = data;
        return;
      }
      if (data.constructionLoanUnderstanding) {
        delete data.constructionLoanUnderstanding;
        $appointmentData = data;
        return;
      }
      if (data.changePlotActivity) {
        delete data.changePlotActivity;
        $appointmentData = data;
        return;
      }
      if (data.PlotLoanActivity) {
        delete data.PlotLoanActivity;
        $appointmentData = data;
        return;
      }
      if (data.LoanType) {
        delete data.LoanType;
        $appointmentData = data;
        return;
      }
      delete data.LoanName;
      $appointmentData = data;
      return;
    }

    // If we have Home Loan or Loan Against Property
    if (data.LoanName === "Home Loan" || data.LoanName === "Loan Against Property") {
      if (data.LoanType) {
        delete data.LoanType;
        // Clean up any fields set by choosing LoanType
        delete data.PropertyStage;
        delete data.ConstructionStage;
        delete data.propertyIdentified;
        $appointmentData = data;
        return;
      }
      if (data.LoanName === "Loan Against Property" && data.LAPType) {
        delete data.LAPType;
        delete data.ProductType;
        $appointmentData = data;
        return;
      }
      delete data.LoanName;
      $appointmentData = data;
      return;
    }

    // If we have Personal, Business or Professional Loan
    if (
      data.LoanName === "Personal Loan" ||
      data.LoanName === "Business Loan" ||
      data.LoanName === "Professional Loan"
    ) {
      if (data.LoanActivity) {
        delete data.LoanActivity;
        $appointmentData = data;
        return;
      }
      if (data.LoanType) {
        delete data.LoanType;
        $appointmentData = data;
        return;
      }
      delete data.LoanName;
      $appointmentData = data;
      return;
    }

    // If only ServiceType is set (or fallback)
    $appointmentData = {};
  }

  function deletedData() {
    let typeOfLoan = $appointmentData.LoanName;
    $appointmentData = {
      ServiceType: "Loan",
      LoanName: typeOfLoan
    };
  }

  $effect(() => {
    if ($appointmentData.LoanType == "Plot + Equity Loan") {
      $appointmentData.PlotLoanActivity = "New Loan";
    }
    if (
      $appointmentData.LoanName == "Personal Loan" ||
      $appointmentData.LoanName == "Professional Loan"
    ) {
      $appointmentData.tellUsApplying = "Individual";
    } else {
      delete $appointmentData.tellUsApplying;
    }
    if ($appointmentData.changePlotActivity) {
      $appointmentData.LoanType = "Plot + Construction Loan";
      delete $appointmentData.anyLoanIsActive;
      delete $appointmentData.runningLoan;

      delete $appointmentData.constructionLoanUnderstanding;
      delete $appointmentData.propertyType;
      delete $appointmentData.changePlotActivity;
    }
    if ($appointmentData.constructionLoanUnderstanding == false) {
      delete $appointmentData.anyLoanIsActive;
      delete $appointmentData.runningLoan;
      delete $appointmentData.PlotLoanActivity;
    }
  });

  onMount(() => {
    const updateMobileStatus = () => {
      mobile = window.innerWidth <= 768;
    };
    updateMobileStatus();
    window.addEventListener("resize", updateMobileStatus);
    return () => {
      window.removeEventListener("resize", updateMobileStatus);
    };
  });
</script>

<svelte:head>
  <title
    >Digital DSA: Let's Discover Your Ideal Lender with the Best Rates Tailored
    to Your Profile!</title
  >
</svelte:head>

{#if !loaderValue}
  <section
    class="w-full bg-[var(--form-bg-card)] text-[var(--form-text)] rounded-3xl z-10 shadow-lg border border-[var(--form-border)] relative"
    id="formData"
  >
    <div class="absolute right-[1rem] md:right-[2rem] top-4 md:w-full">
      <FormLogo />
    </div>
    <div
      class="flex flex-col gap-8 justify-center px-[1rem] md:px-[2rem] lg:px-0 mx-auto w-full md:pb-10 pt-12 md:pt-16"
    >
      <!-- Step Progress Bar -->
      <div class="progress-steps">
        <div class="progress-step-item active">
          <div class="progress-step-dot">1</div>
          <div class="progress-step-label">Purpose</div>
        </div>
        <div class="progress-step-line"></div>
        <div class="progress-step-item">
          <div class="progress-step-dot">2</div>
          <div class="progress-step-label">Date & Time</div>
        </div>
        <div class="progress-step-line"></div>
        <div class="progress-step-item">
          <div class="progress-step-dot">3</div>
          <div class="progress-step-label">Confirm</div>
        </div>
      </div>

      <div class="flex flex-col w-full lg:w-11/12 justify-center mx-auto">
        <div class="flex w-[80%] lg:w-full py-[1rem]">
          <h2 class="font-ThirdHead text-mobSubHead md:text-headFont text-[var(--form-text)]">
            What are you looking for?
          </h2>
        </div>
        {#if $appointmentData?.ServiceType != "Loan"}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2 flex-start w-full">
              <h3 class="font-FourthHead text-subParaFont lg:text-paraFont">
                Which service are you looking for?
              </h3>
              <p class="font-Paragraph text-minParaFont">
                Get started by letting us know a little bit about what you need
              </p>
            </div>
            <div class="grid md:grid-cols-2 md:gap-2 gap-1 cursor-pointer">
              <label class="appointment-radio {$appointmentData.ServiceType === 'Loan' ? 'active' : ''}" for="service-loan">
                <input
                  id="service-loan"
                  class="appointment-radio-input"
                  type="radio"
                  name="ServiceType"
                  value="Loan"
                  checked={$appointmentData.ServiceType === "Loan"}
                  onchange={() => selectService("Loan")}
                />
                <span class="appointment-radio-dot"></span>
                <span>Loan</span>
              </label>
              <label class="appointment-radio {$appointmentData.ServiceType === 'Investment' ? 'active' : ''}" for="service-investment">
                <input
                  id="service-investment"
                  class="appointment-radio-input"
                  type="radio"
                  name="ServiceType"
                  value="Investment"
                  checked={$appointmentData.ServiceType === "Investment"}
                  onchange={() => selectService("Investment")}
                />
                <span class="appointment-radio-dot"></span>
                <span>Investment</span>
              </label>

              <label class="appointment-radio {$appointmentData.ServiceType === 'Insurance' ? 'active' : ''}" for="service-insurance">
                <input
                  id="service-insurance"
                  class="appointment-radio-input"
                  type="radio"
                  name="ServiceType"
                  value="Insurance"
                  checked={$appointmentData.ServiceType === "Insurance"}
                  onchange={() => selectService("Insurance")}
                />
                <span class="appointment-radio-dot"></span>
                <span>Insurance</span>
              </label>

              <label class="appointment-radio {$appointmentData.ServiceType === 'Others' ? 'active' : ''}" for="service-others">
                <input
                  id="service-others"
                  class="appointment-radio-input"
                  type="radio"
                  name="ServiceType"
                  value="Others"
                  checked={$appointmentData.ServiceType === "Others"}
                  onchange={() => selectService("Others")}
                />
                <span class="appointment-radio-dot"></span>
                <span>Others</span>
              </label>
            </div>
          </div>
          {#if $appointmentData?.ServiceType == "Insurance" || $appointmentData?.ServiceType == "Investment" || $appointmentData?.ServiceType == "Others"}
            <div
              class="flex flex-row w-full md:pb-0 pb-[1.5rem] justify-between gap-4"
            >
              <div
                class="flex flex-row mx-auto pt-[2rem] justify-between gap-4 w-full"
              >
                <button
                  type="button"
                  id="backBtn"
                  class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md back-button test {checkBack
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={toggleBack}>Back</button
                >

                <button
                  type="button"
                  id="nextBtn"
                  class="md:w-4/12 font-Paragraph text-para bg-btnBg w-full py-3 rounded-md next-button glowEffect {checkedNext
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={() => {
                    loaderValue = true;
                    toggleNext();
                  }}>Next</button
                >
              </div>
            </div>
          {:else}
            <div
              class="flex flex-row w-full md:pb-0 pb-[1.5rem] justify-between gap-4"
            >
              <div
                class="flex flex-row mx-auto pt-[2rem] justify-between gap-4 w-full"
              >
                <button
                  type="button"
                  id="backBtn"
                  class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md test cursor-pointer"
                  onclick={() => goto("./")}>Back</button
                >
              </div>
            </div>
          {/if}
        {:else if $appointmentData.ServiceType == "Loan"}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2 flex-start w-full">
              <h3 class="font-FourthHead text-subParaFont lg:text-paraFont">
                What service would you like to book an appointment for?
              </h3>
              <p class="font-Paragraph text-minParaFont">
                Help us understand your needs to find the best solution for you
              </p>
            </div>

            <div class="grid md:grid-cols-2 md:gap-2 gap-1 cursor-pointer">
              <label class="appointment-radio {$appointmentData.LoanName === 'Home Loan' ? 'active' : ''}" for="loan-home">
                <input id="loan-home" class="appointment-radio-input" type="radio" name="LoanName" value="Home Loan" checked={$appointmentData.LoanName === "Home Loan"} onchange={() => selectLoanName("Home Loan")} />
                <span class="appointment-radio-dot"></span>
                <span>Home Loan</span>
              </label>
              <label class="appointment-radio {$appointmentData.LoanName === 'Plot Loan' ? 'active' : ''}" for="loan-plot">
                <input id="loan-plot" class="appointment-radio-input" type="radio" name="LoanName" value="Plot Loan" checked={$appointmentData.LoanName === "Plot Loan"} onchange={() => selectLoanName("Plot Loan")} />
                <span class="appointment-radio-dot"></span>
                <span>Plot Loan</span>
              </label>

              <label class="appointment-radio {$appointmentData.LoanName === 'Loan Against Property' ? 'active' : ''}" for="loan-lap">
                <input id="loan-lap" class="appointment-radio-input" type="radio" name="LoanName" value="Loan Against Property" checked={$appointmentData.LoanName === "Loan Against Property"} onchange={() => selectLoanName("Loan Against Property")} />
                <span class="appointment-radio-dot"></span>
                <span>Loan Against Property</span>
              </label>

              <label class="appointment-radio {$appointmentData.LoanName === 'Business Loan' ? 'active' : ''}" for="loan-business">
                <input id="loan-business" class="appointment-radio-input" type="radio" name="LoanName" value="Business Loan" checked={$appointmentData.LoanName === "Business Loan"} onchange={() => selectLoanName("Business Loan")} />
                <span class="appointment-radio-dot"></span>
                <span>Business Loan</span>
              </label>

              <label class="appointment-radio {$appointmentData.LoanName === 'Professional Loan' ? 'active' : ''}" for="loan-professional">
                <input id="loan-professional" class="appointment-radio-input" type="radio" name="LoanName" value="Professional Loan" checked={$appointmentData.LoanName === "Professional Loan"} onchange={() => selectLoanName("Professional Loan")} />
                <span class="appointment-radio-dot"></span>
                <span>Professional Loan</span>
              </label>

              <label class="appointment-radio {$appointmentData.LoanName === 'Personal Loan' ? 'active' : ''}" for="loan-personal">
                <input id="loan-personal" class="appointment-radio-input" type="radio" name="LoanName" value="Personal Loan" checked={$appointmentData.LoanName === "Personal Loan"} onchange={() => selectLoanName("Personal Loan")} />
                <span class="appointment-radio-dot"></span>
                <span>Personal Loan</span>
              </label>
            </div>
          </div>
          {#if $appointmentData.LoanName == "Loan Against Property"}
            <div
              class="flex flex-col w-full mt-[3rem] md:mt-[5rem] gap-4 justify-center"
            >
              <div class="flex flex-col gap-2 flex-start w-full">
                <p class="font-FourthHead text-subParaFont lg:text-paraFont">
                  Would you like to book an appointment to discuss Loan Against
                  Property (LAP) or Drop-line OverDraft (DOD) options?
                </p>
                <p class="font-Paragraph text-minParaFont">
                  The maximum tenure for LAP is 15 years, and for DOD, it is 10
                  years.
                </p>
              </div>
              <div class="grid md:grid-cols-2 md:gap-2 gap-1 cursor-pointer">
                <label class="appointment-radio {$appointmentData.LAPType === 'LAP' ? 'active' : ''}" for="lap-type-lap">
                  <input
                    id="lap-type-lap"
                    class="appointment-radio-input"
                    type="radio"
                    name="LAPType"
                    value="LAP"
                    checked={$appointmentData.LAPType === "LAP"}
                    onchange={() => {
                      setAppointmentValue("LAPType", "LAP");
                      $appointmentData.ProductType = "LAP";
                    }}
                  />
                  <span class="appointment-radio-dot"></span>
                  <span>LAP</span>
                </label>

                <label class="appointment-radio {$appointmentData.LAPType === 'Drop-line OverDraft (DOD)' ? 'active' : ''}" for="lap-type-dod">
                  <input
                    id="lap-type-dod"
                    class="appointment-radio-input"
                    type="radio"
                    name="LAPType"
                    value="Drop-line OverDraft (DOD)"
                    checked={$appointmentData.LAPType === "Drop-line OverDraft (DOD)"}
                    onchange={() => {
                      setAppointmentValue("LAPType", "Drop-line OverDraft (DOD)");
                      delete $appointmentData.LoanType;
                      $appointmentData.ProductType = "DOD";
                    }}
                  />
                  <span class="appointment-radio-dot"></span>
                  <span>Drop-line OverDraft (DOD)</span>
                </label>
              </div>
            </div>
          {/if}

          {#if $appointmentData.LoanName == "Personal Loan"}
            <div
              class="border mt-[1rem] border-iconColor rounded-md p-[0.7rem] w-full relative"
            >
              <div
                class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
              ></div>

              <p class="font-Paragraph text-minParaFont">
                Personal loan is intended for salaried people as well as
                Directors of the Pvt Ltd companies, who receive regular monthly
                salary.
              </p>
            </div>
          {/if}

          {#if $appointmentData.LoanName == "Business Loan"}
            <div
              class="border mt-[1rem] border-iconColor rounded-md p-[0.7rem] w-full relative"
            >
              <div
                class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
              ></div>

              <p class="font-Paragraph text-minParaFont">
                Business loan is intended for business entities only, whether
                they are sole-proprietorship or companies. <br />
                Entity must be GST registered and minimum three years' ITR should
                be available.
              </p>
            </div>
          {/if}

          {#if $appointmentData.LoanName == "Professional Loan"}
            <div
              class="border mt-[1rem] border-iconColor rounded-md p-[0.7rem] w-full relative"
            >
              <div
                class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
              ></div>

              <p class="font-Paragraph text-minParaFont">
                Professional loan is intended for self-employed professionals
                i.e. CA, CS, MBBS, Dentist, Lawyer or Architect.
              </p>
            </div>
          {/if}

          {#if $appointmentData.LoanName}
            {#if $appointmentData.LoanName == "Home Loan" || ($appointmentData.LoanName == "Loan Against Property" && $appointmentData.LAPType)}
              <div class="flex mt-[3rem] md:mt-[5rem] flex-col gap-4">
                <div class="flex flex-col gap-2 flex-start w-full">
                  <p class="font-FourthHead text-subParaFont lg:text-paraFont">
                    What type of loan consultation do you need an appointment
                    for?
                  </p>
                  <p class="font-Paragraph text-minParaFont">
                    It will help us to identify your requirements, specifically
                  </p>
                </div>
                <div class="grid md:grid-cols-2 gap-1 md:gap-2 cursor-pointer">
                  <label class="appointment-radio {$appointmentData.LoanType === 'New Loan' ? 'active' : ''}" for="loan-type-new">
                    <input
                      id="loan-type-new"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="New Loan"
                      checked={$appointmentData.LoanType === "New Loan"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "New Loan");
                        delete $appointmentData.ApplicantIsNRI;
                        delete $appointmentData.propertyIdentified;
                        delete $appointmentData.propertyCityName;
                        delete $appointmentData.cityOptions;
                        delete $appointmentData.sixMonthsPassedAfterRegistry;
                        delete $appointmentData.ifPropertyRegistered;
                        delete $appointmentData.numberOfDirectorOrApplicant;
                        delete $appointmentData.propertyStateName;
                        delete $appointmentData.purchaseType;
                        delete $appointmentData.dipInProfit;
                        delete $appointmentData.incomeTaxAvailableOneFinancialYear;
                        delete $appointmentData.companyContinuouslyProfit;
                        delete $appointmentData.propertyType;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>New Loan</span>
                  </label>

                  {#if $appointmentData.LAPType != "Drop-line OverDraft (DOD)"}
                    <label class="appointment-radio {$appointmentData.LoanType === 'Balance Transfer With Top-up' ? 'active' : ''}" for="loan-type-bt-topup">
                      <input
                        id="loan-type-bt-topup"
                        class="appointment-radio-input"
                        type="radio"
                        name="LoanType"
                        value="Balance Transfer With Top-up"
                        checked={$appointmentData.LoanType === "Balance Transfer With Top-up"}
                        onchange={() => {
                          setAppointmentValue("LoanType", "Balance Transfer With Top-up");
                          $appointmentData.PropertyStage = "Ready To Move";
                          delete $appointmentData.ApplicantIsNRI;
                          delete $appointmentData?.ConstructionStage;
                          $appointmentData.propertyIdentified = "Yes";
                          delete $appointmentData.propertyCityName;
                          delete $appointmentData.cityOptions;
                          delete $appointmentData.sixMonthsPassedAfterRegistry;
                          delete $appointmentData.ifPropertyRegistered;
                          delete $appointmentData.numberOfDirectorOrApplicant;
                          delete $appointmentData.propertyStateName;
                          delete $appointmentData.purchaseType;
                          delete $appointmentData.dipInProfit;
                          delete $appointmentData.incomeTaxAvailableOneFinancialYear;
                          delete $appointmentData.companyContinuouslyProfit;
                          delete $appointmentData.propertyType;
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Balance Transfer With Top-up</span>
                    </label>

                    <label class="appointment-radio {$appointmentData.LoanType === 'Balance Transfer Only' ? 'active' : ''}" for="loan-type-bt-only">
                      <input
                        id="loan-type-bt-only"
                        class="appointment-radio-input"
                        type="radio"
                        name="LoanType"
                        value="Balance Transfer Only"
                        checked={$appointmentData.LoanType === "Balance Transfer Only"}
                        onchange={() => {
                          setAppointmentValue("LoanType", "Balance Transfer Only");
                          $appointmentData.propertyIdentified = "Yes";
                          delete $appointmentData.ApplicantIsNRI;
                          delete $appointmentData.propertyCityName;
                          delete $appointmentData.cityOptions;
                          delete $appointmentData.sixMonthsPassedAfterRegistry;
                          delete $appointmentData.ifPropertyRegistered;
                          delete $appointmentData.numberOfDirectorOrApplicant;
                          delete $appointmentData.purchaseType;
                          delete $appointmentData.propertyStateName;
                          delete $appointmentData.dipInProfit;
                          delete $appointmentData.incomeTaxAvailableOneFinancialYear;
                          delete $appointmentData.companyContinuouslyProfit;
                          delete $appointmentData.propertyType;
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Balance Transfer Only</span>
                    </label>
                  {/if}

                  <label class="appointment-radio {$appointmentData.LoanType === 'Top-up Only' ? 'active' : ''}" for="loan-type-topup">
                    <input
                      id="loan-type-topup"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="Top-up Only"
                      checked={$appointmentData.LoanType === "Top-up Only"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "Top-up Only");
                        $appointmentData.PropertyStage = "Ready To Move";
                        delete $appointmentData?.ConstructionStage;
                        delete $appointmentData.ApplicantIsNRI;
                        $appointmentData.propertyIdentified = "Yes";
                        delete $appointmentData.propertyCityName;
                        delete $appointmentData.cityOptions;
                        delete $appointmentData.sixMonthsPassedAfterRegistry;
                        delete $appointmentData.ifPropertyRegistered;
                        delete $appointmentData.numberOfDirectorOrApplicant;
                        delete $appointmentData.purchaseType;
                        delete $appointmentData.propertyStateName;
                        delete $appointmentData.dipInProfit;
                        delete $appointmentData.incomeTaxAvailableOneFinancialYear;
                        delete $appointmentData.companyContinuouslyProfit;
                        delete $appointmentData.propertyType;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>Top-up Only</span>
                  </label>
                </div>
              </div>
            {:else if $appointmentData.LoanName == "Plot Loan"}
              <div class="flex mt-[3rem] md:mt-[5rem] flex-col gap-4">
                <div class="flex flex-col gap-2 flex-start w-full">
                  <p class="font-FourthHead text-subParaFont lg:text-paraFont">
                    {#if $appointmentData.LoanName == "Plot Loan"}
                      Help us assist you better—choose a Plot Loan sub-category
                    {/if}
                  </p>
                  <p class="font-Paragraph text-minParaFont">
                    Choosing the right plot loan sub-category ensures smooth
                    documentation, faster approval, and the best interest rates.
                  </p>
                </div>
                <div class="grid md:grid-cols-2 gap-1 md:gap-2 cursor-pointer">
                  <label class="appointment-radio {$appointmentData.LoanType === 'Plot Loan Only' ? 'active' : ''}" for="loan-type-plot-only">
                    <input
                      id="loan-type-plot-only"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="Plot Loan Only"
                      checked={$appointmentData.LoanType === "Plot Loan Only"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "Plot Loan Only");
                        delete $appointmentData.PlotLoanActivity;
                        delete $appointmentData.anyLoanIsActive;
                        delete $appointmentData.runningLoan;
                        delete $appointmentData.constructionLoanUnderstanding;
                        delete $appointmentData.plotOnLoan;
                        delete $appointmentData.constructionOnLoan;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>Plot Loan Only</span>
                  </label>

                  <label class="appointment-radio {$appointmentData.LoanType === 'Plot + Construction Loan' ? 'active' : ''}" for="loan-type-plot-construction">
                    <input
                      id="loan-type-plot-construction"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="Plot + Construction Loan"
                      checked={$appointmentData.LoanType === "Plot + Construction Loan"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "Plot + Construction Loan");
                        delete $appointmentData.anyLoanIsActive;
                        delete $appointmentData.runningLoan;
                        delete $appointmentData.PlotLoanActivity;
                        delete $appointmentData.constructionLoanUnderstanding;
                        delete $appointmentData.plotOnLoan;
                        delete $appointmentData.constructionOnLoan;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>Plot + Construction Loan</span>
                  </label>

                  <label class="appointment-radio {$appointmentData.LoanType === 'Plot + Equity Loan' ? 'active' : ''}" for="loan-type-plot-equity">
                    <input
                      id="loan-type-plot-equity"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="Plot + Equity Loan"
                      checked={$appointmentData.LoanType === "Plot + Equity Loan"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "Plot + Equity Loan");
                        $appointmentData.PlotLoanActivity = "New Loan";
                        delete $appointmentData.constructionLoanUnderstanding;
                        delete $appointmentData.plotOnLoan;
                        delete $appointmentData.constructionOnLoan;
                        delete $appointmentData.anyLoanIsActive;
                        delete $appointmentData.runningLoan;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>Plot + Equity Loan</span>
                  </label>

                  <label class="appointment-radio {$appointmentData.LoanType === 'Construction Loan Only' ? 'active' : ''}" for="loan-type-construction-only">
                    <input
                      id="loan-type-construction-only"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="Construction Loan Only"
                      checked={$appointmentData.LoanType === "Construction Loan Only"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "Construction Loan Only");
                        delete $appointmentData.PlotLoanActivity;
                        delete $appointmentData.constructionLoanUnderstanding;
                        delete $appointmentData.plotOnLoan;
                        delete $appointmentData.constructionOnLoan;
                        delete $appointmentData.depositAsPerATS;
                        delete $appointmentData.agreementSellValue;
                        delete $appointmentData.deposit;
                        delete $appointmentData.dealValue;
                        delete $appointmentData.anyLoanIsActive;
                        delete $appointmentData.runningLoan;
                        delete $appointmentData.depositAsPerATS;

                        $appointmentData.purchaseType = "Resale";
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>Construction Loan Only</span>
                  </label>
                </div>v>
              </div>
              {#if $appointmentData.LoanType == "Plot + Equity Loan"}
                <div
                  class="border border-iconColor rounded-md p-[0.7rem] w-full relative mt-1"
                >
                  <div
                    class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
                  ></div>

                  <p class="font-Paragraph text-minParaFont">
                    Right now, a 'Plot + Equity Loan' is available through one
                    or two lenders only and is <span class="underline"
                      >exclusively available in resale deals</span
                    >
                    . <br />
                    If you have any running loan on your plot, apply for "Top-up
                    only" under 'Loan Against Property'.
                  </p>
                </div>
              {/if}
              {#if $appointmentData.LoanType == "Construction Loan Only"}
                <div
                  class="border border-iconColor rounded-md p-[0.7rem] w-full relative mt-1"
                >
                  <div
                    class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
                  ></div>

                  <div>
                    <p
                      class="font-Paragraph text-subHeadingForm-md md:text-headingForm"
                    >
                      If your Plot is loan-free :
                    </p>
                    <ul class="font-Paragraph text-para px-10">
                      <li class="list-decimal">
                        Proceed with the "New Loan" (for New construction loan
                        or additional construction requirements).
                      </li>
                      <li class="list-decimal">
                        Proceed with Balance Transfer of your existing
                        Construction Loan if there is any running Construction
                        loan.
                      </li>
                    </ul>
                    <br />
                    <p
                      class="font-Paragraph text-subHeadingForm-md md:text-headingForm"
                    >
                      If your plot is mortgaged (not Loan-free) :
                    </p>

                    <ul class="font-Paragraph text-para px-10">
                      <li class="list-decimal">
                        Proceed with the "New Loan" (for New construction loan
                        or additional construction requirements) <span
                          class="underline font-Paragraph"
                          >from your existing lender</span
                        > (we will ask for the existing loan details at later stage).
                      </li>
                      <li class="list-decimal">
                        Apply with the option of Balance Transfer under "Plot +
                        Construction Loan", <span
                          class="underline font-Paragraph"
                          >if you are seeking offers from other lenders</span
                        >.
                      </li>
                    </ul>
                  </div>
                  <div class="float-right">
                    <label
                      for="constructionLoanUnderstanding"
                      class="flex items-center gap-2 mt-2 cursor-pointer"
                    >
                      <input
                        id="constructionLoanUnderstanding"
                        type="checkbox"
                        bind:checked={
                          $appointmentData.constructionLoanUnderstanding
                        }
                      />
                      <p
                        class="font-Paragraph text-subHeadingForm-md md:text-headingForm"
                      >
                        I understand
                      </p>
                    </label>
                  </div>
                </div>
              {/if}
              {#if $appointmentData.constructionLoanUnderstanding}
                <div class="flex mt-[3rem] md:mt-[5rem] flex-col gap-4">
                  <div class="flex flex-col gap-2 flex-start w-full">
                    <p
                      class="font-FourthHead text-subParaFont lg:text-paraFont"
                    >
                      Please confirm if there is currently any existing loan on
                      the plot?
                    </p>
                    <p class="font-Paragraph text-minParaFont">
                      Plot, for which you are requesting a construction loan.
                    </p>
                  </div>
                  <div
                    class="flex md:w-full flex-col xl:flex-row justify-between gap-1 md:gap-2 xl:gap-4 cursor-pointer"
                  >
                    <label class="appointment-radio {$appointmentData.anyLoanIsActive === 'Yes' ? 'active' : ''}" for="any-loan-active-yes">
                      <input
                        id="any-loan-active-yes"
                        class="appointment-radio-input"
                        type="radio"
                        name="anyLoanIsActive"
                        value="Yes"
                        checked={$appointmentData.anyLoanIsActive === "Yes"}
                        onchange={() => {
                          setAppointmentValue("anyLoanIsActive", "Yes");
                          delete $appointmentData.constructionOnLoan;
                          delete $appointmentData.PlotLoanActivity;
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Yes</span>
                    </label>

                    <label class="appointment-radio {$appointmentData.anyLoanIsActive === 'No' ? 'active' : ''}" for="any-loan-active-no">
                      <input
                        id="any-loan-active-no"
                        class="appointment-radio-input"
                        type="radio"
                        name="anyLoanIsActive"
                        value="No"
                        checked={$appointmentData.anyLoanIsActive === "No"}
                        onchange={() => {
                          setAppointmentValue("anyLoanIsActive", "No");
                          delete $appointmentData.runningLoan;
                          delete $appointmentData.constructionOnLoan;
                          delete $appointmentData.PlotLoanActivity;
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>No</span>
                    </label>
                  </div>
                </div>
              {/if}
              {#if $appointmentData.anyLoanIsActive == "Yes"}
                <div class="flex mt-[3rem] md:mt-[5rem] flex-col gap-4">
                  <div class="flex flex-col gap-2 flex-start w-full">
                    <p
                      class="font-FourthHead text-subParaFont lg:text-paraFont"
                    >
                      Great! Which loan is currently active?
                    </p>
                  </div>
                  <div
                    class="grid md:grid-cols-2 gap-1 md:gap-2 cursor-pointer"
                  >
                    <label class="appointment-radio {$appointmentData.runningLoan === 'Plot Loan Only' ? 'active' : ''}" for="running-loan-plot-only">
                      <input
                        id="running-loan-plot-only"
                        class="appointment-radio-input"
                        type="radio"
                        name="runningLoan"
                        value="Plot Loan Only"
                        checked={$appointmentData.runningLoan === "Plot Loan Only"}
                        onchange={() => {
                          setAppointmentValue("runningLoan", "Plot Loan Only");
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Plot Loan Only</span>
                    </label>

                    <label class="appointment-radio {$appointmentData.runningLoan === 'Construction Loan Only' ? 'active' : ''}" for="running-loan-construction-only">
                      <input
                        id="running-loan-construction-only"
                        class="appointment-radio-input"
                        type="radio"
                        name="runningLoan"
                        value="Construction Loan Only"
                        checked={$appointmentData.runningLoan === "Construction Loan Only"}
                        onchange={() => {
                          setAppointmentValue("runningLoan", "Construction Loan Only");
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Construction Loan Only</span>
                    </label>

                    <label class="appointment-radio {$appointmentData.runningLoan === 'Plot and Construction Loan' ? 'active' : ''}" for="running-loan-plot-construction">
                      <input
                        id="running-loan-plot-construction"
                        class="appointment-radio-input"
                        type="radio"
                        name="runningLoan"
                        value="Plot and Construction Loan"
                        checked={$appointmentData.runningLoan === "Plot and Construction Loan"}
                        onchange={() => {
                          setAppointmentValue("runningLoan", "Plot and Construction Loan");
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Plot and Construction Loan</span>
                    </label>

                    <label class="appointment-radio {$appointmentData.runningLoan === 'Loan Against Property' ? 'active' : ''}" for="running-loan-lap">
                      <input
                        id="running-loan-lap"
                        class="appointment-radio-input"
                        type="radio"
                        name="runningLoan"
                        value="Loan Against Property"
                        checked={$appointmentData.runningLoan === "Loan Against Property"}
                        onchange={() => {
                          setAppointmentValue("runningLoan", "Loan Against Property");
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Loan Against Property</span>
                    </label>
                  </div>
                </div>
              {/if}
            {:else if $appointmentData.LoanName == "Business Loan" || $appointmentData.LoanName == "Personal Loan" || $appointmentData.LoanName == "Professional Loan"}
              <div class="flex mt-[3rem] md:mt-[5rem] flex-col gap-4">
                <div class="flex flex-col gap-2 flex-start w-full">
                  <p class="font-FourthHead text-subParaFont lg:text-paraFont">
                    What type of loan consultation would you like to book an
                    appointment for?
                  </p>
                  <p class="font-Paragraph text-minParaFont">
                    It will help us to identify your requirements, specifically
                  </p>
                </div>
                <div
                  class="grid md:grid-cols-2 gap-1 md:gap-2 xl:gap-4 cursor-pointer"
                >
                  <label class="appointment-radio {$appointmentData.LoanType === 'New Loan' ? 'active' : ''}" for="loan-type-new-unsecure">
                    <input
                      id="loan-type-new-unsecure"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="New Loan"
                      checked={$appointmentData.LoanType === "New Loan"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "New Loan");
                        delete $appointmentData.LoanActivity;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>New Loan</span>
                  </label>

                  <label class="appointment-radio {$appointmentData.LoanType === 'Balance Transfer' ? 'active' : ''}" for="loan-type-bt-unsecure">
                    <input
                      id="loan-type-bt-unsecure"
                      class="appointment-radio-input"
                      type="radio"
                      name="LoanType"
                      value="Balance Transfer"
                      checked={$appointmentData.LoanType === "Balance Transfer"}
                      onchange={() => {
                        setAppointmentValue("LoanType", "Balance Transfer");
                        delete $appointmentData.LoanActivity;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>Balance Transfer</span>
                  </label>
                </div>
              </div>
              {#if $appointmentData.LoanType == "Balance Transfer"}
                <div class="flex mt-[3rem] md:mt-[5rem] flex-col gap-4">
                  <div class="flex flex-col gap-2 flex-start w-full">
                    <p
                      class="font-FourthHead text-subParaFont lg:text-paraFont"
                    >
                      Would you like to have some top-up with this Balance
                      Transfer?
                    </p>
                    <p class="font-Paragraph text-minParaFont">
                      Based on your eligibility, some banks can offer the top-up
                      amount.
                    </p>
                  </div>
                  <div class="grid grid-cols-2 gap-2 xl:gap-4 cursor-pointer">
                    <label class="appointment-radio {$appointmentData.LoanActivity === 'Yes' ? 'active' : ''}" for="loan-activity-bt-yes">
                      <input
                        id="loan-activity-bt-yes"
                        class="appointment-radio-input"
                        type="radio"
                        name="LoanActivity"
                        value="Yes"
                        checked={$appointmentData.LoanActivity === "Yes"}
                        onchange={() => {
                          setAppointmentValue("LoanActivity", "Yes");
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>Yes</span>
                    </label>

                    <label class="appointment-radio {$appointmentData.LoanActivity === 'No' ? 'active' : ''}" for="loan-activity-bt-no">
                      <input
                        id="loan-activity-bt-no"
                        class="appointment-radio-input"
                        type="radio"
                        name="LoanActivity"
                        value="No"
                        checked={$appointmentData.LoanActivity === "No"}
                        onchange={() => {
                          setAppointmentValue("LoanActivity", "No");
                        }}
                      />
                      <span class="appointment-radio-dot"></span>
                      <span>No</span>
                    </label>
                  </div>
                </div>
              {/if}
            {/if}

            {#if $appointmentData.LoanName == "Plot Loan" && (($appointmentData.LoanType != "Plot + Equity Loan" && $appointmentData.LoanType != "Construction Loan Only") || ($appointmentData.LoanType == "Construction Loan Only" && ($appointmentData.runningLoan || $appointmentData.anyLoanIsActive == "No")))}
              <div class="flex mt-[3rem] md:mt-[5rem] flex-col gap-4">
                <div class="flex flex-col gap-2 flex-start w-full">
                  <p class="font-FourthHead text-subParaFont lg:text-paraFont">
                    What type of loan consultation would you like to book an
                    appointment for?
                  </p>
                  <p class="font-Paragraph text-minParaFont">
                    It will help us to identify your requirements, specifically
                  </p>
                </div>
                <div
                  class="flex md:w-full flex-col xl:flex-row justify-between gap-1 md:gap-2 xl:gap-4 cursor-pointer"
                >
                  <label class="appointment-radio {$appointmentData.PlotLoanActivity === 'New Loan' ? 'active' : ''}" for="plot-loan-activity-new">
                    <input
                      id="plot-loan-activity-new"
                      class="appointment-radio-input"
                      type="radio"
                      name="PlotLoanActivity"
                      value="New Loan"
                      checked={$appointmentData.PlotLoanActivity === "New Loan"}
                      onchange={() => {
                        setAppointmentValue("PlotLoanActivity", "New Loan");
                        delete $appointmentData.propertyType;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>New Loan</span>
                  </label>

                  <label class="appointment-radio {$appointmentData.PlotLoanActivity === 'Balance Transfer' ? 'active' : ''}" for="plot-loan-activity-bt">
                    <input
                      id="plot-loan-activity-bt"
                      class="appointment-radio-input"
                      type="radio"
                      name="PlotLoanActivity"
                      value="Balance Transfer"
                      checked={$appointmentData.PlotLoanActivity === "Balance Transfer"}
                      onchange={() => {
                        setAppointmentValue("PlotLoanActivity", "Balance Transfer");
                        delete $appointmentData.propertyType;
                      }}
                    />
                    <span class="appointment-radio-dot"></span>
                    <span>Balance Transfer</span>
                  </label>
                </div>
              </div>
            {/if}
            {#if $appointmentData.PlotLoanActivity == "Balance Transfer" && ($appointmentData.runningLoan == "Plot Loan Only" || $appointmentData.runningLoan == "Plot and Construction Loan" || $appointmentData.runningLoan == "Loan Against Property") && $appointmentData.LoanType == "Construction Loan Only"}
              <div
                class="border border-iconColor rounded-md p-[0.7rem] w-full relative mt-1"
              >
                <div
                  class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
                ></div>
                {#if $appointmentData.runningLoan == "Plot Loan Only"}
                  <p class="font-Paragraph text-minParaFont">
                    If your plot is currently on loan and you wish to transfer
                    the balance, you must choose the "Plot + Construction Loan"
                    option for Balance Transfer. <br />
                    Would you like to us to set this option for you?
                  </p>
                {:else if $appointmentData.runningLoan == "Plot and Construction Loan"}
                  <p class="font-Paragraph text-minParaFont">
                    If your Plot and Construction Loan is currently on loan and
                    you wish to transfer the balance, you must choose the "Plot
                    + Construction Loan" option for Balance Transfer. <br />
                    Would you like to us to set this option for you?
                  </p>
                {:else if $appointmentData.runningLoan == "Loan Against Property"}
                  <p class="font-Paragraph text-minParaFont">
                    If your plot is currently on loan (LAP as well as
                    construction loan) and you wish to transfer the balance, you
                    must choose the "Plot + Construction Loan" option for
                    Balance Transfer. <br />
                    Would you like to us to set this option for you?
                  </p>
                {/if}
                <div class="float-right">
                  <label
                    for="constructionLoanUnderstanding"
                    class="flex items-center gap-2 mt-2 cursor-pointer"
                  >
                    <input
                      id="constructionLoanUnderstanding"
                      type="checkbox"
                      bind:checked={$appointmentData.changePlotActivity}
                    />
                    <p
                      class="font-Paragraph text-subHeadingForm-md md:text-headingForm"
                    >
                      I agree
                    </p>
                  </label>
                </div>
              </div>
            {/if}

            {#if $appointmentData.PlotLoanActivity == "New Loan" && $appointmentData.LoanType == "Plot + Construction Loan"}
              <div
                class="border border-borderColo/50 rounded-md p-[0.7rem] w-full relative mt-1"
              >
                <div
                  class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
                ></div>

                <p class="font-Paragraph text-minParaFont">
                  We understand that you are purchasing a new Plot and also want
                  Construction loan.
                </p>
              </div>
            {/if}
            {#if $appointmentData.PlotLoanActivity == "New Loan" && $appointmentData.constructionOnLoan == "Yes"}
              <div
                class="border-2 border-borderColo/50 rounded-md p-[0.7rem] w-full relative mt-1"
              >
                <div
                  class="absolute h-full top-0 rounded-tl-md rounded-bl-md left-0 border-2 border-yellow-500"
                ></div>

                <p class="font-Paragraph text-minParaFont">
                  We understand that you already having a Construction Loan and
                  applying for additional loan on same property. We will ask
                  about existing loan details at later stage.
                </p>
              </div>
            {/if}
          {/if}

          <!-- buttons  -->
          {#if ($appointmentData.LoanName == "Home Loan" || $appointmentData.LoanName == "Loan Against Property") && $appointmentData.LoanType && $appointmentData.LoanType != ""}
            <div
              class="flex flex-row w-full md:pb-0 pb-[1.5rem] justify-between gap-4"
            >
              <div
                class="flex flex-row mx-auto pt-[2rem] justify-between gap-4 w-full"
              >
                <button
                  type="button"
                  id="backBtn"
                  class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md back-button test {checkBack
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={() => {
                    backbutton();
                  }}>Back</button
                >

                <button
                  type="button"
                  id="nextBtn"
                  class="md:w-4/12 font-Paragraph text-para bg-btnBg w-full py-3 rounded-md next-button glowEffect {checkedNext
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={() => {
                    loaderValue = true;
                    toggleNext();
                  }}>Next</button
                >
              </div>
            </div>
          {:else if ($appointmentData.LoanName == "Personal Loan" || $appointmentData.LoanName == "Business Loan" || $appointmentData?.LoanName == "Professional Loan") && ($appointmentData.LoanType == "New Loan" || $appointmentData.LoanActivity)}
            <div
              class="flex flex-row w-full md:pb-0 pb-[1.5rem] justify-between gap-4"
            >
              <div
                class="flex flex-row mx-auto pt-[2rem] justify-between gap-4 w-full"
              >
                <button
                  type="button"
                  id="backBtn"
                  class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md back-button test {checkBack
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={() => {
                    backbutton();
                  }}>Back</button
                >

                <button
                  type="button"
                  id="nextBtn"
                  class="md:w-4/12 font-Paragraph text-minParaFont lg:text-subParaFont bg-btnBg w-full py-3 rounded-md next-button glowEffect {checkedNext
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={() => {
                    loaderValue = true;
                    toggleNext();
                  }}>Next</button
                >
              </div>
            </div>
          {:else if $appointmentData.LoanName == "Plot Loan" && (($appointmentData.PlotLoanActivity && $appointmentData.LoanType) || ($appointmentData.runningLoan == "Construction Loan Only" && $appointmentData.PlotLoanActivity == "Balance Transfer"))}
            <div
              class="flex flex-row w-full md:pb-0 pb-[1.5rem] justify-between gap-4"
            >
              <div
                class="flex flex-row mx-auto pt-[2rem] justify-between gap-4 w-full"
              >
                <button
                  type="button"
                  id="backBtn"
                  class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md back-button test {checkBack
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={() => {
                    backbutton();
                  }}>Back</button
                >

                <button
                  type="button"
                  id="nextBtn"
                  class="md:w-4/12 font-Paragraph text-minParaFont lg:text-subParaFont bg-btnBg w-full py-3 rounded-md next-button glowEffect {checkedNext
                    ? 'checked'
                    : ''} cursor-pointer"
                  onclick={() => {
                    loaderValue = true;
                    toggleNext();
                  }}>Next</button
                >
              </div>
            </div>
          {:else}
            <div
              class="flex flex-row w-full md:pb-0 pb-[1.5rem] justify-between gap-4"
            >
              <div
                class="flex flex-row mx-auto pt-[2rem] justify-between gap-4 w-full"
              >
                <button
                  type="button"
                  id="backBtn"
                  class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md test cursor-pointer"
                  onclick={() => {
                    backbutton();
                  }}>Back</button
                >
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </section>
{:else}
  <div class="flex flex-col items-center justify-center h-screen">
    <Loader />
  </div>
{/if}

<style>
  .appointment-radio {
    position: relative;
    cursor: pointer;
    display: flex;
    width: 100%;
    align-items: center;
    border: 1px solid var(--form-border, #e5e7eb);
    background-color: var(--form-bg-card, #ffffff);
    color: var(--form-text, #0f172a);
    padding: 0.8rem 1rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease-in-out;
  }

  .appointment-radio:hover {
    border-color: var(--ddsa-primary-500, #cb997e);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .appointment-radio.active {
    background-color: var(--ddsa-primary-500, #cb997e);
    color: #ffffff;
    border-color: var(--ddsa-primary-500, #cb997e);
    box-shadow: 0 4px 14px rgba(203, 153, 126, 0.35);
  }

  .appointment-radio-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .appointment-radio-dot {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 1.5px solid var(--form-text-muted, #9ca3af);
    margin-right: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
    background-color: transparent;
  }

  .appointment-radio.active .appointment-radio-dot {
    border-color: #ffffff;
    background-color: #ffffff;
    box-shadow: inset 0 0 0 3px var(--ddsa-primary-500, #cb997e);
  }

  .border-iconColor {
    border-color: var(--form-border, #e5e7eb) !important;
    background-color: var(--form-bg-alt, #f8fafc);
  }
  .border-yellow-500 {
    border-color: var(--ddsa-primary-500, #cb997e) !important;
    background-color: var(--ddsa-primary-500, #cb997e) !important;
  }
  .border-borderColo\/50 {
    border-color: var(--form-border, #e5e7eb) !important;
    background-color: var(--form-bg-alt, #f8fafc);
  }

  .test {
    background-color: var(--form-bg-card, #ffffff);
    color: var(--form-text-secondary, #4b5563);
    border: 1px solid var(--form-border, #e5e7eb);
    border-radius: 9999px;
    box-shadow: rgba(0, 0, 0, 0.05) 0px 2px 4px;
    transition: all 0.2s ease-in-out;
  }
  .test:hover {
    background-color: var(--form-bg-alt, #f8fafc);
    border-color: var(--form-border-hover, #d1d5db);
    color: var(--form-text, #0f172a);
  }
</style>
