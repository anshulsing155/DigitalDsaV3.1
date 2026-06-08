<script lang="ts">
	/**
	 * LocationGroup — Compound location selector with cascading State → City → Area → Pincode.
	 *
	 * Supports two entry flows:
	 *   1. Top-down: Select State → City → Area (optional) → Pincode auto-fills
	 *   2. Bottom-up: Type Pincode → auto-fills State + City, shows Area chips
	 *
	 * Renders as a single visual group with consistent icon state machine.
	 */

	import { getIcon, TriangleAlert } from '$lib/utils/iconRegistry';
	import CustomSelect from './CustomSelect.svelte';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import type { ClientQuestion, ClientOption } from '$lib/types/formEngine';
	import { fetchCities, fetchAreas, lookupPincode } from '$lib/utils/locationFetcher';
	import type { AreaEntry } from '$lib/utils/locationFetcher';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { ArrowRightLeft } from '$lib/utils/iconRegistry';

	interface Props {
		question: ClientQuestion;
		currentAnswers: Record<string, unknown>;
		onUpdate: (bindsToKey: string, value: string) => void;
		errors?: Record<string, string>;
		disabled?: boolean;
	}

	let { question, currentAnswers, onUpdate, errors = {}, disabled = false }: Props = $props();

	// Resolve location config
	const locBinds = $derived(question.locationBindsTo!);
	const locConfig = $derived(question.locationConfig!);
	const stateOptions = $derived(question.options ?? []);

	// Current values from answers
	const stateValue = $derived((currentAnswers[locBinds.state] as string) ?? '');
	const cityValue = $derived((currentAnswers[locBinds.city] as string) ?? '');
	const areaValue = $derived((currentAnswers[locBinds.area] as string) ?? '');
	const pincodeValue = $derived((currentAnswers[locBinds.pincode] as string) ?? '');

	// Internal state
	let cityOptions = $state<ClientOption[]>([]);
	let areaEntries = $state<AreaEntry[]>([]);
	let loadingCities = $state(false);
	let loadingAreas = $state(false);
	let pincodeInput = $state('');
	let pincodeLoading = $state(false);

	// Modal state for pincode errors
	let modalOpen = $state(false);
	let modalType = $state<'not-found' | 'mismatch'>('not-found');
	let modalMismatchData = $state<{ state: string; city: string } | null>(null);
	// Area picker modal (when pincode matches multiple areas)
	let areaPickerOpen = $state(false);
	let pendingAreaChoices = $state<string[]>([]);

	// Store pending lookup result so modal "Switch" action can apply it
	let pendingLookupResult = $state<{
		locations: Array<{ state: string; city: string; area: string }>;
	} | null>(null);

	// Focus tracking for icon states
	let stateFocused = $state(false);
	let cityFocused = $state(false);
	let areaFocused = $state(false);
	let pincodeFocused = $state(false);

	// Icons
	const StateIcon = $derived(getIcon('Map'));
	const CityIcon = $derived(getIcon('Building2'));
	const AreaIcon = $derived(getIcon('MapPinned'));
	const PincodeIcon = $derived(getIcon('Hash'));

	// Format pincode for display: XXXXXX → XXX XXX
	function formatPincode(raw: string): string {
		const digits = raw.replace(/\D/g, '').slice(0, 6);
		if (digits.length <= 3) return digits;
		return digits.slice(0, 3) + ' ' + digits.slice(3);
	}

	// Parse formatted pincode back to raw: XXX XXX → XXXXXX
	function parsePincode(formatted: string): string {
		return formatted.replace(/\s/g, '').slice(0, 6);
	}

	// Initialize pincode display from stored value
	$effect(() => {
		if (pincodeValue && !pincodeFocused) {
			pincodeInput = formatPincode(pincodeValue);
		}
	});

	// ── Restore city/area options on mount when answers already exist ──
	// When navigating back, stateValue/cityValue are restored from answers but
	// cityOptions/areaEntries are empty (component just mounted). Fetch them
	// WITHOUT clearing downstream values so the selections survive.
	$effect(() => {
		if (stateValue && cityOptions.length === 0 && !loadingCities) {
			// Fetch cities for the restored state — don't clear city/area/pincode
			loadingCities = true;
			fetchCities(stateValue, locConfig.dataSource).then((opts) => {
				cityOptions = opts;
				loadingCities = false;
			});
		}
	});

	$effect(() => {
		if (
			stateValue &&
			cityValue &&
			areaEntries.length === 0 &&
			!loadingAreas &&
			cityOptions.length > 0
		) {
			// Fetch areas for the restored state+city — don't clear area/pincode
			loadingAreas = true;
			fetchAreas(stateValue, cityValue, locConfig.dataSource).then((entries) => {
				areaEntries = entries;
				loadingAreas = false;

				// Session 32: Validate restored area+pincode compatibility.
				// If stored area doesn't exist in fetched entries, clear it.
				// If stored area exists but pincode doesn't match, fix the pincode.
				if (areaValue && entries.length > 0) {
					const match = entries.find((e) => e.area === areaValue);
					if (!match) {
						// Area not found for this city — clear area+pincode
						onUpdate(locBinds.area, '');
						onUpdate(locBinds.pincode, '');
						pincodeInput = '';
					} else if (pincodeValue && match.pincode !== pincodeValue) {
						// Area found but pincode doesn't match — fix pincode
						onUpdate(locBinds.pincode, match.pincode);
						pincodeInput = formatPincode(match.pincode);
					}
				}
			});
		}
	});

	// ── State change → fetch cities ──
	async function handleStateChange(value: string | number) {
		const stateStr = String(value);
		onUpdate(locBinds.state, stateStr);
		// Clear downstream
		onUpdate(locBinds.city, '');
		onUpdate(locBinds.area, '');
		onUpdate(locBinds.pincode, '');
		pincodeInput = '';
		areaEntries = [];

		if (stateStr) {
			loadingCities = true;
			cityOptions = await fetchCities(stateStr, locConfig.dataSource);
			loadingCities = false;
		} else {
			cityOptions = [];
		}
	}

	// ── City change → fetch areas ──
	async function handleCityChange(value: string | number) {
		const cityStr = String(value);
		onUpdate(locBinds.city, cityStr);
		// Clear downstream
		onUpdate(locBinds.area, '');
		onUpdate(locBinds.pincode, '');
		pincodeInput = '';

		if (cityStr && stateValue) {
			loadingAreas = true;
			areaEntries = await fetchAreas(stateValue, cityStr, locConfig.dataSource);
			loadingAreas = false;
		} else {
			areaEntries = [];
		}
	}

	// ── Pincode input handling ──
	function handlePincodeInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const raw = parsePincode(target.value);
		pincodeInput = formatPincode(raw);

		// Store raw value
		onUpdate(locBinds.pincode, raw);

		// Trigger reverse lookup when 6 digits entered
		if (raw.length === 6) {
			doPincodeLookup(raw);
		}
	}

	async function doPincodeLookup(pincode: string) {
		pincodeLoading = true;
		const result = await lookupPincode(pincode, locConfig.dataSource);
		pincodeLoading = false;

		if (!result.valid || result.locations.length === 0) {
			modalType = 'not-found';
			modalMismatchData = null;
			pendingLookupResult = null;
			modalOpen = true;
			return;
		}

		const first = result.locations[0];

		// State mismatch — ask user via modal
		if (stateValue && stateValue !== first.state) {
			modalType = 'mismatch';
			modalMismatchData = { state: first.state, city: first.city };
			pendingLookupResult = result;
			modalOpen = true;
			return;
		}

		// Auto-fill state, city, area
		await applyPincodeLookup(result);
	}

	/** Apply pincode lookup result — fills state, city, and area */
	async function applyPincodeLookup(result: {
		locations: Array<{ state: string; city: string; area: string }>;
	}) {
		const first = result.locations[0];

		onUpdate(locBinds.state, first.state);

		// Fetch city options for the state
		loadingCities = true;
		cityOptions = await fetchCities(first.state, locConfig.dataSource);
		loadingCities = false;

		onUpdate(locBinds.city, first.city);

		// Fetch areas for this city
		loadingAreas = true;
		areaEntries = await fetchAreas(first.state, first.city, locConfig.dataSource);
		loadingAreas = false;

		// Auto-select area if only one match, otherwise show modal to pick
		const matchingAreas = result.locations.filter(
			(l) => l.state === first.state && l.city === first.city
		);
		if (matchingAreas.length === 1) {
			onUpdate(locBinds.area, matchingAreas[0].area);
		} else if (matchingAreas.length > 1) {
			// Multiple areas share this pincode — ask user to confirm
			pendingAreaChoices = matchingAreas.map((l) => l.area);
			areaPickerOpen = true;
		}
	}

	// ── Modal actions ──
	function handleModalClose() {
		modalOpen = false;
		pendingLookupResult = null;
		modalMismatchData = null;
	}

	async function handleModalSwitch() {
		modalOpen = false;
		if (pendingLookupResult) {
			await applyPincodeLookup(pendingLookupResult);
		}
		pendingLookupResult = null;
		modalMismatchData = null;
	}

	function handleAreaPickerSelect(area: string) {
		onUpdate(locBinds.area, area);
		areaPickerOpen = false;
		pendingAreaChoices = [];
	}

	function handleAreaPickerClose() {
		areaPickerOpen = false;
		pendingAreaChoices = [];
	}

	// Icon state helper
	function iconState(focused: boolean, hasValue: boolean): string {
		if (focused) return 'icon-focused';
		if (hasValue) return 'icon-filled';
		return 'icon-empty';
	}

	// Build area dropdown options from entries: "Area Name (XXX XXX)"
	const areaOptions = $derived<ClientOption[]>(
		areaEntries.map((entry) => ({
			label: `${entry.area} (${formatPincode(entry.pincode)})`,
			value: entry.area
		}))
	);

	// Handler for area dropdown selection
	function handleAreaDropdownChange(value: string | number) {
		const areaStr = String(value);
		const entry = areaEntries.find((e) => e.area === areaStr);
		if (entry) {
			onUpdate(locBinds.area, entry.area);
			onUpdate(locBinds.pincode, entry.pincode);
			pincodeInput = formatPincode(entry.pincode);
		} else {
			onUpdate(locBinds.area, '');
		}
	}

	// Show area dropdown when city is selected, areas are available/loading,
	// AND the locationConfig allows it. `showArea` may be set per question
	// (e.g. property pre-approval gets state+city only). Treat undefined as
	// true to preserve legacy behaviour for questions that never set the flag.
	const showAreaDropdown = $derived(
		cityValue && (areaEntries.length > 0 || loadingAreas) && locConfig.showArea !== false
	);

	$effect(() => {
		const isAnyModalOpen = areaPickerOpen || modalOpen;

		if (isAnyModalOpen) {
			document.documentElement.style.overflow = 'hidden';
			document.body.style.overflow = 'hidden';
		} else {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
		}

		// Cleanup: reset overflow if component unmounts while a modal is open
		return () => {
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
		};
	});
</script>

<div class="location-group flex flex-col">
	<!-- Question label -->
	{#if question.question}
		<label class="text-labelQuestion" for="{question.id}-pincode">
			{@html sanitizeHtml(question.question)}
			{#if question.required}
				<span class="label-required">*</span>
			{/if}
			{#if question.description}
				<DescriptionTooltip description={question.description} />
			{/if}

			{#if question.descriptionHeader}
				<p class="smallText mt-1 mb-3 text-[var(--form-text-label)]">
					{question.descriptionHeader}
				</p>
			{/if}
		</label>
	{/if}

	<div class="flex flex-col gap-4">
		<!-- ═══ PINCODE FIRST (bottom-up entry) ═══ -->
		{#if locConfig.showPincode}
			<div class="relative">
				{#if PincodeIcon}
					{@const hasValue = pincodeInput && pincodeInput !== ''}
					{@const Icon = PincodeIcon}
					<div
						class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200 {hasValue
							? 'icon-filled'
							: 'icon-empty'} {iconState(pincodeFocused, !!pincodeValue)}"
					>
						<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
					</div>
				{/if}

				<input
					id="{question.id}-pincode"
					name="{question.id}-pincode"
					type="text"
					inputmode="numeric"
					maxlength="7"
					class="text-labelText !m-0 w-full rounded-l-md rounded-r-xl
					border border-2
					bg-[var(--form-bg-card)]
					py-[0.8rem] pr-4 pl-14 placeholder-[var(--form-text-muted)] transition-colors outline-none
					focus:ring-1 focus:ring-[var(--ddsa-primary-500)]
					{pincodeInput
						? 'border-[var(--ddsa-primary-500)] text-[var(--form-text-label)]'
						: 'border-[var(--form-border)] text-[var(--form-text-muted)]'}
"
					placeholder="Enter pincode (e.g. 411 038)"
					value={pincodeInput}
					oninput={handlePincodeInput}
					onfocus={() => (pincodeFocused = true)}
					onblur={() => (pincodeFocused = false)}
					{disabled}
				/>

				{#if pincodeValue}
					<p
						class="tinyText absolute -top-2 left-[4rem] z-10 bg-[var(--form-bg-card)] px-1 text-[var(--form-text-muted)]"
					>
						Pincode
					</p>
				{/if}

				{#if pincodeLoading}
					<div class="absolute top-0 right-0 flex h-full items-center pr-3">
						<span class="spinner-ring"></span>
					</div>
				{/if}
			</div>

			<!-- Divider between pincode-first and manual selection -->
			{#if !stateValue && !pincodeValue}
				<div class="or-divider flex items-center gap-3">
					<div class="h-px flex-1 bg-[var(--form-border)]"></div>
					<span class="tinyText text-[var(--form-text-muted)]">or select manually</span>
					<div class="h-px flex-1 bg-[var(--form-border)]"></div>
				</div>
			{/if}
		{/if}

		<!-- ═══ STATE ═══ -->
		<div class="relative">
			{#if StateIcon}
				{@const Icon = StateIcon}
				<div
					class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200 {iconState(
						stateFocused,
						!!stateValue
					)}"
				>
					<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
				</div>
			{/if}
			<CustomSelect
				id="{question.id}-state"
				options={stateOptions}
				value={stateValue}
				placeholder="Select State"
				{disabled}
				required={question.required}
				hasIcon={!!StateIcon}
				hasError={!!errors[locBinds.state]}
				onChange={handleStateChange}
				onFocus={() => (stateFocused = true)}
				onBlur={() => (stateFocused = false)}
			/>
			{#if stateValue}
				<p
					class="tinyText absolute -top-2 left-[4rem] z-10 bg-[var(--form-bg-card)] px-1 text-[var(--form-text-muted)]"
				>
					Selected State
				</p>
			{/if}
		</div>

		<!-- ═══ CITY ═══ -->
		{#if stateValue}
			<div class="relative">
				{#if CityIcon}
					{@const Icon = CityIcon}
					<div
						class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200 {iconState(
							cityFocused,
							!!cityValue
						)}"
					>
						<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
					</div>
				{/if}

				{#if loadingCities}
					<div
						class="flex h-12 items-center rounded-md border border-gray-200 bg-gray-50 pl-14 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800"
					>
						<span class="spinner-ring mr-2"></span>
						Loading cities...
					</div>
				{:else}
					<CustomSelect
						id="{question.id}-city"
						options={cityOptions}
						value={cityValue}
						placeholder="Select City"
						{disabled}
						required={question.required}
						hasIcon={!!CityIcon}
						hasError={!!errors[locBinds.city]}
						onChange={handleCityChange}
						onFocus={() => (cityFocused = true)}
						onBlur={() => (cityFocused = false)}
					/>
				{/if}
				{#if cityValue}
					<p
						class="tinyText absolute -top-2 left-[4rem] z-10 bg-[var(--form-bg-card)] px-1 text-[var(--form-text-muted)]"
					>
						Selected City
					</p>
				{/if}
			</div>
		{/if}

		<!-- ═══ AREA / LOCALITY ═══ -->
		{#if showAreaDropdown}
			<div class="relative">
				{#if AreaIcon}
					{@const Icon = AreaIcon}
					<div
						class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200 {iconState(
							areaFocused,
							!!areaValue
						)}"
					>
						<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
					</div>
				{/if}

				{#if loadingAreas}
					<div
						class="text-labelText !m-0 flex items-center rounded-[1rem] border border-[var(--form-border-hover)] bg-[var(--form-bg-input)] px-[1rem] py-[0.875rem] pl-14"
					>
						<span class="spinner-ring mr-2"></span>
						Loading areas...
					</div>
				{:else}
					<CustomSelect
						id="{question.id}-area"
						options={areaOptions}
						value={areaValue}
						placeholder="Select Area / Locality"
						{disabled}
						searchable={true}
						searchPlaceholder="Search area or pincode..."
						hasIcon={!!AreaIcon}
						hasError={!!errors[locBinds.area]}
						onChange={handleAreaDropdownChange}
						onFocus={() => (areaFocused = true)}
						onBlur={() => (areaFocused = false)}
					/>
				{/if}
				{#if areaValue}
					<p
						class="tinyText absolute -top-2 left-[4rem] z-10 bg-[var(--form-bg-card)] px-1 text-[var(--form-text-muted)]"
					>
						Selected Area
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Field-level errors from server -->
	{#each Object.entries(errors) as [key, msg]}
		{#if msg}
			<p class="alertText text-red-500">{msg}</p>
		{/if}
	{/each}
</div>

<!-- ═══ PINCODE ERROR MODAL ═══ -->
{#if modalOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		aria-labelledby="pincode-modal-title"
		onkeydown={(e) => e.key === 'Escape' && handleModalClose()}
		onclick={(e) => e.target === e.currentTarget && handleModalClose()}
	>
		<div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
			{#if modalType === 'not-found'}
				<div class="mb-4 flex items-center gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
					>
						<TriangleAlert class="h-5 w-5 text-amber-600 dark:text-amber-400" />
					</div>

					<h3 id="pincode-modal-title" class="text-labelQuestion !m-0">Pincode Not Found</h3>
				</div>
				<p class="alertText mb-5 text-[var(--form-text-muted)]">
					We couldn't find <strong class="font-titleMedium text-[var(--ddsa-primary-500)]"
						>{pincodeInput}</strong
					> in our database. Please select state and city manually below.
				</p>
				<button
					type="button"
					class="buttonText w-full cursor-pointer rounded-lg bg-[var(--ddsa-primary-500)] px-4 py-2.5 text-[var(--ddsa-secondary-800)] shadow-sm transition-colors hover:bg-[var(--ddsa-primary-600)]"
					onclick={handleModalClose}
				>
					OK, I'll select manually
				</button>
			{:else if modalType === 'mismatch' && modalMismatchData}
				<div class="mb-4 flex items-center gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
					>
						<ArrowRightLeft class="h-5 w-5 text-blue-600 dark:text-blue-400" />
					</div>
					<h3 id="pincode-modal-title" class="text-labelQuestion !m-0">Different Location</h3>
				</div>
				<p class="alertText mb-5 text-[var(--form-text-muted)]">
					Pincode <strong class="font-titleMedium text-[var(--ddsa-primary-500)]"
						>{pincodeInput}</strong
					>
					belongs to
					<strong class="font-titleMedium text-[var(--ddsa-primary-500)]"
						>{modalMismatchData.city}, {modalMismatchData.state}</strong
					>. Your current selection is
					<strong class="font-titleMedium text-[var(--ddsa-primary-500)]">{stateValue}</strong>.
				</p>
				<p class="alertText mb-5 text-[var(--form-text-muted)]">
					Switch to the pincode's location?
				</p>
				<div class="flex gap-3">
					<button
						type="button"
						class="buttonText flex-1 cursor-pointer rounded-lg border border-[var(--form-border)] bg-white px-4 py-2.5 transition-colors hover:border-[var(--form-border-hover)]"
						onclick={handleModalClose}
					>
						Keep current
					</button>
					<button
						type="button"
						class="buttonText flex-1 cursor-pointer rounded-lg bg-[var(--ddsa-primary-500)] px-4 py-2.5 text-[var(--ddsa-secondary-800)] shadow-sm transition-colors hover:bg-[var(--ddsa-primary-600)]"
						onclick={handleModalSwitch}
					>
						Switch location
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ═══ AREA PICKER MODAL (multiple areas for same pincode) ═══ -->
{#if areaPickerOpen && pendingAreaChoices.length > 0}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		aria-labelledby="area-picker-title"
		onkeydown={(e) => e.key === 'Escape' && handleAreaPickerClose()}
		onclick={(e) => e.target === e.currentTarget && handleAreaPickerClose()}
	>
		<div class="mx-4 flex h-[60vh] max-w-sm flex-col rounded-xl bg-white p-6 shadow-2xl">
			<div class="mb-4 flex items-center gap-3">
				{#if AreaIcon}
					{@const Icon = AreaIcon}
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ddsa-primary-100)] dark:bg-[var(--ddsa-primary-900)]"
					>
						<Icon
							class="h-5 w-5 text-[var(--ddsa-primary-600)] dark:text-[var(--ddsa-primary-400)]"
						/>
					</div>
				{/if}
				<h3 id="area-picker-title" class="text-labelQuestion !m-0">Select Area</h3>
			</div>
			<p class="alertText mb-5 text-[var(--form-text-muted)]">
				Multiple areas found for pincode <strong
					class="font-titleMedium text-[var(--ddsa-primary-500)]">{pincodeInput}</strong
				>. Please select your area:
			</p>
			<div class="flex-1 overflow-y-auto p-6">
				<div class="flex flex-col gap-2">
					{#each pendingAreaChoices as area (area)}
						<button
							type="button"
							class="buttonText w-full rounded-lg border border-[var(--form-border)] px-4 py-3 text-left text-[var(--form-text-label)] transition-all hover:border-[var(--ddsa-primary-400)] hover:bg-[var(--ddsa-primary-50)]"
							onclick={() => handleAreaPickerSelect(area)}
						>
							{area}
						</button>
					{/each}
				</div>
			</div>
			<button
				type="button"
				class="buttonText mt-3 w-full cursor-pointer text-[var(--form-text-label)] transition-colors hover:text-[var(--form-text-button-hover)]"
				onclick={handleAreaPickerClose}
			>
				Skip area selection
			</button>
		</div>
	</div>
{/if}

<style>
	.icon-empty {
		background: var(--ddsa-secondary-900, #1e293b);
	}
	:global(.dark) .icon-empty {
		background: var(--ddsa-secondary-200, #e2e8f0);
	}
	.icon-filled {
		background: var(--ddsa-primary-500);
	}
	.icon-focused {
		background: var(--ddsa-primary-500);
		box-shadow: 0 0 8px color-mix(in srgb, var(--ddsa-primary-500) 40%, transparent);
	}

	.spinner-ring {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Modal entrance animation */
	[role='dialog'] > div {
		animation: modal-in 0.2s ease-out;
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(8px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
</style>
