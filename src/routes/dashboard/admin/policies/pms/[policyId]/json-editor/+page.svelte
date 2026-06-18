<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Save, AlertTriangle, CheckCircle, FileJson } from 'lucide-svelte';
	import { secureFetch } from '$lib/utils/csrf.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Editor state ──────────────────────────────────────────────────────────

	// Local editor buffer seeded from the loaded JSON. User mutates it freely;
	// re-mounted on navigation so prop changes don't need to propagate.
	// svelte-ignore state_referenced_locally
	let currentJson = $state(data.sectionsJson);
	let isSaving = $state(false);
	let saveError = $state('');

	// ── Live validation ───────────────────────────────────────────────────────

	type ValidationState =
		| { ok: true; parsed: Record<string, unknown>; changedKeys: string[] }
		| { ok: false; error: string };

	// Parse the original snapshot ONCE — `data.sectionsJson` never changes during
	// the session. Previously this lived inside the `$derived.by` below and re-parsed
	// the (potentially 10KB+) JSON on every keystroke, blocking the reactive tick.
	// svelte-ignore state_referenced_locally
	const originalSections = JSON.parse(data.sectionsJson) as Record<string, unknown>;

	// Pre-stringify each original section value so the per-keystroke diff doesn't
	// re-serialize the same nine subtrees on every reactive run.
	const originalSectionStrings: Record<string, string> = {};
	for (const key of Object.keys(originalSections)) {
		originalSectionStrings[key] = JSON.stringify(originalSections[key]);
	}

	const REQUIRED_SECTIONS = [
		'eligibility', 'income', 'foir', 'ltv',
		'obligations', 'tenure', 'roi', 'geo', 'fees'
	];

	const validation = $derived.by((): ValidationState => {
		// Step 1: Must be valid JSON
		let parsed: unknown;
		try {
			parsed = JSON.parse(currentJson);
		} catch (e) {
			const msg = e instanceof SyntaxError ? e.message : 'Invalid JSON';
			return { ok: false, error: `JSON syntax error: ${msg}` };
		}

		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return { ok: false, error: 'Top-level value must be a JSON object (the sections map).' };
		}

		const parsedSections = parsed as Record<string, unknown>;

		// Step 2: All 9 required sections must be present
		const missing = REQUIRED_SECTIONS.filter((k) => !(k in parsedSections));
		if (missing.length > 0) {
			return { ok: false, error: `Missing required sections: ${missing.join(', ')}` };
		}

		// Step 3: Detect which top-level section keys actually changed vs. original
		const changedKeys = REQUIRED_SECTIONS.filter(
			(k) => JSON.stringify(parsedSections[k]) !== originalSectionStrings[k]
		);

		return { ok: true, parsed: parsedSections, changedKeys };
	});

	// No changes means Save is pointless — guard against no-op saves
	const hasChanges = $derived(validation.ok && validation.changedKeys.length > 0);
	const canSave = $derived(hasChanges && !isSaving);

	// ── Save handler ──────────────────────────────────────────────────────────

	async function saveAsDraft() {
		if (!canSave || !validation.ok) return;

		isSaving = true;
		saveError = '';

		try {
			const res = await secureFetch(`/api/pms/policies/${data.policyId}/admin-json-edit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sections: validation.parsed,
					lockVersion: data.lockVersion
				})
			});

			const json = await res.json();

			if (!res.ok) {
				saveError = json.error ?? 'Save failed. Please try again.';
				return;
			}

			// Redirect to the new draft's review page — admin can approve immediately
			const draftId = json.data?.draftId as string;
			await goto(`/dashboard/admin/policies/pms/${draftId}`);
		} catch {
			saveError = 'Network error. Please check your connection and try again.';
		} finally {
			isSaving = false;
		}
	}

	// ── Format helpers ────────────────────────────────────────────────────────

	function formatJson() {
		try {
			currentJson = JSON.stringify(JSON.parse(currentJson), null, 2);
		} catch {
			// Already showing validation error — no-op
		}
	}
</script>

<svelte:head>
	<title>JSON Editor — {data.lenderName} {data.loanProduct} — DigitalDSA Admin</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-50">
	<!-- ── Header ────────────────────────────────────────────────────────────── -->
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3">
		<div class="mx-auto flex max-w-5xl items-center justify-between">
			<div class="flex items-center gap-3">
				<a
					href="/dashboard/admin/policies/pms/{data.policyId}"
					class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
				>
					<ArrowLeft size={13} /> Back to review
				</a>
				<span class="text-gray-300">|</span>
				<div class="flex items-center gap-2">
					<FileJson size={15} class="text-amber-600" />
					<h1 class="text-sm font-semibold text-gray-800">
						JSON Editor — {data.lenderName} · {data.loanProduct}
					</h1>
					<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
						Published v{data.lockVersion}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={formatJson}
					class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
				>
					Format JSON
				</button>
				<button
					type="button"
					onclick={saveAsDraft}
					disabled={!canSave}
					class="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Save size={13} />
					{isSaving ? 'Saving…' : 'Save as draft'}
				</button>
			</div>
		</div>
	</header>

	<div class="mx-auto w-full max-w-5xl flex-1 px-6 py-6">
		<!-- ── Admin notice ───────────────────────────────────────────────────── -->
		<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			<strong>Admin escape valve.</strong> Edits here fork the published policy into a new draft and
			submit it for your own immediate approval. Changes are logged in the audit trail.
			Zod validation runs server-side before any write.
		</div>

		<!-- ── Two-column layout: editor left, status right ─────────────────── -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<!-- Editor textarea (2/3 width) -->
			<div class="lg:col-span-2">
				<label
					for="sections-json-editor"
					class="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide"
				>
					sections JSON
				</label>
				<textarea
					id="sections-json-editor"
					bind:value={currentJson}
					spellcheck={false}
					rows={40}
					class="w-full rounded-lg border bg-gray-900 p-4 font-mono text-xs text-green-300 focus:outline-none focus:ring-2 focus:ring-amber-400
						{validation.ok ? 'border-gray-700' : 'border-red-500'}"
					style="resize: vertical; tab-size: 2;"
				></textarea>
			</div>

			<!-- Status panel (1/3 width) -->
			<div class="space-y-4">
				<!-- Validation status -->
				<div class="rounded-lg border bg-white p-4">
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Validation</p>

					{#if !validation.ok}
						<div class="flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-[var(--color-error)]">
							<AlertTriangle size={13} class="mt-0.5 shrink-0" />
							<span>{validation.error}</span>
						</div>
					{:else if !hasChanges}
						<div class="flex items-center gap-2 text-xs text-gray-400">
							<CheckCircle size={13} />
							<span>Valid JSON — no changes yet</span>
						</div>
					{:else}
						<div class="flex items-center gap-2 text-xs text-green-700">
							<CheckCircle size={13} />
							<span>Valid · {validation.changedKeys.length} section{validation.changedKeys.length !== 1 ? 's' : ''} changed</span>
						</div>
					{/if}
				</div>

				<!-- Changed sections summary -->
				{#if validation.ok && validation.changedKeys.length > 0}
					<div class="rounded-lg border bg-white p-4">
						<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
							Changed sections
						</p>
						<ul class="space-y-1">
							{#each validation.changedKeys as key (key)}
								<li class="flex items-center gap-2 text-xs">
									<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
									<span class="font-mono text-gray-700">{key}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Save error -->
				{#if saveError}
					<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-[var(--color-error)]">
						{saveError}
					</div>
				{/if}

				<!-- Section reference guide -->
				<div class="rounded-lg border bg-white p-4">
					<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
						Required sections
					</p>
					<ul class="space-y-1 text-[11px] font-mono text-gray-500">
						{#each ['eligibility', 'income', 'foir', 'ltv (nullable)', 'obligations', 'tenure', 'roi', 'geo', 'fees'] as section (section)}
							<li>· {section}</li>
						{/each}
					</ul>
					<p class="mt-3 text-[10px] text-gray-400">
						Full Zod validation runs server-side on save. Haircut fields must be 0–1 (e.g.
						0.3 = 30%). FOIR fields must be 0–1. ROI in % (e.g. 8.5).
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
