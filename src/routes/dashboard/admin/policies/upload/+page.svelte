<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf.js';

	let lenderName = $state('');
	let lenderId = $state('');
	let classification = $state<'PVT' | 'GOV' | 'NBFC' | 'HFC' | 'SFB'>('PVT');
	let loanTypes = $state<string[]>([]);
	let parsedBy = $state('');
	let files = $state<File[]>([]);
	let uploading = $state(false);
	let error = $state('');

	const availableLoanTypes = [
		'Home Loan',
		'Home Loan BT',
		'Home Loan Top-Up',
		'Loan Against Property',
		'LAP BT',
		'Personal Loan'
	];

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			files = [...input.files];
		}
	}

	function toggleLoanType(lt: string) {
		if (loanTypes.includes(lt)) {
			loanTypes = loanTypes.filter((t) => t !== lt);
		} else {
			loanTypes = [...loanTypes, lt];
		}
	}

	async function handleSubmit() {
		error = '';

		if (!lenderName.trim()) {
			error = 'Lender name is required';
			return;
		}
		if (!lenderId.trim()) {
			error = 'Lender ID is required';
			return;
		}
		if (loanTypes.length === 0) {
			error = 'Select at least one loan type';
			return;
		}
		if (files.length === 0) {
			error = 'Upload at least one file';
			return;
		}
		if (!parsedBy.trim()) {
			error = 'Parsed by (team member name) is required';
			return;
		}

		// Validate file types and sizes
		for (const file of files) {
			const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
			if (!validTypes.includes(file.type)) {
				error = `Invalid file type: ${file.name}. Only PDF, JPEG, PNG, WebP allowed.`;
				return;
			}
			if (file.size > 10 * 1024 * 1024) {
				error = `File too large: ${file.name}. Max 10MB per file.`;
				return;
			}
		}

		uploading = true;

		try {
			const formData = new FormData();
			formData.append('lenderName', lenderName.trim());
			formData.append('lenderId', lenderId.trim());
			formData.append('classification', classification);
			formData.append('loanTypes', JSON.stringify(loanTypes));
			formData.append('parsedBy', parsedBy.trim());

			for (const file of files) {
				formData.append('files', file);
			}

			const res = await secureFetch('/api/admin/policies/upload', {
				method: 'POST',
				body: formData
			});

			const result = await res.json();
			if (result.success) {
				goto(`/dashboard/admin/policies/${result.data.artifact_id}`);
			} else {
				error = result.error || 'Upload failed';
			}
		} catch {
			error = 'Failed to connect to server';
		} finally {
			uploading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Policy Upload | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a
			href="/dashboard/admin/policies"
			class="inline-flex items-center gap-1.5 text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Policies
		</a>
		<h1 class="mt-3 text-2xl font-bold text-[var(--dash-text)]">Upload Policy Document</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Upload raw bank policy documents for AI parsing
		</p>
	</div>

	{#if error}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
		>
			{error}
		</div>
	{/if}

	<div class="card-surface rounded-xl">
		<div class="space-y-5">
			<!-- Lender Details -->
			<div class="grid gap-4 md:grid-cols-3">
				<div>
					<label for="lenderName" class="block text-sm font-medium text-[var(--dash-text)]"
						>Lender Name</label
					>
					<input
						id="lenderName"
						type="text"
						bind:value={lenderName}
						placeholder="e.g., HDFC Bank"
						class="mt-1 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
					/>
				</div>
				<div>
					<label for="lenderId" class="block text-sm font-medium text-[var(--dash-text)]"
						>Lender ID</label
					>
					<input
						id="lenderId"
						type="text"
						bind:value={lenderId}
						placeholder="e.g., hdfc-bank"
						class="mt-1 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
					/>
				</div>
				<div>
					<label for="classification" class="block text-sm font-medium text-[var(--dash-text)]"
						>Classification</label
					>
					<select
						id="classification"
						bind:value={classification}
						class="mt-1 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
					>
						<option value="PVT">Private Bank</option>
						<option value="GOV">Government Bank</option>
						<option value="NBFC">NBFC</option>
						<option value="HFC">Housing Finance</option>
						<option value="SFB">Small Finance Bank</option>
					</select>
				</div>
			</div>

			<!-- Loan Types -->
			<div>
				<p class="block text-sm font-medium text-[var(--dash-text)]">Loan Types Covered</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each availableLoanTypes as lt}
						<button
							type="button"
							onclick={() => toggleLoanType(lt)}
							class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
								{loanTypes.includes(lt)
								? 'border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
								: 'border-[var(--dash-border)] bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
						>
							{lt}
						</button>
					{/each}
				</div>
			</div>

			<!-- Parsed By -->
			<div>
				<label for="parsedBy" class="block text-sm font-medium text-[var(--dash-text)]"
					>Parsed By (Team Member)</label
				>
				<input
					id="parsedBy"
					type="text"
					bind:value={parsedBy}
					placeholder="Your name"
					class="mt-1 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none md:max-w-sm"
				/>
			</div>

			<!-- File Upload -->
			<div>
				<label for="fileInput" class="block text-sm font-medium text-[var(--dash-text)]"
					>Policy Documents</label
				>
				<div
					class="mt-2 rounded-lg border-2 border-dashed border-[var(--dash-border)] p-6 text-center transition-colors hover:border-[var(--dash-accent-text)]"
				>
					<input
						type="file"
						multiple
						accept=".pdf,.jpg,.jpeg,.png,.webp"
						onchange={handleFileChange}
						class="hidden"
						id="fileInput"
					/>
					<label for="fileInput" class="cursor-pointer">
						<svg
							class="mx-auto h-10 w-10 text-[var(--dash-text-muted)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
							/>
						</svg>
						<p class="mt-2 text-sm text-[var(--dash-text-secondary)]">
							Click to upload PDF, JPEG, or PNG files
						</p>
						<p class="mt-1 text-xs text-[var(--dash-text-muted)]">Max 10MB per file</p>
					</label>
				</div>
				{#if files.length > 0}
					<div class="mt-3 space-y-1">
						{#each files as file}
							<div class="flex items-center gap-2 text-sm text-[var(--dash-text-secondary)]">
								<span class="text-[var(--dash-accent-text)]">*</span>
								{file.name}
								<span class="text-xs text-[var(--dash-text-muted)]"
									>({(file.size / 1024 / 1024).toFixed(1)}MB)</span
								>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Submit -->
			<div class="flex justify-end gap-3 border-t border-[var(--dash-border-light)] pt-5">
				<a
					href="/dashboard/admin/policies"
					class="rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Cancel
				</a>
				<button
					onclick={handleSubmit}
					disabled={uploading}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-6 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
				>
					{uploading ? 'Uploading...' : 'Upload & Create Artifact'}
				</button>
			</div>
		</div>
	</div>
</div>
