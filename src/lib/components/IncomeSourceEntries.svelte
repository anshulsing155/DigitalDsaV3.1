<script lang="ts">
	/**
	 * IncomeSourceEntries — Display Component
	 * ===================================================================
	 * Shows all added income source entries in two groups:
	 *   Table 1: Employment & Business Income
	 *   Table 2: Other Income Sources
	 *
	 * Desktop: Table with columns (Type, Entity, Evidence, Actions)
	 * Mobile: Card-based layout with stacked info
	 *
	 * Raw data only — no computed totals or monthly equivalents.
	 * Income aggregation is the Rule Engine's responsibility.
	 * ===================================================================
	 */

	import {
		Pencil,
		Trash2,
		getIcon,
		AlertCircle,
		Check,
		AlertTriangle,
		Info
	} from '$lib/utils/iconRegistry';
	import { deviceState } from '$lib/stores/device.svelte';
	import { PROFILE_CATEGORY_MAP } from '$lib/types/incomeProfile';
	import { getEvidenceSummary } from '$lib/config/incomeProfiles/incomeCalculations';
	import { getDropdownLabel, getProfileCard } from '$lib/config/incomeProfiles';
	import type { IncomeSourceEntry } from '$lib/types/incomeProfile';

	interface Props {
		/** All income source entries */
		entries: IncomeSourceEntry[];
		/** Callback to edit an entry */
		onEdit?: (entry: IncomeSourceEntry) => void;
		/** Callback to delete an entry */
		onDelete?: (entryId: string) => void;
		/** Whether actions (edit/delete) are disabled */
		disabled?: boolean;
	}

	let { entries, onEdit, onDelete, disabled = false }: Props = $props();

	// ── Derived: split entries by category ────────────────────────
	let employmentEntries = $derived(
		entries.filter((e) => PROFILE_CATEGORY_MAP[e.profileType] === 'employment_business')
	);
	let otherEntries = $derived(
		entries.filter((e) => PROFILE_CATEGORY_MAP[e.profileType] === 'other_income')
	);

	// ── Delete confirmation ──────────────────────────────────────
	let deletingId = $state<string | null>(null);

	/** Check if an entry is auto-created and still active (not orphaned) */
	function isAutoLocked(entry: IncomeSourceEntry): boolean {
		return !!(entry.autoCreated && !entry.orphaned);
	}

	function confirmDelete(id: string) {
		// Guard: cannot delete active auto-created entries
		const entry = entries.find((e) => e.id === id);
		if (entry && isAutoLocked(entry)) return;
		deletingId = id;
	}

	function executeDelete() {
		if (deletingId) {
			onDelete?.(deletingId);
			deletingId = null;
		}
	}

	function cancelDelete() {
		deletingId = null;
	}
</script>

{#if entries.length === 0}
	<!-- Empty State -->
	<div class="flex flex-col items-center justify-center px-4 py-10">
		<div
			class="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--form-bg-alt)]"
		>
			<Info class="h-7 w-7 text-[var(--form-text-muted)]" />
		</div>
		<p class="alertText text-center text-[var(--form-text-muted)]">
			No income sources added yet.<br />
			<span class="text-[var(--form-text-muted)]">Use the form above to add income entries.</span>
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-8">
		<!-- ======================================================= -->
		<!-- TABLE 1: Employment & Business Income                     -->
		<!-- ======================================================= -->
		{#if employmentEntries.length > 0}
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<div class="bg-ddsa-gradient-primary h-1 w-5 rounded-full"></div>
					<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
						Employment & Business Income
					</span>
					<span class="tinyText ml-auto text-[var(--form-text-muted)]">
						{employmentEntries.length}
						{employmentEntries.length === 1 ? 'entry' : 'entries'}
					</span>
				</div>

				{#if deviceState.isMobile}
					<!-- Mobile: Card Layout -->
					<div class="flex flex-col gap-3">
						{#each employmentEntries as entry, idx (entry.id)}
							{@const evidence = getEvidenceSummary(entry)}
							{@const profileCard = getProfileCard(entry.profileType)}
							{@const ProfileIcon = profileCard?.icon ? getIcon(profileCard.icon) : null}

							<div
								class="rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4 shadow-sm
								{deletingId === entry.id ? 'border-red-300 bg-red-50/30' : ''}"
							>
								<!-- Header Row -->
								<div class="mb-3 flex items-start justify-between">
									<div class="flex items-center gap-2.5">
										{#if ProfileIcon}
											<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
												<ProfileIcon class="h-4 w-4 text-[var(--form-text-secondary)]" />
											</div>
										{/if}
										<div>
											<p class="buttonText font-titleMedium text-[var(--form-text-secondary)]">
												{entry.entityName || '—'}
											</p>
											<p class="tinyText text-[var(--form-text-muted)]">
												{getDropdownLabel(entry.profileType)}
											</p>
										</div>
									</div>

									<!-- Actions -->
									{#if !disabled}
										<div class="flex items-center gap-1.5">
											<button
												type="button"
												class="cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]"
												onclick={() => onEdit?.(entry)}
												aria-label="Edit entry"
											>
												<Pencil class="h-4 w-4" />
											</button>
											<button
												type="button"
												class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-500"
												onclick={() => confirmDelete(entry.id)}
												aria-label="Delete entry"
											>
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									{/if}
								</div>

								<!-- Evidence -->
								<div class="tinyText">
									<span class="text-[var(--form-text-muted)]">Evidence: </span>
									<span class="font-titleMedium {evidence.color}">{evidence.label}</span>
								</div>

								<!-- Delete Confirmation -->
								{#if deletingId === entry.id}
									<div class="mt-3 flex items-center justify-between border-t border-red-200 pt-3">
										<span class="tinyText text-red-600">Delete this entry?</span>
										<div class="flex gap-2">
											<button
												type="button"
												class="tinyText cursor-pointer rounded-lg bg-red-500 px-2.5 py-1 text-white transition-colors hover:bg-red-600"
												onclick={executeDelete}
											>
												Yes, Delete
											</button>
											<button
												type="button"
												class="tinyText cursor-pointer rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-2.5 py-1 text-[var(--form-text-secondary)] transition-colors hover:border-[var(--form-border-hover)]"
												onclick={cancelDelete}
											>
												Cancel
											</button>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<!-- Desktop: Table Layout -->
					<div
						class="mb-3 overflow-x-auto rounded-xl border border-[var(--ddsa-primary-500)]/20 bg-[var(--ddsa-primary-50)] shadow-sm"
					>
						<table class="w-full">
							<thead class="bg-[var(--ddsa-primary-500)] whitespace-nowrap">
								<tr>
									<th
										class="font-titleMedium smallText w-12 px-3 py-2.5 text-left text-white uppercase"
										>#</th
									>
									<th
										class="font-titleMedium smallText flex-1 px-3 py-2.5 text-left text-white uppercase"
										>Type</th
									>
									<th
										class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase"
										>Entity / Source</th
									>
									<th
										class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase"
										>Evidence</th
									>
									<th
										class="font-titleMedium smallText w-20 px-3 py-2.5 text-center text-white uppercase"
										>Actions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--form-border)]">
								{#each employmentEntries as entry, idx (entry.id)}
									{@const evidence = getEvidenceSummary(entry)}
									{@const profileCard = getProfileCard(entry.profileType)}
									{@const ProfileIcon = profileCard?.icon ? getIcon(profileCard.icon) : null}

									<tr
										class="border-t border-[var(--ddsa-primary-500)]/10 transition-colors
										{deletingId === entry.id ? 'bg-red-50' : ''}"
									>
										<td class="px-3 py-2.5 text-[var(--form-text-secondary)]">{idx + 1}</td>
										<td class="px-3 py-2.5">
											<div
												class="font-titleMedium buttonText !m-0 flex items-center gap-2 text-[var(--form-text-secondary)]"
											>
												{#if ProfileIcon}
													<ProfileIcon class="h-4 w-4" />
												{/if}
												<span class="">
													{getDropdownLabel(entry.profileType)}
												</span>
											</div>
										</td>
										<td
											class="buttonText px-3 py-2.5 text-center text-[var(--form-text-secondary)]"
										>
											<div class="">
												{entry.entityName || '—'}
											</div>
											{#if entry.autoCreated && !entry.orphaned}
												<div
													class="tinyText mt-0.5 flex items-center justify-center gap-1 px-3 text-center text-violet-600 dark:text-violet-400"
												>
													<Info class="h-3 w-3" />
													Auto-created from company
												</div>
											{:else if entry.orphaned}
												<div
													class="tinyText mt-0.5 flex items-center justify-center gap-1 px-3 text-center text-amber-600 dark:text-amber-400"
												>
													<AlertTriangle class="h-3 w-3" />
													Company removed — {entry.orphanedCompanyName || 'unknown'}
												</div>
											{/if}
										</td>
										<td
											class="buttonText px-3 py-2.5 text-center text-[var(--form-text-secondary)]"
										>
											<span
												class="tinyText font-titleMedium inline-flex items-center gap-1 {evidence.color}"
											>
												{#if evidence.icon === 'CheckCircle2'}
													<Check class="h-3.5 w-3.5" />
												{:else if evidence.icon === 'AlertCircle'}
													<AlertCircle class="h-3.5 w-3.5" />
												{:else}
													<AlertTriangle class="h-3.5 w-3.5" />
												{/if}
												{evidence.label}
											</span>
										</td>
										<td class="px-4 py-3 text-center">
											{#if deletingId === entry.id}
												<div class="flex items-center justify-center gap-2">
													<button
														type="button"
														class="tinyText cursor-pointer rounded-lg bg-red-500 px-2.5 py-1 text-white transition-colors hover:bg-red-600"
														onclick={executeDelete}
													>
														Delete
													</button>
													<button
														type="button"
														class="tinyText cursor-pointer rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-2.5 py-1 text-[var(--form-text-secondary)] transition-colors hover:border-[var(--form-border-hover)]"
														onclick={cancelDelete}
													>
														Cancel
													</button>
												</div>
											{:else if !disabled}
												<div class="flex items-center justify-center gap-1">
													<button
														type="button"
														class="cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]"
														onclick={() => onEdit?.(entry)}
														title="Edit"
													>
														<Pencil class="h-4 w-4" />
													</button>
													<button
														type="button"
														class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-500"
														onclick={() => confirmDelete(entry.id)}
														title="Delete"
													>
														<Trash2 class="h-4 w-4" />
													</button>
												</div>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ======================================================= -->
		<!-- TABLE 2: Other Income Sources                             -->
		<!-- ======================================================= -->
		{#if otherEntries.length > 0}
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<div class="h-1 w-5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400"></div>
					<span class="tinyText font-titleBold text-[var(--form-text-label)] uppercase">
						Other Income Sources
					</span>
					<span class="tinyText ml-auto text-[var(--form-text-muted)]">
						{otherEntries.length}
						{otherEntries.length === 1 ? 'entry' : 'entries'}
					</span>
				</div>

				{#if deviceState.isMobile}
					<!-- Mobile: Card Layout -->
					<div class="flex flex-col gap-3">
						{#each otherEntries as entry, idx (entry.id)}
							{@const evidence = getEvidenceSummary(entry)}
							{@const profileCard = getProfileCard(entry.profileType)}
							{@const ProfileIcon = profileCard?.icon ? getIcon(profileCard.icon) : null}

							<div
								class="rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-4 shadow-sm
								{deletingId === entry.id ? 'border-red-300 bg-red-50/30' : ''}"
							>
								<div class="mb-3 flex items-start justify-between">
									<div class="flex items-center gap-2.5">
										{#if ProfileIcon}
											<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
												<ProfileIcon class="h-4 w-4 text-[var(--form-text-secondary)]" />
											</div>
										{/if}
										<div>
											<p class="buttonText font-titleMedium text-[var(--form-text-secondary)]">
												{entry.entityName || '—'}
											</p>
											<p class="tinyText text-[var(--form-text-muted)]">
												{getDropdownLabel(entry.profileType)}
											</p>
										</div>
									</div>

									{#if !disabled}
										<div class="flex items-center gap-1.5">
											<button
												type="button"
												class="cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]"
												onclick={() => onEdit?.(entry)}
												aria-label="Edit entry"
											>
												<Pencil class="h-4 w-4" />
											</button>
											<button
												type="button"
												class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-500"
												onclick={() => confirmDelete(entry.id)}
												aria-label="Delete entry"
											>
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									{/if}
								</div>

								<!-- Evidence -->
								<div class="tinyText">
									<span class="text-[var(--form-text-muted)]">Evidence: </span>
									<span class="font-titleMedium {evidence.color}">{evidence.label}</span>
								</div>

								{#if deletingId === entry.id}
									<div class="mt-3 flex items-center justify-between border-t border-red-200 pt-3">
										<span class="tinyText text-red-600">Delete this entry?</span>
										<div class="flex gap-2">
											<button
												type="button"
												class="tinyText cursor-pointer rounded-lg bg-red-500 px-2.5 py-1 text-white transition-colors hover:bg-red-600"
												onclick={executeDelete}
											>
												Yes, Delete
											</button>
											<button
												type="button"
												class="tinyText cursor-pointer rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-2.5 py-1 text-[var(--form-text-secondary)] transition-colors hover:border-[var(--form-border-hover)]"
												onclick={cancelDelete}
											>
												Cancel
											</button>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<!-- Desktop: Table Layout -->
					<div
						class="mb-3 overflow-x-auto rounded-xl border border-[var(--ddsa-primary-500)]/20 bg-[var(--ddsa-primary-50)] shadow-sm"
					>
						<table class="w-full">
							<thead class="bg-[var(--ddsa-primary-500)] whitespace-nowrap">
								<tr>
									<th
										class="font-titleMedium smallText w-12 px-3 py-2.5 text-left text-white uppercase"
										>#</th
									>
									<th
										class="font-titleMedium smallText flex-1 px-3 py-2.5 text-left text-white uppercase"
										>Type</th
									>
									<th
										class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase"
										>Source</th
									>
									<th
										class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase"
										>Evidence</th
									>
									<th
										class="font-titleMedium smallText w-20 px-3 py-2.5 text-center text-white uppercase"
										>Actions</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--form-border)]">
								{#each otherEntries as entry, idx (entry.id)}
									{@const evidence = getEvidenceSummary(entry)}
									{@const profileCard = getProfileCard(entry.profileType)}
									{@const ProfileIcon = profileCard?.icon ? getIcon(profileCard.icon) : null}

									<tr
										class="border-t border-[var(--ddsa-primary-500)]/10 transition-colors
										{deletingId === entry.id ? 'bg-red-50' : ''}"
									>
										<td class="px-3 py-2.5 text-[var(--form-text-secondary)]">{idx + 1}</td>
										<td class="px-3 py-2.5">
											<div
												class="font-titleMedium buttonText !m-0 flex items-center gap-2 text-[var(--form-text-secondary)]"
											>
												{#if ProfileIcon}
													<ProfileIcon class="h-4 w-4" />
												{/if}
												<span class="">
													{getDropdownLabel(entry.profileType)}
												</span>
											</div>
										</td>
										<td
											class="buttonText px-3 py-2.5 text-center text-[var(--form-text-secondary)]"
										>
											<div class="">
												{entry.entityName || '—'}
											</div>
											{#if entry.autoCreated && !entry.orphaned}
												<div
													class="tinyText mt-0.5 flex items-center justify-center gap-1 px-3 text-center text-violet-600 dark:text-violet-400"
												>
													<Info class="h-3 w-3" />
													Auto-created from company
												</div>
											{:else if entry.orphaned}
												<div
													class="tinyText mt-0.5 flex items-center justify-center gap-1 px-3 text-center text-amber-600 dark:text-amber-400"
												>
													<AlertTriangle class="h-3 w-3" />
													Company removed — {entry.orphanedCompanyName || 'unknown'}
												</div>
											{/if}
										</td>
										<td class="buttonText px-3 py-2.5 text-center text-[var(--form-text-secondary)]">
											<span
												class="tinyText font-titleMedium inline-flex items-center gap-1 {evidence.color}"
											>
												{#if evidence.icon === 'CheckCircle2'}
													<Check class="h-3.5 w-3.5" />
												{:else if evidence.icon === 'AlertCircle'}
													<AlertCircle class="h-3.5 w-3.5" />
												{:else}
													<AlertTriangle class="h-3.5 w-3.5" />
												{/if}
												{evidence.label}
											</span>
										</td>
										<td class="px-4 py-3 text-center">
											{#if deletingId === entry.id}
												<div class="flex items-center justify-center gap-2">
													<button
														type="button"
														class="tinyText cursor-pointer rounded-lg bg-red-500 px-2.5 py-1 text-white transition-colors hover:bg-red-600"
														onclick={executeDelete}
													>
														Delete
													</button>
													<button
														type="button"
														class="tinyText cursor-pointer rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-2.5 py-1 text-[var(--form-text-secondary)] transition-colors hover:border-[var(--form-border-hover)]"
														onclick={cancelDelete}
													>
														Cancel
													</button>
												</div>
											{:else if !disabled}
												<div class="flex items-center justify-center gap-1">
													<button
														type="button"
														class="cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]"
														onclick={() => onEdit?.(entry)}
														title="Edit"
													>
														<Pencil class="h-4 w-4" />
													</button>
													<button
														type="button"
														class="cursor-pointer rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-500"
														onclick={() => confirmDelete(entry.id)}
														title="Delete"
													>
														<Trash2 class="h-4 w-4" />
													</button>
												</div>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Income summary removed — aggregation is the Rule Engine's responsibility -->
	</div>
{/if}
