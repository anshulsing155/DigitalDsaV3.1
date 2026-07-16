<script>
  export let linkName = "";
  export let link = "";
  export let linkColor = "#1175BC";
  export let onClick = () => {};
</script>

<a
  href={link}
  on:click={onClick}
  class="underline underline-offset-4 text-{linkColor} hover:no-underline font-Paragraph text-subPara cursor-pointer"
>
  {@html linkName}
</a>
