<script>
  import HelpList from "./HelpList.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import Seo from "./Seo.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import VerticalBlog from "./VerticalBlog.svelte";
  import content from "$lib/data/website/choosePerfectNeighbourhoodArticle.json";
  import { BookOpen, MapPin, Compass, Shield, IndianRupee, Heart } from '$lib/utils/iconRegistry';
  let { pageData = content.pageData } = $props();
</script>

<Seo
  type="WebPage"
  title={content.seo.title}
  image={pageData.coverImage}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section>
  <NewPageLayout {pageData}>
    <div
      class="lg:mx-[13rem] md:mx-[2rem] items-center pb-10 md:pb-16 lg:pb-20 py-7 md:p-12 px-[0.5rem]"
    >
      {#each content.sections as section, i}
        <div class="mb-12">
          <div class="flex items-center my-{i === 0 ? '5' : '8'}">
            {#if section.icon === 'book-open'}
              <BookOpen class="text-primary mr-3"/>
            {:else if section.icon === 'map-pin'}
              <MapPin class="text-primary mr-3"/>
            {:else if section.icon === 'compass'}
              <Compass class="text-primary mr-3"/>
            {:else if section.icon === 'shield'}
             <Shield class="text-primary mr-3"/>
            {:else if section.icon === 'indian-rupee'}
              <IndianRupee class="text-primary mr-3"/>
            {:else if section.icon === 'heart'}
              <Heart class="text-primary mr-3"/>
            {/if}

            <h2
              class="typography-body-lg !font-semibold text-[var(--form-text)] border-l-4 border-primary pl-3"
            >
              {section.heading}
            </h2>
          </div>
          {#each section.paragraphs as paragraph}
            <p
              class="typography-body-md text-[var(--form-text-secondary)] ml-10"
            >
              {@html paragraph}
            </p>
          {/each}
          {#if section.list}
            <ul
              class="list-disc pl-5 space-y-3 typography-body-md text-[var(--form-text-secondary)] mt-3 ml-10"
            >
              {#each section.list as item}
                <li>
                  {#if item.bold}
                    <strong class="mr-1">{@html item.bold}</strong>
                  {/if}
                  {@html item.text}
                </li>
              {/each}
            </ul>
          {/if}
          {#if section.callout}
            <p
              class="typography-body-md text-[var(--form-text-secondary)] mt-3 ml-10"
            >
              {@html section.callout}
            </p>
          {/if}
        </div>
      {/each}
    </div>

    <div slot="secondary" class="">
      <div class="px-[0.5rem] py-[3rem] lg:py-0">
        <h2 class="typography-h2-md text-[var(--form-text)] mb-2">
          {content.resonateWithYou.heading}
        </h2>
        <p
          class="mb-8 typography-body-md text-[var(--form-text-secondary)] !font-semibold"
        >
          {content.resonateWithYou.para}
        </p>
        <div class="md:flex gap-2">
          <VerticalBlog blogLists={content.resonateWithYou.blogLists} />
        </div>
      </div>

      <HelpList contents={content.common_components.helpList.contents} />

      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-disc pl-4 flex flex-col gap-4 px-2">
          {#each content.common_components.thinkYouShouldKnow.bullets as bullet}
            <li>
              <span class="font-semibold">{bullet.title}</span>
              {bullet.text}
            </li>
          {/each}
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>

