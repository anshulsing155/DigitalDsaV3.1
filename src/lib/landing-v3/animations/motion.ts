// src/lib/landing-v3/animations/motion.ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}


/**
 * Basic Fade Up & Reveal animation
 */
export function fadeUp(element: HTMLElement | null, delay = 0, duration = 0.6) {
  if (!element) return;
  gsap.fromTo(element,
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease: 'power2.out'
    }
  );
}

/**
 * Staggered reveal for grids and lists
 */
export function staggerReveal(container: HTMLElement | null, itemSelector: string, delay = 0) {
  if (!container) return;
  const items = container.querySelectorAll(itemSelector);
  if (items.length === 0) return;
  
  gsap.fromTo(items,
    { opacity: 0, y: 25 },
    {
      opacity: 1,
      y: 0,
      stagger: 0.08,
      duration: 0.6,
      delay,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 85%'
      }
    }
  );
}

/**
 * Continuous float effect
 */
export function floatEffect(element: HTMLElement | null, yAmount = 10, duration = 3, delay = 0) {
  if (!element) return;
  return gsap.to(element, {
    y: `-=${yAmount}`,
    duration,
    delay,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });
}

/**
 * 3D Mouse Tilt effect
 */
export function setupTilt(element: HTMLElement | null, maxTilt = 8) {
  if (!element) return;
  
  const handleMouseMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    const tiltX = (-(y - yc) / yc) * maxTilt;
    const tiltY = ((x - xc) / xc) * maxTilt;
    
    gsap.to(element, {
      rotateX: tiltX,
      rotateY: tiltY,
      transformPerspective: 1000,
      ease: 'power2.out',
      duration: 0.3
    });
  };
  
  const handleMouseLeave = () => {
    gsap.to(element, {
      rotateX: 0,
      rotateY: 0,
      transformPerspective: 1000,
      ease: 'power2.out',
      duration: 0.5
    });
  };
  
  element.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);
  };
}

/**
 * Scroll reveal utilizing ScrollTrigger
 */
export function scrollReveal(element: HTMLElement | null, startOffset = 'top 85%') {
  if (!element) return;
  gsap.fromTo(element,
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: element,
        start: startOffset
      }
    }
  );
}
