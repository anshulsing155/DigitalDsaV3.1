export function scrollToFirstError() {
	const firstError = document.querySelector(
		'[data-error="true"], .error-message, .text-red-500, .text-error'
	);
	if (firstError) {
		firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
}
