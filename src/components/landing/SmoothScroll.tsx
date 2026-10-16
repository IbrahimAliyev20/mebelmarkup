"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";

/**
 * Siçanlı cihazlarda Lenis ətalətli scroll (GSAP ticker-ə bağlı — ScrollTrigger hər kadrda sinxron).
 * Toxunma ekranlarında Lenis heç nəyi hamarlaşdırmır, amma hər kadrda işləyirdi və nativ ətalətli
 * scroll-a qarışırdı — telefonda brauzerin öz scroll-u qalır.
 */
export function SmoothScroll() {
  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    let lenis: Lenis | null = null;
    let raf: ((time: number) => void) | null = null;
    if (window.matchMedia("(pointer: fine)").matches) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
      lenis.on("scroll", ScrollTrigger.update);
      raf = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    // anchor linkləri də hamar getsin
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      const id = a.getAttribute("href")!;
      if (lenis) lenis.scrollTo(id === "#" ? 0 : id, { duration: 1.6 });
      else if (id === "#") window.scrollTo({ top: 0, behavior: "smooth" });
      else document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      if (raf) gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, []);

  return null;
}
