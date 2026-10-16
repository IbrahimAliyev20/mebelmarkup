"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { gsap, SplitText, useGSAP } from "./gsap";
import { FRAME_COUNT, frames, intro } from "./frames";
import { HERO_STAGES as STAGES } from "./content";

/**
 * Hero: 120 frame canvas-a çəkilir, scroll hansı frame-in görünəcəyini idarə edir.
 * Scroll tikintini oynadır; sonda bina işıqlanır və "Eviniz hazırdır." kompozisiyası açılır.
 *
 * Performans: frame-lər 1440px-dir, ona görə canvas DPR 1-də saxlanılır (DPR 2-də
 * hər kadrda 4 dəfə çox piksel çəkilirdi və scroll donurdu). Scroll zamanı blur yoxdur.
 */
export function HeroSequence() {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d", { alpha: false })!;
      const state = { frame: 0 };
      let lastDrawn = -1;

      frames.start();

      const draw = (img: ImageBitmap, alpha: number) => {
        const cw = canvas.width;
        const ch = canvas.height;
        const scale = Math.max(cw / img.width, ch / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      };

      // yalnız əvvəlcədən (arxa axında) açılmış kadrlar çəkilir — əsas axında decode yoxdur
      function render(force = false) {
        const f = Math.round(state.frame * 20) / 20; // 0.05 addımla — eyni kadrı təkrar çəkməyək
        if (!force && f === lastDrawn) return;
        const i = Math.floor(f);
        frames.focus(i);
        const exact = frames.bitmap(i);
        const base = exact ?? frames.nearest(i);
        if (!base) return;
        lastDrawn = exact ? f : -1; // dəqiq kadr gələndə yenidən çəkilsin
        draw(base, 1);
        const t = f - i;
        // qonşu frame-lər arasında crossfade — 120 frame 240 kimi axır
        const next = exact && i + 1 < FRAME_COUNT ? frames.bitmap(i + 1) : null;
        if (next && t > 0.04) draw(next, t);
        ctx.globalAlpha = 1;
      }

      // ölçü həqiqətən dəyişəndə — canvas.width-i eyni dəyərə yazmaq belə buferi silib yenidən ayırır
      // (telefonda ünvan sətri gizlənəndə "resize" gəlir, amma h-svh canvas-ın ölçüsü dəyişmir)
      const resize = () => {
        const w = Math.round(canvas.clientWidth);
        const h = Math.round(canvas.clientHeight);
        if (w === canvas.width && h === canvas.height) return;
        canvas.width = w;
        canvas.height = h;
        render(true);
      };
      resize();
      window.addEventListener("resize", resize);
      const unsubscribe = frames.onBitmap((i) => {
        if (Math.abs(i - state.frame) < 2) render(true);
        // preloader yoxdur: birinci kadr hazır olan kimi UI çıxır, qalanları arxa planda yüklənir
        if (i === 0) intro.finish();
      });
      if (frames.bitmap(0)) intro.finish();

      /* ---- giriş (birinci kadr yüklənəndə) ---- */
      gsap.set(".hero-ui", { autoAlpha: 0, y: 16 });

      let introTl: gsap.core.Timeline | null = null;
      const off = intro.onFinish(() => {
        introTl = gsap
          .timeline()
          .to(".hero-ui", { autoAlpha: 1, y: 0, duration: 1, ease: "out", stagger: 0.08 }, 0.2);
      });

      /* ---- scroll ---- */
      const final = new SplitText(".hero-final h2", { type: "words,lines", mask: "lines" });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=650%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl.to(state, { frame: FRAME_COUNT - 1, duration: 1, onUpdate: () => render() }, 0)
        .fromTo(canvas, { scale: 1.12 }, { scale: 1, duration: 1 }, 0)
        // fromTo + immediateRender:false — başlanğıc dəyərlər sabitdir, giriş animasiyası ilə toqquşmur
        .fromTo(".hero-hint", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.03, immediateRender: false }, 0)
        // sonda: sol tərəf tünd göy kölgə ilə qaralır, mətn oxunaqlı olur
        .fromTo(".hero-shade", { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.8)
        .fromTo(final.lines, { yPercent: 110 }, { yPercent: 0, duration: 0.08, stagger: 0.02, ease: "out" }, 0.84)
        .fromTo(
          [".hero-final p", ".hero-final a"],
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.02, ease: "out" },
          0.9,
        )
        .to(".hero-ui-bottom", { autoAlpha: 0, duration: 0.05 }, 0.88);

      /* ---- tikinti göstəricisi: nazik xətt + hərəkət edən marker + mərhələ nöqtələri ---- */
      const BUILD_END = 0.84; // bu nöqtədə tikinti 100% — sonra "Eviniz hazırdır" gəlir
      const stageEls = gsap.utils.toArray<HTMLElement>(".hero-stage");
      const percentEl = root.current!.querySelector<HTMLElement>(".hero-percent")!;
      let lastStage = -1;
      let lastPct = -1;

      tl.fromTo(".hero-line-fill", { scaleX: 0 }, { scaleX: 1, duration: BUILD_END }, 0);
      tl.fromTo(".hero-line-marker", { xPercent: 0 }, { xPercent: 100, duration: BUILD_END }, 0);
      tl.eventCallback("onUpdate", () => {
        // istifadəçi giriş animasiyası bitmədən scroll etsə, onu dərhal sonuna çatdırırıq
        if (introTl && tl.progress() > 0.005) {
          introTl.progress(1).kill();
          introTl = null;
          // giriş animasiyası "hero-hint"-i yenidən görünən etdi — scroll vəziyyətini təkrar tətbiq edirik
          tl.render(tl.time(), true, true);
        }
        const p = Math.min(1, tl.progress() / BUILD_END);
        const pct = Math.round(p * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          percentEl.textContent = String(pct);
        }
        const stage = Math.min(STAGES.length - 1, Math.floor(p * STAGES.length));
        if (stage !== lastStage) {
          lastStage = stage;
          // vəziyyət CSS-də (transition) — scroll zamanı JS animasiyası yoxdur
          stageEls.forEach((el, i) =>
            el.setAttribute("data-state", i < stage || p >= 1 ? "done" : i === stage ? "active" : "todo"),
          );
        }
      });

      return () => {
        off();
        unsubscribe();
        window.removeEventListener("resize", resize);
        final.revert();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} data-dark data-hero className="relative h-svh w-full overflow-hidden bg-navy text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full will-change-transform" />
      {/* yuxarı/aşağı yüngül kölgə həmişə; sol tərəfdəki göy kölgə sonda gəlir */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/50 via-transparent to-navy/45" />
      <div className="hero-shade pointer-events-none absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/35 to-transparent" />

      <div className="hero-final absolute inset-x-0 top-[30vh] px-5 md:left-[12vw] md:right-auto md:top-[32vh] md:px-0">
        <h2 className="font-display text-[17vw] leading-[0.92] md:text-[7.2vw]">
          Eviniz
          <br />
          <span className="text-highlight">hazırdır.</span>
        </h2>
        <p className="mt-6 max-w-[22rem] text-lg leading-snug text-white/85">
          Rahatlıq, təhlükəsizlik və müasir həyat tərzi bir ünvanda.
        </p>
        <a
          href="#menziller"
          className="press group mt-8 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-medium text-navy shadow-[0_10px_40px_-12px_rgba(16,30,82,0.6)]"
        >
          Mənzillərə bax
          <ArrowRight className="h-5 w-5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
        </a>
      </div>

      <div className="hero-hint hero-ui absolute inset-x-0 bottom-44 flex flex-col items-center gap-3 text-sm text-white/75">
        Aşağı sürüşdür
        <span className="relative h-12 w-px overflow-hidden bg-white/20">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollhint_1.8s_cubic-bezier(0.77,0,0.175,1)_infinite] bg-white" />
        </span>
      </div>

      {/* tikinti göstəricisi — incə, korporativ timeline */}
      <div className="hero-ui-bottom">
        <div className="hero-ui absolute inset-x-5 bottom-16 md:inset-x-[12vw] md:bottom-20">
          <div className="mb-5 flex items-end justify-between">
            <p className="text-sm text-white/70">Eviniz tikilir</p>
            <p className="font-display leading-none tabular-nums">
              <span className="hero-percent text-3xl md:text-4xl">0</span>
              <span className="ml-1 text-sm text-white/50">%</span>
            </p>
          </div>

          <div className="relative">
            {/* xətt */}
            <div className="h-px w-full bg-white/20" />
            <div className="hero-line-fill absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-white/60 via-white to-white" />

            {/* mərhələ nöqtələri */}
            <ol className="absolute inset-x-0 top-0 grid grid-cols-4">
              {STAGES.map((s, i) => (
                <li key={s} data-state={i === 0 ? "active" : "todo"} className="hero-stage group/st relative">
                  <span className="absolute left-0 top-0 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45 bg-navy transition-[background-color,border-color] duration-500 group-data-[state=active]/st:border-white group-data-[state=active]/st:bg-white group-data-[state=done]/st:border-white group-data-[state=done]/st:bg-white" />
                  <div className="pt-4">
                    <span className="hidden text-[10px] tabular-nums tracking-[0.2em] text-white/35 md:inline">0{i + 1}</span>
                    <span className="hidden whitespace-nowrap text-[11px] text-white/45 transition-colors duration-500 group-data-[state=active]/st:block group-data-[state=active]/st:text-white group-data-[state=done]/st:text-white/75 sm:block md:mt-1 md:text-[13px]">
                      {s}
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            {/* hərəkət edən marker — işıq halqası ilə */}
            <div className="hero-line-marker pointer-events-none absolute inset-x-0 top-0">
              <span className="absolute left-0 top-0 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.14),0_0_18px_4px_rgba(169,193,255,0.55)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
