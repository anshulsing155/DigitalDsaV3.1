<script lang="ts">
  let { showModal = $bindable(false), user = {} } = $props();

  function closeModal() {
    showModal = false;
    document.body.classList.remove("overflow-hidden");
  }

  function isObject(value: any) {
    return typeof value === "object" && value !== null;
  }

  $effect(() => {
    if (showModal) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  });
</script>

{#if showModal}
  <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div class="bg-[var(--landing-bg-card)] text-[var(--form-text)] border border-[var(--form-border)] rounded-lg shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="p-1 sm:p-6 bg-[var(--landing-bg-card)] border-b border-[var(--form-border)]">
        <h2 class="text-lg sm:text-xl font-bold">User Details</h2>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-1 sm:p-6" style="max-height: 65vh;">
        {#each Object.entries(user) as [key, value]}
          <details class="mb-2 border rounded-lg p-2">
            <summary class="cursor-pointer font-semibold">
              {Number(key) + 1}
            </summary>

            {#if isObject(value)}
              {#if Array.isArray(value)}
                {#each value as item, i}
                  <details class="ml-1 mt-2 border border-gray-200 rounded-md p-2">
                    <summary class="cursor-pointer font-medium">Item {i + 1}</summary>

                    {#each Object.entries(item) as [subKey, subValue]}
                      {#if isObject(subValue)}
                        <details class="ml-1 mt-2 border border-gray-200 rounded-md p-2">
                          <summary class="cursor-pointer font-medium">{subKey}</summary>
                          <ul class="ml-2">
                            {#each Object.entries(subValue as any) as [nestedKey, nestedValue]}
                              {#if isObject(nestedValue)}
                                <details class="ml-1 mt-2 border border-gray-300 rounded-md p-2">
                                  <summary class="cursor-pointer font-medium">{nestedKey}</summary>
                                  <ul class="ml-2">
                                    {#each Object.entries(nestedValue as any) as [deepKey, deepValue]}
                                      <li>
                                        <strong>{deepKey}:</strong> {deepValue}
                                      </li>
                                    {/each}
                                  </ul>
                                </details>
                              {:else}
                                <li>
                                  <strong>{nestedKey}:</strong> {nestedValue}
                                </li>
                              {/if}
                            {/each}
                          </ul>
                        </details>
                      {:else}
                        <li><strong>{subKey}:</strong> {subValue}</li>
                      {/if}
                    {/each}
                  </details>
                {/each}
              {:else}
                <ul class="ml-1">
                  {#each Object.entries(value) as [subKey, subValue]}
                    {#if isObject(subValue)}
                      <details class="ml-1 mt-2 border border-gray-200 rounded-md p-2">
                        <summary class="cursor-pointer font-medium">{subKey}</summary>
                        <ul class="ml-2">
                          {#each Object.entries(subValue as any) as [nestedKey, nestedValue]}
                            {#if isObject(nestedValue)}
                              <details class="ml-1 mt-2 border border-gray-300 rounded-md p-2">
                                <summary class="cursor-pointer font-medium">{nestedKey}</summary>
                                <ul class="ml-2">
                                  {#each Object.entries(nestedValue as any) as [deepKey, deepValue]}
                                    <li>
                                      <strong>{deepKey}:</strong> {deepValue}
                                    </li>
                                  {/each}
                                </ul>
                              </details>
                            {:else}
                              <li>
                                <strong>{nestedKey}:</strong> {nestedValue}
                              </li>
                            {/if}
                          {/each}
                        </ul>
                      </details>
                    {:else}
                      <li><strong>{subKey}:</strong> {subValue}</li>
                    {/if}
                  {/each}
                </ul>
              {/if}
            {:else}
              <p class="ml-1"><strong>{key}:</strong> {value}</p>
            {/if}
          </details>
        {/each}
      </div>

      <!-- Fixed Close Button at Bottom -->
      <div class="p-4 bg-[var(--landing-bg-alt)] border-t border-[var(--form-border)] sticky bottom-0">
        <button
          class="w-full bg-red-500 text-white px-4 py-2 rounded cursor-pointer"
          onclick={closeModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
