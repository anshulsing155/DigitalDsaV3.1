<script lang="ts">
	/**
	 * PayloadDebugger Component
	 *
	 * A development tool to view the clean payload in real-time.
	 * Add this to your layout or any page to see what payload would be sent.
	 *
	 * Usage:
	 *   <PayloadDebugger />
	 *   <PayloadDebugger show={true} />
	 *   <PayloadDebugger position="bottom-left" />
	 */

	import {
		cleanPayloadState,
		getPayloadAsJSON,
		logCleanPayload
	} from '$lib/stores/cleanPayloadStore.svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Whether to show the debugger (can be toggled) */
		show?: boolean;
		/** Position on screen */
		position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
		/** Initially collapsed */
		collapsed?: boolean;
	}

	let { show = true, position = 'bottom-right', collapsed = true }: Props = $props();

	// svelte-ignore state_referenced_locally
	let isCollapsed = $state(collapsed);
	let activeTab = $state<'transaction' | 'applicants' | 'full'>('transaction');
	let copied = $state(false);

	const positionClasses: Record<string, string> = {
		'bottom-right': 'bottom-4 right-4',
		'bottom-left': 'bottom-4 left-4',
		'top-right': 'top-4 right-4',
		'top-left': 'top-4 left-4'
	};

	function copyToClipboard() {
		if (!browser) return;
		const json = getPayloadAsJSON(true);
		navigator.clipboard.writeText(json).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}

	function downloadJSON() {
		if (!browser) return;
		const json = getPayloadAsJSON(true);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `loan-payload-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function getDisplayData() {
		if (activeTab === 'transaction') {
			return JSON.stringify(cleanPayloadState.cleanPayload.loanTransaction, null, 2);
		}
		if (activeTab === 'applicants') {
			return JSON.stringify(cleanPayloadState.cleanPayload.allApplicantDetails, null, 2);
		}
		return getPayloadAsJSON(true);
	}
</script>

{#if show && browser}
	<div
		class="fixed {positionClasses[position]} z-[9999] font-mono text-xs"
		style="max-width: 500px; max-height: 80vh;"
	>
		{#if isCollapsed}
			<!-- Collapsed State -->
			<button
				onclick={() => (isCollapsed = false)}
				class="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg hover:bg-gray-800"
			>
				<span>📦</span>
				<span>Payload Debug</span>
				<span class="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
					{cleanPayloadState.cleanPayload.allApplicantDetails.length} applicant(s)
				</span>
			</button>
		{:else}
			<!-- Expanded State -->
			<div
				class="flex flex-col overflow-hidden rounded-lg bg-gray-900 text-white shadow-2xl"
				style="max-height: 80vh;"
			>
				<!-- Header -->
				<div class="flex items-center justify-between bg-gray-800 px-3 py-2">
					<div class="flex items-center gap-2">
						<span>📦</span>
						<span class="font-semibold">Clean Payload</span>
					</div>
					<div class="flex items-center gap-1">
						<button
							onclick={copyToClipboard}
							class="rounded px-2 py-1 hover:bg-gray-700 {copied ? 'text-green-400' : ''}"
							title="Copy JSON"
						>
							{copied ? '✓ Copied' : '📋'}
						</button>
						<button
							onclick={downloadJSON}
							class="rounded px-2 py-1 hover:bg-gray-700"
							title="Download JSON"
						>
							⬇️
						</button>
						<button
							onclick={() => logCleanPayload()}
							class="rounded px-2 py-1 hover:bg-gray-700"
							title="Log to Console"
						>
							🖥️
						</button>
						<button
							onclick={() => (isCollapsed = true)}
							class="rounded px-2 py-1 hover:bg-gray-700"
							title="Collapse"
						>
							✕
						</button>
					</div>
				</div>

				<!-- Tabs -->
				<div class="bg-gray-850 flex border-b border-gray-700">
					<button
						onclick={() => (activeTab = 'transaction')}
						class="px-3 py-1.5 {activeTab === 'transaction'
							? 'bg-gray-700 text-blue-400'
							: 'hover:bg-gray-800'}"
					>
						Loan
					</button>
					<button
						onclick={() => (activeTab = 'applicants')}
						class="px-3 py-1.5 {activeTab === 'applicants'
							? 'bg-gray-700 text-blue-400'
							: 'hover:bg-gray-800'}"
					>
						Applicants ({cleanPayloadState.cleanPayload.allApplicantDetails.length})
					</button>
					<button
						onclick={() => (activeTab = 'full')}
						class="px-3 py-1.5 {activeTab === 'full'
							? 'bg-gray-700 text-blue-400'
							: 'hover:bg-gray-800'}"
					>
						Full
					</button>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-auto p-3" style="max-height: 60vh;">
					<pre class="break-words whitespace-pre-wrap text-green-400">{getDisplayData()}</pre>
				</div>

				<!-- Footer -->
				<div class="flex justify-between bg-gray-800 px-3 py-1.5 text-[10px] text-gray-400">
					<span>Loan: {cleanPayloadState.cleanPayload.loanTransaction.loanName || 'Not set'}</span>
					<span>Type: {cleanPayloadState.cleanPayload.loanTransaction.loanType || 'Not set'}</span>
				</div>
			</div>
		{/if}
	</div>
{/if}
