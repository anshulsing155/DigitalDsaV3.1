<!-- src/lib/landing-v3/components/ModernStack.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Section from './shared/Section.svelte';
  import Container from './shared/Container.svelte';
  import Button from './shared/Button.svelte';
  import Grid from './shared/Grid.svelte';
  import { scrollReveal } from '../animations/motion';
  
  import { Terminal, Activity, MonitorPlay } from 'lucide-svelte';

  let containerEl = $state<HTMLElement | null>(null);

  onMount(() => {
    if (containerEl) {
      scrollReveal(containerEl);
    }
  });
</script>

<Section id="modern-stack" class="bg-[#FAF9F5] border-t border-[#E5E3DC]/30">
  <Container>
    <div 
      bind:this={containerEl}
      class="w-full bg-[#111111] text-white rounded-[40px] p-8 sm:p-16 shadow-2xl relative overflow-hidden opacity-0 select-none text-left"
    >
      
      <!-- Backdrop glow details -->
      <div class="absolute top-[20%] left-[30%] w-[300px] h-[300px] bg-[#84CC16]/5 rounded-full blur-[80px] pointer-events-none z-0"></div>
      
      <!-- Section heading inside the black box -->
      <div class="relative z-10 max-w-2xl flex flex-col gap-6 mb-16">
        <span class="w-max px-3 py-1 text-[11px] font-mono tracking-wider text-[#A3E635] uppercase bg-[#A3E635]/10 border border-[#A3E635]/20 rounded-full">
          Developer Suite
        </span>
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
          A modern stack for modern agents
        </h2>
        <p class="text-sm sm:text-base leading-relaxed text-zinc-400">
          Leverage our robust APIs, webhooks, and embedded SDK widgets to embed loan sourcing engines into your CRM, customer apps, or digital portals.
        </p>

        <!-- CTA buttons row -->
        <div class="flex items-center gap-6 mt-2">
          <Button variant="primary" href="#cta" class="py-2.5 px-6">
            Request Demo &rarr;
          </Button>
          <a href="#api-docs" class="text-xs sm:text-sm font-bold text-white hover:text-[#A3E635] transition-colors flex items-center gap-1">
            API Documentation &rarr;
          </a>
        </div>
      </div>

      <!-- 3-Column Layout inside the black box -->
      <Grid cols={3} gap="lg" class="relative z-10 border-t border-zinc-800 pt-16">
        
        <!-- Col 1: GraphQL API Mock -->
        <div class="flex flex-col gap-4">
          <div class="h-44 rounded-2xl bg-zinc-950 border border-zinc-850/80 p-4 font-mono text-[10px] text-zinc-400 overflow-hidden relative">
            <div class="flex items-center justify-between border-b border-zinc-900 pb-2 mb-3 text-zinc-650">
              <span class="flex items-center gap-1.5"><Terminal class="h-3.5 w-3.5 text-[#84CC16]" /> checkEligibility.gql</span>
              <span class="text-[8px] font-bold bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500">POST</span>
            </div>
            <!-- Code text with syntax highlight colors -->
            <pre class="leading-relaxed text-zinc-300">
<span class="text-[#38BDF8]">query</span> <span class="text-[#FACC15]">checkLoanMatch</span> &#123;
  <span class="text-[#A3E635]">matcher</span>(income: <span class="text-[#F87171]">120000</span>) &#123;
    <span class="text-[#E2E8F0]">recommendedLender</span>
    <span class="text-[#E2E8F0]">interestRate</span>
    <span class="text-[#E2E8F0]">eligibilityScore</span>
  &#125;
&#125;</pre>
          </div>
          <div class="flex flex-col gap-2">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Terminal class="h-4.5 w-4.5 text-[#84CC16]" /> GraphQL API
            </h3>
            <p class="text-xs text-zinc-450 leading-relaxed">
              Build custom loan journeys utilizing high-speed GraphQL queries. Expressive schema with robust testing frameworks.
            </p>
          </div>
        </div>

        <!-- Col 2: Webhooks Logs Mock -->
        <div class="flex flex-col gap-4">
          <div class="h-44 rounded-2xl bg-zinc-950 border border-zinc-850/80 p-4 font-mono text-[10px] text-zinc-450 overflow-hidden relative">
            <div class="flex items-center justify-between border-b border-zinc-900 pb-2 mb-3 text-zinc-650">
              <span class="flex items-center gap-1.5"><Activity class="h-3.5 w-3.5 text-emerald-400" /> Webhook Event Stream</span>
              <div class="flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-[8px] text-emerald-500 uppercase font-bold">Live</span>
              </div>
            </div>
            <!-- Event stream -->
            <div class="space-y-2 text-[9px]">
              <div class="flex items-center justify-between text-zinc-300">
                <span class="text-[#84CC16]">loan.status_approved</span>
                <span class="text-emerald-400 font-bold bg-emerald-950/30 px-1.5 rounded border border-emerald-900/40">200 OK</span>
              </div>
              <div class="text-[8px] text-zinc-500 border-l-2 border-zinc-850 pl-2">
                "file_id": "8923", "score": "98%"
              </div>
              <div class="flex items-center justify-between text-zinc-500">
                <span>payout.initiated</span>
                <span class="bg-zinc-900 px-1.5 rounded text-zinc-650">200 OK</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Activity class="h-4.5 w-4.5 text-[#84CC16]" /> Webhooks & Real-time
            </h3>
            <p class="text-xs text-zinc-450 leading-relaxed">
              Get notified of loan processing status, file queries, and payouts instantly via event-driven webhook payloads.
            </p>
          </div>
        </div>

        <!-- Col 3: Embedded API Response View -->
        <div class="flex flex-col gap-4">
          <div class="h-44 rounded-2xl bg-zinc-950 border border-zinc-850/80 p-4 font-mono text-[10px] text-zinc-450 overflow-hidden relative flex flex-col justify-between">
            <div class="flex items-center justify-between border-b border-zinc-900 pb-2 text-zinc-650">
              <span class="flex items-center gap-1.5"><MonitorPlay class="h-3.5 w-3.5 text-blue-400" /> API JSON Response</span>
              <span class="text-[8px] font-bold bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500">SUCCESS</span>
            </div>
            <!-- Response JSON visual -->
            <pre class="text-[9px] text-zinc-350 leading-normal pl-1 mb-1">
&#123;
  <span class="text-[#38BDF8]">"status"</span>: <span class="text-[#A3E635]">"MATCHED"</span>,
  <span class="text-[#38BDF8]">"yield"</span>: <span class="text-[#F87171]">9.85</span>,
  <span class="text-[#38BDF8]">"lenders"</span>: [<span class="text-[#A3E635]">"SBI"</span>, <span class="text-[#A3E635]">"HDFC"</span>]
&#125;</pre>
            <div class="text-[8px] text-zinc-650 text-center border-t border-zinc-900/50 pt-1">Response time: 42ms</div>
          </div>
          <div class="flex flex-col gap-2">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <MonitorPlay class="h-4.5 w-4.5 text-[#84CC16]" /> JSON Response
            </h3>
            <p class="text-xs text-zinc-450 leading-relaxed">
              Receive structured payload arrays mapping exact interest rates and qualifying conditions from direct bank matrices.
            </p>
          </div>
        </div>

      </Grid>

    </div>
  </Container>
</Section>
