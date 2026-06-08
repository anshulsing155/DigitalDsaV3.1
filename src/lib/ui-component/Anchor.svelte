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
		linkColor = 'var(--dash-accent-link, var(--ddsa-primary-700))',
		onClick = () => {}
	}: Props = $props();
</script>

<a
	href={link}
	onclick={onClick}
	style={`color:${linkColor}`}
	class="underline underline-offset-4 hover:no-underline cursor-pointer typography-input"
>
	{@html linkName}
</a>