<script lang="ts">
  import { page } from "$app/state";
  import Loader from '$lib/components/layout/Loader.svelte';
  import { appointmentData } from "$lib/stores/stores";
  import FormLogo from "$lib/components/FormLogo.svelte";
  import { onMount } from "svelte";
  import { secureFetch } from "$lib/utils/csrf";

  let { data } = $props();

  let userEmail = $state(page.data.user?.email || "");
  let userName = $state(page.data.user?.name || "");
  let userPhone = $state(page.data.user?.mobileNumber || "");

  let loaderValue = $state(false);
  let showPopup = $state(false);
  let bookingConfirmed = $state(false);
  let buttonText = $state("Go to Home Page");
  let redirectTimeout: any;

  function startRedirectTimer() {
    clearTimeout(redirectTimeout);
    redirectTimeout = setTimeout(() => {
      buttonText = "Redirecting to homepage...";
      window.location.href = "/";
    }, 5000);
  }

  // Cleanup on unmount
  onMount(() => {
    return () => {
      clearTimeout(redirectTimeout);
    };
  });

  // Manual redirect
  function goToHomePage() {
    clearTimeout(redirectTimeout);
    buttonText = "Redirecting to homepage...";
    window.location.href = "/";
  }

  const submitForm = async () => {
    try {
      appointmentData.update((data) => ({ ...data, loading: true }));

      const response = await secureFetch("/api/appointmentdate/reschedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: userEmail,
          mobileNo: userPhone,
          dateSelected: $appointmentData.selectedDate,
          time: $appointmentData.selectedTime,
          newDate: $appointmentData.newDate,
          newTime: $appointmentData.newTime,
          newTypeAppointment: $appointmentData.typeOfAppointment,
        }),
      });
      const result = await response.json();

      if (result.success) {
        appointmentData.update((data) => ({
          ...data,
          confirmationView: true,
        }));
        bookingConfirmed = true;
        startRedirectTimer();
      } else {
        bookingConfirmed = false;
        alert("Rescheduling failed: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Error booking appointment:", error);
    } finally {
      appointmentData.update((data) => ({ ...data, loading: false }));
    }
  };
</script>

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
      <!-- Form Content -->
      <div class="flex flex-col w-full lg:w-11/12 justify-center mx-auto">
        <div class="flex w-[80%] lg:w-full py-[1rem]">
          <h2 class="font-ThirdHead text-mobSubHead md:text-headFont text-[var(--form-text)]">
            Verify Rescheduled Details
          </h2>
        </div>

        <div class="md:space-y-4 text-subParaFont md:text-paraFont">
          <div class="flex items-center pb-5 text-left">
            <label for="name" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
              >Name:</label
            >
            <input
              id="name"
              type="text"
              bind:value={userName}
              class="bg-transparent border-b flex-1 w-4/5 border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text)] px-2 focus:outline-none"
              disabled
            />
          </div>

          <div class="flex items-center pb-5">
            <label for="email" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
              >Email:</label
            >
            <input
              id="email"
              type="email"
              bind:value={userEmail}
              class="bg-transparent border-b flex-1 w-4/5 border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text)] px-2 focus:outline-none"
              disabled
            />
          </div>

          <div class="flex items-center pb-5">
            <label for="phone" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
              >Mobile:</label
            >
            <input
              id="phone"
              type="tel"
              bind:value={userPhone}
              class="bg-transparent border-b flex-1 w-4/5 border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text)] px-2 focus:outline-none"
              disabled
            />
          </div>

          <div class="flex items-center pb-5">
            <label for="date" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
              >New Date:</label
            >
            <input
              id="date"
              type="text"
              bind:value={$appointmentData.newDate}
              class="bg-transparent border-b flex-1 w-4/5 border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text)] px-2 focus:outline-none"
              disabled
            />
          </div>

          <div class="flex items-center pb-5">
            <label for="time" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
              >New Time:</label
            >
            <input
              id="time"
              type="text"
              bind:value={$appointmentData.newTime}
              class="bg-transparent border-b flex-1 w-4/5 border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text)] px-2 focus:outline-none"
              disabled
            />
          </div>
        </div>

        <div
          class="flex flex-row justify-between gap-4 mx-auto w-full md:pb-0 py-[1.5rem]"
        >
          <button
            type="button"
            id="backBtn"
            onclick={() => {
              window.history.back();
            }}
            class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para back-btn-shadow rounded-md cursor-pointer"
          >
            Back
          </button>

          <button
            onclick={async () => {
              loaderValue = true;
              await submitForm();
              loaderValue = false;
              if (bookingConfirmed) {
                showPopup = true;
              }
            }}
            type="button"
            id="nextBtn"
            class="md:w-4/12 w-full py-3 font-medium text-sm text-white bg-[var(--ddsa-primary-500)] rounded-full next-button glowEffect cursor-pointer"
          >
            Confirm Reschedule
          </button>

          {#if showPopup}
            <div
              class="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
            >
              <div
                class="bg-[var(--form-bg-card)] border border-[var(--form-border)] p-6 rounded-2xl shadow-xl text-center items-center justify-center flex flex-col mx-4 md:mx-0 max-w-sm w-full gap-4"
              >
                <div class="h-[5rem] mb-2">
                  <img
                    src="/gif/Success.gif"
                    alt="success-gif"
                    class="h-full"
                  />
                </div>
                <div class="flex flex-col gap-[2rem] w-full">
                  <div class="flex flex-col gap-2">
                    <h2 class="font-FourthHead text-xl font-bold text-[var(--form-text)]">
                      Appointment Rescheduled
                    </h2>
                    <p class="font-Paragraph text-sm text-[var(--form-text-secondary)]">
                      Your appointment has been successfully rescheduled.
                    </p>
                  </div>
                  <button
                    onclick={goToHomePage}
                    class="w-full rounded-full bg-[var(--ddsa-primary-500)] px-5 py-3 text-white font-Paragraph text-para hover:bg-[var(--ddsa-primary-600)] transition cursor-pointer"
                  >
                    {buttonText}
                  </button>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
{:else}
  <div class="flex flex-col items-center justify-center h-screen">
    <Loader />
  </div>
{/if}

<style>
</style>
