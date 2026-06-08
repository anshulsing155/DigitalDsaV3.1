<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	interface Props {
		btnName?: string;
		loadingName?: string;
		btnClass?: string;
		onClick?: () => void;
		icon?: typeof SvelteComponent<any> | null;
		iconPosition?: 'left' | 'right';
		iconSize?: number;
		disabled?: boolean;
		ariaLabel?: string;
		isSubmitting?: boolean | undefined;
		glow?: boolean;
		testEffect?: boolean;
	}

	let {
		btnName = '',
		loadingName = 'Loading...',
		btnClass = '',
		onClick = () => {},
		icon = null,
		iconPosition = 'left',
		iconSize = 16,
		disabled = false,
		ariaLabel = btnName,
		isSubmitting = undefined,
		glow = false,
		testEffect = false
	}: Props = $props();
</script>

<button
	onclick={onClick}
	disabled={disabled || isSubmitting}
	aria-label={ariaLabel}
	class={`buttonText flex w-auto cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 transition
		duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50
		sm:px-8 sm:py-[0.6rem]
		${glow ? 'glowEffect' : ''}
		${testEffect ? 'test' : ''}
		${btnClass}`}
>
	{#if icon && iconPosition === 'left'}
		{@const Icon = icon}
		<Icon size={iconSize} />
	{/if}

	<span>
		{#if isSubmitting !== undefined && isSubmitting}
			{loadingName}
		{:else}
			{btnName}
		{/if}
	</span>

	{#if icon && iconPosition === 'right'}
		{@const Icon = icon}
		<Icon size={iconSize} />
	{/if}
</button>

<style>
	.test {
		box-shadow: rgba(145, 114, 114, 0.56) 0px 2px 2px;
	}

	@keyframes radiation {
		0% {
			border-color: rgb(182, 10, 1);
			box-shadow: 0 0 5px rgba(191, 7, 182, 0.852);
		}
		50% {
			border-color: rgba(255, 255, 0, 1);
			box-shadow: 0 0 15px rgba(255, 255, 0, 0.8);
		}
		100% {
			border-color: rgba(234, 154, 25, 0.963);
			box-shadow: 0 0 5px rgba(169, 79, 27, 0.337);
		}
	}

	.glowEffect {
		width: 220px;
		height: 50px;
		border: none;
		outline: none;
		color: #fff;
		background: #111;
		cursor: pointer;
		position: relative;
		z-index: 0;
		border-radius: 10px;
	}

	.glowEffect:before {
		content: '';
		background: linear-gradient(
			45deg,
			#ff0000,
			#ff7300,
			#fffb00,
			#48ff00,
			#00ffd5,
			#002bff,
			#7a00ff,
			#ff00c8,
			#ff0000
		);
		position: absolute;
		top: -2px;
		left: -2px;
		background-size: 400%;
		z-index: -1;
		filter: blur(5px);
		width: calc(100% + 4px);
		height: calc(100% + 4px);
		animation: glowing 20s linear infinite;
		opacity: 1;
		transition: opacity 0s ease-in-out;
		border-radius: 10px;
	}

	.glowEffect:active:after {
		background: transparent;
	}

	.glowEffect:after {
		z-index: -1;
		content: '';
		position: absolute;
		width: 100%;
		height: 100%;
		background: #111;
		border: 2px solid #fcb650;
		left: 0;
		top: 0;
		border-radius: 10px;
	}

	@keyframes glowing {
		0% {
			background-position: 0 0;
		}
		50% {
			background-position: 400% 0;
		}
		100% {
			background-position: 0 0;
		}
	}
</style>
