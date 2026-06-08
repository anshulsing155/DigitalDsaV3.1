<script lang="ts">
	import { CircleAlert, CircleCheckBig, Pencil, Trash2 } from '$lib/utils/iconRegistry';
	import {
		deriveApplicantRole,
		getRoleLabel,
		getRoleBadgeColor,
		getClassificationLabel,
		getClassificationBadgeColor,
		type ApplicantClassification
	} from '$lib/utils/applicantRoleUtils';

	export interface DirectorDisplayRow {
		id: string;
		directorIndex: number;
		name: string;
		role: string;
		isComplete: boolean;
		ownershipPercent?: string;
		/** On Property value (string 'true'/'false'/'') — for secured loan display */
		onProperty?: string;
		/** On EMI value (string 'true'/'false'/'') — for secured loan display */
		onEMI?: string;
		/** Whether this director always gets full profiling (Partnership/LLP/OPC) */
		fullProfile?: boolean;
		/** Whether this director has a linked Individual applicant (auto-added) */
		hasLinkedApplicant?: boolean;
		/** The linked Individual's applicant index (for editing profile/income) */
		linkedApplicantIndex?: number;
		/** Classification from the linked Individual applicant (6-way system) */
		applicantClassification?: string;
	}

	interface Props {
		sortedEntries: Array<{ applicant: Record<string, any>; originalIndex: number }>;
		editingIndex: number | null;
		hasRoleQuestions: boolean;
		applicantRoleErrors: (string | null)[];
		duplicateIndexes: Set<number>;
		pendingHighlightIndexes: Set<number>;
		applicantCount: number;
		onEdit: (index: number) => void;
		/** Optional: when not provided, delete button is hidden */
		onDelete?: (index: number) => void;
		getDisplayName: (applicant: Record<string, any>, index: number) => string;
		getStatus: (applicant: Record<string, any>, index: number) => string;
		/** Optional: director sub-rows keyed by company applicant id */
		directorRows?: Map<string, DirectorDisplayRow[]>;
		/** Optional: callback when editing a director sub-row */
		onEditDirector?: (companyId: string, directorIndex: number) => void;
		/** Show classification badge column even without onEMI/onProperty columns (unsecured loans) */
		showClassificationBadge?: boolean;
	}

	let {
		sortedEntries,
		editingIndex,
		hasRoleQuestions,
		applicantRoleErrors,
		duplicateIndexes,
		pendingHighlightIndexes,
		applicantCount,
		onEdit,
		onDelete,
		getDisplayName,
		getStatus,
		directorRows,
		onEditDirector,
		showClassificationBadge = false
	}: Props = $props();
</script>

{#if applicantCount > 0}
	<div class="mt-8 border-t border-dashed border-[var(--form-border)] pt-6">
		<h4 class="font-titleMedium alertText mb-3 text-[var(--form-text-label)] uppercase">
			Added Applicants ({applicantCount})
		</h4>
	</div>
	<div
		class="mb-3 overflow-x-auto rounded-xl border border-[var(--ddsa-primary-500)]/20 bg-[var(--ddsa-primary-50)] shadow-sm"
	>
		<table class="w-full">
			<thead class="bg-[var(--ddsa-primary-500)] whitespace-nowrap">
				<tr>
					<th class="font-titleMedium smallText w-12 px-3 py-2.5 text-left text-white uppercase">#</th>
					<th class="font-titleMedium smallText flex-1 px-3 py-2.5 text-left text-white uppercase"
						>Name & Details</th
					>
					{#if hasRoleQuestions}
						<th class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase"
							>On Property</th
						>
						<th class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase">On EMI</th>
						<th class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase">Role</th>
					{:else if showClassificationBadge}
						<th class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase"
							>Classification</th
						>
					{/if}
					<th class="font-titleMedium smallText px-3 py-2.5 text-center text-white uppercase">Status</th>
					<th class="font-titleMedium smallText w-20 px-3 py-2.5 text-center text-white uppercase">Actions</th
					>
				</tr>
			</thead>
			<tbody class="whitespace-nowrap">
				{#each sortedEntries as { applicant, originalIndex }, index (applicant.id)}
					{#if applicant.applicantType}
						<tr
							id="applicant-row-{applicant.id}"
							class="border-t border-[var(--ddsa-primary-500)]/10 transition-colors
							{editingIndex === originalIndex ? 'bg-[var(--ddsa-primary-500)]/20' : ''}
							{duplicateIndexes.has(originalIndex) ? '!bg-red-500/15' : ''}
							{pendingHighlightIndexes.has(originalIndex)
								? '!bg-red-50 ring-2 ring-red-400 dark:!bg-red-900/20 dark:ring-red-500/60'
								: ''}"
						>
							<td class="px-3 py-2.5 text-[var(--form-text-label)]">{index + 1}</td>
							<td class="px-3 py-2.5">
								<div class="font-titleMedium buttonText !m-0 text-[var(--form-text-secondary)]">
									{getDisplayName(applicant, originalIndex)}
								</div>
								<div class="tinyText mt-1 text-[var(--form-text-secondary)]">
									{#if applicant.applicantType === 'Individual'}
										{[
											applicant.age ? `Age ${applicant.age}` : '',
											applicant.gender || '',
											applicant.maritalStatus || ''
										]
											.filter(Boolean)
											.join(' · ')}
									{:else}
										{[applicant.companyType || '', applicant.businessCategory || '']
											.filter(Boolean)
											.join(' · ')}
									{/if}
								</div>
								{#if applicant.isPrimaryApplicant || (originalIndex === 0 && !sortedEntries.some((e) => e.applicant.isPrimaryApplicant))}
									<span
										class="tinyText font-titleMedium mt-1 inline-flex items-center rounded-md bg-[var(--ddsa-primary-100)] px-1.5 py-0.5 text-[var(--ddsa-primary-500)]"
									>
										Primary
									</span>
								{/if}
								{#if applicant.applicantSubType === 'sole_proprietor'}
									<span
										class="tinyText font-titleMedium mt-1 inline-flex items-center rounded-md bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
									>
										Sole Proprietor{applicant.businessTradeName
											? ` · ${applicant.businessTradeName}`
											: ''}
									</span>
								{/if}
							</td>

							{#if hasRoleQuestions}
								<td class="buttonText px-3 py-2.5 text-center text-[var(--form-text-secondary)]">
									{applicant.onProperty === true
										? 'Yes'
										: applicant.onProperty === false
											? 'No'
											: '-'}
								</td>
								<td class="buttonText px-3 py-2.5 text-center text-[var(--form-text-secondary)]">
									{applicant.onEMI === true ? 'Yes' : applicant.onEMI === false ? 'No' : '-'}
								</td>
								{@const classification = applicant.applicantClassification as
									| ApplicantClassification
									| undefined}
								{@const role = deriveApplicantRole(
									applicant.applicantType ?? 'Individual',
									applicant.onProperty as boolean | undefined,
									applicant.onEMI as boolean | undefined
								)}
								<td class="px-3 py-2.5 text-center">
									{#if classification}
										{@const badgeColor = getClassificationBadgeColor(classification)}
										<span
											class="tinyText font-titleMedium inline-flex items-center rounded-full px-2 py-0.5
											{badgeColor === 'green'
												? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
												: badgeColor === 'blue'
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
													: badgeColor === 'amber'
														? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
														: badgeColor === 'orange'
															? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
															: badgeColor === 'slate'
																? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
																: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}"
										>
											{getClassificationLabel(classification, applicantCount === 1)}
										</span>
									{:else if getRoleLabel(role)}
										<span
											class="tinyText font-titleMedium inline-flex items-center rounded-full px-2 py-0.5
											{getRoleBadgeColor(role) === 'green'
												? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
												: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}"
										>
											{getRoleLabel(role)}
										</span>
									{:else}
										<span class="tinyText text-[var(--form-text-muted)]">—</span>
									{/if}
									<!-- Classification is auto-derived from onEMI/onProperty + family status.
										 No manual override — system detects police/defense/govt for guarantor advisory. -->
								</td>
							{:else if showClassificationBadge}
								{@const classification = applicant.applicantClassification as
									| ApplicantClassification
									| undefined}
								<td class="px-3 py-2.5 text-center">
									{#if classification}
										{@const badgeColor = getClassificationBadgeColor(classification)}
										<span
											class="tinyText font-titleMedium inline-flex items-center rounded-full px-2 py-0.5
											{badgeColor === 'green'
												? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
												: badgeColor === 'blue'
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
													: badgeColor === 'amber'
														? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
														: badgeColor === 'orange'
															? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
															: badgeColor === 'slate'
																? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
																: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}"
										>
											{getClassificationLabel(classification, applicantCount === 1)}
										</span>
									{:else}
										<span class="tinyText text-[var(--form-text-muted)]">—</span>
									{/if}
								</td>
							{/if}

							<td class="px-3 py-2.5 text-center">
								{#if getStatus(applicant, originalIndex) === 'complete'}
									<span
										class="font-titleMedium tinyText inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700"
									>
										<CircleCheckBig size={12} /> OK
									</span>
								{:else}
									<span
										class="font-titleMedium tinyText inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700"
									>
										<CircleAlert size={12} /> Pending
									</span>
								{/if}
							</td>

							<td class="px-3 py-2.5">
								<div class="flex items-center justify-center gap-2">
									<button
										onclick={() => onEdit(originalIndex)}
										class="rounded-md p-1.5 {editingIndex === originalIndex
											? 'bg-[var(--ddsa-primary-500)]/25 text-[var(--ddsa-primary-500)]'
											: pendingHighlightIndexes.has(originalIndex)
												? 'animate-pulse bg-red-100 text-red-600 ring-2 ring-red-400 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/60'
												: 'text-[var(--form-text-muted)] hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]'} transition-colors"
										aria-label="Edit applicant"
										disabled={editingIndex === originalIndex}
									>
										<Pencil size="15" />
									</button>
									{#if onDelete}
										<button
											onclick={() => onDelete(originalIndex)}
											class="rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-red-500/20 hover:text-red-500 cursor-pointer"
											aria-label="Delete applicant"
										>
											<Trash2 size="15" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
						{#if applicantRoleErrors[originalIndex]}
							<tr class="border-0">
								<td colspan="9" class="px-3 py-1 pb-2">
									<div
										class="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2"
									>
										<CircleAlert size="14" class="mt-0.5 shrink-0 text-red-500" />
										<p class="tinyText text-red-500">
											{applicantRoleErrors[originalIndex]}
										</p>
									</div>
								</td>
							</tr>
						{/if}

						<!-- ── Director sub-rows (indented under Company) ── -->
						{#if applicant.applicantType === 'Company' && directorRows?.has(applicant.id as string)}
							{@const directors = directorRows.get(applicant.id as string) ?? []}
							{#each directors as dir, dIdx (dir.id)}
								<tr
									class="border-t border-[var(--ddsa-primary-500)]/5 bg-[var(--ddsa-primary-500)]/[0.03] transition-colors hover:bg-[var(--ddsa-primary-500)]/[0.08]"
								>
									<!-- # column: tree connector -->
									<td class="px-3 py-2 text-[var(--form-text-muted)]">
										<span class="tinyText pl-2 text-[var(--form-text-muted)]/50">└</span>
									</td>
									<!-- Name column: indented -->
									<td class="px-3 py-2 pl-7">
										<div class="flex items-center gap-2">
											<div
												class="h-6 w-0.5 shrink-0 rounded-full bg-[var(--ddsa-primary-500)]/20"
											></div>
											<div>
												<div
													class="font-titleMedium buttonText flex items-center gap-1.5 text-[var(--form-text)]"
												>
													{dir.name}
													{#if dir.hasLinkedApplicant}
														<span
															class="tinyText font-titleMedium inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
														>
															Auto-added
														</span>
													{/if}
												</div>
												<div class="tinyText mt-0.5 text-[var(--form-text-secondary)]">
													{dir.role}{dir.ownershipPercent
														? ` · ${dir.ownershipPercent}% stake`
														: ''}
												</div>
											</div>
										</div>
									</td>

									{#if hasRoleQuestions}
										<td class="buttonText px-3 py-2 text-center text-[var(--form-text-secondary)]">
											{dir.onProperty === 'true' ? 'Yes' : dir.onProperty === 'false' ? 'No' : '—'}
										</td>
										<td class="buttonText px-3 py-2 text-center text-[var(--form-text-secondary)]">
											{dir.onEMI === 'true' ? 'Yes' : dir.onEMI === 'false' ? 'No' : '—'}
										</td>
										<td class="px-3 py-2 text-center">
											{#if dir.applicantClassification}
												{@const dirBadgeColor = getClassificationBadgeColor(
													dir.applicantClassification as ApplicantClassification
												)}
												<span
													class="tinyText font-titleMedium inline-flex items-center rounded-full px-2 py-0.5
													{dirBadgeColor === 'green'
														? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
														: dirBadgeColor === 'blue'
															? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
															: dirBadgeColor === 'amber'
																? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
																: dirBadgeColor === 'orange'
																	? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
																	: dirBadgeColor === 'slate'
																		? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
																		: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}"
												>
													{getClassificationLabel(
														dir.applicantClassification as ApplicantClassification
													)}
												</span>
											{:else if dir.onProperty === 'true' || dir.onEMI === 'true'}
												<span
													class="tinyText font-titleMedium inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400"
												>
													Co-applicant
												</span>
											{:else if dir.onProperty === 'false' && dir.onEMI === 'false'}
												<span
													class="tinyText font-titleMedium inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
												>
													CIBIL only
												</span>
											{:else}
												<span
													class="tinyText font-titleMedium inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
												>
													{dir.role}
												</span>
											{/if}
										</td>
									{:else if showClassificationBadge}
										<td class="px-3 py-2 text-center">
											{#if dir.applicantClassification}
												{@const dirBadgeColor = getClassificationBadgeColor(
													dir.applicantClassification as ApplicantClassification
												)}
												<span
													class="tinyText font-titleMedium inline-flex items-center rounded-full px-2 py-0.5
													{dirBadgeColor === 'green'
														? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
														: dirBadgeColor === 'blue'
															? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
															: dirBadgeColor === 'amber'
																? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
																: dirBadgeColor === 'orange'
																	? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
																	: dirBadgeColor === 'slate'
																		? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
																		: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}"
												>
													{getClassificationLabel(
														dir.applicantClassification as ApplicantClassification
													)}
												</span>
											{:else}
												<span class="tinyText text-[var(--form-text-muted)]">—</span>
											{/if}
										</td>
									{/if}

									<!-- Status -->
									<td class="px-3 py-2 text-center">
										{#if dir.isComplete}
											<span
												class="font-titleMedium tinyText inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700"
											>
												<CircleCheckBig size={12} /> OK
											</span>
										{:else}
											<span
												class="font-titleMedium tinyText inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700"
											>
												<CircleAlert size={12} /> Pending
											</span>
										{/if}
									</td>

									<!-- Actions -->
									<td class="px-3 py-2">
										<div class="flex items-center justify-center">
											<button
												onclick={() => onEditDirector?.(applicant.id as string, dir.directorIndex)}
												class="rounded-md p-1.5 text-[var(--form-text-muted)] transition-colors hover:bg-[var(--ddsa-primary-500)]/20 hover:text-[var(--ddsa-primary-500)]"
												aria-label="Edit {dir.role}"
											>
												<Pencil size="14" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}
