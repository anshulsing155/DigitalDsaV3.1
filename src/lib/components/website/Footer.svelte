<script>
  import content from "$lib/data/website/footer.json";

  const { footerList, ownershipText, copyrightPrefix, copyrightSuffix } = content;

	function goToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	let currentYear = new Date().getFullYear();
</script>

<section class="border-[var(--form-border)] relative z-20 w-full border-t bg-[var(--landing-bg)]">
	<div class="relative">
		<div class="relative mx-auto flex w-full flex-col gap-4 lg:w-11/12 xl:w-10/12 2xl:w-[89.5%]">
			<nav
				class="grid grid-cols-1 gap-[2rem] px-2 pt-[4rem] sm:grid-cols-2 md:gap-[4rem] lg:grid-cols-4 lg:px-[4rem]"
			>
				{#each footerList as section}
					{#each Object.entries(section) as [title, items]}
						<div>
							<h3
								class="mb-4 typography-label text-[var(--form-text)] underline underline-offset-4 decoration-primary"
							>
								{title}
							</h3>
							<ul>
								{#each items as item}
									<a
										href={item.link}
										target={item.link.includes('http') ? '_blank' : '_self'}
										class="mb-2 flex items-center gap-2 underline-offset-4 hover:underline typography-body-sm !text-[var(--form-text-secondary)]"
										>{#if item.icon}
											<img src={item.icon} alt={item.altIcon} class="h-[1.5rem]" />
										{/if}
										{item.list}</a
									>
								{/each}
							</ul>
						</div>
					{/each}
				{/each}
			</nav>
			<div class="bg-dividerColor h-[1px] w-full"></div>

      <div
        class="flex flex-col items-center justify-center gap-2 px-[1rem] py-4 text-center lg:px-[4rem] typography-label-description !text-[var(--form-text-secondary)]"
      >
        <p>
          {ownershipText}
        </p>
        <p>
          {copyrightPrefix}{currentYear}{copyrightSuffix}
        </p>
      </div>

			<button
				onclick={goToTop}
				type="button"
				aria-label="Go to Top"
				class="btn-primary absolute -top-[2.5rem] right-2 flex h-[4rem] w-[4rem] cursor-pointer items-center justify-center hover:opacity-90"
			>
				<i class="fa-solid fa-angle-up"></i>
			</button>
		</div>
	</div>
</section>

