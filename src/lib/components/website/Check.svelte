
<script lang="ts">
	interface Props {
		groupVal: string[];
		groupName: string;
		groupValue: string[];
		groupId: string;
		onChange?: any;
		className?: any;
		checkColor?: any;
		disabled?: boolean;
	}

	let {
		groupVal = $bindable(),
		groupName,
		groupValue,
		groupId,
		onChange = () => {},
		className = "",
		checkColor = "btnBg",
		disabled = false
	}: Props = $props();


// Selected checkbox values array
// Name for the checkbox group
// Multiple values for checkboxes
// Unique identifier for the checkbox group
// Callback for change event
// Custom classes
// Checkbox check color


  function handleChange(event: Event) {
    if (disabled) return; // Prevent interaction when disabled

    const checkbox = event.target as HTMLInputElement;
    const value = checkbox.value;

    if (checkbox.checked) {
// Ensure the value is added only once
groupVal = [...new Set([...groupVal, value])];
    } else {
// Remove unchecked value
groupVal = groupVal.filter((item) => item !== value);
    }

    onChange();
  }
</script>

<div class="grid items-center gap-2">
  {#each groupValue as value}
    <label
      for={value}
      class={`relative flex items-center gap-2 ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <!-- Hidden native checkbox -->
      <input
        type="checkbox"
        id={value}
        name={groupName}
        class="sr-only"
        {value}
        checked={groupVal.includes(value)}
        onchange={handleChange}
        {disabled}
      />

      <!-- Custom checkbox display - it should not toggle when disabled -->
      {#if groupVal.includes(value)}
        <span><i class="fa-solid fa-check-square text-{checkColor}"></i></span>
      {:else}
        <span><i class="fa-regular fa-square border-iconColor"></i></span>
      {/if}

      <span class="ml-2 typography-body-md text-[var(--form-text-secondary)]">{value}</span>
    </label>
  {/each}
</div>
