<script lang="ts">
	let { progress }: { progress: number } = $props();
</script>

<div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
	<div
		class="h-full rounded-full transition-[width] duration-700 ease-out"
		style="width: {Math.min(
			progress,
			100
		)}%; background: linear-gradient(90deg, var(--ddsa-accent-500, #d4a017), var(--ddsa-primary-500, #2563eb));"
	></div>
</div>
