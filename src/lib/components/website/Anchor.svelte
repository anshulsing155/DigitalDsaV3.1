<script lang="ts">
	type Props = {
		linkName?: string;
		link?: string;
		linkColor?: string;
		onClick?: (event: MouseEvent) => void;
	};

	const {
		linkName = '',
		link = '',
		linkColor = '[var(--ddsa-info-text)]',
		onClick = () => {}
	}: Props = $props();
</script>

<a
	href={link}
	onclick={onClick}
	class={`underline underline-offset-4 hover:no-underline text-${linkColor} typography-input cursor-pointer`}
>
	{@html linkName}
</a>
