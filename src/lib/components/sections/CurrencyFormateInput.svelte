<script lang="ts">
	let {
		placeHolder = "Enter Value ",
		inputsValue = $bindable(""),
		onChange = () => {},
		onInput = () => {}
	} = $props();

	const formatIndianNumber = (value: any) => {
		if (value === "" || isNaN(value)) return "";
		return new Intl.NumberFormat("en-IN").format(value);
	};

	const handleInputLoanAmount = (event: any) => {
		const rawValue = event.target.value.replace(/[^0-9]/g, "");
		inputsValue = rawValue !== "" ? parseFloat(rawValue) : 0;
		event.target.value = rawValue !== "" ? formatIndianNumber(inputsValue) : "";
	};
</script>
  
<div class="flex items-center border border-black bg-white font-Paragraph text-minParaFont md:text-paraFont">
	<p class="p-2">₹</p>
	<input
		placeholder={placeHolder}
		value={inputsValue !== "" ? formatIndianNumber(inputsValue) : ""}
		oninput={(e) => { handleInputLoanAmount(e); onInput(e); }}
		onchange={onChange}
		onwheel={(event) => event.currentTarget.blur()}
		class="w-full pt-2 pb-2 pl-0 pr-2 outline-none"
		type="text"
	/>
</div>
