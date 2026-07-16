<script lang="ts">
  let { data } = $props();
  let form = $state(structuredClone(data.bank));

  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});
  let showModal = $state(false);
  let pendingSubmitEvent = $state<Event | null>(null);
  let errorMessage = $state("");

  const expectedTypes: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(form)) {
    if (key !== "_id") {
      expectedTypes[key] = typeof value;
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      const res = await fetch("/api/website/banksData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) alert("✅ https error");

      const result = await res.json();
      if (result.updated) {
        alert("✅ Updated successfully");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        throw new Error("Update failed");
      }
    } catch (error: any) {
      errorMessage = error.message || "❌ Update failed. Please try again.";
      alert(errorMessage);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form class="space-y-4 w-[95%] md:w-[500px] mx-auto border bg-gray-50 p-4">
  <h1 class="text-xl mb-4 font-bold">{form.BankName} Details</h1>
  {#each Object.entries(form) as [key, value], i}
    {#if key !== "_id"}
      <div class="space-y-2">
        <label class="font-FifthHead">
          {i}. {key} ({expectedTypes[key]})
        </label>
        {#if expectedTypes[key] === "number"}
          <input
            type="number"
            class="border p-2 w-full {errors[key] ? 'border-red-500' : ''}"
            bind:value={form[key]}
            disabled={isSubmitting}
            oninput={() => {
              if (errors[key]) {
                errors[key] = "";
              }
            }}
          />
        {:else}
          <input
            type="text"
            class="border p-2 w-full {errors[key] ? 'border-red-500' : ''}"
            bind:value={form[key]}
            disabled={isSubmitting}
            oninput={() => {
              if (errors[key]) {
                errors[key] = "";
              }
            }}
          />
        {/if}
        {#if errors[key]}
          <p class="text-dangerColor text-sm">{errors[key]}</p>
        {/if}
      </div>
    {/if}
  {/each}

  <button
    class="bg-blue-600 text-white px-4 py-2 rounded mt-4 disabled:bg-blue-300 cursor-pointer"
    type="button"
    onclick={(e) => {
      e.preventDefault();
      pendingSubmitEvent = e;
      showModal = true;
    }}
    disabled={isSubmitting}
  >
    {isSubmitting ? "Submitting..." : "Submit"}
  </button>
</form>

{#if showModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded shadow-lg max-w-sm w-full">
      <h2 class="text-lg font-bold mb-4">Are you sure?</h2>
      <p class="mb-6">Do you want to submit the form?</p>
      <div class="flex justify-end space-x-4">
        <button
          class="bg-gray-300 px-4 py-2 rounded cursor-pointer"
          onclick={() => {
            showModal = false;
            pendingSubmitEvent = null;
          }}
        >
          No
        </button>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer"
          onclick={() => {
            showModal = false;
            if (pendingSubmitEvent) handleSubmit(pendingSubmitEvent);
          }}
        >
          Yes
        </button>
      </div>
    </div>
  </div>
{/if}
