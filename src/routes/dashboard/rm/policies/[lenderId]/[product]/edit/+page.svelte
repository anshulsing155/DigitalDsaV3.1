<script lang="ts">
	import type { PageData } from './$types';
	import { ArrowLeft, Save, Send, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-svelte';
	import EligibilityForm from './_sections/EligibilityForm.svelte';
	import IncomeForm from './_sections/IncomeForm.svelte';
	import FoirForm from './_sections/FoirForm.svelte';
	import LtvForm from './_sections/LtvForm.svelte';
	import ObligationsForm from './_sections/ObligationsForm.svelte';
	import TenureForm from './_sections/TenureForm.svelte';
	import RoiForm from './_sections/RoiForm.svelte';
	import GeoForm from './_sections/GeoForm.svelte';
	import FeesForm from './_sections/FeesForm.svelte';
	import OtpSubmitModal from './_sections/OtpSubmitModal.svelte';
	import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';
	import { invalidateAll, goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	let { data }: { data: PageData } = $props();

	// ── State ─────────────────────────────────────────────────────────────────────
	// Locally-mutated editor state seeded once from server-loaded draft.
	// svelte-ignore state_referenced_locally
	let sections = $state<PolicyDocument['sections']>(
		structuredClone(data.draft.sections) as PolicyDocument['sections']
	);
	// Snapshot of sections as-loaded from server — for unsaved-diff detection
	// svelte-ignore state_referenced_locally
	const pristineSectionsJson = JSON.stringify(data.draft.sections);

	// svelte-ignore state_referenced_locally
	let lockVersion = $state<number>(data.draft.lockVersion);
	let isSaving = $state(false);
	let isSubmitting = $state(false);
	let saveError = $state('');
	let submitError = $state('');
	let saveSuccess = $state('');
	let otpModalOpen = $state(false);

	const currentSectionsJson = $derived(JSON.stringify(sections));
	const isDirty = $derived(currentSectionsJson !== pristineSectionsJson);

	// Count changed top-level section keys for the sidebar counter
	const changedSectionCount = $derived.by(() => {
		const pristine = JSON.parse(pristineSectionsJson) as PolicyDocument['sections'];
		let count = 0;
		for (const key of Object.keys(sections) as Array<keyof PolicyDocument['sections']>) {
			if (JSON.stringify(sections[key]) !== JSON.stringify(pristine[key])) count++;
		}
		return count;
	});

	// Already-persisted pending changes from DB (prior saves in this draft)
	const persistedChangeCount = $derived(data.draft.pendingChanges.length);

	// ── Section registry ──────────────────────────────────────────────────────────
	type SectionId = keyof PolicyDocument['sections'];
	const sectionList: { id: SectionId; label: string }[] = [
		{ id: 'eligibility', label: 'Eligibility' },
		{ id: 'income', label: 'Income' },
		{ id: 'foir', label: 'FOIR' },
		{ id: 'ltv', label: 'LTV' },
		{ id: 'obligations', label: 'Obligations' },
		{ id: 'tenure', label: 'Tenure' },
		{ id: 'roi', label: 'Rate of Interest' },
		{ id: 'geo', label: 'Geography' },
		{ id: 'fees', label: 'Fees & Charges' }
	];

	let expandedSections = $state<Record<string, boolean>>(
		Object.fromEntries(sectionList.map((s) => [s.id, s.id === 'eligibility']))
	);

	function isSectionChanged(id: SectionId): boolean {
		const pristine = JSON.parse(pristineSectionsJson) as PolicyDocument['sections'];
		return JSON.stringify(sections[id]) !== JSON.stringify(pristine[id]);
	}

	function toggleSection(id: string) {
		expandedSections = { ...expandedSections, [id]: !expandedSections[id] };
	}

	// ── Save to draft ─────────────────────────────────────────────────────────────
	async function saveDraft() {
		if (!isDirty || isSaving) return;
		isSaving = true;
		saveError = '';
		saveSuccess = '';
		try {
			const res = await secureFetch(`/api/pms/policies/${data.draft.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lockVersion, rmEdit: true, sections })
			});
			const json = await res.json();
			if (!res.ok) {
				saveError = json.error ?? 'Failed to save draft.';
				return;
			}
			lockVersion = json.data.lockVersion;
			const appended = json.data.appendedChanges?.length ?? 0;
			saveSuccess = appended > 0
				? `${appended} field${appended === 1 ? '' : 's'} saved to draft.`
				: 'No changes to save.';
			// Clear success after 4s
			setTimeout(() => (saveSuccess = ''), 4000);
			// Re-snapshot pristine state with server values via load() re-run.
			await invalidateAll();
		} catch {
			saveError = 'Network error. Please try again.';
		} finally {
			isSaving = false;
		}
	}

	// ── Submit for approval ───────────────────────────────────────────────────────
	function openSubmitModal() {
		if (isDirty) {
			submitError = 'You have unsaved changes. Save to draft first.';
			return;
		}
		submitError = '';
		otpModalOpen = true;
	}

	async function computeDraftHash(): Promise<string> {
		const res = await secureFetch(`/api/pms/policies/${data.draft.id}`);
		if (!res.ok) throw new Error('Failed to fetch policy for hash computation');
		const json = await res.json();
		const { sections: s, conditionalOverrides } = json.data;
		const payload = JSON.stringify({ sections: s, overrides: conditionalOverrides });
		const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
		return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	async function sendOtp(): Promise<{ ok: boolean; error?: string }> {
		try {
			const draftHash = await computeDraftHash();
			const res = await secureFetch('/api/pms/otp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bankEmail: data.officialBankEmail,
					context: { purpose: 'policy_change', lenderId: data.lenderId, policyId: data.draft.id, draftHash }
				})
			});
			const json = await res.json();
			if (!res.ok) return { ok: false, error: json.error };
			return { ok: true };
		} catch {
			return { ok: false, error: 'Network error.' };
		}
	}

	async function verifyAndSubmit(otp: string): Promise<{ ok: boolean; error?: string }> {
		isSubmitting = true;
		try {
			const draftHash = await computeDraftHash();
			const verifyRes = await secureFetch('/api/pms/otp/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bankEmail: data.officialBankEmail,
					otp,
					context: { purpose: 'policy_change', lenderId: data.lenderId, policyId: data.draft.id, draftHash }
				})
			});
			const verifyJson = await verifyRes.json();
			if (!verifyRes.ok) return { ok: false, error: verifyJson.error ?? 'Invalid OTP.' };

			const token = verifyJson.data.pmsOtpToken;
			const submitRes = await secureFetch(`/api/pms/policies/${data.draft.id}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-pms-otp-token': token },
				body: JSON.stringify({ lockVersion })
			});
			const submitJson = await submitRes.json();
			if (!submitRes.ok) return { ok: false, error: submitJson.error ?? 'Submission failed.' };

			// Success — redirect back to detail page which will now show "submitted" status
			await goto(`/dashboard/rm/policies/${data.lenderId}/${encodeURIComponent(data.loanProduct)}`);
			return { ok: true };
		} catch {
			return { ok: false, error: 'Network error.' };
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Edit Policy — {data.lenderName} {data.loanProduct} — DigitalDSA RM</title>
</svelte:head>

<div class="flex min-h-screen bg-gray-50">
	<!-- ── Sidebar: section list + unsaved counter ──────────────────────────── -->
	<aside class="w-60 shrink-0 border-r border-gray-200 bg-white p-5">
		<a
			href="/dashboard/rm/policies/{data.lenderId}/{encodeURIComponent(data.loanProduct)}"
			class="mb-6 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
		>
			<ArrowLeft size={13} />
			Back to policy
		</a>

		<p class="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Edit Policy</p>
		<p class="mb-4 truncate text-xs font-medium text-gray-600">{data.lenderName}</p>

		{#if data.publishedSnapshot}
			<p class="mb-5 text-[10px] text-gray-400">
				Editing revision of <span class="font-semibold">v{data.publishedSnapshot.version}</span>
				(live since {new Date(data.publishedSnapshot.publishedAt ?? '').toLocaleDateString()})
			</p>
		{/if}

		<nav class="space-y-0.5">
			{#each sectionList as section (section.id)}
				{@const changed = isSectionChanged(section.id)}
				<button
					type="button"
					onclick={() => toggleSection(section.id)}
					class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors
					{expandedSections[section.id] ? 'bg-amber-50 font-semibold text-amber-700' : 'text-gray-600 hover:bg-gray-50'}"
				>
					<span>{section.label}</span>
					{#if changed}
						<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Edited"></span>
					{/if}
				</button>
			{/each}
		</nav>

		<!-- Unsaved-changes counter (live diff vs loaded state) -->
		{#if isDirty}
			<div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
				<p class="font-semibold">
					{changedSectionCount} section{changedSectionCount === 1 ? '' : 's'} edited
				</p>
				<p class="mt-0.5 text-[11px] text-amber-600">Unsaved — click Save to draft</p>
			</div>
		{/if}

		<!-- Persisted pending changes from prior saves -->
		{#if persistedChangeCount > 0}
			<div class="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
				<p class="font-semibold">
					{persistedChangeCount} saved change{persistedChangeCount === 1 ? '' : 's'}
				</p>
				<p class="mt-0.5 text-[11px] text-blue-600">Ready to submit for approval</p>
			</div>
		{/if}
	</aside>

	<!-- ── Main area ────────────────────────────────────────────────────────── -->
	<main class="flex-1 overflow-y-auto p-8">
		<div class="mx-auto max-w-3xl space-y-4">
			<div>
				<h1 class="text-xl font-bold text-gray-900">Edit Policy</h1>
				<p class="mt-1 text-sm text-gray-500">
					{data.lenderName} — {data.loanProduct}. Every change is audit-logged.
					Drafts stay private until you submit for admin approval.
				</p>
			</div>

			{#if saveError}
				<div class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-[var(--color-error)]">
					<AlertTriangle size={14} class="mt-0.5 shrink-0" />
					<span class="flex-1">{saveError}</span>
					<button type="button" onclick={() => (saveError = '')} class="shrink-0 text-red-400 hover:text-red-600" aria-label="Dismiss">×</button>
				</div>
			{/if}

			{#if saveSuccess}
				<div class="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
					<CheckCircle size={14} class="shrink-0" />
					{saveSuccess}
				</div>
			{/if}

			{#if submitError}
				<div class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-[var(--color-error)]">
					<AlertTriangle size={14} class="mt-0.5 shrink-0" />
					<span class="flex-1">{submitError}</span>
					<button type="button" onclick={() => (submitError = '')} class="shrink-0 text-red-400 hover:text-red-600" aria-label="Dismiss">×</button>
				</div>
			{/if}

			<!-- Section panels (collapsible) -->
			{#each sectionList as section (section.id)}
				{@const expanded = expandedSections[section.id]}
				{@const changed = isSectionChanged(section.id)}
				<div class="overflow-hidden rounded-xl border {changed ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'}">
					<button
						type="button"
						onclick={() => toggleSection(section.id)}
						class="flex w-full items-center justify-between gap-2 px-5 py-3 text-left transition-colors hover:bg-gray-50"
					>
						<div class="flex items-center gap-2">
							{#if expanded}<ChevronDown size={16} class="text-gray-400" />{:else}<ChevronRight size={16} class="text-gray-400" />{/if}
							<span class="text-sm font-semibold text-gray-800">{section.label}</span>
							{#if changed}
								<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Edited</span>
							{/if}
						</div>
					</button>
					{#if expanded}
						<div class="border-t border-gray-100 bg-white px-5 py-4">
							{#if section.id === 'eligibility'}
								<EligibilityForm bind:value={sections.eligibility} />
							{:else if section.id === 'income'}
								<IncomeForm bind:value={sections.income} />
							{:else if section.id === 'foir'}
								<FoirForm bind:value={sections.foir} />
							{:else if section.id === 'ltv'}
								<LtvForm bind:value={sections.ltv} />
							{:else if section.id === 'obligations'}
								<ObligationsForm bind:value={sections.obligations} />
							{:else if section.id === 'tenure'}
								<TenureForm bind:value={sections.tenure} />
							{:else if section.id === 'roi'}
								<RoiForm bind:value={sections.roi} />
							{:else if section.id === 'geo'}
								<GeoForm bind:value={sections.geo} />
							{:else if section.id === 'fees'}
								<FeesForm bind:value={sections.fees} />
							{/if}
						</div>
					{/if}
				</div>
			{/each}

			<!-- Action bar -->
			<div class="sticky bottom-0 -mx-8 mt-8 border-t border-gray-200 bg-white px-8 py-4">
				<div class="mx-auto flex max-w-3xl items-center justify-between gap-4">
					<p class="text-xs text-gray-500">
						Draft · lockVersion {lockVersion} · {persistedChangeCount} persisted change{persistedChangeCount === 1 ? '' : 's'}
					</p>
					<div class="flex gap-3">
						<button
							type="button"
							onclick={saveDraft}
							disabled={!isDirty || isSaving}
							class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
						>
							{#if isSaving}
								<span class="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></span>
								Saving…
							{:else}
								<Save size={14} /> Save to draft
							{/if}
						</button>
						<button
							type="button"
							onclick={openSubmitModal}
							disabled={isDirty || persistedChangeCount === 0 || isSubmitting}
							class="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
						>
							<Send size={14} /> Submit for Approval
						</button>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>

<OtpSubmitModal
	bankEmail={data.officialBankEmail}
	bind:isOpen={otpModalOpen}
	onSendOtp={sendOtp}
	onVerifyAndSubmit={verifyAndSubmit}
/>
