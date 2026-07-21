<!-- src/lib/landing-v2/components/ui/InteractiveBackground.svelte -->
<script lang="ts">
  interface Props {
    isDark?: boolean;
  }
  let { isDark = true }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);

  $effect(() => {
    if (!canvasEl) return;
    const canvas = canvasEl;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let scrollY = 0;

    // Handles resizing
    function handleResize() {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    // Scroll listener for parallax grids
    function handleScroll() {
      scrollY = window.scrollY;
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Mouse coordinates in viewport spaces
    let mouse = { x: -9999, y: -9999, radius: 180 };
    function handleMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function handleMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Particles/Nodes setup
    const nodeCount = Math.min(Math.floor((width * height) / 28000), 45);
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.5 + 0.8
      });
    }

    // Grid details
    const gridSize = 80;
    const pulses: Array<{
      pos: number;
      coord: number; // horizontal line row coordinate or vertical line col coordinate
      direction: 'h' | 'v';
      speed: number;
    }> = [];

    function spawnPulse() {
      if (pulses.length > 5) return;
      const isHorizontal = Math.random() > 0.5;
      if (isHorizontal) {
        // travels horizontal
        const rowOffset = (scrollY * 0.2) % gridSize;
        const potentialRows = [];
        for (let y = -rowOffset; y < height; y += gridSize) {
          potentialRows.push(y);
        }
        const row = potentialRows[Math.floor(Math.random() * potentialRows.length)];
        pulses.push({
          pos: 0,
          coord: row,
          direction: 'h',
          speed: Math.random() * 1.5 + 1.5
        });
      } else {
        // travels vertical
        const col = Math.floor(Math.random() * (width / gridSize)) * gridSize;
        pulses.push({
          pos: 0,
          coord: col,
          direction: 'v',
          speed: Math.random() * 1.5 + 1.5
        });
      }
    }

    // Render loop
    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Render coordinates grid
      ctx.strokeStyle = isDark ? 'rgba(39, 39, 42, 0.25)' : 'rgba(228, 228, 231, 0.6)';
      ctx.lineWidth = 0.5;
      
      // Vertical lines
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal lines with scroll parallax offsets
      const gridOffset = (scrollY * 0.2) % gridSize;
      for (let y = -gridOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Grid Pulses
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = isDark ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.4)';
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        ctx.beginPath();
        if (p.direction === 'h') {
          p.pos += p.speed;
          // Apply scroll-parallax drift to horiz pulses
          const currentY = p.coord;
          ctx.moveTo(p.pos - 50, currentY);
          ctx.lineTo(p.pos, currentY);
          if (p.pos > width + 50) pulses.splice(i, 1);
        } else {
          p.pos += p.speed;
          ctx.moveTo(p.coord, p.pos - 50);
          ctx.lineTo(p.coord, p.pos);
          if (p.pos > height + 50) pulses.splice(i, 1);
        }
        ctx.stroke();
      }

      // Spawn pulses randomly
      if (Math.random() < 0.005) spawnPulse();

      // Render Nodes & Mouse Magnetic Pull
      nodes.forEach((node) => {
        // Constant drift
        node.x += node.vx;
        node.y += node.vy;

        // Bounce
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Mouse gravity pull
        if (mouse.x !== -9999) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            node.x += (dx / dist) * force * 0.45;
            node.y += (dy / dist) * force * 0.45;
          }
        }

        // Draw dot
        ctx.fillStyle = isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.55)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connecting lines between nodes
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = ((120 - dist) / 120) * 0.16;
            ctx.strokeStyle = isDark ? `rgba(6, 182, 212, ${alpha})` : `rgba(6, 182, 212, ${alpha * 2})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Connect to cursor
        if (mouse.x !== -9999) {
          const dx = n1.x - mouse.x;
          const dy = n1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const alpha = ((mouse.radius - dist) / mouse.radius) * 0.25;
            ctx.strokeStyle = isDark ? `rgba(6, 182, 212, ${alpha})` : `rgba(6, 182, 212, ${alpha * 2.2})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  });
</script>

<canvas 
  bind:this={canvasEl} 
  class="fixed inset-0 w-screen h-screen pointer-events-none z-0 overflow-hidden"
></canvas>
