// Smooth scroll utilities for landing page navigation

export function smoothScrollTo(elementId: string, offset: number = 0) {
	const element = document.getElementById(elementId);
	if (element) {
		const elementPosition = element.getBoundingClientRect().top;
		const offsetPosition = elementPosition + window.pageYOffset - offset;

		window.scrollTo({
			top: offsetPosition,
			behavior: 'smooth'
		});
	}
}

export function scrollToTop() {
	window.scrollTo({
		top: 0,
		behavior: 'smooth'
	});
}

export function isElementInViewport(element: Element, threshold: number = 0.1): boolean {
	const rect = element.getBoundingClientRect();
	const windowHeight = window.innerHeight || document.documentElement.clientHeight;
	const windowWidth = window.innerWidth || document.documentElement.clientWidth;

	const vertInView =
		rect.top <= windowHeight * (1 - threshold) &&
		rect.top + rect.height >= windowHeight * threshold;
	const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;

	return vertInView && horInView;
}

export function onScroll(callback: (scrollY: number) => void) {
	let ticking = false;

	function updateScrollPosition() {
		callback(window.scrollY);
		ticking = false;
	}

	function requestTick() {
		if (!ticking) {
			requestAnimationFrame(updateScrollPosition);
			ticking = true;
		}
	}

	window.addEventListener('scroll', requestTick);

	return () => {
		window.removeEventListener('scroll', requestTick);
	};
}
