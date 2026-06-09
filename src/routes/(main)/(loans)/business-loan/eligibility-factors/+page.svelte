<script lang="ts">
    import { onMount } from "svelte";
    import LoanFactors from "./LoanFactors.svelte";
    import ExampleCalculations from "./ExampleCalculations.svelte";
    import Calculator from "./Calculator.svelte";
    import FAQ from "./FAQ.svelte";
    import Seo from "$lib/components/Seo.svelte";
    import Sublist from "$lib/components/website/Sublist.svelte";
    import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";

    // Define sublist with type safety
    interface SubListItem {
        linkName: string;
        url: string;
        icon: string;
        altName: string;
    }

    const subList: SubListItem[] = [
        {
            linkName: "Eligibility Factors",
            url: "#factors",
            icon: "/icons/businessInsights.svg",
            altName: "factors-icon",
        },
        {
            linkName: "Example Calculations",
            url: "#calculations",
            icon: "/icons/calc.svg",
            altName: "calc-icon",
        },
        {
            linkName: "Bank Comparison",
            url: "#comparison",
            icon: "/icons/comparison.svg",
            altName: "comparison-icon",
        },
        {
            linkName: "Calculator",
            url: "#calculator",
            icon: "/icons/calc.svg",
            altName: "calculator-icon",
        },
        {
            linkName: "FAQ",
            url: "#faq",
            icon: "/icons/faq.svg",
            altName: "faq-icon",
        },
    ];

    // Page data with improved structure
    const pageData = {
        coverImage:
            "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
        coverAlt: "Business loan eligibility factors",
        classStyle:
            "object-cover w-full h-[50vh] sm:h-[60vh] lg:h-[80vh] xl:h-[90vh] 3xl:max-h-[60vh]",
        heading: "Business Loan Eligibility Factors",
        subHeading:
            "Learn the critical factors that influence your business loan eligibility and actionable steps to strengthen your application.",
    };

    // Active section tracking
    let activeSection: string = subList[0].url;

    // Smooth scroll to section
    const scrollToSection = (url: string) => {
        const element = document.querySelector(url);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            activeSection = url;
        }
    };

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
    type="WebPage"
    title="Business Loan Eligibility Factors - Requirements & Criteria"
    image="/images/business-loan.jpg"
    description="Explore key business loan eligibility factors, including credit score, documentation, and financial metrics. Get tips to improve your approval chances."
    canonical="https://yourwebsite.com/business-loan-eligibility"
    keywords="business loan eligibility, loan requirements, credit score, financial metrics, loan approval"
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
