<script lang="ts">
  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import NewHome from "./NewHome.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import gsap from "gsap";
  import { applicationData } from "$lib/stores/stores";
  import content from "$lib/data/website/manageHomeLoan.json";

  let {
    data,
    pageData = content.pageData
  }: { data?: any; pageData?: any } = $props();

  const navListWithClicks = $derived(
    content.navList.map((item: any) => {
      if (item.actionBtn) {
        return {
          ...item,
          actionBtn: item.actionBtn.map((btn: any) => {
            if (btn.link === "/get-started/how-can-we-help" || btn.firstBtn === "Apply for new loan" || btn.link === "/apply") {
              return {
                ...btn,
                btnClick: () => {
                  applicationData.update((storeData) => {
                    storeData.LoanName = "Home Loan";
                    return storeData;
                  });
                }
              };
            }
            return btn;
          })
        };
      }
      return item;
    })
  );

  const toggleDropdown = (event: Event, index: number) => {
    const summaryElement = event.currentTarget as HTMLElement;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

    const allDetails = document.querySelectorAll(".dropdown") as NodeListOf<HTMLDetailsElement>;
    allDetails.forEach((otherDetails, idx) => {
      if (idx !== index && otherDetails.open) {
        otherDetails.open = false;
        const otherIcon = otherDetails.querySelector(".faq-icon");
        if (otherIcon) {
          gsap.to(otherIcon, {
            rotation: 0,
            duration: 0.1,
            ease: "power2.out",
          });
          otherIcon.classList.remove("fa-angle-down");
          otherIcon.classList.add("fa-angle-top");
        }
      }
    });

    const isOpen = detailsElement.open;
    gsap.to(icon, {
      rotation: isOpen ? 0 : 180,
      duration: 0.1,
      ease: "power2.out",
    });

    if (isOpen) {
      if (icon) {
        icon.classList.remove("fa-angle-down");
        icon.classList.add("fa-angle-down");
      }
    } else {
      if (icon) {
        icon.classList.remove("fa-angle-top");
        icon.classList.add("fa-angle-down");
      }
    }
  };
</script>

<section>
  <PageDesign {pageData}>
    <div>
      <div class="border flex justify-between items-center p-[2rem] font-semibold typography-body-md gap-[2rem]">
        <ul class="hidden lg:flex gap-[3rem]">
          {#each navListWithClicks.slice(0, -1) as list}
            <li>
              <a href={list.url}>{list.listName}</a>
            </li>
          {/each}
        </ul>
        <div class="flex sm:flex-row flex-col sm:w-auto w-full gap-4 pr-4">
          {#each [navListWithClicks[navListWithClicks.length - 1]] as lastItem}
            {#if lastItem.actionBtn}
              {#each lastItem.actionBtn as action}
                <div class="">
                  <Button
                    btnName={action.firstBtn}
                    btnColor={action.btnColor}
                    link={action.link}
                    btnClick={action.btnClick}
                  />
                </div>
              {/each}
            {/if}
          {/each}
        </div>
      </div>
      <div>
        <div class="hidden lg:block px-[2rem] lg:px-[4rem]">
          <div id="repayment">
            <div class="py-[4rem] border-b border-borderColor">
              <h2 class="mb-[3rem] md:text-start typography-h2 text-text-main">
                Repayment & redraw
              </h2>
              {#each content.repayment as steps}
                <div class="grid grid-cols-3 justify-between gap-4">
                  {#each steps.data1 as data1}
                    <div class="flex flex-col gap-[1.5rem]">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data1.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {data1.para}
                      </p>
                      <div>
                        <p class="mb-2 typography-body-md text-text-light">
                          {data1.listHeading}
                        </p>
                        <ul class="list-disc pl-4 flex flex-col gap-2">
                          {#each data1.listText as list}
                            <li>{list}</li>
                          {/each}
                        </ul>
                      </div>
                      <a
                        href={data1.url}
                        class="typography-body-md text-text-light text-linkColor underline"
                      >{data1.link}</a>
                      <div>
                        <Button
                          link="/"
                          btnName="Change in Dgital DSA"
                          btnBorder="#4F4C4D"
                        />
                      </div>
                    </div>
                  {/each}
                  {#each steps.data2 as data2}
                    <div class="flex flex-col gap-[1.5rem]">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data2.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {data2.para}
                      </p>
                      <a
                        href={data2.url}
                        class="typography-body-md text-text-light text-linkColor underline"
                      >{data2.link}</a>
                      <div>
                        <Button
                          link="/"
                          btnName="Redraw in Digital DSA"
                          btnBorder="#4F4C4D"
                        />
                      </div>
                    </div>
                  {/each}
                  {#each steps.data3 as data3}
                    <div class="flex flex-col gap-[1.5rem]">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data3.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {data3.para}
                      </p>
                      <a
                        href={data3.url}
                        class="typography-body-md text-text-light text-linkColor underline"
                      >{data3.link}</a>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          </div>

          <div
            id="offset"
            class="border-b border-borderColor py-[4rem] grid grid-cols-3 justify-between gap-[4rem]"
          >
            <h2 class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2">
              Everyday Offset
            </h2>
            {#each content.offset.data as data}
              <div class="col-span-2 grid gap-4">
                <p class="typography-body-sm text-text-light">{data.desc}</p>
                <a
                  href={data.url}
                  class="typography-body-md text-text-light text-linkColor underline"
                >{data.linkName}</a>
                <div>
                  <Button
                    btnName={data.btnName}
                    btnBorder="#4F4C4D"
                    link={data.btnLink}
                  />
                </div>
              </div>
            {/each}
          </div>

          <div id="tools">
            {#each content.tools as steps}
              <div>
                <NewHome {steps} />
              </div>
            {/each}
          </div>

          <div id="benefits">
            <div class="py-[4rem] border-b border-borderColor">
              <h2 class="mb-[3rem] md:text-start typography-h2 text-text-main">
                Features & benefits
              </h2>
              <div class="grid grid-cols-4 justify-between gap-4">
                {#each content.benefits as data}
                  <div class="flex flex-col gap-[1.5rem]">
                    <h3 class="typography-h3 font-semibold text-text-main">
                      {data.heading}
                    </h3>
                    <p class="typography-body-sm text-text-light">
                      {data.para}
                    </p>
                    <a
                      href={data.url}
                      class="typography-body-md text-text-light text-linkColor underline"
                    >{data.link}</a>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="equity">
            {#each content.equity as steps}
              <div>
                <NewHome {steps} />
              </div>
            {/each}
          </div>

          <div id="support">
            <div class="flex flex-col gap-[3rem] border-b border-borderColor py-[2rem] lg:gap-[3rem] lg:py-[4rem]">
              <h2 class="md:text-start typography-h2 text-text-main">
                Tools & support
              </h2>
              <div class="grid grid-cols-3 gap-[2rem]">
                <div class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor">
                  <h3 class="typography-h3 font-semibold text-text-main">
                    {content.support.heading}
                  </h3>
                  <ul class="list-disc pl-4 flex flex-col gap-2">
                    {#each content.support.items as item}
                      <li>
                        <a
                          href={item.link}
                          class="typography-body-md text-text-light underline underline-offset-4 hover:no-underline text-linkColor"
                        >{item.title}</a>
                      </li>
                    {/each}
                  </ul>
                  <a
                    href={content.support.url}
                    class="typography-body-md text-text-light text-linkColor"
                  >{content.support.btnName}</a>
                </div>
                <div class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor">
                  <h3 class="typography-h3 font-semibold text-text-main">
                    How is interest calculated on my home loan?
                  </h3>
                  <a
                    href="/"
                    class="typography-body-md text-text-light text-linkColor"
                  >Tell me more</a>
                </div>
                <div class="space-y-6">
                  {#each content.sideBarMore as side}
                    <div class="grid grid-cols-[30%_70%] border border-dividerColor hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)] shadow-lg">
                      <div>
                        <img
                          src={side.icon}
                          alt={side.altName}
                          class="aspect-square h-[6rem] object-cover"
                        />
                      </div>
                      <div class="content-center p-2">
                        <h4 class="typography-body-md typography-h3 font-semibold">
                          {side.title}
                        </h4>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <TwoColumn
              cardImage={content.payOffSooner.cardImage}
              cardAltName={content.payOffSooner.cardAltName}
              cardHeading={content.payOffSooner.cardHeading}
              reverse
            >
              <ul class="grid gap-[2rem] typography-body-md text-text-light" slot="list">
                <li>{content.payOffSooner.text}</li>
              </ul>
            </TwoColumn>

            <TwoColumn
              cardImage={content.messageUs.cardImage}
              cardAltName={content.messageUs.cardAltName}
              cardHeading={content.messageUs.cardHeading}
            >
              <ul class="grid gap-[2rem] typography-body-md text-text-light" slot="list">
                <li>
                  {content.messageUs.text}
                </li>
                <div class="w-auto">
                  <Button link="" btnBorder="#4F4C4D" btnName="Message us" />
                </div>
              </ul>
            </TwoColumn>

            <div class="grid grid-cols-3 justify-between gap-[4rem] py-[1.5rem] lg:py-[3rem]">
              <h2 class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2">
                Home loan support
              </h2>
              <div class="col-span-2 grid gap-[4rem]">
                {#each content.loanSupport.data as data}
                  <div class="grid gap-4">
                    {#if data.heading}
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data.heading}
                      </h3>
                    {/if}
                    <p class="typography-body-sm text-text-light">{data.desc}</p>
                    <a
                      href={data.url}
                      class="typography-body-md text-text-light text-linkColor underline"
                    >{data.linkName}</a>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <div class="lg:hidden block">
          {#each content.navBarMedium as list, index}
            <details class="dropdown col-span-3 bg-darkColor text-white {index < content.navBarMedium.length - 1 ? 'border-b' : ''}">
              <summary
                class="col-span-3 list-none px-[2.5rem] py-[1.5rem]"
                onclick={(e) => toggleDropdown(e, index)}
              >
                <div class="mx-auto flex w-full items-center justify-between gap-4">
                  <h2 class="text-navFont">{list}</h2>
                  <div class="icon-container justify-self-end typography-h3">
                    <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                  </div>
                </div>
              </summary>

              {#if index === 0}
                <div id="repayment" class="bg-white text-black p-4 md:px-[2rem] md:py-[1rem]">
                  <div class="py-[4rem] border-0">
                    <h2 class="mb-[3rem] md:text-start typography-h2 text-text-main">
                      Repayment & redraw
                    </h2>
                    {#each content.repayment as steps}
                      <div class="grid md:grid-cols-3 justify-between md:gap-4 gap-[4rem]">
                        {#each steps.data1 as data1}
                          <div class="flex flex-col gap-[1.5rem]">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data1.heading}
                            </h3>
                            <p class="typography-body-sm text-text-light">
                              {data1.para}
                            </p>
                            <div>
                              <p class="mb-2 typography-body-md text-text-light">
                                {data1.listHeading}
                              </p>
                              <ul class="list-disc pl-4 flex flex-col gap-2">
                                {#each data1.listText as listItem}
                                  <li>{listItem}</li>
                                {/each}
                              </ul>
                            </div>
                            <a
                              href={data1.url}
                              class="typography-body-md text-text-light text-linkColor underline"
                            >{data1.link}</a>
                            <div>
                              <Button
                                link="/"
                                btnName="Change in Dgital DSA"
                                btnBorder="#4F4C4D"
                              />
                            </div>
                          </div>
                        {/each}
                        {#each steps.data2 as data2}
                          <div class="flex flex-col gap-[1.5rem]">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data2.heading}
                            </h3>
                            <p class="typography-body-sm text-text-light">
                              {data2.para}
                            </p>
                            <a
                              href={data2.url}
                              class="typography-body-md text-text-light text-linkColor underline"
                            >{data2.link}</a>
                            <div>
                              <Button
                                link="/"
                                btnName="Redraw in Digital DSA"
                                btnBorder="#4F4C4D"
                              />
                            </div>
                          </div>
                        {/each}
                        {#each steps.data3 as data3}
                          <div class="flex flex-col gap-[1.5rem]">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data3.heading}
                            </h3>
                            <p class="typography-body-sm text-text-light">
                              {data3.para}
                            </p>
                            <a
                              href={data3.url}
                              class="typography-body-md text-text-light text-linkColor underline"
                            >{data3.link}</a>
                          </div>
                        {/each}
                      </div>
                    {/each}
                  </div>
                </div>
              {:else if index == 1}
                <div class="bg-white text-black p-4 md:px-[2rem] md:py-[1rem]">
                  <div id="offset" class="py-[4rem] grid lg:grid-cols-3 justify-between gap-[3rem]">
                    <h2 class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2">
                      Everyday Offset
                    </h2>
                    {#each content.offset.data as data}
                      <div class="lg:col-span-2 grid gap-[1.5rem]">
                        <p class="typography-body-sm text-text-light">
                          {data.desc}
                        </p>
                        <a
                          href={data.url}
                          class="typography-body-md text-text-light text-linkColor underline"
                        >{data.linkName}</a>
                        <div>
                          <Button
                            btnName={data.btnName}
                            btnBorder="#4F4C4D"
                            link={data.btnLink}
                          />
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else if index == 2}
                <div id="tools" class="bg-white text-black p-4 md:px-[2rem] md:py-[1rem]">
                  {#each content.tools as steps}
                    <div>
                      <NewHome {steps} />
                    </div>
                  {/each}
                </div>
              {:else if index == 3}
                <div id="benefits" class="bg-white text-black md:px-[2rem] p-4 md:py-[1rem]">
                  <div class="py-[4rem]">
                    <h2 class="mb-[3rem] md:text-start typography-h2 text-text-main">
                      Features & benefits
                    </h2>
                    <div class="grid md:grid-cols-2 justify-between gap-[3rem]">
                      {#each content.benefits as data}
                        <div class="flex flex-col gap-4">
                          <h3 class="typography-h3 font-semibold text-text-main">
                            {data.heading}
                          </h3>
                          <p class="typography-body-sm text-text-light">
                            {data.para}
                          </p>
                          <a
                            href={data.url}
                            class="typography-body-md text-text-light text-linkColor underline"
                          >{data.link}</a>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {:else if index == 4}
                <div id="equity" class="bg-white text-black md:px-[2rem] p-4 md:py-[1rem]">
                  {#each content.equity as steps}
                    <div>
                      <NewHome {steps} />
                    </div>
                  {/each}
                </div>
              {:else if index == 5}
                <div id="support" class="bg-white text-black md:px-[2rem] p-4 md:py-[1rem]">
                  <div class="flex flex-col gap-[3rem] py-[2rem] lg:gap-[3rem] lg:py-[4rem]">
                    <h2 class="md:text-start typography-h2 text-text-main">
                      Tools & support
                    </h2>
                    <div class="grid md:grid-cols-2 gap-[2rem]">
                      <div class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor">
                        <h3 class="typography-h3 font-semibold text-text-main">
                          {content.support.heading}
                        </h3>
                        <ul class="list-disc pl-4 flex flex-col gap-2">
                          {#each content.support.items as item}
                            <li>
                              <a
                                href={item.link}
                                class="typography-body-md text-text-light underline underline-offset-4 hover:no-underline text-linkColor"
                              >{item.title}</a>
                            </li>
                          {/each}
                        </ul>
                        <a
                          href={content.support.url}
                          class="typography-body-md text-text-light text-linkColor"
                        >{content.support.btnName}</a>
                      </div>
                      <div class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor">
                        <h3 class="typography-h3 font-semibold text-text-main">
                          How is interest calculated on my home loan?
                        </h3>
                        <a
                          href="/"
                          class="typography-body-md text-text-light text-linkColor"
                        >Tell me more</a>
                      </div>
                      <div class="space-y-6">
                        {#each content.sideBarMore as side}
                          <div class="grid md:grid-cols-[15%_85%] grid-cols-[20%_80%] justify-start border border-dividerColor hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)] shadow-lg">
                            <div>
                              <img
                                src={side.icon}
                                alt={side.altName}
                                class="aspect-square h-[6rem] object-cover"
                              />
                            </div>
                            <div class="content-center p-2">
                              <h4 class="typography-body-md typography-h3 font-semibold">
                                {side.title}
                              </h4>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>

                  <TwoColumn
                    cardImage={content.payOffSooner.cardImage}
                    cardAltName={content.payOffSooner.cardAltName}
                    cardHeading={content.payOffSooner.cardHeading}
                    reverse
                  >
                    <ul class="grid gap-[2rem] typography-body-md text-text-light" slot="list">
                      <li>
                        {content.payOffSooner.text}
                      </li>
                    </ul>
                  </TwoColumn>

                  <TwoColumn
                    cardImage={content.messageUs.cardImage}
                    cardAltName={content.messageUs.cardAltName}
                    cardHeading={content.messageUs.cardHeading}
                  >
                    <ul class="grid gap-[2rem] typography-body-md text-text-light" slot="list">
                      <li>
                        {content.messageUs.text}
                      </li>

                      <div class="w-auto">
                        <Button
                          link=""
                          btnBorder="#4F4C4D"
                          btnName="Message us"
                        />
                      </div>
                    </ul>
                  </TwoColumn>

                  <div class="grid gap-[3rem] py-[1.5rem] lg:py-[3rem]">
                    <h2 class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2">
                      Home loan support
                    </h2>
                    <div class="grid gap-[2rem]">
                      {#each content.loanSupport.data as data}
                        <div class="grid gap-2">
                          {#if data.heading}
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data.heading}
                            </h3>
                          {/if}
                          <p class="typography-body-sm text-text-light">
                            {data.desc}
                          </p>
                          <a
                            href={data.url}
                            class="typography-body-md text-text-light text-linkColor underline"
                          >{data.linkName}</a>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            </details>
          {/each}
        </div>
      </div>
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp help={content.help} heading="We're here to help" />
    </div>
  </PageDesign>
</section>
