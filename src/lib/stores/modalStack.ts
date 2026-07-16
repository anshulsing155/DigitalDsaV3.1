const activeModals = new Set<string>();

export function registerModal(id: string) {
	if (typeof document === 'undefined') return;
	activeModals.add(id);
	if (activeModals.size > 0) {
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
	}
}

export function unregisterModal(id: string) {
	if (typeof document === 'undefined') return;
	activeModals.delete(id);
	if (activeModals.size === 0) {
		document.body.style.overflow = '';
		document.documentElement.style.overflow = '';
	}
}
