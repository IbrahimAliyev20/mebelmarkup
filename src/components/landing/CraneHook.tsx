"use client";

import { useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { gsap, pinAware, ScrollTrigger, useGSAP } from "./gsap";
import { FINAL_LABEL } from "./content";
import { BABY_PIVOTS, CrawlingBaby } from "./CrawlingBaby";

/**
 * Kran qarmağı: hero bitəndə ekranın yuxarısından enir, sonra fixed qalıb
 * səhifənin sonuna qədər scroll-la birlikdə trosu uzanır. Scroll sürətinə
 * görə yellənir, hər bölmədə üstündəki lövhə (data-hook) dəyişir.
 *
 * Quruluş: "rig" bir ekran hündürlüyündədir, tros yuxarıdan aşağı uzanır,
 * qarmaq ən altdadır. Rig-i yPercent ilə aşağı sürüşdürmək = trosun uzanması.
 */
export function CraneHook() {
  const rig = useRef<HTMLDivElement>(null);
  const swing = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const baby = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("Haqqımızda");

  useGSAP(() => {
    const content = document.querySelector("#after-hero");
    if (!content) return;

    // inline translateY(-100%) GSAP-da px kimi oxunur, ona görə y sıfırlanır
    gsap.set(rig.current, { y: 0, yPercent: -100 });

    gsap
      .timeline({
        scrollTrigger: {
          trigger: content,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.8,
        },
      })
      // hero bitən an qarmaq kranın trosunda ekrana düşür
      .to(rig.current, { yPercent: -58, ease: "power2.out", duration: 0.07 })
      // sonra səhifə boyu yavaş-yavaş aşağı enir
      .to(rig.current, { yPercent: -18, ease: "none", duration: 0.93 });

    // scroll sürətinə görə yellənmə, dayananda elastik sakitləşmə
    let lastSwing = 0;
    const settle = gsap.delayedCall(0.15, () => {
      lastSwing = 0;
      gsap.to(swing.current, { rotation: 0, duration: 2.2, ease: "elastic.out(1, 0.22)", overwrite: true });
    });
    ScrollTrigger.create({
      trigger: content,
      start: "top bottom",
      end: "bottom top",
      onUpdate(self) {
        const target = gsap.utils.clamp(-6, 6, -self.getVelocity() / 350);
        // hər scroll hadisəsində yeni tween yaratmırıq — yalnız bucaq hiss ediləcək qədər dəyişəndə
        if (Math.abs(target - lastSwing) > 0.25) {
          lastSwing = target;
          gsap.to(swing.current, { rotation: target, duration: 0.5, ease: "power2.out", overwrite: true });
        }
        settle.restart(true);
      },
    });

    /* ---- iməkləyən körpə: hər bölmə keçidində lövhənin o biri başına gedir ---- */
    const babyEl = baby.current!;
    const inner = babyEl.firstElementChild as HTMLElement;
    const limb = (k: string) => babyEl.querySelector<SVGGElement>(`[data-limb="${k}"]`)!;
    const parts = { fa: limb("fa"), ba: limb("ba"), fl: limb("fl"), bl: limb("bl"), body: limb("body"), head: limb("head") };
    const rot = (el: SVGGElement, deg: number, [cx, cy]: readonly [number, number]) =>
      el.setAttribute("transform", `rotate(${deg.toFixed(2)} ${cx} ${cy})`);
    // hər kadrda yeni tween yaratmayan birbaşa yazıcılar
    const setX = gsap.quickSetter(babyEl, "x", "px");
    const setFacing = gsap.quickSetter(inner, "scaleX");

    // lövhə ilə körpənin eni yalnız ekran ölçüsü dəyişəndə dəyişir — scroll zamanı ölçü oxunmur
    // (əvvəl hər kadrda offsetWidth oxunurdu və bu, brauzeri layout-u məcburi hesablamağa vadar edirdi)
    let range = 0;
    const measure = () => (range = Math.max(0, tag.current!.offsetWidth - babyEl.offsetWidth));
    measure();
    ScrollTrigger.addEventListener("refresh", measure);

    const crawl = { p: 0 }; // 0 = sol baş, 1 = sağ baş
    let lastPx = 0;
    let phase = 0;
    let facing = 1;
    const draw = () => {
      const px = crawl.p * range;
      const dx = px - lastPx;
      lastPx = px;
      if (Math.abs(dx) > 0.01) {
        phase += Math.abs(dx) / 4.5; // ~28px-də bir tam addım dövrü
        const next = dx > 0 ? 1 : -1;
        if (next !== facing) setFacing((facing = next));
      }
      setX(px);
      // qarşı tərəflər növbə ilə: ön qol + arxa ayaq, sonra arxa qol + ön ayaq
      const s = Math.sin(phase);
      rot(parts.fa, 20 * s, BABY_PIVOTS.fa);
      rot(parts.ba, -20 * s, BABY_PIVOTS.ba);
      rot(parts.fl, -12 * s, BABY_PIVOTS.fl);
      rot(parts.bl, 12 * s, BABY_PIVOTS.bl);
      parts.body.setAttribute("transform", `translate(0 ${(-0.9 * Math.abs(s)).toFixed(2)})`);
      rot(parts.head, 4 * Math.sin(phase * 2), [58, 24]);
    };
    setFacing(facing);
    draw();

    gsap.utils.toArray<HTMLElement>("[data-hook]").forEach((section, k) => {
      // pin olunan bölmədə ölçü pin-spacer-dən götürülməlidir, yoxsa pin müddəti nəzərə alınmır
      const trigger = pinAware(section);

      // lövhə: bölmə ekranın ortasına çatanda dəyişir
      ScrollTrigger.create({
        trigger,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => self.isActive && setLabel(section.dataset.hook!),
      });

      if (k === 0) return; // "Haqqımızda" — körpə sol başda gözləyir
      const from = (k - 1) % 2 === 0 ? 0 : 1;
      gsap.fromTo(
        crawl,
        { p: from },
        {
          p: 1 - from,
          ease: "none",
          immediateRender: false,
          scrollTrigger: { trigger, start: "top 90%", end: "top 30%", scrub: 0.8 },
          onUpdate: draw,
        },
      );
    });

    return () => ScrollTrigger.removeEventListener("refresh", measure);
  });

  const isFinal = label === FINAL_LABEL;

  return (
    <div
      ref={rig}
      aria-hidden
      style={{ transform: "translateY(-100%)" }}
      className="pointer-events-none fixed right-1 top-0 z-40 h-svh w-[88px] sm:right-2 sm:w-24 md:right-[3vw] md:w-36"
    >
      <div ref={swing} className="flex h-full origin-top flex-col items-center">
        {/* polad tros (iki xətt) */}
        <div className="flex flex-1 gap-[2px]">
          <span className="w-px bg-[#8a94ab]" />
          <span className="w-px bg-[#8a94ab]" />
        </div>

        {/* blok + qarmaq + lövhə */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 60 110" className="w-7 shrink-0 sm:w-9 md:w-12" fill="none">
            <rect x="12.5" y="0.5" width="35" height="33" rx="6" fill="#101e52" stroke="#ffffff" strokeOpacity="0.35" />
            <circle cx="30" cy="17" r="8" fill="#3566e8" />
            <circle cx="30" cy="17" r="3" fill="#101e52" />
            <rect x="27" y="34" width="6" height="14" fill="#2a3870" />
            <path d="M30 48 v20 a18 18 0 1 1 -18 18" stroke="#3566e8" strokeWidth="8" strokeLinecap="round" />
          </svg>

          {/* qarmaqdan asılan lövhə */}
          <div className="-mt-3 flex flex-col items-center">
            <span className="h-4 w-px bg-[#8a94ab]" />
            <div
              ref={tag}
              className={`relative flex w-[88px] items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium shadow-lg transition-colors duration-500 sm:w-[104px] sm:gap-1.5 md:w-[136px] md:py-2 md:text-sm ${
                isFinal ? "bg-brand text-white" : "bg-white text-navy"
              }`}
            >
              {/* iməkləyən körpə lövhənin üst kənarında */}
              <div ref={baby} className="absolute bottom-full left-0 mb-[-3px] h-[22px] w-[34px] sm:h-[26px] sm:w-[40px] md:h-[33px] md:w-[50px]">
                <div className="h-full w-full">
                  <CrawlingBaby />
                </div>
              </div>
              {isFinal && <KeyRound className="h-3.5 w-3.5" />}
              <span key={label} className="animate-in fade-in slide-in-from-bottom-1 whitespace-nowrap">
                {label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
