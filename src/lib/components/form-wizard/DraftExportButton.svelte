<script lang="ts">
	/**
	 * DraftExportButton — Downloads current form state as JSON
	 *
	 * Floating button positioned above ResetDataButton (bottom-right).
	 * Exports the full form state snapshot which can be used for:
	 * - Offline backup / review of entered data
	 * - Sharing draft with colleagues
	 * - Re-importing via prefill in the future
	 *
	 * Draggable via pointer events — position persists in sessionStorage.
	 * Double-click resets to default position.
	 */
	import { Download } from '$lib/utils/iconRegistry';
	import { page } from '$app/stores';
	import { formState } from '$lib/state/form.svelte';

	const STORAGE_KEY = 'ddsa-draft-btn-pos';

	function getLoanName(pathname: string): string {
		const path = pathname.toLowerCase();
		if (path.includes('/home-loan')) return 'Home-Loan';
		if (path.includes('/lap')) return 'LAP';
		if (path.includes('/plot-loan')) return 'Plot-Loan';
		if (path.includes('/personal-loan')) return 'Personal-Loan';
		if (path.includes('/business-loan')) return 'Business-Loan';
		if (path.includes('/professional-loan')) return 'Professional-Loan';
		return 'Draft';
	}

	let loanName = $derived(getLoanName($page.url.pathname));

	// Only show on actual form pages (not how-can-we-help)
	let isFormPage = $derived(
		$page.url.pathname.includes('/home-loan') ||
			$page.url.pathname.includes('/lap') ||
			$page.url.pathname.includes('/plot-loan') ||
			$page.url.pathname.includes('/personal-loan') ||
			$page.url.pathname.includes('/business-loan') ||
			$page.url.pathname.includes('/professional-loan')
	);

	// ── Drag state ──────────────────────────────────────────────
	let isDragging = $state(false);
	let wasDragged = $state(false);
	let offset = $state({ x: 0, y: 0 }); // translate offset from default position
	let dragStart = { pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 };

	// Restore position from sessionStorage on mount
	$effect(() => {
		try {
			const saved = sessionStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
					offset = { x: parsed.x, y: parsed.y };
				}
			}
		} catch {
			// Ignore parse errors
		}
	});

	function savePosition() {
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(offset));
		} catch {
			// Ignore storage errors
		}
	}

	function onPointerDown(e: PointerEvent) {
		// Only left-click initiates drag
		if (e.button !== 0) return;
		isDragging = true;
		wasDragged = false;
		dragStart = {
			pointerX: e.clientX,
			pointerY: e.clientY,
			offsetX: offset.x,
			offsetY: offset.y
		};
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const dx = e.clientX - dragStart.pointerX;
		const dy = e.clientY - dragStart.pointerY;
		// Only mark as dragged if moved more than 4px (avoids accidental drag on tap)
		if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
			wasDragged = true;
		}
		offset = {
			x: dragStart.offsetX + dx,
			y: dragStart.offsetY + dy
		};
	}

	function onPointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		if (wasDragged) {
			savePosition();
		}
	}

	function onDoubleClick() {
		// Reset to default position
		offset = { x: 0, y: 0 };
		savePosition();
	}

	function exportDraft() {
		// Don't export if user just finished dragging
		if (wasDragged) return;
		const snapshot = formState.toJSON();
		const json = JSON.stringify(snapshot, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const timestamp = new Date().toISOString().slice(0, 10);
		a.href = url;
		a.download = `DigitalDSA-${loanName}-Draft-${timestamp}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

{#if isFormPage}
	<button
		onclick={exportDraft}
		ondblclick={onDoubleClick}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		class="fixed right-6 bottom-24 z-40 flex h-11 w-11 items-center justify-center rounded-full
			bg-[var(--ddsa-primary-500)] text-white shadow-lg
			hover:bg-[var(--ddsa-primary-600)] hover:shadow-xl
			focus:ring-4 focus:ring-[var(--ddsa-primary-300)] focus:outline-none"
		class:cursor-grabbing={isDragging}
		class:cursor-grab={!isDragging}
		class:scale-110={isDragging}
		class:active:scale-95={!isDragging}
		class:transition-all={!isDragging}
		style="transform: translate({offset.x}px, {offset.y}px); touch-action: none;"
		title="Export Draft (JSON) — drag to reposition, double-click to reset"
		type="button"
		aria-label="Export draft as JSON file"
	>
		<Download size={18} />
	</button>
{/if}
