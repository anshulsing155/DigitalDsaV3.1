<script lang="ts">
	import EmiCalc from '$lib/components/features/calculators/EmiCalc.svelte';
	import CalculatorPath from '$lib/components/layout/CalculatorPath.svelte';
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SelectNavigator from '$lib/components/sections/SelectNavigator.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { calculatorsList } from '$lib/data/calculatorList';

	let mobOriginalOffsetTop = $state(0);
	let originalOffsetTop = $state(0);
	let isFixed = $state(false);
	let plannerNumber = $state(1);
	let showCalculator = $state(false);
	let selectedCal = $state('EMI Calculator');

	const topHandleScroll = () => {
		const scrollPosition = window.scrollY; // Get the current scroll position

		if (scrollPosition >= mobOriginalOffsetTop && scrollPosition < originalOffsetTop) {
			isFixed = true; // Fix the navbar when it touches the top
		} else {
			isFixed = false; // Restore the navbar to its original position
		}
	};

	onMount(() => {
		if (!browser) return;

		const mobNav = document.getElementById('testNav');
		const closeNavBar = document.getElementById('emiThings');
		if (mobNav && closeNavBar) {
			const closeNavBarRect = closeNavBar.getBoundingClientRect();
			const mobNavbarRect = mobNav.getBoundingClientRect();
			originalOffsetTop = closeNavBarRect.top + window.scrollY;
			mobOriginalOffsetTop = mobNavbarRect.top + window.scrollY;

			window.addEventListener('scroll', topHandleScroll);
		}
		return () => {
			window.removeEventListener('scroll', topHandleScroll);
		};
	});

	function checkScreenWidth() {
		showCalculator = window.innerWidth >= 1024;
	}

	$effect(() => {
		if (browser) {
			if (!selectedCal) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = 'auto';
			}
		}
	});

	onMount(() => {
		checkScreenWidth(); // Check on mount

		window.addEventListener('resize', checkScreenWidth);
		return () => window.removeEventListener('resize', checkScreenWidth);
	});
</script>

<Seo
	type="WebPage"
	title="EMI Calculator – Calculate Loan EMI Instantly & Accurately"
	description="Use our EMI Calculator to estimate your loan EMI. Enter loan amount, interest rate & tenure to get accurate monthly payments instantly."
	keywords="EMI Calculator, Loan EMI Calculator, Home Loan EMI, Car Loan EMI, Personal Loan EMI, EMI Calculation, Loan Repayment, Monthly Installment"
/>

<div class="relative mx-1">
	<div id="testNav">
		<div
			class="md:hidden bg-[var(--landing-bg)] flex flex-col left-0 w-full z-30 pt-5 px-2 {isFixed
				? 'fixed top-0 pb-4'
				: ''}"
		>
			<SelectNavigator
				bind:selectedValue={selectedCal}
				options={calculatorsList}
				icon="/icons/badge.svg"
				iconBg="bg-black"
			/>
		</div>
	</div>

	<!-- main-content  -->
	<div>
		<section class="relative mx-auto w-full">
			<div
				id="pageDesign"
				class="relative flex flex-col justify-center w-full bg-[var(--landing-bg)] items-center md:gap-[1rem] md:mx-auto md:pt-[2rem]"
			>
				<CalculatorPath
					calculators={calculatorsList}
					bind:activeId={plannerNumber}
					closeNavPosition="emiThings"
				/>

				<div
					class={`${
						isFixed
							? 'py-10 mx-auto text-center font-FourthHead text-subParaFont border-b border-borderColor'
							: ' '
					} md:hidden`}
				></div>
				<div class="w-full">
					<div class="space-y-[2rem] w-full px-0 md:px-6 lg:px-12 pt-4">
						<div class="px-2">
							<h1
								class="hidden md:flex mb-4 xs:mb-[2rem] font-ThirdHead text-minHeadFont xs:text-headFont w-full"
							>
								EMI Calculator
							</h1>
							<h2 class="font-Paragraph text-minParaFont lg:text-paraFont">
								An EMI Calculator helps users determine the fixed monthly loan payment based on the
								loan amount, interest rate, and tenure.
							</h2>
						</div>

						<EmiCalc />
					</div>
				</div>
			</div>
		</section>
		<!-- Things You Should Know -->
		<div class="bg-darkColor text-white py-[2rem] md:py-[4rem] mx-auto" id="emiThings">
			<div id="pageDesign" class="mx-auto px-[1rem] lg:px-[4rem]">
				<ThingsYouShould
					thinkKnow={{
						heading: 'Things You Should Know',
						paraGraph: [
							`The EMI calculator provides an estimated EMI for various loans.`,
							`Actual EMI, interest rate, and tenure are determined by financial institutions.`,
							`Calculations are for representation purposes only and may vary.`,
							`Interest rates depend on loan type, credit history, and lender policies.`,
							`Loan applications are subject to credit approval.`,
							`Interest rates are subject to change, and additional fees and charges may apply.`,
							`<div>
                  <!-- EMI Calculation Formula -->
                  <p>
                    EMI Calculation Formula :
                  </p>
                  <div class="max-w-3xl">
                    <div class="py-4 rounded-lg">
                      <div class="flex flex-col md:flex-row items-center md:gap-4 gap-2 text-center text-btnBg md:text-left">
                        <p class="font-FifthHead text-xl">EMI =</p>
                        <div>
                          <p class="font-FifthHead text-lg">
                            P <i class="fa-solid fa-x text-xs"></i> r <i class="fa-solid fa-x text-xs"></i> (1 + r) <sup>n</sup>
                          </p>
                            <hr class="bg-btnBg my-2 w-30 mx-auto md:mx-0 text-btnBg" />
                          <p class="font-FifthHead text-lg">(1 + r)<sup>n</sup> - 1</p>
                        </div>
                      </div>
        
                      <p class="mt-3 font-SubPara text-subParaFont">Where :</p>
                      <ul class="ml-6 md:ml-14 font-SubPara text-subParaFont space-y-1">
                        <li><span class="font-FifthHead">P</span> = Principal loan amount</li>
                        <li><span class="font-FifthHead">r</span> = Monthly interest rate (Annual Rate ÷ 12 ÷ 100)</li>
                        <li><span class="font-FifthHead">n</span> = Loan tenure in months</li>
                      </ul>
                    </div>
                  </div>
                </div>`
						]
					}}
					disc="list-disc"
				/>
			</div>
		</div>
	</div>
</div>

<style>
	@media (min-width: 1401px) and (max-width: 2560px) {
		#pageDesign {
			width: 1360px;
		}
	}
	@media (min-width: 2560px) and (max-width: 3860px) {
		#pageDesign {
			width: 2000px;
		}
	}
	@media (min-width: 3861px) {
		#pageDesign {
			width: 3000px;
		}
	}

	@media (min-width: 1024px) and (max-width: 1400px) {
		#pageDesign {
			width: 95%;
		}
	}
</style>
