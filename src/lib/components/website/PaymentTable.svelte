<script>
	let {
		tableData = {
    heading: "Selected services; Quarter 3, 2024",
    para: "Payment services",
    linkName: "",
    url: "",
    columnName: [
      "Reporting type",
      "Withdraw/deposit cash at ATM",
      "Transact over-the-counter in a branch",
      "Make card payments (cardholders)",
      "Accept card payments (businesses)",
      "Access accounts using online banking (web browser or mobile device app)",
      "Make/receive account transfers – fast payments",
      "Make/receive account transfers – next business day",
    ],
    rowData: [
      {
        "Service availability %": [
          "100.00",
          "100.00",
          "100.00",
          "100.00",
          "100.00",
          "99.95",
          "100.00",
        ],
      },
      {
        "Significant outages due to problems at undefined (in hours:minutes)": [
          "0:00",
          "0:00",
          "0:00",
          "0:00",
          "0:00",
          "0:00",
          "0:00",
        ],
      },
      {
        "Significant outages due to problems at system-wide infrastructure or natural disasters (in hours:minutes)":
          ["0:00", "0:00", "0:00", "0:00", "0:00", "1:00", "0:00"],
      },
    ],
  },
		textCenter = "center"
	} = $props();


;


</script>

{#if tableData.heading || tableData.para || tableData.linkName}
  <div class="flex flex-col gap-[2rem]">
    {#if tableData.heading}
      <h2 class="typography-body-md !font-semibold text-black dark:text-white">{@html tableData.heading}</h2>
    {/if}

    <div class="mb-[2rem] flex items-center justify-between">
      {#if tableData.para}
        <p class="typography-body-md text-black dark:text-white">{@html tableData.para}</p>
      {/if}
      {#if tableData.linkName}
        <!-- <a
          href={tableData.url}
          class="typography-body-md underline hover:no-underline"
          >{@html tableData.linkName}</a
        > -->
        <Anchor link={tableData.url} linkName={tableData.linkName} />
      {/if}
    </div>
  </div>
{/if}
<div class="overflow-x-auto">
  <table
    class="min-w-full border border-[var(--form-border)] typography-body-md text-black"
  >
    <thead class="bg-[#495057]">
      <tr>
        {#each tableData.columnName as column}
          <th
            class="border-y typography-body-md px-4 py-4 text-left text-white"
            >{@html column}</th
          >
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each tableData.rowData as row, i}
        <tr class={`${i % 2 === 0 ? "bg-[#e5e5e5]" : "bg-[#f8f9fa]"} typography-body-md !text-black`}>
          <td class="border-y border-[var(--form-border)] p-4 text-left">
            {@html Object.keys(row)}
          </td>

          {#each Object.values(row) as value}
            {#each value as val, index}
              <td class="border-y border-[var(--form-border)] px-4 py-2">
                {@html value[index]}
              </td>
            {/each}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
