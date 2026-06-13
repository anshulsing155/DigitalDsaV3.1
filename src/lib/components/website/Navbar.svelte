<script>
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { spring } from 'svelte/motion';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import WeAreHereHelp from './WeAreHereHelp.svelte';
	import { hostName } from '$lib/stores/stores';
	import { afterNavigate } from '$app/navigation';
	import { FileUser } from 'lucide-svelte';
	import { Menu, LogOut, CircleUserRound, ChevronDown, X } from '$lib/utils/iconRegistry';

	let firstPart = $state(''),
		finalValue = $state('');

	let goToCalculators = $state(false);

	let profileIsOpen = $state(false);
	let mobileProfileIsOpen = $state(false);
	let userName = $derived(page.data.user?.name?.split(' ')[0] || '');
	let formattedName = $derived(
		userName ? userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase() : ''
	);

	let profileDropDown = [
		{
			title: 'My Profile',
			url: '/my-profile',
			icon: CircleUserRound,
			iconProps: { strokeWidth: 1, size: 20 },
			alt: 'icons-userBg'
		},
		{
			title: 'My Assessment',
			url: '/my-assessment',
			icon: FileUser,
			iconProps: { strokeWidth: 1, size: 20 },
			alt: 'icons-financialProfile'
		},
		{
			title: 'Log Out',
			action: signOut,
			icon: LogOut,
			iconProps: { strokeWidth: 1, size: 20 },
			alt: 'icons-logout'
		}
	];
	function updateGoToCalculators() {
		goToCalculators = window.innerWidth >= 768;

		if (goToCalculators) {
			navList[1].link = '/calculators/emi-calculator';
			navList[2].link = '/planners/part-payment-planner';
			navList[3].link = '/money-map/how-long-will-your-savings-support-you';
		} else {
			navList[1].link = '/calculators';
			navList[2].link = '/planners';
			navList[3].link = '/money-map';
		}
	}

	$effect(() => {
		if (goToCalculators && page.url.pathname === '/calculators') {
			goto('/calculators/emi-calculator');
		} else if (goToCalculators && page.url.pathname === '/planners') {
			goto('/planners/part-payment-planner');
		} else if (goToCalculators && page.url.pathname === '/money-map') {
			goto('/money-map/how-long-will-your-savings-support-you');
		}
	});

	onMount(() => {
		updateGoToCalculators(); // Set initial state
		window.addEventListener('resize', updateGoToCalculators);

		return () => {
			window.removeEventListener('resize', updateGoToCalculators);
		};
	});

	afterNavigate(() => {
		active = page.url.pathname;
		firstPart = active.split('/').filter(Boolean)[0]; // Extract first part

		const matched = navList.some((item) => item.id.toLowerCase() === firstPart?.toLowerCase());
		finalValue = matched ? firstPart : '/'; // not received any url is will on the Loans navbar
		active = finalValue;
	});
	let active = $state('/');
	let overlayOpen = $state(false); // For managing overlay visibility

	let width = spring(0, { stiffness: 0.04, damping: 0.8 });

	// think to remember id and link;s first part(between the  start and end slash(/) must be same )
	const navList = [
		{
			list: `Loan services`,
			offer: '',
			scrollingId: 'loans',
			id: '/',
			link: '/check-offers',
			mobId: 'mobLoans',
			icon: '/icons/personalLoan.svg'
		},
		{
			list: 'Calculators',
			id: 'calculators',
			link: '/calculators',
			icon: '/icons/calc.svg'
		},
		{
			list: 'Loan planners',

			id: 'planners',
			link: '/planners',
			icon: '/icons/lap.svg'
		},
		{
			list: 'Money map',
			star: '',
			id: 'money-map',
			link: '/money-map',
			icon: '/icons/coins.svg'
		},

		{
			list: 'About us',
			id: 'about-us',
			link: '/about-us',
			icon: '/icons/people.svg'
		},
		{
			list: 'Refer & earn',
			id: 'refer-&-earn',
			link: '/refer-&-earn',
			icon: '/icons/offers.svg'
		}
	];

	function scrollToElement(id) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	let searches = [
		{
			id: 1,
			title: 'Home Loan Calculator',
			link: '/calculators/emi-calculator'
		},
		{ id: 2, title: 'Planner Guides', link: '/planners/part-payment-planner' },
		{ id: 3, title: 'About Digital DSA', link: '/about-us' },
		{ id: 4, title: 'Interest Rates', link: '' },
		{ id: 5, title: 'FAQs and Support', link: '' },
		{ id: 6, title: 'Blogs', link: '' }
	];

	let navOpen = $state(false);
	let searchOpen = $state(false);
	let searchInput = $state();

	function toggleNav() {
		navOpen = !navOpen;
		mobileProfileIsOpen = false;
		document.body.style.overflow = navOpen ? 'hidden' : 'auto';
	}

	const handleNavigation = (link, id) => {
		navOpen = false;
		document.body.style.overflow = 'auto'; // Always ensure body scroll is restored
		active = link;

		if (active === '/') {
			setTimeout(() => scrollToElement(id), 500);
		}
	};
	async function signOut() {
		try {
			const response = await fetch('/api/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const result = await response.json();
			if (result.success) {
				navOpen = false; // Close mobile menu if open
				document.body.style.overflow = 'auto'; // Restore body scroll
				location.reload();
			} else {
				console.error('Logout failed:', result.message);
				alert('Logout failed. Please try again.');
			}
		} catch (error) {
			console.error('Error during logout:', error);
			alert('An error occurred. Please try again later.');
		}
	}

	let help = [
		{
			Heading: 'Help Support',
			icon: '/icons/support.svg',
			altTitle: 'Help Support'
		},
		{
			Heading: 'Locate Us',
			icon: '/icons/branch.svg',
			altTitle: 'Locate Us'
		},
		{
			Heading: 'Contact Us',
			icon: '/icons/contact.svg',
			altTitle: 'Contact Us'
		}
	];

	function toggleSearch() {
		searchOpen = !searchOpen;
		width.set(searchOpen ? 100 : 0);
		overlayOpen = !overlayOpen;
		if (!searchOpen) {
			document.body.style.overflow = 'auto';
		} else {
			document.body.style.overflow = 'hidden';
			// Focus the search input when opened for better accessibility
			setTimeout(() => {
				const inputElement = document.querySelector('.inputBox');
				if (inputElement) inputElement.focus();
			}, 100);
		}
	}
</script>

<section
	class="relative z-50 mx-auto w-full border-b border-[var(--form-border)] bg-[var(--landing-bg)]"
>
	<div class="mx-auto flex items-center justify-between">
		<div class="flex items-center gap-[4rem]">
			<!-- logo -->
			<div class="relative flex gap-[1rem] pl-4 sm:gap-[2rem] md:pl-[3rem]">
				<button
					type="button"
					class="logoBtn flex flex-col items-center justify-center pt-2"
					onclick={() => {
						goto('/');
						active = '/';
					}}
				>
					<!-- Light mode logo -->
					<img
						src="/logo/logoBlack.svg"
						alt="digital-dsa-logo"
						class="block h-[2rem] lg:h-[3rem] dark:hidden"
					/>
					<!-- Dark mode logo -->
					<img
						src="/logo/logoWhite.svg"
						alt="digital-dsa-logo"
						class="hidden h-[2rem] lg:h-[3rem] dark:block"
					/>
					<div class="block">
						<p class="typography-button text-center text-[var(--form-text)]">
							{$hostName}
						</p>
						<p class="typography-alert hidden text-[var(--form-text)] 2xl:flex">
							powered by EYantrik
						</p>
					</div>
				</button>
			</div>

			<ul class="navbarCloseCustomClass flex cursor-pointer gap-[3rem]">
				{#each navList as nav, index}
					<li class="text-center">
						<a
							href={nav.link}
							class="group typography-button relative text-[var(--form-text)] hover:text-[var(--form-text-secondary)] lg:py-10"
						>
							{nav.list}
							{#if nav.hasOwnProperty('star')}
								<sup class="absolute top-4 -right-7 h-full">
									<img src="/gif/moneyMapStar.gif" alt="money-map" class="h-[2rem]" />
								</sup>
							{:else if nav.hasOwnProperty('offer')}
								<sup class="absolute top-3 -right-7 h-full">
									<img src="/gif/sale.gif" alt="sale" class="h-[2.5rem]" />
								</sup>
							{/if}

							<span
								class="bg-ddsa-gradient-primary absolute bottom-0 left-0 h-1 w-full transition-all group-hover:scale-x-100 {finalValue ===
								nav.id
									? 'scale-x-100'
									: 'scale-x-0'}"
							></span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
		<div class="toggleBtnCloseCustomClass pr-4">
			<button
				type="button"
				onclick={toggleNav}
				aria-label="Open navigation"
				class="typography-button faBarCloseCustomClass flex items-center text-[var(--form-text)]"
			>
				<Menu />
			</button>
		</div>
		<!-- search & login grid-cols-2-->
		<!-- svelte-ignore a11y_no_static_element_interactions -->

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="loginBtnCloseCustomClass group"
			onmouseleave={() => (profileIsOpen = false)}
			onclick={() => (profileIsOpen = !profileIsOpen)}
		>
			{#if page.data.user?.name}
				<div
					class="btn-primary flex w-[182px] cursor-pointer items-center justify-center gap-2 lg:py-[34px]"
				>
					<div class="flex items-center gap-2">
						{#if page.data.user?.image}
							<img
								src={page.data.user.image}
								alt="User Profile"
								class="h-8 w-8 rounded-full border border-[var(--form-border)] bg-white object-cover"
							/>
						{:else}
							<div
								class="typography-button flex h-8 w-8 items-center justify-center rounded-full bg-white uppercase"
							>
								{page.data.user?.name ? page.data.user.name.charAt(0) : 'U'}
							</div>
						{/if}
						<span class="typography-body-md underline-offset-4 select-none group-hover:underline"
							>{formattedName.length > 10
								? formattedName.slice(0, 10) + '...'
								: formattedName}</span
						>
					</div>

					<ChevronDown
						class={`transition-transform duration-200 ${profileIsOpen ? 'rotate-180' : 'rotate-0'}`}
					/>
				</div>

				{#if profileIsOpen}
					<div
						class="typography-body-sm absolute w-[11.35rem] border border-[var(--form-border)] bg-[var(--landing-bg)] py-2 shadow-lg hover:bg-[var(--landing-bg-card)]"
					>
						<ul>
							{#each profileDropDown as item}
								{@const IconComponent = item.icon}
								<li
									class={`flex w-full cursor-pointer items-center gap-2 px-2 py-2 text-[var(--form-text)] ${
										item.action
											? 'hover:text-[var(--ddsa-error-500)]'
											: item.url !== ''
												? ' hover:text-[var(--form-text-secondary)]'
												: ''
									}`}
								>
									<div class="flex items-start justify-start">
										{#if typeof item.icon === 'string'}
											<img src={item.icon} alt={item.alt} />
										{:else}
											<IconComponent {...item.iconProps || {}} />
										{/if}
									</div>

									{#if item.url}
										<div>
											<button class="cursor-pointer" onclick={() => goto(item.url)}
												>{item.title}</button
											>
										</div>
									{:else}
										<div>
											<button onclick={item.action} class=" cursor-pointer">{item.title}</button>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{:else}
				<a
					href="/login"
					class="typography-body-md btn-primary flex items-center gap-4 p-5 text-black sm:py-11"
				>
					<img src="/icons/lock.svg" alt="lock-svg" class="h-[.9rem]" />
					<p>Login</p>
				</a>
			{/if}
		</div>
	</div>

	<!-- Search Bar (Hidden/Visible based on toggleSearch) (pending css*) -->
	{#if searchOpen}
		<div
			class="fixed top-0 h-[3.2rem] w-full bg-[var(--landing-bg)] md:h-[6.2rem]"
			bind:this={searchInput}
			out:fade={{ duration: 200 }}
		>
			<div class="mx-auto flex h-full w-full items-center p-1 md:w-10/12 lg:w-9/12">
				<button class="relative h-full w-2/12 lg:w-1/12" onclick={toggleSearch} aria-label="Back">
					<i class="fa-solid fa-arrow-left typography-h3 lg:typography-h2"></i>
				</button>

				<!-- Slow expansion with right to left animation -->
				<div class="flex h-full w-full justify-end">
					<input
						class="typography-h3 typography-body-md inputBox h-full px-[2rem] outline-none"
						type="text"
						placeholder="Search..."
						style="width: {$width}%; transform-origin: right center; transition: ease;"
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Overlay when search bar is active (pending css*) -->
	{#if overlayOpen}
		<div class="overlay bg-mainBg">
			<div class="mx-auto h-screen w-11/12 md:w-10/12 lg:w-9/12">
				<div class="flex flex-col gap-[2rem] p-[2rem]">
					<h2 class="typography-h3 font-semibold text-black text-text-main">Popular searches</h2>
					<div class="grid md:grid-cols-2 md:gap-[3rem]">
						<div class="col-span-1 grid">
							{#each searches.slice(0, 3) as search}
								<button
									class="typography-body-md border-[var(--form-border)] hover:border-linkColor flex items-center justify-between border-b"
									onclick={() => {
										goto(search.link);
										overlayOpen = false;
										searchOpen = false;
									}}
								>
									<p class="py-2 md:py-4">{search.title}</p>
									<div class="flex h-full items-center justify-center px-4">
										<i class="fa-solid fa-angle-right"></i>
									</div>
								</button>
							{/each}
						</div>
						<div class="col-span-1 grid">
							{#each searches.slice(3, 6) as search}
								<button
									class="typography-body-md border-[var(--form-border)] hover:border-linkColor flex items-center justify-between border-b"
									onclick={() => {
										goto(search.link);
										overlayOpen = false;
										searchOpen = false;
									}}
								>
									<p class="py-2 md:py-4">{search.title}</p>
									<div class="flex h-full items-center justify-center px-4">
										<i class="fa-solid fa-angle-right"></i>
									</div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				<div class="p-[2rem]">
					<WeAreHereHelp {help} gridCol={3} />
				</div>
			</div>
		</div>
	{/if}

	{#if navOpen}
		<div
			class="navbarForMobile fixed top-0 flex min-h-screen w-full flex-col justify-between gap-4 overflow-auto border-b border-[var(--form-border)] bg-[var(--landing-bg)]"
			in:fly={{ x: -100, duration: 500 }}
			out:fly={{ x: -100, duration: 500 }}
		>
			<div class="flex flex-col gap-4">
				<div class="flex items-start justify-between px-3 py-[.8rem]">
					<div class="flex flex-col">
						<button
							type="button"
							onclick={() => {
								goto('/');
								toggleNav();
							}}
							class="flex flex-col items-center space-y-1"
						>
							<!-- White mode logo -->
							<img
								src="/logo/logoWhite.svg"
								alt="Digital DSA Logo"
								class="hidden h-[2rem] object-contain lg:h-[3rem] dark:block"
								loading="lazy"
							/>

							<!-- Dark mode logo -->
							<img
								src="/logo/logoBlack.svg"
								alt="digital-dsa-logo"
								class="block h-[2rem] lg:h-[3rem] dark:hidden"
							/>

							<p class="typography-button text-center text-[var(--form-text)]">
								{$hostName}
							</p>
						</button>
					</div>

					<button
						type="button"
						onclick={toggleNav}
						aria-label="Close navigation"
						class="text-[var(--form-text)]"
						><X />
					</button>
				</div>
				<!-- h-[calc(100vh-4rem)] -->
				<ul class="typography-body-md relative flex flex-col px-3 !font-medium">
					{#each navList as nav, i}
						<li class="py-1 text-[var(--form-text)]">
							<a
								href={nav.link}
								class="block {i < navList.length - 1
									? ' border-b border-[var(--form-border)]'
									: '  border-b border-none'} py-[0.75rem]"
								onclick={(e) => {
									handleNavigation(nav.link, nav.mobId);
								}}
							>
								<div class="flex items-center gap-[1.5rem] px-2">
									<div class="h-[1.8rem]">
										<img src={nav.icon} alt="nav-icon" class="h-full" />
									</div>
									<div class="relative inline-flex">
										<span>{nav.list}</span>
										{#if nav.hasOwnProperty('star')}
											<div class="pointer-events-none absolute -top-6 -right-7">
												<img
													src="/gif/moneyMapStar.gif"
													alt="money-map-star-icon"
													class="h-[2.2rem]"
												/>
											</div>
										{:else if nav.hasOwnProperty('offer')}
											<div class="pointer-events-none absolute -top-6 -right-7">
												<img src="/gif/sale.gif" alt="sale-icon" class="h-[2.2rem]" />
											</div>
										{/if}
									</div>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			</div>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex w-full flex-col gap-0 bg-[var(--landing-bg-card)] shadow-[0_4px_12px_var(--shadow-select)] border-t-2 border-[var(--form-border)]"
				onclick={() => (mobileProfileIsOpen = !mobileProfileIsOpen)}
			>
				{#if page.data.user?.name}
					<ul class="m-0 list-none p-0">
						{#each profileDropDown as item (item.title)}
							{#if item.url}
								<li class="border-b border-[var(--form-border)]">
									<button
										type="button"
										class="typography-body-md flex w-full items-center gap-6 px-3 py-3 text-left !font-medium text-[var(--form-text)]"
										onclick={() => goto(item.url)}
									>
										<item.icon {...item.iconProps} />
										<span>{item.title}</span>
									</button>
								</li>
							{/if}
						{/each}

						<li>
							<button
								type="button"
								class="typography-body-md flex w-full items-center gap-4 px-3 py-3 text-left !font-medium text-[var(--form-text)]"
								onclick={signOut}
							>
								<img
									src="/icons/logoutBlack.svg"
									alt="icon-logout"
									class="block h-[1.8rem] dark:hidden"
								/>
								<img
									src="/icons/logout.svg"
									alt="icon-logout"
									class="hidden h-[1.8rem] dark:block"
								/>
								<span>Logout</span>
							</button>
						</li>
					</ul>
				{:else}
					<button
						type="button"
						class="typography-body-md w-full py-[0.75rem] !font-medium text-[var(--form-text)]"
						onclick={() => goto('/login')}
					>
						<div class="flex items-center gap-[1rem] px-2">
							<img src="/icons/breakLock.svg" alt="lock-svg" class="h-[1.8rem]" />
							<p>Login</p>
						</div>
					</button>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	@media screen and (max-width: 1270px) {
		.navbarCloseCustomClass {
			display: none;
		}

		.loginBtnCloseCustomClass {
			display: none;
		}
	}
	@media screen and (min-width: 1270px) {
		.faBarCloseCustomClass {
			display: none;
		}
		.navbarForMobile {
			display: none;
		}
		.toggleBtnCloseCustomClass {
			display: none;
		}
	}

	.overlay {
		position: fixed;
		top: 10;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 99;
	}

	.inputBox {
		box-shadow: 0 1px 4px 0 rgba(35, 31, 32, 0.2);
	}
</style>
