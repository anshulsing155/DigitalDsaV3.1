<script>
  import CheckCard5 from "$lib/components/website/CheckCard5.svelte";
  import Testimonial from "$lib/components/website/Testimonial.svelte";
  import Seo from "$lib/components/website/Seo.svelte";
  import content from "$lib/data/website/testimonial.json";
</script>

<Seo
  type="WebPage"
  title={content.seo.title}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section>
  <Testimonial />
  <CheckCard5
    contents={content.sameerSrivastava}
  />
</section>
