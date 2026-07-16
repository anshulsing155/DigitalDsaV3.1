<script lang="ts">
	let {
		placeHolder = "Enter Value ",
		inputsValue = $bindable(""),
		headingValue = "",
		onChange = () => {},
		onInput = () => {},
		headingMag = ""
	} = $props();

	const formatIndianNumber = (value: any) => {
		if (value === "" || isNaN(value)) return "";
		return new Intl.NumberFormat("en-IN").format(value);
	};

	const handleInputLoanAmount = (event: any) => {
		const rawValue = event.target.value.replace(/[^0-9]/g, "");
		inputsValue = rawValue !== "" ? parseFloat(rawValue) : "";
		event.target.value = rawValue !== "" ? formatIndianNumber(inputsValue) : "";
	};
</script>

<div class="flex flex-col justify-between">
	<label for="" class="font-FifthHead md:text-minParaFont text-leastPara px-1">{headingValue}</label>  
	<div>
		<input
			type="text"
			placeholder={placeHolder}
			value={inputsValue !== "" ? formatIndianNumber(inputsValue) : ""}
			oninput={(e) => { handleInputLoanAmount(e); onInput(e); }}
			onchange={onChange}
			onwheel={(event) => event.currentTarget.blur()}
			class="w-full rounded px-2 py-1 focus:outline-none font-Paragraph text-minParaFont" 
			inputmode="numeric"
		/>
	</div>
</div>
