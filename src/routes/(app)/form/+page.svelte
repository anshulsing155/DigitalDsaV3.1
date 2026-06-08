<script lang="ts">
	import { goto } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import { applicationData } from '$lib/stores/applicationData';
	import { clearFormState } from '$lib/utils/formStateHelpers';
	import { ROUTES } from '$lib/config/routes.js';

	async function startForm() {
		await clearFormState();
		goto(ROUTES.FORM.HOW_CAN_WE_HELP);
	}
</script>

<div class="container mx-auto min-h-screen p-4 text-white">
	<h1 class="mb-4 text-2xl font-bold">Loan Application</h1>
	<button onclick={startForm} class="btn btn-primary">Start New Application</button>
</div>
