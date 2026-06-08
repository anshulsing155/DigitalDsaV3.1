<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';

	interface TemplateVariable {
		name: string;
		description: string;
		required: boolean;
	}

	interface Template {
		template_id: string;
		name: string;
		category: string;
		channel: string;
		subject: string;
		body: string;
		variables: TemplateVariable[];
		trigger_stage: string | null;
	}

	interface RecentCase {
		case_id: string;
		label: string;
		loan_type: string;
		stage: string;
	}

	interface DsaProfile {
		name: string;
		firmName?: string;
		phone?: string;
	}

	interface Props {
		template: Template;
		recentCases: RecentCase[];
		dsaProfile: DsaProfile | null;
	}

	let { template, recentCases, dsaProfile }: Props = $props();

	// ── Mutable state ─────────────────────────────────────────────
	let selectedCaseId = $state('');
	let variables: Record<string, string> = $state({});
	let isLoading = $state(false);
	let copySuccess = $state('');
	let autoFillError = $state('');

	// ── Initialize variables when template changes ────────────────
	$effect(() => {
		const initial: Record<string, string> = {};
		for (const v of template.variables) {
			initial[v.name] = '';
		}
		// Pre-fill DSA profile variables
		if (dsaProfile) {
			if ('dsa_name' in initial) initial.dsa_name = dsaProfile.name;
			if ('dsa_firm' in initial) initial.dsa_firm = dsaProfile.firmName || '';
			if ('dsa_phone' in initial) initial.dsa_phone = dsaProfile.phone || '';
		}
		variables = initial;
		selectedCaseId = '';
		copySuccess = '';
		autoFillError = '';
	});

	// ── Derived: rendered message (client-side live preview) ──────
	const renderedBody = $derived.by(() => {
		let text = template.body;
		text = text.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string) => {
			if (variables[varName] !== undefined && variables[varName] !== '') {
				return variables[varName];
			}
			return `{{${varName}}}`;
		});
		return text;
	});

	const renderedSubject = $derived.by(() => {
		let text = template.subject;
		text = text.replace(/\{\{(\w+)\}\}/g, (_match: string, varName: string) => {
			if (variables[varName] !== undefined && variables[varName] !== '') {
				return variables[varName];
			}
			return `{{${varName}}}`;
		});
		return text;
	});

	// ── Derived: missing required variables ───────────────────────
	const missingVars = $derived(
		template.variables
			.filter((v) => v.required && (!variables[v.name] || variables[v.name].trim() === ''))
			.map((v) => v.name)
	);

	const hasMissingVars = $derived(missingVars.length > 0);

	// ── Derived: WhatsApp URL ─────────────────────────────────────
	const whatsAppPhone = $derived(
		variables.phone || variables.customer_phone || variables.dsa_phone || ''
	);

	const whatsAppUrl = $derived.by(() => {
		let phone = whatsAppPhone.replace(/[\s\-\+\(\)]/g, '');
		if (!phone.startsWith('91') && phone.length === 10) {
			phone = '91' + phone;
		}
		const encoded = encodeURIComponent(renderedBody);
		if (phone) {
			return `https://wa.me/${phone}?text=${encoded}`;
		}
		return `https://wa.me/?text=${encoded}`;
	});

	// ── Format variable name for display ──────────────────────────
	function formatVarLabel(name: string): string {
		return name
			.split('_')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	// ── Auto-fill from case data ──────────────────────────────────
	async function handleCaseSelect(caseId: string) {
		selectedCaseId = caseId;
		autoFillError = '';

		if (!caseId) return;

		isLoading = true;
		try {
			const res = await secureFetch('/api/communication/render-for-case', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					case_id: caseId,
					template_id: template.template_id
				})
			});

			const result = await res.json();
			if (result.success && result.data?.variables_used) {
				const newVars: Record<string, string> = { ...variables };
				for (const [key, val] of Object.entries(result.data.variables_used)) {
					if (key in newVars && typeof val === 'string' && val !== '') {
						newVars[key] = val;
					}
				}
				variables = newVars;
			} else {
				autoFillError = result.error || 'Failed to auto-fill from case data';
			}
		} catch {
			autoFillError = 'Network error while fetching case data';
		} finally {
			isLoading = false;
		}
	}

	// ── Copy to clipboard ─────────────────────────────────────────
	async function copyToClipboard(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			copySuccess = label;
			setTimeout(() => {
				copySuccess = '';
			}, 2500);
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand('copy');
			document.body.removeChild(textArea);
			copySuccess = label;
			setTimeout(() => {
				copySuccess = '';
			}, 2500);
		}
	}

	function handleCopyMessage() {
		copyToClipboard(renderedBody, 'Message copied!');
	}

	function handleCopyEmail() {
		const emailText = `Subject: ${renderedSubject}\n\n${renderedBody}`;
		copyToClipboard(emailText, 'Email content copied!');
	}

	function handleShareWhatsApp() {
		if (browser) window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
	}

	// ── Variable input handler ────────────────────────────────────
	function updateVariable(name: string, value: string) {
		variables = { ...variables, [name]: value };
	}
</script>

<div
	class="composer-wrap rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm"
>
	<!-- ── Header ──────────────────────────────────────────────────── -->
	<div class="border-b border-[var(--dash-border-light)] px-4 py-4 md:px-6">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-base font-bold text-[var(--dash-text)]">
					{template.name}
				</h2>
				<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
					{template.channel === 'whatsapp'
						? 'WhatsApp'
						: template.channel === 'email'
							? 'Email'
							: 'SMS'} template
					{#if template.trigger_stage}
						&middot; Stage: <span class="font-medium">{template.trigger_stage}</span>
					{/if}
				</p>
			</div>
			<span
				class="shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-semibold
				{template.channel === 'whatsapp'
					? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
					: template.channel === 'email'
						? 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'
						: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
			>
				{template.channel === 'whatsapp'
					? 'WhatsApp'
					: template.channel === 'email'
						? 'Email'
						: 'SMS'}
			</span>
		</div>
	</div>

	<div class="grid gap-0 lg:grid-cols-2">
		<!-- ── Left: Inputs ────────────────────────────────────────── -->
		<div class="border-b border-[var(--dash-border-light)] p-4 md:p-6 lg:border-r lg:border-b-0">
			<!-- Case picker -->
			{#if recentCases.length > 0}
				<div class="mb-5">
					<label
						for="case-picker"
						class="mb-1.5 block text-xs font-semibold text-[var(--dash-text-secondary)]"
					>
						Link to a Case
					</label>
					<div class="relative">
						<select
							id="case-picker"
							value={selectedCaseId}
							onchange={(e) => handleCaseSelect(e.currentTarget.value)}
							disabled={isLoading}
							class="w-full appearance-none rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2.5 pr-8 text-sm text-[var(--dash-text-secondary)] transition-colors focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none disabled:opacity-60"
						>
							<option value="">-- Select a case to auto-fill --</option>
							{#each recentCases as c}
								<option value={c.case_id}>
									{c.label} ({c.loan_type}) - {c.stage}
								</option>
							{/each}
						</select>
						<svg
							class="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19.5 8.25l-7.5 7.5-7.5-7.5"
							/>
						</svg>
					</div>
					{#if isLoading}
						<p class="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--ddsa-accent-500)]">
							<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							Auto-filling from case data...
						</p>
					{/if}
					{#if autoFillError}
						<p class="mt-1.5 text-xs text-[var(--dash-accent-text)]">{autoFillError}</p>
					{/if}
				</div>
			{/if}

			<!-- Variable inputs -->
			<div class="space-y-3">
				<h3
					class="text-xs font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
				>
					Template Variables
				</h3>
				{#each template.variables as variable}
					<div>
						<label
							for="var-{variable.name}"
							class="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-secondary)]"
						>
							{formatVarLabel(variable.name)}
							{#if variable.required}
								<span class="text-[var(--dash-contrast-text)]">*</span>
							{/if}
						</label>
						{#if variable.name === 'pending_docs' || variable.name === 'received_docs' || variable.name === 'query_details' || variable.name === 'response' || variable.name === 'update_text' || variable.name === 'next_steps'}
							<textarea
								id="var-{variable.name}"
								value={variables[variable.name] || ''}
								oninput={(e) => updateVariable(variable.name, e.currentTarget.value)}
								placeholder={variable.description}
								rows={3}
								class="w-full resize-none rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] transition-colors placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
							></textarea>
						{:else}
							<input
								id="var-{variable.name}"
								type="text"
								value={variables[variable.name] || ''}
								oninput={(e) => updateVariable(variable.name, e.currentTarget.value)}
								placeholder={variable.description}
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] transition-colors placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
							/>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Missing vars warning -->
			{#if hasMissingVars}
				<div
					class="mt-4 flex items-start gap-2.5 rounded-lg border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] px-3 py-2.5"
				>
					<svg
						class="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-contrast-text)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
					<div>
						<p class="text-xs font-semibold text-[var(--dash-contrast-text)]">
							Missing required fields
						</p>
						<p class="mt-0.5 text-[13px] text-[var(--dash-contrast-text)]">
							{missingVars.map((v) => formatVarLabel(v)).join(', ')}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- ── Right: Preview + Actions ────────────────────────────── -->
		<div class="flex flex-col p-4 md:p-6">
			<!-- Preview label -->
			<h3
				class="mb-2 text-xs font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
			>
				Live Preview
			</h3>

			<!-- Subject line preview -->
			{#if renderedSubject}
				<div class="mb-2 rounded-lg bg-[var(--dash-bg-alt)] px-3 py-2">
					<p class="text-[13px] font-medium tracking-wider text-[var(--dash-text-muted)] uppercase">
						Subject
					</p>
					<p class="mt-0.5 text-sm font-medium text-[var(--dash-text)]">
						{renderedSubject}
					</p>
				</div>
			{/if}

			<!-- Body preview -->
			<div
				class="mb-4 flex-1 overflow-auto rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-4 py-3"
				style="max-height: 320px;"
			>
				<pre
					class="font-sans text-sm leading-relaxed whitespace-pre-wrap text-[var(--dash-text-secondary)]">{renderedBody}</pre>
			</div>

			<!-- Action buttons -->
			<div class="space-y-2">
				<!-- WhatsApp button -->
				<button
					type="button"
					onclick={handleShareWhatsApp}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--dash-btn-text)] shadow-sm transition-all hover:bg-[var(--ddsa-primary-600)] hover:shadow-md active:scale-[0.98]"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
						/>
					</svg>
					Share via WhatsApp
				</button>

				<!-- Copy buttons row -->
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						onclick={handleCopyMessage}
						class="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] shadow-sm transition-all hover:border-[var(--ddsa-accent-500)]/30 hover:bg-[var(--dash-hover)] active:scale-[0.98]"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
							/>
						</svg>
						Copy Message
					</button>
					<button
						type="button"
						onclick={handleCopyEmail}
						class="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] shadow-sm transition-all hover:border-[var(--ddsa-primary-300)] hover:bg-[var(--dash-btn-ghost-bg)] active:scale-[0.98]"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
							/>
						</svg>
						Copy for Email
					</button>
				</div>
			</div>

			<!-- Copy success flash -->
			{#if copySuccess}
				<div
					class="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-2 text-sm font-medium text-[var(--dash-accent-text)] transition-all"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{copySuccess}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	@media (max-width: 768px) {
		.composer-wrap :global(.grid.lg\:grid-cols-2) {
			grid-template-columns: 1fr;
		}
	}
</style>
