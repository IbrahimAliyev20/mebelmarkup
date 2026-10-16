"use client";

import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP } from "./gsap";
import { ROOF_TOP, TOTAL_FLOORS } from "./tower";
import { FACTS, floorInfo } from "./content";
import { intro } from "./frames";
import { createQuietGate } from "./quiet";
import type { TowerScene } from "./towerScene";

/*
 * "Hər mərtəbə, bir baxışda" — real 3D bina (Sketchfab, CC-BY).
 * Scroll: bina aşağıdan yuxarı "tikilir", solda rəqəmlər sayılır, sonda mərtəbə kartı açılır.
 *
 * Performans: three.js və səhnə (towerScene.ts) dinamik yüklənir — ilk açılış paketinə düşmür.
 * Səhnə istifadəçi bölməyə çatmazdan əvvəl hazırlanır (model, HDRI, şeyder kompilyasiyası), həm də
 * kiçik addımlarla və yalnız istifadəçi scroll ETMƏYƏNDƏ (quiet.ts) — hazırlıq heç vaxt scroll-u tutmur.
 */

const formatFact = (n: number, year: boolean) =>
  year ? String(n) : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const START_FLOOR = 6;

export function Building3D() {
  const root = useRef<HTMLElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => floorInfo(START_FLOOR));

  useGSAP(
    () => {
      const el = holder.current!;
      // scroll vəziyyəti — 3D səhnə hazır olmasa da timeline bunu yeniləyir
      const view = { rotationY: -1.0, clipH: 0, selecting: false };
      let tower: TowerScene | null = null;
      let disposed = false;

      /* ---- 3D səhnəni bir dəfə, əvvəlcədən hazırla ---- */
      const gate = createQuietGate();
      let started = false;
      const start = () => {
        if (started || disposed) return;
        started = true;
        import("./towerScene")
          .then(({ createTowerScene }) =>
            createTowerScene(el, { initialFloor: START_FLOOR, onFloor: (i) => setActive(floorInfo(i)), step: gate.wait }),
          )
          .then((t) => {
            if (disposed) t.dispose();
            else tower = t;
          })
          .catch(() => {
            /* WebGL yoxdursa bölmə mətnlə qalır */
          });
      };
      // hero-nun ilk kadrı görünəndən sonra, ilk sakit anda başlayır. İstifadəçi buna imkan vermədən
      // bölməyə 1.5 ekran yaxınlaşıbsa — gözləmədən (addımlar yenə də ayrı-ayrı tapşırıqlardır).
      const offIntro = intro.onFinish(() => void gate.wait().then(start));
      const near = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          gate.hurry();
          start();
        },
        { rootMargin: "150% 0px" },
      );
      near.observe(el);

      /* ---- render: yalnız görünəndə ---- */
      const tick = () => tower?.frame(view);
      const io = new IntersectionObserver(([entry]) =>
        entry.isIntersecting ? gsap.ticker.add(tick) : gsap.ticker.remove(tick),
      );
      io.observe(el);

      /* ---- scroll: bina aşağıdan yuxarı tikilir, fırlanır ---- */
      const st = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top top", end: "+=200%", pin: true, scrub: 1, anticipatePin: 1 },
        // seçim bina tam tikiləndən sonra açılır
        onUpdate: () => void (view.selecting = st.progress() > 0.82),
      });
      st.fromTo(view, { rotationY: -1.0 }, { rotationY: 0.3, ease: "none", duration: 1 }, 0);
      st.fromTo(view, { clipH: 0 }, { clipH: ROOF_TOP + 0.5, ease: "none", duration: 0.62 }, 0);

      // bina tikilərkən rəqəmlər bir-bir gəlir və scroll ilə sayılır
      gsap.utils.toArray<HTMLElement>(".b3d-fact").forEach((el, i) => {
        const at = 0.04 + i * 0.13;
        const num = el.querySelector<HTMLElement>(".b3d-num")!;
        const end = Number(num.dataset.value);
        const year = end > 2000 && end < 2100;
        const c = { v: year ? 1990 : 0 };
        st.from(el, { autoAlpha: 0, y: 28, duration: 0.08, ease: "out" }, at).to(
          c,
          {
            v: end,
            ease: "none",
            // "mərtəbə" rəqəmi bina qalxdıqca artır
            duration: i === 0 ? 0.62 - at : 0.18,
            onUpdate: () => (num.textContent = formatFact(Math.round(c.v), year)),
          },
          at,
        );
      });
      // bina hazırdır: rəqəmlər çəkilir, mərtəbə seçimi açılır
      st.to(".b3d-facts", { autoAlpha: 0, y: -24, duration: 0.06, ease: "out" }, 0.78);
      st.from(".b3d-panel", { autoAlpha: 0, y: 30, duration: 0.1, ease: "out" }, 0.84);

      return () => {
        disposed = true;
        offIntro();
        gate.dispose();
        near.disconnect();
        io.disconnect();
        gsap.ticker.remove(tick);
        tower?.dispose();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} id="mertebeler" data-hook="Mərtəbələr" className="relative h-svh overflow-hidden bg-paper">
      <div ref={holder} className="absolute inset-0" />

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between gap-6 pb-6 pl-5 pr-hook pt-24 md:pl-10 md:pb-10 lg:w-[42%] lg:justify-start lg:gap-12 lg:pr-10 lg:pb-8 lg:pt-28">
        <div>
          <h2 className="font-display text-4xl leading-[0.95] sm:text-5xl md:text-6xl lg:text-[4.6vw]">
            Hər mərtəbə, <span className="text-brand">bir baxışda</span>
          </h2>
        </div>

        {/* rəqəmlər və mərtəbə paneli eyni yeri paylaşır: əvvəl rəqəmlər, bina hazır olanda panel */}
        {/* mobildə aşağı blok: binanın üstündə oxunsun deyə yumşaq ağ fon keçidi */}
        <div className="-mx-5 -mb-6 grid bg-gradient-to-t from-paper via-paper/95 to-transparent px-5 pb-6 pt-10 md:-mx-10 md:-mb-10 md:px-10 md:pb-10 lg:m-0 lg:bg-none lg:p-0">
          <div className="b3d-facts grid grid-cols-2 gap-x-5 self-start sm:gap-x-8 md:grid-cols-4 lg:grid-cols-2 border-t border-navy/15 [grid-area:1/1]">
            {FACTS.map((f) => (
              <div key={f.unit} className="b3d-fact border-b border-navy/10 py-3 sm:py-5">
                <p className="font-display leading-none text-navy">
                  <span className="b3d-num block whitespace-nowrap text-[2rem] tabular-nums sm:text-5xl md:text-6xl" data-value={f.value}>
                    0
                  </span>
                  <span className="mt-1 block text-lg text-brand sm:text-xl md:text-2xl">{f.unit}</span>
                </p>
                <p className="mt-2 hidden max-w-[24ch] text-sm leading-snug text-navy/55 lg:block">{f.note}</p>
              </div>
            ))}
          </div>

          <div className="b3d-panel pointer-events-auto relative max-w-md self-start overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-[#f3f7ff] via-[#e6eeff] to-[#d4e1ff] p-7 shadow-[0_30px_70px_-35px_rgba(16,30,82,0.45)] [grid-area:1/1] max-lg:p-5 lg:p-8">
            {/* yumşaq işıq ləkəsi — kartı canlı göstərir */}
            <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/70 blur-3xl" />
            <div className="flex items-baseline justify-between gap-4">
              <p className="relative font-display text-5xl leading-none tabular-nums text-navy sm:text-6xl">
                {String(active.floor).padStart(2, "0")}
                <span className="ml-2 align-middle text-base text-navy/50">/ {TOTAL_FLOORS} mərtəbə</span>
              </p>
              <span
                className={`relative rounded-full px-3 py-1 text-xs font-medium ${
                  active.free ? "bg-white text-brand shadow-sm" : "bg-white/60 text-navy/50"
                }`}
              >
                {active.free ? `${active.free} boş mənzil` : "Mağazalar"}
              </span>
            </div>
            <dl className="relative mt-6 grid grid-cols-2 gap-4 border-t border-navy/10 pt-5 text-sm">
              <div>
                <dt className="text-navy/50">1 m²</dt>
                <dd className="font-medium tabular-nums">{active.price.toLocaleString("ru-RU")} AZN</dd>
              </div>
              <div>
                <dt className="text-navy/50">Mənzərə</dt>
                <dd className="font-medium">{active.view}</dd>
              </div>
            </dl>
            <a
              href="#elaqe"
              className="press relative mt-6 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-[gap] duration-200 ease-out hover:gap-3"
            >
              Bu mərtəbəyə baxış
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
