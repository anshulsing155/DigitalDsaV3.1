<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { writable } from 'svelte/store';
	interface Props {
		disabled?: boolean;
		valueStore?: Writable<boolean | undefined> | null;
		value?: boolean | undefined;
		onClick?: (() => void) | null;
		onToggle?: (() => void) | null;
		applicantIndex?: number;
	}

	let {
		disabled = false,
		valueStore = null,
		value = undefined as boolean | undefined,
		onClick = null,
		onToggle = null,
		applicantIndex = 0
	}: Props = $props();

	let _fallbackStore: Writable<boolean | undefined> | null = null;
	let internal = $derived.by(() => {
		if (valueStore) return valueStore;
		if (!_fallbackStore) _fallbackStore = writable<boolean | undefined>(value);
		return _fallbackStore;
	});

	let buttonState = $derived(
		$internal === true ? 'true' : $internal === false ? 'false' : 'neutral'
	);

	function setState(val: 'true' | 'false') {
		if (disabled) return;
		const newVal = val === 'true' ? true : false;
		internal.set(newVal);

		// CALLBACK – this is the only place we touch the parent
		if (typeof onToggle === 'function') onToggle();

		if (typeof onClick === 'function') onClick();
	}

	/* -------------------------------------------------------------
	   OPTIONAL: also call the callback when the *store* is changed
	   from the outside (e.g. when the form is reset).  This keeps
	   the behaviour identical to a dispatch.
	   ------------------------------------------------------------- */
	$effect(() => {
		if (!valueStore) return;
		const unsub = valueStore.subscribe((v) => {
			if (v !== undefined && typeof onToggle === 'function') onToggle();
		});
		return () => unsub();
	});
</script>

<!-- Mobile: Icon-Only Buttons -->
<div class="flex items-center gap-2 md:hidden">
	<!-- TRUE -->
	<button
		class="smallText relative h-6 w-6 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
		class:bg-green-500={buttonState === 'true'}
		class:text-white={buttonState === 'true'}
		class:bg-gray-100={buttonState !== 'true'}
		class:text-gray-700={buttonState !== 'true'}
		class:border-2={buttonState !== 'true'}
		class:border-gray-300={buttonState !== 'true'}
		class:shadow-md={buttonState === 'true'}
		class:hover:bg-green-600={buttonState === 'true'}
		class:hover:bg-gray-200={buttonState !== 'true'}
		class:opacity-50={disabled}
		class:cursor-not-allowed={disabled}
		onclick={() => setState('true')}
		{disabled}
		aria-pressed={$internal === true}
		aria-label="Select true"
	>
		✓
	</button>

	<!-- FALSE -->
	<button
		class="smallText relative h-6 w-6 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
		class:bg-red-500={buttonState === 'false'}
		class:text-white={buttonState === 'false'}
		class:bg-gray-100={buttonState !== 'false'}
		class:text-gray-700={buttonState !== 'false'}
		class:border-2={buttonState !== 'false'}
		class:border-gray-300={buttonState !== 'false'}
		class:shadow-md={buttonState === 'false'}
		class:hover:bg-red-600={buttonState === 'false'}
		class:hover:bg-gray-200={buttonState !== 'false'}
		class:opacity-50={disabled}
		class:cursor-not-allowed={disabled}
		onclick={() => setState('false')}
		{disabled}
		aria-pressed={$internal === false}
		aria-label="Select false"
	>
		✕
	</button>
</div>

<!-- Desktop: Separate Buttons with Text -->
<div class="hidden items-center gap-3 md:flex">
	<!-- TRUE -->
	<button
		class="relative h-10 w-10 cursor-pointer rounded-lg text-sm font-semibold transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
		class:bg-green-500={buttonState === 'true'}
		class:text-white={buttonState === 'true'}
		class:bg-gray-100={buttonState !== 'true'}
		class:text-gray-700={buttonState !== 'true'}
		class:border-2={buttonState !== 'true'}
		class:border-gray-300={buttonState !== 'true'}
		class:shadow-md={buttonState === 'true'}
		class:hover:bg-green-600={buttonState === 'true'}
		class:hover:bg-gray-200={buttonState !== 'true'}
		class:opacity-50={disabled}
		class:cursor-not-allowed={disabled}
		onclick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			setState('true');
		}}
		{disabled}
		aria-pressed={$internal === true}
		aria-label="Select true"
	>
		<span class="flex items-center justify-center">✓</span>
	</button>

	<!-- FALSE -->
	<button
		class="relative h-10 w-10 cursor-pointer rounded-lg text-sm font-semibold transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
		class:bg-red-500={buttonState === 'false'}
		class:text-white={buttonState === 'false'}
		class:bg-gray-100={buttonState !== 'false'}
		class:text-gray-700={buttonState !== 'false'}
		class:border-2={buttonState !== 'false'}
		class:border-gray-300={buttonState !== 'false'}
		class:shadow-md={buttonState === 'false'}
		class:hover:bg-red-600={buttonState === 'false'}
		class:hover:bg-gray-200={buttonState !== 'false'}
		class:opacity-50={disabled}
		class:cursor-not-allowed={disabled}
		onclick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			setState('false');
		}}
		{disabled}
		aria-pressed={$internal === false}
		aria-label="Select false"
	>
		<span class="flex items-center justify-center">✕</span>
	</button>
</div>
