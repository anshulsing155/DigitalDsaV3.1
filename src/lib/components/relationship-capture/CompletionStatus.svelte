<script lang="ts">
	import { CircleCheck, Check, TriangleAlert, MoveRight } from '$lib/utils/iconRegistry';
	import type { Applicant, GraphStatus } from './types';

	interface Props {
		graphStatus: GraphStatus;
		applicants?: Applicant[];
	}

	let { graphStatus, applicants = [] }: Props = $props();

	// Helper to get applicant names by IDs
	function getApplicantNames(ids: string[]): string {
		let res = ids
			.map((id) => applicants.find((a) => a.id === id)?.fullName || 'Unknown')
			.join(', ');

		return res;
	}

	// Group colors
	const groupColors = [
		'bg-green-100 border-green-300 text-green-800',
		'bg-blue-100 border-blue-300 text-blue-800',
		'bg-purple-100 border-purple-300 text-purple-800',
		'bg-neutral-100 border-neutral-300 text-neutral-800',
		'bg-pink-100 border-pink-300 text-pink-800'
	];
</script>

<div class="completion-container">
	<!-- Progress Bar -->
	<div class="progress-section">
		<div class="progress-header">
			<span class="progress-label">Progress</span>
			<span class="progress-value">{graphStatus.completionPercentage}%</span>
		</div>
		<div class="progress-bar-container">
			<div class="progress-bar-fill" style="width: {graphStatus.completionPercentage}%"></div>
		</div>
	</div>

	<!-- Status Indicators -->
	<div class="status-indicators">
		{#if graphStatus.isComplete}
			<div class="success-message">
				<CircleCheck class="h-5 w-5" />
				<p class="alertText !m-0">All applicants are connected</p>
			</div>
			<div class="success-message">
				<Check class="h-5 w-5 text-primary" />
				<p class="alertText">Ready for lender validation</p>
			</div>
		{:else}
			<div class="warning-message">
				<TriangleAlert class="h-5 w-5" />
				<p class="alertText">Groups are not fully connected</p>
			</div>
		{/if}
	</div>

	<!-- Groups Display -->
	{#if graphStatus.totalGroups > 1}
		<!-- <div class="groups-section">
				<h3 class="groups-title">Groups Found:</h3>
				<div class="groups-list">
					{#each graphStatus.groups as group, index (group.id)}
						<div class="group-item {groupColors[index % groupColors.length]}">
							<span class="group-label">Group {index + 1}</span>
							<span class="group-names">{getApplicantNames(group.applicantIds)}</span>
							<span class="group-count"
								>({group.size} {group.size === 1 ? 'person' : 'people'})</span
							>
						</div>
					{/each}
				</div>
			</div> -->

		<!-- Suggestions -->
		{#if graphStatus.suggestions.length > 0}
			<div class="suggestions-section">
				<h3 class="suggestions-title">Suggested connections to complete the graph</h3>
				<div class="suggestions-list">
					{#each graphStatus.suggestions as suggestion (suggestion.fromId + suggestion.toId)}
						<div class="suggestion-item">
							<MoveRight class="h-5 w-5 text-primary" />
							<span>
								{suggestion.explanation}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
	<!-- </div> -->
</div>

<style>
	.completion-container {
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 12px;
		padding: 1.25rem;
		margin-bottom: 2rem;
		box-shadow: 0 2px 8px rgba(43, 45, 66, 0.04);
	}

	.progress-section {
		margin-bottom: 1rem;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.progress-label {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--form-text-secondary);
		letter-spacing: -0.01em;
	}

	.progress-value {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 0.875rem;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.progress-bar-container {
		width: 100%;
		height: 8px;
		background: var(--form-border);
		border-radius: 100px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-radius: 100px;
		transition: width 0.4s ease;
		box-shadow: 0 2px 8px rgba(203, 153, 126, 0.3);
	}

	.status-indicators {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.suggestions-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--form-border);
	}

	.suggestions-title {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.6875rem;
		color: var(--form-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.625rem 0;
	}

	.suggestions-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.suggestion-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.875rem;
		background: var(--form-bg-alt);
		border-radius: 8px;
		font-family: 'PoppinsRegular', sans-serif;
		font-size: 0.8125rem;
		color: var(--form-text-secondary);
	}

	@media (max-width: 540px) {
		.completion-container {
			padding: 1rem;
			border-radius: 10px;
			margin-bottom: 1.5rem;
		}

		.progress-label,
		.progress-value {
			font-size: 0.8125rem;
		}

		.progress-bar-container {
			height: 6px;
		}

		.suggestions-title {
			font-size: 0.625rem;
		}

		.suggestion-item {
			font-size: 0.75rem;
			padding: 0.5rem 0.75rem;
		}
	}
</style>
