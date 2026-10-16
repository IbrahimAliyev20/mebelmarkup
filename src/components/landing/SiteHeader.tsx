"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { pinAware, ScrollTrigger, useGSAP } from "./gsap";
import { BRAND } from "./content";

/**
 * Header-in fonu altındakı bölməyə görə:
 *  - hero-da şəffaf (video görünsün)
 *  - açıq bölmələrdə ağ fon + tünd yazı (məzmun loqonun altına düşməsin)
 *  - tünd bölmələrdə (əlaqə, footer) tünd fon + ağ yazı
 * Keçid CSS transition ilə — scroll zamanı JS animasiyası yoxdur.
 */
export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    const header = ref.current!;
    // header-in altındakı tünd bölmələrin sayı — 0-dırsa header tünd göy olur
    let active = 0;
    document.querySelectorAll<HTMLElement>("[data-dark]").forEach((section) => {
      ScrollTrigger.create({
        // pin olunan bölmədə ölçü pin-spacer-dən götürülür ki, pin müddəti də sayılsın
        trigger: pinAware(section),
        start: "top 40px",
        end: "bottom 40px",
        onToggle(self) {
          active = Math.max(0, active + (self.isActive ? 1 : -1));
          header.setAttribute("data-on-dark", String(active > 0));
        },
      });
    });

    const hero = document.querySelector<HTMLElement>("[data-hero]");
    if (hero) {
      ScrollTrigger.create({
        trigger: pinAware(hero),
        start: "top 40px",
        end: "bottom 40px",
        onToggle: (self) => header.setAttribute("data-in-hero", String(self.isActive)),
      });
    }
  });

  return (
    <header
      ref={ref}
      data-on-dark="true"
      data-in-hero="true"
      className="group fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-white px-5 py-4 text-navy shadow-[0_1px_0_rgba(16,30,82,0.08)] transition-[background-color,color,box-shadow] duration-300 data-[on-dark=true]:bg-[#080e22] data-[on-dark=true]:text-white data-[on-dark=true]:shadow-[0_1px_0_rgba(255,255,255,0.08)] data-[in-hero=true]:!bg-transparent data-[in-hero=true]:!shadow-none md:px-10 md:py-5"
    >
      <a href="#" className="font-display text-3xl">
        {BRAND}
      </a>
      <nav className="flex items-center gap-8 text-[15px]">
        <a href="#menziller" className="hidden transition-opacity duration-200 hover:opacity-60 md:inline">
          Mənzillər
        </a>
        <a
          href="#elaqe"
          className="press inline-flex items-center gap-2 rounded-full border border-current px-5 py-2.5 transition-colors duration-200 hover:bg-navy hover:text-white group-data-[on-dark=true]:hover:bg-white group-data-[on-dark=true]:hover:text-navy"
        >
          Əlaqə <ArrowRight className="h-4 w-4" />
        </a>
      </nav>
    </header>
  );
}
