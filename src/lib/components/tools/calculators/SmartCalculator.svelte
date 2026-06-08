<script lang="ts">
	/**
	 * SmartCalculator — Context-aware wrapper that auto-selects the right experience.
	 *
	 * This is the ONE component you use everywhere. It reads config.context
	 * and renders the appropriate experience:
	 *
	 *   dashboard → ProCockpit (split-screen, what-if insights, live updates)
	 *   public    → ComfortZone (visual spectrum, property anchors, progressive)
	 *   embed     → ConversationalCalc (chat-style, minimal, high completion rate)
	 *
	 * Same engine, same config prop, different UI shell.
	 * This is what makes white-labeling zero-effort.
	 */
	import type { CalculatorConfig } from '$lib/tools/calculatorConfig.js';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';
	import ProCockpit from './experiences/ProCockpit.svelte';
	import ComfortZone from './experiences/ComfortZone.svelte';

	interface Props {
		config?: CalculatorConfig;
	}

	let { config = PUBLIC_CONFIG }: Props = $props();
</script>

{#if config.context === 'dashboard'}
	<!-- DSA Dashboard: Professional split-screen cockpit -->
	<ProCockpit {config} />
{:else if config.context === 'embed'}
	<!-- White-label embed: Conversational flow (compact, high completion) -->
	<!-- TODO: Build ConversationalCalc.svelte when embed infrastructure is ready -->
	<ComfortZone {config} />
{:else}
	<!-- Public pages: Visual comfort zone spectrum -->
	<ComfortZone {config} />
{/if}
