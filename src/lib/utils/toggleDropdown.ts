export const toggleDropdown = (event: Event, index: number) => {
		event.preventDefault();

		const summaryElement = event.currentTarget as HTMLElement;
		const icon = summaryElement.querySelector('.faq-icon') as HTMLElement;
		const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

		// Close all other dropdowns
		document.querySelectorAll('.dropdown').forEach((otherDetails, idx) => {
			const otherIcon = otherDetails.querySelector('.faq-icon') as HTMLElement;

			if (idx !== index) {
				(otherDetails as HTMLDetailsElement).removeAttribute('open');

				if (otherIcon) {
					otherIcon.style.transform = 'rotate(0deg)';
				}
			}
		});

		// Toggle current dropdown
		const isOpen = detailsElement.hasAttribute('open');

		if (isOpen) {
			detailsElement.removeAttribute('open');

			if (icon) {
				icon.style.transform = 'rotate(0deg)';
			}
		} else {
			detailsElement.setAttribute('open', '');

			if (icon) {
				icon.style.transform = 'rotate(180deg)';
			}
		}

		setTimeout(() => {
			detailsElement.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}, 100);
	};