<script lang="ts">
  import { CircleCheck, Circle } from "$lib/utils/iconRegistry";

  let {
    groupVal = $bindable(),
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

  let renderLabel = $derived(customLabel || showValue || groupValue);
</script>

<div class="flex w-full items-center">
  <label
    for={groupId}
    class="radio-label relative cursor-pointer font-Paragraph text-para flex border px-4 w-full py-[0.8rem] rounded-md items-center transition-all duration-200 ease-in-out {groupVal === groupValue ? 'active' : ''} {className}"
  >
    <input
      type="radio"
      id={groupId}
      name={groupName}
      bind:group={groupVal}
      value={groupValue}
      onclick={(e) => {
        onClick(e);
        onclick(e);
        const changeEvent = new Event('change', { bubbles: true });
        onChange(changeEvent);
        onchange(changeEvent);
      }}
      class="sr-only"
    />

    {#if groupVal === groupValue}
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center">
          <CircleCheck class="h-4 w-4 shrink-0 text-white" />
          <span class="ml-2">{@html renderLabel}</span>
        </div>
        {#if emoji}
          <i class="{emoji} text-xl text-white"></i>
        {/if}
      </div>
    {:else}
      <div class="flex items-center">
        <Circle class="h-4 w-4 shrink-0 text-[var(--form-text-muted)]" />
        <span class="ml-2 text-[var(--form-text-secondary)]">{@html renderLabel}</span>
      </div>
    {/if}
  </label>
</div>

<style>
  .sr-only {
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

  .radio-label {
    border-color: var(--form-border, #e5e7eb);
    background-color: var(--form-bg-card, #ffffff);
    color: var(--form-text, #0f172a);
  }

  .radio-label:hover {
    border-color: var(--ddsa-primary-500, #cb997e);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .radio-label.active {
    background-color: var(--ddsa-primary-500, #cb997e);
    color: #ffffff;
    border-color: var(--ddsa-primary-500, #cb997e);
    box-shadow: 0 4px 14px rgba(203, 153, 126, 0.35);
  }

  .radio-label:has(input:checked) {
    background-color: var(--ddsa-primary-500, #cb997e);
    color: #ffffff;
    border-color: var(--ddsa-primary-500, #cb997e);
    box-shadow: 0 4px 14px rgba(203, 153, 126, 0.35);
  }
</style>
