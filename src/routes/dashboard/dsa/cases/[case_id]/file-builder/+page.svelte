<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	// ── Page data ──────────────────────────────────────────────
	let { data } = $props();
	const caseId = $derived(data.caseId);
	const lenderApps = $derived(data.lenderApplications as any[]);
	const hasFormSnapshot = $derived(data.hasFormSnapshot);
	const formSnapshotVersion = $derived(data.formSnapshotVersion);

	// ── Selected lender (from query param or first) ─────────
	const queryLender = $derived($page.url.searchParams.get('lender'));
	let selectedLenderId = $state('');

	// Initialize selected lender from query param or first available
	$effect(() => {
		if (queryLender && lenderApps.some((la: any) => la.lender_application_id === queryLender)) {
			selectedLenderId = queryLender;
		} else if (lenderApps.length > 0 && !selectedLenderId) {
			selectedLenderId = lenderApps[0].lender_application_id;
		}
	});

	const selectedApp = $derived(
		lenderApps.find((la: any) => la.lender_application_id === selectedLenderId)
	);

	// ── Section definitions ──────────────────────────────────
	const SECTION_LABELS: Record<string, string> = {
		applicant_details: 'Applicant Details',
		income_details: 'Income Details',
		obligation_details: 'Obligations',
		property_details: 'Property Details',
		loan_details: 'Loan Details',
		documents: 'Documents',
		eligibility_summary: 'Eligibility Summary'
	};

	const DEFAULT_SECTIONS = [
		'applicant_details',
		'income_details',
		'obligation_details',
		'property_details',
		'loan_details',
		'documents',
		'eligibility_summary'
	];

	// ── Config state (per selected lender) ───────────────────
	let sectionsVisibility = $state<Record<string, boolean>>({});
	let displayMode = $state<{ income: string; obligations: string; applicants: string }>({
		income: 'consolidated',
		obligations: 'consolidated',
		applicants: 'consolidated'
	});
	let sectionOrder = $state<string[]>([...DEFAULT_SECTIONS]);
	let dsaNotes = $state<Record<string, string>>({});
	let configLoaded = $state(false);
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedTimer: ReturnType<typeof setTimeout> | null = null;

	// ── Notes editor state ────────────────────────────────────
	let editingNoteSection = $state<string | null>(null);

	// ── Generation state ──────────────────────────────────────
	let generating = $state(false);
	let generateError = $state('');

	// ── Load config when lender changes ──────────────────────
	$effect(() => {
		if (selectedLenderId && hasFormSnapshot) {
			loadConfig(selectedLenderId);
		}
	});

	async function loadConfig(lenderAppId: string) {
		configLoaded = false;
		try {
			const res = await secureFetch(`/api/cases/${caseId}/file-config?lender_app_id=${lenderAppId}`);
			const result = await res.json();
			if (result.success) {
				const cfg = result.data.config;
				sectionsVisibility = cfg.sections_visibility ?? {};
				displayMode = {
					income: cfg.display_mode?.income ?? 'consolidated',
					obligations: cfg.display_mode?.obligations ?? 'consolidated',
					applicants: cfg.display_mode?.applicants ?? 'consolidated'
				};
				sectionOrder = cfg.section_order?.length > 0 ? cfg.section_order : [...DEFAULT_SECTIONS];
				dsaNotes = cfg.dsa_notes ?? {};
			} else {
				// Fallback to defaults
				resetConfigToDefaults();
			}
		} catch {
			resetConfigToDefaults();
		}
		configLoaded = true;
	}

	function resetConfigToDefaults() {
		const vis: Record<string, boolean> = {};
		for (const s of DEFAULT_SECTIONS) vis[s] = true;
		sectionsVisibility = vis;
		displayMode = {
			income: 'consolidated',
			obligations: 'consolidated',
			applicants: 'consolidated'
		};
		sectionOrder = [...DEFAULT_SECTIONS];
		dsaNotes = {};
	}

	// ── Auto-save with debounce ──────────────────────────────
	function scheduleAutoSave(updates: Record<string, any>) {
		if (saveTimer) clearTimeout(saveTimer);
		if (savedTimer) clearTimeout(savedTimer);
		saveStatus = 'idle';

		saveTimer = setTimeout(() => {
			performSave(updates);
		}, 500);
	}

	async function performSave(updates: Record<string, any>) {
		saveStatus = 'saving';
		try {
			const res = await secureFetch(`/api/cases/${caseId}/file-config`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lender_app_id: selectedLenderId,
					...updates
				})
			});
			const result = await res.json();
			if (result.success) {
				saveStatus = 'saved';
				savedTimer = setTimeout(() => {
					saveStatus = 'idle';
				}, 2000);
			} else {
				saveStatus = 'error';
			}
		} catch {
			saveStatus = 'error';
		}
	}

	// ── Config change handlers ────────────────────────────────
	function toggleSection(section: string) {
		sectionsVisibility[section] = !sectionsVisibility[section];
		scheduleAutoSave({ sections_visibility: { [section]: sectionsVisibility[section] } });
	}

	function setDisplayMode(field: 'income' | 'obligations' | 'applicants', value: string) {
		displayMode[field] = value;
		scheduleAutoSave({ display_mode: { [field]: value } });
	}

	function moveSection(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= sectionOrder.length) return;
		const copy = [...sectionOrder];
		[copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
		sectionOrder = copy;
		scheduleAutoSave({ section_order: sectionOrder });
	}

	function saveNote(section: string, text: string) {
		dsaNotes[section] = text;
		editingNoteSection = null;
		scheduleAutoSave({ dsa_notes: { [section]: text } });
	}

	// ── File snapshots for selected lender ───────────────────
	const fileSnapshots = $derived(
		(selectedApp?.file_snapshots ?? [])
			.slice()
			.sort(
				(a: any, b: any) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
			)
	);

	// ── Generate PDF ──────────────────────────────────────────
	async function generatePDF(type: 'review' | 'submission') {
		generating = true;
		generateError = '';

		try {
			const res = await secureFetch(`/api/cases/${caseId}/file-builder`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lender_app_id: selectedLenderId,
					type
				})
			});

			const result = await res.json();

			if (result.success) {
				// Auto-download the generated PDF
				const pdfUrl = result.data.pdf_url;
				const link = document.createElement('a');
				link.href = pdfUrl;
				link.download = '';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				// Re-run server load so the new snapshot appears in history.
				await invalidateAll();
			} else {
				generateError = result.error || 'Failed to generate PDF';
			}
		} catch {
			generateError = 'Network error. Please try again.';
		} finally {
			generating = false;
		}
	}

	// ── Download existing snapshot ────────────────────────────
	function downloadSnapshot(snapshot: any) {
		const url = `/api/cases/${caseId}/file-builder/download?lender_app_id=${selectedLenderId}&snapshot_id=${snapshot.snapshot_id}`;
		const link = document.createElement('a');
		link.href = url;
		link.download = '';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// ── Format helpers ────────────────────────────────────────
	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// ── Traffic light dot color ──────────────────────────────
	function trafficLightColor(app: any): string {
		const light = app?.eligibility_snapshot?.traffic_light;
		if (light === 'green') return 'bg-[var(--dash-accent-text)]';
		if (light === 'amber') return 'bg-[var(--dash-text-muted)]';
		if (light === 'red') return 'bg-[var(--dash-contrast-text)]';
		return 'bg-[var(--dash-text-muted)]';
	}
</script>

<svelte:head>
	<title>File Builder | DigitalDSA</title>
</svelte:head>

<div class="file-builder-page">
	<!-- ════════════════════════════════════════════════════════════ -->
	<!-- EMPTY STATE: No lender applications                         -->
	<!-- ════════════════════════════════════════════════════════════ -->
	{#if lenderApps.length === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<div
				class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-7 w-7 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
					/>
				</svg>
			</div>
			<h3 class="text-base font-semibold text-[var(--dash-text-secondary)]">
				No Lenders Added Yet
			</h3>
			<p class="mt-1 max-w-sm text-sm text-[var(--dash-text-secondary)]">
				Add lenders from the Overview tab to start building files.
			</p>
			<a
				href="/dashboard/dsa/cases/{caseId}"
				class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ddsa-accent-600)]"
			>
				Go to Overview
			</a>
		</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- NO FORM SNAPSHOT STATE                                      -->
		<!-- ════════════════════════════════════════════════════════════ -->
	{:else if !hasFormSnapshot}
		<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-6">
			<div class="flex items-start gap-3">
				<svg
					class="h-6 w-6 shrink-0 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
					/>
				</svg>
				<div>
					<h3 class="text-sm font-semibold text-[var(--dash-text)]">Form Submission Required</h3>
					<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
						Submit the loan application form first to generate files. The File Builder uses your
						form data to create lender-ready documents.
					</p>
				</div>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════ -->
		<!-- MAIN FILE BUILDER UI                                        -->
		<!-- ════════════════════════════════════════════════════════════ -->
	{:else}
		<!-- ── Page Header ──────────────────────────────────────── -->
		<div class="mb-4">
			<h2 class="text-[1.0625rem] font-bold text-[var(--dash-text)]">File Builder</h2>
			<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">
				Configure and generate lender-ready documents
				{#if formSnapshotVersion > 0}
					&middot; Form v{formSnapshotVersion}
				{/if}
			</p>
		</div>

		<!-- ── Lender Tab Bar ───────────────────────────────────── -->
		<div class="mb-5 overflow-x-auto">
			<div class="flex gap-2">
				{#each lenderApps as app (app.lender_application_id)}
					{@const isActive = app.lender_application_id === selectedLenderId}
					<button
						type="button"
						onclick={() => {
							selectedLenderId = app.lender_application_id;
						}}
						class="flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all
							{isActive
							? 'border-[var(--ddsa-accent-400)] bg-[var(--ddsa-accent-50)] text-[var(--ddsa-accent-700)] shadow-sm'
							: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)] hover:bg-[var(--dash-hover)]'}"
					>
						<span class="h-2 w-2 rounded-full {trafficLightColor(app)}"></span>
						{app.lender_name}
						{#if app.file_snapshots?.length > 0}
							<span
								class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-semibold text-[var(--dash-text-secondary)]"
							>
								{app.file_snapshots.length}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- ── Two-column layout ─────────────────────────────────── -->
		{#if configLoaded && selectedApp}
			<div class="grid gap-6 lg:grid-cols-[1fr_360px]">
				<!-- ═══════════════════════════════════════════════════ -->
				<!-- CONFIG PANEL (left)                                 -->
				<!-- ═══════════════════════════════════════════════════ -->
				<div class="space-y-5">
					<!-- Save status indicator -->
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold text-[var(--dash-text-secondary)]">Configuration</h3>
						{#if saveStatus === 'saving'}
							<span class="flex items-center gap-1.5 text-xs text-[var(--dash-text-muted)]">
								<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--dash-text-muted)]"
								></span>
								Saving...
							</span>
						{:else if saveStatus === 'saved'}
							<span class="flex items-center gap-1.5 text-xs text-[var(--dash-accent-text)]">
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
								</svg>
								Saved
							</span>
						{:else if saveStatus === 'error'}
							<span class="text-xs text-[var(--dash-contrast-text)]">Save failed</span>
						{/if}
					</div>

					<!-- ── Section Visibility & Order ───────────────── -->
					<div
						class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
					>
						<h4
							class="mb-3 text-xs font-semibold tracking-wide text-[var(--dash-text-muted)] uppercase"
						>
							Sections
						</h4>
						<div class="space-y-1">
							{#each sectionOrder as section, idx (section)}
								<div
									class="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--dash-hover)]"
								>
									<!-- Reorder arrows -->
									<div class="flex flex-col">
										<button
											type="button"
											disabled={idx === 0}
											onclick={() => moveSection(idx, 'up')}
											class="text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-text-secondary)] disabled:opacity-30"
											aria-label="Move up"
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="2.5"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M4.5 15.75l7.5-7.5 7.5 7.5"
												/>
											</svg>
										</button>
										<button
											type="button"
											disabled={idx === sectionOrder.length - 1}
											onclick={() => moveSection(idx, 'down')}
											class="text-[var(--dash-text-muted)] transition-colors hover:text-[var(--dash-text-secondary)] disabled:opacity-30"
											aria-label="Move down"
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="2.5"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M19.5 8.25l-7.5 7.5-7.5-7.5"
												/>
											</svg>
										</button>
									</div>

									<!-- Toggle switch -->
									<button
										type="button"
										onclick={() => toggleSection(section)}
										class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
											{sectionsVisibility[section] !== false ? 'bg-[var(--ddsa-accent-500)]' : 'bg-[var(--dash-border)]'}"
										role="switch"
										aria-checked={sectionsVisibility[section] !== false}
										aria-label="Toggle {SECTION_LABELS[section] || section}"
									>
										<span
											class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out
												{sectionsVisibility[section] !== false ? 'translate-x-4' : 'translate-x-0'}"
										></span>
									</button>

									<!-- Section label + note button -->
									<div class="flex flex-1 items-center justify-between">
										<span
											class="text-sm font-medium text-[var(--dash-text-secondary)] {sectionsVisibility[
												section
											] === false
												? 'line-through opacity-40'
												: ''}"
										>
											{SECTION_LABELS[section] || section}
										</span>
										<button
											type="button"
											onclick={() => {
												editingNoteSection = editingNoteSection === section ? null : section;
											}}
											class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[13px] transition-colors
												{dsaNotes[section]
												? 'text-[var(--ddsa-accent-600)] hover:bg-[var(--ddsa-accent-50)]'
												: 'text-[var(--dash-text-muted)] hover:bg-[var(--dash-bg-alt)] hover:text-[var(--dash-text-secondary)]'}"
											title={dsaNotes[section] ? 'Edit note' : 'Add note'}
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="1.5"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
												/>
											</svg>
											{dsaNotes[section] ? 'Note' : ''}
										</button>
									</div>
								</div>

								<!-- Note editor (expandable) -->
								{#if editingNoteSection === section}
									<div
										class="mb-2 ml-14 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-3"
									>
										<textarea
											class="w-full resize-none rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] placeholder-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-400)] focus:ring-1 focus:ring-[var(--ddsa-accent-400)] focus:outline-none"
											rows="3"
											placeholder="Add a note for this section..."
											value={dsaNotes[section] || ''}
											onkeydown={(e) => {
												if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
													saveNote(section, (e.target as HTMLTextAreaElement).value);
												}
											}}
										></textarea>
										<div class="mt-2 flex justify-end gap-2">
											<button
												type="button"
												onclick={() => {
													editingNoteSection = null;
												}}
												class="rounded px-2.5 py-1 text-xs font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)]"
											>
												Cancel
											</button>
											<button
												type="button"
												onclick={(e) => {
													const textarea = (e.target as HTMLElement)
														.closest('.rounded-lg')
														?.querySelector('textarea');
													if (textarea) saveNote(section, textarea.value);
												}}
												class="rounded bg-[var(--ddsa-accent-500)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--ddsa-accent-600)]"
											>
												Save Note
											</button>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>

					<!-- ── Display Modes ─────────────────────────────── -->
					<div
						class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
					>
						<h4
							class="mb-3 text-xs font-semibold tracking-wide text-[var(--dash-text-muted)] uppercase"
						>
							Display Modes
						</h4>
						<div class="space-y-4">
							<!-- Income -->
							<div>
								<span class="mb-1.5 block text-sm font-medium text-[var(--dash-text-secondary)]"
									>Income</span
								>
								<div
									class="flex rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-0.5"
								>
									{#each ['consolidated', 'detailed'] as mode}
										<button
											type="button"
											onclick={() => setDisplayMode('income', mode)}
											class="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all
												{displayMode.income === mode
												? 'bg-[var(--dash-bg-card)] text-[var(--ddsa-accent-700)] shadow-sm'
												: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
										>
											{mode}
										</button>
									{/each}
								</div>
							</div>

							<!-- Obligations -->
							<div>
								<span class="mb-1.5 block text-sm font-medium text-[var(--dash-text-secondary)]"
									>Obligations</span
								>
								<div
									class="flex rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-0.5"
								>
									{#each ['consolidated', 'detailed'] as mode}
										<button
											type="button"
											onclick={() => setDisplayMode('obligations', mode)}
											class="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all
												{displayMode.obligations === mode
												? 'bg-[var(--dash-bg-card)] text-[var(--ddsa-accent-700)] shadow-sm'
												: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
										>
											{mode}
										</button>
									{/each}
								</div>
							</div>

							<!-- Applicants -->
							<div>
								<span class="mb-1.5 block text-sm font-medium text-[var(--dash-text-secondary)]"
									>Applicants</span
								>
								<div
									class="flex rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-0.5"
								>
									{#each [['consolidated', 'Consolidated'], ['individual', 'Individual']] as [value, label]}
										<button
											type="button"
											onclick={() => setDisplayMode('applicants', value)}
											class="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all
												{displayMode.applicants === value
												? 'bg-[var(--dash-bg-card)] text-[var(--ddsa-accent-700)] shadow-sm'
												: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
										>
											{label}
										</button>
									{/each}
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- ═══════════════════════════════════════════════════ -->
				<!-- ACTION PANEL (right)                                -->
				<!-- ═══════════════════════════════════════════════════ -->
				<div class="space-y-5">
					<!-- ── PII Mode Cards ────────────────────────────── -->
					<div class="space-y-3">
						<h3 class="text-sm font-semibold text-[var(--dash-text-secondary)]">
							Generate Document
						</h3>

						<!-- Review Copy -->
						<button
							type="button"
							disabled={generating}
							onclick={() => generatePDF('review')}
							class="w-full rounded-xl border-2 border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] p-4 text-left transition-all hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
						>
							<div class="flex items-start gap-3">
								<div
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
								>
									<svg
										class="h-5 w-5 text-[var(--dash-accent-text)]"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
										/>
									</svg>
								</div>
								<div>
									<h4 class="text-sm font-bold text-[var(--dash-accent-text)]">Review Copy</h4>
									<p class="mt-0.5 text-xs text-[var(--dash-accent-text)]">
										PII automatically stripped. Safe for RM discussions.
									</p>
								</div>
							</div>
						</button>

						<!-- Submission Copy -->
						<button
							type="button"
							disabled={generating}
							onclick={() => generatePDF('submission')}
							class="w-full rounded-xl border-2 border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-4 text-left transition-all hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
						>
							<div class="flex items-start gap-3">
								<div
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-bg-alt)]"
								>
									<svg
										class="h-5 w-5 text-[var(--dash-text-muted)]"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
										/>
									</svg>
								</div>
								<div>
									<h4 class="text-sm font-bold text-[var(--dash-text)]">Submission Copy</h4>
									<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
										Full data with contact details. For file submission to lender.
									</p>
								</div>
							</div>
						</button>

						<!-- Loading / Error state -->
						{#if generating}
							<div
								class="flex items-center justify-center gap-2 rounded-lg bg-[var(--dash-bg-alt)] py-3"
							>
								<svg
									class="h-4 w-4 animate-spin text-[var(--ddsa-accent-500)]"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span class="text-sm font-medium text-[var(--dash-text-secondary)]"
									>Generating PDF...</span
								>
							</div>
						{/if}

						{#if generateError}
							<div
								class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
							>
								{generateError}
							</div>
						{/if}
					</div>

					<!-- ── Snapshot History ───────────────────────────── -->
					<div
						class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
					>
						<h4
							class="mb-3 text-xs font-semibold tracking-wide text-[var(--dash-text-muted)] uppercase"
						>
							Generated Files
						</h4>

						{#if fileSnapshots.length === 0}
							<p class="py-4 text-center text-xs text-[var(--dash-text-muted)]">
								No files generated yet for this lender.
							</p>
						{:else}
							<div class="space-y-2">
								{#each fileSnapshots as snapshot (snapshot.snapshot_id)}
									<div
										class="flex items-center justify-between rounded-lg border border-[var(--dash-border-light)] px-3 py-2.5 transition-colors hover:bg-[var(--dash-hover)]"
									>
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<span
													class="shrink-0 rounded px-1.5 py-0.5 text-[12px] font-bold tracking-wider uppercase
													{snapshot.type === 'review'
														? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
														: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
												>
													{snapshot.type}
												</span>
												<span class="truncate text-xs text-[var(--dash-text-secondary)]">
													{formatDate(snapshot.generated_at)}
												</span>
											</div>
											{#if snapshot.config_used?.source_snapshot_version}
												<p class="mt-0.5 text-[12px] text-[var(--dash-text-muted)]">
													Form v{snapshot.config_used.source_snapshot_version}
												</p>
											{/if}
										</div>
										<button
											type="button"
											onclick={() => downloadSnapshot(snapshot)}
											class="ml-2 flex shrink-0 items-center gap-1 rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--ddsa-accent-400)] hover:text-[var(--ddsa-accent-600)]"
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="2"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
												/>
											</svg>
											Download
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else if !configLoaded}
			<!-- Config loading skeleton -->
			<div class="grid gap-6 lg:grid-cols-[1fr_360px]">
				<div class="space-y-4">
					{#each [1, 2] as _}
						<div class="h-48 animate-pulse rounded-xl bg-[var(--dash-bg-alt)]"></div>
					{/each}
				</div>
				<div class="space-y-4">
					{#each [1, 2] as _}
						<div class="h-32 animate-pulse rounded-xl bg-[var(--dash-bg-alt)]"></div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.file-builder-page {
		max-width: 72rem;
		padding: 0 0.25rem;
	}
</style>
