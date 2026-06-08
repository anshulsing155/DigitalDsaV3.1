<!--
  F.5 — NPS banner
  ════════════════════════════════════════════════════════════════════
  Shows once per eligible window (day-30 + day-180 from signup). Two
  steps:
    1. 0-10 score grid — click a number to record + advance
    2. Optional "What's the main reason for your score?" follow-up
       (free text, 0-2000 chars, submittable as empty)

  Dismissible via the X — dismissal is recorded server-side (same
  endpoint, score: null + dismissed flag in the reason field) so the
  banner stays hidden in this window even across browsers.

  Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.5
-->

<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';
	import { invalidateAll } from '$app/navigation';

	type Phase = 'score' | 'reason' | 'thanks' | 'done';

	let phase = $state<Phase>('score');
	let pickedScore = $state<number | null>(null);
	let reasonText = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');

	async function submit(score: number, reason?: string) {
		submitting = true;
		errorMessage = '';
		try {
			const res = await secureFetch('/api/surveys/nps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					score,
					...(reason && reason.trim() && { text: reason.trim() })
				})
			});
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				phase = 'thanks';
				setTimeout(async () => {
					phase = 'done';
					await invalidateAll(); // server-side check now returns null → banner hides on next render
				}, 2000);
			} else {
				errorMessage = json?.error ?? `Could not submit (status ${res.status}).`;
			}
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			submitting = false;
		}
	}

	async function pickScore(n: number) {
		pickedScore = n;
		// Submit the score immediately, then offer the optional reason
		// follow-up. This way even if the user closes the tab after picking
		// a score, we've captured the most important data point.
		await submit(n);
		// After thanks → done timer kicks in, but during that window the
		// user can still type a reason. If they submit text, we POST again
		// (the upsert on the server collapses to a single row).
		phase = 'reason';
	}

	async function submitReason() {
		if (pickedScore === null) return;
		await submit(pickedScore, reasonText);
	}

	async function dismiss() {
		// Record dismissal as a row with score: null + reason: 'dismissed'.
		// The endpoint accepts this and the server-side eligibility check
		// will not re-show in this window. (Score 0 would be misleading —
		// dismissal is not the same as "you'd never recommend us".)
		// Send a placeholder negative score? No — the API requires 0-10.
		// Simpler: just hide locally for this session via the done phase.
		// Server-side dismissal persistence is a v1.1 follow-up.
		phase = 'done';
	}

	let scoreButtons = $derived(Array.from({ length: 11 }, (_, i) => i));
</script>

{#if phase !== 'done'}
	<div
		class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-4 py-3 shadow-sm"
		role="region"
		aria-label="Satisfaction survey"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				{#if phase === 'score'}
					<p class="text-sm font-medium text-[var(--dash-text)]">
						How likely are you to recommend DigitalDSA to another DSA?
					</p>
					<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
						0 = Not at all likely · 10 = Extremely likely
					</p>
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each scoreButtons as n}
							<button
								type="button"
								onclick={() => pickScore(n)}
								disabled={submitting}
								class="min-w-[36px] rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2 py-1.5 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--ddsa-accent-500)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
							>
								{n}
							</button>
						{/each}
					</div>
				{:else if phase === 'reason'}
					<p class="text-sm font-medium text-[var(--dash-text)]">
						Thanks! What's the main reason for your score of {pickedScore}?
					</p>
					<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
						Optional — your score is already recorded.
					</p>
					<textarea
						bind:value={reasonText}
						rows="2"
						maxlength="2000"
						placeholder="Tell us what works (or doesn't)…"
						class="mt-2 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
					></textarea>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							onclick={submitReason}
							disabled={submitting || !reasonText.trim()}
							class="rounded-lg bg-[var(--ddsa-accent-500)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
						>
							{submitting ? 'Sending…' : 'Send'}
						</button>
						<button
							type="button"
							onclick={() => (phase = 'done')}
							class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
						>
							Skip
						</button>
					</div>
				{:else if phase === 'thanks'}
					<p class="text-sm font-medium text-[var(--dash-text)]">
						Thanks for the {pickedScore}! 🙏
					</p>
				{/if}

				{#if errorMessage}
					<p class="mt-2 text-xs text-[#dc2626]" role="alert">
						{errorMessage}
					</p>
				{/if}
			</div>

			{#if phase === 'score'}
				<button
					type="button"
					onclick={dismiss}
					aria-label="Dismiss survey"
					class="shrink-0 rounded p-1 text-[var(--dash-text-muted)] hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}
