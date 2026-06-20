<script lang="ts">
    import { onMount } from "svelte";
    import LoanFactors from "./LoanFactors.svelte";
    import ExampleCalculations from "./ExampleCalculations.svelte";
    import BankComparison from "./BankComparison.svelte";
    import Calculator from "./Calculator.svelte";
    import FAQ from "./FAQ.svelte";
    import Seo from "$lib/components/Seo.svelte";
    import Sublist from "$lib/components/website/Sublist.svelte";
    import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
    import content from "$lib/data/website/businessLoanEligibility.json";

    const { subList, pageData, seo } = content;

    // Active section tracking
    let activeSection = $state(subList[0].url);

    // Intersection Observer for highlighting active section
    onMount(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        activeSection = `#${entry.target.id}`;
                    }
                });
            },
            { threshold: 0.5 },
        );

        subList.forEach((item) => {
            const section = document.querySelector(item.url);
            if (section) observer.observe(section);
        });

        return () => observer.disconnect();
    });
</script>

<Seo
    type={seo.type}
    title={seo.title}
    image={seo.image}
    description={seo.description}
    url={seo.url}
    keywords={seo.keywords}
/>

<NewPageLayout {pageData}>
    <Sublist {subList} />
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section id="factors" class="mb-4">
            <LoanFactors />
        </section>
        <section id="calculations" class="mb-4">
            <ExampleCalculations />
        </section>
        <section id="comparison" class="mb-4">
            <BankComparison />
        </section>
        <section id="calculator" class="mb-4">
            <Calculator />
        </section>
        <section id="faq" class="mb-4">
            <FAQ />
        </section>
    </div>
</NewPageLayout>

<style>
    :global(section) {
        scroll-margin-top: 80px; /* Adjust based on header height */
    }
</style>
