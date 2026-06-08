<script>
	let {
		linkName = "",
		link = "",
		linkColor = "#1175BC",
		onClick = () => {}
	} = $props();





;
</script>

<a
  href={link}
  onclick={onClick}
  class="underline underline-offset-4 text-{linkColor} hover:no-underline font-Paragraph text-subPara cursor-pointer"
>
  {@html linkName}
</a>
