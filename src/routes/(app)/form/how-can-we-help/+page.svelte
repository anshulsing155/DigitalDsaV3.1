<script lang="ts">
	import { onMount } from 'svelte';
	import { formState } from '$lib/state/form.svelte';
	import { userFormConformationState } from '$lib/stores/userFormConformation.svelte';
	import {
		preprocessSchema,
		resolveBindsTo,
		buildCombinedAnswers
	} from '$lib/form/firstPage/schema';
	import { resolveVisiblePages, isQuestionVisible } from '$lib/form/firstPage/visibility';
	import { flattenQuestions, getValidationErrorMessage } from '$lib/form/firstPage/validation';
	import { getOptionValue, resolveDynamicText, NoteWorthyMessage } from '$lib/form/firstPage/utils';
	import { goNextRoute } from '$lib/form/firstPage/navigation';
	import formSchema from '$lib/config/commonPage.json';
	import type { Question, Schema, Answers, LoanDataStore } from '$lib/types/formTypes';
	import { deviceState } from '$lib/stores/device.svelte';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import NavigationButton from '$lib/components/NavigationButton.svelte';
	import {
		ChevronRight,
		Home,
		Gauge,
		RotateCcw,
		ArrowRight,
		FileText,
		Loader2,
		Sun,
		Moon,
		Laptop,
		Lightbulb,
		AlertTriangle,
		CheckCircle2,
		Info
	} from '$lib/utils/iconRegistry';
	import { goto, afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { ROUTES } from '$lib/config/routes.js';
	import { clearFormState } from '$lib/utils/formStateHelpers';
	import {
		switchLoanType,
		resumeParkedLoan,
		resetLoanPageIndex
	} from '$lib/utils/loanSwitchOrchestrator.svelte';
	import { applyVariantStashRules } from '$lib/utils/variantStashRegistry';
	import { loanParkingState } from '$lib/state/loanParking.svelte';
	import jsonLogic from 'json-logic-js';
	import { createFormAutoScroll } from '$lib/utils/formAutoScroll';
	import { securedClone } from '$lib/utils/securedClone';
	import FormSidebarSection from '$lib/components/form-wizard/FormSidebarSection.svelte';
	import FormContextPanel from '$lib/components/form-wizard/FormContextPanel.svelte';
	import { themeState } from '$lib/stores/theme.svelte';

	let themeMode = $derived(themeState.mode);

	let selectedLoan = $state('');
	let currentPageIndex = $state(0);

	onMount(() => {
		selectedLoan = (formState.loanData as LoanDataStore)?.loanName ?? '';
		formState.applicantPageIndex = 0;
	});

	let schema = $derived(preprocessSchema(formSchema, selectedLoan));

	let currentAnswers = $derived.by(() => {
		const data = formState.loanData as LoanDataStore;
		return typeof data[selectedLoan] === 'object' && data[selectedLoan] !== null
			? (data[selectedLoan] as Answers)
			: {};
	});

	let combinedAnswers = $derived(buildCombinedAnswers(schema, currentAnswers, selectedLoan));
	let visiblePages = $derived(resolveVisiblePages(schema, combinedAnswers));
	let currentPageIndexClamped = $derived(Math.min(currentPageIndex, visiblePages.length - 1));
	let currentPage = $derived(visiblePages[currentPageIndexClamped]);
	let visibleQuestions = $derived(
		currentPage?.questions.filter((q: Question) => isQuestionVisible(q, combinedAnswers)) ?? []
	);

	function updateAnswerByKey(key: string, value: unknown) {
		const d = formState.loanData as LoanDataStore;
		const currentLoanData = (d[selectedLoan] as Answers) ?? {};
		formState.replaceLoanData({
			...d,
			[selectedLoan]: {
				...currentLoanData,
				[key]: value
			},
			loanName: selectedLoan
		});
	}

	// ── Loan-type switch — silent, no modal ─────────────────────────────────
	// Per user request (S104): no confirmation, no undo. Just switch and
	// preserve prior-loan state via the recovery bin pattern. `switchLoanType`
	// invokes every registered owner's clear callback + parks non-applicant
	// state under loanParkingState.parkedLoans so the resume strip on the
	// picker can offer to restore later if the user wants.
	function onResumeParkedLoan(loanName: string): void {
		const restored = resumeParkedLoan(loanName);
		if (restored) {
			selectedLoan = loanName;
			currentPageIndex = 0;
		}
	}

	// Variant-shaping keys: changing any of these inside the SAME loan name
	// reshapes the visible-page set on the loan's form route. A saved page
	// index from the prior variant points at a semantically different page
	// in the new variant, so we reset the per-loan page index. (Pitfall #41.)
	const VARIANT_SHAPING_KEYS = new Set(['loanType', 'facilityType', 'loanVariant']);

	function updateAnswer(
		question: Question,
		value: string | number | boolean | (string | number)[]
	) {
		if (question.id === 'q1_loanName') {
			const previousLoan = selectedLoan;
			const newLoan = value as string;

			if (previousLoan && previousLoan !== newLoan) {
				// Real switch — clear non-applicant state, move applicants to
				// recovery bin via switchLoanType. Silent: no confirmation,
				// no undo modal. User can resume parked loans via the strip
				// on the picker page.
				switchLoanType(previousLoan, newLoan);
			}
			selectedLoan = newLoan;
			currentPageIndex = 0;
		}

		const key = resolveBindsTo(question, currentAnswers, selectedLoan);

		// Pitfall #41: variant change within same loan name → reset the saved
		// per-loan page index so Continue-Where-I-Left-Off lands on page 1
		// of the new variant's flow rather than a stale index that now points
		// at a different page.
		if (selectedLoan && VARIANT_SHAPING_KEYS.has(key)) {
			const previousValue = currentAnswers[key];
			if (previousValue && previousValue !== value) {
				resetLoanPageIndex(selectedLoan);
			}
		}

		// Variant stash/restore: preserve answers that are showWhen-gated by
		// a scope field across scope flips. Today this covers Plot Loan's
		// loanVariant (gated by loanType === 'New Loan'). The registry is
		// data — add a row to extend without touching this file. Stash keys
		// live in per-loan-answers so switchLoanType wipes them naturally.
		const stashWrites = applyVariantStashRules({
			loanName: selectedLoan,
			changingKey: key,
			newValue: value,
			currentAnswers
		});
		for (const w of stashWrites) {
			updateAnswerByKey(w.key, w.value);
		}

		updateAnswerByKey(key, value);
	}

	// ── Auto-scroll + auto-focus for newly revealed questions ──
	const autoScroll = createFormAutoScroll();
	let lastPageForScroll = $state(-1);

	$effect(() => {
		if (currentPageIndex !== lastPageForScroll) {
			lastPageForScroll = currentPageIndex;
			autoScroll.reset();
		}
		autoScroll.update(
			visibleQuestions.map((q: Question) => ({
				id: q.id,
				bindsTo: resolveBindsTo(q, currentAnswers, selectedLoan)
			})),
			currentAnswers
		);
	});

	function allRequiredAnswered(): boolean {
		return flattenQuestions(currentPage?.questions ?? [])
			.filter((q: Question) => q.required && isQuestionVisible(q, combinedAnswers))
			.every((q: Question) => {
				const key = resolveBindsTo(q, combinedAnswers, selectedLoan);
				const val = currentAnswers[key];
				return val !== undefined && val !== null && val !== '';
			});
	}

	let isNextEnabled = $derived.by(() => {
		if (currentPage?.nextButtonVisibility) {
			return (
				currentPage.nextButtonVisibility.mode.includes('allRequiredAnswered') &&
				allRequiredAnswered()
			);
		}
		return true;
	});

	let showHomeModal = $state(false);
	let showResumeModal = $state(false);
	let existingLoanName = $state('');

	afterNavigate(({ from }) => {
		// "New Case" intent (sidebar Plus button passes `?new=1`) — DSA wants
		// a brand-new application. Clear stored form state immediately and
		// skip the "Welcome back!" resume modal entirely. Also strip the
		// `new` query param so a page refresh doesn't keep re-clearing.
		if ($page.url.searchParams.has('new')) {
			sessionStorage.setItem('__resumeHandledHere', '1');
			clearFormState();
			formState.replaceLoanData({});
			selectedLoan = '';
			currentPageIndex = 0;
			const cleanUrl = $page.url.pathname;
			goto(cleanUrl, { replaceState: true, noScroll: true, keepFocus: true });
			return;
		}

		const fromPath = from?.url?.pathname ?? '';
		const cameFromHomeOrDashboard = fromPath === '/' || fromPath.startsWith('/dashboard');
		const storedLoanName = (formState.loanData as LoanDataStore)?.loanName ?? '';
		const alreadyHandled = sessionStorage.getItem('__resumeHandledHere');

		if (!alreadyHandled && cameFromHomeOrDashboard && storedLoanName) {
			existingLoanName = storedLoanName;
			showResumeModal = true;
		}
	});

	function startFresh() {
		showResumeModal = false;
		sessionStorage.setItem('__resumeHandledHere', '1');
		clearFormState();
		formState.replaceLoanData({});
		selectedLoan = '';
		currentPageIndex = 0;
	}

	function resumeApplication() {
		showResumeModal = false;
		sessionStorage.setItem('__resumeHandledHere', '1');
	}

	function goHome() {
		showHomeModal = true;
	}

	function goNext() {
		// (S213, ADR-0024) The applyAutoLoanRules call removed here was a no-op left
		// over from when the auto-rules set legacy 'Start Fresh with New Loan'. With
		// q4_loanType options now writing the canonical scope ('New Loan') directly,
		// no post-selection rewrite is needed. Source firstPage/rules.ts archived.
		const freshAnswers = ((formState.loanData as LoanDataStore)[selectedLoan] as Answers) ?? {};
		goNextRoute(freshAnswers, userFormConformationState);
	}

	// ── Prefill from previous case (P1.2) ───────────────────────
	let showPrefillModal = $state(false);
	let prefillCases: Array<{
		case_id: string;
		label: string;
		loan_type: string;
		stage: string;
		updated_at: string;
	}> = $state([]);
	let prefillLoading = $state(false);
	let prefillError = $state('');
	let prefillApplying = $state('');

	async function openPrefillModal() {
		showPrefillModal = true;
		prefillLoading = true;
		prefillError = '';

		try {
			const res = await fetch('/api/cases?limit=10&page=1&has_snapshot=true');
			const result = await res.json();

			if (result.success && result.data?.cases?.length > 0) {
				prefillCases = result.data.cases.map((c: Record<string, unknown>) => ({
					case_id: c.case_id as string,
					label: c.label as string,
					loan_type: c.loan_type as string,
					stage: c.stage as string,
					updated_at: c.updated_at as string
				}));
			} else {
				prefillCases = [];
			}
		} catch {
			prefillError = 'Failed to load cases. Please try again.';
		} finally {
			prefillLoading = false;
		}
	}

	async function loadFromCase(caseId: string) {
		prefillApplying = caseId;
		try {
			const res = await fetch(`/api/cases/${caseId}/snapshots?limit=1`);
			if (!res.ok) {
				prefillApplying = '';
				return;
			}
			const result = await res.json();

			if (result.success && result.data?.snapshots?.length > 0) {
				formState.fromJSON(securedClone(result.data.snapshots[0].payload));
				const loadedLoan = (formState.loanData as LoanDataStore)?.loanName ?? '';
				if (loadedLoan) {
					selectedLoan = loadedLoan;
				}
				showPrefillModal = false;
				// Navigate to the form page for this loan type
				goNextRoute(
					((formState.loanData as LoanDataStore)?.[selectedLoan] as Answers) ?? {},
					userFormConformationState
				);
			} else {
				prefillError = 'No snapshot found for this case.';
			}
		} catch {
			prefillError = 'Failed to load case data. Please try again.';
		} finally {
			prefillApplying = '';
		}
	}

	function formatRelativeDate(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const days = Math.floor(diff / 86400000);
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		return `${Math.floor(days / 30)}mo ago`;
	}
</script>

<div class="how-shell">
	<!-- Left Sidebar (desktop only) -->
	{#if !deviceState.isMobile && !deviceState.isNative}
		<nav class="wizard-sidebar">
			<div class="sidebar-content">
				<FormSidebarSection
					index={0}
					label="How Can We Help?"
					subsections={[
						{ id: 'loan-selection', label: 'Loan Selection', pageIds: [] },
						...(selectedLoan ? [{ id: 'loan-details', label: 'Loan Details', pageIds: [] }] : [])
					]}
					isActive={true}
					isComplete={false}
					isLast={true}
					locked={false}
					subsectionLocked={{}}
					subsectionCompletion={{
						'loan-selection': { answered: selectedLoan ? 1 : 0, total: 1 },
						...(selectedLoan
							? { 'loan-details': { answered: currentAnswers?.loanType ? 1 : 0, total: 1 } }
							: {})
					}}
					activeSubsectionId={selectedLoan ? 'loan-details' : 'loan-selection'}
					onNavigate={() => {}}
					onSectionClick={() => {}}
				/>
			</div>
			<div class="sidebar-actions">
				<a href={ROUTES.HOME} class="sidebar-action-btn buttonText">
					<Home size={16} />
					<span>Home</span>
				</a>
				<button
					type="button"
					class="sidebar-action-btn buttonText"
					onclick={() => themeState.toggleTheme()}
					aria-label="Toggle theme, current: {themeMode}"
					title="Theme: {themeMode}"
				>
					{#if themeMode === 'light'}
						<Sun size={16} class="sidebar-action-icon" />
						<span>Light Mode</span>
					{:else if themeMode === 'dark'}
						<Moon size={16} class="sidebar-action-icon" />
						<span>Dark Mode</span>
					{:else}
						<Laptop size={16} class="sidebar-action-icon" />
						<span>System</span>
					{/if}
				</button>
				<a href={ROUTES.DASHBOARD.ROOT} class="sidebar-action-btn buttonText">
					<Gauge size={16} />
					<span>Dashboard</span>
				</a>
			</div>
		</nav>
	{/if}

	<!-- Center Content -->
	<div class="how-content">
		<div class="how-content-inner">
			<div class="inset-1 flex w-full flex-col gap-4 p-2 md:p-6">
				<div class="flex items-center justify-between pt-4 md:mb-6">
					<h2 class="text-titleText">
						{currentPage?.title || 'Loan Application'}
					</h2>

					<FormLogo />
				</div>

				<!-- Resume strip — parked loans waiting to be picked up. Shows only
				     before any loan is selected so it doesn't compete with the
				     active loan's questions. Per-application scope is naturally
				     implicit: parkedLoans is in-memory and dies on tab close. -->
				{#if !selectedLoan && Object.keys(loanParkingState.parkedLoans).length > 0}
					<div
						class="rounded-lg border border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] p-3"
						role="region"
						aria-label="Saved work from earlier loan types"
					>
						<p class="buttonText font-titleMedium !m-0 mb-2 text-primary">
							Saved work in this session
						</p>

						<div class="flex flex-col gap-1.5">
							{#each Object.values(loanParkingState.parkedLoans) as parked (parked.loanName)}
								<button
									type="button"
									onclick={() => onResumeParkedLoan(parked.loanName)}
									class="flex items-center justify-between rounded-md border border-[var(--form-border)] bg-[var(--form-bg-card)] px-3 py-2 text-left transition-colors hover:bg-[var(--dash-hover)]"
								>
									<div>
										<p class="buttonText font-titleMedium text-[var(--form-text-label)]">
											{parked.loanName}
										</p>
										<p class="smallText text-[var(--form-text-muted)]">
											{#if parked.display.applicantCount > 0}
												{parked.display.applicantCount}
												applicant{parked.display.applicantCount === 1 ? '' : 's'}
												{#if parked.display.pagesFilled > 0}&middot;{/if}
											{/if}
											{#if parked.display.pagesFilled > 0}
												{parked.display.pagesFilled}
												page{parked.display.pagesFilled === 1 ? '' : 's'} filled
											{/if}
										</p>
									</div>
									<RotateCcw size={16} class="text-primary" />
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#each visibleQuestions as question (question.id)}
					<div data-question-id={question.id}>
						{#if question.type === 'radio'}
							<RadioField
								id={question.id}
								name={question.id}
								label={resolveDynamicText(question.question, combinedAnswers)}
								description={resolveDynamicText(question.description, combinedAnswers)}
								optionContainerClass={question.optionContainerClass}
								radioClass={question.radioClass}
								options={(question.options as any[])?.filter((opt: any) => {
									if (!opt.showWhen) return true;
									return jsonLogic.apply(opt.showWhen, combinedAnswers);
								}) ?? []}
								value={currentAnswers[
									resolveBindsTo(question, combinedAnswers, selectedLoan)
								]?.toString() ?? ''}
								error={getValidationErrorMessage(
									question,
									combinedAnswers,
									selectedLoan,
									currentPageIndex
								)}
								onChange={(value: string | number) => updateAnswer(question, value)}
								getOptionValue={(opt: any) => getOptionValue(opt.value, combinedAnswers).toString()}
								getOptionLabel={(opt: any) =>
									typeof opt.label === 'object' && opt.label?.var
										? combinedAnswers[opt.label.var]?.toString() || opt.label.var
										: (opt.label as string)}
								getOptionLabelDescription={(opt: any) =>
									typeof opt.labelDescription === 'object' && opt.labelDescription?.var
										? combinedAnswers[opt.labelDescription.var]?.toString() ||
											opt.labelDescription.var
										: (opt.labelDescription as string)}
								required={question.required ?? false}
							/>
						{/if}
						{#if NoteWorthyMessage(currentAnswers) && question.id === 'q1_loanName'}
							<div class="mt-4 rounded-r-md border border-l-4 border-primary bg-primary/10">
								<div class="p-4">
									<h4 class="text-regularText font-titleBold mb-3 text-primaryText">Noteworthy</h4>
									<p class="smallText mb-2 italic">
										{@html NoteWorthyMessage(currentAnswers)}
									</p>
									<p class="smallText italic">
										For loan amounts exceeding <span class="font-titleMedium">₹50 lakhs</span>
										(details will be requested later), lenders typically require
										<span class="font-titleMedium">collateral.</span>
										In such cases, a
										<span class="font-titleMedium">Loan Against Property (LAP)</span> may be a more suitable
										option, offering improved eligibility and terms.
									</p>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Spacer for fixed bottom bar -->
			<div class="h-20"></div>
		</div>

		<!-- Fixed bottom navigation bar -->
		<div class="how-nav-bar">
			<div class="how-nav-inner">
				<NavigationButton
					btnName="Home"
					iconPosition="left"
					icon={Home}
					btnClass="buttonText text-[var(--form-text-secondary)] bg-[var(--form-bg-alt)] border border-[var(--form-border)] hover:border-[var(--form-border-hover)] transition-all nav-btn"
					onClick={goHome}
				/>
				<button
					onclick={openPrefillModal}
					class="smallText buttonText flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--form-border)] px-3 py-2 text-[var(--form-text-secondary)] transition-all hover:border-[var(--form-border-hover)]"
					type="button"
				>
					<RotateCcw class="h-4 w-4" />
					Load Previous <span class="hidden sm:block">Case</span>
				</button>
				{#if currentAnswers?.loanType !== ''}
					<button
						class="nav-btn nav-btn-next buttonText text-[var(--bg-header-text)]"
						class:nav-btn-muted={!isNextEnabled}
						disabled={!isNextEnabled}
						onclick={goNext}
						type="button"
						aria-label="Go to next step"
					>
						Next
						<ChevronRight class="h-4 w-4 shrink-0" />
					</button>
				{:else}
					<div class="w-20"></div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Right Context Panel — uses standard FormContextPanel for visual consistency -->
	<FormContextPanel
		sectionLabel="Getting Started"
		subsectionLabel="Loan Selection"
		contextInfo={{
			title: 'How Can We Help?',
			dsaGuidance: {
				summary:
					"Choose the right loan type based on your client's needs. This determines which questions appear and which lenders are evaluated.",
				keyPoints: [
					'Home Loan, LAP, and Plot Loan are secured (require property collateral)',
					'Personal, Business, and Professional loans are unsecured',
					'BT (Balance Transfer) lets you move an existing loan to a new lender for better rates',
					'Top-up provides additional funds on an existing loan'
				],
				watchFor: [
					'Unsecured loans above ₹50L may need collateral — consider LAP instead',
					"BT requires the client's existing loan details (outstanding, EMI, tenure)",
					'Professional loans need proof of professional practice (CA, Doctor, etc.)'
				],
				proTips: [
					'Ask about existing loans first — BT + Top-up often gets better rates than a fresh loan',
					'For self-employed clients earning ₹25L+, LAP usually offers lower ROI than personal loan'
				]
			}
		}}
	/>
</div>

{#if showResumeModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<div class="absolute inset-0 bg-black/50"></div>

		<div class="relative z-10 w-[90%] max-w-md rounded-xl bg-[var(--form-bg-card)] p-6 shadow-xl">
			<div class="flex flex-col">
				<h2 class="text-labelQuestion">Welcome back!</h2>
				<p class="descriptionText text-[var(--form-text-label)]">
					We found an existing <span class="font-titleMedium text-primary">{existingLoanName}</span> application
					in progress. Would you like to continue where you left off?
				</p>
			</div>

			<div class="group mt-6 flex flex-col gap-3">
				<button onclick={resumeApplication} class="logo-nav-btn" id="resume-option">
					<ArrowRight size={20} class="text-primary" />
					<div class="text-left">
						<span class="buttonText font-titleMedium text-[var(--form-text-label)]"
							>Resume Application</span
						>
						<p class="smallText text-[var(--form-text-muted)]">
							Continue your {existingLoanName} application
						</p>
					</div>
				</button>

				<button onclick={startFresh} class="logo-nav-btn">
					<RotateCcw
						size={20}
						class="text-[var(--form-text-label)] transition-colors group-hover:text-primary"
					/>

					<div class="text-left">
						<span class="buttonText font-titleMedium text-[var(--form-text-label)]">
							Start Fresh
						</span>

						<p class="smallText text-[var(--form-text-muted)]">
							Clear all data and begin a new application
						</p>
					</div>
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showHomeModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button
			type="button"
			class="absolute inset-0 cursor-default border-none bg-black/50"
			onclick={() => (showHomeModal = false)}
			aria-label="Close modal"
		></button>

		<div class="relative z-10 w-[90%] max-w-md rounded-xl bg-[var(--form-bg-card)] p-6 shadow-xl">
			<div class="flex flex-col gap-0">
				<h2 class="text-labelQuestion">Where would you like to go?</h2>
				<p class="descriptionText text-[var(--form-text-label)]">
					Any unsaved progress on this page may be lost.
				</p>
			</div>

			<div class="mt-6 flex flex-col gap-3">
				<button
					onclick={() => {
						showHomeModal = false;
						goto(ROUTES.DASHBOARD.ROOT);
					}}
					class="logo-nav-btn"
				>
					<Gauge size={20} class="text-primary" />
					<div class="text-left">
						<span class="buttonText font-titleMedium text-[var(--form-text-label)]">Dashboard</span>
						<p class="smallText text-[var(--form-text-muted)]">Go to your dashboard</p>
					</div>
				</button>

				<button
					onclick={() => {
						showHomeModal = false;
						goto(ROUTES.HOME);
					}}
					class="logo-nav-btn"
				>
					<Home size={20} class="text-primary" />
					<div class="text-left">
						<span class="buttonText font-titleMedium text-[var(--form-text-label)]">Home Page</span>
						<p class="smallText text-[var(--form-text-muted)]">Go to the main website</p>
					</div>
				</button>
			</div>

			<button
				onclick={() => (showHomeModal = false)}
				class="bg-ddsa-gradient-primary buttonText cancelBtn mt-4 text-[var(--bg-header-text)]"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}

{#if showPrefillModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<button
			type="button"
			class="absolute inset-0 cursor-default border-none bg-black/50"
			onclick={() => (showPrefillModal = false)}
			aria-label="Close modal"
		></button>

		<div
			class="relative z-10 max-h-[80vh] w-[90%] max-w-lg overflow-y-auto rounded-xl bg-[var(--form-bg-card)] p-6 shadow-xl"
		>
			<h2 class="text-labelQuestion">Load from Previous Case</h2>
			<p class="descriptionText mt-1 text-[var(--form-text-label)]">
				Select a case to pre-fill the form with its data. This creates a new application — the
				original case is unchanged.
			</p>

			{#if prefillLoading}
				<div class="flex items-center justify-center gap-2 py-8 text-[var(--form-text-muted)]">
					<Loader2 size={20} class="animate-spin" />
					<span class="smallText">Loading cases...</span>
				</div>
			{:else if prefillError}
				<div class="error-message mt-4 !border-l-1">
					<p class="alertText">{prefillError}</p>
				</div>
			{:else if prefillCases.length === 0}
				<div class="alertText py-8 text-[var(--form-text-muted)]">
					No previous cases found. Create a new application to get started.
				</div>
			{:else}
				<div class="mt-4 flex flex-col gap-2">
					{#each prefillCases as c (c.case_id)}
						<button
							onclick={() => loadFromCase(c.case_id)}
							disabled={!!prefillApplying}
							class="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
						>
							<FileText size={18} class="shrink-0 text-primary" />
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="buttonText font-titleMedium truncate">{c.label}</span>
									<span
										class="tinyText shrink-0 rounded-full bg-[var(--ddsa-primary-50)] px-2.5 py-0.5"
									>
										{c.stage}
									</span>
								</div>
								<p class="smallText truncate text-[var(--form-text-muted)]">
									{c.loan_type} &middot; {formatRelativeDate(c.updated_at)}
								</p>
							</div>
							{#if prefillApplying === c.case_id}
								<Loader2 size={16} class="shrink-0 animate-spin text-primary" />
							{/if}
						</button>
					{/each}
				</div>
			{/if}

			<button
				onclick={() => (showPrefillModal = false)}
				class="bg-ddsa-gradient-primary buttonText cancelBtn text-[var(--bg-header-text)]"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}

<style>
	.logo-nav-btn {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 16px;
		border-radius: 12px;
		border: 1px solid var(--form-border, #e5e7eb);
		background: var(--form-bg-card, #fff);
		cursor: pointer;
		transition: all 0.15s ease;
		width: 100%;
		text-align: left;
		color: var(--form-text, #374151);
	}

	.logo-nav-btn:hover,
	.logo-nav-btn#resume-option {
		border-color: var(--trial-accent, #6366f1);
		background: var(--ddsa-primary-100);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
	}

	/* ── 3-column shell (matches FormShell) ── */
	.how-shell {
		display: flex;
		min-height: 100vh;
		width: 100%;
	}

	/* ── Left sidebar (matches FormSidebar) ── */
	.wizard-sidebar {
		display: none;
	}

	@media (min-width: 1024px) {
		.wizard-sidebar {
			width: 280px;
			min-width: 280px;
			background: linear-gradient(165deg, #1e2430 0%, #151a24 50%, #0f1318 100%);
			border-right: 1px solid rgba(255, 255, 255, 0.06);
			position: sticky;
			top: 0;
			height: 100vh;
			overflow: hidden;
			box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
			display: flex;
			flex-direction: column;
		}
	}

	.sidebar-content {
		padding: 2rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.sidebar-actions {
		padding: 0.75rem 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex-shrink: 0;
	}

	.sidebar-action-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.8rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		border: none;
		background: none;
		width: 100%;
		transition: all 0.15s ease;
	}

	.sidebar-action-btn:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
	}

	/* ── Center content ── */
	.how-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		background: var(--form-bg-alt);
	}

	.how-content-inner {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		padding-bottom: 5rem;
		max-width: 56rem;
		margin: 0 auto;
		width: 100%;
	}

	@media (min-width: 768px) {
		.how-content-inner {
			padding: 1rem 1.5rem;
			padding-bottom: 5rem;
		}
	}

	/* ── Bottom nav bar ── */
	.how-nav-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 50;
		background: var(--form-nav-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid var(--form-border);
	}

	@media (min-width: 1024px) {
		.how-nav-bar {
			left: 280px;
		}
	}

	@media (min-width: 1280px) {
		.how-nav-bar {
			right: 380px;
		}
	}

	.how-nav-inner {
		max-width: 56rem;
		margin: 0 auto;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	@media (min-width: 768px) {
		.how-nav-inner {
			padding: 0.75rem 2rem;
		}
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.625rem 1rem;
		border: none;
		border-radius: 0.5rem;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	/* Restore full button sizing on tablet+ */
	@media (min-width: 768px) {
		.nav-btn {
			gap: 0.375rem;
			padding: 0.75rem 1.5rem;
		}
	}

	.nav-btn-next {
		background: linear-gradient(
			to right,
			var(--ddsa-primary-500) 0%,
			var(--ddsa-accent-500) 51%,
			var(--ddsa-primary-500) 100%
		);
		background-size: 200% auto;
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}

	.nav-btn-next:hover:not(.nav-btn-muted) {
		background-position: right center;
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		transform: translateY(-1px);
	}

	.cancelBtn {
		flex: 1;
		padding: 0.75rem 1rem;
		width: 100%;
		/* font-family: var(--font-titleMedium);
		font-size: var(--font-size-14); */
		border-radius: 0.75rem;
		border: none;
		/* background: linear-gradient(135deg, #374151 0%, #1f2937 100%); */
		/* color: #fff; */
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}

	.cancelBtn:hover {
		background-position: right center;
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		transform: translateY(-1px);
		opacity: 0.9;
	}
</style>
