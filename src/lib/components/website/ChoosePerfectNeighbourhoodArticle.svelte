<script>
  import HelpList from "./HelpList.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import Seo from "./Seo.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import VerticalBlog from "./VerticalBlog.svelte";
  import content from "$lib/data/website/choosePerfectNeighbourhoodArticle.json";

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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide-icon lucide lucide-book-open text-btnBg mr-3"
                ><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path
                  d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
                ></path></svg
              >
            {:else if section.icon === 'map-pin'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide-icon lucide lucide-map-pin text-btnBg mr-3"
                ><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
                ></path><circle cx="12" cy="10" r="3"></circle></svg
              >
            {:else if section.icon === 'compass'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide-icon lucide lucide-compass text-btnBg mr-3"
                ><circle cx="12" cy="12" r="10"></circle><polygon
                  points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
                ></polygon></svg
              >
            {:else if section.icon === 'shield'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide-icon lucide lucide-shield text-btnBg mr-3"
                ><path
                  d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                ></path></svg
              >
            {:else if section.icon === 'dollar-sign'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide-icon lucide lucide-dollar-sign text-btnBg mr-3"
                ><line x1="12" x2="12" y1="2" y2="22"></line><path
                  d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                ></path></svg
              >
            {:else if section.icon === 'heart'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide-icon lucide lucide-heart text-btnBg mr-3"
                ><path
                  d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                ></path></svg
              >
            {/if}

            <h2
              class="text-minSubHead font-ThirdHead text-gray-900 border-l-4 border-btnBg pl-3"
            >
              {section.heading}
            </h2>
          </div>
          {#each section.paragraphs as paragraph}
            <p
              class="text-paraFont font-Paragraph text-gray-700 leading-relaxed ml-10"
            >
              {@html paragraph}
            </p>
          {/each}
          {#if section.list}
            <ul
              class="list-disc pl-5 space-y-3 text-subParaFont font-Paragraph text-gray-700 mt-3 ml-10"
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
              class="text-paraFont font-Paragraph text-gray-700 bg-gray-100 p-5 border-l-4 border-btnBg mt-3 leading-relaxed ml-10"
            >
              {@html section.callout}
            </p>
          {/if}
        </div>
      {/each}
    </div>

    <div slot="secondary" class="">
      <div class="px-[0.5rem] py-[3rem] lg:py-0">
        <h2 class="text-minSubHead font-FourthHead mb-2">
          {content.resonateWithYou.heading}
        </h2>
        <p
          class="mb-8 text-paraFont font-Paragraph text-gray-700 leading-relaxed"
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
              <span class="font-FourthHead">{bullet.title}</span>
              {bullet.text}
            </li>
          {/each}
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>

