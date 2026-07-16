<script lang="ts">
	interface NestedOption {
		title: string;
		value: string;
	}

	interface Props {
		placeholder?: string;
		inputPlaceholder?: string;
		selectId?: string;
		selectedValue?: string;
		selectedTitle?: any;
		error?: any;
		icon?: string;
		options?: string[];
		iconBg?: string;
		optionListClass?: string;
		optionClass?: string;
		chevronColor?: string;
		nestedOptions?: NestedOption[];
		disabled?: boolean;
		showOptionsHeight?: string;
		onChange?: (event?: Event, value?: string) => void;
		name?: any;
	}

	let {
		placeholder = "",
		inputPlaceholder = "",
		selectId = "",
		selectedValue = $bindable(""),
		selectedTitle = $bindable(""),
		error = "",
		icon = ``,
		options = [],
		iconBg = `bg-primary`,
		optionListClass = `hover:bg-primary`,
		optionClass = `border-l border-b border-[var(--form-border)] bg-white text-black`,
		chevronColor = "text-gray-600",
		nestedOptions = [],
		disabled = false,
		showOptionsHeight = "absolute",
		onChange = () => {},
		name = ""
	}: Props = $props();


  import { onMount, createEventDispatcher } from "svelte";



// Ensure selectedValue is typed













  let inputRef = $state<HTMLInputElement | null>(null);
  let dropdownRef = $state<HTMLUListElement | null>(null);
  let showOptions = $state(false);
  let rotate = $state(false);
  let isMobile = $state(false);

  const dispatch = createEventDispatcher();
  function toggleDropdown(): void {
    rotate = !rotate;
    showOptions = !showOptions;
  }

  function isSelected(option: string): boolean {
    return option === selectedValue;
  }

  function selectOption(option: string, event?: Event): void {
    selectedValue = option;
    showOptions = false;
    rotate = false;

    if (typeof onChange === "function") {
      onChange(event, selectedValue);
    }

    dispatch("change", selectedValue);
  }



  // Function to handle selection of nested options

  function nestedSelectOption(option: NestedOption) {
    selectedValue = option.value; // Store value for backend
    selectedTitle = option.title; // Display title in UI
    showOptions = false;
    rotate = false;

    if (typeof onChange === "function") {
      onChange(undefined, selectedValue);
    }

    dispatch("change", selectedValue);
  }

  function handleBlur(): void {
    dispatch("focusout", { value: selectedValue });
  }

  function handleClickOutside(event: MouseEvent): void {
    if (
      inputRef &&
      !inputRef.contains(event.target as Node) &&
      dropdownRef &&
      !dropdownRef.contains(event.target as Node)
    ) {
      showOptions = false;
      rotate = false;
    }
  }

  function detectDevice() {
    isMobile = /Mobi|Android/i.test(navigator.userAgent);
  }

  onMount(() => {
    document.addEventListener("click", handleClickOutside);
    detectDevice();

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });

  $effect(() => {
    selectedTitle = nestedOptions.find((opt: NestedOption) => opt.value === selectedValue)?.title || inputPlaceholder;
  });
</script>

<div class="flex flex-col">
  <div class="relative w-full">
    {#if !(nestedOptions.length >= 1)}
      <div class="w-full relative text-black">
        <input
          {name}
          id={selectId}
          type="text"
          readonly
          onclick={toggleDropdown}
          onblur={handleBlur}
          onchange={onChange}
          bind:value={selectedValue}
          class="border-1 peer block w-full border py-[0.6rem] pl-[3rem] pr-4 typography-body-md text-para text-black outline-none focus:border-[var(--form-border)] focus:ring-0 {disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer border-[#0000003A] bg-white'}"
          bind:this={inputRef}
          {disabled}
        />

        <label
          for={selectId}
          class="absolute left-11 top-2 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none px-2 typography-body-md {disabled ? 'bg-gray-100 text-black' : 'bg-white text-gray-500'} duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary"
        >
          {placeholder}
        </label>

        <span
          class="absolute right-2 top-1/2 transform -translate-y-1/2 text-xl"
        >
          <i
            class={`fa-solid fa-angle-down ${chevronColor} text-sm transition-transform duration-200 ${rotate ? "rotate-180" : ""}`}
          ></i>
        </span>

        <div
          class="absolute top-0 left-0 flex h-full w-11 items-center justify-center font-semibold text-black {iconBg}"
        >
          <img src={icon} alt="icon" class="h-5 w-5" />
        </div>
      </div>
    {:else}
      <div class="w-full relative text-black">
        <input
          id={selectId}
          type="text"
          readonly
          onclick={toggleDropdown}
          onblur={handleBlur}
          onchange={onChange}
          bind:value={selectedTitle}
          class="border-1 peer block w-full border border-[#0000003A] py-[0.6rem] pl-[3rem] pr-4 typography-body-md text-para text-black focus:border-[var(--form-border)] outline-none focus:ring-0 {disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer bg-white'}"
          bind:this={inputRef}
          {disabled}
        />

        <label
          for={selectId}
          class="absolute left-11 top-2 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none {disabled ? 'bg-gradient-to-t from-gray-100 via-gray-100 to-white text-black' : 'bg-white text-gray-500'} px-2 typography-body-md duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary"
        >
          {placeholder}
        </label>

        <span
          class="absolute right-2 top-1/2 transform -translate-y-1/2 text-xl"
        >
          <i
            class={`fa-solid fa-angle-down ${chevronColor} text-sm transition-transform duration-200 ${rotate ? "rotate-180" : ""}`}
          ></i>
        </span>

        <div
          class="absolute top-0 left-0 flex h-full w-11 items-center justify-center font-semibold text-black {iconBg}"
        >
          <img src={icon} alt="icon" class="h-5 w-5" />
        </div>
      </div>
    {/if}

    {#if showOptions}
      <ul
        class="absolute -top-[17svh] border md:top-full md:border-t-0 md:border-x md:border-b {showOptionsHeight} w-full bg-white text-black shadow-md cursor-pointer z-50 rounded-b max-h-[40svh] overflow-auto typography-body-md text-para {optionClass}"
        bind:this={dropdownRef}
      >
        {#if Array.isArray(options) && options.length}
          {#each options as option, index}
            <li
              class="{optionListClass} py-2 px-4 {index < options.length - 1 ? 'border-b' : ''} border-gray-200 transition-all ease-in-out duration-200"
              role="option"
              tabindex="0"
              aria-selected={isSelected(option)}
              onclick={() => selectOption(option)}
              onkeydown={(event) =>
                event.key === "Enter" && selectOption(option)}
            >
              {option}
            </li>
          {/each}
        {:else if Array.isArray(nestedOptions) && nestedOptions.length}
          {#each nestedOptions as option, index}
            <li
              class="hover:bg-primary hover:text-black {index < nestedOptions.length - 1 ? 'border-b' : ''} border-gray-200 p-3 transition-all ease-in-out duration-200"
              role="option"
              tabindex="0"
              aria-selected={option.value === selectedValue}
              onclick={() => nestedSelectOption(option)}
              onkeydown={(event) =>
                event.key === "Enter" && nestedSelectOption(option)}
            >
              {option.title}
            </li>
          {/each}
        {/if}
      </ul>
    {/if}
  </div>
  {#if error}
    <p class="typography-body-md text-leastMiniFont text-dangerColor">{error}</p>
  {/if}
</div>

<style>
  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  /* Track */
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  /* Handle */
  ::-webkit-scrollbar-thumb {
    background: #fcb650;
  }

  /* Handle on hover */
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
