<script lang="ts">
	import { onMount } from 'svelte';
	import Button from './Button.svelte';

	type NavItem = {
		name: string;
		targetId: string;
	};

	type ActionBtn = {
		btnName: string;
		btnLink?: string;
		btnClick?: () => void;
		btnClass?: string;
		btnColor?: string;
		btnBorder?: string;
	};

	type NavList = {
		items?: NavItem[];
		actionBtns?: ActionBtn[];
	};

	type Props = {
		navList?: NavList | NavItem[];
		activeSection?: string;
		children?: import('svelte').Snippet;
	};

	const { navList = {}, activeSection = '', children }: Props = $props();

	const itemsList = $derived(Array.isArray(navList) ? navList : (navList?.items || []));
	const actionBtnsList = $derived(Array.isArray(navList) ? [] : (navList?.actionBtns || []));

	let isFixed = $state(false);
	let originalOffsetTop = 0;

	function handleScroll() {
		isFixed = window.scrollY >= originalOffsetTop;
	}

	function scrollToSection(id: string) {
		const target = document.getElementById(id);

		if (!target) return;

		const yOffset = -80;

		const y = target.getBoundingClientRect().top + window.scrollY + yOffset;

		window.scrollTo({
			top: y,
			behavior: 'smooth'
		});
	}

	onMount(() => {
		const navbar = document.getElementById('navbar');

		if (!navbar) return;

		const navbarRect = navbar.getBoundingClientRect();

		originalOffsetTop = navbarRect.top + window.scrollY;

		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<div>
	<nav
		id="navbar"
		class="mx-auto border-b border-[var(--form-border)] bg-[var(--landing-bg)] text-center transition-all duration-300"
		class:fixedNavbar={isFixed}
		class:shadow-xl={isFixed}
	>
		{#if itemsList.length}
			<div class="mx-auto flex w-full justify-between">
				<div class="flex">
					{#each itemsList as nav}
						<div class="flex flex-col">
							<a
								href={`#${nav.targetId}`}
								onclick={(e) => {
									e.preventDefault();
									scrollToSection(nav.targetId);
								}}
								class="typography-label mx-4 flex items-center gap-2 py-6 text-[var(--form-text-secondary)] transition-colors hover:text-primary {activeSection === nav.targetId ? 'text-primary' : 'text-[var(--form-text)]'}"
							>
								{@html nav.name}
							</a>

							{#if activeSection === nav.targetId}
								<div class="bg-ddsa-gradient-primary h-1 w-full"></div>
							{/if}
						</div>
					{/each}
				</div>

				{#if actionBtnsList.length}
					<div class="flex items-center gap-4 pr-4" class:hidden={itemsList.length > 6}>
						{#each actionBtnsList as btn}
							<Button
								btnName={btn.btnName}
								link={btn.btnLink}
								onClick={btn.btnClick}
								btnClass={btn.btnClass}
								btnColor={btn.btnColor}
								btnBorder={btn.btnBorder}
							/>
						{/each}
					</div>
				{:else if children}
					{@render children()}
				{/if}
			</div>
		{/if}
	</nav>

	<div class:bg-white={isFixed} class:border-b={isFixed} class:py-8={isFixed}></div>
</div>

<style>
	.fixedNavbar {
		position: fixed;
		top: 0;
		z-index: 50;
		width: 95%;
	}

	@media (min-width: 1401px) {
		.fixedNavbar {
			width: 1360px;
		}
	}

	@media (min-width: 2560px) and (max-width: 3860px) {
		.fixedNavbar {
			width: 2000px;
		}
	}

	@media (min-width: 3861px) {
		.fixedNavbar {
			width: 3000px;
		}
	}

	@media (min-width: 1024px) and (max-width: 1400px) {
		.fixedNavbar {
			width: 95%;
		}
	}
</style>
