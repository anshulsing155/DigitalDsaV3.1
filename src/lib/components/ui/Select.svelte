<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";

  let {
    placeholder = "Select an option",
    selectId = "",
    selectedValue = $bindable(""),
    options = [],
    classFont = "font-Paragraph text-paraFont pl-3 bg-white rounded py-2 border border-black",
    optionClass = "font-Paragraph text-paraFont pl-3 bg-white text-black",
    chevronColor = "text-gray-600",
    nestedOptions = [],
    onChange = () => {},
    selectedTitle = $bindable(""),
    disabled = false,
    required = false,
    ariaLabel = "Dropdown menu",
    errorMessage = ""
  } = $props();

  let inputRef = $state<HTMLInputElement | null>(null);
  let dropdownRef = $state<HTMLUListElement | null>(null);
  let showOptions = $state(false);
  let rotate = $state(false);
  let isMobile = $state(false);
  let focusedOptionIndex = $state(-1);
  let optionRefs = $state<HTMLElement[]>([]);

  const dispatch = createEventDispatcher();

  function toggleDropdown() {
    if (disabled) return;
    rotate = !rotate;
    showOptions = !showOptions;
    if (showOptions) {
      focusedOptionIndex = -1; // Reset focus when opening
      setTimeout(() => {
        if (dropdownRef) dropdownRef.focus();
      }, 0);
    }
  }

  function selectOption(option: any, index: number) {
    selectedValue = option;
    showOptions = false;
    rotate = false;
    focusedOptionIndex = index;

    if (typeof onChange === "function") {
      onChange(selectedValue);
    }
    dispatch("change", selectedValue);
    if (inputRef) inputRef.focus(); // Return focus to input
  }

  function nestedSelectOption(option: any, index: number) {
    selectedValue = option.value;
    selectedTitle = option.title;
    showOptions = false;
    rotate = false;
    focusedOptionIndex = index;

    if (typeof onChange === "function") {
      onChange(selectedValue);
    }
    dispatch("change", selectedValue);
    if (inputRef) inputRef.focus();
  }

  function handleBlur() {
    dispatch("focusout", selectedValue);
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      inputRef &&
      !inputRef.contains(event.target as Node) &&
      dropdownRef &&
      !dropdownRef.contains(event.target as Node)
    ) {
      showOptions = false;
      rotate = false;
      focusedOptionIndex = -1;
    }
  }

  function detectDevice() {
    isMobile = /Mobi|Android/i.test(navigator.userAgent);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (!showOptions) {
          toggleDropdown();
        } else if (focusedOptionIndex >= 0) {
          if (nestedOptions.length > 0) {
            nestedSelectOption(nestedOptions[focusedOptionIndex], focusedOptionIndex);
          } else if (options.length > 0) {
            if (typeof options[0] === "object" && "heading" in options[0]) {
              // Handle categorized options
              let flatOptions = options.flatMap((cat: any) => cat.items);
              selectOption(flatOptions[focusedOptionIndex], focusedOptionIndex);
            } else {
              selectOption(options[focusedOptionIndex], focusedOptionIndex);
            }
          }
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!showOptions) {
          toggleDropdown();
        } else {
          let maxIndex =
            nestedOptions.length > 0
              ? nestedOptions.length - 1
              : (options[0] as any)?.heading
              ? options.flatMap((cat: any) => cat.items).length - 1
              : options.length - 1;
          if (focusedOptionIndex < maxIndex) {
            focusedOptionIndex += 1;
            optionRefs[focusedOptionIndex]?.focus();
          }
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!showOptions) {
          toggleDropdown();
        } else if (focusedOptionIndex > 0) {
          focusedOptionIndex -= 1;
          optionRefs[focusedOptionIndex]?.focus();
        }
        break;
      case "Escape":
        event.preventDefault();
        showOptions = false;
        rotate = false;
        focusedOptionIndex = -1;
        if (inputRef) inputRef.focus();
        break;
      case "Tab":
        if (showOptions) {
          event.preventDefault();
          showOptions = false;
          rotate = false;
          focusedOptionIndex = -1;
        }
        break;
    }
  }

  onMount(() => {
    detectDevice();
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });

  let derivedTitle = $derived(
    nestedOptions.find((opt: any) => opt.value === selectedValue)?.title ||
    options.find((opt: any) => opt === selectedValue) ||
    placeholder
  );

  $effect(() => {
    if (!selectedTitle && derivedTitle) {
      selectedTitle = derivedTitle;
    }
  });
</script>

<div class="relative w-full" role="combobox" aria-expanded={showOptions} aria-controls="{selectId}-dropdown">
  {#if !(nestedOptions.length >= 1)}
    <div class="w-full relative text-black">
      <input
        id={selectId}
        type="text"
        readonly
        onclick={toggleDropdown}
        onkeydown={handleKeyDown}
        onblur={handleBlur}
        bind:value={selectedValue}
        class="cursor-pointer block w-full border rounded-md {classFont} text-black outline-none focus:ring-2 ring-btnBg {disabled ? 'opacity-50 cursor-not-allowed' : ''} {errorMessage ? 'border-red-500' : ''}"
        bind:this={inputRef}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={errorMessage ? "true" : "false"}
        {disabled}
        {required}
      />
      <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-xl">
        <i
          class={`fa-solid fa-angle-down ${chevronColor} text-sm transition-transform duration-200 ${rotate ? "rotate-180" : ""}`}
        ></i>
      </span>
    </div>
  {:else}
    <div class="w-full relative text-black">
      <input
        id={selectId}
        type="text"
        readonly
        onclick={toggleDropdown}
        onkeydown={handleKeyDown}
        onblur={handleBlur}
        bind:value={selectedTitle}
        class="cursor-pointer block w-full border rounded-md {classFont} text-black outline-none focus:ring-2 ring-btnBg {disabled ? 'opacity-50 cursor-not-allowed' : ''} {errorMessage ? 'border-red-500' : ''}"
        bind:this={inputRef}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={errorMessage ? "true" : "false"}
        {disabled}
        {required}
      />
      <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-xl">
        <i
          class={`fa-solid fa-angle-down ${chevronColor} text-sm transition-transform duration-200 ${rotate ? "rotate-180" : ""}`}
        ></i>
      </span>
    </div>
  {/if}

  {#if errorMessage}
    <p class="text-dangerColor text-sm mt-1">{errorMessage}</p>
  {/if}

  {#if showOptions}
    <ul
      id="{selectId}-dropdown"
      class="absolute font-Paragraph text-minParaFont lg:text-paraFont w-full shadow-lg cursor-pointer z-50 top-full mt-1 rounded max-h-[40svh] overflow-auto {optionClass} border border-gray-300 focus:outline-none"
      bind:this={dropdownRef}
      tabindex="-1"
      role="listbox"
      aria-activedescendant={focusedOptionIndex >= 0 ? `${selectId}-option-${focusedOptionIndex}` : undefined}
    >
      <!-- Categorized Options -->
      {#if Array.isArray(options) && options.length > 0 && typeof options[0] === "object" && "heading" in options[0]}
        {#each options as category, catIndex}
          <li class="bg-gray-100 text-gray-700 font-bold px-3 py-2 w-full" role="presentation">
            {category.heading}
          </li>
          {#each category.items as option, index}
            {@const globalIndex = options.slice(0, catIndex).reduce((sum, cat) => sum + cat.items.length, 0) + index}
            <li
              id="{selectId}-option-{globalIndex}"
              class="hover:bg-btnBg hover:text-black border-gray-200 p-3 transition-all ease-in-out duration-200 pl-6 {index < category.items.length - 1 ? 'border-b' : ''} {focusedOptionIndex === globalIndex ? 'bg-btnBg text-black' : ''}"
              onclick={() => selectOption(option, globalIndex)}
              onkeydown={handleKeyDown}
              bind:this={optionRefs[globalIndex]}
              tabindex="0"
              role="option"
              aria-selected={selectedValue === option}
            >
              {option}
            </li>
          {/each}
          {#if catIndex < options.length - 1}
            <li class="border-b border-gray-300" role="presentation"></li>
          {/if}
        {/each}
      <!-- Nested Options -->
      {:else if Array.isArray(nestedOptions) && nestedOptions.length}
        {#each nestedOptions as option, index}
          <li
            id="{selectId}-option-{index}"
            class="hover:bg-btnBg hover:text-black {index < nestedOptions.length - 1 ? 'border-b' : ''} border-gray-200 p-3 transition-all ease-in-out duration-200 {focusedOptionIndex === index ? 'bg-btnBg text-black' : ''}"
            onclick={() => nestedSelectOption(option, index)}
            onkeydown={handleKeyDown}
            bind:this={optionRefs[index]}
            tabindex="0"
            role="option"
            aria-selected={selectedValue === option.value}
          >
            {option.title}
          </li>
        {/each}
      <!-- Simple Options -->
      {:else if Array.isArray(options) && options.length}
        {#each options as option, index}
          <li
            id="{selectId}-option-{index}"
            class="hover:bg-btnBg hover:text-black {index < options.length - 1 ? 'border-b' : ''} border-gray-200 p-3 transition-all ease-in-out duration-200 {focusedOptionIndex === index ? 'bg-btnBg text-black' : ''}"
            onclick={() => selectOption(option, index)}
            onkeydown={handleKeyDown}
            bind:this={optionRefs[index]}
            tabindex="0"
            role="option"
            aria-selected={selectedValue === option}
          >
            {option}
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  ::-webkit-scrollbar-thumb {
    background: #ffcc00;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  li:focus {
    outline: none;
    background-color: #ffcc00;
    color: black;
  }

  @media (max-width: 640px) {
    ul {
      max-height: 50vh;
      font-size: 1.1rem;
      padding: 0.5rem 0;
    }

    li {
      padding: 0.75rem 1rem;
    }
  }
</style>
