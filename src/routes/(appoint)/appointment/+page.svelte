<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Star, ArrowRight, ShieldCheck } from "$lib/utils/iconRegistry";

  let isBooking = $state(false);
  let activeAppointment = $derived(page.data.activeAppointments || []);
  let user = $derived(page.data.user);

  async function handleBookAppointment(url: string) {
    isBooking = true;
    try {
      await goto(url);
    } finally {
      isBooking = false;
    }
  }
</script>

<main class="mx-auto max-w-6xl px-4 py-12 md:py-20 flex-grow flex flex-col justify-center">
  <div class="grid lg:grid-cols-12 gap-12 items-center">
    <!-- Hero / Call to Action Column -->
    <div class="lg:col-span-7 flex flex-col gap-6 text-left">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-700)] text-xs font-semibold w-fit border border-[var(--ddsa-primary-100)]">
        <ShieldCheck class="w-4 h-4 text-[var(--ddsa-primary-500)]" />
        ISO 9001-2018 Certified FinTech Partner
      </div>

      <h1 class="font-ThirdHead text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[var(--form-text)]">
        Book Your Free <br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-[var(--ddsa-primary-500)] to-[var(--ddsa-accent-600)]">
          Consultation
        </span> Today
      </h1>

      <p class="font-Paragraph text-lg text-[var(--form-text-secondary)] max-w-xl">
        Get expert guidance on your loan, transfer, or overdraft options. Your first step toward tailoring the perfect solution.
      </p>

      <!-- Trust Ratings / Social Proof -->
      <div class="flex flex-wrap items-center gap-6 mt-2 pt-2 border-t border-[var(--form-border)] w-fit">
        <div class="flex items-center gap-1 text-[#ffcc00]">
          <Star class="w-5 h-5 fill-current" />
          <Star class="w-5 h-5 fill-current" />
          <Star class="w-5 h-5 fill-current" />
          <Star class="w-5 h-5 fill-current" />
          <Star class="w-5 h-5 fill-current opacity-55" />
        </div>
        <div class="font-FifthHead text-sm text-[var(--form-text-secondary)]">
          <span class="font-bold text-[var(--form-text)] text-base">4.9</span> / 5 
          <span class="text-xs text-[var(--form-text-muted)] ml-1">(18,767 client votes)</span>
        </div>
      </div>

      <!-- Action Button -->
      <div class="mt-6">
        {#if !user}
          <button
            class="glowEffect px-8 py-4 text-white font-semibold text-base rounded-full shadow-lg cursor-pointer flex items-center gap-3 w-fit"
            disabled={isBooking}
            onclick={() => handleBookAppointment("/appointment/purpose-of-the-appointment")}
          >
            {#if isBooking}
              <span class="loader"></span>
            {/if}
            Login to Book Appointment
            <ArrowRight class="w-5 h-5" />
          </button>
        {:else if activeAppointment.length > 0}
          <button
            class="glowEffect px-8 py-4 text-white font-semibold text-base rounded-full shadow-lg cursor-pointer flex items-center gap-3 w-fit"
            disabled={isBooking}
            onclick={() => handleBookAppointment("/appointment/my-appointment")}
          >
            {#if isBooking}
              <span class="loader"></span>
            {/if}
            Check Your Appointment
            <ArrowRight class="w-5 h-5" />
          </button>
        {:else}
          <button
            class="glowEffect px-8 py-4 text-white font-semibold text-base rounded-full shadow-lg cursor-pointer flex items-center gap-3 w-fit"
            onclick={() => handleBookAppointment("/appointment/purpose-of-the-appointment")}
            disabled={isBooking}
          >
            {#if isBooking}
              <span class="loader"></span>
            {/if}
            I'm Ready to Book
            <ArrowRight class="w-5 h-5" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Features / Steps Column -->
    <div class="lg:col-span-5 flex flex-col gap-6">
      <div class="p-6 md:p-8 rounded-2xl border border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-lg flex flex-col gap-6">
        <h3 class="font-FourthHead text-xl font-bold text-[var(--form-text)]">
          How It Works
        </h3>

        <!-- Step 1 -->
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-600)] flex items-center justify-center font-bold">
            1
          </div>
          <div class="flex flex-col gap-1">
            <h4 class="font-FourthHead font-semibold text-[var(--form-text)]">Select Consultation Purpose</h4>
            <p class="text-sm text-[var(--form-text-secondary)]">New loan, balance transfer, top-up, or commercial overdraft options.</p>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-600)] flex items-center justify-center font-bold">
            2
          </div>
          <div class="flex flex-col gap-1">
            <h4 class="font-FourthHead font-semibold text-[var(--form-text)]">Pick Date & Time Slot</h4>
            <p class="text-sm text-[var(--form-text-secondary)]">Choose your preferred slot. Consultations are done via Phone or Video Call.</p>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-600)] flex items-center justify-center font-bold">
            3
          </div>
          <div class="flex flex-col gap-1">
            <h4 class="font-FourthHead font-semibold text-[var(--form-text)]">Verify & Confirm</h4>
            <p class="text-sm text-[var(--form-text-secondary)]">Double check your details and immediately lock in your time with us.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  .loader {
    display: inline-block;
    width: 1.125rem;
    height: 1.125rem;
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
