<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';

	interface Task {
		_id: string;
		task_id: string;
		case_id: string;
		title: string;
		description?: string;
		priority: 'low' | 'medium' | 'high';
		status: 'pending' | 'in_progress' | 'done' | 'cancelled';
		due_date?: string;
		source: 'manual' | 'system';
		created_at: string;
		completed_at?: string;
	}

	interface Props {
		caseId: string;
		initialTasks?: Task[];
	}

	let { caseId, initialTasks = [] }: Props = $props();

	// svelte-ignore state_referenced_locally — intentional: seeds local mutable copy from initial prop
	let tasks = $state<Task[]>(initialTasks);
	let showAddForm = $state(false);
	let newTitle = $state('');
	let newPriority = $state<'low' | 'medium' | 'high'>('medium');
	let newDueDate = $state('');
	let saving = $state(false);

	const pendingTasks = $derived(
		tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
	);
	const doneTasks = $derived(tasks.filter((t) => t.status === 'done'));

	const priorityBadge: Record<string, string> = {
		high: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		medium: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		low: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	function formatDueDate(d?: string): string {
		if (!d) return '';
		const due = new Date(d);
		const now = new Date();
		const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		const dateStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
		if (diffDays < 0) return `${dateStr} (overdue)`;
		if (diffDays === 0) return `${dateStr} (today)`;
		if (diffDays === 1) return `${dateStr} (tomorrow)`;
		return dateStr;
	}

	function dueDateClass(d?: string): string {
		if (!d) return '';
		const due = new Date(d);
		const now = new Date();
		const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays < 0) return 'text-[var(--dash-contrast-text)] font-medium';
		if (diffDays <= 1) return 'text-[var(--dash-contrast-text)] font-medium';
		return 'text-[var(--dash-text-muted)]';
	}

	async function loadTasks() {
		try {
			const res = await secureFetch(`/api/cases/${caseId}/tasks`);
			if (res.ok) {
				const data = await res.json();
				if (data.success) tasks = data.data.tasks;
			}
		} catch {
			// Silent fail — keep existing tasks
		}
	}

	async function createTask() {
		if (!newTitle.trim()) return;
		saving = true;
		try {
			const body: Record<string, any> = {
				title: newTitle.trim(),
				priority: newPriority
			};
			if (newDueDate) body.due_date = new Date(newDueDate).toISOString();

			const res = await secureFetch(`/api/cases/${caseId}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (res.ok) {
				newTitle = '';
				newPriority = 'medium';
				newDueDate = '';
				showAddForm = false;
				await loadTasks();
			}
		} catch {
			// Silent
		} finally {
			saving = false;
		}
	}

	async function toggleDone(task: Task) {
		const newStatus = task.status === 'done' ? 'pending' : 'done';
		try {
			const res = await secureFetch(`/api/cases/${caseId}/tasks/${task.task_id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
			if (res.ok) {
				task.status = newStatus;
				tasks = [...tasks]; // trigger reactivity
			}
		} catch {
			// Silent
		}
	}

	async function deleteTask(task: Task) {
		try {
			const res = await secureFetch(`/api/cases/${caseId}/tasks/${task.task_id}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				tasks = tasks.filter((t) => t.task_id !== task.task_id);
			}
		} catch {
			// Silent
		}
	}
</script>

<div
	class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
>
	<div class="mb-3 flex items-center justify-between">
		<h3 class="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text)]">
			<svg
				class="h-4 w-4 text-[var(--dash-text-muted)]"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			Tasks
			{#if pendingTasks.length > 0}
				<span
					class="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ddsa-accent-500)] px-1.5 text-[13px] font-bold text-white"
				>
					{pendingTasks.length}
				</span>
			{/if}
		</h3>
		<button
			type="button"
			class="rounded-lg px-2 py-1 text-xs font-medium text-[var(--ddsa-accent-600)] transition-colors hover:bg-[var(--ddsa-accent-500)]/10"
			onclick={() => (showAddForm = !showAddForm)}
		>
			{showAddForm ? 'Cancel' : '+ Add Task'}
		</button>
	</div>

	<!-- Add task form -->
	{#if showAddForm}
		<div
			class="mb-3 space-y-2 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] p-3"
		>
			<input
				type="text"
				bind:value={newTitle}
				placeholder="What needs to be done?"
				class="w-full rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-sm text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				onkeydown={(e) => {
					if (e.key === 'Enter') createTask();
				}}
			/>
			<div class="flex items-center gap-2">
				<select
					bind:value={newPriority}
					class="rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2 py-1 text-xs text-[var(--dash-text-secondary)]"
				>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
				</select>
				<input
					type="date"
					bind:value={newDueDate}
					class="rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-2 py-1 text-xs text-[var(--dash-text-secondary)]"
				/>
				<button
					type="button"
					class="ml-auto rounded-md bg-[var(--ddsa-accent-500)] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)] disabled:opacity-50"
					disabled={!newTitle.trim() || saving}
					onclick={createTask}
				>
					{saving ? 'Saving...' : 'Add'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Pending tasks -->
	{#if pendingTasks.length === 0 && doneTasks.length === 0}
		<p class="py-2 text-center text-xs text-[var(--dash-text-muted)]">No tasks yet</p>
	{:else}
		<div class="space-y-1">
			{#each pendingTasks as task (task.task_id)}
				<div
					class="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--dash-bg-secondary)]"
				>
					<button
						type="button"
						class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--dash-border)] transition-colors hover:border-[var(--ddsa-accent-500)] hover:bg-[var(--ddsa-accent-500)]/10"
						onclick={() => toggleDone(task)}
						aria-label="Mark done"
					>
						<!-- empty checkbox -->
					</button>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5">
							<span class="truncate text-sm text-[var(--dash-text-secondary)]">{task.title}</span>
							<span
								class="shrink-0 rounded px-1 py-0.5 text-[13px] font-medium {priorityBadge[
									task.priority
								]}"
							>
								{task.priority}
							</span>
						</div>
						{#if task.due_date}
							<span class="text-[13px] {dueDateClass(task.due_date)}">
								{formatDueDate(task.due_date)}
							</span>
						{/if}
					</div>
					<button
						type="button"
						class="shrink-0 rounded p-0.5 text-[var(--dash-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--dash-contrast-text)]"
						onclick={() => deleteTask(task)}
						aria-label="Delete task"
					>
						<svg
							class="h-3.5 w-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/each}

			<!-- Done tasks (collapsed) -->
			{#if doneTasks.length > 0}
				<div class="mt-2 border-t border-[var(--dash-border)] pt-2">
					<p class="mb-1 text-[13px] font-medium text-[var(--dash-text-muted)]">
						Completed ({doneTasks.length})
					</p>
					{#each doneTasks.slice(0, 3) as task (task.task_id)}
						<div class="group flex items-center gap-2 px-2 py-1">
							<button
								type="button"
								class="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]"
								onclick={() => toggleDone(task)}
								aria-label="Mark not done"
							>
								<svg
									class="h-3 w-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
								</svg>
							</button>
							<span class="truncate text-xs text-[var(--dash-text-muted)] line-through"
								>{task.title}</span
							>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
