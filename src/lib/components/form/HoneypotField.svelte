<script lang="ts">
	/**
	 * HoneypotField — CSS-hidden trap for bot detection.
	 *
	 * Renders an invisible input that real users never see or interact with.
	 * If any value is entered (automation filling all fields), it immediately
	 * reports to /api/security/honeypot-trap for a massive trust score penalty.
	 *
	 * NOT in the API schema — only in HTML. API scrapers never see it.
	 */

	import { secureFetch } from '$lib/utils/csrf';

	interface Props {
		sessionId?: string;
	}

	const { sessionId }: Props = $props();

	// Pick a plausible-looking field name based on sessionId hash
	const FIELD_NAMES = [
		'confirm_email',
		'secondary_phone',
		'reference_number',
		'verification_code',
		'additional_details'
	] as const;

	const fieldName = $derived.by(() => {
		if (!sessionId) return FIELD_NAMES[0];
		let hash = 0;
		for (let i = 0; i < sessionId.length; i++) {
			hash = (hash * 31 + sessionId.charCodeAt(i)) | 0;
		}
		return FIELD_NAMES[Math.abs(hash) % FIELD_NAMES.length];
	});

	function onInput() {
		// Fire-and-forget: report honeypot trigger
		secureFetch('/api/security/honeypot-trap', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionId, fieldName })
		}).catch(() => {});
	}
</script>

<!--
  CSS-hidden honeypot field. Real users never see it.
  - position: absolute + left: -9999px = off-screen
  - opacity: 0 = invisible
  - pointer-events: none = unclickable
  - aria-hidden = screen readers skip it
  - tabindex=-1 = keyboard nav skips it
  - autocomplete=off = browser won't autofill
-->
<div
	style="position: absolute; left: -9999px; top: -9999px; opacity: 0; pointer-events: none; height: 0; width: 0; overflow: hidden;"
	aria-hidden="true"
>
	<label for="hp_{fieldName}">{fieldName}</label>
	<input
		id="hp_{fieldName}"
		name={fieldName}
		type="text"
		tabindex={-1}
		autocomplete="off"
		oninput={onInput}
	/>
</div>
