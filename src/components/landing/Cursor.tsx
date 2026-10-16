"use client";

import { useRef } from "react";
import { device, gsap, useGSAP } from "./gsap";

/**
 * Siçanı yaylı gecikmə ilə izləyən nöqtə. [data-cursor] olan elementin
 * üstündə böyüyüb yazı göstərir, link/düymələrdə bir az böyüyür.
 * Toxunma ekranlarında ümumiyyətlə render olunmur.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!device.hover()) return;
    const el = dot.current!;
    const label = el.querySelector("span")!;
    gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const x = gsap.quickTo(el, "x", { duration: 0.45, ease: "out" });
    const y = gsap.quickTo(el, "y", { duration: 0.45, ease: "out" });

    let mode = "";
    const setMode = (next: string, text = "") => {
      if (next === mode) return;
      mode = next;
      label.textContent = text;
      gsap.to(el, {
        width: next === "label" ? 88 : next === "link" ? 44 : 12,
        height: next === "label" ? 88 : next === "link" ? 44 : 12,
        backgroundColor: next === "label" ? "#3566e8" : next === "link" ? "rgba(53,102,232,0.15)" : "#3566e8",
        duration: 0.35,
        ease: "out",
      });
      gsap.to(label, { autoAlpha: next === "label" ? 1 : 0, scale: next === "label" ? 1 : 0.8, duration: 0.25, ease: "out" });
    };

    // görünmə yalnız pəncərəyə girəndə bir dəfə — əvvəl hər siçan hərəkətində yeni tween yaradılırdı
    let visible = false;
    const move = (e: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to(el, { autoAlpha: 1, duration: 0.2, overwrite: "auto" });
      }
      x(e.clientX);
      y(e.clientY);
      const t = e.target as HTMLElement;
      const labelled = t.closest<HTMLElement>("[data-cursor]");
      if (labelled) setMode("label", labelled.dataset.cursor);
      else if (t.closest("a, button, input, label, canvas")) setMode("link");
      else setMode("dot");
    };
    const leave = () => {
      visible = false;
      gsap.to(el, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
    };
    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  });

  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] grid h-3 w-3 place-items-center rounded-full bg-brand opacity-0"
    >
      <span className="text-xs font-medium text-white opacity-0" />
    </div>
  );
}
