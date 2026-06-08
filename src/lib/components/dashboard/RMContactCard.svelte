<script lang="ts">
	import { Users, Phone, MessageCircle } from 'lucide-svelte';

	interface RMContactInfo {
		rm_name: string;
		lender_name: string;
		phone?: string;
		whatsapp?: string;
		designation?: string;
	}

	interface Props {
		contacts: RMContactInfo[];
		maxItems?: number;
		showViewAll?: boolean;
		viewAllHref?: string;
	}

	let {
		contacts,
		maxItems = 3,
		showViewAll = true,
		viewAllHref = '/dashboard/dsa/rm-contacts'
	}: Props = $props();

	const displayed = $derived(contacts.slice(0, maxItems));

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function formatPhoneForCall(phone: string): string {
		return `tel:${phone.replace(/\s+/g, '')}`;
	}

	function formatWhatsAppLink(phone: string): string {
		const raw = phone.replace(/[\s\-+]/g, '');
		const withCountry = raw.startsWith('91') ? raw : `91${raw}`;
		return `https://wa.me/${withCountry}`;
	}
</script>

<div
	class="rm-contact-card rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-semibold text-[var(--dash-text)]">RM Contacts</h3>
		{#if contacts.length > 0}
			<span
				class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs text-[var(--dash-text-secondary)]"
				>{contacts.length}</span
			>
		{/if}
	</div>

	{#if contacts.length === 0}
		<div class="flex flex-col items-center justify-center py-6 text-center">
			<div
				class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
			>
				<Users size={20} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<p class="text-sm font-medium text-[var(--dash-text-secondary)]">No RM contacts yet</p>
			<p class="text-xs text-[var(--dash-text-muted)]">Add RM contacts when you submit cases</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each displayed as contact}
				<div class="flex items-center gap-3">
					<!-- Avatar -->
					<div
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ddsa-primary-400)] text-xs font-bold text-white"
					>
						{getInitials(contact.rm_name)}
					</div>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-[var(--dash-text)]">
							{contact.rm_name}
						</p>
						<p class="truncate text-xs text-[var(--dash-text-secondary)]">
							{contact.lender_name}{contact.designation ? ` - ${contact.designation}` : ''}
						</p>
					</div>

					<!-- Actions -->
					<div class="flex shrink-0 gap-1.5">
						{#if contact.phone}
							<a
								href={formatPhoneForCall(contact.phone)}
								class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-btn-ghost-bg)] dark:bg-[var(--ddsa-primary-900)]/20 dark:text-[var(--ddsa-primary-300)] dark:hover:bg-[var(--ddsa-primary-800)]/30"
								title="Call {contact.rm_name}"
							>
								<Phone size={14} strokeWidth={2} />
							</a>
						{/if}
						{#if contact.whatsapp}
							<a
								href={formatWhatsAppLink(contact.whatsapp)}
								target="_blank"
								rel="noopener noreferrer"
								class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--ddsa-secondary-200)] dark:bg-[var(--ddsa-secondary-700)]/20 dark:text-[var(--ddsa-secondary-300)] dark:hover:bg-[var(--ddsa-secondary-600)]/30"
								title="WhatsApp {contact.rm_name}"
							>
								<MessageCircle size={14} strokeWidth={2} />
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		{#if showViewAll}
			<a
				href={viewAllHref}
				class="mt-4 block text-center text-xs font-medium text-[var(--dash-accent-text)] hover:underline"
			>
				View All RM Contacts
			</a>
		{/if}
	{/if}
</div>

<style>
	@media (max-width: 768px) {
		/* Increase touch target for call/whatsapp buttons */
		.rm-contact-card :global(.flex.shrink-0.gap-1\.5 a) {
			width: 2.5rem;
			height: 2.5rem;
		}
	}
</style>
