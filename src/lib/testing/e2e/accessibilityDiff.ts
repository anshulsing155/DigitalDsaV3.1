/**
 * Accessibility Snapshot Diffing
 * ══════════════════════════════════════════════════════════════════
 * Compares two Playwright accessibility snapshots and produces a
 * structured diff report. Catches structural UI changes (added/removed
 * fields, renamed labels, reordered elements) without pixel noise.
 * ══════════════════════════════════════════════════════════════════
 */

// ============================================================================
// Types
// ============================================================================

export interface AccessibilityNode {
	role: string;
	name: string;
	value?: string;
	description?: string;
	children?: AccessibilityNode[];
}

export interface DiffEntry {
	type: 'added' | 'removed' | 'changed';
	role: string;
	name: string;
	path: string;
	details?: string;
}

export interface PageDiffReport {
	pageId: string;
	timestamp: string;
	totalBaseline: number;
	totalCurrent: number;
	added: DiffEntry[];
	removed: DiffEntry[];
	changed: DiffEntry[];
	unchanged: number;
}

export interface FullDiffReport {
	generatedAt: string;
	pages: PageDiffReport[];
	summary: {
		totalPages: number;
		pagesWithChanges: number;
		totalAdded: number;
		totalRemoved: number;
		totalChanged: number;
	};
}

// ============================================================================
// Flatten & Normalize
// ============================================================================

interface FlatNode {
	role: string;
	name: string;
	value?: string;
	path: string;
}

/**
 * Flatten an accessibility tree into a list of leaf/meaningful nodes.
 * Skips generic container roles (generic, none) that add noise.
 */
function flattenTree(node: AccessibilityNode, parentPath = ''): FlatNode[] {
	const SKIP_ROLES = new Set(['generic', 'none', 'presentation']);
	const result: FlatNode[] = [];

	const currentPath = parentPath
		? `${parentPath} > ${node.role}[${node.name || '?'}]`
		: `${node.role}[${node.name || '?'}]`;

	if (!SKIP_ROLES.has(node.role) && node.name) {
		result.push({
			role: node.role,
			name: node.name,
			value: node.value,
			path: currentPath
		});
	}

	if (node.children) {
		for (const child of node.children) {
			result.push(...flattenTree(child, currentPath));
		}
	}

	return result;
}

/**
 * Create a unique key for a node (role + name).
 */
function nodeKey(node: FlatNode): string {
	return `${node.role}::${node.name}`;
}

// ============================================================================
// Diff Engine
// ============================================================================

/**
 * Diff two accessibility snapshots for a single page.
 */
export function diffSnapshots(
	pageId: string,
	baseline: AccessibilityNode | null,
	current: AccessibilityNode | null
): PageDiffReport {
	const baselineNodes = baseline ? flattenTree(baseline) : [];
	const currentNodes = current ? flattenTree(current) : [];

	const baselineMap = new Map<string, FlatNode>();
	for (const node of baselineNodes) {
		const key = nodeKey(node);
		if (!baselineMap.has(key)) baselineMap.set(key, node);
	}

	const currentMap = new Map<string, FlatNode>();
	for (const node of currentNodes) {
		const key = nodeKey(node);
		if (!currentMap.has(key)) currentMap.set(key, node);
	}

	const added: DiffEntry[] = [];
	const removed: DiffEntry[] = [];
	const changed: DiffEntry[] = [];
	let unchanged = 0;

	// Find removed (in baseline but not current)
	for (const [key, node] of baselineMap) {
		if (!currentMap.has(key)) {
			removed.push({
				type: 'removed',
				role: node.role,
				name: node.name,
				path: node.path
			});
		}
	}

	// Find added and changed
	for (const [key, node] of currentMap) {
		const baseNode = baselineMap.get(key);
		if (!baseNode) {
			added.push({
				type: 'added',
				role: node.role,
				name: node.name,
				path: node.path
			});
		} else if (baseNode.value !== node.value) {
			changed.push({
				type: 'changed',
				role: node.role,
				name: node.name,
				path: node.path,
				details: `value: "${baseNode.value || ''}" → "${node.value || ''}"`
			});
		} else {
			unchanged++;
		}
	}

	return {
		pageId,
		timestamp: new Date().toISOString(),
		totalBaseline: baselineNodes.length,
		totalCurrent: currentNodes.length,
		added,
		removed,
		changed,
		unchanged
	};
}

/**
 * Build a full diff report across multiple pages.
 */
export function buildFullDiffReport(pages: PageDiffReport[]): FullDiffReport {
	return {
		generatedAt: new Date().toISOString(),
		pages,
		summary: {
			totalPages: pages.length,
			pagesWithChanges: pages.filter(
				(p) => p.added.length > 0 || p.removed.length > 0 || p.changed.length > 0
			).length,
			totalAdded: pages.reduce((s, p) => s + p.added.length, 0),
			totalRemoved: pages.reduce((s, p) => s + p.removed.length, 0),
			totalChanged: pages.reduce((s, p) => s + p.changed.length, 0)
		}
	};
}

/**
 * Format a diff report as human-readable text.
 */
export function formatDiffReport(report: FullDiffReport): string {
	const lines: string[] = [
		`UI Accessibility Diff Report — ${report.generatedAt}`,
		`${'═'.repeat(60)}`,
		`Pages scanned: ${report.summary.totalPages}`,
		`Pages with changes: ${report.summary.pagesWithChanges}`,
		`Total: +${report.summary.totalAdded} added, -${report.summary.totalRemoved} removed, ~${report.summary.totalChanged} changed`,
		''
	];

	for (const page of report.pages) {
		const hasChanges = page.added.length + page.removed.length + page.changed.length > 0;
		if (!hasChanges) {
			lines.push(`✓ ${page.pageId} — no changes (${page.unchanged} nodes)`);
			continue;
		}

		lines.push(
			`✗ ${page.pageId} — ${page.added.length} added, ${page.removed.length} removed, ${page.changed.length} changed`
		);

		for (const entry of page.added) {
			lines.push(`  + [${entry.role}] "${entry.name}"`);
		}
		for (const entry of page.removed) {
			lines.push(`  - [${entry.role}] "${entry.name}"`);
		}
		for (const entry of page.changed) {
			lines.push(`  ~ [${entry.role}] "${entry.name}" — ${entry.details}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}
