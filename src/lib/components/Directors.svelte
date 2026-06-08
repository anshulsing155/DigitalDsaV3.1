<script lang="ts">
	import directorTableConfig from '$lib/config/directorTable.json';
	import { onMount } from 'svelte';
	import NumberFieldIndianFormat from './NumberFieldIndianFormat.svelte';

	interface Props {
		answers?: any;
		directors?: any[];
	}

	let { answers = $bindable({}), directors = $bindable([]) }: Props = $props();

	let numberOfDirectors = $state<number | undefined>(undefined);
	let numberOfDirectorsError = $state('');
	let numberOfDirectorsTouched = $state(false);
	let directorErrors: any[] = $state([]);

	// Validation functions
	function validateNumberOfDirectors(value: any): string {
		const num = Number(value);

		if (!value || isNaN(num) || num < 1) {
			return 'Minimum 1 director required';
		}
		if (num > 5) {
			return 'Maximum allowed directors is 5';
		}
		return '';
	}

	function validateDirectorName(value: string): string {
		if (!value || value.trim().length === 0) {
			return 'Name required';
		}
		if (value.trim().length < 2) {
			return 'Name must be at least 2 characters';
		}
		if (!/^[A-Za-z\s]+$/.test(value)) {
			return 'Name can contain only letters and spaces';
		}
		if (/(.)\1{2,}/.test(value)) {
			return 'Letters cannot repeat more than 2 times';
		}
		return '';
	}

	function validateDirectorIncome(value: string): string {
		if (!value || value.trim().length === 0) {
			return 'Income required';
		}
		const num = Number(value);
		if (isNaN(num) || num <= 0) {
			return 'Income must be a positive number';
		}
		return '';
	}

	function validateDirectorCibil(value: string): string {
		if (!value || value.trim().length === 0) {
			return 'CIBIL required';
		}
		const num = Number(value);
		if (isNaN(num)) {
			return 'CIBIL must be a number';
		}
		if (num > 900) {
			return 'CIBIL must not be more than 900';
		}
		return '';
	}

	// Validate individual director field
	function validateDirectorField(index: number, field: string, value: any): string {
		let error = '';

		switch (field) {
			case 'name':
				error = validateDirectorName(value);
				break;
			case 'income':
				error = validateDirectorIncome(value);
				break;
			case 'cibil':
				error = validateDirectorCibil(value);
				break;
		}

		return error;
	}

	// Update directors section validation status
	function updateDirectorsValidation() {
		if (
			numberOfDirectorsError ||
			!numberOfDirectors ||
			numberOfDirectors < 1 ||
			numberOfDirectors > 5
		) {
			answers.directorsValidate = false;
			return;
		}

		const allValid = directors.every((director: Record<string, unknown>, i: number) => {
			const errors = directorErrors[i] || {};
			return (
				director?.name &&
				director?.income &&
				director?.cibil &&
				!errors.name &&
				!errors.income &&
				!errors.cibil
			);
		});

		answers.directorsValidate = allValid;
	}

	// Initialize directors array when count changes
	function initializeDirectors() {
		const count = Number(numberOfDirectors) || 0;

		directors = Array.from({ length: count }, (_: unknown, i: number) => {
			return directors[i] || { name: '', income: '', cibil: '' };
		});

		directorErrors = Array.from({ length: count }, (_: unknown, i: number) => {
			return directorErrors[i] || { name: '', income: '', cibil: '' };
		});

		answers.directors = directors;
		updateDirectorsValidation();
	}

	// Handle number of directors input
	function handleNumberOfDirectorsInput(value: number | null) {
		numberOfDirectors = value ?? undefined;
		numberOfDirectorsTouched = false;
		if (numberOfDirectorsError) {
			numberOfDirectorsError = '';
		}
		// Trigger initialization on valid input
		const error = validateNumberOfDirectors(numberOfDirectors);
		if (!error) {
			answers.numberOfDirectors = Number(numberOfDirectors);
			initializeDirectors();
		}
	}

	// Handle number of directors change
	function handleNumberOfDirectorsChange() {
		numberOfDirectorsError = validateNumberOfDirectors(numberOfDirectors);

		if (!numberOfDirectorsError) {
			answers.numberOfDirectors = Number(numberOfDirectors);
			initializeDirectors();
		} else {
			updateDirectorsValidation();
		}
	}

	// Handle number of directors blur
	function handleNumberOfDirectorsBlur() {
		numberOfDirectorsTouched = true;
		handleNumberOfDirectorsChange();
	}

	// Handle director field input (clear error)
	function handleDirectorInput(index: number, field: string) {
		if (directorErrors[index]?.[field]) {
			directorErrors = directorErrors.map((error: Record<string, string>, i: number) =>
				i === index ? { ...error, [field]: '' } : error
			);
		}
	}

	// Handle director field blur (validate)
	function handleDirectorBlur(index: number, field: string, value: any) {
		const error = validateDirectorField(index, field, value);

		directorErrors = directorErrors.map((errorObj: Record<string, string>, i: number) =>
			i === index ? { ...errorObj, [field]: error } : errorObj
		);

		directors = [...directors];
		answers.directors = directors;
		updateDirectorsValidation();
	}

	// Mount: Load existing data and validate
	onMount(() => {
		if (answers.numberOfDirectors) {
			numberOfDirectors = answers.numberOfDirectors;
		}

		if (answers.directors?.length > 0) {
			directors = answers.directors;
			numberOfDirectors = directors.length;

			// Validate all existing directors
			directorErrors = directors.map((director: Record<string, unknown>) => ({
				name: director.name ? validateDirectorName(director.name as string) : '',
				income: director.income ? validateDirectorIncome(director.income as string) : '',
				cibil: director.cibil ? validateDirectorCibil(director.cibil as string) : ''
			}));

			updateDirectorsValidation();
		}
	});
</script>

<div class="mt-8">
	<div class="">
		<label
			for="numberOfDirectors"
			class="text-labelText mb-1 block text-black dark:text-[var(--form-text-label)]"
		>
			How many directors currently exist in this company?
		</label>

		<NumberFieldIndianFormat
			value={numberOfDirectors}
			isTouched={numberOfDirectorsTouched}
			onInput={handleNumberOfDirectorsInput}
			onBlur={handleNumberOfDirectorsBlur}
			onChange={handleNumberOfDirectorsChange}
		/>

		{#if numberOfDirectorsError && numberOfDirectorsTouched}
			<p class="mt-1 text-sm text-red-500">{numberOfDirectorsError}</p>
		{/if}
	</div>

	{#if (numberOfDirectors ?? 0) > 0 && (numberOfDirectors ?? 0) <= 5}
		<table class="mt-4 w-full">
			<thead>
				<tr class="bg-gray-100">
					<th class="border px-2 py-1 text-sm">#</th>
					<th class="border px-2 py-1 text-sm">Director Name</th>
					<th class="border px-2 py-1 text-sm">Income</th>
					<th class="border px-2 py-1 text-sm">CIBIL Score</th>
				</tr>
			</thead>

			<tbody>
				{#each directors as director, i}
					<tr>
						<td class="border p-1 text-center">{i + 1}</td>

						<td class="border p-1">
							<input
								type="text"
								maxlength="50"
								bind:value={director.name}
								oninput={(e: Event) => {
									const target = e.target as HTMLInputElement;
									const v = target.value
										.replace(/[^A-Za-z\s]/g, '')
										.replace(/^\s+/, '')
										.replace(/\s{2,}/g, ' ');
									target.value = v;
									director.name = v;
									handleDirectorInput(i, 'name');
								}}
								onblur={(e) => handleDirectorBlur(i, 'name', director.name)}
								class="w-full rounded-md border border-grayTwo p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
								placeholder="Full Name"
							/>
							{#if directorErrors[i]?.name}
								<p class="text-xs text-red-500">{directorErrors[i].name}</p>
							{/if}
						</td>

						<td class="border p-1">
							<input
								type="text"
								maxlength="15"
								bind:value={director.income}
								oninput={(e: Event) => {
									const target = e.target as HTMLInputElement;
									const v = target.value.replace(/[^0-9]/g, '');
									target.value = v;
									director.income = v;
									handleDirectorInput(i, 'income');
								}}
								onblur={(e) => handleDirectorBlur(i, 'income', director.income)}
								class="w-full rounded-md border border-grayTwo p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
								placeholder="Income"
							/>
							{#if directorErrors[i]?.income}
								<p class="text-xs text-red-500">{directorErrors[i].income}</p>
							{/if}
						</td>

						<td class="border p-1">
							<input
								type="text"
								maxlength="3"
								bind:value={director.cibil}
								oninput={(e: Event) => {
									const target = e.target as HTMLInputElement;
									const v = target.value.replace(/[^0-9]/g, '');
									target.value = v;
									director.cibil = v;
									handleDirectorInput(i, 'cibil');
								}}
								onblur={(e) => handleDirectorBlur(i, 'cibil', director.cibil)}
								class="w-full rounded-md border border-grayTwo p-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
								placeholder="CIBIL Score"
							/>
							{#if directorErrors[i]?.cibil}
								<p class="text-xs text-red-500">{directorErrors[i].cibil}</p>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
