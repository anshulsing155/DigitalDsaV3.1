<script lang="ts">
  let {
    groupVal = $bindable(""),
    groupName,
    groupValue,
    showValue = "",
    customLabel = "",
    groupId,
    emoji = "",
    onClick = () => {},
    onclick = () => {},
    onChange = () => {},
    onchange = () => {},
    className = ""
  }: {
    groupVal?: string;
    groupName: string;
    groupValue: string;
    showValue?: string;
    customLabel?: string;
    groupId: string;
    emoji?: string;
    onClick?: (e: MouseEvent) => void;
    onclick?: (e: MouseEvent) => void;
    onChange?: (e: Event) => void;
    onchange?: (e: Event) => void;
    className?: string;
  } = $props();

  function handleClick(event: MouseEvent) {
    if (!groupVal || groupVal !== groupValue) {
      onClick(event);
      onclick(event);
    }
  }

  function handleChange(event: Event) {
    onChange(event);
    onchange(event);
  }

  let renderLabel = $derived(customLabel || showValue || groupValue);
</script>

<div class="flex w-full items-center">
  <label
    for={groupId}
    class={`relative cursor-pointer font-Paragraph text-para flex border px-4 w-full py-[0.8rem] rounded-md border-iconColor items-center ${className}`}
  >
    <input
      type="radio"
      id={groupId}
      name={groupName}
      class="sr-only"
      bind:group={groupVal}
      value={groupValue}
      onclick={handleClick}
      onchange={handleChange}
    />

    {#if groupVal === groupValue}
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center">
          <i class="fa-solid fa-circle-check"></i>
          <span class="ml-2">{@html renderLabel}</span>
        </div>
        {#if emoji}
          <i class="{emoji} text-xl text-white"></i>
        {/if}
      </div>
    {:else}
      <div class="flex items-center">
        <i class="fa-regular fa-circle border-iconColor"></i>
        <span class="ml-2">{@html renderLabel}</span>
      </div>
    {/if}
  </label>
</div>

<style>
  label:has(input:checked) {
    background-color: black;
    color: white;
    border: 2px solid #fcb650;
  }
</style>
