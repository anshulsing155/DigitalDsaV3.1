// Lightweight store stubs for the public website.
// The full store was removed with the dashboard/form wizard.
// These exports satisfy imports in website components.
import { writable } from 'svelte/store';

export const applicationData = writable<Record<string, any>>({});
export const appointmentData = writable<Record<string, any>>({});
export const feedbackYes = writable<boolean>(false);
export const hostName = writable<string>('');
export const toasts = writable<any[]>([]);
export const alertNotification = writable<any>(null);

