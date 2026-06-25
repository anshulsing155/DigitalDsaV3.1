<script lang="ts">
  import { goto } from "$app/navigation";
  import Loader from "$lib/components/website/Loader.svelte";
  import { appointmentData } from "$lib/stores/stores";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import FormLogo from "$lib/components/FormLogo.svelte";
  import { secureFetch } from "$lib/utils/csrf";

  let { data } = $props();

  let loaderValue = $state(false);
  let selectedDate: string | null = $state(null);
  let selectedTime: string | null = $state(null);
  let daysInMonth: (Date | null)[] = $state([]);
  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());
  let defaultTimeslots = [
    { time: "3:00 PM", status: "available" },
    { time: "3:25 PM", status: "available" },
    { time: "3:50 PM", status: "available" },
    { time: "4:15 PM", status: "available" },
    { time: "4:40 PM", status: "available" },
    { time: "5:05 PM", status: "available" },
  ];
  let timeslots = $state([...defaultTimeslots]);
  let availableDates: any[] = $state([]);
  let showCalendar = $state(true);
  let typeOfAppointment: string | null = $state(null);
  let loading = $state(false);
  let availabilityError: string | null = $state(null);

  let activeState = $state({
    Calendar: true,
    Slots: false,
  });

  const loadAvailableDates = async () => {
    loading = true;
    availabilityError = null;
    try {
      const response = await secureFetch("/api/appointmentdate/booking");
      if (!response.ok) {
        throw new Error("Unable to load appointment availability.");
      }
      availableDates = await response.json();
    } catch (error) {
      console.error("Failed to load available dates:", error);
      availabilityError = "We could not load current appointment availability. Please refresh and try again.";
      availableDates = [];
    } finally {
      loading = false;
    }
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const generateCalendar = () => {
    daysInMonth = [];
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      daysInMonth.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day);
      daysInMonth.push(date);
    }
  };

  // Function to check if date or time has expired
  function isDateOrTimeExpired(appointment: any) {
    try {
      const currentDate = new Date();
      const [year, month, day] = appointment.dateSelected.split("-");
      const [time, ampm] = appointment.time.split(" ");
      const [hour, minute] = time.split(":");

      let hoursIn24Format = parseInt(hour, 10);
      if (ampm.toLowerCase() === "pm" && hoursIn24Format !== 12) {
        hoursIn24Format += 12;
      }
      if (ampm.toLowerCase() === "am" && hoursIn24Format === 12) {
        hoursIn24Format = 0;
      }

      const appointmentDate = new Date(
        `${year}-${month}-${day}T${String(hoursIn24Format).padStart(2, "0")}:${minute}:00`
      );

      return currentDate > appointmentDate; // Returns true if expired
    } catch (error) {
      console.error("Error checking date or time expiry:", error);
      return true;
    }
  }

  const fetchTimeslots = async () => {
    if (!selectedDate) return;

    try {
      const slots = defaultTimeslots.map((slot) => {
        const appointment = {
          dateSelected: selectedDate,
          time: slot.time,
        };

        // Check if the timeslot is expired
        if (isDateOrTimeExpired(appointment)) {
          return { ...slot, status: "expired" };
        }
        return { ...slot };
      });

      const matchingDate = availableDates.find(
        (item) => item.dateSelected === selectedDate
      );

      if (matchingDate) {
        matchingDate.AppointmentData.forEach((appointment: any) => {
          const slotIndex = slots.findIndex(
            (slot) => slot.time === appointment.time
          );
          if (slotIndex !== -1) {
            slots[slotIndex].status = "booked";
          }
        });
      }

      timeslots = slots;
    } catch (error) {
      console.error("Failed to fetch timeslots:", error);
      timeslots = defaultTimeslots.map((slot) => ({ ...slot }));
    }
  };

  const getAvailabilityCount = (date: Date) => {
    const dateString = formatDate(date);
    const match = availableDates.find((item) => item.dateSelected === dateString);
    const bookedTimes = new Set((match?.AppointmentData || []).map((item: any) => item.time));

    return defaultTimeslots.filter((slot) => {
      if (bookedTimes.has(slot.time)) return false;
      return !isDateOrTimeExpired({ dateSelected: dateString, time: slot.time });
    }).length;
  };

  const getAvailabilityClass = (count: number) => {
    if (count > 4) return "high-availability";
    if (count > 2) return "medium-availability";
    if (count > 0) return "low-availability";
    return "no-availability";
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectDate = (date: Date) => {
    if (!date || isDateDisabled(date)) return;
    selectedDate = formatDate(date);
    selectedTime = null;
    fetchTimeslots();
    activeState.Calendar = false;
    activeState.Slots = true;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || date.getDay() === 0 || getAvailabilityCount(date) <= 0;
  };

  const changeMonth = (direction: number) => {
    currentMonth += direction;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    generateCalendar();
  };

  onMount(async () => {
    loaderValue = true;
    await loadAvailableDates();
    generateCalendar();
    loaderValue = false;
  });

  $effect(() => {
    $appointmentData.selectedDate = selectedDate;
  });
  $effect(() => {
    $appointmentData.selectedTime = selectedTime;
  });
  $effect(() => {
    $appointmentData.typeOfAppointment = typeOfAppointment;
  });
  $effect(() => {
    if (showCalendar && selectedDate) {
      fetchTimeslots();
    }
  });
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
      class="flex justify-center px-[1rem] md:px-[2rem] lg:px-0 flex-col gap-8 mx-auto w-full md:pb-10 pt-12 md:pt-16"
    >
      <!-- Step Progress Bar -->
      <div class="progress-steps">
        <div class="progress-step-item completed">
          <div class="progress-step-dot">1</div>
          <div class="progress-step-label">Purpose</div>
        </div>
        <div class="progress-step-line filled"></div>
        <div class="progress-step-item active">
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
            Choose Date & Time
          </h2>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2 flex-start w-full">
            <h3 class="font-FourthHead text-subParaFont lg:text-paraFont">
              Plan Your Appointment in Just a Few Steps
            </h3>
            <p class="font-Paragraph text-minParaFont">
              Get Started by Selecting Your Preferred Date, Time & Type of
              Appointment
            </p>
          </div>

          <div class="grid">
            {#if availabilityError}
              <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {availabilityError}
              </div>
            {/if}
            {#if activeState.Slots}
              <div transition:fly={{ x: 400, duration: 500 }}>
                <!-- Header -->
                <h3
                  class="font-FifthHead text-paraFont md:text-minSubHead text-center mb-8"
                >
                  Available Timeslots on <br />
                  <span class="font-FourthHead text-btnBg">
                    {selectedDate || "Selected Date"}
                  </span>
                </h3>

                <!-- Timeslots Grid -->
                <div
                  class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10"
                >
                  {#each timeslots as slot}
                    <button
                      type="button"
                      class="flex flex-col items-center justify-center border rounded-md
                                                   transition-all duration-200 py-2 cursor-pointer
                                                   {slot.status === 'booked' ||
                      slot.status === 'expired'
                        ? 'bg-[var(--form-bg-disabled)] border-[var(--form-border)] cursor-not-allowed opacity-50 text-[var(--form-text-muted)]'
                        : 'hover:border-[var(--ddsa-primary-500)] hover:bg-[var(--ddsa-primary-50)] border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text)]'} 
                                                   {slot.time === selectedTime
                        ? 'bg-[var(--ddsa-primary-50)]! border-[var(--ddsa-primary-500)]! text-[var(--ddsa-primary-700)]!'
                        : ''}"
                      onclick={() =>
                        slot.status === "available"
                          ? (selectedTime = slot.time)
                          : null}
                      disabled={slot.status === "booked" ||
                        slot.status === "expired"}
                    >
                      <span class="font-Paragraph text-para">{slot.time}</span>
                      {#if slot.status === "booked"}
                        <span class="text-leastMiniFont text-red-500">Unavailable</span>
                      {/if}
                      {#if slot.status === "expired"}
                        <span class="text-leastMiniFont text-red-500">Expired</span>
                      {/if}
                    </button>
                  {/each}
                </div>

                <!-- Appointment Type Selection -->
                <div class="mt-4">
                  <p
                    class="block font-FifthHead text-paraFont md:text-minSubHead text-center mb-4"
                  >
                    Type of Appointment
                  </p>
                  <div class="grid grid-cols-2 gap-4 justify-center">
                    <button
                      type="button"
                      class="flex flex-col items-center justify-center gap-2 px-4 py-2 rounded-xl border
                                                   transition-all duration-200 cursor-pointer
                                                   {typeOfAppointment ===
                      'Video Call'
                        ? 'bg-[var(--ddsa-primary-50)] border-[var(--ddsa-primary-500)] text-[var(--ddsa-primary-700)]'
                        : 'border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text)] hover:border-[var(--ddsa-primary-500)] hover:bg-[var(--ddsa-primary-50)]'}"
                      onclick={() => (typeOfAppointment = "Video Call")}
                    >
                      <svg
                        class="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect
                          x="1"
                          y="5"
                          width="15"
                          height="14"
                          rx="2"
                          ry="2"
                        />
                      </svg>
                      <span class="text-sm">Video Call</span>
                    </button>

                    <button
                      type="button"
                      class="flex flex-col items-center justify-center gap-2 px-4 py-2 rounded-xl border
                                                   transition-all duration-200 cursor-pointer
                                                   {typeOfAppointment ===
                      'Phone Call'
                        ? 'bg-[var(--ddsa-primary-50)] border-[var(--ddsa-primary-500)] text-[var(--ddsa-primary-700)]'
                        : 'border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text)] hover:border-[var(--ddsa-primary-500)] hover:bg-[var(--ddsa-primary-50)]'}"
                      onclick={() => (typeOfAppointment = "Phone Call")}
                    >
                      <svg
                        class="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                        />
                      </svg>
                      <span class="text-sm">Phone Call</span>
                    </button>
                  </div>
                </div>
              </div>
            {:else if activeState.Calendar}
              <div class="rounded-lg border border-[var(--form-border)] md:col-span-2 overflow-hidden bg-[var(--form-bg-card)]">
                <div
                  class="grid grid-cols-3 items-center md:px-3 py-5 bg-[var(--form-bg-alt)] text-xs md:text-[1.3rem] font-semibold text-center border-b border-[var(--form-border)]"
                >
                  <button
                    type="button"
                    class="arrow-left flex justify-start items-center cursor-pointer border-none bg-transparent"
                    onclick={() => changeMonth(-1)}
                  >
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                      class="h-5 text-[var(--ddsa-primary-500)]"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                      ></path></svg
                    >
                  </button>
                  <h3
                    class="text-[var(--ddsa-primary-600)] items-center justify-center flex font-semibold"
                  >
                    {new Date(currentYear, currentMonth).toLocaleString(
                      "default",
                      {
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </h3>
                  <button
                    type="button"
                    class="arrow-right flex justify-end items-center cursor-pointer border-none bg-transparent"
                    onclick={() => changeMonth(1)}
                  >
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                      class="h-5 text-[var(--ddsa-primary-500)]"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      ></path></svg
                    >
                  </button>
                </div>
                <div
                  class="grid grid-cols-7 text-center justify-center px-[1rem] md:py-3 py-2 text-sm font-bold text-[var(--form-text-muted)] border-b border-[var(--form-border)]"
                >
                  <div>S</div>
                  <div>M</div>
                  <div>T</div>
                  <div>W</div>
                  <div>T</div>
                  <div>F</div>
                  <div>S</div>
                </div>
                <div class="calendar-grid">
                  {#each daysInMonth as day}
                    <button
                      type="button"
                      class="calendar-day text-center text-sm font-medium p-1 md:p-3 rounded cursor-pointer transition duration-200 ease-in-out border
                                      {day && isToday(day) ? 'today' : ''} 
                                      {day && formatDate(day) === selectedDate
                        ? 'selected'
                        : ''} 
                                      {day && !isDateDisabled(day)
                        ? getAvailabilityClass(getAvailabilityCount(day))
                        : 'disabled'}"
                      onclick={() =>
                        day && !isDateDisabled(day) ? selectDate(day) : null}
                    >
                      {day ? day.getDate() : ""}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
        <div
          class="flex flex-row w-full md:pb-0 pb-[1.5rem] justify-between gap-4"
        >
          <div
            class="flex flex-row mx-auto pt-[2rem] justify-between gap-4 w-full"
          >
            {#if activeState.Calendar}
              <button
                type="button"
                id="backBtn"
                onclick={() => history.back()}
                class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md test cursor-pointer"
                >Back</button
              >
            {:else}
              <button
                type="button"
                id="backBtn"
                onclick={() => {
                  activeState.Calendar = true;
                  activeState.Slots = false;
                }}
                class="md:w-2/12 w-4/12 py-3 font-Paragraph text-para rounded-md test cursor-pointer"
                >Back</button
              >
            {/if}

            {#if selectedTime && typeOfAppointment}
              <button
                type="button"
                id="nextBtn"
                onclick={() => goto("appointment-confirmation")}
                class="md:w-4/12 font-Paragraph text-minParaFont lg:text-subParaFont bg-btnBg w-full py-3 rounded-md next-button glowEffect cursor-pointer
                          {!(selectedDate && selectedTime && typeOfAppointment)
                  ? 'cursor-not-allowed opacity-50'
                  : ''}"
                disabled={!(selectedDate && selectedTime && typeOfAppointment)}
              >
                Next
              </button>
            {/if}
          </div>
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
