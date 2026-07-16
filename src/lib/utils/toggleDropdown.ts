// Utility to toggle FAQ/Details dropdown elements on the marketing site
export const toggleDropdown = (event: any, index: number) => {
	if (event && typeof event.preventDefault === 'function') {
		event.preventDefault();
	}
	const summaryElement = event.currentTarget;
	if (!summaryElement) return;
	const icon = summaryElement.querySelector(".faq-icon");
	const detailsElement = summaryElement.parentElement;
	if (!detailsElement) return;

	// Close all dropdowns except the clicked one
	document.querySelectorAll(".dropdown").forEach((otherDetails: any, idx) => {
		const otherIcon = otherDetails.querySelector(".faq-icon");

		if (idx !== index) {
			otherDetails.removeAttribute("open");
			if (otherIcon) {
				otherIcon.classList.remove("fa-angle-up");
				otherIcon.classList.add("fa-angle-down");
			}
		}
	});

	// Toggle current dropdown open/close state
	const isOpen = detailsElement.hasAttribute("open");
	if (isOpen) {
		detailsElement.removeAttribute("open");
		if (icon) {
			icon.classList.remove("fa-angle-up");
			icon.classList.add("fa-angle-down");
		}
	} else {
		detailsElement.setAttribute("open", "true");
		if (icon) {
			icon.classList.remove("fa-angle-down");
			icon.classList.add("fa-angle-up");
		}
	}
	setTimeout(() => {
		detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
	}, 100);
};
