<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import FormLogo from "$lib/components/FormLogo.svelte";
  import { secureFetch } from "$lib/utils/csrf";
  import { CalendarX, Plus } from "lucide-svelte";

  let appointmentDetails = $derived(page.data.activeAppointments?.[0] || {});
  let appointmentActive = $derived(!!page.data.activeAppointments?.[0]);

  let isRescheduling = $state(false);
  let isCanceling = $state(false);
  let isLoading = $state(false);

  const handleReschedule = () => {
    isRescheduling = true;
  };

  const confirmReschedule = () => {
    goto("/appointment/pick-a-slot-to-reschedule");
    isRescheduling = false;
  };

  const cancelReschedule = () => {
    isRescheduling = false;
  };

  const handleCancel = () => {
    isCanceling = true;
  };

  const confirmCancel = async () => {
    try {
      isLoading = true;
      if (!appointmentDetails || Object.keys(appointmentDetails).length === 0) {
        alert("⚠️ No active appointment found to cancel.");
        isLoading = false;
        return;
      }

      // Extract user details
      const userEmail = appointmentDetails.loginEmail;
      const userPhone = appointmentDetails.loginMobileNo;

      // Call the backend API
      const response = await secureFetch("/api/appointmentdate/cancel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateSelected: appointmentDetails.dateSelected,
          time: appointmentDetails.time,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert("❌ Failed to cancel the appointment: " + result.message);
        isLoading = false;
        return;
      }
      window.location.href = "/appointment";
    } catch (error) {
      console.error("❌ Error cancelling appointment:", error);
      alert("❌ Something went wrong. Please try again.");
    } finally {
      isLoading = false;
    }
  };

  const cancelCancel = () => {
    isCanceling = false;
  };

  const confirmCancelAppointment = async () => {
    try {
      isLoading = true;
      if (!appointmentDetails || Object.keys(appointmentDetails).length === 0) {
        alert("No active appointment found to cancel.");
        return;
      }

      const response = await secureFetch("/api/appointmentdate/cancel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateSelected: appointmentDetails.dateSelected,
          time: appointmentDetails.time,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert("Failed to cancel the appointment: " + (result.error || result.message));
        return;
      }

      window.location.href = "/appointment";
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      isLoading = false;
    }
  };
</script>

<section
  class="w-full bg-[var(--form-bg-card)] text-[var(--form-text)] rounded-3xl z-10 shadow-lg border border-[var(--form-border)] relative"
  id="formData"
>
  <div class="absolute right-[1rem] md:right-[2rem] top-4 md:w-full">
    <FormLogo />
  </div>
  <div
    class="flex flex-col gap-8 justify-center px-[1rem] md:px-[2rem] lg:px-0 mx-auto w-full pb-[1.5rem] md:pb-10 pt-12 md:pt-16"
  >
    <div class="flex flex-col w-full lg:w-11/12 justify-center mx-auto">
      <div class="flex w-[80%] lg:w-full py-[1rem]">
        <h2 class="font-ThirdHead text-mobSubHead md:text-headFont text-[var(--form-text)]">
          Your Appointment Details
        </h2>
      </div>
      {#if appointmentActive}
        <div class="mb-5">
          <div class="md:space-y-4 text-subParaFont md:text-paraFont">
            <div class="flex items-center pb-5 text-left">
              <label for="name" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
                >Name :
              </label>
              <input
                id="name"
                type="text"
                value={appointmentDetails.name || ""}
                class="flex-1 w-4/5 bg-transparent border-b border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text-secondary)] px-2 focus:outline-none cursor-not-allowed"
                disabled
              />
            </div>

            <div class="flex items-center pb-5 text-left">
              <label for="email" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
                >Email :
              </label>
              <input
                id="email"
                type="email"
                value={appointmentDetails.emailId || ""}
                class="flex-1 w-4/5 bg-transparent border-b border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text-secondary)] px-2 focus:outline-none cursor-not-allowed"
                disabled
              />
            </div>

            <div class="flex items-center pb-5 text-left">
              <label for="phone" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
                >Mobile :
              </label>
              <input
                id="phone"
                type="tel"
                value={appointmentDetails.mobileNo || ""}
                class="flex-1 w-4/5 bg-transparent border-b border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text-secondary)] px-2 focus:outline-none cursor-not-allowed"
                disabled
              />
            </div>

            <div class="flex items-center pb-5 text-left">
              <label for="date" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
                >Date :
              </label>
              <input
                id="date"
                type="text"
                value={appointmentDetails.dateSelected || ""}
                class="flex-1 w-4/5 bg-transparent border-b border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text-secondary)] px-2 focus:outline-none cursor-not-allowed"
                disabled
              />
            </div>

            <div class="flex items-center md:pb-5 text-left">
              <label for="time" class="w-1/5 text-[var(--form-text-label)] font-FourthHead"
                >Time :
              </label>
              <input
                id="time"
                type="text"
                value={appointmentDetails.time || ""}
                class="flex-1 w-4/5 bg-transparent border-b border-[var(--form-border)] font-Paragraph text-para text-[var(--form-text-secondary)] px-2 focus:outline-none cursor-not-allowed"
                disabled
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col md:flex-row gap-4 md:gap-10 justify-center">
          <button
            class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-para hover:opacity-90 md:w-auto bg-[var(--ddsa-primary-500)] border-[var(--ddsa-primary-500)] text-white cursor-pointer"
            onclick={handleReschedule}>Reschedule</button
          >
          <button
            class="w-full rounded-full border px-[2rem] py-3 font-Paragraph text-para hover:opacity-90 md:w-auto border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text)] cursor-pointer hover:bg-[var(--form-bg-alt)] hover:border-[var(--form-border-hover)]"
            onclick={handleCancel}>Cancel Appointment</button
          >
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center bg-[var(--form-bg-alt,rgba(0,0,0,0.02))] rounded-2xl border border-dashed border-[var(--form-border)]">
          <div class="w-16 h-16 bg-[var(--form-bg-card)] rounded-full flex items-center justify-center shadow-md mb-4 border border-[var(--form-border)]">
            <CalendarX class="w-8 h-8 text-[var(--ddsa-primary-500,#cb997e)]" />
          </div>
          <h3 class="font-ThirdHead text-lg md:text-xl text-[var(--form-text)] font-semibold mb-2">
            No Scheduled Consultations
          </h3>
          <p class="font-Paragraph text-sm md:text-para text-[var(--form-text-muted,#6b7280)] max-w-sm mb-6">
            You don't have any upcoming loan or investment consultations scheduled at the moment. Let's find the best solution for you!
          </p>
          <a
            href="/appointment"
            class="inline-flex items-center gap-2 rounded-full bg-[var(--ddsa-primary-500,#cb997e)] text-white px-6 py-3 font-Paragraph text-para font-semibold shadow-md hover:bg-[var(--ddsa-primary-600,#b97550)] hover:shadow-lg transition duration-200 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            Book a New Appointment
          </a>
        </div>
      {/if}
    </div>
  </div>
</section>

{#if isRescheduling}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
  >
    <div
      class="w-[90%] max-w-md rounded-2xl bg-[var(--form-bg-card)] border border-[var(--form-border)] p-6 shadow-xl transition-all duration-300 sm:p-8 flex flex-col gap-4 text-[var(--form-text)]"
    >
      <h3 class="font-FourthHead text-subTitle text-[var(--form-text)] mb-2 text-center">
        Reschedule Appointment
      </h3>
      <p class="text-center font-Paragraph text-para text-[var(--form-text-secondary)] mb-6">
        Are you sure you want to reschedule your appointment?
      </p>

      <div class="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <button
          class="w-full rounded-full bg-[var(--ddsa-primary-500)] px-5 py-3 text-white font-Paragraph text-para hover:bg-[var(--ddsa-primary-600)] transition cursor-pointer"
          onclick={confirmReschedule}
        >
          Reschedule
        </button>
        <button
          class="w-full rounded-full border border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text-secondary)] px-5 py-3 font-Paragraph text-para hover:bg-[var(--form-bg-alt)] transition cursor-pointer"
          onclick={cancelReschedule}
        >
          Back
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isCanceling}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
  >
    <div
      class="w-[90%] max-w-md rounded-2xl bg-[var(--form-bg-card)] border border-[var(--form-border)] p-6 shadow-xl transition-all duration-300 sm:p-8 flex flex-col gap-4 text-[var(--form-text)]"
    >
      <h3
        class="font-FourthHead text-subTitle text-red-500 mb-2 text-center"
      >
        Cancel Appointment
      </h3>
      <p class="text-center font-Paragraph text-para text-[var(--form-text-secondary)] mb-6">
        Are you sure you want to cancel your appointment?
      </p>

      <div class="flex flex-col sm:flex-row gap-4">
        <button
          class="w-full flex justify-center items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-white font-Paragraph text-para hover:bg-red-600 transition cursor-pointer"
          onclick={confirmCancelAppointment}
        >
          {#if isLoading}
            <span class="loader border-white border-t-transparent"></span>
          {/if}
          Cancel
        </button>

        <button
          class="w-full rounded-full border border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text-secondary)] px-5 py-3 font-Paragraph text-para hover:bg-[var(--form-bg-alt)] transition cursor-pointer"
          onclick={cancelCancel}
        >
          Back
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .loader {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid white;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
