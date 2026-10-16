"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);

// mobildə ünvan sətri gizlənib-açılanda bütün trigger-lər yenidən hesablanmasın (sıçrayış yaradırdı)
ScrollTrigger.config({ ignoreMobileResize: true });

// Emil Kowalski-nin güclü əyriləri: giriş üçün ease-out, ekranda hərəkət üçün ease-in-out.
CustomEase.create("out", "0.23, 1, 0.32, 1");
CustomEase.create("inOut", "0.77, 0, 0.175, 1");

export { gsap, ScrollTrigger, SplitText, useGSAP };

/**
 * Pin olunan bölmənin ölçüsü pin-spacer-dən götürülməlidir — yoxsa trigger pin müddətini
 * nəzərə almır. Pin olunmayan element olduğu kimi qaytarılır.
 */
export function pinAware(el: HTMLElement): HTMLElement {
  const parent = el.parentElement;
  return parent?.classList.contains("pin-spacer") ? parent : el;
}

/** Cihaz yoxlamaları (yalnız client-də çağırın). */
export const device = {
  /** siçanlı cihaz — hover effektləri və custom cursor üçün */
  hover: () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  /** desktop düzülüşü (lg) */
  desktop: () => window.matchMedia("(min-width: 1024px)").matches,
  /** telefon / planşet: ağır effektlər sadələşdirilir */
  lowPower: () => window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches,
};

/**
 * Sətir-sətir maskadan qalxan başlıq.
 * autoSplit: şrift gec yüklənəndə və en dəyişəndə (ekranı döndərmək) sətirlər yenidən bölünür,
 * animasiya isə qaldığı yerdən davam edir — əks halda sətirlər köhnə ölçüyə görə qalırdı.
 * Maska aşağıdan 0.25em geniş kəsir (globals.css → `.split-line-mask`), ona görə sətir 130%-dən qalxır.
 */
export function revealLines(target: string | Element, scrollTrigger: ScrollTrigger.Vars, vars: gsap.TweenVars = {}) {
  return SplitText.create(target, {
    type: "lines",
    mask: "lines",
    linesClass: "split-line",
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 130,
        duration: 1.3,
        ease: "out",
        stagger: 0.1,
        scrollTrigger: { ...scrollTrigger },
        ...vars,
      }),
  });
}
