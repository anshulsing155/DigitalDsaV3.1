<!-- 
  STARTER TEMPLATE: Copy these to your components folder
  Location: src/lib/components/landing-revamp/
  
  Run this first in terminal:
  mkdir -p src/lib/components/landing-revamp/shared
-->

<!-- ============================================== -->
<!-- FILE: shared/SectionWrapper.svelte -->
<!-- ============================================== -->

<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		id?: string;
		class?: string;
		background?: 'white' | 'gray' | 'dark' | 'yellow';
		padding?: 'normal' | 'large' | 'none';
	}

	let {
		id = '',
		class: className = '',
		background = 'white',
		padding = 'normal'
	}: Props = $props();

	const bgClasses: Record<string, string> = {
		white: 'bg-white',
		gray: 'bg-gray-50',
		dark: 'bg-[#1A1A1A] text-white',
		yellow: 'bg-[#FFCC00]'
	};

	const paddingClasses: Record<string, string> = {
		normal: 'py-16 md:py-24',
		large: 'py-24 md:py-32',
		none: ''
	};
</script>

<section
	{id}
	class="{bgClasses[background]} {paddingClasses[padding]} {className}"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<slot />
	</div>
</section>


<!-- ============================================== -->
<!-- FILE: shared/SectionTitle.svelte -->
<!-- ============================================== -->

<script lang="ts">
	interface Props {
		title: string;
		subtitle?: string;
		align?: 'center' | 'left';
		light?: boolean;
	}

	let {
		title,
		subtitle = '',
		align = 'center',
		light = false
	}: Props = $props();

	const alignClass = align === 'center' ? 'text-center' : 'text-left';
	const titleColor = light ? 'text-white' : 'text-[#1A1A1A]';
	const subtitleColor = light ? 'text-white/80' : 'text-[#4A4A4A]';
</script>

<div class="{alignClass} mb-12 md:mb-16">
	<h2 class="{titleColor} text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
		{title}
	</h2>
	{#if subtitle}
		<p class="{subtitleColor} text-lg md:text-xl max-w-2xl {align === 'center' ? 'mx-auto' : ''}">
			{subtitle}
		</p>
	{/if}
</div>


<!-- ============================================== -->
<!-- FILE: shared/PrimaryButton.svelte -->
<!-- ============================================== -->

<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';

	interface Props {
		href?: string;
		onclick?: () => void;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'yellow' | 'dark';
		showArrow?: boolean;
		fullWidth?: boolean;
		class?: string;
	}

	let {
		href = '',
		onclick,
		size = 'md',
		variant = 'yellow',
		showArrow = true,
		fullWidth = false,
		class: className = ''
	}: Props = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'px-4 py-2 text-sm',
		md: 'px-6 py-3 text-base',
		lg: 'px-8 py-4 text-lg'
	};

	const variantClasses: Record<string, string> = {
		yellow: 'bg-[#FFCC00] hover:bg-[#E6B800] text-[#1A1A1A]',
		dark: 'bg-[#1A1A1A] hover:bg-[#333] text-white'
	};

	const baseClasses = `
		inline-flex items-center justify-center gap-2
		font-semibold rounded-full
		transition-all duration-200
		hover:scale-[1.02] hover:shadow-lg
		focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFCC00]
		${sizeClasses[size]}
		${variantClasses[variant]}
		${fullWidth ? 'w-full' : ''}
		${className}
	`;
</script>

{#if href}
	<a {href} class={baseClasses}>
		<slot />
		{#if showArrow}
			<ArrowRight size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} />
		{/if}
	</a>
{:else}
	<button type="button" {onclick} class={baseClasses}>
		<slot />
		{#if showArrow}
			<ArrowRight size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} />
		{/if}
	</button>
{/if}


<!-- ============================================== -->
<!-- FILE: shared/ChecklistItem.svelte -->
<!-- ============================================== -->

<script lang="ts">
	import { Check, X } from 'lucide-svelte';

	interface Props {
		text: string;
		checked?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		text,
		checked = true,
		size = 'md'
	}: Props = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'text-sm gap-2',
		md: 'text-base gap-3',
		lg: 'text-lg gap-3'
	};

	const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
</script>

<div class="flex items-center {sizeClasses[size]}">
	{#if checked}
		<span class="flex-shrink-0 text-green-500">
			<Check size={iconSize} strokeWidth={3} />
		</span>
	{:else}
		<span class="flex-shrink-0 text-red-500">
			<X size={iconSize} strokeWidth={3} />
		</span>
	{/if}
	<span class={checked ? 'text-[#1A1A1A]' : 'text-[#717171]'}>
		{text}
	</span>
</div>


<!-- ============================================== -->
<!-- FILE: HeroSection.svelte -->
<!-- ============================================== -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import ChecklistItem from './shared/ChecklistItem.svelte';
	import PrimaryButton from './shared/PrimaryButton.svelte';

	let heroRef: HTMLElement | undefined = $state(undefined);

	const stats = [
		{ value: '1,247', label: 'DSAs' },
		{ value: '₹847 Cr', label: 'Matched' },
		{ value: '94%', label: 'Approval' },
		{ value: '40+', label: 'Lenders' }
	];

	const checklist = [
		'Which bank will approve',
		'How much they\'ll sanction',
		'Which code pays most',
		'Which RM to call'
	];

	onMount(() => {
		if (!heroRef) return;

		const ctx = gsap.context(() => {
			const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

			tl.from('.hero-headline', { opacity: 0, y: 30, duration: 0.8 })
			  .from('.hero-subhead', { opacity: 0, y: 20, duration: 0.6 }, '-=0.4')
			  .from('.hero-checklist > *', { opacity: 0, x: -20, stagger: 0.1, duration: 0.5 }, '-=0.3')
			  .from('.hero-cta', { opacity: 0, y: 20, duration: 0.5 }, '-=0.2')
			  .from('.hero-trust', { opacity: 0, duration: 0.5 }, '-=0.2')
			  .from('.hero-stats > *', { opacity: 0, y: 20, stagger: 0.1, duration: 0.4 }, '-=0.3');
		}, heroRef);

		return () => ctx.revert();
	});
</script>

<section
	bind:this={heroRef}
	class="relative min-h-screen flex items-center justify-center bg-white overflow-hidden"
>
	<!-- Dot grid background -->
	<div 
		class="absolute inset-0 opacity-[0.03]"
		style="background-image: radial-gradient(#1A1A1A 1px, transparent 1px); background-size: 24px 24px;"
	></div>

	<div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
		<!-- Headline -->
		<h1 class="hero-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1A1A] mb-6">
			Hours of Research.<br />
			<span class="text-[#FFCC00]">Gone in Minutes.</span>
		</h1>

		<!-- Subhead -->
		<p class="hero-subhead text-xl md:text-2xl text-[#4A4A4A] mb-8">
			Know before you file.
		</p>

		<!-- Checklist -->
		<div class="hero-checklist flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
			{#each checklist as item}
				<ChecklistItem text={item} size="lg" />
			{/each}
		</div>

		<!-- CTA -->
		<div class="hero-cta mb-6">
			<PrimaryButton href="/signup" size="lg">
				Start Knowing
			</PrimaryButton>
		</div>

		<!-- Trust line -->
		<p class="hero-trust text-sm text-[#717171] mb-16">
			Free 14 days • No card needed
		</p>

		<!-- Stats -->
		<div class="hero-stats flex flex-wrap justify-center gap-8 md:gap-12 pt-8 border-t border-gray-200">
			{#each stats as stat}
				<div class="text-center">
					<div class="text-2xl md:text-3xl font-bold text-[#1A1A1A]">{stat.value}</div>
					<div class="text-sm text-[#717171]">{stat.label}</div>
				</div>
			{/each}
		</div>
	</div>
</section>


<!-- ============================================== -->
<!-- FILE: FinalCTASection.svelte -->
<!-- ============================================== -->

<script lang="ts">
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import PrimaryButton from './shared/PrimaryButton.svelte';
</script>

<SectionWrapper background="yellow" padding="large">
	<div class="text-center max-w-3xl mx-auto">
		<h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
			Ready to Stop Guessing?
		</h2>
		
		<p class="text-lg md:text-xl text-[#1A1A1A]/80 mb-8">
			Hours of research. Gone in minutes.<br />
			Join 1,247 DSAs who already know.
		</p>
		
		<div class="mb-6">
			<PrimaryButton href="/signup" size="lg" variant="dark">
				Start Free Trial
			</PrimaryButton>
		</div>
		
		<p class="text-sm text-[#1A1A1A]/70">
			Free 14 days • No card • No catch
		</p>
	</div>
</SectionWrapper>
