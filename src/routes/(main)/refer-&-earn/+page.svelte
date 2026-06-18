<script>
	let {
		data = $bindable()
	} = $props();

  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Payments from "$lib/components/website/Payments.svelte";
  import { page } from "$app/state";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import AboveTitleWithLeftIconCard from "$lib/components/website/AboveTitleWithLeftIconCard.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import { goto } from "$app/navigation";
  import content from "$lib/data/website/referAndEarn.json";

  let showModal = $state(false);
  let dialogBox;

  function handleModal() {
    showModal = !showModal;
    dialogBox.close();
  }

  // ----------generate-=link-------------------
  let referralLink = $state(page.data.user?.referralLink || "");
  let copied = $state(false);
  let errorMessage = $state("");

  const generateReferralLink = async () => {
    if (!data.user) {
      const originalUrl = page.url.pathname + page.url.search;
      goto(`/login?redirect=${encodeURIComponent(originalUrl)}`);
    } else {
      errorMessage = "";

      try {
        const response = await fetch("/api/generate-referral", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobileNumber: page.data.user?.mobileNumber,
            url: page.url.origin,
          }),
        });

        const dataRes = await response.json();

        if (response.ok) {
          referralLink = dataRes.referralLink; // Update user object with the new referral link
        } else {
          errorMessage = dataRes.error || "Something went wrong.";
        }
      } catch (error) {
        console.error(error);
        errorMessage = "An unexpected error occurred. Please try again.";
      }
    }
  };

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(referralLink);
      alert("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
</script>

<Seo
  type={content.seo.type}
  title={content.seo.title}
  image={content.seo.image}
  description={content.seo.description}
  keywords={content.seo.keywords}
/>

<section class="xl:contianer mx-auto w-full bg-mainBg">
  <NewPageLayout pageData={content.pageData} onClick={handleModal}>
    <div class="">
      <div class="px-[1rem] pt-[1rem] lg:p-[4rem] border-b border-[var(--form-border)] text-[var(--form-text)]">
        <div
          class="flex md:flex-row flex-col gap-[2rem] md:gap-[4rem] justify-between mx-auto"
        >
          <h2
            class="typography-h2 text-[var(--form-text)]"
          >
            Refer to your friend & get ₹5000
          </h2>

          {#if !referralLink}
            <button
              onclick={(e) => { e.preventDefault(); generateReferralLink(); }}
              class="bg-btnBg p-4"
            >
              Generate Referral Link
            </button>
          {:else}
            <div class="flex gap-4 items-center">
              <div class="">
                <a href={referralLink} target="_blank" rel="noopener noreferrer">{referralLink}</a>
              </div>
              <button
                type="button"
                onclick={copyToClipboard}
                class="bg-[var(--landing-bg-card)] border border-[var(--form-border)] text-[var(--form-text)] px-3 py-2 flex items-center justify-center hover:bg-[var(--landing-bg)] transition-colors"
                disabled={!referralLink}
              >
                {#if copied}
                  <i class="fa-solid fa-copy text-btnBg"></i>
                {:else}
                  <i class="fa-regular fa-copy text-btnBg"></i>
                {/if}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <div>
        <AboveTitleWithLeftIconCard
          contents={content.howItWorks}
        />
      </div>

      <div class="border-y border-[var(--form-border)] px-[0.5rem] pt-[1rem] lg:p-[4rem] text-[var(--form-text)]">
        <Payments supportHeading={content.keyBenefits.supportHeading}>
          <div class="grid md:grid-cols-2 gap-[2rem]">
            <div class="col-span-1 grid gap-4">
              <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                {content.keyBenefits.userHeading}
              </h2>
              <ul class="grid gap-4 list-disc pl-4">
                {#each content.keyBenefits.userList as item}
                  <li>{item}</li>
                {/each}
              </ul>
            </div>
            <div class="col-span-1 grid gap-4">
              <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
                {content.keyBenefits.refereeHeading}
              </h2>
              <ul class="grid gap-4 list-disc pl-4">
                {#each content.keyBenefits.refereeList as item}
                  <li>{item}</li>
                {/each}
              </ul>
            </div>
          </div>
        </Payments>
      </div>
      <div class="px-[0.5rem] pt-[1rem] lg:p-[4rem] border-b border-[var(--form-border)] text-[var(--form-text)]">
        <Payments
          supportHeading={content.advantage.supportHeading}
          colSpan={content.advantage.colSpan}
          colSpanText={content.advantage.colSpanText}
        >
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
            {#each content.advantage.categories as cat}
              <div class="col-span-1 flex flex-col gap-4">
                <h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">{cat.heading}</h2>
                <ul class="list-disc pl-4 grid gap-4 text-[var(--landing-text-secondary)]">
                  {#each cat.bullets as bullet}
                    <li>
                      <span class="font-semibold text-[var(--form-text)]">{bullet.title}</span>{bullet.desc}
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        </Payments>
      </div>

      <TwoColumnWithImage
        contents={content.messageUs}
      >
        <p>
          {content.messageUs.para}
        </p>
        <div class="w-full lg:w-auto">
          <Button link="/contact"   btnClass= "btn-secondary w-full" btnName="Message us" />
        </div>
      </TwoColumnWithImage>
    </div>

    <div slot="secondary" class="">
      <HelpList
        contents={content.help}
      />
      <ThingsYouShould
        thinkKnow={content.thingsYouShould}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
