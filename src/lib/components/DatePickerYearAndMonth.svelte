<script lang="ts">
	import { onMount } from 'svelte';

	const monthsFull = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const monthsShort = monthsFull.map(month => month.substring(0, 3));

	interface Props {
		startDate: string;
		endDate: string;
		dateValue?: string;
		typeOfStartDate?: string;
	}

	let {
		startDate,
		endDate,
		dateValue = $bindable(''),
		typeOfStartDate = ''
	}: Props = $props();

	let isYearAreaOpen = $state(false);
	let isDateAreaOpen = $state(false);

	let currentYear = $state(0);
	let currentMonth = $state('');
	let minDecadeYear = $state(0);
	let maxDecadeYear = $state(0);
	let yearFull = $state<number[]>([]);

	let min = $state(0);
	let minMonth = $state(0);
	let max = $state(0);
	let maxMonth = $state(0);

	$effect(() => {
		if (startDate && endDate) {
			const [stYear, stMonth] = startDate.split('-').map(Number);
			const [edYear, edMonth] = endDate.split('-').map(Number);
			min = stYear;
			max = edYear;
			minMonth = stMonth - 1;
			maxMonth = edMonth - 1;
			currentYear = min;
			currentMonth = monthsShort[minMonth];
		}
	});

	function minYear() {
		if (currentYear > min) currentYear -= 1;
	}

	function maxYear() {
		if (currentYear < max) currentYear += 1;
	}

	function selectMonthYear(month: string) {
		const monthIndex = monthsShort.indexOf(month);
		dateValue = `${currentYear}-${(monthIndex + 1).toString().padStart(2, '0')}`;
		isDateAreaOpen = false;
	}

	function toggleDateArea() {
		isDateAreaOpen = !isDateAreaOpen;
		isYearAreaOpen = false;
	}

	function previousDecadeYear() {
		if (minDecadeYear > min) {
			minDecadeYear -= 10;
			maxDecadeYear = minDecadeYear + 9;
			yearFull = Array.from({ length: 10 }, (_, i) => minDecadeYear + i);
		}
	}

	function nextDecadeYear() {
		if (maxDecadeYear < max) {
			minDecadeYear += 10;
			maxDecadeYear = minDecadeYear + 9;
			yearFull = Array.from({ length: 10 }, (_, i) => minDecadeYear + i);
		}
	}

	function decadeYearRange() {
		minDecadeYear = Math.floor(currentYear / 10) * 10;
		maxDecadeYear = minDecadeYear + 9;
		yearFull = Array.from({ length: 10 }, (_, i) => minDecadeYear + i);
	}

	function toggleYear() {
		decadeYearRange();
		isYearAreaOpen = !isYearAreaOpen;
		isDateAreaOpen = !isDateAreaOpen;
	}

	function toggleYearArea(year: number) {
		currentYear = year;
		isYearAreaOpen = false;
		isDateAreaOpen = true;
	}

	let section: HTMLElement | undefined = $state();
	function handleClickOutside(event: MouseEvent) {
		if (section && !section.contains(event.target as Node)) {
			isDateAreaOpen = false;
			isYearAreaOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	const selectedMonthYear = $derived.by(() => {
		if (!dateValue) {
			return '--- -----';
		} else {
			const [stYear, stMonth] = dateValue.split('-').map(Number);
			return `${monthsShort[stMonth - 1]}-${stYear}`;
		}
	});

	function selectEndDate() {
		dateValue = endDate;
		isDateAreaOpen = false;
	}
</script>

<section bind:this={section} onclick={(e) => e.stopPropagation()} class="relative w-full">
	<div class="flex items-center">
		<div
			class="flex w-full items-center border border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text)] font-Paragraph text-minParaFont lg:text-paraFont"
		>
			<div class="px-2">
				<i class="fa-solid fa-calendar-days"></i>
			</div>
			<input
				id="monthYearInput"
				type="text"
				value={selectedMonthYear}
				onclick={toggleDateArea}
				readonly
				class="w-full cursor-pointer p-2 outline-none bg-transparent text-[var(--form-text)]"
				placeholder="--- -----"
			/>
		</div>
	</div>

	{#if isDateAreaOpen}
		<div class="absolute z-40 w-full flex flex-col overflow-hidden rounded bg-[var(--landing-bg-card)] text-[var(--form-text)] shadow-lg font-Paragraph border border-[var(--form-border)]">
			<!-- Year Selector -->
			<div class="my-3 grid grid-cols-3 text-center">
				<button onclick={minYear} type="button" class="cursor-pointer bg-transparent border-none"><i class="fa-solid fa-arrow-left"></i></button>
				<button class="cursor-pointer font-FifthHead bg-transparent border-none" type="button" onclick={toggleYear}>{currentYear}</button>
				<button onclick={maxYear} type="button" class="cursor-pointer bg-transparent border-none"><i class="fa-solid fa-arrow-right"></i></button>
			</div>

			<!-- Month Selector -->
			<div class="grid grid-cols-3 border-t border-[var(--form-border)] bg-[var(--landing-bg-card)] p-3 text-center">
				{#each monthsShort as month, index}
					{#if (currentYear == min && index < minMonth) || (currentYear == max && index > maxMonth)}
						<p class="py-2 text-gray-300">{month}</p>
					{:else}
						<button
							type="button"
							class="cursor-pointer py-2 hover:bg-[var(--landing-bg-alt)] text-[var(--form-text)] bg-transparent border-none"
							onclick={() => selectMonthYear(month)}
						>
							{month}
						</button>
					{/if}
				{/each}
			</div>

			{#if typeOfStartDate == "endDate"}
				<div class="flex justify-center py-2 border-t border-[var(--form-border)]">
					<button onclick={selectEndDate} type="button" class="hover:bg-[var(--landing-bg-alt)] text-[var(--form-text)] px-3 py-2 font-Paragraph bg-transparent border-none cursor-pointer">
						Till end date
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if isYearAreaOpen}
		<!-- Decade Selector -->
		<div class="absolute z-40 w-full flex flex-col overflow-hidden rounded bg-[var(--landing-bg-card)] text-[var(--form-text)] shadow-lg font-Paragraph border border-[var(--form-border)]">
			<div class="my-3 grid grid-cols-3 text-center font-Paragraph">
				<button onclick={previousDecadeYear} type="button" class="cursor-pointer bg-transparent border-none"><i class="fa-solid fa-arrow-left"></i></button>
				<button class="cursor-pointer text-sm font-FifthHead bg-transparent border-none" type="button">{minDecadeYear}-{maxDecadeYear}</button>
				<button onclick={nextDecadeYear} type="button" class="cursor-pointer bg-transparent border-none"><i class="fa-solid fa-arrow-right"></i></button>
			</div>

			<!-- Year Selector -->
			<div class="grid grid-cols-3 border-t border-[var(--form-border)] bg-[var(--landing-bg-card)] p-3 text-center">
				{#each yearFull as year}
					{#if year <= max}
						<button type="button" class="cursor-pointer py-2 hover:bg-[var(--landing-bg-alt)] text-[var(--form-text)] bg-transparent border-none" onclick={() => toggleYearArea(year)}>
							{year}
						</button>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</section>
