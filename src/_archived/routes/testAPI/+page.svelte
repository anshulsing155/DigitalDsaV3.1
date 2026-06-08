<!-- <script>
	let result = null;
	let loading = false;

	let alokData = {
		loanTransaction: {
			LoanName: 'Home Loan',
			LoanType: 'New Loan',
			propertyIdentified: 'Yes',
			propertyStateName: 'Maharashtra',
			propertyCityName: 'Nagpur',
			residenceOptionSame: 'Yes',
			residenceStateName: 'Maharashtra',
			residenceCityName: 'Nagpur',
			approvedByAuthority: 'Yes',
			asPerMap: 'Yes',
			ApplicantIsNRI: 'Yes',
			propertyType: 'Leasehold',
			purchaseType: 'Direct Sale',
			PropertyStage: 'Under Construction',
			purchasedFrom: 'Builder',
			approvedBankForSelectedByUser: ['HDFC Bank', 'ICICI Bank', 'State Bank of India'],
			tellUsApplying: 'Individual / Sole-Proprietor',
			numberOfDirectorOrApplicant: 1,
			deposit: 3000000,
			propCost: 10000000,
			mortgageYear: 20,
			differentATSandPV: 'No',
			ATSReady: 'No',
			ATSvalue: 'Suggestion Required',
			agreementSellValue: 50000000,
			depositAsPerATS: 5000000,
			ifPropertyRegistered: 'Yes',
			insuranceDetailsOptions: '',
			insuranceLoanAmount: null,
			categoryOfProperty: '',
			constructionType: 'House',
			dealValue: 100000000,
			includedCurrentEMIsAmount: 0
		},

		allApplicantDetails: [
			{
				existingRoleOfPerson: 'Loan repayment and having name on the property papers',
				RelationWithPrimary: 'Primary',
				title: 'Mr.',
				fullName: 'Alok',
				employmentType: 'Salaried(Government)',
				age: 28,
				gender: 'male',
				grossIncome: 300000,
				netProfit: 300,
				netIncome: 30000,
				monthlyOtherIncome: 100000,
				creditScore: '800',
				cibilScoreAbove780: 'Yes',
				obligation: 'No',
				totalEMIs: 0,
				totalLimit: 0
			},

			{
				existingRoleOfPerson: 'Loan repayment and having name on the property papers',
				RelationWithPrimary: 'Spouse',
				title: 'Mr.',
				fullName: 'Alok_2',
				employmentType: 'Self-employed(Other)',
				incomeType: 'jdjdssd',
				gender: 'female',
				businessType: 'manufacturing',
				turnOverArray: [4000000, 4000000],
				age: 28,
				creditScore: '800',
				cibilScoreAbove780: 'Yes',
				obligation: 'No',
				totalEMIs: 0,
				totalLimit: 0
			},

			{
				existingRoleOfPerson: 'Loan repayment and having name on the property papers',
				RelationWithPrimary: 'Spouse',
				title: 'Mr.',
				fullName: 'Alok_3',
				employmentType: 'Self-employed(Professional)',
				gender: 'female',
				businessType: 'Doctor',
				grossReceiptsArray: [4000000, 4000000],
				age: 28,
				creditScore: '800',
				cibilScoreAbove780: 'Yes',
				obligation: 'No',
				totalEMIs: 0,
				totalLimit: 0
			}
		]
	};

	async function handleCalculate() {
		loading = true;
		result = null;

		try {
			const res = await fetch('https://x2ks8z4d-3000.inc1.devtunnels.ms/api/offerCalculation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(alokData)
			});

			result = await res.json();
			//console.log(result, 'result');
		} catch (err) {
			console.error(err);
			result = { error: 'Failed to fetch server response' };
		} finally {
			loading = false;
		}
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<h1 class="text-xl font-bold mb-4">Applicant Calculation</h1>

	<button
		onclick={handleCalculate}
		disabled={loading}
		class="bg-blue-600 text-white px-4 py-2 rounded"
	>
		{loading ? 'Calculating...' : 'Calculate'}
	</button>

	{#if result}
		<div class="mt-6 p-6 rounded-xl bg-white shadow-lg border border-gray-200">
			<h2 class="text-lg font-semibold mb-3 text-gray-200">API Result</h2>

			<pre class="bg-gray-900 text-white text-sm p-4 rounded-lg overflow-x-auto">
{JSON.stringify(result, null, 2)}
    </pre>
		</div>
	{/if}
</div> -->

<script lang="ts">
	type ProfileKey = 'name' | 'age' | 'employmentType' | 'mobileNo';

	let profile: Record<ProfileKey, string> = $state({
		name: '',
		age: '',
		employmentType: '',
		mobileNo: ''
	});

	let errors: Record<ProfileKey, string> = $state({
		name: '',
		age: '',
		employmentType: '',
		mobileNo: ''
	});

	const labels: Record<ProfileKey, string> = {
		name: 'Full Name',
		age: 'Age',
		employmentType: 'Employment Type',
		mobileNo: 'Mobile Number'
	};

	function validateField(key: ProfileKey, value: string): void {
		let error = '';

		if (!value) {
			error = `${labels[key]} is required`;
		} else if (key === 'age' && (Number(value) < 18 || Number(value) > 65)) {
			error = 'Age must be between 18 and 65';
		} else if (key === 'mobileNo' && !/^[6-9]\d{9}$/.test(value)) {
			error = 'Enter a valid 10-digit mobile number';
		}

		errors = { ...errors, [key]: error };
	}

	function handleInput(key: ProfileKey, value: string): void {
		profile = { ...profile, [key]: value };
		validateField(key, value);
	}

	const profileKeys: ProfileKey[] = ['name', 'age', 'employmentType', 'mobileNo'];

	let isFormValid = $derived(
		profileKeys.every((key) => profile[key]) && profileKeys.every((key) => !errors[key])
	);
</script>

<div class="mx-auto w-[80%] rounded-lg border p-6">
	<h2 class="mb-4 text-lg font-semibold">GPA Profile</h2>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#each profileKeys as key}
			<div class="flex flex-col gap-1">
				<label for={key} class="text-sm font-medium">{labels[key]}</label>

				{#if key === 'employmentType'}
					<select
						id={key}
						class="rounded border p-2"
						bind:value={profile[key]}
						onchange={(e) => handleInput(key, (e.target as HTMLSelectElement).value)}
					>
						<option value="">Select</option>
						<option>Salaried</option>
						<option>Self-Employed</option>
						<option>Business</option>
					</select>
				{:else}
					<input
						id={key}
						type={key === 'age' ? 'number' : 'text'}
						class="rounded border p-2"
						bind:value={profile[key]}
						oninput={(e) => handleInput(key, (e.target as HTMLInputElement).value)}
					/>
				{/if}

				{#if errors[key]}
					<span class="text-xs text-red-500">{errors[key]}</span>
				{/if}
			</div>
		{/each}
	</div>
</div>
