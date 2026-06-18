<script>
	let {
		inputType = "text",
		name = "",
		bindValue = $bindable(""),
		label = "Enter name",
		iconSrc = "",
		altIcon = "",
		disabled = false,
		imgClass = "",
		imageSize = "h-5",
		error = "",
		numIcon = "",
		onInputHandler = (event = null) => {},
		onChangeHandler = (event = null) => {}
	} = $props();















</script>

<div class="flex flex-col">
  <div class="relative flex items-center">
    <input
      {name}
      bind:value={bindValue}
      oninput={(event) => onInputHandler(event)}
      onchange={(event) => onChangeHandler(event)}
      {disabled}
      class="border-1 peer block w-full appearance-none border border-[#0000003A] py-[0.6rem] pl-[3rem] pr-4 typography-body-md text-para text-black outline-none focus:border-[var(--form-border)] focus:ring-0 {disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer bg-white'}"
      {...inputType === "password"
        ? { type: "password" }
        : inputType === "email"
          ? { type: "email" }
          : { type: "text" }}
    />
    <label
      for={name}
      class="absolute left-11 top-1 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none px-2 typography-body-md {disabled ? 'bg-gradient-to-t from-gray-100 via-gray-100 to-white text-black' : 'bg-white text-gray-500'} duration-300 peer-placeholder-shown:top-1 peer-focus:text-btnBg"
    >
      {label}
    </label>
    {#if iconSrc}
      <div
        class="absolute left-0 flex h-full w-11 items-center justify-center px-2 font-semibold {imgClass}"
      >
        <img src={iconSrc} alt={altIcon} class={imageSize} />
      </div>
    {/if}
    {#if numIcon}
      <div
        class="absolute left-0 flex h-full w-11 items-center justify-center px-2 typography-body-md text-para {imgClass}"
      >
        <span> {numIcon} </span>
      </div>
    {/if}
  </div>
  <!-- typography-body-sm md:typography-body-md -->
  {#if error}
    <p class="typography-body-md text-leastMiniFont text-dangerColor">{error}</p>
  {/if}
</div>
