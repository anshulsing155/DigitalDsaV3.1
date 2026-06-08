<script lang="ts">
	import TextField from '$lib/components/TextField.svelte';

	let answers: Record<string, string> = {
		applicantName: '',
		email: '',
		loanAmount: '',
		gstNumber: '',
		interestRate: ''
	};

	let errors: Record<string, string | null> = {};

	function updateValue(key: string, value: string) {
		answers = { ...answers, [key]: value };
	}
</script>

<div class="mx-auto w-[500px] space-y-8">
	<!-- =========================
     TEXT INPUT (Name)
========================= -->
	<TextField
		id="q_applicantName"
		label="Applicant Name"
		uiType="text"
		placeholder="Enter applicant name"
		icon="user"
		bind:value={answers.applicantName}
		onInput={(val) => updateValue('applicantName', String(val))}
		questionValue="applicantName"
		bind:errorValue={errors}
	/>

	<!-- =========================
     EMAIL INPUT
========================= -->
	<TextField
		id="q_email"
		label="Email Address"
		uiType="email"
		icon="mail"
		bind:value={answers.email}
		placeholder="example@email.com"
		onInput={(val) => updateValue('email', String(val))}
		questionValue="email"
		bind:errorValue={errors}
	/>

	<!-- =========================
     NUMBER INPUT (Loan Amount)
========================= -->
	<TextField
		id="q_loanAmount"
		label="Loan Amount"
		uiType="number"
		icon="indian-rupee"
		type="text"
		bind:value={answers.loanAmount}
		required
		enableNumberToWords
		onInput={(val) => updateValue('loanAmount', String(val))}
		placeholder="Enter loan amount"
		questionValue="loanAmount"
		bind:errorValue={errors}
	/>

	<!-- =========================
     PERCENTAGE INPUT
========================= -->
	<TextField
		id="q_interestRate"
		label="Interest Rate (%)"
		uiType="number"
		icon="percent"
		bind:value={answers.interestRate}
		fieldType="percentage"
		type="text"
		onInput={(val) => updateValue('interestRate', String(val))}
		placeholder="e.g. 10.25"
		questionValue="interestRate"
		bind:errorValue={errors}
	/>

	<!-- =========================
     GST INPUT (TEXT, NO GIBBERISH CHECK)
========================= -->
	<TextField
		id="q4_GSTNumber"
		label="GST Number"
		uiType="text"
		icon="file-text"
		bind:value={answers.gstNumber}
		type="text"
		onInput={(val) => updateValue('gstNumber', String(val))}
		placeholder="22AAAAA0000A1Z5"
		questionValue="gstNumber"
		bind:errorValue={errors}
	/>
</div>
<!-- =========================
     DEBUG OUTPUT
========================= -->
<pre class="mt-6 rounded bg-gray-100 p-4">
{JSON.stringify(answers, null, 2)}
</pre>
